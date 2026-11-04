import CpeChangePassword from "./CpeChangePassword";
import CpeLogin from "./CpeLogin";
import CpeSessionBar from "./CpeSessionBar";
import { CPE_ROLES, roleCanAccessDashboard } from "../js/cpeAuth";
import { useCpeSession } from "../js/useCpeSession";
import "../css/CpeSettings.css";

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

export default function CpeSettings() {
  const session = useCpeSession();

  if (!session) {
    return <CpeLogin title="APSFL CPE Settings Login" />;
  }

  return (
    <main className="cpe-settings">
      <div className="cpe-settings-bg" aria-hidden="true" />
      <CpeSessionBar
        session={session}
        showDashboardLink={roleCanAccessDashboard(session.role)}
        showEntryLink
        showSettingsLink={false}
      />

      <section className="cpe-settings-shell w">
        <header className="cpe-settings-hero">
          <p className="cpe-settings-eyebrow">Account</p>
          <h1>Settings</h1>
          <p>Manage your desk account preferences for this browser.</p>
        </header>

        <div className="cpe-settings-card">
          <div className="cpe-settings-profile">
            <span className="cpe-settings-avatar" aria-hidden="true">
              {initials(session.name)}
            </span>
            <div>
              <strong>{session.name}</strong>
              <small>@{session.username}</small>
              <small>{session.desk}</small>
            </div>
          </div>
        </div>

        <section className="cpe-settings-card" aria-labelledby="cpe-settings-password-title">
          <header className="cpe-settings-card-head">
            <h2 id="cpe-settings-password-title">Change password</h2>
            <p>
              {session.role === CPE_ROLES.SUPER_ADMIN
                ? "Choose Admin, Inward, Outward, or Repair, then update that account password. Saved in this browser only."
                : "Update the password used to sign in on this device. Saved in this browser only."}
            </p>
          </header>
          <CpeChangePassword session={session} />
        </section>
      </section>
    </main>
  );
}
