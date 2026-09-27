import { createClient } from "@libsql/client";
const c = createClient({ url: "file:/home/user/Idle-invoices/prisma/dev.db" });
const out = {};
for (const t of ["Upload", "Transaction", "Subscription", "Match"]) out[t] = Number((await c.execute(`select count(*) n from "${t}"`)).rows[0].n);
const sz = await c.execute("select page_count*page_size s from pragma_page_count(), pragma_page_size()");
out.bytes = Number(sz.rows[0].s);
console.log(JSON.stringify(out));
