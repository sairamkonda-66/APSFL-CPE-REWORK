/** APSFL CPE ops store — Customer Master, Item Master, Inward / Outward / Repair. */
import { buildXlsxBlob } from "./xlsxFile.js";

export const DASHBOARD_TITLE = "APSFL CPE'S REWORK";
export const DASHBOARD_SUBTITLE = "Customer Master, Inward & Repair Lookup";
/** Excel-only store — APSFL CPES CUSTMOER SHEET (1).xlsx */
export const STORAGE_KEY = "apsfl-cpe-store-v4-excel";
export const STORE_EVENT = "apsfl-cpe-updated";

const LEGACY_KEYS = [
  "apsfl-cpe-customers-v1",
  "apsfl-cpe-store-v2",
  "apsfl-cpe-store-v3",
];

export const BOX_TYPES = [
  "SINGLE BOX ONU",
  "IPTV BOX",
  "TRIPLE PLAY BOX",
  "TRIPLE PLAY",
  "AP FIBER (TERA SOFT)",
  "Other",
];

export const DEVICE_STATUS = {
  INWARD: "Inward",
  REPAIRED: "Repaired",
  SCRAP: "Scrap",
  SHIPPED: "Shipped",
};

/** All items that appear on the Outward desk */
export const OUTWARD_STATUSES = [
  DEVICE_STATUS.REPAIRED,
  DEVICE_STATUS.SCRAP,
  DEVICE_STATUS.SHIPPED,
];

const RECEIVED = "2026-10-26";

function seedDevice(macId, boxType, remarks = "") {
  return {
    macId,
    boxModel: boxType,
    boxType,
    receivedDate: RECEIVED,
    repairStatus: DEVICE_STATUS.INWARD,
    outwardDate: "",
    remarks,
  };
}

/** Seeded from APSFL CPES CUSTMOER SHEET (1).xlsx */
const seedStore = {
  customers: [
    {
      sno: 1,
      name: "M.YEDUKONDALU",
      date: RECEIVED,
      location: "THADVAI",
      mobile: "9573509461",
      remarks: "TOTAL RECEIVED QTY : 24 PC'S",
      devices: [
        seedDevice("DSNW20285b68", "SINGLE BOX ONU", "THIS MAC NOT LIST"),
        seedDevice("DSNW20297180", "SINGLE BOX ONU"),
        seedDevice("DSNW202dbff0", "SINGLE BOX ONU"),
        seedDevice("DSNW202862c8", "SINGLE BOX ONU"),
        seedDevice("DSNW20286608", "SINGLE BOX ONU"),
        seedDevice("DSNW20285d28", "SINGLE BOX ONU"),
        seedDevice("DSNW202857a0", "SINGLE BOX ONU"),
        seedDevice("DSNW20286380", "SINGLE BOX ONU"),
        seedDevice("00026CD64022", "IPTV BOX"),
        seedDevice("00026CD62746", "IPTV BOX"),
        seedDevice("0003BCD24912", "IPTV BOX"),
        seedDevice("0003BCD26357", "IPTV BOX"),
        seedDevice("00026CD63359", "IPTV BOX"),
        seedDevice("00026CD66296", "IPTV BOX"),
        seedDevice("00026CD63662", "IPTV BOX"),
        seedDevice("00026CD66283", "IPTV BOX"),
        seedDevice("NO-MAC-YEDU-17", "IPTV BOX", "NO MAC ID"),
        seedDevice("0024AE540544", "AP FIBER (TERA SOFT)"),
        seedDevice("9C65EE692BB1", "TRIPLE PLAY BOX"),
        seedDevice("9C65EE64EB41", "TRIPLE PLAY BOX"),
        seedDevice("9C65EE654051", "TRIPLE PLAY BOX"),
        seedDevice("9C65EE690011", "TRIPLE PLAY BOX"),
        seedDevice("9C65EE64EB11", "TRIPLE PLAY BOX"),
        seedDevice("9C65EE64FE91", "TRIPLE PLAY BOX"),
      ],
    },
    {
      sno: 2,
      name: "T.SRINIVAS REDDY",
      date: RECEIVED,
      location: "CHALLAGARIKA",
      mobile: "9849990429",
      remarks: "TOTAL RECEIVED QTY: 22 PC'S",
      devices: [
        seedDevice("00026CD67413", "IPTV BOX"),
        seedDevice("00026CD67645", "IPTV BOX"),
        seedDevice("00026CD66246", "IPTV BOX"),
        seedDevice("00026CD67408", "IPTV BOX"),
        seedDevice("00026CD62548", "IPTV BOX"),
        seedDevice("00026CD62549", "IPTV BOX"),
        seedDevice("0003BCD11254", "IPTV BOX"),
        seedDevice("00026CD66258", "IPTV BOX"),
        seedDevice("00026CD67657", "IPTV BOX"),
        seedDevice("00026CD66260", "IPTV BOX"),
        seedDevice("00026CD62560", "IPTV BOX"),
        seedDevice("00026CD67416", "IPTV BOX"),
        seedDevice("TA032018D108350", "IPTV BOX"),
        seedDevice("NO-MAC-SRINI-14", "IPTV BOX", "NO MAC"),
        seedDevice("NO-MAC-SRINI-15", "IPTV BOX", "NO MAC"),
        seedDevice("DSNW20224420", "SINGLE BOX ONU"),
        seedDevice("DSNW202852c0", "SINGLE BOX ONU"),
        seedDevice("DSNW20232280", "SINGLE BOX ONU"),
        seedDevice("DSNW203b5ea8", "SINGLE BOX ONU"),
        seedDevice("DSNW20285fa0", "SINGLE BOX ONU"),
        seedDevice("DSNW20284C58", "SINGLE BOX ONU"),
        seedDevice("9C65EE693D91", "TRIPLE PLAY"),
      ],
    },
  ],
  items: [
    { sno: 1, boxModel: "SINGLE BOX ONU", boxType: "SINGLE BOX ONU" },
    { sno: 2, boxModel: "IPTV BOX", boxType: "IPTV BOX" },
    { sno: 3, boxModel: "TRIPLE PLAY BOX", boxType: "TRIPLE PLAY BOX" },
    { sno: 4, boxModel: "TRIPLE PLAY", boxType: "TRIPLE PLAY" },
    { sno: 5, boxModel: "AP FIBER (TERA SOFT)", boxType: "AP FIBER (TERA SOFT)" },
  ],
};

