"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Tells the server the visitor's time zone once, so "today" on the calendar and the overview is
 * their today. It is only a time zone name ("Europe/Paris"), nothing that identifies anyone.
 */
export function TimeZone() {
  const router = useRouter();
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz || document.cookie.split("; ").includes(`sd_tz=${encodeURIComponent(tz)}`)) return;
    document.cookie = `sd_tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);
  return null;
}
