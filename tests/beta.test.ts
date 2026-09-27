import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

// A cookie jar the tests control, in place of the request's.
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined) }) }));

const { betaCheck, codeToken, testerCount, BETA_COOKIE, OWNER_COOKIE } = await import("@/lib/beta");
const { prisma } = await import("@/lib/db");

const upload = (sessionId: string, fileName: string, at = new Date()) => prisma.upload.create({ data: { sessionId, sourceType: "bank", fileName, uploadedAt: at, deletedAt: at } });

describe("closed beta rules", () => {
  beforeEach(() => jar.clear());

  it("keeps real connections out of the demo", async () => {
    jar.set("sd_demo", "1");
    expect(await betaCheck("bank", randomUUID())).toBe("demo");
  });

  it("asks for the invitation code once, then lets the tester in", async () => {
    vi.stubEnv("BETA_ACCESS_CODE", "PRINTEMPS");
    expect(await betaCheck("upload", randomUUID())).toBe("code");
    jar.set(BETA_COOKIE, codeToken("PRINTEMPS"));
    expect(await betaCheck("upload", randomUUID())).toBeNull();
  });

  it("keeps direct bank connections for the owner while Enable Banking is in restricted mode", async () => {
    vi.stubEnv("BETA_BANK_MODE", "owner");
    vi.stubEnv("BETA_OWNER_CODE", "moi-seul");
    expect(await betaCheck("bank", randomUUID())).toBe("owner");
    expect(await betaCheck("upload", randomUUID())).toBeNull();
    jar.set(OWNER_COOKIE, codeToken("owner:moi-seul"));
    expect(await betaCheck("bank", randomUUID())).toBeNull();
  });

  it("stops new testers when the beta is full, never the ones already in", async () => {
    const tester = randomUUID();
    await upload(tester, "releve.csv");
    vi.stubEnv("BETA_MAX_TESTERS", String(await testerCount()));
    expect(await betaCheck("upload", randomUUID())).toBe("full");
    expect(await betaCheck("upload", tester)).toBeNull();
    // The demo's made-up data does not make a tester.
    const demo = randomUUID();
    await upload(demo, "Bank connection: Demo bank (test data) (1 account)");
    expect(await betaCheck("upload", demo)).toBe("full");
  });

  it("limits bank connections and screenshots per day", async () => {
    vi.stubEnv("BETA_BANK_CONNECTIONS_PER_DAY", "2");
    vi.stubEnv("BETA_SCREENSHOTS_PER_DAY", "1");
    const s = randomUUID();
    await upload(s, "Bank connection: Crédit Mutuel (1 account)");
    expect(await betaCheck("bank", s)).toBeNull();
    await upload(s, "Bank connection: Crédit Mutuel (1 account)");
    expect(await betaCheck("bank", s)).toBe("quota");
    // Yesterday's connections no longer count.
    const t = randomUUID();
    await upload(t, "Bank connection: BNP (1 account)", new Date(Date.now() - 2 * 86_400_000));
    await upload(t, "Bank connection: BNP (1 account)", new Date(Date.now() - 2 * 86_400_000));
    expect(await betaCheck("bank", t)).toBeNull();
    expect(await betaCheck("screenshot", t, { files: ["a.png"] })).toBeNull();
    expect(await betaCheck("screenshot", t, { files: ["a.png", "b.jpg"] })).toBe("quota");
  });
});
