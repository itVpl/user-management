import React from "react";
import { Eye, Edit, DollarSign } from "lucide-react";

/** Consistent table action buttons — matches app blue-600 theme */
export const INVOICE_BTN_VIEW =
  "inline-flex items-center justify-center gap-1 min-w-[68px] px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-600 text-blue-600 bg-white hover:bg-blue-600 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

export const INVOICE_BTN_EDIT =
  "inline-flex items-center justify-center gap-1 min-w-[68px] px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-400 text-slate-700 bg-white hover:bg-slate-700 hover:text-white hover:border-slate-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

export const INVOICE_BTN_PAY =
  "inline-flex items-center justify-center gap-1 min-w-[68px] px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-600 text-emerald-700 bg-white hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

export function ViewActionButton({ onClick, title = "View Details", disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={INVOICE_BTN_VIEW}
    >
      <Eye size={13} strokeWidth={2.25} />
      View
    </button>
  );
}

export function PayActionButton({ onClick, title = "Pay to Carrier", disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={INVOICE_BTN_PAY}
    >
      <DollarSign size={13} strokeWidth={2.25} />
      Pay
    </button>
  );
}

export function EditActionButton({ onClick, title = "Edit Details", disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={INVOICE_BTN_EDIT}
    >
      <Edit size={13} strokeWidth={2.25} />
      Edit
    </button>
  );
}
