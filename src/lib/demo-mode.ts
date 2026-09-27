import { cookies } from "next/headers";

/** Demo mode: the user's own session waits in REAL_COOKIE while they try the app on made-up data. */
export const REAL_COOKIE = "sd_real";
export const DEMO_COOKIE = "sd_demo";

export async function inDemo(): Promise<boolean> {
  return (await cookies()).get(DEMO_COOKIE)?.value === "1";
}
