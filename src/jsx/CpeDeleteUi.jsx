import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../css/CpeDeleteUi.css";

export function DeleteIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path
        d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M6.5 7l.8 12.2A1.8 1.8 0 0 0 9.1 21h5.8a1.8 1.8 0 0 0 1.8-1.8L17.5 7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CancelIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

/** Orange delete icon button with hover feature tip. */
export function DeleteIconButton({ tip, label, onClick, className = "" }) {
  const wrapRef = useRef(null);
  const [tipBox, setTipBox] = useState(null);

  function placeTip() {
    const node = wrapRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setTipBox({
      left: rect.left + rect.width / 2,
      top: rect.top - 8,
    });
  }

  function hideTip() {
    setTipBox(null);
  }

  useEffect(() => {
    if (!tipBox) return undefined;
    function place() {
      placeTip();
    }
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [tipBox]);

  return (
    <span
      ref={wrapRef}
      className={`cpe-del-wrap ${className}`.trim()}
      onMouseEnter={placeTip}
      onMouseLeave={hideTip}
      onFocus={placeTip}
      onBlur={hideTip}
    >
      <button
        type="button"
        className="cpe-del-icon-btn"
        aria-label={label || tip}
        onClick={onClick}
      >
        <DeleteIcon />
      </button>
      {tipBox &&
        createPortal(
          <span
            className="cpe-del-tip is-fixed"
            role="tooltip"
            style={{ left: tipBox.left, top: tipBox.top }}
          >
            {tip}
          </span>,
          document.body,
        )}
    </span>
  );
}

function TrashCan() {
  return (
    <span className="cpe-del-can-stack">
      <svg className="cpe-del-can cpe-del-can-body" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6.5 7l.8 12.2A1.8 1.8 0 0 0 9.1 21h5.8a1.8 1.8 0 0 0 1.8-1.8L17.5 7"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
      <svg className="cpe-del-can cpe-del-can-sheet" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8.5 0.2h4.6l1.9 1.9v5.2H8.5z" fill="#fff" stroke="currentColor" strokeWidth="1.15" strokeLinejoin="round" />
        <path d="M13.1 0.2v1.9h1.9" stroke="currentColor" strokeWidth="1.15" strokeLinejoin="round" />
      </svg>
      <svg className="cpe-del-can cpe-del-can-lid" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 7h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path
          d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/** Confirmation popup with orange delete icon. */
export function DeleteConfirmModal({ open, title, message, confirmLabel = "Delete", onCancel, onConfirm }) {
  const [dropping, setDropping] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!open) setDropping(false);
    return () => window.clearTimeout(timerRef.current);
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  function handleConfirm() {
    if (dropping) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      onConfirm?.();
      return;
    }
    setDropping(true);
    timerRef.current = window.setTimeout(() => onConfirm?.(), 1100);
  }

  return createPortal(
    <div className="cpe-del-modal-root" role="presentation">
      <button
        type="button"
        className="cpe-del-modal-backdrop"
        aria-label="Close"
        onClick={dropping ? undefined : onCancel}
      />
      <div
        className={`cpe-del-modal${dropping ? " is-dropping" : ""}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cpe-del-modal-title"
        aria-describedby="cpe-del-modal-desc"
      >
        <div className="cpe-del-stage" aria-hidden="true">
          <div className="cpe-del-modal-icon">
            <TrashCan />
          </div>
        </div>
        <h3 id="cpe-del-modal-title">{title}</h3>
        <p id="cpe-del-modal-desc">{message}</p>
        <div className="cpe-del-modal-actions">
          <button type="button" className="cpe-del-modal-cancel" onClick={onCancel} disabled={dropping}>
            <CancelIcon />
            <span>Cancel</span>
          </button>
          <button type="button" className="cpe-del-modal-confirm" onClick={handleConfirm} disabled={dropping}>
            <DeleteIcon />
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SuccessCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M7.5 12.2l3.1 3.1 6-6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Success popup after a ship. */
export function SuccessModal({ open, title, message, buttonLabel = "OK", onClose }) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="cpe-del-modal-root" role="presentation">
      <button type="button" className="cpe-del-modal-backdrop" aria-label="Close" onClick={onClose} />
      <div
        className="cpe-del-modal cpe-success-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cpe-success-modal-title"
        aria-describedby="cpe-success-modal-desc"
      >
        <div className="cpe-success-modal-icon" aria-hidden="true">
          <SuccessCheckIcon />
        </div>
        <h3 id="cpe-success-modal-title">{title}</h3>
        <p id="cpe-success-modal-desc">{message}</p>
        <div className="cpe-del-modal-actions cpe-success-modal-actions">
          <button type="button" className="cpe-success-modal-ok" onClick={onClose}>
            <SuccessCheckIcon />
            <span>{buttonLabel}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
