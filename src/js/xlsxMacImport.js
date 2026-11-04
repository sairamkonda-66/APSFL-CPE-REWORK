function normalizeMac(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

const MISSING_MACS = new Set(["", "NOMAC", "NOMACID", "NA", "NIL", "NONE", "NULL", "MAC", "NO"]);

function isMissingMac(value) {
  const mac = normalizeMac(value);
  if (!mac || MISSING_MACS.has(mac)) return true;
  return mac.startsWith("NOMAC");
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot read compressed Excel files. Try Chrome/Edge, or re-save as .xlsx.");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Minimal ZIP reader for .xlsx packages (store + deflate). */
async function readZipEntries(buffer) {
  const view = new DataView(buffer);
  const files = new Map();
  let offset = 0;

  while (offset + 30 <= view.byteLength) {
    if (view.getUint32(offset, true) !== 0x04034b50) break;

    const method = view.getUint16(offset + 8, true);
    const compSize = view.getUint32(offset + 18, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const nameBytes = new Uint8Array(buffer, offset + 30, nameLen);
    const name = new TextDecoder().decode(nameBytes);
    const dataStart = offset + 30 + nameLen + extraLen;
    const compressed = new Uint8Array(buffer, dataStart, compSize);

    let data;
    if (method === 0) {
      data = compressed;
    } else if (method === 8) {
      data = await inflateRaw(compressed);
    } else {
      throw new Error(`Unsupported Excel zip compression (${method}). Save the sheet as .xlsx.`);
    }

    files.set(name.replace(/\\/g, "/"), data);
    offset = dataStart + compSize;
  }

  if (!files.size) {
    throw new Error("Could not read Excel file. Export again as .xlsx.");
  }
  return files;
}

function xmlDecode(text) {
  return String(text || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  const strings = [];
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/gi;
  let siMatch;
  while ((siMatch = siRe.exec(xml))) {
    const parts = [];
    const tRe = /<t[^>]*>([\s\S]*?)<\/t>/gi;
    let tMatch;
    while ((tMatch = tRe.exec(siMatch[1]))) {
      parts.push(xmlDecode(tMatch[1]));
    }
    strings.push(parts.join(""));
  }
  return strings;
}

function colLettersToIndex(letters) {
  let n = 0;
  for (const ch of String(letters || "").toUpperCase()) {
    if (ch < "A" || ch > "Z") break;
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return Math.max(0, n - 1);
}

function parseSheetRows(xml, sharedStrings) {
  const rows = [];
  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/gi;
  let rowMatch;
  while ((rowMatch = rowRe.exec(xml))) {
    const cells = [];
    const cellRe = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/gi;
    let cellMatch;
    while ((cellMatch = cellRe.exec(rowMatch[1]))) {
      const attrs = cellMatch[1] || cellMatch[3] || "";
      const body = cellMatch[2] || "";
      const ref = (attrs.match(/\br="([A-Z]+)(\d+)"/i) || [])[1] || "";
      const type = (attrs.match(/\bt="([^"]+)"/i) || [])[1] || "";
      let value = "";

      if (type === "inlineStr") {
        const t = body.match(/<t[^>]*>([\s\S]*?)<\/t>/i);
        value = t ? xmlDecode(t[1]) : "";
      } else if (type === "s") {
        const v = body.match(/<v[^>]*>([\s\S]*?)<\/v>/i);
        const idx = v ? Number(v[1]) : NaN;
        value = Number.isFinite(idx) ? sharedStrings[idx] || "" : "";
      } else {
        const v = body.match(/<v[^>]*>([\s\S]*?)<\/v>/i);
        value = v ? xmlDecode(v[1]) : "";
      }

      cells[colLettersToIndex(ref)] = String(value || "").trim();
    }
    rows.push(cells);
  }
  return rows;
}

function findSheetPath(files) {
  const preferred = [
    "xl/worksheets/sheet1.xml",
    "xl/worksheets/Sheet1.xml",
  ];
  for (const path of preferred) {
    if (files.has(path)) return path;
  }
  for (const key of files.keys()) {
    if (/^xl\/worksheets\/sheet\d+\.xml$/i.test(key)) return key;
  }
  return null;
}

function isMacHeader(value) {
  const t = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  return (
    t === "mac" ||
    t === "macid" ||
    t === "macaddress" ||
    t === "macaddr" ||
    t === "cpe mac" ||
    t === "cpemac" ||
    t.endsWith("macid") ||
    t.endsWith("macaddress")
  );
}

/** Strict MAC / CPE serial — never phones, names, qty, dates. */
function looksLikeMac(value) {
  const raw = String(value || "").trim();
  if (!raw) return false;
  if (
    /^(name|customer|mobile|phone|date|qty|quantity|box|model|type|status|sno|s\.?no|remarks|location)$/i.test(
      raw,
    )
  ) {
    return false;
  }

  // Allow classic AA:BB:CC:DD:EE:FF / AA-BB-CC-DD-EE-FF; reject other spaced/comma text.
  const classicSeparated = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/.test(raw);
  if (/[\s,]/.test(raw) && !classicSeparated) return false;

  const mac = normalizeMac(raw);
  if (!mac || isMissingMac(mac)) return false;
  if (!/^[A-Z0-9]+$/.test(mac)) return false;
  if (mac.length < 8 || mac.length > 17) return false;

  // Classic 12-char hex MAC (also all-zero stand-in).
  if (/^[0-9A-F]{12}$/.test(mac)) return true;

  // Reject plain phone / qty numbers.
  if (/^\d+$/.test(mac)) return false;

  // CPE serial-style IDs used as MAC (must include a letter + digit).
  return /[A-Z]/.test(mac) && /\d/.test(mac);
}

function maxColCount(rows) {
  return rows.reduce((max, row) => Math.max(max, (row || []).length), 0);
}

/**
 * Only MAC values — never other sheet columns (name, mobile, box, dates, qty…).
 * Prefer a MAC ID header column; else a single-column sheet; else hex MAC cells only.
 */
function extractMacIdsFromRows(rows) {
  if (!rows.length) return [];

  let macCol = -1;
  const header = rows[0] || [];
  header.forEach((cell, index) => {
    if (macCol < 0 && isMacHeader(cell)) macCol = index;
  });

  const cols = maxColCount(rows);
  const hasHeader = macCol >= 0;
  // Single data column (with or without header word) → that column only.
  if (!hasHeader && cols === 1) macCol = 0;
  // Header row is the only cell and looks like a header, not a MAC.
  const startRow = hasHeader || (cols === 1 && isMacHeader(header[0])) ? 1 : 0;
  if (!hasHeader && cols === 1 && isMacHeader(header[0])) macCol = 0;

  const ordered = [];
  const seen = new Set();

  for (let r = startRow; r < rows.length; r += 1) {
    const row = rows[r] || [];
    let value = "";

    if (macCol >= 0) {
      // Named / single MAC column — ignore every other cell in the row.
      value = row[macCol] || "";
    } else {
      // Multi-column sheet without MAC header: take classic hex MAC cells only.
      for (const cell of row) {
        const mac = normalizeMac(cell);
        if (/^[0-9A-F]{12}$/.test(mac) && !isMissingMac(mac)) {
          value = cell;
          break;
        }
      }
    }

    if (!looksLikeMac(value)) continue;
    const mac = normalizeMac(value);
    if (seen.has(mac)) continue;
    seen.add(mac);
    ordered.push(mac);
  }

  return ordered;
}

async function parseXlsxBuffer(buffer) {
  const files = await readZipEntries(buffer);
  const sharedXml = files.get("xl/sharedStrings.xml");
  const sharedStrings = sharedXml
    ? parseSharedStrings(new TextDecoder().decode(sharedXml))
    : [];
  const sheetPath = findSheetPath(files);
  if (!sheetPath) {
    throw new Error("No worksheet found in the Excel file.");
  }
  const sheetXml = new TextDecoder().decode(files.get(sheetPath));
  return parseSheetRows(sheetXml, sharedStrings);
}

/**
 * Read MAC IDs from an uploaded .xlsx or .csv file.
 * Prefers a “MAC ID” column when present; otherwise scans row values.
 */
export async function extractMacIdsFromUpload(file) {
  if (!file) throw new Error("Choose an Excel file first.");
  const name = String(file.name || "").toLowerCase();
  const buffer = await file.arrayBuffer();

  let rows;
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    rows = parseCsvText(new TextDecoder().decode(buffer));
  } else if (name.endsWith(".xlsx") || name.endsWith(".xlsm")) {
    rows = await parseXlsxBuffer(buffer);
  } else if (name.endsWith(".xls")) {
    throw new Error("Old .xls format is not supported. Save as .xlsx or .csv.");
  } else {
    // Try xlsx first, then CSV text.
    try {
      rows = await parseXlsxBuffer(buffer);
    } catch {
      rows = parseCsvText(new TextDecoder().decode(buffer));
    }
  }

  const macs = extractMacIdsFromRows(rows);
  if (!macs.length) {
    throw new Error(
      "No MAC addresses found. Use a MAC ID column only (other columns are ignored), or one MAC per row.",
    );
  }
  return macs;
}
