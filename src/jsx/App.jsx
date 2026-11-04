import { useEffect, useRef, useState } from "react";
import CpeDashboard from "./CpeDashboard";
import CpeEntry from "./CpeEntry";
import CpeSettings from "./CpeSettings";
import CpeSideMenu from "./CpeSideMenu";
import { logoutCpeUser } from "../js/cpeAuth";
import { DASHBOARD_TITLE } from "../js/customerData";
import { useCpeSession } from "../js/useCpeSession";

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

export function readAppLocation() {
  const hash = String(window.location.hash || "").toLowerCase();
  if (hash.startsWith("#settings") || hash.startsWith("#/settings")) {
    return { page: "settings", section: "" };
  }
  const entry =
    hash.startsWith("#enter-details") ||
    hash.startsWith("#/enter-details") ||
    hash === "#entry" ||
    hash.startsWith("#entry/");
  const section = (hash.split("/")[1] || "").split("?")[0];
  return { page: entry ? "entry" : "dashboard", section };
}

export default function App() {
  const session = useCpeSession();
  const [location, setLocation] = useState(readAppLocation);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    function onHash() {
      setLocation(readAppLocation());
      setMenuOpen(false);
      setProfileOpen(false);
    }
    if (!window.location.hash) {
      window.location.hash = "#dashboard";
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!profileOpen) return undefined;
    function onPointer(event) {
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
    }
    function onKey(event) {
      if (event.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [profileOpen]);

  let page = <CpeDashboard />;
  if (location.page === "entry") page = <CpeEntry />;
  if (location.page === "settings") page = <CpeSettings />;

  function logout() {
    logoutCpeUser();
    setProfileOpen(false);
    window.location.hash = "#enter-details";
  }

  return (
    <div className={`cpe-app${session ? " has-sidemenu" : ""}`}>
      <header className="cpe-app-top">
        <div className="cpe-app-top-inner">
          <div className="cpe-app-top-lead">
            {session && (
              <button type="button" className="cpe-side-toggle" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            )}
            <a className="cpe-app-brand" href={session?.role === "super_admin" ? "#dashboard" : "#enter-details"}>
              <img src="/aems-logo.png" alt="AEMS" />
            </a>
          </div>

          <p className="cpe-app-title">{DASHBOARD_TITLE}</p>

          {session && (
            <div className="cpe-app-profile" ref={profileRef}>
              <button
                type="button"
                className={`cpe-app-profile-btn${profileOpen ? " is-open" : ""}`}
                aria-label="Open profile"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen((open) => !open)}
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M5.6 18.4a6.4 6.4 0 0 1 12.8 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </button>
              {profileOpen && (
                <div className="cpe-app-profile-pop" role="dialog" aria-label="Profile">
                  <div className="cpe-app-profile-main">
                    <span className="cpe-app-profile-avatar" aria-hidden="true">
                      {initials(session.name)}
                    </span>
                    <strong className="cpe-app-profile-name">{session.name}</strong>
                    <small className="cpe-app-profile-user">(@{session.username})</small>
                    <p className="cpe-app-profile-desk">{session.desk}</p>
                  </div>
                  <div className="cpe-app-profile-menu">
                    <a href="#settings" onClick={() => setProfileOpen(false)}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="currentColor"
                          fillRule="evenodd"
                          d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.488.488 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"
                        />
                      </svg>
                      <span>Settings</span>
                    </a>
                    <button type="button" onClick={logout}>
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M10 5.5H7.2A2.2 2.2 0 0 0 5 7.7v8.6A2.2 2.2 0 0 0 7.2 18.5H10"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                        />
                        <path
                          d="M10.5 12H20"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                        />
                        <path
                          d="M16.6 8.6 20 12l-3.4 3.4"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {session && (
        <CpeSideMenu
          session={session}
          page={location.page}
          section={location.section}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {page}
    </div>
  );
}
