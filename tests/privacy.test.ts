import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? (f === "generated" ? [] : files(p)) : [p];
  });

const source = files(join(__dirname, "..", "src")).filter((f) => /\.(ts|tsx)$/.test(f));

describe("privacy guarantees in the code", () => {
  it("never writes uploaded files to disk", () => {
    for (const f of source) expect(readFileSync(f, "utf8"), f).not.toMatch(/writeFile|createWriteStream|appendFile|mkdtemp/);
  });

  it("never logs transaction data", () => {
    for (const f of source) expect(readFileSync(f, "utf8"), f).not.toMatch(/console\.(log|info|debug)/);
  });

  it("only sends screenshots to the Claude API", () => {
    const callers = source.filter((f) => readFileSync(f, "utf8").includes("@anthropic-ai/sdk"));
    expect(callers.map((f) => f.split("src")[1])).toEqual([join("/lib", "parsers", "screenshot.ts")]);
  });

  it("masks every parsed transaction through makeTx", () => {
    const parsers = source.filter((f) => f.includes(join("lib", "parsers")) && !/common|index|screenshot/.test(f));
    for (const f of parsers) {
      const text = readFileSync(f, "utf8");
      if (/source: "/.test(text)) expect(text, f).toContain("makeTx(");
    }
  });
});
