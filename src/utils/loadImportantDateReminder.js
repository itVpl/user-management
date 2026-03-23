/**
 * Important-date reminders from PUT /api/v1/load/cmt/load/:loadId (importantDates).
 * Socket `notification` events: type "load", title like "Vessel date reminder".
 * Body text includes the scheduled time as 12-hour clock + AM/PM UTC (e.g. "04/01/2026, 04:20 PM UTC")
 * and load reference; load fields still store raw ISO UTC.
 */

export function isLoadImportantDateReminder(data) {
  if (!data || data.type !== "load") return false;
  const title = (data.title || "").trim();
  const body = data.body || "";
  if (/reminder$/i.test(title)) return true;
  if (body.toLowerCase().includes("scheduled for")) return true;
  return false;
}

export function getLoadReminderDedupeKey(data) {
  return `load-reminder-${data.loadId || "unknown"}-${data.title || ""}-${data.timestamp || Date.now()}`;
}
