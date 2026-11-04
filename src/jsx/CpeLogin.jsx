import { useState } from "react";
import { getCpeUsersForLogin, loginCpeUser } from "../js/cpeAuth";
import "../css/CpeLogin.css";

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

export default function CpeLogin({ onSuccess, title = "APSFL CPE Ops Login" }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const users = getCpeUsersForLogin();

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      const session = loginCpeUser(username, password);
      onSuccess?.(session);
    } catch (err) {
      setError(err.message || "Login failed.");
    }
  }

  function quickFill(user) {
    setUsername(user.username);
    setPassword(user.password);
    setError("");
  }

  return (
    <main className="cpe-login">
      <div className="cpe-login-bg" aria-hidden="true" />

      <section className="cpe-login-shell w">
        <header className="cpe-login-hero">
          <p className="cpe-login-eyebrow">
            <span className="cpe-login-pulse" />
            4 desk roles · Secure ops login
          </p>
          <h1>{title}</h1>
          <p>
            Sign in with your assigned desk account. Super Admin sees Excel customer /
            MAC data on the Dashboard. Other roles open only their workflow.
          </p>
        </header>

        <div className="cpe-login-layout">
          <form className="cpe-login-card" onSubmit={handleSubmit}>
            <h2>Sign in</h2>
            <label>
              Username
              <input
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin"
                required
              />
            </label>
            <label>
              Password
              <div className="cpe-login-pass">
                <input
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  className="cpe-login-pass-toggle"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                  aria-pressed={showPass}
                >
                  <EyeIcon open={showPass} />
                </button>
              </div>
            </label>
            {error && <p className="cpe-login-error">{error}</p>}
            <button type="submit">Login to desk</button>
          </form>

          <aside className="cpe-login-roles">
            <h2>Role credentials</h2>
            <p className="cpe-login-roles-note">Demo accounts — click a card to fill login</p>
            <ul>
              {users.map((user) => (
                <li key={user.id}>
                  <button type="button" onClick={() => quickFill(user)}>
                    <strong>{user.name}</strong>
                    <span>{user.desk}</span>
                    <small>
                      User: <code>{user.username}</code> · Pass: <code>{user.password}</code>
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>
    </main>
  );
}
