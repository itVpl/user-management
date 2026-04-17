import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { UtensilsCrossed } from "lucide-react";
import API_CONFIG from "../../config/api";
import DinnerThaliPanel from "./DinnerThaliPanel";
import DinnerThaliHrReportModal from "./DinnerThaliHrReportModal";
import { readDinnerThaliUser, isHrOrSuperadmin } from "./dinnerThaliUtils";

const DinnerThaliDashboardCard = () => {
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [message, setMessage] = useState("");
  const [data, setData] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [hrReportOpen, setHrReportOpen] = useState(false);
  const showHrCounts = isHrOrSuperadmin(readDinnerThaliUser());

  const load = useCallback(async () => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/dinner-thali/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success && res.data.data) {
        setData(res.data.data);
        setForbidden(false);
        setMessage("");
      } else {
        setData(null);
        setMessage("Could not load dinner thali.");
      }
    } catch (e) {
      const status = e.response?.status;
      if (status === 403) {
        setForbidden(true);
        setData(null);
        setMessage(e.response?.data?.message || "Not available.");
      } else {
        setData(null);
        setForbidden(false);
        setMessage("");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!modalOpen && !hrReportOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") {
        setModalOpen(false);
        setHrReportOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [modalOpen, hrReportOpen]);

  const choiceLabel = (value) => {
    if (!value || !data?.choices) return null;
    const c = data.choices.find((x) => x.value === value);
    return c?.label || value;
  };

  if (loading) {
    return (
      <div className="mb-3 rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
        Loading dinner thali…
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="mb-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        {message}
      </div>
    );
  }

  if (!data && message) {
    return (
      <div className="mb-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {message}
      </div>
    );
  }

  if (!data) return null;

  const modal =
    modalOpen &&
    createPortal(
      <div
        className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/50 p-4"
        role="presentation"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) setModalOpen(false);
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dinner-thali-modal-title"
          className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4 sm:px-6">
            <DinnerThaliPanel
              onClose={() => setModalOpen(false)}
              onSaved={load}
              scrollClassName=""
              showHrReport={false}
            />
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <>
      {modal}
      {hrReportOpen && (
        <DinnerThaliHrReportModal defaultDate={data.forDateKey} onClose={() => setHrReportOpen(false)} />
      )}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900">Dinner Thali · {data.forDateKey}</p>
            <p className="truncate text-sm text-gray-600">
              {data.myChoice ? (
                <>
                  Your choice:{" "}
                  <span className="font-medium text-gray-800">{choiceLabel(data.myChoice)}</span>
                </>
              ) : (
                "No choice submitted yet"
              )}
              {data.canSubmit ? " · Window open" : " · Window closed"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {showHrCounts && (
            <button
              type="button"
              onClick={() => setHrReportOpen(true)}
              className="rounded-lg border-2 border-amber-600 bg-white px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50"
            >
              Thali Counts
            </button>
          )}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            {data.canSubmit ? "Update Your Choice" : "Book Your Thali"}
          </button>
        </div>
      </div>
    </>
  );
};

export default DinnerThaliDashboardCard;
