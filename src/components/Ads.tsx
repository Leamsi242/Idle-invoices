"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Ad } from "@/lib/ads";
import { ADS_DICTS } from "@/lib/i18n-ads";
import { useI18n } from "./I18n";
import { Icon } from "./ui";

const IMAGE_MS = 6000;

/** Counts an impression or a full view; demo ads are never counted. */
function track(ad: Ad, kind: "impression" | "view") {
  if (ad.demo) return;
  fetch("/api/ads/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: ad.id, kind }), keepalive: true }).catch(() => {});
}

/** One impression once the element has been at least half on screen for a second. */
function useImpression(ad: Ad | null, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!ad || !el) return;
    let timer: ReturnType<typeof setTimeout> | undefined, done = false;
    const io = new IntersectionObserver(([e]) => {
      if (done) return;
      if (e.intersectionRatio >= 0.5) timer = setTimeout(() => { done = true; track(ad, "impression"); io.disconnect(); }, 1000);
      else clearTimeout(timer);
    }, { threshold: [0, 0.5, 1] });
    io.observe(el);
    return () => { clearTimeout(timer); io.disconnect(); };
  }, [ad, ref]);
}

const clickUrl = (ad: Ad) => `/api/ads/click/${encodeURIComponent(ad.id)}`;

function Media({ ad, muted, onEnded, className, loop = false, onProgress }: { ad: Ad; muted: boolean; onEnded?: () => void; className: string; loop?: boolean; onProgress?: (p: number) => void }) {
  if (ad.mediaKind === "video" && ad.mediaUrl)
    return (
      <video
        key={ad.id}
        className={className}
        src={ad.mediaUrl}
        poster={ad.posterUrl}
        autoPlay
        muted={muted}
        playsInline
        loop={loop}
        onEnded={onEnded}
        onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration) onProgress?.(v.currentTime / v.duration); }}
      />
    );
  // eslint-disable-next-line @next/next/no-img-element
  return ad.mediaUrl ? <img className={className} src={ad.mediaUrl} alt="" /> : <div className={`${className} bg-gradient-to-br from-brand to-night`} />;
}

/** The full-screen viewer: progress bars, tap left or right, the call to action at the bottom. */
function StoryViewer({ ads, start, onClose }: { ads: Ad[]; start: number; onClose: () => void }) {
  const { locale } = useI18n();
  const t = ADS_DICTS[locale];
  const [i, setI] = useState(start);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true);
  const ad = ads[i];
  const next = useCallback(() => { track(ads[i], "view"); if (i + 1 < ads.length) { setI(i + 1); setProgress(0); } else onClose(); }, [ads, i, onClose]);
  const prev = () => { if (i > 0) { setI(i - 1); setProgress(0); } };

  useEffect(() => { track(ad, "impression"); }, [ad]);
  // Images last IMAGE_MS; videos move on when they end.
  useEffect(() => {
    if (ad.mediaKind === "video") return;
    const t0 = Date.now();
    const id = setInterval(() => { const p = (Date.now() - t0) / IMAGE_MS; setProgress(Math.min(1, p)); if (p >= 1) next(); }, 100);
    return () => clearInterval(id);
  }, [ad, next]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") next(); if (e.key === "ArrowLeft") prev(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90" role="dialog" aria-modal="true" aria-label={t.row}>
      <div className="relative h-full max-h-[860px] w-full max-w-[480px] overflow-hidden bg-black sm:rounded-[28px]">
        <Media ad={ad} muted={muted} onEnded={next} onProgress={setProgress} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        <div className="absolute inset-x-3 top-3 flex gap-1">
          {ads.map((a, k) => (
            <span key={a.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
              <span className="block h-full bg-white" style={{ width: `${k < i ? 100 : k === i ? progress * 100 : 0}%` }} />
            </span>
          ))}
        </div>
        <div className="absolute inset-x-3 top-6 flex items-center gap-2 text-white">
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur">{t.sponsoredBy(ad.advertiser)}</span>
          <span className="ml-auto flex gap-1.5">
            {ad.mediaKind === "video" && (
              <button type="button" onClick={() => setMuted(!muted)} className="rounded-full bg-white/15 px-3 py-1 text-xs backdrop-blur">{muted ? t.sound : t.mute}</button>
            )}
            <button type="button" onClick={onClose} aria-label={t.close} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 backdrop-blur">✕</button>
          </span>
        </div>
        <button type="button" aria-label={t.prev} onClick={prev} className="absolute bottom-40 left-0 top-20 w-1/3" />
        <button type="button" aria-label={t.next} onClick={next} className="absolute bottom-40 right-0 top-20 w-1/3" />
        <div className="absolute inset-x-5 bottom-6 space-y-3 text-white">
          <p className="font-display text-2xl font-semibold leading-tight">{ad.title}</p>
          {ad.body && <p className="text-sm text-white/85">{ad.body}</p>}
          <a href={clickUrl(ad)} target="_blank" rel="sponsored noopener noreferrer" className="flex items-center justify-center gap-2 rounded-2xl bg-white py-3 font-semibold text-night">
            {ad.cta} <Icon name="arrow" className="h-4 w-4 -rotate-45" />
          </a>
          <p className="text-center text-[10px] leading-snug text-white/60">{t.why}</p>
        </div>
      </div>
    </div>
  );
}

