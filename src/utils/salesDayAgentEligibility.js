/**
 * Sales day-shift agent import / disposition flows (see product spec).
 */

export function getUserFromStorage() {
  try {
    const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getDepartmentString(user) {
  if (!user) return '';
  const d = user.department;
  if (typeof d === 'string') return d.trim();
  if (d && typeof d === 'object' && typeof d.name === 'string') return d.name.trim();
  return '';
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
