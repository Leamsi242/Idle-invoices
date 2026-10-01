// Tests a Powens sandbox end to end, outside the app: the keys, the test connectors, a real
// connection through the webview, then what the app would read. Reads POWENS_DOMAIN,
// POWENS_CLIENT_ID and POWENS_CLIENT_SECRET from the environment.
//
//   node --env-file=.env scripts/check-powens.mjs https://<your-domain>/api/bank/callback ["bank name"]
//
// The redirect URL must be allowed on the Powens client application. The script creates one
// Powens user, prints the webview link to open in a browser, waits for Enter, reads the accounts
// and transactions, then deletes the user (and its data).
import { createInterface } from "node:readline/promises";

const [redirect, bankQuery = "test"] = process.argv.slice(2);
const domain = (process.env.POWENS_DOMAIN ?? "").replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.biapi\.pro$/, "");
const clientId = process.env.POWENS_CLIENT_ID;
const secret = process.env.POWENS_CLIENT_SECRET;
const ok = (m) => console.log(`  OK   ${m}`);
const ko = (m) => { console.log(`  FAIL ${m}`); process.exitCode = 1; };
const info = (m) => console.log(`       ${m}`);

if (!domain || !clientId || !secret) {
  ko("POWENS_DOMAIN, POWENS_CLIENT_ID and POWENS_CLIENT_SECRET must be set, e.g. in .env");
  process.exit(1);
}
if (!redirect) {
  ko("give the redirect URL allowed on the client application, e.g. https://<your-domain>/api/bank/callback");
  process.exit(1);
}
const host = `${domain}.biapi.pro`;
const call = async (path, { method = "GET", token, body } = {}) => {
  const headers = { accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`https://${host}/2.0${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path.split("?")[0]}: ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
};

console.log(`Powens domain ${host}`);
let token;
try {
  const init = await call("/auth/init", { method: "POST", body: { client_id: clientId, client_secret: secret } });
  token = init.auth_token;
  ok(`keys accepted, test user ${init.id_user ?? "?"} created`);
} catch (e) {
  ko(`auth/init failed: ${e.message}`);
  process.exit(1);
}

try {
  console.log(`\nConnectors matching "${bankQuery}"`);
  const { connectors = [] } = await call("/connectors");
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const banks = connectors.filter((c) => !c.capabilities || c.capabilities.includes("bank"));
  info(`${connectors.length} connectors, ${banks.length} with the "bank" capability`);
  const found = banks.filter((c) => norm(c.name).includes(norm(bankQuery)));
  if (!found.length) ko(`no bank connector named like "${bankQuery}"`);
  for (const c of found.slice(0, 10)) ok(`${c.name}  (uuid ${c.uuid})`);
  const chosen = found[0];

  const { code } = await call("/auth/token/code", { token });
  const q = new URLSearchParams({ domain: host, client_id: clientId, redirect_uri: redirect, code, state: "check", ...(chosen ? { connector_uuids: chosen.uuid } : {}) });
  console.log(`\nOpen this link in a browser, sign in with the sandbox credentials shown by Powens, then come back:\n\n  https://webview.powens.com/fr/connect?${q}\n`);
  info("The browser then lands on your redirect URL (the app may say the connection expired: that is expected here).");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await rl.question("Press Enter once the connection is done... ");
  rl.close();

  console.log("\nWhat the app would read");
  let accounts = [];
  for (let i = 0; i < 8 && !accounts.length; i++) {
    if (i) await new Promise((r) => setTimeout(r, 3000));
    ({ accounts = [] } = await call("/users/me/accounts", { token }));
  }
  if (!accounts.length) ko("no account yet (the connection may have failed or still be syncing)");
  for (const a of accounts) ok(`account ${a.id}: ${a.name ?? "?"} (${a.currency?.id ?? "?"}, type ${a.type ?? "?"})`);
  const since = new Date(Date.now() - 730 * 86_400_000).toISOString().slice(0, 10);
  const { transactions = [] } = await call(`/users/me/transactions?min_date=${since}&limit=1000`, { token });
  const booked = transactions.filter((t) => !t.coming && t.value);
  const dates = booked.map((t) => t.date).sort();
  (booked.length ? ok : ko)(`${transactions.length} lines, ${booked.length} booked${dates.length ? `, from ${dates[0]} to ${dates.at(-1)}` : ""}`);
  info(`history: ${dates.length ? Math.round((Date.parse(dates.at(-1)) - Date.parse(dates[0])) / 86_400_000) : 0} days`);
  for (const t of booked.slice(0, 8)) info(`${t.date}  ${String(t.value).padStart(9)}  ${t.original_wording ?? t.wording ?? ""}`);
  const fields = new Set(transactions.flatMap((t) => Object.keys(t).filter((k) => t[k] != null && t[k] !== "")));
  info(`fields present: ${[...fields].sort().join(", ")}`);
} catch (e) {
  ko(e.message);
} finally {
  await call("/users/me", { method: "DELETE", token }).then(() => ok("test user deleted"), (e) => ko(`could not delete the test user: ${e.message}`));
}
