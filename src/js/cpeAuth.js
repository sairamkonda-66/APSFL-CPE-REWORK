/** CPE ops roles — 4 individual desk logins. */

export const CPE_ROLES = {
  SUPER_ADMIN: "super_admin",
  INWARD: "inward",
  OUTWARD: "outward",
  REPAIR: "repair",
};

export const CPE_USERS = [
  {
    id: "admin",
    username: "admin",
    password: "admin@123",
    name: "Super Admin",
    role: CPE_ROLES.SUPER_ADMIN,
    desk: "Full control · Masters + Dashboard + all workflows",
  },
  {
    id: "inward",
    username: "inward",
    password: "inward@123",
    name: "Inward Operator",
    role: CPE_ROLES.INWARD,
    desk: "Inward desk · Customer / Item Master + MAC scan",
  },
  {
    id: "outward",
    username: "outward",
    password: "outward@123",
    name: "Outward Operator",
    role: CPE_ROLES.OUTWARD,
    desk: "Outward desk · Completed Repair / Scrap boxes",
  },
  {
    id: "repair",
    username: "repair",
    password: "repair@123",
    name: "Repair Operator",
    role: CPE_ROLES.REPAIR,
    desk: "Repair desk · Mark Repair or Scrap",
  },
];

export const CPE_SESSION_KEY = "apsfl-cpe-session-v1";
export const CPE_PASSWORD_KEY = "apsfl-cpe-passwords-v1";
export const CPE_AUTH_EVENT = "apsfl-cpe-auth";

function readPasswordMap() {
  try {
    const raw = window.localStorage.getItem(CPE_PASSWORD_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function getEffectivePassword(username) {
  const user = CPE_USERS.find((u) => u.username === username);
  if (!user) return null;
  const stored = readPasswordMap()[username];
  if (typeof stored === "string" && stored.length) return stored;
  return user.password;
}

/** Demo login cards — includes any locally changed passwords. */
export function getCpeUsersForLogin() {
  return CPE_USERS.map((user) => ({
    ...user,
    password: getEffectivePassword(user.username),
  }));
}

export function getRoleLabel(role) {
  const user = CPE_USERS.find((u) => u.role === role);
  return user?.name || role;
}

export function roleCanAccessDashboard(role) {
  return role === CPE_ROLES.SUPER_ADMIN;
}

/** Customer Master + Item Master tabs — Super Admin and Inward only. */
export function roleCanAccessMasters(role) {
  return role === CPE_ROLES.SUPER_ADMIN || role === CPE_ROLES.INWARD;
}

/** Delete customer / individual MAC or item — Super Admin only. */
export function roleCanDelete(role) {
  return role === CPE_ROLES.SUPER_ADMIN;
}

export function roleDefaultWorkflow(role) {
  if (role === CPE_ROLES.INWARD) return "inward";
  if (role === CPE_ROLES.OUTWARD) return "outward";
  if (role === CPE_ROLES.REPAIR) return "repair";
  return "inward";
}

export function roleAllowedWorkflows(role) {
  if (role === CPE_ROLES.SUPER_ADMIN) return ["inward", "outward", "repair"];
  if (role === CPE_ROLES.INWARD) return ["inward"];
  if (role === CPE_ROLES.OUTWARD) return ["outward"];
  if (role === CPE_ROLES.REPAIR) return ["repair"];
  return [];
}

export function getCpeSession() {
  try {
    const raw = window.localStorage.getItem(CPE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.username || !parsed?.role) return null;
    const known = CPE_USERS.find((u) => u.username === parsed.username && u.role === parsed.role);
    if (!known) return null;
    return {
      username: known.username,
      name: known.name,
      role: known.role,
      desk: known.desk,
      loggedInAt: parsed.loggedInAt || "",
    };
  } catch {
    return null;
  }
}

export function loginCpeUser(username, password) {
  const normalized = String(username || "").trim().toLowerCase();
  const user = CPE_USERS.find((u) => u.username.toLowerCase() === normalized);
  if (!user || getEffectivePassword(user.username) !== String(password || "")) {
    throw new Error("Invalid username or password.");
  }
  const session = {
    username: user.username,
    name: user.name,
    role: user.role,
    desk: user.desk,
    loggedInAt: new Date().toISOString(),
  };
  window.localStorage.setItem(CPE_SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent(CPE_AUTH_EVENT));
  return session;
}

/** Accounts the signed-in user may update passwords for. */
export function getPasswordManageableUsers(session) {
  if (!session?.username) return [];
  if (session.role === CPE_ROLES.SUPER_ADMIN) {
    return CPE_USERS.map((user) => ({
      username: user.username,
      name: user.name,
      role: user.role,
      desk: user.desk,
    }));
  }
  const self = CPE_USERS.find((u) => u.username === session.username);
  return self
    ? [{ username: self.username, name: self.name, role: self.role, desk: self.desk }]
    : [];
}

/**
 * Change a desk password.
 * - Own account: requires that account's current password.
 * - Super Admin resetting inward / outward / repair: requires the admin's current password.
 */
export function changeCpePassword(actorSession, targetUsername, currentPassword, newPassword, confirmPassword) {
  if (!actorSession?.username || !actorSession?.role) {
    throw new Error("You must be signed in.");
  }
  const target = CPE_USERS.find((u) => u.username === targetUsername);
  if (!target) {
    throw new Error("User not found.");
  }

  const isSelf = actorSession.username === target.username;
  const isAdminReset =
    actorSession.role === CPE_ROLES.SUPER_ADMIN &&
    !isSelf &&
    target.role !== CPE_ROLES.SUPER_ADMIN;

  if (!isSelf && !isAdminReset) {
    throw new Error("You can only change your own password.");
  }

  const verifyUsername = isAdminReset ? actorSession.username : target.username;
  const current = String(currentPassword || "");
  const next = String(newPassword || "");
  const confirm = String(confirmPassword || "");

  if (getEffectivePassword(verifyUsername) !== current) {
    throw new Error(isAdminReset ? "Admin password is incorrect." : "Current password is incorrect.");
  }
  if (next.length < 6) {
    throw new Error("New password must be at least 6 characters.");
  }
  if (next !== confirm) {
    throw new Error("New passwords do not match.");
  }
  if (next === getEffectivePassword(target.username)) {
    throw new Error("New password must be different from the current password.");
  }

  const map = readPasswordMap();
  map[target.username] = next;
  window.localStorage.setItem(CPE_PASSWORD_KEY, JSON.stringify(map));
  return true;
}

export function logoutCpeUser() {
  window.localStorage.removeItem(CPE_SESSION_KEY);
  window.dispatchEvent(new CustomEvent(CPE_AUTH_EVENT));
}