export function normalizeMobile(value) {
  return String(value || "").replace(/\D/g, "");
}

/** Normalize CPE serial / MAC stickers (hex MACs and codes like NGW… / DSNW…). */
export function normalizeMac(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

const MISSING_MACS = new Set(["", "NOMAC", "NOMACID", "NA", "NIL", "NONE", "NULL", "MAC", "NO"]);

/** Blank, “no mac”, or an older NOMAC- placeholder. */
export function isMissingMac(value) {
  const mac = normalizeMac(value);
  if (!mac || MISSING_MACS.has(mac)) return true;
  return mac.startsWith("NOMAC");
}

/** All-zero stand-in. Extra boxes become 000000000001, 000000000002, … */
export function nextDefaultMac(customer) {
  const used = new Set(
    (customer?.devices || [])
      .map((device) => normalizeMac(device.macId))
      .filter((mac) => mac && !isMissingMac(mac)),
  );
  let n = 0;
  let id = "";
  do {
    id = String(n).padStart(12, "0");
    n += 1;
  } while (used.has(id));
  return id;
}

export function isZeroMac(value) {
  const mac = normalizeMac(value);
  return mac.length > 0 && /^0+$/.test(mac);
}

function assignDefaultMacs(customers) {
  return (customers || []).map((customer) => {
    const devices = [];
    (customer.devices || []).forEach((device) => {
      if (!isMissingMac(device.macId)) {
        devices.push(device);
        return;
      }
      devices.push({
        ...device,
        macId: nextDefaultMac({ ...customer, devices }),
        remarks: device.remarks || "NO MAC ID",
      });
    });
    return { ...customer, devices };
  });
}

export function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function renumberCustomers(list) {
  return assignDefaultMacs(list).map((customer, index) => ({
    ...customer,
    sno: index + 1,
    devices: (customer.devices || []).map((device, deviceIndex) => ({
      ...device,
      sno: deviceIndex + 1,
    })),
  }));
}

function renumberItems(list) {
  return (list || []).map((item, index) => ({ ...item, sno: index + 1 }));
}

function emptyStore() {
  return { customers: [], items: [] };
}

function clearLegacyStores() {
  LEGACY_KEYS.forEach((key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  });
}

function excelSeed() {
  return {
    customers: renumberCustomers(structuredClone(seedStore.customers)),
    items: renumberItems(structuredClone(seedStore.items)),
  };
}

export function loadStore() {
  try {
    clearLegacyStores();
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null) {
      const seeded = excelSeed();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    // Never accept legacy array formats — Excel sheet only
    if (!parsed || Array.isArray(parsed) || !Array.isArray(parsed.customers)) {
      const seeded = excelSeed();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return {
      customers: renumberCustomers(parsed.customers),
      items: renumberItems(parsed.items || seedStore.items),
    };
  } catch {
    return excelSeed();
  }
}

export function saveStore(store) {
  const next = {
    customers: renumberCustomers(store.customers || []),
    items: renumberItems(store.items || []),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(STORE_EVENT));
  return next;
}

export function loadCustomers() {
  return loadStore().customers;
}

export function loadItems() {
  return loadStore().items;
}

export function saveCustomers(list) {
  const store = loadStore();
  return saveStore({ ...store, customers: list }).customers;
}

export function upsertCustomerMaster({ name, date, location, mobile, remarks }) {
  const digits = normalizeMobile(mobile);
  if (!digits) throw new Error("Mobile number is required.");
  if (!String(name || "").trim()) throw new Error("Customer name is required.");

  const store = loadStore();
  const index = store.customers.findIndex((c) => normalizeMobile(c.mobile) === digits);
  if (index >= 0) {
    store.customers[index] = {
      ...store.customers[index],
      name: String(name).trim(),
      date: String(date || "").trim() || store.customers[index].date || today(),
      location: String(location || "").trim(),
      mobile: digits,
      remarks: String(remarks || "").trim(),
    };
  } else {
    store.customers.push({
      sno: store.customers.length + 1,
      name: String(name).trim(),
      date: String(date || "").trim() || today(),
      location: String(location || "").trim(),
      mobile: digits,
      remarks: String(remarks || "").trim(),
      devices: [],
    });
  }
  return saveStore(store);
}

/** Update one existing customer. Mobile can change; devices stay on the same record. */
export function updateCustomerMaster(originalMobile, { name, date, location, mobile, remarks }) {
  const original = normalizeMobile(originalMobile);
  const digits = normalizeMobile(mobile);
  if (!original) throw new Error("Customer mobile is required.");
  if (!digits) throw new Error("Mobile number is required.");
  if (!String(name || "").trim()) throw new Error("Customer name is required.");

  const store = loadStore();
  const index = store.customers.findIndex((c) => normalizeMobile(c.mobile) === original);
  if (index < 0) throw new Error("Customer not found.");

  if (digits !== original) {
    const clash = store.customers.some((c) => normalizeMobile(c.mobile) === digits);
    if (clash) throw new Error("Another customer already uses this mobile number.");
  }

  store.customers[index] = {
    ...store.customers[index],
    name: String(name).trim(),
    date: String(date || "").trim() || store.customers[index].date || today(),
    location: String(location || "").trim(),
    mobile: digits,
    remarks: String(remarks || "").trim(),
  };
  return saveStore(store);
}

export function upsertItemMaster({ boxModel, boxType }) {
  const model = String(boxModel || "").trim();
  if (!model) throw new Error("Box model is required.");
  const type = String(boxType || "").trim() || "Other";

  const store = loadStore();
  const index = store.items.findIndex(
    (item) => normalizeName(item.boxModel) === normalizeName(model),
  );
  if (index >= 0) {
    store.items[index] = { ...store.items[index], boxModel: model, boxType: type };
  } else {
    store.items.push({
      sno: store.items.length + 1,
      boxModel: model,
      boxType: type,
    });
  }
  return saveStore(store);
}

/** Remove one customer and all of their CPE / MAC rows. */
export function deleteCustomer(mobile) {
  const digits = normalizeMobile(mobile);
  if (!digits) throw new Error("Customer mobile is required.");

  const store = loadStore();
  const index = store.customers.findIndex((c) => normalizeMobile(c.mobile) === digits);
  if (index < 0) throw new Error("Customer not found.");

  const removed = store.customers[index];
  store.customers = store.customers.filter((_, i) => i !== index);
  const saved = saveStore(store);
  return { store: saved, removed };
}

/** Remove one MAC / box row from a customer. */
export function deleteCustomerDevice(mobile, macId) {
  const digits = normalizeMobile(mobile);
  const mac = normalizeMac(macId);
  if (!digits) throw new Error("Customer mobile is required.");
  if (!mac) throw new Error("MAC ID is required.");

  const store = loadStore();
  const index = store.customers.findIndex((c) => normalizeMobile(c.mobile) === digits);
  if (index < 0) throw new Error("Customer not found.");

  const devices = [...(store.customers[index].devices || [])];
  const deviceIndex = devices.findIndex((d) => normalizeMac(d.macId) === mac);
  if (deviceIndex < 0) throw new Error("MAC / item not found for this customer.");

  const removed = devices[deviceIndex];
  devices.splice(deviceIndex, 1);
  store.customers[index] = { ...store.customers[index], devices };
  const saved = saveStore(store);
  return { store: saved, customer: saved.customers[index], removed };
}

/** Remove one Item Master (box model) entry. */
export function deleteItemMaster(boxModel) {
  const model = String(boxModel || "").trim();
  if (!model) throw new Error("Box model is required.");

  const store = loadStore();
  const index = store.items.findIndex(
    (item) => normalizeName(item.boxModel) === normalizeName(model),
  );
  if (index < 0) throw new Error("Item not found.");

  const removed = store.items[index];
  store.items = store.items.filter((_, i) => i !== index);
  const saved = saveStore(store);
  return { store: saved, removed };
}

export function findCustomerByExactMobile(mobile, list = loadCustomers()) {
  const digits = normalizeMobile(mobile);
  if (!digits) return null;
  return list.find((c) => normalizeMobile(c.mobile) === digits) || null;
}

export function findCustomerByNameOrMobile(query, list = loadCustomers()) {
  const raw = String(query || "").trim();
  if (!raw) return null;
  const digits = normalizeMobile(raw);
  const name = normalizeName(raw);

  if (digits.length >= 8) {
    const byMobile = list.find((c) => normalizeMobile(c.mobile) === digits);
    if (byMobile) return byMobile;
  }

  const exactName = list.find((c) => normalizeName(c.name) === name);
  if (exactName) return exactName;

  if (digits.length >= 3) {
    const partialMobile = list.find((c) => normalizeMobile(c.mobile).includes(digits));
    if (partialMobile) return partialMobile;
  }

  return list.find((c) => normalizeName(c.name).includes(name)) || null;
}

export function findCustomersByQuery(query, list = loadCustomers()) {
  const raw = String(query || "").trim();
  if (!raw) return [];

  const digits = normalizeMobile(raw);
  const mac = normalizeMac(raw);
  const name = normalizeName(raw);
  const treatAsMac =
    /[:\-]/.test(raw) ||
    (mac.length >= 8 && !/[g-z]/i.test(raw.replace(/[^a-z0-9]/gi, "")));

  return list.filter((customer) => {
    const mobileHit =
      digits.length >= 3 && normalizeMobile(customer.mobile).includes(digits);
    const nameHit =
      name.length >= 2 && normalizeName(customer.name).includes(name);
    const macHit =
      treatAsMac &&
      mac.length >= 4 &&
      (customer.devices || []).some((device) => normalizeMac(device.macId).includes(mac));
    return Boolean(mobileHit || nameHit || macHit);
  });
}

export function deviceMatchesQuery(device, query) {
  const mac = normalizeMac(query);
  if (!mac) return false;
  return normalizeMac(device.macId).includes(mac);
}

export function getInwardDevices(customer) {
  return (customer?.devices || []).filter(
    (d) => d.repairStatus === DEVICE_STATUS.INWARD,
  );
}

export function getOutwardRows(list = loadCustomers()) {
  return list.flatMap((customer) =>
    (customer.devices || [])
      .filter((d) => OUTWARD_STATUSES.includes(d.repairStatus))
      .map((device) => ({
        customer,
        device,
        key: `${normalizeMobile(customer.mobile)}::${normalizeMac(device.macId)}`,
      })),
  );
}

export function filterOutwardRows(rows, query = "") {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  if (!q) return rows;
  return rows.filter(({ customer, device }) => {
    const hay = `${customer.name || ""} ${customer.mobile || ""} ${device.macId || ""} ${
      device.boxModel || ""
    } ${device.boxType || ""} ${device.repairStatus || ""}`.toLowerCase();
    return hay.includes(q);
  });
}

export function getRepairedOutwardRows(list = loadCustomers()) {
  return getOutwardRows(list).filter((row) => row.device.repairStatus === DEVICE_STATUS.REPAIRED);
}

export function getScrapOutwardRows(list = loadCustomers()) {
  return getOutwardRows(list).filter((row) => row.device.repairStatus === DEVICE_STATUS.SCRAP);
}

export function getShippedOutwardRows(list = loadCustomers()) {
  return getOutwardRows(list).filter((row) => row.device.repairStatus === DEVICE_STATUS.SHIPPED);
}

export function dashboardStats(list = loadCustomers()) {
  const devices = list.flatMap((c) => c.devices || []);
  const inward = devices.filter((d) => d.repairStatus === DEVICE_STATUS.INWARD).length;
  const outward = devices.filter((d) => OUTWARD_STATUSES.includes(d.repairStatus)).length;
  return {
    customers: list.length,
    devices: devices.length,
    repaired: outward,
    pending: inward,
  };
}

/**
 * Scan / save a MAC into Inward for a known customer. Auto-saves.
 */
export function scanInwardMac({
  name,
  date,
  location,
  mobile,
  remarks,
  macId,
  boxModel,
  boxType,
}) {
  let digits = normalizeMobile(mobile);
  let mac = String(macId || "").trim().toUpperCase();

  const store = loadStore();
  let index = digits
    ? store.customers.findIndex((c) => normalizeMobile(c.mobile) === digits)
    : -1;

  if (index < 0 && String(name || "").trim()) {
    const byName = findCustomerByNameOrMobile(name, store.customers);
    if (byName) {
      index = store.customers.findIndex(
        (c) => normalizeMobile(c.mobile) === normalizeMobile(byName.mobile),
      );
      digits = normalizeMobile(byName.mobile);
    }
  }

  if (index < 0) {
    if (!digits) {
      throw new Error("Select or enter a customer mobile first.");
    }
    if (!String(name || "").trim()) {
      throw new Error("Customer not found. Save Customer Master first.");
    }
    store.customers.push({
      sno: store.customers.length + 1,
      name: String(name).trim(),
      date: String(date || "").trim() || today(),
      location: String(location || "").trim(),
      mobile: digits,
      remarks: String(remarks || "").trim(),
      devices: [],
    });
    index = store.customers.length - 1;
  } else if (name) {
    store.customers[index] = {
      ...store.customers[index],
      name: String(name).trim() || store.customers[index].name,
      date: String(date || "").trim() || store.customers[index].date || today(),
      location: String(location || "").trim() || store.customers[index].location,
      remarks: String(remarks || "").trim() || store.customers[index].remarks,
    };
  }

  const customer = store.customers[index];
  const devices = [...(customer.devices || [])];
  if (!mac || isMissingMac(mac)) {
    mac = nextDefaultMac({ ...customer, devices });
  }
  const existing = devices.findIndex((d) => normalizeMac(d.macId) === normalizeMac(mac));
  if (existing >= 0) {
    throw new Error(`MAC ${mac} is already saved for this customer.`);
  }

  devices.push({
    sno: devices.length + 1,
    macId: mac,
    boxModel: String(boxModel || "").trim(),
    boxType: String(boxType || "").trim() || "Other",
    receivedDate: today(),
    repairStatus: DEVICE_STATUS.INWARD,
    outwardDate: "",
    remarks: isZeroMac(mac) ? "NO MAC ID" : "",
  });

  store.customers[index] = { ...customer, devices };
  const saved = saveStore(store);
  return {
    store: saved,
    customer: saved.customers[index],
    quantity: devices.length,
    macId: mac,
  };
}

export function markDeviceOutcome({ mobile, macId, outcome }) {
  const digits = normalizeMobile(mobile);
  const mac = normalizeMac(macId);
  if (!digits) throw new Error("Customer mobile is required.");
  if (!mac) throw new Error("Select a MAC ID.");
  if (![DEVICE_STATUS.REPAIRED, DEVICE_STATUS.SCRAP].includes(outcome)) {
    throw new Error("Choose Repair or Scrap.");
  }

  const store = loadStore();
  const index = store.customers.findIndex((c) => normalizeMobile(c.mobile) === digits);
  if (index < 0) throw new Error("Customer not found.");

  const devices = [...(store.customers[index].devices || [])];
  const deviceIndex = devices.findIndex((d) => normalizeMac(d.macId) === mac);
  if (deviceIndex < 0) throw new Error("MAC ID not found for this customer.");

  if (OUTWARD_STATUSES.includes(devices[deviceIndex].repairStatus)) {
    throw new Error("This MAC is already in Outward.");
  }

  devices[deviceIndex] = {
    ...devices[deviceIndex],
    repairStatus: outcome,
    outwardDate: today(),
    remarks:
      outcome === DEVICE_STATUS.REPAIRED
        ? "Marked repaired · sent to Outward"
        : "Marked scrap · sent to Outward",
  };

  store.customers[index] = { ...store.customers[index], devices };
  return saveStore(store);
}

/** Mark one or more repaired MAC items as Shipped. */
export function shipDevices(items = []) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) throw new Error("Select at least one repaired item to ship.");

  const store = loadStore();
  let shipped = 0;

  list.forEach(({ mobile, macId }) => {
    const digits = normalizeMobile(mobile);
    const mac = normalizeMac(macId);
    if (!digits || !mac) return;

    const index = store.customers.findIndex((c) => normalizeMobile(c.mobile) === digits);
    if (index < 0) return;

    const devices = [...(store.customers[index].devices || [])];
    const deviceIndex = devices.findIndex((d) => normalizeMac(d.macId) === mac);
    if (deviceIndex < 0) return;
    if (devices[deviceIndex].repairStatus !== DEVICE_STATUS.REPAIRED) return;

    devices[deviceIndex] = {
      ...devices[deviceIndex],
      repairStatus: DEVICE_STATUS.SHIPPED,
      shippedDate: today(),
      outwardDate: devices[deviceIndex].outwardDate || today(),
      remarks: "Shipped from Outward desk",
    };
    store.customers[index] = { ...store.customers[index], devices };
    shipped += 1;
  });

  if (!shipped) throw new Error("No repaired items were shipped. Select repaired rows only.");
  return { store: saveStore(store), shipped };
}

