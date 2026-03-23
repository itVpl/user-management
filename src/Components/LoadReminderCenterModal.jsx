import React, { useState } from "react";
import { Bell, CalendarClock } from "lucide-react";

/**
 * Center-screen overlay for important-date load reminders.
 * User must confirm they took updates (Yes) to open DO Details; choosing No cannot dismiss the dialog.
 */
export default function LoadReminderCenterModal({ notification, onConfirmYes }) {
  const [noAcknowledged, setNoAcknowledged] = useState(false);

  if (!notification) return null;

  const title = notification.title || "Load reminder";
  const body = notification.body || "";

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="load-reminder-title"
    >
      {/* Backdrop: not clickable — user cannot dismiss without choosing Yes */}
      <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm" aria-hidden />

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/5">
          <div className="h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500" />

          <div className="flex gap-4 p-6 pt-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 text-amber-600 shadow-inner ring-1 ring-amber-100/80">
              <CalendarClock className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="mb-1 flex items-center gap-2">
                <Bell className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700/90">
                  Reminder
                </span>
              </div>
              <h2
                id="load-reminder-title"
                className="text-lg font-semibold leading-snug text-slate-900"
              >
                {title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{body}</p>

              <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">
                  Did you take any updates on this load?
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Choose <span className="font-medium text-slate-800">Yes</span> only after you
                  have completed your updates — you will be taken to DO Details with this load
                  opened. If you have not updated yet, choose{" "}
                  <span className="font-medium text-slate-800">No</span>; this message will stay
                  here until you confirm with Yes.
                </p>
              </div>

              {noAcknowledged && (
                <p className="mt-3 text-sm font-medium text-amber-800">
                  Please complete your updates first, then tap &quot;Yes, I have updated&quot; to
                  continue. This reminder cannot be closed until then.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/90 px-6 py-4 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={() => setNoAcknowledged(true)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100"
            >
              No, not yet
            </button>
            <button
              type="button"
              onClick={() => onConfirmYes?.()}
              className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-500/25 transition hover:from-amber-600 hover:to-orange-600"
            >
              Yes, I have updated
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
