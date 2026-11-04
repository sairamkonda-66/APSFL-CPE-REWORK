import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CpeLogin from "./CpeLogin";
import CpeSessionBar from "./CpeSessionBar";
import { CPE_ROLES, roleCanAccessDashboard } from "../js/cpeAuth";
import {
  DASHBOARD_SUBTITLE,
  DASHBOARD_TITLE,
  customerStatusCounts,
  dashboardStats,
  deleteCustomer,
  deleteCustomerDevice,
  deviceMatchesQuery,
  downloadCustomerExcel,
  downloadCustomersExcel,
  findCustomersByQuery,
  setPendingAddItem,
  setPendingEdit,
  updateCustomerMaster,
} from "../js/customerData";
import { RepairStatusPills, StatusCount } from "./CpeCustomerBoard";
import { DeleteConfirmModal, DeleteIconButton } from "./CpeDeleteUi";
import CpeDatePicker from "./CpeDatePicker";
import ExcelBrandIcon from "./ExcelBrandIcon";
import { TablePager, usePagination } from "./pagination";
import { useCpeSession } from "../js/useCpeSession";
import { useCustomers } from "../js/useCustomers";
import { LoadingNote, Skel } from "./CpeSkeleton";
import "../css/CpeDashboard.css";

/** Animate a number from 0 → target on mount / when target changes. */
function CountUp({ value, duration = 1100 }) {
  const target = Math.max(0, Math.round(Number(value) || 0));
  const [display, setDisplay] = useState(0);
  const frameRef = useRef(0);
  const startRef = useRef(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(target);
      return undefined;
    }

    cancelAnimationFrame(frameRef.current);
    fromRef.current = 0;
    setDisplay(0);
    startRef.current = 0;
    const span = Math.max(0, target - fromRef.current);
    const ms = Math.min(1600, Math.max(650, duration + Math.min(span, 800)));

    function tick(now) {
      if (!startRef.current) startRef.current = now;
      const t = Math.min(1, (now - startRef.current) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(fromRef.current + span * eased));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return <strong>{display.toLocaleString("en-IN")}</strong>;
}

function statusClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "shipped") return "is-ship";
  if (s === "repaired") return "is-ok";
  if (s === "inward") return "is-warn";
  if (s === "scrap") return "is-bad";
  return "";
}

