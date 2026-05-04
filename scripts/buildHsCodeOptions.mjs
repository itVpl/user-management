/**
 * One-off / rebuild: reads harmonized-system CSV and writes src/data/hsCodeOptions.js
 * Source: https://github.com/datasets/harmonized-system
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(__dirname, "..", "tmp-harmonized-system.csv");
const outPath = path.join(__dirname, "..", "src", "data", "hsCodeOptions.js");

let csv = "";
try {
  csv = fs.readFileSync(csvPath, "utf8");
} catch {
  console.error("Missing tmp-harmonized-system.csv — run: curl -o tmp-harmonized-system.csv ...");
  process.exit(1);
}

/** Minimal CSV row splitter respecting quoted fields */
function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let i = 0;
  let inQ = false;
  while (i < line.length) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        inQ = false;
        i += 1;
        continue;
      }
      cur += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQ = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      out.push(cur);
      cur = "";
      i += 1;
      continue;
    }
    cur += c;
    i += 1;
  }
  out.push(cur);
  return out;
}

const lines = csv.split(/\r?\n/).filter(Boolean);
if (lines.length < 2) {
  console.error("CSV empty");
  process.exit(1);
}
const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
const idxHs = header.indexOf("hscode");
const idxDesc = header.indexOf("description");
const idxLevel = header.indexOf("level");
if (idxHs < 0 || idxDesc < 0 || idxLevel < 0) {
  console.error("Unexpected CSV header", header);
  process.exit(1);
}

const options = [];
for (let li = 1; li < lines.length; li++) {
  const cols = parseCsvLine(lines[li]);
  if (cols.length < header.length) continue;
  if (String(cols[idxLevel]).trim() !== "6") continue;
  const value = String(cols[idxHs]).trim();
  let description = String(cols[idxDesc] ?? "").trim();
  description = description.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const label = `${value} — ${description}`;
  options.push({ value, label });
}

options.sort((a, b) => a.value.localeCompare(b.value));

const body = `/** HS 6-digit codes (Harmonized System, datasets/harmonized-system, level 6). Search by code or description. */
export const HS_CODE_OPTIONS = ${JSON.stringify(options, null, 2)
  .replace(/"value":/g, "value:")
  .replace(/"label":/g, "label:")
  .replace(/"([^"]+)"/g, (m, inner) => {
    if (/[\n\r]/.test(inner)) return m;
    return `"${inner.replace(/\\\\/g, "\\").replace(/\\"/g, '"')}"`;
  })};
`;

// JSON.stringify already produces valid JS object literals for our simple strings - actually use export format:

const jsonLike = options.map((o) => ({
  value: o.value,
  label: o.label,
}));

const fileContent = `/** HS 6-digit codes (Harmonized System — datasets/harmonized-system, WCO level 6 rows). ~${options.length} entries. Search by code or description in the UI. */
export const HS_CODE_OPTIONS = ${JSON.stringify(jsonLike, null, 2)};
`;

fs.writeFileSync(outPath, fileContent, "utf8");
console.log("Wrote", outPath, "count:", options.length);
