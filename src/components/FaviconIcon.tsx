"use client";

import { useEffect, useRef, useState } from "react";
import { Monogram } from "./ui";

/** A service's own site icon, through our cached proxy; a monogram if it cannot be had. */
export function FaviconIcon({ domain, name, size, box }: { domain: string; name: string; size: "sm" | "md" | "lg"; box: string }) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // The image may fail before the page becomes interactive, when onError is not listened to yet.
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);
  if (failed) return <Monogram name={name} size={size} />;
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-white shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)] ${box}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={img} src={`/api/logo/${domain}`} alt="" className="h-full w-full object-contain p-1" onError={() => setFailed(true)} />
    </span>
  );
}