function formatDate(value) {
  if (!value) return "—";
  return value;
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M13.5 6.5l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function ViewIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12S6.2 6.5 12 6.5 21.5 12 21.5 12 17.8 17.5 12 17.5 2.5 12 2.5 12z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16.5 16.5L20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function EditCustomerModal({ customer, onClose }) {
  if (!customer) return null;
  return <EditCustomerForm key={customer.mobile} customer={customer} onClose={onClose} />;
}

function EditCustomerForm({ customer, onClose }) {
  const [form, setForm] = useState({
    name: customer.name || "",
    date: customer.date || "",
    location: customer.location || "",
    mobile: customer.mobile || "",
    remarks: customer.remarks || "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  function onChange(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function onSubmit(event) {
    event.preventDefault();
    try {
      updateCustomerMaster(customer.mobile, form);
      onClose();
    } catch (err) {
      setError(err.message || "Could not save customer.");
    }
  }

  return createPortal(
    <div className="cpe-edit-modal-root" role="presentation">
      <button type="button" className="cpe-edit-modal-backdrop" aria-label="Close" onClick={onClose} />
      <form
        className="cpe-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cpe-edit-modal-title"
        onSubmit={onSubmit}
      >
        <header className="cpe-edit-modal-head">
          <div>
            <p>Customer Master</p>
            <h3 id="cpe-edit-modal-title">Edit customer</h3>
          </div>
          <button type="button" className="cpe-edit-modal-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="cpe-edit-modal-grid">
          <label>
            <span>Customer Name</span>
            <input
              required
              autoFocus
              value={form.name}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder="Enter customer name"
            />
          </label>
          <label>
            <span>Date</span>
            <CpeDatePicker value={form.date} onChange={(next) => onChange("date", next)} />
          </label>
          <label>
            <span>Location</span>
            <input
              value={form.location}
              onChange={(e) => onChange("location", e.target.value)}
              placeholder="Enter location"
            />
          </label>
          <label>
            <span>Mobile No</span>
            <input
              required
              inputMode="numeric"
              value={form.mobile}
              onChange={(e) => onChange("mobile", e.target.value)}
              placeholder="Enter mobile number"
            />
          </label>
          <label className="cpe-edit-span">
            <span>Remarks</span>
            <input
              value={form.remarks}
              onChange={(e) => onChange("remarks", e.target.value)}
              placeholder="Enter remarks"
            />
          </label>
        </div>
        {error && <p className="cpe-edit-modal-error">{error}</p>}
        <div className="cpe-edit-modal-actions">
          <button type="button" className="cpe-edit-modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="cpe-edit-modal-save">
            Save
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

function goToEdit(mobile, macId = "", section = "repair") {
  setPendingEdit(mobile, macId, section);
  window.location.hash = "#enter-details";
}

function goToAddItem(mobile) {
  setPendingAddItem(mobile);
  window.location.hash = "#enter-details";
}

function CustomerDevicesTable({ customer, activeQuery, canDelete, onDeleteDevice }) {
  const devices = customer.devices || [];
  const pager = usePagination(devices, 10);
  const [openKeys, setOpenKeys] = useState([]);

  useEffect(() => {
    setOpenKeys([]);
  }, [pager.page, pager.pageSize, devices.length, customer.mobile]);

  function toggleOpen(key) {
    setOpenKeys((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    );
  }

  return (
    <>
      <div className="cpe-dash-table-wrap">
        <table className="cpe-dash-device-table">
          <caption>
            CPE rework log · {devices.length} device{devices.length === 1 ? "" : "s"}
          </caption>
          <thead>
            <tr>
              <th>S No</th>
              <th>MAC ID</th>
              <th>Box</th>
              <th>Inward</th>
              <th>Status</th>
              <th>Outward</th>
              <th>Remarks</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr>
                <td colSpan={8}>No CPE boxes scanned for this customer yet.</td>
              </tr>
            ) : (
              pager.pageItems.map((device) => {
                const key = `${customer.mobile}-${device.macId}-${device.sno}`;
                const open = openKeys.includes(key);
                const hit = deviceMatchesQuery(device, activeQuery);
                return (
                  <tr
                    key={key}
                    className={`${hit ? "is-mac-hit " : ""}${open ? "is-open" : ""}`.trim()}
                  >
                    <td className="cpe-dash-card-head">
                      <button
                        type="button"
                        className="cpe-dash-card-toggle"
                        aria-expanded={open}
                        onClick={() => toggleOpen(key)}
                      >
                        <span className="cpe-dash-card-summary">
                          <strong>{customer.name}</strong>
                          <span className="cpe-dash-card-sub">
                            <code>{device.macId}</code>
                            <span className="cpe-dash-card-sub-note">
                              {` · ${device.repairStatus || "—"}`}
                            </span>
                          </span>
                        </span>
                        <span className="cpe-dash-card-meta" aria-hidden="true">
                          <em>{device.sno}</em>
                          <span className="cpe-dash-card-chevron" />
                        </span>
                      </button>
                    </td>
                    <td className="cpe-dash-card-detail" data-label="S No">
                      {device.sno}
                    </td>
                    <td className="cpe-dash-card-desk" data-label="MAC ID">
                      <code>{device.macId}</code>
                    </td>
                    <td className="cpe-dash-card-detail" data-label="Box">
                      <span className="cpe-dash-box-cell">
                        {device.boxModel || device.boxType || "—"}
                        {device.boxModel && device.boxType && device.boxModel !== device.boxType
                          ? ` · ${device.boxType}`
                          : ""}
                      </span>
                    </td>
                    <td className="cpe-dash-card-detail" data-label="Inward">
                      {formatDate(device.receivedDate)}
                    </td>
                    <td className="cpe-dash-card-detail" data-label="Status">
                      <span className={`cpe-dash-status ${statusClass(device.repairStatus)}`}>
                        {device.repairStatus}
                      </span>
                    </td>
                    <td className="cpe-dash-card-detail" data-label="Outward">
                      {formatDate(device.outwardDate)}
                    </td>
                    <td className="cpe-dash-card-detail" data-label="Remarks">
                      <span className="cpe-dash-remark-cell">{device.remarks || "—"}</span>
                    </td>
                    <td className="cpe-dash-card-detail" data-label="Actions">
                      <div className="cpe-dash-row-actions">
                        <button
                          type="button"
                          className="cpe-dash-edit-icon"
                          aria-label={`Repair ${device.macId}`}
                          title="Open Repair Status"
                          onClick={() => goToEdit(customer.mobile, device.macId, "repair")}
                        >
                          <EditIcon />
                        </button>
                        {canDelete && (
                          <DeleteIconButton
                            tip={`Delete MAC item ${device.macId} only`}
                            label={`Delete MAC ${device.macId}`}
                            onClick={() => onDeleteDevice(customer, device)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <TablePager
        page={pager.page}
        totalPages={pager.totalPages}
        totalItems={pager.totalItems}
        from={pager.from}
        to={pager.to}
        onPrev={pager.goPrev}
        onNext={pager.goNext}
        onPage={pager.setPage}
        pageSize={pager.pageSize}
        onPageSize={pager.setPageSize}
        label="devices"
      />
    </>
  );
}

export default function CpeDashboard() {
  const session = useCpeSession();
  const { customers, loading } = useCustomers();
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [activeQuery, setActiveQuery] = useState("");
  const [downloadMsg, setDownloadMsg] = useState("");
  const [downloadIsError, setDownloadIsError] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [editCustomer, setEditCustomer] = useState(null);
  const [openMasterKeys, setOpenMasterKeys] = useState([]);
  const masterPager = usePagination(customers, 10);

  useEffect(() => {
    if (!session) return;
    if (!roleCanAccessDashboard(session.role)) {
      window.location.hash = "#enter-details";
    }
  }, [session]);

  useEffect(() => {
    setOpenMasterKeys([]);
  }, [masterPager.page, masterPager.pageSize, customers.length]);

  function toggleMasterOpen(key) {
    setOpenMasterKeys((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    );
  }

  const canDelete = session?.role === CPE_ROLES.SUPER_ADMIN;

  function handleDownloadOne(customer) {
    try {
      downloadCustomerExcel(customer);
      setDownloadIsError(false);
      setDownloadMsg(`Downloaded Excel · ${customer.name} only.`);
      window.setTimeout(() => setDownloadMsg(""), 3500);
    } catch (err) {
      setDownloadIsError(true);
      setDownloadMsg(err.message || "Download failed.");
    }
  }

  function handleDownloadAll() {
    try {
      const count = downloadCustomersExcel(customers);
      setDownloadIsError(false);
      setDownloadMsg(`Downloaded all customers Excel · ${count} customer${count === 1 ? "" : "s"}.`);
      window.setTimeout(() => setDownloadMsg(""), 3500);
    } catch (err) {
      setDownloadIsError(true);
      setDownloadMsg(err.message || "Download failed.");
    }
  }

  function askDeleteCustomer(customer) {
    if (!canDelete) return;
    const boxes = (customer.devices || []).length;
    setDeleteDialog({
      kind: "customer",
      title: "Delete customer?",
      message: `Remove “${customer.name}” (${customer.mobile}).\nThis also deletes ${boxes} MAC / box item${boxes === 1 ? "" : "s"}.`,
      confirmLabel: "Delete customer",
      customer,
    });
  }

  function askDeleteDevice(customer, device) {
    if (!canDelete) return;
    setDeleteDialog({
      kind: "device",
      title: "Delete MAC item?",
      message: `Remove MAC “${device.macId}” for ${customer.name}.\nOnly this item will be deleted.`,
      confirmLabel: "Delete item",
      customer,
      device,
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
        setDownloadIsError(false);
        setDownloadMsg(`Deleted customer · ${deleteDialog.customer.name}.`);
      } else if (deleteDialog.kind === "device") {
        deleteCustomerDevice(deleteDialog.customer.mobile, deleteDialog.device.macId);
        setDownloadIsError(false);
        setDownloadMsg(`Deleted MAC · ${deleteDialog.device.macId}.`);
      }
      window.setTimeout(() => setDownloadMsg(""), 3500);
    } catch (err) {
      setDownloadIsError(true);
      setDownloadMsg(err.message || "Delete failed.");
    }
    setDeleteDialog(null);
  }

  const stats = useMemo(() => dashboardStats(customers), [customers]);

  const results = useMemo(() => {
    if (!searched || !activeQuery) return [];
    return findCustomersByQuery(activeQuery, customers);
  }, [searched, activeQuery, customers]);

  const quickMacs = useMemo(
    () =>
      customers
        .flatMap((c) => c.devices || [])
        .map((d) => d.macId)
        .filter(Boolean)
        .slice(0, 8),
    [customers],
  );

  function runSearch(event) {
    event?.preventDefault();
    const next = String(query || "").trim();
    setActiveQuery(next);
    setSearched(Boolean(next));
  }

  function clearSearch() {
    setQuery("");
    setActiveQuery("");
    setSearched(false);
  }

  function quickFill(value) {
    const next = String(value || "").trim();
    setQuery(next);
    setActiveQuery(next);
    setSearched(Boolean(next));
  }

  if (!session) {
    return <CpeLogin title="CPE Dashboard Login" />;
  }

  if (session.role !== CPE_ROLES.SUPER_ADMIN) {
    return (
      <main className="cpe-dash">
        <div className="cpe-dash-bg" aria-hidden="true" />
        <section className="cpe-dash-hero">
          <div className="cpe-dash-hero-inner w">
            <div className="cpe-dash-hero-copy">
              <p className="cpe-dash-eyebrow">Access limited</p>
              <h1>Dashboard is for Super Admin</h1>
              <p className="cpe-dash-note">
                You are signed in as {session.name}. Open your assigned desk instead.
              </p>
              <p className="cpe-dash-note">
                <a className="cpe-dash-linkish" href="#enter-details">
                  Go to {session.name} desk →
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="cpe-dash">
      <div className="cpe-dash-bg" aria-hidden="true" />

      <section className="cpe-dash-hero">
        <div className="cpe-dash-hero-inner w">
          <div className="cpe-dash-hero-copy">
            <p className="cpe-dash-eyebrow">
              <span className="cpe-dash-pulse" />
              Super Admin · Excel customer sheet live
            </p>
            <h1>{DASHBOARD_TITLE}</h1>
            <p className="cpe-dash-lead">{DASHBOARD_SUBTITLE}</p>
            <p className="cpe-dash-note">
              Showing APSFL CPE customer sheet details. Search by name, mobile, or MAC.
            </p>
          </div>
          <div className="cpe-dash-hero-panel">
            <p className="cpe-dash-hero-panel-label">Quick actions</p>
            <a className="cpe-dash-cta" href="#enter-details">
              <span>Entry desk</span>
              <small>Masters + Inward / Outward / Repair</small>
            </a>
            {downloadMsg && (
              <p className={`cpe-dash-download-msg${downloadIsError ? " is-error" : ""}`}>{downloadMsg}</p>
            )}
            <div className="cpe-dash-hero-chips" aria-busy={loading}>
              {loading ? (
                <>
                  <LoadingNote>Loading summary</LoadingNote>
                  <Skel className="cpe-skel-chip" />
                  <Skel className="cpe-skel-chip" />
                  <Skel className="cpe-skel-chip" />
                </>
              ) : (
                <>
                  <span>{stats.customers} customers</span>
                  <span>{stats.devices} boxes</span>
                  <span>{stats.pending} open</span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <CpeSessionBar session={session} showEntryLink showDashboardLink={false} />

      <section className="cpe-dash-stats w" aria-label="Summary" aria-busy={loading}>
        <article data-tone="customers">
          <span className="cpe-dash-stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="2.6" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M7.2 18.2c.4-2.55 2.35-4.1 4.8-4.1s4.4 1.55 4.8 4.1"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <circle cx="6.4" cy="9.1" r="2.05" stroke="currentColor" strokeWidth="1.55" />
              <path
                d="M3.2 17.6c.3-1.85 1.55-3 3.2-3.2"
                stroke="currentColor"
                strokeWidth="1.55"
                strokeLinecap="round"
              />
              <circle cx="17.6" cy="9.1" r="2.05" stroke="currentColor" strokeWidth="1.55" />
              <path
                d="M20.8 17.6c-.3-1.85-1.55-3-3.2-3.2"
                stroke="currentColor"
                strokeWidth="1.55"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <p className="cpe-dash-stat-label">Customers</p>
          {loading ? <Skel className="cpe-skel-stat" /> : <CountUp value={stats.customers} />}
        </article>
        <article data-tone="boxes">
          <span className="cpe-dash-stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3.6 19.2 7.5v9L12 20.4 4.8 16.5v-9L12 3.6Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path d="M12 20.4V12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <path
                d="M4.8 7.5 12 12l7.2-4.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <p className="cpe-dash-stat-label">CPE boxes</p>
          {loading ? <Skel className="cpe-skel-stat" /> : <CountUp value={stats.devices} />}
        </article>
        <article data-tone="outward">
          <span className="cpe-dash-stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M14.2 5.2v13.6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <path
                d="M14.2 5.2c3.5 1.5 5.6 4.1 5.6 6.8s-2.1 5.3-5.6 6.8"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <path
                d="M4.2 12h9.2"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <path
                d="M10.4 8.4 14.2 12l-3.8 3.6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <p className="cpe-dash-stat-label">Outward</p>
          {loading ? <Skel className="cpe-skel-stat" /> : <CountUp value={stats.repaired} />}
        </article>
        <article data-tone="inward">
          <span className="cpe-dash-stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M9.8 5.2v13.6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <path
                d="M9.8 5.2C6.3 6.7 4.2 9.3 4.2 12s2.1 5.3 5.6 6.8"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <path
                d="M19.8 12H10.6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <path
                d="M13.6 8.4 9.8 12l3.8 3.6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <p className="cpe-dash-stat-label">Inward</p>
          {loading ? <Skel className="cpe-skel-stat" /> : <CountUp value={stats.pending} />}
        </article>
      </section>

      <section className="cpe-dash-search w">
        <form className="cpe-dash-search-bar" onSubmit={runSearch}>
          <div className="cpe-dash-search-copy">
            <label htmlFor="cpe-mobile-search">Lookup by name, mobile, or MAC ID</label>
            <p>Partial match across Customer Master and scanned CPE MAC IDs</p>
          </div>
          <div className="cpe-dash-search-row">
            <label className="cpe-dash-search-field" htmlFor="cpe-mobile-search">
              <span className="cpe-dash-search-icon">
                <SearchIcon />
              </span>
              <input
                id="cpe-mobile-search"
                type="search"
                autoComplete="off"
                placeholder="Name / mobile / MAC"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button type="submit">Search</button>
            {searched && (
              <button type="button" className="cpe-dash-clear" onClick={clearSearch}>
                Clear
              </button>
            )}
          </div>
        </form>

        {customers.length > 0 && (
          <div className="cpe-dash-hints">
            <span>Quick name</span>
            {customers.map((c) => (
              <button key={`n-${c.mobile}`} type="button" onClick={() => quickFill(c.name)}>
                {c.name}
              </button>
            ))}
          </div>
        )}
        {customers.length > 0 && (
          <div className="cpe-dash-hints">
            <span>Quick mobile</span>
            {customers.map((c) => (
              <button key={c.mobile} type="button" onClick={() => quickFill(c.mobile)}>
                {c.mobile}
              </button>
            ))}
          </div>
        )}
        {quickMacs.length > 0 && (
          <div className="cpe-dash-hints">
            <span>Quick MAC</span>
            {quickMacs.map((mac) => (
              <button key={mac} type="button" onClick={() => quickFill(mac)}>
                {mac}
              </button>
            ))}
          </div>
        )}
      </section>

      {searched && (
        <section className="cpe-dash-results w" aria-live="polite">
          <header className="cpe-dash-results-head">
            <h2>Search results</h2>
            <p>
              {results.length === 0
                ? `No customer found for “${activeQuery}”.`
                : `${results.length} customer${results.length === 1 ? "" : "s"} for “${activeQuery}”.`}
            </p>
          </header>

          {results.map((customer) => (
            <article className="cpe-dash-customer" key={customer.mobile}>
              <header>
                <div>
                  <p className="cpe-dash-kicker">S.No {customer.sno}</p>
                  <h3>{customer.name}</h3>
                  <div className="cpe-dash-customer-actions">
                    <button
                      type="button"
                      className="cpe-dash-add-item"
                      onClick={() => goToAddItem(customer.mobile)}
                    >
                      <PlusIcon />
                      Add new item for this customer
                    </button>
                    <button
                      type="button"
                      className="cpe-dash-edit-icon"
                      aria-label={`Edit ${customer.name}`}
                      title="Edit customer"
                      onClick={() => setEditCustomer(customer)}
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      className="cpe-dash-excel-icon"
                      aria-label={`Download Excel for ${customer.name}`}
                      title="Download Excel"
                      onClick={() => handleDownloadOne(customer)}
                    >
                      <ExcelBrandIcon />
                    </button>
                    {canDelete && (
                      <DeleteIconButton
                        tip="Delete this customer and all MAC items"
                        label={`Delete customer ${customer.name}`}
                        onClick={() => askDeleteCustomer(customer)}
                      />
                    )}
                  </div>
                </div>
                <dl className="cpe-dash-meta">
                  <div>
                    <dt>Date</dt>
                    <dd>{customer.date || "—"}</dd>
                  </div>
                  <div>
                    <dt>Location</dt>
                    <dd>{customer.location || "—"}</dd>
                  </div>
                  <div>
                    <dt>Mobile No</dt>
                    <dd>{customer.mobile}</dd>
                  </div>
                  <div>
                    <dt>Remarks</dt>
                    <dd>{customer.remarks || "—"}</dd>
                  </div>
                </dl>
              </header>

              <CustomerDevicesTable
                customer={customer}
                activeQuery={activeQuery}
                canDelete={canDelete}
                onDeleteDevice={askDeleteDevice}
              />
            </article>
          ))}
        </section>
      )}

      {!searched && (
        <section className="cpe-dash-master w">
          <header className="cpe-dash-results-head">
            <div className="cpe-dash-results-title-row">
              <h2>Customer Master</h2>
              <span className="cpe-dash-all-excel-wrap">
                <button
                  type="button"
                  className="cpe-dash-excel-icon cpe-dash-all-excel"
                  aria-label="Download all customers data"
                  onClick={handleDownloadAll}
                >
                  <ExcelBrandIcon />
                </button>
                <span className="cpe-dash-all-excel-tip" role="tooltip">
                  download all customers data
                </span>
              </span>
            </div>
            <p>
              {loading
                ? "Loading customers."
                : customers.length === 0
                  ? "No records yet — use Enter Details to add the first customer."
                  : "All customers, with inward, outward, and repair status on each row."}
            </p>
          </header>
          <div className="cpe-dash-table-wrap">
            <table className="cpe-dash-master-table">
              <colgroup>
                <col className="cpe-col-sno" />
                <col className="cpe-col-name" />
                <col className="cpe-col-in" />
                <col className="cpe-col-out" />
                <col className="cpe-col-repair" />
                <col className="cpe-col-boxes" />
                <col className="cpe-col-mobile" />
                <col className="cpe-col-date" />
                <col className="cpe-col-loc" />
                <col className="cpe-col-remarks" />
                <col className="cpe-col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th>S No</th>
                  <th>Customer Name</th>
                  <th>Inward</th>
                  <th>Outward</th>
                  <th>Repair status</th>
                  <th>Boxes</th>
                  <th>Mobile No</th>
                  <th>Date</th>
                  <th>Location</th>
                  <th>Remarks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }, (_, index) => (
                    <tr key={`skel-${index}`} className="cpe-skel-row">
                      <td colSpan={11}>
                        <Skel className="cpe-skel-rowbar" />
                      </td>
                    </tr>
                  ))
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={11}>
                      Empty list.{" "}
                      <a className="cpe-dash-linkish" href="#enter-details">
                        Enter details
                      </a>
                    </td>
                  </tr>
                ) : (
                  masterPager.pageItems.map((c) => {
                    const open = openMasterKeys.includes(c.mobile);
                    const firstMac = c.devices?.[0]?.macId || "—";
                    const counts = customerStatusCounts(c);
                    return (
                      <tr key={c.mobile} className={open ? "is-open" : ""}>
                        <td className="cpe-dash-card-head">
                          <button
                            type="button"
                            className="cpe-dash-card-toggle"
                            aria-expanded={open}
                            onClick={() => toggleMasterOpen(c.mobile)}
                          >
                            <span className="cpe-dash-card-summary">
                              <strong>{c.name}</strong>
                              <span className="cpe-dash-card-sub">
                                <code>{firstMac}</code>
                                <span className="cpe-dash-card-sub-note">
                                  {` · In ${counts.inward} · Out ${counts.outward}`}
                                </span>
                              </span>
                            </span>
                            <span className="cpe-dash-card-meta" aria-hidden="true">
                              <em>{c.devices.length}</em>
                              <span className="cpe-dash-card-chevron" />
                            </span>
                          </button>
                        </td>
                        <td className="cpe-dash-card-detail" data-label="S No">
                          {c.sno}
                        </td>
                        <td className="cpe-dash-card-desk" data-label="Customer Name">
                          {c.name}
                        </td>
                        <td className="cpe-dash-card-detail cpe-dash-status-cell" data-label="Inward">
                          <StatusCount value={counts.inward} tone="warn" />
                        </td>
                        <td className="cpe-dash-card-detail cpe-dash-status-cell" data-label="Outward">
                          <StatusCount value={counts.outward} tone="ok" />
                        </td>
                        <td className="cpe-dash-card-detail cpe-dash-status-cell" data-label="Repair status">
                          <RepairStatusPills counts={counts} />
                        </td>
                        <td className="cpe-dash-card-detail" data-label="Boxes">
                          {c.devices.length}
                        </td>
                        <td className="cpe-dash-card-detail" data-label="Mobile No">
                          <button
                            type="button"
                            className="cpe-dash-linkish"
                            onClick={() => quickFill(c.mobile)}
                          >
                            {c.mobile}
                          </button>
                        </td>
                        <td className="cpe-dash-card-detail" data-label="Date">
                          {c.date || "—"}
                        </td>
                        <td className="cpe-dash-card-detail" data-label="Location">
                          <span className="cpe-dash-clamp">{c.location || "—"}</span>
                        </td>
                        <td className="cpe-dash-card-detail" data-label="Remarks">
                          <span className="cpe-dash-clamp" title={c.remarks || ""}>
                            {c.remarks || "—"}
                          </span>
                        </td>
                        <td className="cpe-dash-card-detail" data-label="Actions">
                          <div className="cpe-dash-actions">
                            <button
                              type="button"
                              className="cpe-dash-view-icon"
                              aria-label={`View ${c.name}`}
                              title="View customer"
                              onClick={() => quickFill(c.mobile)}
                            >
                              <ViewIcon />
                            </button>
                            <button
                              type="button"
                              className="cpe-dash-add-icon"
                              aria-label={`Add item for ${c.name}`}
                              title="Add new item"
                              onClick={() => goToAddItem(c.mobile)}
                            >
                              <PlusIcon />
                            </button>
                            <button
                              type="button"
                              className="cpe-dash-excel-icon"
                              aria-label={`Download Excel for ${c.name}`}
                              title="Download Excel"
                              onClick={() => handleDownloadOne(c)}
                            >
                              <ExcelBrandIcon />
                            </button>
                            <button
                              type="button"
                              className="cpe-dash-edit-icon"
                              aria-label={`Edit ${c.name}`}
                              title="Edit details"
                              onClick={() => setEditCustomer(c)}
                            >
                              <EditIcon />
                            </button>
                            {canDelete && (
                              <DeleteIconButton
                                tip="Delete this customer and all MAC items"
                                label={`Delete customer ${c.name}`}
                                onClick={() => askDeleteCustomer(c)}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {!loading && (
            <TablePager
              page={masterPager.page}
              totalPages={masterPager.totalPages}
              totalItems={masterPager.totalItems}
              from={masterPager.from}
              to={masterPager.to}
              onPrev={masterPager.goPrev}
              onNext={masterPager.goNext}
              onPage={masterPager.setPage}
              pageSize={masterPager.pageSize}
              onPageSize={masterPager.setPageSize}
              label="customers"
            />
          )}
        </section>
      )}

      <EditCustomerModal customer={editCustomer} onClose={() => setEditCustomer(null)} />

      <DeleteConfirmModal
        open={Boolean(deleteDialog)}
        title={deleteDialog?.title || ""}
        message={deleteDialog?.message || ""}
        confirmLabel={deleteDialog?.confirmLabel || "Delete"}
        onCancel={closeDeleteDialog}
        onConfirm={confirmDeleteDialog}
      />
    </main>
  );
}
