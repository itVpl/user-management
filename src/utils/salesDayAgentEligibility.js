/**
 * Sales day-shift agent import / disposition flows (see product spec).
 */

export function getUserFromStorage() {
  try {
    // Match App.jsx / TopBar: localStorage first (some sessions only persist here)
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getDepartmentString(user) {
  if (!user) return '';
  const d = user.department;
  if (typeof d === 'string' && d.trim()) return d.trim();
  if (d && typeof d === 'object' && typeof d.name === 'string' && d.name.trim()) return d.name.trim();
  const alt = user.departmentName || user.designation || user.position || user.role;
  if (typeof alt === 'string' && alt.trim()) return alt.trim();
  return '';
}

/** Login payload often omits `status`; treat missing like other screens (e.g. Manage User). */
export function isEmployeeActiveForHandoff(user) {
  if (!user) return false;
  const s = String(user.status ?? '').trim().toLowerCase();
  if (s === '' || s === 'undefined') return true;
  return s === 'active';
}

export function isSalesDepartment(user) {
  const dep = getDepartmentString(user).toLowerCase();
  return dep === 'sales' || dep.includes('sales');
}

/** Missing or not `day_shift` → treat as night shift (legacy flows). */
export function isSalesDayShiftTiming(user) {
  if (!isSalesDepartment(user)) return false;
  return user?.salesShiftTiming === 'day_shift';
}

const normLabel = (s) =>
  String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

/**
 * True when login payload includes populated `allowedModules` entries for Add Agent
 * (or equivalent menu names). Legacy sessions with only module ids return false here —
 * use `employeeHasMenuModule` to resolve via `/api/v1/module`.
 */
export function userHasAddAgentModuleSync(user) {
  const list = user?.allowedModules;
  if (!Array.isArray(list) || !list.length) return false;
  const tokens = ['add agent', 'add customer', 'sales day agent', 'sales add agent'];
  return list.some((m) => {
    if (m == null) return false;
    if (typeof m === 'object' && m.isActive === false) return false;
    const name = typeof m === 'object' ? m.name || m.label || '' : '';
    const n = normLabel(name);
    if (!n) return false;
    return tokens.some((t) => n === t || n.includes(t));
  });
}
