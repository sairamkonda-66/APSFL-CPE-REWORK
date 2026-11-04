import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../css/CpeComboBox.css";

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Searchable combobox — type manually or pick from the dropdown list.
 * List is portaled + fixed so it never hides behind footer / next sections.
 * options: [{ value, label, searchText?, meta? }]
 */
export default function CpeComboBox({
  value = "",
  options = [],
  placeholder = "Enter or Select",
  onChange,
  onSelect,
  disabled = false,
  allowCustom = true,
  emptyText = "No matches",
}) {
  const id = useId();
  const rootRef = useRef(null);
  const fieldRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [filter, setFilter] = useState("");
  const [menuStyle, setMenuStyle] = useState(null);

  useEffect(() => {
    setQuery(value);
    if (!open) setFilter("");
  }, [value, open]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return undefined;
    }

    function place() {
      const el = fieldRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const gap = 0;
      const maxH = 240;
      const spaceBelow = window.innerHeight - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      const openUp = spaceBelow < 140 && spaceAbove > spaceBelow;
      const height = Math.min(maxH, openUp ? spaceAbove : spaceBelow);

      setMenuStyle({
        position: "fixed",
        left: `${Math.round(rect.left)}px`,
        width: `${Math.round(rect.width)}px`,
        zIndex: 5000,
        maxHeight: `${Math.max(120, height)}px`,
        ...(openUp
          ? { bottom: `${Math.round(window.innerHeight - rect.top + gap)}px`, top: "auto" }
          : { top: `${Math.round(rect.bottom + gap)}px`, bottom: "auto" }),
      });
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, filteredLength(options, filter)]);

  useEffect(() => {
    function onDoc(event) {
      const t = event.target;
      if (rootRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
      setFilter("");
      setQuery(value);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [value]);

  const filtered = useMemo(() => {
    const q = String(filter || "")
      .trim()
      .toLowerCase();
    if (!q) return options;
    return options.filter((opt) => {
      const hay = `${opt.label || ""} ${opt.value || ""} ${opt.searchText || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [options, filter]);

  function openList() {
    if (disabled) return;
    setFilter("");
    setOpen(true);
  }

  function commitValue(next, option = null) {
    setQuery(next);
    setFilter("");
    onChange?.(next);
    if (option) onSelect?.(option);
  }

  function pick(option) {
    commitValue(option.value, option);
    setOpen(false);
    inputRef.current?.blur();
  }

  function onInputChange(event) {
    const next = event.target.value;
    setQuery(next);
    setFilter(next);
    setOpen(true);
    if (allowCustom || !String(next || "").trim()) onChange?.(next);
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      setOpen(false);
      setFilter("");
      setQuery(value);
      return;
    }
    if (event.key === "Enter" && open && filtered.length === 1) {
      event.preventDefault();
      pick(filtered[0]);
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openList();
    }
  }

  const list = open && !disabled && menuStyle && typeof document !== "undefined"
    ? createPortal(
        <ul
          ref={listRef}
          id={`${id}-list`}
          className={`cpe-combo-list ${menuStyle.bottom ? "is-up" : "is-down"}`}
          role="listbox"
          style={menuStyle}
        >
          {filtered.length === 0 ? (
            <li className="cpe-combo-empty">{emptyText}</li>
          ) : (
            filtered.map((opt) => (
              <li key={`${opt.value}-${opt.label}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={opt.value === value}
                  className={opt.value === value ? "is-active" : ""}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(opt)}
                >
                  <span className="cpe-combo-label">{opt.label}</span>
                  {opt.meta ? <small className="cpe-combo-meta">{opt.meta}</small> : null}
                </button>
              </li>
            ))
          )}
        </ul>,
        document.body,
      )
    : null;

  return (
    <div className={`cpe-combo ${open ? "is-open" : ""} ${disabled ? "is-disabled" : ""}`} ref={rootRef}>
      <div className="cpe-combo-field" ref={fieldRef}>
        <input
          ref={inputRef}
          id={id}
          type="text"
          autoComplete="off"
          disabled={disabled}
          value={open ? query : value || query}
          placeholder={placeholder}
          onChange={onInputChange}
          onFocus={openList}
          onClick={openList}
          onKeyDown={onKeyDown}
          aria-expanded={open}
          aria-controls={`${id}-list`}
          role="combobox"
        />
        <button
          type="button"
          className="cpe-combo-chevron"
          tabIndex={-1}
          disabled={disabled}
          aria-label={open ? "Close list" : "Open list"}
          onClick={() => {
            if (disabled) return;
            if (open) {
              setOpen(false);
              setFilter("");
              setQuery(value);
            } else {
              openList();
              inputRef.current?.focus();
            }
          }}
        >
          <ChevronIcon />
        </button>
      </div>
      {list}
    </div>
  );
}

function filteredLength(options, filter) {
  const q = String(filter || "")
    .trim()
    .toLowerCase();
  if (!q) return options.length;
  return options.filter((opt) => {
    const hay = `${opt.label || ""} ${opt.value || ""} ${opt.searchText || ""}`.toLowerCase();
    return hay.includes(q);
  }).length;
}
