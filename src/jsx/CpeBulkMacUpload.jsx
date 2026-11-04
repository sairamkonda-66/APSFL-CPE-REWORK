import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { extractMacIdsFromUpload } from "../js/xlsxMacImport";
import ExcelBrandIcon from "./ExcelBrandIcon";
import "../css/CpeBulkMacUpload.css";

function statusLabel(status) {
  if (status === "ok") return "Saved";
  if (status === "err") return "Error";
  if (status === "uploading") return "Uploading";
  return "Waiting";
}

/**
 * Popup: pick XL sheet → progress → one-by-one MAC status → success / error summary.
 * `onUploadMac(macId)` should throw on failure and return { macId, quantity } on success.
 */
export default function CpeBulkMacUpload({ open, customerLabel, onClose, onUploadMac, onComplete }) {
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const cancelRef = useRef(false);
  const busyRef = useRef(false);
  const [phase, setPhase] = useState("idle"); // idle | parsing | uploading | done
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [index, setIndex] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current = false;
    busyRef.current = false;
    setPhase("idle");
    setFileName("");
    setRows([]);
    setIndex(0);
    setDragOver(false);
    setError("");
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === "Escape" && !busyRef.current) onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector(".cpe-bulk-row.is-active");
    active?.scrollIntoView({ block: "nearest" });
  }, [index, rows]);

  if (!open || typeof document === "undefined") return null;

  const total = rows.length;
  const doneCount = rows.filter((r) => r.status === "ok" || r.status === "err").length;
  const okCount = rows.filter((r) => r.status === "ok").length;
  const errCount = rows.filter((r) => r.status === "err").length;
  const percent = total ? Math.round((doneCount / total) * 100) : 0;
  const busy = phase === "parsing" || phase === "uploading";
  busyRef.current = busy;

  async function runUpload(macIds) {
    const initial = macIds.map((macId) => ({
      macId,
      status: "pending",
      message: "",
    }));
    setRows(initial);
    setPhase("uploading");
    busyRef.current = true;
    setIndex(0);

    let saved = 0;
    let failed = 0;

    for (let i = 0; i < macIds.length; i += 1) {
      if (cancelRef.current) break;
      const macId = macIds[i];
      setIndex(i);
      setRows((current) =>
        current.map((row, idx) =>
          idx === i ? { ...row, status: "uploading", message: "Saving…" } : row,
        ),
      );

      try {
        const result = await Promise.resolve(onUploadMac(macId));
        saved += 1;
        setRows((current) =>
          current.map((row, idx) =>
            idx === i
              ? {
                  ...row,
                  status: "ok",
                  message: `Saved · Qty ${result?.quantity ?? i + 1}`,
                }
              : row,
          ),
        );
      } catch (err) {
        failed += 1;
        setRows((current) =>
          current.map((row, idx) =>
            idx === i
              ? {
                  ...row,
                  status: "err",
                  message: err?.message || "Could not save MAC.",
                }
              : row,
          ),
        );
      }

      // Let React paint each row status.
      await new Promise((resolve) => window.setTimeout(resolve, 40));
    }

    setPhase("done");
    busyRef.current = false;
    setIndex(macIds.length);
    onComplete?.({ saved, failed, total: macIds.length });
  }

  async function handleFile(file) {
    if (!file || busyRef.current) return;
    setError("");
    setFileName(file.name || "sheet.xlsx");
    setPhase("parsing");
    busyRef.current = true;
    try {
      const macIds = await extractMacIdsFromUpload(file);
      await runUpload(macIds);
    } catch (err) {
      busyRef.current = false;
      setPhase("idle");
      setRows([]);
      setError(err?.message || "Could not read the Excel sheet.");
    }
  }

  function onPick(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    handleFile(file);
  }

  function onDrop(event) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer?.files?.[0];
    handleFile(file);
  }

  function requestClose() {
    if (busy) return;
    onClose?.();
  }

  function summaryTone() {
    if (errCount === 0) return "is-ok";
    if (okCount === 0) return "is-err";
    return "is-mixed";
  }

  function summaryText() {
    if (errCount === 0) {
      return `Success · ${okCount} MAC ID${okCount === 1 ? "" : "s"} uploaded.`;
    }
    if (okCount === 0) {
      return `Upload failed · ${errCount} MAC ID${errCount === 1 ? "" : "s"} had errors.`;
    }
    return `Finished with errors · ${okCount} saved, ${errCount} failed.`;
  }

  return createPortal(
    <div className="cpe-bulk-root" role="presentation">
      <button
        type="button"
        className="cpe-bulk-backdrop"
        aria-label="Close"
        onClick={requestClose}
        disabled={busy}
      />
      <div
        className="cpe-bulk-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cpe-bulk-title"
      >
        <header className="cpe-bulk-head">
          <div>
            <span className="cpe-bulk-brand" aria-hidden="true">
              <ExcelBrandIcon />
            </span>
            <h3 id="cpe-bulk-title">Upload MAC IDs from Excel</h3>
            <p>
              For <strong>{customerLabel || "selected customer"}</strong>. Only MAC
              addresses are taken from the sheet — other columns are ignored.
            </p>
          </div>
          <button
            type="button"
            className="cpe-bulk-close"
            aria-label="Close"
            onClick={requestClose}
            disabled={busy}
          >
            ×
          </button>
        </header>

        <div className="cpe-bulk-steps" aria-hidden="true">
          <div
            className={`cpe-bulk-step${
              phase === "idle" ? " is-active" : phase !== "idle" ? " is-done" : ""
            }`}
          >
            <strong>Step 1</strong>
            <span>Choose Excel file</span>
          </div>
          <div
            className={`cpe-bulk-step${
              phase === "parsing" || phase === "uploading"
                ? " is-active"
                : phase === "done"
                  ? " is-done"
                  : ""
            }`}
          >
            <strong>Step 2</strong>
            <span>Save each MAC</span>
          </div>
          <div className={`cpe-bulk-step${phase === "done" ? " is-active is-done" : ""}`}>
            <strong>Step 3</strong>
            <span>See result</span>
          </div>
        </div>

        {error && <p className="cpe-bulk-error">{error}</p>}

        {phase === "idle" && (
          <div
            className={`cpe-bulk-drop${dragOver ? " is-drag" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
          >
            <span className="cpe-bulk-drop-icon">
              <ExcelBrandIcon />
            </span>
            <strong>Drop your Excel sheet here</strong>
            <span>
              Use a MAC ID column, or one MAC per row. .xlsx and .csv both work.
            </span>
            <button
              type="button"
              className="cpe-bulk-file-btn"
              onClick={(event) => {
                event.stopPropagation();
                inputRef.current?.click();
              }}
            >
              Choose Excel file
            </button>
          </div>
        )}

        {(phase === "parsing" || phase === "uploading" || phase === "done") && (
          <>
            <div className="cpe-bulk-progress-wrap">
              <div className="cpe-bulk-progress-meta">
                <span>
                  {phase === "parsing"
                    ? `Reading ${fileName || "sheet"}…`
                    : phase === "uploading"
                      ? `Uploading ${Math.min(index + 1, total)} of ${total}`
                      : `Uploaded ${doneCount} of ${total}`}
                </span>
                <span>{phase === "parsing" ? "…" : `${percent}%`}</span>
              </div>
              <div className="cpe-bulk-progress-track" aria-hidden="true">
                <div
                  className={`cpe-bulk-progress-fill${
                    phase === "done"
                      ? errCount
                        ? " is-done-err"
                        : " is-done-ok"
                      : ""
                  }`}
                  style={{
                    width: phase === "parsing" ? "18%" : `${Math.max(percent, phase === "uploading" ? 4 : 0)}%`,
                  }}
                />
              </div>
            </div>

            <div className="cpe-bulk-list" ref={listRef}>
              {phase === "parsing" && rows.length === 0 ? (
                <div className="cpe-bulk-row">
                  <div>
                    <code>{fileName || "sheet.xlsx"}</code>
                    <small>Extracting MAC IDs from the sheet…</small>
                  </div>
                  <span className="cpe-bulk-badge is-uploading">Reading</span>
                </div>
              ) : (
                rows.map((row, rowIndex) => (
                  <div
                    key={`${row.macId}-${rowIndex}`}
                    className={`cpe-bulk-row${row.status === "err" ? " is-err" : ""}${
                      row.status === "uploading" ? " is-active" : ""
                    }`}
                  >
                    <div>
                      <code>{row.macId}</code>
                      {row.message ? <small>{row.message}</small> : null}
                    </div>
                    <span className={`cpe-bulk-badge is-${row.status}`}>
                      {statusLabel(row.status)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {phase === "done" && (
          <div className={`cpe-bulk-summary ${summaryTone()}`}>{summaryText()}</div>
        )}

        <div className="cpe-bulk-actions">
          {phase === "idle" && (
            <button type="button" className="cpe-bulk-btn-secondary" onClick={requestClose}>
              Cancel
            </button>
          )}
          {phase === "done" && (
            <>
              <button
                type="button"
                className="cpe-bulk-btn-secondary"
                onClick={() => {
                  setPhase("idle");
                  setRows([]);
                  setFileName("");
                  setError("");
                  setIndex(0);
                }}
              >
                Upload another
              </button>
              <button type="button" className="cpe-bulk-btn-primary" onClick={requestClose}>
                Done
              </button>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xlsm,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          hidden
          onChange={onPick}
        />
      </div>
    </div>,
    document.body,
  );
}
