/**
 * Parses AWS Textract (or similar) plain text from common delivery-order style PDFs
 * (Rogers & Brown DO, Carmichael pickup instructions, Delivery Advice, Booking / FCL pickup, etc.)
 * into patches for DeliveryOrder.jsx form state.
 */

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function normalizeText(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** @returns {string} YYYY-MM-DDTHH:mm for datetime-local inputs */
export function ocrDateToDatetimeLocal(str) {
  if (!str || typeof str !== 'string') return '';
  let s = str.replace(/\s+/g, ' ').trim();
  // Strip trailing time e.g. "03-Apr-26 02:47 PM"
  s = s.replace(/\s+\d{1,2}:\d{2}\s*(AM|PM)?/i, '').trim();
  if (!s) return '';

  let y;
  let mo;
  let d;

  // DD-MMM-YY or DD/MMM/YY
  let m = s.match(/^(\d{1,2})[-/]([A-Za-z]{3,9})[-/](\d{2,4})$/i);
  if (m) {
    const monKey = m[2].toLowerCase().slice(0, 3);
    mo = MONTHS[monKey];
    if (mo === undefined) return '';
    d = parseInt(m[1], 10);
    y = m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10);
  } else {
    // M/D/YY or MM/DD/YY
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      mo = parseInt(m[1], 10) - 1;
      d = parseInt(m[2], 10);
      y = m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10);
    }
  }

  if (y === undefined || mo === undefined || d === undefined) {
    const tryDate = new Date(s);
    if (!Number.isNaN(tryDate.getTime())) {
      y = tryDate.getFullYear();
      mo = tryDate.getMonth();
      d = tryDate.getDate();
    } else return '';
  }

  const pad = (n) => String(n).padStart(2, '0');
  return `${y}-${pad(mo + 1)}-${pad(d)}T12:00`;
}

export function mapOcrEquipmentToFormType(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const u = raw.toUpperCase().replace(/\s+/g, '');
  if (u.includes('40HC') || u.includes('40\'HC') || u.includes('40HIGH')) return "40' High Cube";
  if (u.includes('45HC')) return "45' High Cube";
  if (u.includes('20GP') || u.includes('20DV') || u.includes('20FT')) return "20' Standard";
  if (u.includes('40GP') || (u.includes('40FT') && !u.includes('HC'))) return "40' Standard";
  if (u.includes('45STD') || u.includes('45\'STANDARD')) return "45' Standard";
  return '';
}

function firstMatch(text, regex) {
  const m = text.match(regex);
  return m ? (m[1] || m[2] || '').trim() : '';
}

