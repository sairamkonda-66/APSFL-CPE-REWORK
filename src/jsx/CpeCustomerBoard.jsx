import { useEffect, useMemo, useState } from "react";
import { customerStatusCounts, normalizeMobile } from "../js/customerData";
import { LoadingNote, Skel } from "./CpeSkeleton";
import { TablePager, usePagination } from "./pagination";
import "../css/CpeCustomerBoard.css";

const COPY = {
  inward: {
    kicker: "Inward desk",
    note: "Every customer with inward, outward, and repair status. Select a row to fill the scan form.",
  },
  outward: {
    kicker: "Outward desk",
    note: "Every customer with inward, outward, and repair status. Filter the ship lists from a customer.",
  },
  repair: {
    kicker: "Repair status",
    note: "Every customer with inward, outward, and repair status. Select a row to mark Repair or Scrap.",
  },
};

function statusClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "shipped") return "is-ship";
  if (s === "repaired") return "is-ok";
  if (s === "inward") return "is-warn";
  if (s === "scrap") return "is-bad";
  return "";
}

export function StatusCount({ value, tone = "ok" }) {
  const n = Number(value) || 0;
  return <span className={`cpe-board-count ${n ? `is-${tone}` : "is-zero"}`}>{n}</span>;
}

export function RepairStatusPills({ counts }) {
  const items = [
    counts?.repaired ? { key: "repaired", label: `${counts.repaired} repaired`, tone: "ok" } : null,
    counts?.scrap ? { key: "scrap", label: `${counts.scrap} scrap`, tone: "bad" } : null,
    counts?.shipped ? { key: "shipped", label: `${counts.shipped} shipped`, tone: "ship" } : null,
  ].filter(Boolean);

  if (!items.length) {
    return (
      <span className={`cpe-board-status ${counts?.inward ? "is-warn" : ""}`}>
        {counts?.inward ? "Awaiting" : "—"}
      </span>
    );
  }

  return (
    <span className="cpe-board-pills">
      {items.map((item) => (
        <span key={item.key} className={`cpe-board-status is-${item.tone}`}>
          {item.label}
        </span>
      ))}
    </span>
  );
}

