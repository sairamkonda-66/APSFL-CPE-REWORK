import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../css/CpeDatePicker.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseIso(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIso(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function sameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildDays(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function formatField(value) {
  const date = parseIso(value);
  if (!date) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${date.getFullYear()}`;
}

function CalendarGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5.5" width="16" height="14" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 4.2v3M16 4.2v3M4 9.5h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export default function CpeDatePicker({ value = "", onChange }) {
  const fieldRef = useRef(null);
  const popRef = useRef(null);
  const titleId = useId();
  const selected = parseIso(value);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => selected || new Date());
  const [view, setView] = useState(() => selected || new Date());
  const [box, setBox] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    const next = parseIso(value) || new Date();
    setDraft(next);
    setView(next);
    function place() {
      const rect = fieldRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 320;
      const popupHeight = 460;
      const margin = 12;
      const header = 76;
      const left = Math.min(Math.max(margin, rect.left), window.innerWidth - width - margin);
      const spaceBelow = window.innerHeight - rect.bottom - margin;
      const spaceAbove = rect.top - header - margin;
      let top = rect.bottom + 8;
      if (spaceBelow < popupHeight && spaceAbove > spaceBelow) {
        top = rect.top - popupHeight - 8;
      }
      if (top < header) top = header;
      if (top + popupHeight > window.innerHeight - margin) {
        top = Math.max(header, window.innerHeight - popupHeight - margin);
      }
      setBox({ top, left, width });
    }
    place();
    function onPointer(event) {
      if (fieldRef.current?.contains(event.target) || popRef.current?.contains(event.target)) return;
      setOpen(false);
    }
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, value]);

  function shiftMonth(step) {
    setView((current) => new Date(current.getFullYear(), current.getMonth() + step, 1));
  }

  function commit() {
    onChange?.(toIso(draft));
    setOpen(false);
  }

  const days = buildDays(view.getFullYear(), view.getMonth());

  return (
    <>
      <button
        ref={fieldRef}
        type="button"
        className="cpe-date-field"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{formatField(value) || "Select date"}</span>
        <CalendarGlyph />
      </button>
      {open &&
        box &&
        createPortal(
          <div
            ref={popRef}
            className="cpe-cal"
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            style={{ top: box.top, left: box.left, width: box.width }}
          >
            <header className="cpe-cal-head">
              <div>
                <strong>{draft.getDate()}</strong>
                <p id={titleId}>
                  {MONTHS[view.getMonth()]}, {view.getFullYear()}
                </p>
              </div>
              <span className="cpe-cal-badge" aria-hidden="true">
                <CalendarGlyph />
                <i>
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M12 9v3.2l2 1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </i>
              </span>
            </header>

            <div className="cpe-cal-nav">
              <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
                ‹
              </button>
              <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)}>
                ›
              </button>
            </div>

            <div className="cpe-cal-week" aria-hidden="true">
              {WEEKDAYS.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="cpe-cal-grid" role="grid">
              {days.map((date) => {
                const outside = date.getMonth() !== view.getMonth();
                const isOn = sameDay(date, draft);
                return (
                  <button
                    key={toIso(date)}
                    type="button"
                    role="gridcell"
                    className={`${outside ? "is-out" : ""} ${isOn ? "is-on" : ""}`.trim()}
                    aria-pressed={isOn}
                    onClick={() => setDraft(date)}
                  >
                    {String(date.getDate()).padStart(2, "0")}
                  </button>
                );
              })}
            </div>
            <button type="button" className="cpe-cal-done" onClick={commit}>
              Select date
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