function extractBlockAfter(full, startRe, maxLen = 900, extraStops = []) {
  const idx = full.search(startRe);
  if (idx < 0) return '';
  let slice = full.slice(idx).replace(startRe, '').trim();
  const stops = [
    /\n\s*DATE\s*[:.]?\s*/i,
    /\n\s*OUR\s+REF\.?\s*(?:NO\.?|#)?\s*[:.]?\s*/i,
    /\n\s*(?:FREIGHT\s+CHARGES|ISSUED\s+AS\s+AGENT|DELIVERY\s+CLERK|NO\s+OF\s+PKGS|ARTICLE\s+DESCRIPTIONS?|DESCRIPTION\s+OF\s+ARTICLES)/i,
    /\n\s*(?:IMPORTING\s+CARRIER|SHIPPER|B\/L\s+OR|BL\s+OR|MASTER\s+BILL|HOUSE\s+BILL|ARRIVAL\s+DATE)/i,
    /\n\s*DELIVERY\s+TRANSPORT\s+COMPANY\b/i,
    /\n\s*DELIVER\s+TO\b/i,
    /\n\s*PICKUP\/GOODS\s+AVAILABLE\s+AT\b/i,
    /\n\s*PICKUP\s+LOCATION\b/i,
    /\n\s*IT\s+INFO\b/i,
    /\n\s*Entry\s+Number\b/i,
    /\n\s*Mode\s*[:.]?\s*/i,
    /\n\s*DELIVERY\s+NOTES\b/i,
    /\n\s*FOR\s+DELIVERY\s+TO\b/i,
    /\n\s*TRUCKING\s+COMPANY\b/i,
    ...extraStops,
  ];
  let cut = slice.length;
  for (const re of stops) {
    const hit = slice.slice(1).search(re);
    if (hit >= 0) cut = Math.min(cut, hit + 1);
  }
  slice = slice.slice(0, Math.min(cut, maxLen)).trim();
  return slice.replace(/\n+/g, '\n');
}

function parseAddressBlock(block) {
  const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const out = { name: '', address: '', city: '', state: '', zipCode: '' };
  if (!lines.length) return out;

  if (lines.length === 1) {
    const m = lines[0].match(/^(.+),\s*([A-Za-z0-9 .\-]+)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/i);
    if (m) {
      const body = m[1].trim();
      const comma = body.indexOf(',');
      if (comma > 0) {
        out.name = body.slice(0, comma).trim();
        out.address = body.slice(comma + 1).trim();
      } else {
        out.name = body;
        out.address = '';
      }
      out.city = m[2].trim();
      out.state = m[3].toUpperCase();
      out.zipCode = m[4];
      return out;
    }
    out.name = lines[0];
    return out;
  }

  out.name = lines[0];
  const last = lines[lines.length - 1];
  const m = last.match(/^([A-Za-z0-9 .\-]+)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)(?:\s*,.*)?$/i);
  if (m) {
    out.city = m[1].trim();
    out.state = m[2].toUpperCase();
    out.zipCode = m[3];
    out.address = lines.slice(1, -1).join(', ');
    if (!out.address) out.address = lines[1] || '';
  } else {
    out.address = lines.slice(1).join(', ');
  }
  return out;
}

function blockToLocationPatch(block) {
  const b = block.replace(/\s+PHONE\s*:.*/i, '').trim();
  if (!b) return null;
  const parsed = parseAddressBlock(b);
  if (!parsed.name && !parsed.address) return null;
  return {
    name: parsed.name || '',
    address: parsed.address || '',
    city: parsed.city || '',
    state: parsed.state || '',
    zipCode: parsed.zipCode || '',
  };
}

function isLikelyContainerNumber(s) {
  return /^[A-Z]{4}\d{7}$/i.test((s || '').replace(/\s/g, ''));
}

function collectBolTokens(text) {
  const found = new Set();
  const lines = text.split('\n');
  const bolLineRe = /(?:B\/L|BL|AWB|MASTER\s+BILL|HOUSE\s+BILL|BOOKING\s+NO\.?)\s*(?:OR\s+AWB\s*(?:NO\.?|NUMBER)?)?\s*[:.]?\s*(.+)/i;
  for (const line of lines) {
    const m = line.match(bolLineRe);
    if (!m) continue;
    const rest = m[1].trim();
    const parts = rest.split(/\s{2,}|\s+\/\s+|\n/).map((p) => p.trim()).filter(Boolean);
    for (const p of parts) {
      const cleaned = p.replace(/^[^A-Z0-9]+/i, '').replace(/[^A-Z0-9]+$/i, '');
      if (cleaned.length >= 8 && /^[A-Z0-9]+$/i.test(cleaned) && !isLikelyContainerNumber(cleaned)) {
        found.add(cleaned.toUpperCase());
      }
    }
    const single = rest.replace(/[^A-Z0-9]/gi, '');
    if (single.length >= 10 && !isLikelyContainerNumber(single)) {
      found.add(rest.replace(/\s+/g, ' ').trim().slice(0, 64));
    }
  }

  return [...found].filter((x) => x.length >= 8 && !isLikelyContainerNumber(x));
}