/** A row of story bubbles, like a social app: tap one to open the viewer. */
export function AdStories({ ads }: { ads: Ad[] }) {
  const { locale } = useI18n();
  const t = ADS_DICTS[locale];
  const [open, setOpen] = useState<number | null>(null);
  if (ads.length === 0) return null;
  return (
    <section aria-label={t.row} className="space-y-2">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        {t.row} <span className="rounded-full border border-line px-2 py-0.5 text-[10px] normal-case tracking-normal">{t.sponsored}</span>
      </p>
      <div className="flex gap-4 overflow-x-auto pb-1">
        {ads.map((ad, k) => (
          <button key={ad.id} type="button" onClick={() => setOpen(k)} className="flex w-[76px] shrink-0 flex-col items-center gap-1.5 text-center">
            <span className="rounded-full bg-[conic-gradient(from_200deg,#5ef2b8,#7aa7ff,#e87ba4,#ffb547,#5ef2b8)] p-[3px]">
              <span className="block rounded-full bg-bg p-[2px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {ad.posterUrl ? <img src={ad.posterUrl} alt="" className="h-16 w-16 rounded-full object-cover" /> : <span className="block h-16 w-16 rounded-full bg-brand-soft" />}
              </span>
            </span>
            <span className="line-clamp-2 text-[11px] leading-tight text-ink-2">{ad.advertiser.replace(/ \(démo\)$/, "")}</span>
          </button>
        ))}
      </div>
      {open !== null && <StoryViewer ads={ads} start={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

/** A vertical video in the page, muted and looping, with its call to action. */
export function AdShort({ ad }: { ad: Ad | null }) {
  const { locale } = useI18n();
  const t = ADS_DICTS[locale];
  const ref = useRef<HTMLElement>(null);
  const [muted, setMuted] = useState(true);
  const viewed = useRef(false);
  useImpression(ad, ref);
  if (!ad) return null;
  return (
    <section ref={ref} aria-label={t.sponsoredBy(ad.advertiser)} className="relative mx-auto aspect-[9/16] w-full max-w-[320px] overflow-hidden rounded-[26px] bg-black text-white shadow-lg">
      <Media ad={ad} muted={muted} loop className="absolute inset-0 h-full w-full object-cover" onProgress={(p) => { if (p > 0.97 && !viewed.current) { viewed.current = true; track(ad, "view"); } }} />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />
      <div className="absolute inset-x-3 top-3 flex items-center justify-between">
        <span className="rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur">{t.sponsoredBy(ad.advertiser)}</span>
        {ad.mediaKind === "video" && <button type="button" onClick={() => setMuted(!muted)} className="rounded-full bg-black/40 px-2.5 py-1 text-[11px] backdrop-blur">{muted ? t.sound : t.mute}</button>}
      </div>
      <div className="absolute inset-x-4 bottom-4 space-y-2">
        <p className="font-display text-xl font-semibold leading-tight">{ad.title}</p>
        {ad.body && <p className="text-xs text-white/85">{ad.body}</p>}
        <a href={clickUrl(ad)} target="_blank" rel="sponsored noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-semibold text-night">{ad.cta} <Icon name="arrow" className="h-4 w-4 -rotate-45" /></a>
      </div>
    </section>
  );
}
