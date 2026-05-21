/**
 * Country flag helpers. Prefer PNG URLs on Windows — emoji flags render as letter pairs (IN, US).
 */

export function countryCodeToFlagEmoji(countryCode) {
  const code = String(countryCode || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";

  return String.fromCodePoint(
    ...[...code].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65),
  );
}

/** @param {string} countryCode ISO 3166-1 alpha-2 */
export function countryCodeToFlagImageUrl(countryCode, width = 40) {
  const code = String(countryCode || "")
    .trim()
    .toLowerCase();
  if (!/^[a-z]{2}$/.test(code)) return "";
  const size = Math.min(80, Math.max(20, Number(width) || 40));
  return `https://flagcdn.com/w${size}/${code}.png`;
}

export function formatCountryWithFlag(countryName, countryCode) {
  const name = String(countryName || "").trim();
  const code = String(countryCode || "")
    .trim()
    .toUpperCase();
  const flag = countryCodeToFlagEmoji(code);
  if (!name) return flag || code;
  if (!flag) return name;
  return `${flag} ${name}`;
}