function extractCommodity(text) {
  let c = firstMatch(
    text,
    /DESCRIPTION\s+OF\s+GOODS\s*[:.]?\s*(.+?)(?:\n|$)/i,
  );
  if (c) return c.replace(/\s+/g, ' ').trim().slice(0, 500);

  // Delivery Advice style: label row, value on next line ("Lifting Chair")
  c = firstMatch(text, /DESCRIPTION\s+OF\s+GOODS\s*[:.]?\s*\n+\s*([^\n]+)/i);
  if (c) return c.replace(/\s+/g, ' ').trim().slice(0, 500);

  c = firstMatch(
    text,
    /DESCRIPTION\s+OF\s+ARTICLES[^\n]*\n+([\s\S]{5,400}?)(?=\n\s*(?:WEIGHT|VOLUME|NO\s+OF|FREIGHT|STEEL|CONTAINER|\d+\s*(?:PK|CTN|LB|KG)))/i,
  );
  if (c) return c.replace(/\s+/g, ' ').trim().slice(0, 500);

  const art = text.match(/ARTICLE\s+DESCRIPTIONS[^\n]*\n+([\s\S]{10,500}?)(?=\n\s*(?:FREIGHT|PER\s*\(|THIS\s+DELIVERY|\*{3}))/i);
  if (art) return art[1].replace(/\s+/g, ' ').trim().slice(0, 500);

  return '';
}

function extractPackagesWeight(text) {
  let w = firstMatch(text, /PACKAGES\s*[:.]?\s*([^\n]+)/i);
  const pieces = firstMatch(text, /Pieces\s*[:.]?\s*([^\n]+)/i);
  const wt = firstMatch(text, /WEIGHT\s*[:.]?\s*([^\n]+)/i);
  const wtLb = firstMatch(text, /Weight\s*\(\s*LB\s*\)\s*[:.]?\s*([^\n]+)/i);
  const wtKg = firstMatch(text, /Weight\s*\(\s*KG\s*\)\s*[:.]?\s*([^\n]+)/i);
  const pk = firstMatch(text, /NO\.?\s+OF\s+PKGS?\.?\s*[:.]?\s*([^\n]+)/i);
  const weightStr = wtLb || wt || wtKg || '';
  const pkgStr = pieces || w || pk || '';
  const num = weightStr.match(/([\d,]+(?:\.\d+)?)\s*(?:LB|LBS|KG)\b/i);
  return {
    packagesNote: pkgStr.replace(/\s+/g, ' ').trim(),
    weight: num ? num[1].replace(/,/g, '') : '',
    weightDetail: [wtLb && `LB: ${wtLb}`, wtKg && `KG: ${wtKg}`].filter(Boolean).join(' | '),
  };
}

function extractContainer(text) {
  const m = text.match(/\bCONTAINER\s*[:.]?\s*([A-Z]{4}\d{7})\b/i);
  const seal = text.match(/\bSEAL\s*[:.]?\s*([A-Z0-9]+)\b/i);
  const typeM = text.match(/\b(40HC|40'?\s*HC|20GP|20DV|40GP|40FT|45HC)\b/i);
  return {
    containerNo: m ? m[1].toUpperCase() : (text.match(/\b([A-Z]{4}\d{7})\b/) || [])[1] || '',
    seal: seal ? seal[1] : '',
    typeRaw: typeM ? typeM[1] : '',
  };
}

/**
 * @param {string} rawText
 * @returns {{ patch: object, filledCount: number, hints: string[] }}
 */
export function parseDeliveryOrderOcrText(rawText) {
  const text = normalizeText(rawText);
  const hints = [];
  if (!text) return { patch: {}, filledCount: 0, hints };

  const patch = {};
  let filled = 0;
  const bump = (cond) => {
    if (cond) filled += 1;
  };

  // --- Shipment / ref numbers (avoid generic "DATE" alone) ---
  const shipment = firstMatch(text, /(?:^|\n)\s*Shipment\s*[:.]?\s*([A-Z0-9][A-Z0-9\-]{2,24})\b/im);
  if (shipment) {
    patch.shipmentNo = shipment.replace(/\s+/g, ' ').trim().slice(0, 120);
    bump(true);
  }

  const consol = firstMatch(text, /(?:^|\n)\s*CONSOL\s*[:.]?\s*([A-Z0-9][A-Z0-9\-]{2,40})/im);

  const ourRef =
    firstMatch(text, /OUR\s+REF\.?\s*(?:NO\.?|#)?\s*[:.]?\s*([^\n]+)/i) ||
    firstMatch(text, /OUR\s+REF\s*#\s*[:.]?\s*([^\n]+)/i);
  if (ourRef && !patch.shipmentNo) {
    patch.shipmentNo = ourRef.replace(/\s+/g, ' ').trim().slice(0, 120);
    bump(true);
  } else if (ourRef && patch.shipmentNo) {
    hints.push(`Our Ref: ${ourRef.slice(0, 80)}`);
  }

  const bookingNo = firstMatch(text, /Booking\s+No\s*[:.]?\s*([A-Z0-9]+)/i);
  if (bookingNo) {
    if (!patch.shipmentNo) {
      patch.shipmentNo = bookingNo;
      bump(true);
    } else {
      hints.push(`Booking: ${bookingNo}`);
    }
  }

  const custRef =
    firstMatch(text, /CUST(?:OMER)?\s+REF(?:ERENCE)?\s*(?:NO\.?)?\s*[:.]?\s*([^\n]+)/i) ||
    firstMatch(text, /CUSTOMER\s+REFERENCE\s+NO\.?\s*[:.]?\s*([^\n]+)/i);
  const orderRef =
    firstMatch(text, /ORDER\s+REFERENCES\s*[:.]?\s*([^\n]+)/i) ||
    firstMatch(text, /ORDER\s+REFERENCE\s*[:.]?\s*([^\n]+)/i) ||
    firstMatch(text, /ORDER\s+REFERENCES\s*[:.]?\s*\n+\s*([^\n]+)/i);
  const workOrder = (custRef || orderRef || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (workOrder) {
    patch.customerWorkOrderNo = workOrder;
    bump(true);
  }

  // --- Shipper ---
  const shipper = firstMatch(text, /SHIPPER\s*[:.]?\s*([^\n]+)/i);
  if (shipper) {
    patch.shipperName = shipper.replace(/\s+/g, ' ').trim().slice(0, 200);
    bump(true);
  }

  // --- Carrier / trucking (priority) — Delivery Advice: full block under DELIVERY TRANSPORT COMPANY ---
  const delTransBlockRaw = extractBlockAfter(text, /DELIVERY\s+TRANSPORT\s+COMPANY\s*[:.]?\s*/i, 650);
  const delTransMerged = delTransBlockRaw.replace(/\s+/g, ' ').trim();
  const trucking = firstMatch(text, /TRUCKING\s+COMPANY\s*[:.]?\s*([^\n]+)/i);
  const delTransLine = firstMatch(text, /DELIVERY\s+TRANSPORT\s+COMPANY\s*[:.]?\s*([^\n]+)/i);
  const localDel = firstMatch(text, /LOCAL\s+DELIVERY\s+OR\s+TRANSFER\s+BY\s*[:.]?\s*([^\n]+)/i);
  const rail = firstMatch(text, /TRUCK\/RAIL\s+CARRIER\s*[:.]?\s*([^\n]+)/i);
  const carrierName = (delTransMerged || delTransLine || trucking || localDel || rail || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (carrierName) {
    patch.carrierName = carrierName.slice(0, 200);
    bump(true);
  } else {
    const imp = firstMatch(text, /IMPORTING\s+CARRIER\s*[:.]?\s*([^\n]+)/i);
    if (imp) {
      patch.carrierName = imp.replace(/\s+/g, ' ').trim().slice(0, 200);
      bump(true);
    }
  }

  // --- Pickup (Delivery Advice uses PICKUP/GOODS AVAILABLE AT) ---
  let pickupRaw =
    extractBlockAfter(text, /PICKUP\/GOODS\s+AVAILABLE\s+AT\s*[:.]?\s*/i) ||
    extractBlockAfter(text, /PICKUP\/GOODS\s+AVAILABLE\s+AT\s*\n/i) ||
    extractBlockAfter(text, /PICKUP\s+LOCATION\s*[:.]?\s*/i);

  if (!pickupRaw) {
    const locMerch = firstMatch(text, /LOCATION\s+OF\s+MERCHANDISE\s*[:.]?\s*([^\n]+)/i);
    if (locMerch) pickupRaw = locMerch;
  }
  if (!pickupRaw) {
    pickupRaw = extractBlockAfter(text, /LOAD\s+POINT\s*[:.]?\s*/i);
  }

  const pickupPatch = pickupRaw ? blockToLocationPatch(pickupRaw) : null;
  if (pickupPatch) {
    patch.pickupLocation = pickupPatch;
    bump(true);
  }

  // --- Drop ---
  let dropRaw =
    extractBlockAfter(text, /FOR\s+DELIVERY\s+TO\s*[:.]?\s*/i) ||
    extractBlockAfter(text, /^DELIVER\s+TO\s*[:.]?\s*/im) ||
    extractBlockAfter(text, /DELIVER\s+TO\s*[:.]?\s*/i);

  if (!dropRaw) {
    dropRaw = extractBlockAfter(text, /DELIVER\s+LOADED\s+CONTAINER\s+TO\s*[:.]?\s*/i);
  }

  const dropPatch = dropRaw ? blockToLocationPatch(dropRaw) : null;
  if (dropPatch) {
    patch.dropLocation = dropPatch;
    bump(true);
  }

  // --- BOL ---
  const bolPrimary =
    firstMatch(text, /B\/L\s+OR\s+AWB\s+NO\s*[:.]?\s*([^\n]+)/i) ||
    firstMatch(text, /MASTER\s+BILL\s+OF\s+LADING\s*[:.]?\s*([^\n]+)/i) ||
    firstMatch(text, /MASTER\s+BILL\s+OF\s+LADING\s*[:.]?\s*\n+\s*([^\n]+)/i) ||
    firstMatch(text, /HOUSE\s+BILL\s+OF\s+LADING\s*[:.]?\s*([^\n]+)/i) ||
    firstMatch(text, /BL\s+OR\s+AWB\s+NUMBER\s*[:.]?\s*([^\n]+)/i);

  let bolList = [];
  if (bolPrimary) {
    const tokens = bolPrimary.split(/\s{2,}|(?:\s+\/\s+)/).map((t) => t.trim()).filter(Boolean);
    bolList = tokens.filter((t) => t.length >= 6 && !isLikelyContainerNumber(t));
    if (!bolList.length) {
      const one = bolPrimary.replace(/\s+/g, ' ').trim();
      if (!isLikelyContainerNumber(one)) bolList = [one];
    }
  }
  const extraBols = collectBolTokens(text);
  bolList = [...new Set([...bolList, ...extraBols])].filter((b) => !isLikelyContainerNumber(b)).slice(0, 5);
  if (bolList.length) {
    patch.bols = bolList.map((b) => ({ bolNo: b.slice(0, 64) }));
    patch.bolInformation = bolList[0];
    bump(true);
  }

  // --- Dates ---
  const docDate =
    firstMatch(text, /(?:^|\n)DATE\s*[:.]?\s*([^\n]+)/im) ||
    firstMatch(text, /DATE\s*[:.]?\s*(\d{1,2}[-/][A-Za-z]{3}[-/]\d{2,4}[^\n]*)/i);
  const pickupDt = ocrDateToDatetimeLocal(docDate.split(/\s+/)[0] || docDate);
  if (pickupDt) {
    patch.pickupDate = pickupDt;
    bump(true);
  }

  // Delivery Advice: prefer DOOR ETA for delivery date, else port ETA, else arrival
  const doorEta = firstMatch(text, /DOOR\s+ETA\s*[:.]?\s*([^\n]+)/i);
  const etaPort = firstMatch(text, /(?:^|\n)\s*ETA\s*[:.]?\s*([^\n]+)/im);
  const arrival =
    doorEta ||
    firstMatch(text, /ARRIVAL\s+DATE\s*[:.]?\s*([^\n]+)/i) ||
    etaPort;
  if (arrival) {
    const firstToken = arrival.split(/\s+/)[0] || arrival;
    const dropDt = ocrDateToDatetimeLocal(firstToken.replace(/[,;].*/, ''));
    if (dropDt) {
      patch.dropDate = dropDt;
      bump(true);
    }
  }

  // --- Commodity / equipment ---
  const commodity = extractCommodity(text);
  if (commodity) {
    patch.commodity = commodity;
    bump(true);
  }

  const { packagesNote, weight, weightDetail } = extractPackagesWeight(text);
  const { containerNo, seal, typeRaw } = extractContainer(text);
  if (containerNo) {
    patch.containerNo = containerNo;
    bump(true);
  }
  const eq = mapOcrEquipmentToFormType(typeRaw || commodity || text);
  if (eq) {
    patch.containerType = eq;
    patch.equipmentType = eq;
    bump(true);
  }

  const extraParts = [];
  if (consol) extraParts.push(`CONSOL: ${consol}`);

  const origin = firstMatch(text, /FROM\s+PORT\s+OF\s*\/\s*ORIGIN\s+AIRPORT\s*[:.]?\s*([^\n]+)/i) ||
    firstMatch(text, /FROM\s+PORT\/ORIGIN\s+AIRPORT\s*[:.]?\s*([^\n]+)/i);
  if (origin) extraParts.push(`Origin: ${origin.trim()}`);
  const hawb = firstMatch(text, /HAWB\s+NO\s*[:.]?\s*([^\n]+)/i);
  if (hawb) extraParts.push(`HAWB: ${hawb.trim()}`);
  const entry = firstMatch(text, /ENTRY\s+(?:NO\.?|NUMBER)\s*[:.]?\s*([^\n]+)/i);
  if (entry && entry.replace(/[\s0/-]/g, '')) extraParts.push(`Entry: ${entry.trim()}`);
  const vessel =
    firstMatch(text, /Vessel\s*\/\s*Voyage[^\n:]*\s*[:.]?\s*([^\n]+)/i) ||
    firstMatch(text, /Vessel\s*\/\s*Voyage[^\n]*\n?\s*([^\n]+)/i) ||
    firstMatch(text, /Vessel\s*[:.]?\s*([^\n]+)/i);
  if (vessel) extraParts.push(`Vessel/Voyage: ${vessel.trim()}`);

  const mode = firstMatch(text, /(?:^|\n)\s*Mode\s*[:.]?\s*([^\n]+)/im);
  const loadPort = firstMatch(text, /(?:^|\n)\s*Load\s*[:.]?\s*([^\n]+)/im);
  const dischPort = firstMatch(text, /(?:^|\n)\s*Disch\.?\s*[:.]?\s*([^\n]+)/im);
  if (mode) extraParts.push(`Mode: ${mode.trim()}`);
  if (loadPort) extraParts.push(`Load: ${loadPort.trim()}`);
  if (dischPort) extraParts.push(`Disch: ${dischPort.trim()}`);

  const vol = firstMatch(text, /Volume\s*\([^)]*M[³3][^)]*\)\s*[:.]?\s*([^\n]+)/i);
  if (vol) extraParts.push(`Volume: ${vol.trim()}`);

  let oceanCarrier = '';
  const carrierLines = [...text.matchAll(/(?:^|\n)\s*CARRIER\s*[:.]?\s*([^\n]+)/gim)];
  for (let i = carrierLines.length - 1; i >= 0; i--) {
    const v = carrierLines[i][1].trim();
    if (v && /^[A-Z0-9]{2,12}$/.test(v)) {
      oceanCarrier = v;
      break;
    }
  }
  if (oceanCarrier) extraParts.push(`Ocean carrier (SCAC): ${oceanCarrier}`);

  if (seal) extraParts.push(`Seal: ${seal}`);
  if (packagesNote) extraParts.push(`Pkgs: ${packagesNote}`);
  if (weightDetail) extraParts.push(weightDetail);
  else if (weight) extraParts.push(`Wt: ${weight}`);

  if (extraParts.length) {
    patch.remarksExtra = extraParts.join(' | ');
    bump(true);
  }

  if (weight && patch.pickupLocation) {
    patch.pickupLocation = { ...patch.pickupLocation, weight: String(weight) };
  }

  return { patch, filledCount: filled, hints };
}

/**
 * Merge OCR patch into existing DeliveryOrder form state (first pickup/drop row).
 */
export function mergeDeliveryOrderOcrPatch(prevFormData, patch) {
  if (!patch || typeof patch !== 'object') return prevFormData;

  const next = { ...prevFormData };

  if (patch.shipmentNo) next.shipmentNo = patch.shipmentNo;
  if (patch.shipperName) next.shipperName = patch.shipperName;
  if (patch.carrierName) next.carrierName = patch.carrierName;
  if (patch.commodity) {
    next.commodity = patch.commodity;
    const pl = [...(next.pickupLocations || [])];
    const dl = [...(next.dropLocations || [])];
    if (pl.length) pl[0] = { ...pl[0], commodity: patch.commodity };
    if (dl.length) dl[0] = { ...dl[0], commodity: patch.commodity };
    next.pickupLocations = pl.length ? pl : next.pickupLocations;
    next.dropLocations = dl.length ? dl : next.dropLocations;
  }
  if (patch.containerNo) next.containerNo = patch.containerNo;
  if (patch.containerType) {
    next.containerType = patch.containerType;
    next.equipmentType = patch.equipmentType || patch.containerType;
  }
  if (patch.bolInformation) next.bolInformation = patch.bolInformation;
  if (patch.bols?.length) next.bols = patch.bols;

  if (patch.customerWorkOrderNo) {
    const customers = [...(next.customers || [])];
    if (!customers.length) customers.push({ billTo: '', dispatcherName: '', workOrderNo: '', lineHaul: '', fsc: '', other: '', totalAmount: 0 });
    customers[0] = { ...customers[0], workOrderNo: patch.customerWorkOrderNo };
    next.customers = customers;
  }

  if (patch.pickupLocation) {
    const pl = [...(next.pickupLocations || [])];
    if (!pl.length) pl.push({ name: '', address: '', city: '', state: '', zipCode: '', weight: '', commodity: '', pickUpDate: '', remarks: '' });
    pl[0] = {
      ...pl[0],
      ...patch.pickupLocation,
      pickUpDate: patch.pickupDate || pl[0].pickUpDate,
    };
    next.pickupLocations = pl;
  } else if (patch.pickupDate) {
    const pl = [...(next.pickupLocations || [])];
    if (!pl.length) pl.push({ name: '', address: '', city: '', state: '', zipCode: '', weight: '', commodity: '', pickUpDate: '', remarks: '' });
    pl[0] = { ...pl[0], pickUpDate: patch.pickupDate };
    next.pickupLocations = pl;
  }

  if (patch.dropLocation) {
    const dl = [...(next.dropLocations || [])];
    if (!dl.length) dl.push({ name: '', address: '', city: '', state: '', zipCode: '', weight: '', commodity: '', dropDate: '', remarks: '' });
    dl[0] = {
      ...dl[0],
      ...patch.dropLocation,
      dropDate: patch.dropDate || dl[0].dropDate,
    };
    next.dropLocations = dl;
  } else if (patch.dropDate) {
    const dl = [...(next.dropLocations || [])];
    if (!dl.length) dl.push({ name: '', address: '', city: '', state: '', zipCode: '', weight: '', commodity: '', dropDate: '', remarks: '' });
    dl[0] = { ...dl[0], dropDate: patch.dropDate };
    next.dropLocations = dl;
  }

  if (patch.remarksExtra) {
    const base = (next.remarks || '').trim();
    next.remarks = base ? `${base}\n${patch.remarksExtra}` : patch.remarksExtra;
  }

  return next;
}
