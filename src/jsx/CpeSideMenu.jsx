import { logoutCpeUser, roleAllowedWorkflows, roleCanAccessDashboard, roleCanAccessMasters, roleDefaultWorkflow } from "../js/cpeAuth";
import "../css/CpeSideMenu.css";

function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "U";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function Icon({ kind }) {
  const common = { viewBox: "0 0 24 24", fill: "none", "aria-hidden": true };
  if (kind === "dashboard") {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
        <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
        <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
        <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
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
  if (kind === "settings") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M12 4.5v1.4M12 18.1v1.4M19.5 12h-1.4M5.9 12H4.5M17.3 6.7l-1 1M7.7 16.3l-1 1M17.3 17.3l-1-1M7.7 7.7l-1-1"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M14.5 6.2a2.2 2.2 0 0 1 3.1 3.1L9.2 17.7 5 19l1.3-4.2 8.2-8.6z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function menuItems(session) {
  const role = session?.role;
  const allowed = roleAllowedWorkflows(role);
  const items = [];
  if (roleCanAccessDashboard(role)) {
    items.push({ id: "dashboard", href: "#dashboard", label: "Dashboard" });
  }
  if (roleCanAccessMasters(role)) {
    items.push({ id: "customer", href: "#enter-details/customer", label: "Customer Master" });
    items.push({ id: "item", href: "#enter-details/item", label: "Item Master" });
  }
  if (allowed.includes("inward")) items.push({ id: "inward", href: "#enter-details/inward", label: "Inward" });
  if (allowed.includes("outward")) items.push({ id: "outward", href: "#enter-details/outward", label: "Outward" });
  if (allowed.includes("repair")) items.push({ id: "repair", href: "#enter-details/repair", label: "Repair Status" });
  items.push({ id: "settings", href: "#settings", label: "Settings" });
  return items;
}

export default function CpeSideMenu({ session, page, section, open, onClose }) {
  if (!session) return null;

  const items = menuItems(session);
  const active =
    page === "dashboard"
      ? "dashboard"
      : page === "settings"
        ? "settings"
        : section || roleDefaultWorkflow(session.role);

  function logout() {
    logoutCpeUser();
    window.location.hash = "#enter-details";
  }

  return (
    <>
      <button
        type="button"
        className={`cpe-side-backdrop${open ? " is-open" : ""}`}
        aria-label="Close menu"
        onClick={onClose}
      />
      <aside className={`cpe-side${open ? " is-open" : ""}`} aria-label="Features">
        <div className="cpe-side-profile">
          <span className="cpe-side-avatar" aria-hidden="true">
            {initials(session.name)}
          </span>
          <div>
            <strong>{session.name}</strong>
            <small>@{session.username}</small>
            <small>{session.desk}</small>
          </div>
        </div>

        <p className="cpe-side-label">Features</p>
        <nav className="cpe-side-nav">
          {items.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className={active === item.id ? "is-active" : ""}
              aria-current={active === item.id ? "page" : undefined}
              onClick={onClose}
            >
              <Icon kind={item.id} />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <button type="button" className="cpe-side-logout" onClick={logout}>
          Logout
        </button>
      </aside>
    </>
  );
}
