import { useEffect, useMemo, useState } from "react";
import { changeCpePassword, CPE_ROLES, getPasswordManageableUsers } from "../js/cpeAuth";
import "../css/CpeChangePassword.css";

const TAB_LABELS = {
  admin: "Admin",
  inward: "Inward",
  outward: "Outward",
  repair: "Repair",
};

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 3l18 18M10.5 10.6a2.5 2.5 0 0 0 3 3M9.4 5.5A10.5 10.5 0 0 1 12 5c5.2 0 9.2 3.7 10.5 7-0.5 1.3-1.4 2.7-2.7 3.9M6.1 6.2C4.4 7.5 3.2 9.1 2.5 12c1.3 3.3 5.3 7 10.5 7 1.4 0 2.7-0.3 3.9-0.7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12C3.8 8.7 7.8 5 13 5s9.2 3.7 10.5 7c-1.3 3.3-5.3 7-10.5 7S3.8 15.3 2.5 12z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="13" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function PassField({ id, label, value, onChange, show, onToggle, autoComplete }) {
  return (
    <label className="cpe-pw-field" htmlFor={id}>
      <span>{label}</span>
      <div className="cpe-pw-pass">
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
        />
        <button
          type="button"
          className="cpe-pw-pass-toggle"
          onClick={onToggle}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
        >
          <EyeIcon open={show} />
        </button>
      </div>
    </label>
  );
}

function tabLabel(user) {
  return TAB_LABELS[user.username] || user.name;
}

/** Inline change-password form for Settings. */
export default function CpeChangePassword({ session }) {
  const manageable = useMemo(() => getPasswordManageableUsers(session), [session]);
  const showTabs = session?.role === CPE_ROLES.SUPER_ADMIN && manageable.length > 1;

  const [targetUsername, setTargetUsername] = useState(session?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!manageable.some((u) => u.username === targetUsername)) {
      setTargetUsername(session?.username || manageable[0]?.username || "");
    }
  }, [manageable, session?.username, targetUsername]);

  if (!session) return null;

  const target = manageable.find((u) => u.username === targetUsername) || manageable[0];
  if (!target) return null;

  const isAdminReset =
    session.role === CPE_ROLES.SUPER_ADMIN && target.username !== session.username;

  function resetForm() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  }

  function onTabChange(username) {
    if (username === targetUsername) return;
    setTargetUsername(username);
    setError("");
    setSuccess("");
    resetForm();
  }

  function onSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      changeCpePassword(session, target.username, currentPassword, newPassword, confirmPassword);
      resetForm();
      setSuccess(
        isAdminReset
          ? `Password updated for ${target.name} (@${target.username}).`
          : "Password updated successfully.",
      );
    } catch (err) {
      setError(err.message || "Could not change password.");
    }
  }

  return (
    <div className="cpe-pw-panel">
      {showTabs && (
        <div className="cpe-pw-tabs" role="tablist" aria-label="Desk accounts">
          {manageable.map((user) => {
            const active = user.username === target.username;
            return (
              <button
                key={user.username}
                type="button"
                role="tab"
                id={`cpe-pw-tab-${user.username}`}
                aria-selected={active}
                aria-controls="cpe-pw-tab-panel"
                className={active ? "is-active" : ""}
                onClick={() => onTabChange(user.username)}
              >
                {tabLabel(user)}
              </button>
            );
          })}
        </div>
      )}

      <form
        className="cpe-pw-form"
        id="cpe-pw-tab-panel"
        role={showTabs ? "tabpanel" : undefined}
        aria-labelledby={showTabs ? `cpe-pw-tab-${target.username}` : undefined}
        onSubmit={onSubmit}
      >
        <div className="cpe-pw-form-intro">
          <strong>{target.name}</strong>
          <span>
            @{target.username}
            {target.username === session.username ? " · you" : ""}
          </span>
        </div>

        <div className="cpe-pw-form-grid">
          <PassField
            id="cpe-pw-current"
            label={isAdminReset ? "Your admin password" : "Current password"}
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showCurrent}
            onToggle={() => setShowCurrent((v) => !v)}
            autoComplete="current-password"
          />
          <PassField
            id="cpe-pw-new"
            label={isAdminReset ? `New password for @${target.username}` : "New password"}
            value={newPassword}
            onChange={setNewPassword}
            show={showNew}
            onToggle={() => setShowNew((v) => !v)}
            autoComplete="new-password"
          />
          <PassField
            id="cpe-pw-confirm"
            label="Confirm new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            autoComplete="new-password"
          />
        </div>

        {isAdminReset && (
          <p className="cpe-pw-form-hint">
            Confirm with your Super Admin password to reset the {target.name} desk login.
          </p>
        )}
        {error && <p className="cpe-pw-form-error">{error}</p>}
        {success && (
          <p className="cpe-pw-form-success" role="status">
            {success}
          </p>
        )}
        <div className="cpe-pw-form-actions">
          <button type="submit" className="cpe-pw-form-save">
            {isAdminReset ? "Update desk password" : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
}
