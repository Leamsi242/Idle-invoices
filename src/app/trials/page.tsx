import { redirect } from "next/navigation";

/** Free trials are followed in the calendar now, next to the charges they turn into. */
export default function Trials() {
  redirect("/calendar");
}
