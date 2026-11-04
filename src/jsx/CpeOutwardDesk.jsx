import { useEffect, useMemo, useState } from "react";
import {
  DEVICE_STATUS,
  downloadOutwardSectionExcel,
  filterOutwardRows,
  getRepairedOutwardRows,
  getScrapOutwardRows,
  getShippedOutwardRows,
  shipDevices,
} from "../js/customerData";
import CpeCustomerBoard from "./CpeCustomerBoard";
import { Skel } from "./CpeSkeleton";
import { SuccessModal } from "./CpeDeleteUi";
import ExcelBrandIcon from "./ExcelBrandIcon";
import { TablePager, usePagination } from "./pagination";
import "../css/CpeOutwardDesk.css";

function DownloadXlButton({ disabled, onClick, tip }) {
  return (
    <span className="cpe-entry-excel-wrap">
      <button
        type="button"
        className="cpe-entry-download-xl"
        disabled={disabled}
        aria-label={tip}
        onClick={onClick}
      >
        <ExcelBrandIcon />
      </button>
      <span className="cpe-entry-excel-tip" role="tooltip">
        {tip}
      </span>
    </span>
  );
}

function statusTone(status) {
  if (status === DEVICE_STATUS.SHIPPED) return "is-ship";
  if (status === DEVICE_STATUS.SCRAP) return "is-bad";
  return "is-ok";
}

function showDate(value) {
  return value || "—";
}

