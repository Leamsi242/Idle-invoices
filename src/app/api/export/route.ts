import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { getSources, listSubscriptions, loadTransactions } from "@/lib/store";

/**
 * "Export my data" (GDPR data portability): everything kept for this browser, decrypted, as one
 * JSON file. Account numbers were masked when read, so none are in it.
 */
export async function GET() {
  const sessionId = await getSessionId();
  if (!sessionId) return NextResponse.json({ error: "No data yet." }, { status: 404 });
  const [subscriptions, transactions, sources] = await Promise.all([listSubscriptions(sessionId), loadTransactions(sessionId), getSources(sessionId)]);
  const body = {
    exportedAt: new Date().toISOString(),
    sources,
    subscriptions: subscriptions.map(({ id: _id, key: _key, ...s }) => s),
    transactions: transactions.map(({ id: _id, uploadId: _u, ...t }) => t),
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="subscription-detective-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
