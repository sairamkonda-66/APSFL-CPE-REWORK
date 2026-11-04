import { useEffect, useMemo, useRef, useState } from "react";
import CpeLogin from "./CpeLogin";
import CpeSessionBar from "./CpeSessionBar";
import {
  roleAllowedWorkflows,
  roleCanAccessDashboard,
  roleCanAccessMasters,
  roleCanDelete,
  roleDefaultWorkflow,
} from "../js/cpeAuth";
import {
  BOX_TYPES,
  DEVICE_STATUS,
  PENDING_EDIT_EVENT,
  consumePendingEdit,
  deleteCustomer,
  deleteCustomerDevice,
  deleteItemMaster,
  downloadInwardSessionExcel,
  findCustomerByExactMobile,
  findCustomerByNameOrMobile,
  getInwardDevices,
  loadCustomers,
  markDeviceOutcome,
  isZeroMac,
  normalizeMac,
  normalizeMobile,
  scanInwardMac,
  updateCustomerMaster,
  upsertCustomerMaster,
  upsertItemMaster,
} from "../js/customerData";
import CpeBulkMacUpload from "./CpeBulkMacUpload";
import CpeComboBox from "./CpeComboBox";
import CpeCustomerBoard from "./CpeCustomerBoard";
import CpeDatePicker from "./CpeDatePicker";
import { DeleteConfirmModal, DeleteIconButton, SuccessModal } from "./CpeDeleteUi";
import CpeOutwardDesk from "./CpeOutwardDesk";
import ExcelBrandIcon from "./ExcelBrandIcon";
import { TablePager, usePagination } from "./pagination";
import { useCpeSession } from "../js/useCpeSession";
import { useCustomers, useItems } from "../js/useCustomers";
import { Skel } from "./CpeSkeleton";
import "../css/CpeEntry.css";

