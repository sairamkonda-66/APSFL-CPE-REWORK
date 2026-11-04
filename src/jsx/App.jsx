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
                  <div className="cpe-app-profile-head">
                    <span className="cpe-app-profile-avatar" aria-hidden="true">
                      {initials(session.name)}
                    </span>
                    <div>
                      <strong>{session.name}</strong>
                      <small>@{session.username}</small>
                    </div>
                  </div>
                  <p>{session.desk}</p>
                  <a href="#settings" onClick={() => setProfileOpen(false)}>
                    Settings
                  </a>
                  <button type="button" onClick={logout}>
                    Logout
                  </button>
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
