import "../css/CpeSkeleton.css";

export function Skel({ className = "" }) {
  return <i className={`cpe-skel ${className}`} aria-hidden="true" />;
}

export function LoadingNote({ children = "Loading data" }) {
  return <p className="cpe-skel-note">{children}</p>;
}
