import { redirect } from "next/navigation";

/** The decisions now live in the subscriptions table, filtered on what waits for one. */
export default function Review() {
  redirect("/subscriptions?f=todo");
}
