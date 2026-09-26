import { brandOf } from "@/lib/brand";
import { FaviconIcon } from "./FaviconIcon";
import { Icon, Monogram } from "./ui";

const CATEGORY: Record<string, "shield" | "spark" | "card" | "home" | "calendar"> = { insurance: "shield", energy: "spark", "bank fees": "card", housing: "home", transport: "calendar" };

export const ICON_SIZES = { sm: "h-8 w-8 rounded-[10px]", md: "h-10 w-10 rounded-[13px]", lg: "h-12 w-12 rounded-2xl" };
const GLYPH = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" };

/** Relative luminance of a hex color: very light brand colors get a dark glyph. */
function light(hex: string) {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.7;
}

/**
 * The real icon of a service, the way it looks on a phone's home screen: its logo on its brand
 * color (bundled, no request), or its site's own icon, or else a monogram in a color of its own.
 * Worked out on the server, so the brand list never ships to the browser.
 */
export function ServiceIcon({ name, size = "md" }: { name: string; size?: keyof typeof ICON_SIZES }) {
  const brand = brandOf(name);
  if (brand?.path && brand.hex) {
    return (
      <span aria-hidden className={`inline-flex shrink-0 items-center justify-center shadow-[inset_0_0_0_1px_rgb(0_0_0/0.06)] ${ICON_SIZES[size]}`} style={{ background: `#${brand.hex}` }}>
        <svg viewBox="0 0 24 24" className={GLYPH[size]} fill={light(brand.hex) ? "#111" : "#fff"}>
          <path d={brand.path} />
        </svg>
      </span>
    );
  }
  if (brand?.domain) return <FaviconIcon domain={brand.domain} name={name} size={size} box={ICON_SIZES[size]} />;
  // No brand (an insurance, a utility): the icon of what it is, rather than letters.
  const glyph = brand?.category ? CATEGORY[brand.category] : undefined;
  if (glyph) {
    return (
      <span aria-hidden className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-br from-ink-2 to-ink text-bg ${ICON_SIZES[size]}`}>
        <Icon name={glyph} className={GLYPH[size]} />
      </span>
    );
  }
  return <Monogram name={name} size={size} />;
}
