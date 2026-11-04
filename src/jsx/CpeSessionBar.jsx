import { logoutCpeUser } from "../js/cpeAuth";
import "../css/CpeSessionBar.css";

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13" y="4" width="7" height="4.5" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      <rect x="13" y="11" width="7" height="9" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      <rect x="4" y="13.5" width="7" height="6.5" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function EntryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 4.5h7.2L18 8.2V19.5H7v-15z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M14 4.6V8.4h3.6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9.2 12.2h5.6M9.2 15.4h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.488.488 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 7.2V6.2A1.7 1.7 0 0 1 11.7 4.5h6.1A1.7 1.7 0 0 1 19.5 6.2v11.6a1.7 1.7 0 0 1-1.7 1.7h-6.1A1.7 1.7 0 0 1 10 17.8v-1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M4.5 12h9.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M11.2 8.8 14.4 12l-3.2 3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BarAction({ href, tone, tip, label, onClick, children }) {
  const control = href ? (
    <a href={href} className={`cpe-session-action is-${tone}`} aria-label={label}>
      {children}
    </a>
  ) : (
    <button type="button" className={`cpe-session-action is-${tone}`} aria-label={label} onClick={onClick}>
      {children}
    </button>
  );

  return (
    <span className="cpe-session-action-wrap">
      {control}
      <span className="cpe-session-tip" role="tooltip">
        {tip}
      </span>
    </span>
  );
}

export default function CpeSessionBar({
  session,
  showDashboardLink = false,
  showEntryLink = false,
  showSettingsLink = true,
}) {
  if (!session) return null;

  function logout() {
    logoutCpeUser();
    window.location.hash = "#enter-details";
  }

  return (
    <div className="cpe-session-bar w">
      <div className="cpe-session-bar-user">
        <span className="cpe-session-role">{session.name}</span>
        <small>
          @{session.username} · {session.desk}
        </small>
      </div>
      <div className="cpe-session-bar-actions">
        {showDashboardLink && (
          <BarAction href="#dashboard" tone="dash" label="Open dashboard" tip="Open dashboard">
            <DashboardIcon />
          </BarAction>
        )}
        {showEntryLink && (
          <BarAction href="#enter-details" tone="entry" label="Open entry desk" tip="Open entry desk">
            <EntryIcon />
          </BarAction>
        )}
        {showSettingsLink && (
          <BarAction href="#settings" tone="settings" label="Open settings" tip="Open settings">
            <SettingsIcon />
          </BarAction>
        )}
        <BarAction tone="logout" label="Log out" tip="Log out" onClick={logout}>
          <LogoutIcon />
        </BarAction>
      </div>
    </div>
  );
}
