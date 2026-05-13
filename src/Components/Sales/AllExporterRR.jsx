import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.css";
import API_CONFIG from "../../config/api.js";
import { Search, Eye, Package, ChevronLeft, ChevronRight, DollarSign } from "lucide-react";
import {
  RateRequestDetailBody,
  GiveRateModal,
  formatExporterCompany,
  formatDateTime,
  formatStatusLabel,
} from "./exporterRateRequestReadOnly.jsx";

const getToken = () =>
  sessionStorage.getItem("authToken") ||
  localStorage.getItem("authToken") ||
  sessionStorage.getItem("token") ||
  localStorage.getItem("token");

export default function AllExporterRR() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  });
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);
  const [giveRateRequestId, setGiveRateRequestId] = useState(null);

  const authHeaders = useMemo(() => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const loadList = async (override = {}) => {
    const p = override.page ?? page;
    const l = override.limit ?? limit;
    const q = override.search !== undefined ? override.search : activeSearch;
    setLoading(true);
    try {
      const params = { page: p, limit: l };
      if (String(q).trim()) params.search = String(q).trim();
      const res = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/exporter-rate-requst/operation-team/all`, {
        headers: authHeaders,
        params,
      });
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setRows(list);
      if (res.data?.pagination) {
        setPagination({
          currentPage: res.data.pagination.currentPage ?? p,
          totalPages: res.data.pagination.totalPages ?? 1,
          totalItems: res.data.pagination.totalItems ?? list.length,
          itemsPerPage: res.data.pagination.itemsPerPage ?? l,
        });
      } else {
        setPagination({
          currentPage: p,
          totalPages: 1,
          totalItems: list.length,
          itemsPerPage: l,
        });
      }
    } catch (err) {
      alertify.error(err.response?.data?.message || "Failed to load all exporter rate requests");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadList();
  }, [page, limit, activeSearch]);

  const totalCount = pagination.totalItems ?? rows.length;
  const todayCount = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return rows.filter((r) => {
      const raw = r.createdAt ?? r.created_at;
      if (raw == null) return false;
      const s = typeof raw === "string" ? raw.slice(0, 10) : "";
      return s === today;
    }).length;
  }, [rows]);

  const applySearch = () => {
    setActiveSearch(search.trim());
    setPage(1);
  };

  const openDetail = (row) => {
    setSelected(row);
    setShowDetail(true);
  };

  const canGoPrev = page > 1;
  const canGoNext = page < (pagination.totalPages || 1);

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="mb-6 flex flex-col gap-6 rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-6 xl:flex-row">
          <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-2">
            <div className="relative flex h-[90px] items-center rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl font-bold text-gray-700">
                {totalCount}
              </div>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-2 text-center font-semibold text-gray-700">
                Total exporter RR
              </div>
            </div>
            <div className="relative flex h-[90px] items-center rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl font-bold text-gray-700">
                {todayCount}
              </div>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-2 text-center font-semibold text-gray-700">
                Today (this page)
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col justify-center xl:w-[320px]">
            <p className="text-sm text-gray-600">
              Operation team view — all exporter rate requests. Search applies on the next request (Enter).
            </p>
          </div>
        </div>

        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search request ID, exporter, route, status… (press Enter)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-6 pr-12 text-gray-600 transition-colors placeholder:text-gray-400 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <Search className="absolute right-6 top-1/2 size-6 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {loading && (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-gray-200 bg-white">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
            <p className="text-gray-600">Loading all exporter RR…</p>
          </div>
        </div>
      )}

      {!loading && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-white">
                <tr>
                  <th className="px-4 py-4 text-left text-base font-medium text-gray-800">Request ID</th>
                  <th className="px-4 py-4 text-left text-base font-medium text-gray-800">Department</th>
                  <th className="px-4 py-4 text-left text-base font-medium text-gray-800">Exporter</th>
                  <th className="px-4 py-4 text-left text-base font-medium text-gray-800">Route</th>
                  <th className="px-4 py-4 text-left text-base font-medium text-gray-800">Status</th>
                  <th className="px-4 py-4 text-left text-base font-medium text-gray-800">Quote due</th>
                  <th className="px-4 py-4 text-left text-base font-medium text-gray-800">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item._id} className="border-b border-gray-100 transition-colors hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-gray-600">{item.requestId || item._id}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-800">{item.department || "—"}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="block text-sm font-medium text-gray-800">
                        {formatExporterCompany(item.exporterCompany)}
                      </span>
                      <span className="text-xs text-gray-500">{item.contactPerson || "N/A"}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-gray-800">
                        {item.originPort || "-"} to {item.destinationPort || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-800">{formatStatusLabel(item.status)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-gray-800">{formatDateTime(item.quoteDueAt)}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openDetail(item)}
                          className="inline-flex items-center gap-0.5 whitespace-nowrap rounded border border-green-600 px-2 py-0.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-50"
                        >
                          <Eye size={12} /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => setGiveRateRequestId(item._id)}
                          className="inline-flex items-center gap-0.5 whitespace-nowrap rounded border border-amber-600 px-2 py-0.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-50"
                        >
                          <DollarSign size={12} /> Give rate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && (
            <div className="py-12 text-center">
              <Package className="mx-auto mb-4 size-16 text-gray-300" />
              <p className="text-lg text-gray-500">
                {activeSearch.trim() ? "No requests match your search" : "No exporter rate requests found"}
              </p>
              <p className="text-sm text-gray-400">
                {activeSearch.trim() ? "Try different keywords" : "Data will appear when requests exist"}
              </p>
            </div>
          )}
        </div>
      )}

      {!loading && rows.length > 0 && (canGoPrev || canGoNext) && (
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-600">
            Page {page} of {pagination.totalPages || 1}
            {pagination.totalItems != null && ` · ${pagination.totalItems} total`}
            {activeSearch.trim() ? ` · search: "${activeSearch.trim()}"` : ""}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!canGoPrev}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={18} />
              <span>Previous</span>
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!canGoNext}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>Next</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      <GiveRateModal
        open={Boolean(giveRateRequestId)}
        requestId={giveRateRequestId || ""}
        authHeaders={authHeaders}
        onClose={() => setGiveRateRequestId(null)}
        onSuccess={() => void loadList()}
      />

      {showDetail && selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
          onClick={() => {
            setShowDetail(false);
            setSelected(null);
          }}
        >
          <div
            className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-auto rounded-3xl border border-gray-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-t-3xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                    <Eye size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">All Exporter RR — Detail</h3>
                    <p className="text-sm text-blue-100">Read-only · operation team</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="text-xl font-bold text-white/80 hover:text-white"
                  onClick={() => {
                    setShowDetail(false);
                    setSelected(null);
                  }}
                >
                  X
                </button>
              </div>
            </div>
            <div className="space-y-5 bg-gray-50 p-6">
              <RateRequestDetailBody detail={selected} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
