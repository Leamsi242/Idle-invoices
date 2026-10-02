import { ConfirmSignIn } from "@/components/Account";

export const metadata = { title: "Sign in · Subscription Detective" };

/** The page a sign-in link opens. The token stays in the address's "#" part, read in the browser. */
export default function ConfirmPage() {
  return (
    <article className="mx-auto max-w-xl">
      <ConfirmSignIn />
    </article>
  );
}
