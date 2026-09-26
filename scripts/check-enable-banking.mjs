// Checks that the Enable Banking application is ready to read a given bank, before a first real
// connection. Reads ENABLE_BANKING_APP_ID and ENABLE_BANKING_PRIVATE_KEY from the environment.
//
//   node --env-file=.env scripts/check-enable-banking.mjs https://<your-domain>/api/bank/callback "Crédit Mutuel"
//
// Nothing is connected and no account is read: it only calls GET /application and GET /aspsps.
import { createSign } from "node:crypto";

const [redirect, bankQuery = "Crédit Mutuel", country = "FR"] = process.argv.slice(2);
const appId = process.env.ENABLE_BANKING_APP_ID;
const key = (process.env.ENABLE_BANKING_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
const ok = (m) => console.log(`  OK   ${m}`);
const ko = (m) => { console.log(`  FAIL ${m}`); process.exitCode = 1; };
const info = (m) => console.log(`       ${m}`);

if (!appId || !key.includes("PRIVATE KEY")) {
  ko("ENABLE_BANKING_APP_ID and ENABLE_BANKING_PRIVATE_KEY (PEM) must be set, e.g. in .env");
  process.exit(1);
}

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const unsigned = `${b64({ typ: "JWT", alg: "RS256", kid: appId })}.${b64({ iss: "enablebanking.com", aud: "api.enablebanking.com", iat: now, exp: now + 600 })}`;
let token;
try {
  token = `${unsigned}.${createSign("RSA-SHA256").update(unsigned).sign(key).toString("base64url")}`;
} catch (e) {
  ko(`the private key cannot sign (${e.message})`);
  process.exit(1);
}
const get = async (path) => {
  const res = await fetch(`https://api.enablebanking.com${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${body.slice(0, 300)}`);
  return JSON.parse(body);
};

console.log("Enable Banking application");
try {
  const app = await get("/application");
  ok(`authenticated as "${app.name ?? appId}"`);
  if ("active" in app) (app.active ? ok : ko)(`application ${app.active ? "is active" : "is not active yet (activate it in the control panel)"}`);
  if (app.environment) info(`environment: ${app.environment}`);
  const urls = app.redirect_urls ?? [];
  if (redirect) (urls.includes(redirect) ? ok : ko)(`redirect URL ${redirect} ${urls.includes(redirect) ? "is registered" : `is not registered (registered: ${urls.join(", ") || "none"})`}`);
  else info(`registered redirect URLs: ${urls.join(", ") || "none"}`);
} catch (e) {
  ko(`GET /application failed: ${e.message}`);
  process.exit(1);
}

console.log(`\nBanks matching "${bankQuery}" in ${country}`);
try {
  const { aspsps } = await get(`/aspsps?country=${country}`);
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const found = aspsps.filter((a) => norm(a.name).includes(norm(bankQuery)));
  if (!found.length) ko(`no bank named like "${bankQuery}" (${aspsps.length} banks listed for ${country})`);
  for (const a of found) {
    ok(a.name);
    if (a.psu_types) info(`customer types: ${a.psu_types.join(", ")}${a.psu_types.includes("personal") ? "" : "  <- no personal accounts"}`);
    if (a.maximum_consent_validity) info(`longest access: ${Math.round(a.maximum_consent_validity / 86400)} days (the app asks for 1)`);
    if (a.required_psu_headers?.length) info(`headers the bank requires: ${a.required_psu_headers.join(", ")} (the app forwards the user's IP address, browser and accept headers)`);
    if (a.auth_methods?.length) info(`sign-in: ${a.auth_methods.map((m) => m.approach ?? m.name).filter(Boolean).join(", ")}`);
    if (a.beta) info("marked beta by Enable Banking");
  }
} catch (e) {
  ko(`GET /aspsps failed: ${e.message}`);
}
console.log(process.exitCode ? "\nFix the FAIL lines above, then try again." : "\nReady: open the app, search your bank and connect it.");