function DeviceRows({ devices }) {
  const pager = usePagination(devices, 6);
  if (!devices.length) {
    return <p className="cpe-board-empty-devices">No boxes for this customer yet.</p>;
  }
  return (
    <div className="cpe-board-devices">
      <table>
        <thead>
          <tr>
            <th>MAC ID</th>
            <th>Box</th>
            <th>Inward</th>
            <th>Repair status</th>
            <th>Outward</th>
          </tr>
        </thead>
        <tbody>
          {pager.pageItems.map((device) => (
            <tr key={`${device.macId}-${device.sno || ""}`}>
              <td data-label="MAC ID">
                <code>{device.macId}</code>
              </td>
              <td data-label="Box">{device.boxModel || device.boxType || "—"}</td>
              <td data-label="Inward">{device.receivedDate || "—"}</td>
              <td data-label="Repair status">
                <span className={`cpe-board-status ${statusClass(device.repairStatus)}`}>
                  {device.repairStatus || "—"}
                </span>
              </td>
              <td data-label="Outward">{device.outwardDate || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {pager.totalPages > 1 && (
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
          label="boxes"
        />
      )}
    </div>
  );
}

function summarize(list) {
  return list.reduce(
    (acc, customer) => {
      const counts = customerStatusCounts(customer);
      acc.customers += 1;
      acc.inward += counts.inward;
      acc.outward += counts.outward;
      acc.repaired += counts.repaired;
      acc.scrap += counts.scrap;
      acc.shipped += counts.shipped;
      return acc;
    },
    { customers: 0, inward: 0, outward: 0, repaired: 0, scrap: 0, shipped: 0 },
  );
}

function BoardSkeletonRows() {
  return Array.from({ length: 4 }, (_, index) => (
    <article key={`skel-${index}`} className="cpe-board-row is-skel">
      <div className="cpe-board-main">
        <div>
          <Skel className="cpe-skel-line" />
          <Skel className="cpe-skel-line is-short" />
        </div>
        <Skel className="cpe-skel-pill" />
        <Skel className="cpe-skel-pill" />
        <Skel className="cpe-skel-wide" />
        <Skel className="cpe-skel-btn" />
      </div>
    </article>
  ));
}

export default function CpeCustomerBoard({
  customers = [],
  loading = false,
  focus = "inward",
  onSelect,
  selectLabel = "Use customer",
  activeKey = "",
}) {
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState("");
  const copy = COPY[focus] || COPY.inward;

  const stats = useMemo(() => summarize(customers), [customers]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers
      .map((customer) => ({ customer, counts: customerStatusCounts(customer) }))
      .filter(({ customer }) => {
        if (!q) return true;
        const macs = (customer.devices || []).map((device) => device.macId).join(" ");
        const hay = `${customer.name || ""} ${customer.mobile || ""} ${customer.location || ""} ${macs}`.toLowerCase();
        return hay.includes(q);
      });
  }, [customers, query]);

  const pager = usePagination(rows, 6);

  useEffect(() => {
    setOpenKey("");
  }, [query, pager.page]);

  function isActive(customer) {
    const key = String(activeKey || "").trim().toLowerCase();
    if (!key) return false;
    return (
      String(customer.name || "").trim().toLowerCase() === key ||
      String(customer.mobile || "").trim() === String(activeKey).trim() ||
      normalizeMobile(customer.mobile) === normalizeMobile(activeKey)
    );
  }

  return (
    <section className={`cpe-board is-${focus}`} aria-label="Customers" aria-busy={loading}>
      <header className="cpe-board-head">
        <div>
          <p className="cpe-board-kicker">{copy.kicker}</p>
          <h2>Customers</h2>
          <p>{copy.note}</p>
        </div>
        <label className="cpe-board-search">
          <span>Find customer</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, mobile, or MAC"
            autoComplete="off"
          />
        </label>
      </header>

      <div className="cpe-board-stats" aria-label="Customer status summary">
        {loading && <LoadingNote>Loading customer cards</LoadingNote>}
        {[
          ["violet", "Customers", stats.customers, false],
          ["amber", "Inward", stats.inward, focus === "inward"],
          ["teal", "Outward", stats.outward, focus === "outward"],
          ["cyan", "Repaired", stats.repaired, focus === "repair"],
          ["rose", "Scrap", stats.scrap, false],
          ["ship", "Shipped", stats.shipped, false],
        ].map(([tone, label, value, focused]) => (
          <article key={tone} data-tone={tone} className={focused ? "is-focus" : ""}>
            <span>{label}</span>
            {loading ? <Skel className="cpe-skel-stat" /> : <strong>{value}</strong>}
          </article>
        ))}
      </div>

      <div className="cpe-board-cols" aria-hidden="true">
        <span>Customer</span>
        <span>Inward</span>
        <span>Outward</span>
        <span>Repair status</span>
        <span />
      </div>

      <div className="cpe-board-list">
        {loading ? (
          <BoardSkeletonRows />
        ) : pager.pageItems.length === 0 ? (
          <p className="cpe-board-empty">
            {customers.length === 0
              ? "No customers yet."
              : `No customer matches “${query.trim()}”.`}
          </p>
        ) : (
          pager.pageItems.map(({ customer, counts }) => {
            const open = openKey === customer.mobile;
            const active = isActive(customer);
            return (
              <article
                key={customer.mobile}
                className={`cpe-board-row${open ? " is-open" : ""}${active ? " is-active" : ""}`}
              >
                <div className="cpe-board-main">
                  <button
                    type="button"
                    className="cpe-board-who"
                    aria-expanded={open}
                    onClick={() => setOpenKey(open ? "" : customer.mobile)}
                  >
                    <strong>{customer.name}</strong>
                    <span>
                      {customer.mobile}
                      {customer.location ? ` · ${customer.location}` : ""}
                      {` · ${counts.boxes} box${counts.boxes === 1 ? "" : "es"}`}
                    </span>
                  </button>
                  <div className="cpe-board-metric">
                    <span className="cpe-board-metric-label">Inward</span>
                    <StatusCount value={counts.inward} tone="warn" />
                  </div>
                  <div className="cpe-board-metric">
                    <span className="cpe-board-metric-label">Outward</span>
                    <StatusCount value={counts.outward} tone="ok" />
                  </div>
                  <div className="cpe-board-metric cpe-board-metric--repair">
                    <span className="cpe-board-metric-label">Repair status</span>
                    <RepairStatusPills counts={counts} />
                  </div>
                  {onSelect && (
                    <button
                      type="button"
                      className="cpe-board-select"
                      onClick={() => onSelect(customer)}
                    >
                      {selectLabel}
                    </button>
                  )}
                </div>
                {open && <DeviceRows devices={customer.devices || []} />}
              </article>
            );
          })
        )}
      </div>

      {!loading && (
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
          label="customers"
        />
      )}
    </section>
  );
}