function MacPicker({ devices, value, onPick }) {
  const [query, setQuery] = useState("");
  const [box, setBox] = useState("All");

  const types = useMemo(() => {
    const list = [];
    devices.forEach((device) => {
      const type = device.boxType || device.boxModel || "Other";
      if (!list.includes(type)) list.push(type);
    });
    return list;
  }, [devices]);

  const shown = devices.filter((device) => {
    const type = device.boxType || device.boxModel || "Other";
    if (box !== "All" && type !== box) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${device.macId} ${type} ${device.sno || ""}`.toLowerCase().includes(q);
  });

  return (
    <div className="cpe-mac-pick">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search box type or MAC"
        autoComplete="off"
      />
      <div className="cpe-mac-pick-filters">
        <button type="button" className={box === "All" ? "is-on" : ""} onClick={() => setBox("All")}>
          All · {devices.length}
        </button>
        {types.map((type) => {
          const count = devices.filter(
            (device) => (device.boxType || device.boxModel || "Other") === type,
          ).length;
          return (
            <button
              key={type}
              type="button"
              className={box === type ? "is-on" : ""}
              onClick={() => setBox(type)}
            >
              {type} · {count}
            </button>
          );
        })}
      </div>
      {shown.length === 0 ? (
        <p className="cpe-mac-pick-empty">No box matches that search.</p>
      ) : (
        <ul className="cpe-mac-pick-list">
          {shown.map((device) => {
            const selected = normalizeMac(value) === normalizeMac(device.macId);
            const type = device.boxType || device.boxModel || "Box";
            const isDefault = isZeroMac(device.macId);
            return (
              <li key={`${device.sno}-${device.macId}`}>
                <button
                  type="button"
                  className={selected ? "is-on" : ""}
                  onClick={() => onPick(device.macId)}
                >
                  <strong>{String(device.sno || "").padStart(2, "0")}</strong>
                  <span>
                    <b>{type}</b>
                    <small>
                      {device.macId}
                      {isDefault ? " · default" : ""}
                    </small>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FieldLabel({ children, required = false }) {
  return (
    <span className="cpe-entry-label-text">
      {children}
      {required ? <em aria-hidden="true">*</em> : null}
    </span>
  );
}

function SuccessIcon() {
  return (
    <svg className="cpe-entry-success-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M7.5 12.2l3 3.1 6-6.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TabIcon({ kind }) {
  const common = { viewBox: "0 0 24 24", fill: "none", "aria-hidden": true };
  if (kind === "customer") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
        <path d="M6.2 18.2a5.8 5.8 0 0 1 11.6 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "item") {
    return (
      <svg {...common}>
        <path d="M4.5 8.2 12 4.5l7.5 3.7L12 11.8 4.5 8.2z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M4.5 8.2V16L12 19.6 19.5 16V8.2" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M12 11.8V19.6" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  if (kind === "inward") {
    return (
      <svg {...common}>
        <path d="M12 4.5v9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M8.2 10.2 12 14l3.8-3.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 16.5h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "outward") {
    return (
      <svg {...common}>
        <path d="M12 14.5v-9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M8.2 8.8 12 5l3.8 3.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 16.5h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M14.5 6.2a2.2 2.2 0 0 1 3.1 3.1L9.2 17.7 5 19l1.3-4.2 8.2-8.6z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function openEntrySection(section) {
  const next = `#enter-details/${section}`;
  if (window.location.hash.toLowerCase() !== next) {
    window.location.hash = next;
  }
}

function readEntrySection() {
  const hash = String(window.location.hash || "").toLowerCase();
  return (hash.split("/")[1] || "").split("?")[0];
}

const emptyCustomer = () => ({
  name: "",
  date: new Date().toISOString().slice(0, 10),
  location: "",
  mobile: "",
  remarks: "",
});

const emptyItem = () => ({
  boxModel: "",
  boxType: BOX_TYPES[0],
});

const emptyFlow = () => ({
  name: "",
  date: "",
  location: "",
  mobile: "",
  remarks: "",
  boxModel: "",
  boxType: BOX_TYPES[0],
  macScan: "",
  selectedMac: "",
});

export default function CpeEntry() {
  const session = useCpeSession();
  const { customers, loading: customersLoading } = useCustomers();
  const { items, loading: itemsLoading } = useItems();
  const macInputRef = useRef(null);

  const canMasters = roleCanAccessMasters(session?.role);
  const canDashboard = roleCanAccessDashboard(session?.role);
  const canDelete = roleCanDelete(session?.role);

  /** Which left-menu / hash section is on screen: customer | item | inward | outward | repair */
  const [entryView, setEntryView] = useState(() => {
    const section = readEntrySection();
    if (section === "customer" || section === "item") return section;
    if (["inward", "outward", "repair"].includes(section)) return section;
    return roleCanAccessMasters(session?.role) ? "customer" : roleDefaultWorkflow(session?.role);
  });

  const [customerForm, setCustomerForm] = useState(emptyCustomer);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [flow, setFlow] = useState(emptyFlow);
  const [sessionScans, setSessionScans] = useState([]);

  const [message, setMessage] = useState(null);
  const [error, setError] = useState("");
  const [scanFeedback, setScanFeedback] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [itemSuccess, setItemSuccess] = useState(null);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  const matchedFlowCustomer = useMemo(
    () => findCustomerByNameOrMobile(flow.mobile || flow.name, customers),
    [flow.mobile, flow.name, customers],
  );

  const inwardMacs = useMemo(
    () => getInwardDevices(matchedFlowCustomer),
    [matchedFlowCustomer],
  );

  const inwardScanRows = useMemo(() => {
    const devices = matchedFlowCustomer?.devices || [];
    return devices
      .map((device, index) => ({
        macId: device.macId,
        quantity: index + 1,
      }))
      .reverse();
  }, [matchedFlowCustomer]);

  const selectedDevice = useMemo(() => {
    const mac = normalizeMac(flow.selectedMac);
    if (!mac) return null;
    return (matchedFlowCustomer?.devices || []).find((d) => normalizeMac(d.macId) === mac) || null;
  }, [matchedFlowCustomer, flow.selectedMac]);

  const customerNameOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: c.name,
        label: c.name,
        searchText: `${c.name} ${c.mobile} ${c.location || ""}`,
        meta: `${c.mobile}${c.location ? ` · ${c.location}` : ""}`,
        customer: c,
      })),
    [customers],
  );

  const customerMobileOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: c.mobile,
        label: c.mobile,
        searchText: `${c.name} ${c.mobile}`,
        meta: c.name,
        customer: c,
      })),
    [customers],
  );

  const boxModelOptions = useMemo(
    () =>
      items.map((item) => ({
        value: item.boxModel,
        label: item.boxModel,
        searchText: `${item.boxModel} ${item.boxType}`,
        meta: item.boxType,
      })),
    [items],
  );

  const boxTypeOptions = useMemo(
    () =>
      BOX_TYPES.map((type) => ({
        value: type,
        label: type,
        searchText: type,
      })),
    [],
  );

  const sessionScanPager = usePagination(inwardScanRows, 10);

  useEffect(() => {
    if (!session) return undefined;
    function applySection() {
      const section = readEntrySection();
      const canDoMasters = roleCanAccessMasters(session.role);
      const allowed = roleAllowedWorkflows(session.role);

      if (section === "customer" || section === "item") {
        if (!canDoMasters) {
          setEntryView(roleDefaultWorkflow(session.role));
          return;
        }
        setEntryView(section);
        return;
      }

      if (allowed.includes(section)) {
        setEntryView(section);
        return;
      }

      // Bare #enter-details — keep current view if valid, else role default
      if (!section) {
        setEntryView((current) => {
          if (current === "customer" || current === "item") {
            return canDoMasters ? current : roleDefaultWorkflow(session.role);
          }
          if (allowed.includes(current)) return current;
          return canDoMasters ? "customer" : roleDefaultWorkflow(session.role);
        });
      }
    }
    applySection();
    window.addEventListener("hashchange", applySection);
    return () => window.removeEventListener("hashchange", applySection);
  }, [session]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [entryView]);

  useEffect(() => {
    if (!matchedFlowCustomer) return;
    setFlow((current) => ({
      ...current,
      name: current.name || matchedFlowCustomer.name,
      date: matchedFlowCustomer.date || current.date,
      location: matchedFlowCustomer.location || current.location,
      mobile: matchedFlowCustomer.mobile || current.mobile,
      remarks: matchedFlowCustomer.remarks || current.remarks,
    }));
  }, [matchedFlowCustomer]);

  useEffect(() => {
    if (!message || message.type !== "ok") return undefined;
    const timer = window.setTimeout(() => setMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    function applyPending() {
      const pending = consumePendingEdit();
      if (!pending) return;
      const list = customers.length ? customers : loadCustomers();
      const customer = findCustomerByExactMobile(pending.mobile, list);
      if (!customer) return;

      if (pending.section === "product") {
        setEntryView("item");
        openEntrySection("item");
        return;
      }

      const nextSection = pending.section === "inward" ? "inward" : "repair";
      setEntryView(nextSection);
      setFlow({
        ...emptyFlow(),
        name: customer.name,
        date: customer.date || "",
        location: customer.location || "",
        mobile: customer.mobile,
        remarks: customer.remarks || "",
        selectedMac: pending.macId || "",
        boxType: items[0]?.boxType || BOX_TYPES[0],
        boxModel: items[0]?.boxModel || "",
      });
      openEntrySection(nextSection);
      window.setTimeout(() => macInputRef.current?.focus(), 120);
    }

    applyPending();
    window.addEventListener(PENDING_EDIT_EVENT, applyPending);
    return () => window.removeEventListener(PENDING_EDIT_EVENT, applyPending);
  }, [customers, items, canMasters, session?.role]);

  function flashOk(text) {
    setError("");
    setScanFeedback(null);
    setMessage({ type: "ok", text });
  }

  function flashErr(text) {
    setMessage(null);
    setError(text);
  }

  function flashScanErr(text) {
    setMessage(null);
    setError(text);
    setScanFeedback({ type: "err", text });
  }

  function flashScanOk(text) {
    setError("");
    setMessage({ type: "ok", text });
    setScanFeedback({ type: "ok", text });
  }

  function onCustomerField(key, value) {
    setCustomerForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function onItemField(key, value) {
    setItemForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function onFlowField(key, value) {
    setFlow((current) => {
      const next = { ...current, [key]: value };
      if (key === "name" || key === "mobile") {
        const hit = findCustomerByNameOrMobile(
          key === "name" ? value : next.mobile || next.name,
          customers,
        );
        if (hit) {
          next.name = hit.name;
          next.date = hit.date || "";
          next.location = hit.location || "";
          next.mobile = hit.mobile;
          next.remarks = hit.remarks || "";
          if (key === "name" || key === "mobile") next.selectedMac = "";
        }
      }
      if (key === "boxModel") {
        const item = items.find((i) => i.boxModel === value);
        if (item) next.boxType = item.boxType;
      }
      return next;
    });
    setError("");
    if (message?.type !== "ok") setMessage(null);
  }

  function onDeskDate(next) {
    onFlowField("date", next);
    const customer =
      matchedFlowCustomer || findCustomerByNameOrMobile(flow.mobile || flow.name, customers);
    if (!customer) return;
    try {
      updateCustomerMaster(customer.mobile, {
        name: flow.name || customer.name,
        date: next,
        location: flow.location || customer.location,
        mobile: flow.mobile || customer.mobile,
        remarks: flow.remarks || customer.remarks,
      });
    } catch (err) {
      setError(err.message || "Could not update the date.");
    }
  }

  function applyCustomerToFlow(customer) {
    if (!customer) return;
    setFlow((current) => ({
      ...current,
      name: customer.name,
      mobile: customer.mobile,
      date: customer.date || "",
      location: customer.location || "",
      remarks: customer.remarks || "",
      selectedMac: "",
    }));
    setError("");
  }

  function pickCustomerForDesk(customer) {
    applyCustomerToFlow(customer);
    window.setTimeout(() => {
      document.getElementById("cpe-desk-work")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  }

  function saveCustomerMaster(event) {
    event.preventDefault();
    try {
      const savedName = customerForm.name.trim();
      upsertCustomerMaster(customerForm);
      setCustomerForm(emptyCustomer);
      setEntryView("item");
      openEntrySection("item");
      flashOk(`${savedName} saved. Add a box model in Item Master.`);
    } catch (err) {
      flashErr(err.message || "Could not save customer.");
    }
  }

  function saveItemMaster(event) {
    event.preventDefault();
    try {
      const savedModel = itemForm.boxModel.trim();
      upsertItemMaster(itemForm);
      setItemForm(emptyItem);
      setItemSuccess({
        title: "Item saved",
        message: `${savedModel} is saved in Item Master. You can add another item.`,
      });
    } catch (err) {
      flashErr(err.message || "Could not save item.");
    }
  }

  function askDeleteSessionScan(row) {
    if (!canDelete) return;
    const customer =
      matchedFlowCustomer ||
      findCustomerByNameOrMobile(flow.mobile || flow.name, customers);
    if (!customer?.mobile) {
      flashScanErr("Load a customer first, then delete the scanned MAC.");
      return;
    }
    setDeleteDialog({
      kind: "session-scan",
      title: "Delete scanned MAC?",
      message: `Remove MAC “${row.macId}” for ${customer.name}.\nThis deletes it from the scan list and customer record.`,
      confirmLabel: "Delete MAC",
      customer,
      device: { macId: row.macId },
    });
  }

  function askDeleteProduct(item) {
    if (!canDelete) return;
    setDeleteDialog({
      kind: "product",
      title: "Delete item?",
      message: `Remove “${item.boxModel}” from Item Master.`,
      confirmLabel: "Delete item",
      item,
    });
  }

  function closeDeleteDialog() {
    setDeleteDialog(null);
  }

  function confirmDeleteDialog() {
    if (!deleteDialog) return;
    try {
      if (deleteDialog.kind === "customer") {
        deleteCustomer(deleteDialog.customer.mobile);
        setSessionScans([]);
        flashOk(`Deleted customer · ${deleteDialog.customer.name}.`);
      } else if (deleteDialog.kind === "device" || deleteDialog.kind === "session-scan") {
        const result = deleteCustomerDevice(
          deleteDialog.customer.mobile,
          deleteDialog.device.macId,
        );
        const removedMac = normalizeMac(deleteDialog.device.macId);
        const nextQty = (result.customer.devices || []).length;
        setSessionScans((current) =>
          current
            .filter((row) => normalizeMac(row.macId) !== removedMac)
            .map((row, index) => (index === 0 ? { ...row, quantity: nextQty } : row)),
        );
        flashScanOk(`Deleted MAC · ${deleteDialog.device.macId} · Qty ${nextQty}`);
      } else if (deleteDialog.kind === "product") {
        deleteItemMaster(deleteDialog.item.boxModel);
        flashOk(`Deleted item · ${deleteDialog.item.boxModel}.`);
      }
    } catch (err) {
      flashErr(err.message || "Delete failed.");
    }
    setDeleteDialog(null);
  }

  function handleMacScan(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    event.stopPropagation();
    commitMacScan();
  }

  function commitMacScan(useDefault = false) {
    const mac = useDefault ? "" : String(flow.macScan || "").trim();
    if (!mac && !useDefault) {
      flashScanErr("Enter or scan a MAC ID, or use No MAC ID.");
      return;
    }

    try {
      const matched =
        matchedFlowCustomer ||
        findCustomerByNameOrMobile(flow.mobile || flow.name, customers);
      const mobile = normalizeMobile(flow.mobile) || normalizeMobile(matched?.mobile);
      const name = String(flow.name || matched?.name || "").trim();

      if (!mobile) {
        throw new Error(
          "Enter customer mobile (or a name that matches Customer Master), then click Add MAC.",
        );
      }

      const result = scanInwardMac({
        name: name || matched?.name || "",
        date: flow.date || matched?.date || "",
        location: flow.location || matched?.location || "",
        mobile,
        remarks: flow.remarks || matched?.remarks || "",
        macId: mac,
        boxModel: flow.boxModel,
        boxType: flow.boxType,
      });

      setSessionScans((current) => [
        { macId: result.macId, quantity: result.quantity },
        ...current,
      ]);
      setFlow((current) => ({
        ...current,
        macScan: "",
        name: result.customer.name,
        mobile: result.customer.mobile,
        date: result.customer.date || current.date,
        location: result.customer.location || current.location,
        remarks: result.customer.remarks || current.remarks,
      }));
      flashScanOk(
        `${isZeroMac(result.macId) ? "Default MAC" : "MAC"} saved · ${result.macId} · Qty ${result.quantity} for ${result.customer.name}`,
      );
      window.setTimeout(() => macInputRef.current?.focus(), 0);
    } catch (err) {
      flashScanErr(err.message || "Scan failed.");
    }
  }

  function clearFlow() {
    setFlow(emptyFlow());
    setSessionScans([]);
    setError("");
    setMessage(null);
    setScanFeedback(null);
  }

  function handleDownloadInwardExcel() {
    try {
      if (!matchedFlowCustomer) {
        throw new Error("Select a customer first, then download Excel.");
      }
      const count = downloadInwardSessionExcel(matchedFlowCustomer);
      flashScanOk(`Downloaded Excel · ${count} MAC ID${count === 1 ? "" : "s"}.`);
    } catch (err) {
      flashScanErr(err.message || "Download failed.");
    }
  }

  function openBulkUpload() {
    const matched =
      matchedFlowCustomer ||
      findCustomerByNameOrMobile(flow.mobile || flow.name, customers);
    const mobile = normalizeMobile(flow.mobile) || normalizeMobile(matched?.mobile);
    if (!mobile) {
      flashScanErr(
        "Select a customer (name or mobile) first, then upload the XL sheet.",
      );
      return;
    }
    setBulkUploadOpen(true);
  }

  function uploadBulkMac(macId) {
    const matched =
      matchedFlowCustomer ||
      findCustomerByNameOrMobile(flow.mobile || flow.name, customers);
    const mobile = normalizeMobile(flow.mobile) || normalizeMobile(matched?.mobile);
    if (!mobile) {
      throw new Error("Customer mobile missing. Close and select a customer.");
    }

    // Bulk XL: only the MAC address from the sheet — no box / remarks / other columns.
    const result = scanInwardMac({
      name: matched?.name || flow.name || "",
      date: matched?.date || "",
      location: matched?.location || "",
      mobile,
      remarks: matched?.remarks || "",
      macId,
      boxModel: "",
      boxType: "",
    });

    setSessionScans((current) => [
      { macId: result.macId, quantity: result.quantity },
      ...current,
    ]);
    return result;
  }

  function applyOutcome(outcome) {
    try {
      if (!flow.mobile) throw new Error("Load a customer first.");
      if (!flow.selectedMac) throw new Error("Select a MAC ID from the dropdown.");
      markDeviceOutcome({
        mobile: flow.mobile,
        macId: flow.selectedMac,
        outcome,
      });
      flashOk(`MAC ${flow.selectedMac} marked ${outcome} · moved to Outward`);
      setFlow((current) => ({ ...current, selectedMac: "" }));
    } catch (err) {
      flashErr(err.message || "Could not update repair status.");
    }
  }

  if (!session) {
    return <CpeLogin title="CPE Entry Desk Login" />;
  }

  const heroTitle =
    entryView === "customer"
      ? "Customer Master"
      : entryView === "item"
        ? "Item Master"
        : entryView === "outward"
          ? "Outward Desk"
          : entryView === "repair"
            ? "Repair Status Desk"
            : entryView === "inward"
              ? "Inward Desk"
              : session.role === "super_admin"
                ? "CPE Entry Desk"
                : session.desk;

  return (
    <main className="cpe-entry">
      <div className="cpe-entry-bg" aria-hidden="true" />

      <section className="cpe-entry-hero">
        <div className="cpe-entry-hero-inner w">
          <div className="cpe-entry-hero-copy">
            <p className="cpe-entry-eyebrow">
              <span className="cpe-entry-pulse" />
              {session.name} · Role-based desk
            </p>
            <h1>{heroTitle}</h1>
            <p className="cpe-entry-lead">
              {entryView === "customer"
                ? "Add customer details first. After save, continue to Item Master."
                : entryView === "item"
                  ? "Add a box model and type. Saved items show up when you scan inward."
                  : entryView === "inward"
                    ? "Select customer and scan MAC IDs. Each scan auto-saves."
                    : entryView === "outward"
                      ? "Ship repaired or scrap boxes to customers."
                      : entryView === "repair"
                        ? "Mark MAC items as Repair or Scrap — they move to Outward."
                        : session.desk}
            </p>
          </div>
          {canDashboard && (
            <div className="cpe-entry-hero-actions">
              <a className="cpe-entry-link" href="#dashboard">
                <span>Open Dashboard</span>
                <small>Excel customer / MAC lookup</small>
              </a>
            </div>
          )}
        </div>
      </section>

      <CpeSessionBar
        session={session}
        showDashboardLink={canDashboard}
        showEntryLink={false}
      />

      <section className="cpe-entry-shell w">
        {(message || error) && (
          <div className="cpe-entry-alerts">
            {message?.type === "ok" && (
              <div className="cpe-entry-success" role="status">
                <SuccessIcon />
                <div>
                  <strong>Saved</strong>
                  <p>{message.text}</p>
                </div>
              </div>
            )}
            {message?.type === "info" && (
              <p className="cpe-entry-message is-info">{message.text}</p>
            )}
            {error && <p className="cpe-entry-error">{error}</p>}
          </div>
        )}

        {canMasters && (entryView === "customer" || entryView === "item") && (
        <>
        <p className="cpe-entry-steps-note">
          <strong>Customer Master</strong> saves a customer. <strong>Item Master</strong> saves box
          models for inward.
        </p>
        <div className="cpe-entry-tabs" role="tablist" aria-label="Master data">
          <button
            type="button"
            role="tab"
            aria-selected={entryView === "customer"}
            className={entryView === "customer" ? "is-active" : ""}
            onClick={() => openEntrySection("customer")}
          >
            <TabIcon kind="customer" />
            Customer Master
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={entryView === "item"}
            className={entryView === "item" ? "is-active" : ""}
            onClick={() => openEntrySection("item")}
          >
            <TabIcon kind="item" />
            Item Master
          </button>
        </div>
        </>
        )}

        {canMasters && entryView === "customer" ? (
          <form className="cpe-entry-card" onSubmit={saveCustomerMaster}>
            <header className="cpe-entry-card-head">
              <p className="cpe-entry-step-badge">Step 1</p>
              <h2>Customer details</h2>
              <p>Add the customer first. After save, you will continue to add items.</p>
            </header>
            <div className="cpe-entry-grid">
              <label>
                <FieldLabel required>Customer Name</FieldLabel>
                <input
                  required
                  value={customerForm.name}
                  onChange={(e) => onCustomerField("name", e.target.value)}
                  placeholder="Enter customer name"
                />
              </label>
              <label>
                <FieldLabel>Date</FieldLabel>
                <CpeDatePicker
                  value={customerForm.date}
                  onChange={(next) => onCustomerField("date", next)}
                />
              </label>
              <label>
                <FieldLabel>Location</FieldLabel>
                <input
                  value={customerForm.location}
                  onChange={(e) => onCustomerField("location", e.target.value)}
                  placeholder="Enter location"
                />
              </label>
              <label>
                <FieldLabel required>Mobile No</FieldLabel>
                <input
                  required
                  inputMode="numeric"
                  value={customerForm.mobile}
                  onChange={(e) => onCustomerField("mobile", e.target.value)}
                  placeholder="Enter mobile number"
                />
              </label>
              <label className="cpe-entry-span">
                <FieldLabel>Customer Remarks</FieldLabel>
                <input
                  value={customerForm.remarks}
                  onChange={(e) => onCustomerField("remarks", e.target.value)}
                  placeholder="Enter remarks"
                />
              </label>
            </div>
            <div className="cpe-entry-actions">
              <button type="submit">Save &amp; continue to Item Master</button>
              <button
                type="button"
                className="cpe-entry-secondary"
                onClick={() => setCustomerForm(emptyCustomer)}
              >
                Clear
              </button>
            </div>
          </form>
        ) : null}

        {canMasters && entryView === "item" && (
          <form className="cpe-entry-card" onSubmit={saveItemMaster}>
            <header className="cpe-entry-card-head">
              <h2>Add item</h2>
              <p>Enter a box model and type. Saved items are available when you scan inward.</p>
            </header>
            <div className="cpe-entry-grid">
              <label>
                <FieldLabel required>Box Model</FieldLabel>
                <input
                  required
                  autoFocus
                  value={itemForm.boxModel}
                  onChange={(e) => onItemField("boxModel", e.target.value)}
                  placeholder="Enter box model"
                />
              </label>
              <label>
                <FieldLabel>Box Type</FieldLabel>
                <CpeComboBox
                  value={itemForm.boxType}
                  options={boxTypeOptions}
                  placeholder="Select box type"
                  allowCustom={false}
                  onChange={(value) => onItemField("boxType", value)}
                />
              </label>
            </div>
            <div className="cpe-entry-actions">
              <button type="submit">Save item</button>
              <button
                type="button"
                className="cpe-entry-secondary"
                onClick={() => setItemForm(emptyItem)}
              >
                Clear
              </button>
            </div>
            {(itemsLoading || items.length > 0) && (
              <div className="cpe-entry-mini-list">
                <p>Saved item models</p>
                {itemsLoading ? (
                  <div>
                    <Skel className="cpe-skel-line" />
                    <Skel className="cpe-skel-line is-short" />
                    <Skel className="cpe-skel-line" />
                  </div>
                ) : (
                <ul>
                  {items.map((item) => (
                    <li key={`${item.boxModel}-${item.sno}`}>
                      <div>
                        <strong>{item.boxModel}</strong>
                        <span>{item.boxType}</span>
                      </div>
                      {canDelete && (
                        <DeleteIconButton
                          tip={`Delete item ${item.boxModel} from Item Master`}
                          label={`Delete item ${item.boxModel}`}
                          onClick={() => askDeleteProduct(item)}
                        />
                      )}
                    </li>
                  ))}
                </ul>
                )}
              </div>
            )}
          </form>
        )}
        {entryView === "inward" && (
          <>
          <CpeCustomerBoard
            customers={customers}
            loading={customersLoading}
            focus="inward"
            onSelect={pickCustomerForDesk}
            selectLabel="Use customer"
            activeKey={flow.mobile}
          />
          <section id="cpe-desk-work" className="cpe-entry-card cpe-entry-flow">
            <header className="cpe-entry-card-head">
              <h2>Inward</h2>
              <p>
                Enter customer name/mobile to autofill, then scan MAC. Each scan auto-saves and
                quantity increases.
              </p>
            </header>

            <div className="cpe-entry-grid">
              <label>
                <FieldLabel required>Customer Name</FieldLabel>
                <CpeComboBox
                  value={flow.name}
                  options={customerNameOptions}
                  placeholder="Enter customer name or Select"
                  onChange={(value) => onFlowField("name", value)}
                  onSelect={(opt) => applyCustomerToFlow(opt?.customer)}
                />
              </label>
              <label>
                <FieldLabel required>Mobile No</FieldLabel>
                <CpeComboBox
                  value={flow.mobile}
                  options={customerMobileOptions}
                  placeholder="Enter mobile number or Select"
                  onChange={(value) => onFlowField("mobile", value)}
                  onSelect={(opt) => applyCustomerToFlow(opt?.customer)}
                />
              </label>
              <label>
                <FieldLabel>Date</FieldLabel>
                <CpeDatePicker value={flow.date} onChange={onDeskDate} />
              </label>
              <label>
                <FieldLabel>Location</FieldLabel>
                <input value={flow.location} readOnly placeholder="Auto filled from customer" />
              </label>
              <label className="cpe-entry-span">
                <FieldLabel>Customer Remarks</FieldLabel>
                <input value={flow.remarks} readOnly placeholder="Auto filled from customer" />
              </label>
              <label>
                <FieldLabel>Box Model</FieldLabel>
                <CpeComboBox
                  value={flow.boxModel}
                  options={boxModelOptions}
                  placeholder="Select item / box model"
                  allowCustom
                  onChange={(value) => onFlowField("boxModel", value)}
                />
              </label>
              <label>
                <FieldLabel>Box Type</FieldLabel>
                <CpeComboBox
                  value={flow.boxType}
                  options={boxTypeOptions}
                  placeholder="Select box type"
                  allowCustom={false}
                  onChange={(value) => onFlowField("boxType", value)}
                />
              </label>
              <div className="cpe-entry-span cpe-entry-mac-block">
                <FieldLabel required>MAC ID (scanner)</FieldLabel>
                {(matchedFlowCustomer || flow.mobile) && (
                  <p className="cpe-entry-scan-target">
                    Saving to{" "}
                    <strong>
                      {matchedFlowCustomer?.name || flow.name || "customer"}
                    </strong>
                    {" · "}
                    {matchedFlowCustomer?.mobile || flow.mobile}
                  </p>
                )}
                {!matchedFlowCustomer && !normalizeMobile(flow.mobile) && (
                  <p className="cpe-entry-scan-target is-warn">
                    Fill Customer Name or Mobile above first — then Add MAC will work.
                  </p>
                )}
                <div className="cpe-entry-scan-row">
                  <input
                    ref={macInputRef}
                    id="cpe-mac-scan-input"
                    value={flow.macScan}
                    onChange={(e) => {
                      setScanFeedback(null);
                      onFlowField("macScan", e.target.value);
                    }}
                    onKeyDown={handleMacScan}
                    placeholder="Focus here · scan barcode / type MAC · press Enter"
                    autoComplete="off"
                    autoFocus={entryView === "inward"}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      commitMacScan();
                    }}
                  >
                    Add MAC
                  </button>
                  <button
                    type="button"
                    className="cpe-entry-secondary"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      commitMacScan(true);
                    }}
                  >
                    No MAC ID
                  </button>
                  <button
                    type="button"
                    className="cpe-entry-bulk-btn"
                    title="Upload MAC IDs from Excel sheet"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openBulkUpload();
                    }}
                  >
                    <ExcelBrandIcon />
                    <span>Upload XL sheet</span>
                  </button>
                </div>
                {scanFeedback && (
                  <p
                    className={`cpe-entry-scan-feedback ${
                      scanFeedback.type === "ok" ? "is-ok" : "is-err"
                    }`}
                    role="status"
                  >
                    {scanFeedback.text}
                  </p>
                )}
                <p className="cpe-entry-scan-help">
                  How to scan: plug in a USB barcode/MAC scanner (keyboard mode). Click this
                  field, scan the box sticker — the scanner types the MAC and sends Enter, and
                  the row saves automatically. You can also type the MAC and press Enter or
                  click Add MAC.
                </p>
              </div>
            </div>

            <div className="cpe-entry-scan-summary">
              <div className="cpe-entry-scan-qty">
                <span>Session quantity</span>
                <div className="cpe-entry-scan-qty-row">
                  <strong>{inwardScanRows.length}</strong>
                  <span className="cpe-entry-excel-wrap">
                    <button
                      type="button"
                      className="cpe-entry-download-xl"
                      disabled={inwardScanRows.length === 0}
                      aria-label="Download Excel"
                      onClick={handleDownloadInwardExcel}
                    >
                      <ExcelBrandIcon />
                    </button>
                    <span className="cpe-entry-excel-tip" role="tooltip">
                      Download Excel
                    </span>
                  </span>
                </div>
              </div>
              <button type="button" className="cpe-entry-secondary" onClick={clearFlow}>
                Clear form
              </button>
            </div>

            {inwardScanRows.length > 0 && (
              <>
                <div className="cpe-entry-scan-table">
                  <table>
                    <thead>
                      <tr>
                        <th>MAC ID</th>
                        <th>Qty after scan</th>
                        {canDelete && <th aria-label="Delete" />}
                      </tr>
                    </thead>
                    <tbody>
                      {sessionScanPager.pageItems.map((row) => (
                        <tr key={row.macId}>
                          <td data-label="MAC ID">
                            <code>{row.macId}</code>
                          </td>
                          <td data-label="Qty after scan">{row.quantity}</td>
                          {canDelete && (
                            <td data-label="Delete">
                              <DeleteIconButton
                                tip={`Delete scanned MAC ${row.macId}`}
                                label={`Delete MAC ${row.macId}`}
                                onClick={() => askDeleteSessionScan(row)}
                              />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <TablePager
                  page={sessionScanPager.page}
                  totalPages={sessionScanPager.totalPages}
                  totalItems={sessionScanPager.totalItems}
                  from={sessionScanPager.from}
                  to={sessionScanPager.to}
                  onPrev={sessionScanPager.goPrev}
                  onNext={sessionScanPager.goNext}
                  onPage={sessionScanPager.setPage}
                  pageSize={sessionScanPager.pageSize}
                  onPageSize={sessionScanPager.setPageSize}
                  label="scans"
                />
              </>
            )}
          </section>
          </>
        )}

        {entryView === "outward" && <CpeOutwardDesk customers={customers} loading={customersLoading} />}

        {entryView === "repair" && (
          <>
          <CpeCustomerBoard
            customers={customers}
            loading={customersLoading}
            focus="repair"
            onSelect={pickCustomerForDesk}
            selectLabel="Use customer"
            activeKey={flow.mobile}
          />
          <section id="cpe-desk-work" className="cpe-entry-card cpe-entry-flow">
            <header className="cpe-entry-card-head">
              <h2>Repair Status</h2>
              <p>
                Search customer to autofill. Filter and choose a MAC, review details, then mark
                Repair or Scrap — it moves to Outward.
              </p>
            </header>

            <div className="cpe-entry-grid">
              <label>
                <FieldLabel required>Customer Name</FieldLabel>
                <CpeComboBox
                  value={flow.name}
                  options={customerNameOptions}
                  placeholder="Enter customer name or Select"
                  onChange={(value) => onFlowField("name", value)}
                  onSelect={(opt) => applyCustomerToFlow(opt?.customer)}
                />
              </label>
              <label>
                <FieldLabel required>Mobile No</FieldLabel>
                <CpeComboBox
                  value={flow.mobile}
                  options={customerMobileOptions}
                  placeholder="Enter mobile number or Select"
                  onChange={(value) => onFlowField("mobile", value)}
                  onSelect={(opt) => applyCustomerToFlow(opt?.customer)}
                />
              </label>
              <label>
                <FieldLabel>Date</FieldLabel>
                <CpeDatePicker value={flow.date} onChange={onDeskDate} />
              </label>
              <label>
                <FieldLabel>Location</FieldLabel>
                <input value={flow.location} readOnly placeholder="Auto filled from customer" />
              </label>
              <label className="cpe-entry-span">
                <FieldLabel>Customer Remarks</FieldLabel>
                <input value={flow.remarks} readOnly placeholder="Auto filled from customer" />
              </label>
              <div className="cpe-entry-span">
                <FieldLabel required>MAC ID</FieldLabel>
                {!matchedFlowCustomer ? (
                  <p className="cpe-entry-hint">Select a customer first, then pick a box.</p>
                ) : inwardMacs.length === 0 ? (
                  <p className="cpe-entry-hint">
                    No inward boxes for this customer. Scan them in Inward first.
                  </p>
                ) : (
                  <MacPicker
                    devices={inwardMacs}
                    value={flow.selectedMac}
                    onPick={(macId) => onFlowField("selectedMac", macId)}
                  />
                )}
              </div>
            </div>

            {selectedDevice && (
              <div className="cpe-entry-mac-details">
                <p className="cpe-entry-mac-details-title">Selected MAC details</p>
                <dl>
                  <div>
                    <dt>MAC ID</dt>
                    <dd>
                      <code>{selectedDevice.macId}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>Box Model</dt>
                    <dd>{selectedDevice.boxModel || "—"}</dd>
                  </div>
                  <div>
                    <dt>Box Type</dt>
                    <dd>{selectedDevice.boxType || "—"}</dd>
                  </div>
                  <div>
                    <dt>Inward Date</dt>
                    <dd>{selectedDevice.receivedDate || "—"}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <span
                        className={`cpe-entry-pill ${
                          selectedDevice.repairStatus === DEVICE_STATUS.SCRAP
                            ? "is-bad"
                            : selectedDevice.repairStatus === DEVICE_STATUS.REPAIRED
                              ? "is-ok"
                              : "is-warn"
                        }`}
                      >
                        {selectedDevice.repairStatus || "Inward"}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Outward Date</dt>
                    <dd>{selectedDevice.outwardDate || "—"}</dd>
                  </div>
                  <div className="cpe-entry-mac-details-span">
                    <dt>Remarks</dt>
                    <dd>{selectedDevice.remarks || "—"}</dd>
                  </div>
                </dl>

                <div className="cpe-entry-outcome-actions">
                  <button
                    type="button"
                    className="cpe-entry-repair"
                    onClick={() => applyOutcome(DEVICE_STATUS.REPAIRED)}
                  >
                    Repair
                  </button>
                  <button
                    type="button"
                    className="cpe-entry-scrap"
                    onClick={() => applyOutcome(DEVICE_STATUS.SCRAP)}
                  >
                    Scrap
                  </button>
                  <button type="button" className="cpe-entry-secondary" onClick={clearFlow}>
                    Clear
                  </button>
                </div>
              </div>
            )}
          </section>
          </>
        )}
      </section>

      <DeleteConfirmModal
        open={Boolean(deleteDialog)}
        title={deleteDialog?.title || ""}
        message={deleteDialog?.message || ""}
        confirmLabel={deleteDialog?.confirmLabel || "Delete"}
        onCancel={closeDeleteDialog}
        onConfirm={confirmDeleteDialog}
      />
      <SuccessModal
        open={Boolean(itemSuccess)}
        title={itemSuccess?.title || "Saved"}
        message={itemSuccess?.message || ""}
        buttonLabel="Continue"
        onClose={() => setItemSuccess(null)}
      />
      <CpeBulkMacUpload
        open={bulkUploadOpen}
        customerLabel={
          matchedFlowCustomer
            ? `${matchedFlowCustomer.name} · ${matchedFlowCustomer.mobile}`
            : flow.name || flow.mobile
              ? `${flow.name || "Customer"} · ${flow.mobile || ""}`.trim()
              : ""
        }
        onClose={() => setBulkUploadOpen(false)}
        onUploadMac={uploadBulkMac}
        onComplete={({ saved, failed }) => {
          if (saved > 0 && failed === 0) {
            flashScanOk(`Bulk upload success · ${saved} MAC ID${saved === 1 ? "" : "s"} saved.`);
          } else if (saved > 0) {
            flashScanOk(
              `Bulk upload finished · ${saved} saved, ${failed} error${failed === 1 ? "" : "s"}.`,
            );
          } else if (failed > 0) {
            flashScanErr(`Bulk upload failed · ${failed} MAC ID${failed === 1 ? "" : "s"} had errors.`);
          }
        }}
      />
    </main>
  );
}
