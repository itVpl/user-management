/** Session snapshot for CMT "my assigned truckers" (login + GET my-truckers). */

const KEY_TRUCKERS = 'assignedTruckers';
const KEY_WINDOWS = 'truckerAssignmentWindows';

function safeParse(json, fallback) {
  try {
    if (json == null || json === '') return fallback;
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

export function persistAssignedTruckersFromLogin(payload) {
  const truckers = payload?.assignedTruckers ?? [];
  const windows = payload?.truckerAssignmentWindows ?? [];
  sessionStorage.setItem(KEY_TRUCKERS, JSON.stringify(truckers));
  sessionStorage.setItem(KEY_WINDOWS, JSON.stringify(windows));
}

function assignmentToWindow(a) {
  return {
    assignmentId: a.assignmentId,
    startDate: a.startDate,
    endDate: a.endDate,
    notes: a.notes ?? '',
    targetNewTruckerCount: a.targetNewTruckerCount,
    addedCount: a.addedCount,
  };
}

export function persistFromMyTruckersApi(data) {
  const truckers = data?.truckers ?? [];
  const assignments = data?.assignments ?? [];
  const windows = assignments.map((a) => assignmentToWindow(a));
  sessionStorage.setItem(KEY_TRUCKERS, JSON.stringify(truckers));
  sessionStorage.setItem(KEY_WINDOWS, JSON.stringify(windows));
}

export function readAssignedTruckersSnapshot() {
  return {
    truckers: safeParse(sessionStorage.getItem(KEY_TRUCKERS), []),
    windows: safeParse(sessionStorage.getItem(KEY_WINDOWS), []),
  };
}

export function shouldShowMyAssignedTruckersWidget(user) {
  if (!user || typeof user !== 'object') return false;
  const role = String(user.role || '').toLowerCase().trim();
  if (role === 'superadmin' || role === 'super admin') return true;
  const dept = String(user.department || '').trim().toLowerCase();
  return dept === 'cmt';
}