function OutwardTable({
  rows,
  selectable = false,
  selectedKeys = [],
  onToggle,
  onToggleAll,
  emptyText,
  showHistory = false,
}) {
  const pager = usePagination(rows, 8);
  const pageKeys = pager.pageItems.map((r) => r.key);
  const allPageSelected = pageKeys.length > 0 && pageKeys.every((k) => selectedKeys.includes(k));
  const colSpan = (selectable ? 1 : 0) + (showHistory ? 7 : 6);
  const [openKeys, setOpenKeys] = useState([]);

  useEffect(() => {
    setOpenKeys([]);
  }, [pager.page, pager.pageSize, rows.length]);

  function toggleOpen(key) {
    setOpenKeys((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    );
  }

  return (
    <>
      <div className="cpe-out-table-wrap">
        <table className={`cpe-out-table${showHistory ? " is-history" : ""}`}>
          <thead>
            <tr>
              {selectable && (
                <th className="cpe-out-check">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={() => onToggleAll?.(pageKeys, !allPageSelected)}
                    aria-label="Select all on this page"
                  />
                </th>
              )}
              <th>Customer</th>
              <th>Mobile</th>
              <th>MAC ID</th>
              <th>Box</th>
              {showHistory ? (
                <>
                  <th>Inward</th>
                  <th>Repair outward</th>
                  <th>Shipped</th>
                </>
              ) : (
                <>
                  <th>Status</th>
                  <th>Date</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {pager.pageItems.length === 0 ? (
              <tr>
                <td colSpan={colSpan}>{emptyText}</td>
              </tr>
            ) : (
              pager.pageItems.map(({ customer, device, key }) => {
                const checked = selectedKeys.includes(key);
                const open = openKeys.includes(key);
                return (
                  <tr
                    key={key}
                    className={`${checked ? "is-selected " : ""}${open ? "is-open" : ""}`.trim()}
                  >
                    <td className="cpe-out-card-head">
                      <div className="cpe-out-card-head-row">
                        {selectable && (
                          <input
                            type="checkbox"
                            className="cpe-out-card-check"
                            checked={checked}
                            onChange={() => onToggle?.(key)}
                            aria-label={`Select ${device.macId}`}
                          />
                        )}
                        <button
                          type="button"
                          className="cpe-out-card-toggle"
                          aria-expanded={open}
                          onClick={() => toggleOpen(key)}
                        >
                          <span className="cpe-out-card-summary">
                            <strong className="cpe-out-name">{customer.name}</strong>
                            <code>{device.macId}</code>
                          </span>
                          <span className="cpe-out-card-chevron" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                    {selectable && (
                      <td className="cpe-out-check cpe-out-card-desk" data-label="Select">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggle?.(key)}
                          aria-label={`Select ${device.macId}`}
                        />
                      </td>
                    )}
                    <td className="cpe-out-card-desk" data-label="Customer">
                      <strong className="cpe-out-name">{customer.name}</strong>
                    </td>
                    <td className="cpe-out-card-detail" data-label="Mobile">
                      {customer.mobile}
                    </td>
                    <td className="cpe-out-card-desk" data-label="MAC ID">
                      <code>{device.macId}</code>
                    </td>
                    <td className="cpe-out-card-detail" data-label="Box">
                      <span className="cpe-out-box">
                        {device.boxModel || device.boxType || "—"}
                      </span>
                    </td>
                    {showHistory ? (
                      <>
                        <td className="cpe-out-date cpe-out-card-detail" data-label="Inward">
                          {showDate(device.receivedDate)}
                        </td>
                        <td className="cpe-out-date cpe-out-card-detail" data-label="Repair outward">
                          {showDate(device.outwardDate)}
                        </td>
                        <td className="cpe-out-date cpe-out-card-detail" data-label="Shipped">
                          {showDate(device.shippedDate)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="cpe-out-card-detail" data-label="Status">
                          <span className={`cpe-out-status ${statusTone(device.repairStatus)}`}>
                            {device.repairStatus}
                          </span>
                        </td>
                        <td className="cpe-out-date cpe-out-card-detail" data-label="Date">
                          {showDate(device.outwardDate || device.receivedDate)}
                        </td>
                      </>
                    )}
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
        label="boxes"
      />
    </>
  );
}

export default function CpeOutwardDesk({ customers, loading = false }) {
  const [query, setQuery] = useState("");
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState("");

  const repairedAll = useMemo(() => getRepairedOutwardRows(customers), [customers]);
  const scrapAll = useMemo(() => getScrapOutwardRows(customers), [customers]);
  const shippedAll = useMemo(() => getShippedOutwardRows(customers), [customers]);

  const repaired = useMemo(() => filterOutwardRows(repairedAll, query), [repairedAll, query]);
  const scrap = useMemo(() => filterOutwardRows(scrapAll, query), [scrapAll, query]);
  const shipped = useMemo(() => filterOutwardRows(shippedAll, query), [shippedAll, query]);

  const selectedRows = useMemo(
    () => repairedAll.filter((row) => selectedKeys.includes(row.key)),
    [repairedAll, selectedKeys],
  );

  function toggleKey(key) {
    setSelectedKeys((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    );
  }

  function toggleAll(pageKeys, select) {
    setSelectedKeys((current) => {
      if (select) {
        const set = new Set([...current, ...pageKeys]);
        return [...set];
      }
      return current.filter((k) => !pageKeys.includes(k));
    });
  }

  function handleShip() {
    setError("");
    try {
      const result = shipDevices(
        selectedRows.map(({ customer, device }) => ({
          mobile: customer.mobile,
          macId: device.macId,
        })),
      );
      setSelectedKeys([]);
      setSuccess({
        title: "Shipped successfully",
        message: `${result.shipped} repaired item${result.shipped === 1 ? "" : "s"} moved to the Shipped section.`,
      });
    } catch (err) {
      setError(err.message || "Could not ship selected items.");
    }
  }

  function handleDownloadSection(section, rows) {
    setError("");
    try {
      const count = downloadOutwardSectionExcel(rows, section);
      setSuccess({
        title: "Excel downloaded",
        message: `Downloaded ${count} ${section} item${count === 1 ? "" : "s"} as Excel.`,
      });
    } catch (err) {
      setError(err.message || "Download failed.");
    }
  }

  const total = repairedAll.length + scrapAll.length + shippedAll.length;

  return (
    <>
    <CpeCustomerBoard
      customers={customers}
      loading={loading}
      focus="outward"
      onSelect={(customer) => setQuery(customer.name)}
      selectLabel="Filter list"
      activeKey={query}
    />
    <section className="cpe-entry-card cpe-entry-flow cpe-out-desk">
      <header className="cpe-entry-card-head cpe-out-head">
        <div>
          <h2>Outward</h2>
          <p>Search customers, ship repaired boxes, and review scrap / shipped sections.</p>
        </div>
        <div className="cpe-out-stats" aria-busy={loading}>
          {loading ? (
            <>
              <Skel className="cpe-skel-chip" />
              <Skel className="cpe-skel-chip" />
              <Skel className="cpe-skel-chip" />
            </>
          ) : (
            <>
              <span data-tone="ok">{repairedAll.length} ready</span>
              <span data-tone="bad">{scrapAll.length} scrap</span>
              <span data-tone="ship">{shippedAll.length} shipped</span>
            </>
          )}
        </div>
      </header>

      <div className="cpe-out-toolbar">
        <label className="cpe-out-search">
          <span>Search customer</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, mobile, MAC, or box…"
            autoComplete="off"
          />
        </label>
      </div>

      {error && <p className="cpe-entry-error">{error}</p>}

      {loading ? (
        <div className="cpe-out-sections" aria-busy="true">
          {["ok", "bad", "ship"].map((tone) => (
            <article key={tone} className="cpe-out-section is-loading" data-tone={tone}>
              <header>
                <div>
                  <Skel className="cpe-skel-line" />
                  <Skel className="cpe-skel-line is-short" />
                </div>
                <Skel className="cpe-skel-pill" />
              </header>
              <Skel className="cpe-skel-block" />
              <Skel className="cpe-skel-block" />
            </article>
          ))}
        </div>
      ) : total === 0 ? (
        <p className="cpe-entry-empty">No outward records yet. Use Repair Status first.</p>
      ) : (
        <div className="cpe-out-sections">
          <article className="cpe-out-section" data-tone="ok">
            <header>
              <div>
                <h3>Ready to ship · Repaired</h3>
                <p>Select repaired items, then ship them from here.</p>
              </div>
              <div className="cpe-out-section-actions">
                <button
                  type="button"
                  className="cpe-out-ship-btn"
                  onClick={handleShip}
                  disabled={selectedKeys.length === 0}
                >
                  Ship selected{selectedKeys.length > 0 ? ` (${selectedKeys.length})` : ""}
                </button>
                <strong>{repaired.length}</strong>
                <DownloadXlButton
                  disabled={repaired.length === 0}
                  tip="Download repaired data"
                  onClick={() => handleDownloadSection("repaired", repaired)}
                />
              </div>
            </header>
            <OutwardTable
              rows={repaired}
              selectable
              selectedKeys={selectedKeys}
              onToggle={toggleKey}
              onToggleAll={toggleAll}
              emptyText="No repaired items match this search."
            />
          </article>

          <article className="cpe-out-section" data-tone="bad">
            <header>
              <div>
                <h3>Scrap items</h3>
                <p>Marked scrap from Repair Status.</p>
              </div>
              <div className="cpe-out-section-actions">
                <strong>{scrap.length}</strong>
                <DownloadXlButton
                  disabled={scrap.length === 0}
                  tip="Download scraped data"
                  onClick={() => handleDownloadSection("scrap", scrap)}
                />
              </div>
            </header>
            <OutwardTable rows={scrap} emptyText="No scrap items match this search." />
          </article>

          <article className="cpe-out-section" data-tone="ship">
            <header>
              <div>
                <h3>Shipped items</h3>
                <p>Inward, repair outward, and shipped dates for each box.</p>
              </div>
              <div className="cpe-out-section-actions">
                <strong>{shipped.length}</strong>
                <DownloadXlButton
                  disabled={shipped.length === 0}
                  tip="Download shipped data"
                  onClick={() => handleDownloadSection("shipped", shipped)}
                />
              </div>
            </header>
            <OutwardTable rows={shipped} showHistory emptyText="No shipped items yet." />
          </article>
        </div>
      )}

      <SuccessModal
        open={Boolean(success)}
        title={success?.title || ""}
        message={success?.message || ""}
        buttonLabel="Done"
        onClose={() => setSuccess(null)}
      />
    </section>
    </>
  );
}
