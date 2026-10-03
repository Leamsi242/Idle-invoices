import { isOwner } from "./beta";

/** The ad console is the owner's: BETA_OWNER_CODE given in this browser, or a local development server without one. */
export async function adsAdmin(): Promise<boolean> {
  if (await isOwner()) return true;
  return process.env.NODE_ENV !== "production" && !process.env.BETA_OWNER_CODE;
}