export const PENDING_EDIT_KEY = "apsfl-cpe-pending-edit";
export const PENDING_EDIT_EVENT = "apsfl-cpe-edit-request";

export function setPendingEdit(mobile, macId = "", section = "repair") {
  window.sessionStorage.setItem(
    PENDING_EDIT_KEY,
    JSON.stringify({
      mobile: normalizeMobile(mobile),
      macId: String(macId || ""),
      section: String(section || "repair"),
    }),
  );
  window.dispatchEvent(new CustomEvent(PENDING_EDIT_EVENT));
}

/** Open Entry desk to add a new MAC / item for one customer. */
export function setPendingAddItem(mobile) {
  setPendingEdit(mobile, "", "inward");
}

export function consumePendingEdit() {
  try {
    const raw = window.sessionStorage.getItem(PENDING_EDIT_KEY);
    window.sessionStorage.removeItem(PENDING_EDIT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.mobile) return null;
    return {
      mobile: normalizeMobile(parsed.mobile),
      macId: String(parsed.macId || ""),
      section: parsed.section || "repair",
    };
  } catch {
    return null;
  }
}

export function clearAllCustomers() {
  return saveStore(emptyStore());
}

export function resetToSeedCustomers() {
  return saveStore(structuredClone(seedStore));
}

function sheetName(raw, fallback = "Sheet") {
  const cleaned = String(raw || fallback)
    .replace(/[\\/*?:\[\]]/g, " ")
    .trim()
    .slice(0, 31);
  return cleaned || fallback;
}

function cell(value, style = "default") {
  return { v: value ?? "", s: style };
}

function statusStyle(status) {
  const s = String(status || "").toLowerCase();
  if (s === "inward") return "statusInward";
  if (s === "repaired") return "statusRepaired";
  if (s === "scrap") return "statusScrap";
  if (s === "shipped") return "statusShipped";
  return "body";
}

function rowStyle(index) {
  return index % 2 === 0 ? "body" : "bodyAlt";
}

function headerRow(labels) {
  return labels.map((label) => cell(label, "header"));
}

function masterHeaders() {
  return ["S NO", "CUSTOMER NAME", "DATE", "LOCATION", "MOBILE NO", "REMARKS", "BOXES", "INWARD", "REPAIRED", "SCRAP", "SHIPPED"];
}

function deviceHeaders() {
  return [
    "S NO",
    "CUSTOMER NAME",
    "MOBILE NO",
    "LOCATION",
    "MAC ID",
    "BOX TYPE",
    "RECEIVED DATE",
    "REPAIR STATUS",
    "DISPATCHED DATE",
    "DEVICE REMARKS",
    "CUSTOMER REMARKS",
  ];
}

export function customerStatusCounts(customer) {
  const devices = customer?.devices || [];
  const inward = devices.filter((d) => d.repairStatus === DEVICE_STATUS.INWARD).length;
  const repaired = devices.filter((d) => d.repairStatus === DEVICE_STATUS.REPAIRED).length;
  const scrap = devices.filter((d) => d.repairStatus === DEVICE_STATUS.SCRAP).length;
  const shipped = devices.filter((d) => d.repairStatus === DEVICE_STATUS.SHIPPED).length;
  return {
    boxes: devices.length,
    inward,
    repaired,
    scrap,
    shipped,
    outward: repaired + scrap + shipped,
  };
}

function buildSummarySheet(list) {
  const devices = list.flatMap((c) => c.devices || []);
  const stamp = new Date().toLocaleString();
  const counts = {
    customers: list.length,
    boxes: devices.length,
    inward: devices.filter((d) => d.repairStatus === DEVICE_STATUS.INWARD).length,
    repaired: devices.filter((d) => d.repairStatus === DEVICE_STATUS.REPAIRED).length,
    scrap: devices.filter((d) => d.repairStatus === DEVICE_STATUS.SCRAP).length,
    shipped: devices.filter((d) => d.repairStatus === DEVICE_STATUS.SHIPPED).length,
  };

  return {
    name: "Summary",
    cols: [28, 22, 40],
    rows: [
      [cell("APSFL CPE Rework Desk", "title"), "", ""],
      [cell("All customers Excel export", "meta"), "", ""],
      [cell(`Generated: ${stamp}`, "meta"), "", ""],
      [],
      [cell("Metric", "header"), cell("Count", "header"), cell("Notes", "header")],
      [cell("Customers", "label"), cell(counts.customers, "value"), cell("Customer Master rows", "body")],
      [cell("CPE boxes", "label"), cell(counts.boxes, "value"), cell("All MAC / box items", "bodyAlt")],
      [cell("Inward open", "label"), cell(counts.inward, "statusInward"), cell("Awaiting repair outcome", "body")],
      [cell("Repaired", "label"), cell(counts.repaired, "statusRepaired"), cell("Ready / completed repair", "bodyAlt")],
      [cell("Scrap", "label"), cell(counts.scrap, "statusScrap"), cell("Marked as scrap", "body")],
      [cell("Shipped", "label"), cell(counts.shipped, "statusShipped"), cell("Dispatched outward", "bodyAlt")],
      [],
      [cell("Sheets in this workbook", "section"), "", ""],
      [cell("1. Summary", "body"), cell("Totals overview", "meta"), ""],
      [cell("2. Customer Master", "bodyAlt"), cell("One row per customer", "meta"), ""],
      [cell("3. All CPE Boxes", "body"), cell("One row per MAC / box with status colors", "meta"), ""],
    ],
  };
}

function buildCustomerMasterSheet(list) {
  const rows = [
    headerRow(masterHeaders()),
    ...list.map((customer, index) => {
      const tone = rowStyle(index);
      const counts = customerStatusCounts(customer);
      return [
        cell(customer.sno ?? index + 1, tone),
        cell(customer.name || "", tone),
        cell(customer.date || "", tone),
        cell(customer.location || "", tone),
        cell(customer.mobile || "", tone),
        cell(customer.remarks || "", tone),
        cell(counts.boxes, tone),
        cell(counts.inward, counts.inward ? "statusInward" : tone),
        cell(counts.repaired, counts.repaired ? "statusRepaired" : tone),
        cell(counts.scrap, counts.scrap ? "statusScrap" : tone),
        cell(counts.shipped, counts.shipped ? "statusShipped" : tone),
      ];
    }),
  ];

  return {
    name: "Customer Master",
    cols: [8, 28, 14, 18, 14, 28, 10, 10, 12, 10, 12],
    freezeRows: 1,
    autoFilter: true,
    rows,
  };
}

function buildAllDevicesSheet(list) {
  const rows = [headerRow(deviceHeaders())];
  let sno = 0;
  list.forEach((customer) => {
    const devices = customer.devices || [];
    if (!devices.length) {
      sno += 1;
      const tone = rowStyle(sno - 1);
      rows.push([
        cell(sno, tone),
        cell(customer.name || "", tone),
        cell(customer.mobile || "", tone),
        cell(customer.location || "", tone),
        cell("—", tone),
        cell("—", tone),
        cell(customer.date || "", tone),
        cell("No box", tone),
        cell("", tone),
        cell("", tone),
        cell(customer.remarks || "", tone),
      ]);
      return;
    }
    devices.forEach((device) => {
      sno += 1;
      const tone = rowStyle(sno - 1);
      const status = device.repairStatus || "";
      rows.push([
        cell(sno, tone),
        cell(customer.name || "", tone),
        cell(customer.mobile || "", tone),
        cell(customer.location || "", tone),
        cell(device.macId || "", tone),
        cell(device.boxType || device.boxModel || "", tone),
        cell(device.receivedDate || "", tone),
        cell(status, statusStyle(status)),
        cell(device.outwardDate || "", tone),
        cell(device.remarks || "", tone),
        cell(customer.remarks || "", tone),
      ]);
    });
  });

  return {
    name: "All CPE Boxes",
    cols: [8, 26, 14, 16, 20, 16, 14, 14, 14, 24, 24],
    freezeRows: 1,
    autoFilter: true,
    rows,
  };
}

function buildSingleCustomerSheet(customer, index = 0) {
  const counts = customerStatusCounts(customer);
  const deviceRows = (customer.devices || []).map((device, deviceIndex) => {
    const tone = rowStyle(deviceIndex);
    const status = device.repairStatus || "";
    return [
      cell(device.sno ?? deviceIndex + 1, tone),
      cell(device.macId || "", tone),
      cell(device.boxType || device.boxModel || "", tone),
      cell(device.receivedDate || "", tone),
      cell(status, statusStyle(status)),
      cell(device.outwardDate || "", tone),
      cell(device.remarks || "", tone),
    ];
  });

  return {
    name: sheetName(customer.name, `Customer ${index + 1}`),
    cols: [18, 28, 16, 14, 14, 16, 28],
    freezeRows: 0,
    rows: [
      [cell("APSFL CPE · Customer sheet", "title")],
      [],
      [cell("CUSTOMER NAME", "label"), cell(customer.name || "", "value")],
      [cell("MOBILE NO", "label"), cell(customer.mobile || "", "value")],
      [cell("LOCATION", "label"), cell(customer.location || "", "value")],
      [cell("DATE", "label"), cell(customer.date || "", "value")],
      [cell("REMARKS", "label"), cell(customer.remarks || "", "value")],
      [],
      [cell("BOXES", "label"), cell(counts.boxes, "value")],
      [cell("INWARD", "label"), cell(counts.inward, "statusInward")],
      [cell("REPAIRED", "label"), cell(counts.repaired, "statusRepaired")],
      [cell("SCRAP", "label"), cell(counts.scrap, "statusScrap")],
      [cell("SHIPPED", "label"), cell(counts.shipped, "statusShipped")],
      [],
      [cell("MAC / Box details", "section")],
      headerRow(["S NO", "MAC ID", "BOX TYPE", "RECEIVED DATE", "REPAIR STATUS", "DISPATCHED DATE", "REMARKS"]),
      ...deviceRows,
    ],
  };
}

function customerWorkbookSheets(list, { includeSummary = true, includeAllDevices = true, includePerCustomer = true } = {}) {
  const sheets = [];
  if (includeSummary) sheets.push(buildSummarySheet(list));
  sheets.push(buildCustomerMasterSheet(list));
  if (includeAllDevices) sheets.push(buildAllDevicesSheet(list));

  if (includePerCustomer && list.length <= 40) {
    const usedNames = new Set(sheets.map((sheet) => sheet.name));
    list.forEach((customer, index) => {
      let name = sheetName(customer.name, `Customer ${index + 1}`);
      if (usedNames.has(name)) name = sheetName(`${name} ${index + 1}`);
      usedNames.add(name);
      const sheet = buildSingleCustomerSheet(customer, index);
      sheet.name = name;
      sheets.push(sheet);
    });
  }

  return sheets;
}

function triggerExcelDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadCustomersExcel(list = loadCustomers()) {
  if (!list.length) {
    throw new Error("No customers to download.");
  }
  const stamp = new Date().toISOString().slice(0, 10);
  triggerExcelDownload(
    buildXlsxBlob(
      customerWorkbookSheets(list, {
        includeSummary: true,
        includeAllDevices: true,
        includePerCustomer: false,
      }),
    ),
    `APSFL-CPE-All-Customers-${stamp}.xlsx`,
  );
  return list.length;
}

/** Download one particular customer's master + MAC / box rows as Excel. */
export function downloadCustomerExcel(customer) {
  if (!customer?.mobile && !customer?.name) {
    throw new Error("Select a customer first.");
  }
  const stamp = new Date().toISOString().slice(0, 10);
  const safeName = String(customer.name || customer.mobile || "customer")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 40);
  triggerExcelDownload(
    buildXlsxBlob(
      customerWorkbookSheets([customer], {
        includeSummary: false,
        includeAllDevices: true,
        includePerCustomer: true,
      }),
    ),
    `APSFL-CPE-${safeName}-${stamp}.xlsx`,
  );
  return customer;
}

/** @deprecated kept for older imports */
export const REPAIR_STATUSES = [
  DEVICE_STATUS.INWARD,
  DEVICE_STATUS.REPAIRED,
  DEVICE_STATUS.SCRAP,
  DEVICE_STATUS.SHIPPED,
];

export function upsertCustomerEntry() {
  throw new Error("Use Customer Master + Inward scan flow.");
}

export function updateCustomerEntry() {
  throw new Error("Use Repair Status to update MAC outcome.");
}
