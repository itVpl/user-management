import axios from 'axios';
import API_CONFIG from '../config/api.js';

const normalizeForMatch = (str) =>
  (str || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/-/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toLowerCase();

const normalizeDept = (s) => s.replace(/\bdept\b/g, 'department');

/**
 * Whether the logged-in employee may access a sidebar menu item by its display name
 * (same name matching rules as Sidebar.jsx).
 */
export async function employeeHasMenuModule(menuItemName) {
  const userRaw = sessionStorage.getItem('user') || localStorage.getItem('user');
  if (!userRaw) return false;
  let user;
  try {
    user = JSON.parse(userRaw);
  } catch {
    return false;
  }
  const allowedModuleIds = (user?.allowedModules || [])
    .map((m) => {
      if (m == null) return '';
      if (typeof m === 'object') return String(m._id || m.id || '');
      return String(m);
    })
    .filter(Boolean);
  if (!allowedModuleIds.length) return false;

  const token =
    sessionStorage.getItem('token') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('authToken') ||
    localStorage.getItem('authToken');
  if (!token) return false;

  const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/module`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    withCredentials: true,
  });

  const data = res.data;
  if (!data?.success || !Array.isArray(data.modules)) return false;

  const activeModules = data.modules.filter(
    (mod) => mod.isActive === true && allowedModuleIds.includes(String(mod._id)),
  );

  const itemName = normalizeForMatch(menuItemName);
  /** Sidebar menu is "Add Agent"; Module Master may use "Add Customer" or "Add Agent" (see Sidebar moduleAliases). */
  const addAgentMenuNorm = normalizeForMatch('Add Agent');
  const addCustomerMenuNorm = normalizeForMatch('Add Customer');
  const crossAliases = ['add  agent', 'add agent', 'add  customer', 'add customer', 'sales add agent', 'sales day agent'];

  return activeModules.some((mod) => {
    const modName = normalizeForMatch(mod.name);
    const modLabel = normalizeForMatch(mod.label);
    const modNameDept = normalizeDept(modName);
    const itemNameDept = normalizeDept(itemName);
    const direct =
      modName === itemName ||
      modLabel === itemName ||
      modNameDept === itemNameDept ||
      normalizeDept(modLabel) === itemNameDept;
    if (direct) return true;
    if (itemName === addAgentMenuNorm || itemName === addCustomerMenuNorm) {
      return crossAliases.includes(modName) || crossAliases.includes(modLabel);
    }
    return false;
  });
}
