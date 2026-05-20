import React from "react";
import { X } from "lucide-react";

const SIZE_CLASS = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
};

/** Theme-aligned section palettes (blue-600 primary) */
export const SECTION_TONES = {
  customer: {
    wrap: "border-emerald-200/90 bg-gradient-to-br from-emerald-50 via-white to-white",
    header: "border-emerald-100 bg-emerald-50/95",
    icon: "bg-emerald-100 text-emerald-700",
    card: "border-emerald-100/80 bg-white/90",
    badge: "bg-emerald-100 text-emerald-700",
    accent: "text-emerald-600",
    label: "text-emerald-800/70",
  },
  company: {
    wrap: "border-violet-200/90 bg-gradient-to-br from-violet-50 via-white to-white",
    header: "border-violet-100 bg-violet-50/95",
    icon: "bg-violet-100 text-violet-700",
    card: "border-violet-100/80 bg-white/90",
    badge: "bg-violet-100 text-violet-700",
    accent: "text-violet-600",
    label: "text-violet-800/70",
  },
  agent: {
    wrap: "border-blue-200/90 bg-gradient-to-br from-blue-50 via-white to-white",
    header: "border-blue-100 bg-blue-50/95",
    icon: "bg-blue-100 text-blue-700",
    card: "border-blue-100/80 bg-white/90",
    badge: "bg-blue-100 text-blue-700",
    accent: "text-blue-600",
    label: "text-blue-800/70",
  },
  carrier: {
    wrap: "border-indigo-200/90 bg-gradient-to-br from-indigo-50 via-white to-white",
    header: "border-indigo-100 bg-indigo-50/95",
    icon: "bg-indigo-100 text-indigo-700",
    card: "border-indigo-100/80 bg-white/90",
    badge: "bg-indigo-100 text-indigo-700",
    accent: "text-indigo-600",
    label: "text-indigo-800/70",
  },
  shipper: {
    wrap: "border-amber-200/90 bg-gradient-to-br from-amber-50 via-white to-white",
    header: "border-amber-100 bg-amber-50/95",
    icon: "bg-amber-100 text-amber-700",
    card: "border-amber-100/80 bg-white/90",
    badge: "bg-amber-100 text-amber-700",
    accent: "text-amber-700",
    label: "text-amber-800/70",
  },
  rejection: {
    wrap: "border-red-200/90 bg-gradient-to-br from-red-50 via-white to-white",
    header: "border-red-100 bg-red-50/95",
    icon: "bg-red-100 text-red-600",
    card: "border-red-100/80 bg-white/90",
    badge: "bg-red-100 text-red-600",
    accent: "text-red-600",
    label: "text-red-800/70",
  },
  pdf: {
    wrap: "border-sky-200/90 bg-gradient-to-br from-sky-50 via-white to-white",
    header: "border-sky-100 bg-sky-50/95",
    icon: "bg-sky-100 text-sky-700",
    card: "border-sky-100/80 bg-white/90",
    badge: "bg-sky-100 text-sky-700",
    accent: "text-sky-700",
    label: "text-sky-800/70",
  },
  approval: {
    wrap: "border-blue-200/90 bg-gradient-to-br from-blue-50/90 via-white to-white",
    header: "border-blue-100 bg-blue-50/95",
    icon: "bg-blue-100 text-blue-700",
    card: "border-blue-100/80 bg-white/95",
    badge: "bg-blue-100 text-blue-700",
    accent: "text-blue-600",
    label: "text-blue-800/70",
  },
  slate: {
    wrap: "border-slate-200 bg-gradient-to-br from-slate-50 via-white to-white",
    header: "border-slate-100 bg-slate-50/95",
    icon: "bg-slate-100 text-slate-600",
    card: "border-slate-100 bg-white/90",
    badge: "bg-slate-100 text-slate-600",
    accent: "text-slate-700",
    label: "text-slate-600",
  },
};

export const MODAL_INPUT =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-colors";

export const MODAL_LABEL = "block text-xs font-medium text-gray-600 mb-1";

export const MODAL_BTN_CANCEL =
  "inline-flex items-center justify-center flex-1 px-3.5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const MODAL_BTN_PRIMARY =
  "inline-flex items-center justify-center flex-1 gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

/** Compact MUI TextField — use in EditForm */
export const COMPACT_FIELD_SX = {
  "& .MuiInputBase-root": {
    fontSize: "0.8125rem",
    minHeight: 38,
    borderRadius: "8px",
  },
  "& .MuiInputLabel-root": { fontSize: "0.8125rem" },
  "& .MuiOutlinedInput-input": { py: 0.85, px: 1.25 },
  "& .MuiFormLabel-root.Mui-focused": { color: "#2563EB" },
  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "#2563EB",
  },
};

export const COMPACT_READONLY_SX = {
  ...COMPACT_FIELD_SX,
  "& .MuiInputBase-input": {
    backgroundColor: "#f8fafc",
    fontSize: "0.8125rem",
  },
};

/** Label + value row for view modal */
export function ViewField({ label, value, highlight, tone = "slate" }) {
  const t = SECTION_TONES[tone] || SECTION_TONES.slate;
  return (
    <div>
      <p className={`text-xs font-medium uppercase tracking-wide mb-0.5 ${t.label}`}>
        {label}
      </p>
      <p
        className={`text-sm font-medium text-gray-900 ${highlight ? `font-semibold ${t.accent}` : ""}`}
      >
        {value ?? "N/A"}
      </p>
    </div>
  );
}

export function ModalSection({ title, icon: Icon, children, tone = "slate" }) {
  const t = SECTION_TONES[tone] || SECTION_TONES.slate;
  return (
    <section
      className={`rounded-xl border shadow-sm overflow-hidden ${t.wrap}`}
    >
      <div
        className={`flex items-center gap-2.5 px-4 py-2.5 border-b ${t.header}`}
      >
        {Icon && (
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${t.icon}`}
          >
            <Icon size={15} />
          </span>
        )}
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export default function AppModal({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  size = "lg",
  children,
  footer,
  zIndex = 50,
  contentClassName = "",
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
      style={{ zIndex }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <style>{`
        .app-modal-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .app-modal-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .app-modal-scroll { scrollbar-width: thin; }
      `}</style>
      <div
        className={`bg-white rounded-xl border border-gray-200 shadow-xl w-full ${SIZE_CLASS[size] || SIZE_CLASS.lg} max-h-[92vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 px-5 py-3.5 border-b border-gray-200 bg-gradient-to-r from-blue-50/50 to-white shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            {Icon && (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Icon size={18} />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 truncate">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div
          className={`flex-1 overflow-y-auto app-modal-scroll px-5 py-4 ${contentClassName}`}
        >
          {children}
        </div>

        {footer && (
          <footer className="shrink-0 px-5 py-3 border-t border-gray-200 bg-gray-50/80 rounded-b-xl">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
