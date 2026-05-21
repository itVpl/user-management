import { countryCodeToFlagImageUrl } from "../../utils/countryFlags.js";

const DEFAULT_CLASS =
  "h-3.5 w-auto max-w-[1.375rem] shrink-0 rounded-sm border border-black/10 object-cover";

/**
 * Renders a country flag image (works on Windows; emoji flags often show as "IN", "US" letters).
 */
export default function CountryFlagImg({
  countryCode,
  className = DEFAULT_CLASS,
  width = 22,
  height = 14,
}) {
  const src = countryCodeToFlagImageUrl(countryCode);
  if (!src) return null;

  return (
    <img
      src={src}
      alt=""
      width={width}
      height={height}
      className={className}
      loading="lazy"
      decoding="async"
      draggable={false}
      aria-hidden
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}
