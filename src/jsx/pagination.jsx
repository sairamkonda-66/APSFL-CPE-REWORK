import { useEffect, useMemo, useState } from "react";

export const DEFAULT_PAGE_SIZE = 10;

export function usePagination(items, initialPageSize = DEFAULT_PAGE_SIZE) {
  const list = Array.isArray(items) ? items : [];
  const [pageSize, setPageSizeState] = useState(() =>
    Math.max(1, Number(initialPageSize) || DEFAULT_PAGE_SIZE),
  );
  const size = Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(list.length / size) || 1);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [list.length, size]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  }, [list, page, size]);

  const from = list.length === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(page * size, list.length);

  function setPageSize(next) {
    setPageSizeState(Math.max(1, Number(next) || DEFAULT_PAGE_SIZE));
    setPage(1);
  }

  return {
    page,
    setPage,
    pageSize: size,
    setPageSize,
    totalPages,
    totalItems: list.length,
    pageItems,
    from,
    to,
    goPrev: () => setPage((p) => Math.max(1, p - 1)),
    goNext: () => setPage((p) => Math.min(totalPages, p + 1)),
  };
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

export function TablePager({
  page,
  pageSize = DEFAULT_PAGE_SIZE,
  totalPages,
  totalItems,
  from,
  to,
  onPrev,
  onNext,
  onPage,
  onPageSize,
  label = "rows",
}) {
  if (totalItems <= 0) return null;

  const pages = [];
  const window = 5;
  let start = Math.max(1, page - Math.floor(window / 2));
  let end = Math.min(totalPages, start + window - 1);
  start = Math.max(1, end - window + 1);
  for (let i = start; i <= end; i += 1) pages.push(i);

  const sizes = PAGE_SIZE_OPTIONS.includes(pageSize)
    ? PAGE_SIZE_OPTIONS
    : [pageSize, ...PAGE_SIZE_OPTIONS].sort((a, b) => a - b);

  return (
    <div className="cpe-pager" role="navigation" aria-label="Table pagination">
      <label className="cpe-pager-size">
        <span>Show</span>
        <select
          value={pageSize}
          aria-label={`Rows to show for ${label}`}
          onChange={(event) => onPageSize?.(Number(event.target.value))}
        >
          {sizes.map((count) => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </select>
        <span>rows</span>
      </label>
      <p className="cpe-pager-meta">
        Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{totalItems}</strong>{" "}
        {label}
      </p>
      <div className="cpe-pager-controls">
        <button type="button" disabled={page <= 1} onClick={onPrev} aria-label="Previous page">
          Prev
        </button>
        {start > 1 && (
          <>
            <button type="button" className={page === 1 ? "is-active" : ""} onClick={() => onPage(1)}>
              1
            </button>
            {start > 2 && <span className="cpe-pager-ellipsis">…</span>}
          </>
        )}
        {pages.map((n) => (
          <button
            key={n}
            type="button"
            className={n === page ? "is-active" : ""}
            onClick={() => onPage(n)}
            aria-current={n === page ? "page" : undefined}
          >
            {n}
          </button>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="cpe-pager-ellipsis">…</span>}
            <button
              type="button"
              className={page === totalPages ? "is-active" : ""}
              onClick={() => onPage(totalPages)}
            >
              {totalPages}
            </button>
          </>
        )}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={onNext}
          aria-label="Next page"
        >
          Next
        </button>
      </div>
    </div>
  );
}
