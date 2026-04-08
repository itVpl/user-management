import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Search, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "react-toastify";
import API_CONFIG from "../../config/api";

const DEFAULT_LIMIT = 20;
const LIMIT_OPTIONS = [10, 20, 50, 100];

const getToken = () =>
  sessionStorage.getItem("authToken") ||
  localStorage.getItem("authToken") ||
  sessionStorage.getItem("token") ||
  localStorage.getItem("token");

const getAuthConfig = () => {
  const token = getToken();
  return {
    withCredentials: true,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  };
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
};

const toDetailsObject = (payload) => {
  if (!payload || typeof payload !== "object") return null;
  if (payload?.data && typeof payload.data === "object") return payload.data;
  return payload;
};

const readValue = (...values) => {
  for (const value of values) {
    if (value === 0) return 0;
    if (value !== null && value !== undefined && String(value).trim() !== "") return value;
  }
  return "-";
};

const extractLoadAddedDateTimes = (payload, rowMetrics) => {
  const details = toDetailsObject(payload);
  const out = [];

  const pushDate = (raw) => {
    const normalized = formatDateTime(raw);
    if (normalized !== "-") out.push(normalized);
  };

  // Always include report-row metrics if present.
  pushDate(rowMetrics?.firstLoadAddedAt);
  pushDate(rowMetrics?.latestLoadAddedAt);

  if (!details || typeof details !== "object") {
    return Array.from(new Set(out));
  }

  const buckets = [
    details.loads,
    details.loadDetails,
    details.shipperLoads,
    details.deliveryOrders,
    details.orders,
    details.laneDetails,
    details.prospectDetails,
    details.data?.loads,
    details.data?.loadDetails,
    details.data?.deliveryOrders,
    details.data?.orders,
  ].filter(Array.isArray);

  buckets.forEach((arr) => {
    arr.forEach((item) => {
      const raw =
        item?.latestLoadAddedAt ||
        item?.firstLoadAddedAt ||
        item?.createdAt ||
        item?.loadAddedAt ||
        item?.addedAt ||
        item?.createdOn ||
        item?.createdDate;
      const normalized = formatDateTime(raw);
      if (normalized !== "-") out.push(normalized);
    });
  });

  return Array.from(new Set(out));
};

const toAbsoluteApiUrl = (pathOrUrl) => {
  if (!pathOrUrl) return null;
  const v = String(pathOrUrl).trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `${API_CONFIG.BASE_URL}${v.startsWith("/") ? v : `/${v}`}`;
};

export default function AddCustomerReport() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    createdByType: "",
    addedByEmpId: "",
  });
  const [reportMeta, setReportMeta] = useState(null);
  const [rows, setRows] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsModal, setDetailsModal] = useState({ open: false, payload: null, row: null });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    totalPages: 1,
  });

  const handleApiError = useCallback(
    (error, fallbackMessage) => {
      const status = error?.response?.status;
      if (status === 401) {
        toast.error("Session expired. Please login again.");
        navigate("/login");
        return true;
      }
      if (status === 403) {
        toast.error("You are not allowed to view this report.");
        return true;
      }
      if (status >= 500) {
        toast.error("Server error. Please try again.");
        return true;
      }
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          fallbackMessage
      );
      return false;
    },
    [navigate]
  );

  const loadEmployees = useCallback(async () => {
    setLoadingEmployees(true);
    try {
      const res = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/department/Sales`,
        getAuthConfig()
      );
      const list =
        (Array.isArray(res?.data) && res.data) ||
        (Array.isArray(res?.data?.data) && res.data.data) ||
        (Array.isArray(res?.data?.employees) && res.data.employees) ||
        [];
      const options = list
        .map((emp) => ({
          label: `${emp?.employeeName || emp?.name || "Unknown"} (${emp?.empId || "-"})`,
          value: emp?.empId || "",
        }))
        .filter((x) => x.value);
      setEmployeeOptions(options);
    } catch (error) {
      setEmployeeOptions([]);
      handleApiError(error, "Failed to load employees");
    } finally {
      setLoadingEmployees(false);
    }
  }, [handleApiError]);

  const fetchReport = useCallback(
    async (page = pagination.page, limit = pagination.limit) => {
      setLoading(true);
      try {
        const params = {
          page,
          limit,
          sortBy: "createdAt",
          sortOrder: "desc",
        };
        if (filters.search.trim()) params.search = filters.search.trim();
        if (filters.status) params.status = filters.status;
        if (filters.createdByType) params.createdByType = filters.createdByType;
        if (filters.addedByEmpId) params.addedByEmpId = filters.addedByEmpId;

        const res = await axios.get(
          `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/reports/add-customer`,
          {
            ...getAuthConfig(),
            params,
          }
        );

        const payload = res?.data;
        const data = payload?.data || {};
        const p = data?.pagination || {};
        setRows(Array.isArray(data?.rows) ? data.rows : []);
        setReportMeta({
          reportName: data?.reportName || "Add Customer Report",
          generatedBy: data?.generatedBy || null,
          module: payload?.module || null,
        });
        setPagination({
          page: p.page ?? page,
          limit: p.limit ?? limit,
          total: p.total ?? 0,
          totalPages: Math.max(1, p.totalPages ?? 1),
        });
      } catch (error) {
        setRows([]);
        handleApiError(error, "Failed to load add customer report");
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.limit, pagination.page, handleApiError]
  );

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    fetchReport(1, pagination.limit);
  }, [fetchReport, pagination.limit]);

  const onFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      status: "",
      createdByType: "",
      addedByEmpId: "",
    });
  };

  const openDetails = async (row) => {
    const shipperId = row?.shipperId;
    const directApi = toAbsoluteApiUrl(row?.actions?.viewDetailsApi);
    if (!shipperId && !directApi) return;
    setDetailsLoading(true);
    setDetailsModal({ open: true, payload: null, row });
    try {
      const detailsUrl = directApi || `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/${shipperId}`;
      const res = await axios.get(detailsUrl, getAuthConfig());
      setDetailsModal({ open: true, payload: res?.data || null, row });
    } catch (error) {
      setDetailsModal({ open: false, payload: null, row: null });
      handleApiError(error, "Failed to load shipper details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const totalLabel = useMemo(
    () => `Page ${pagination.page} of ${pagination.totalPages} · ${pagination.total} total`,
    [pagination.page, pagination.total, pagination.totalPages]
  );
  const allLoadAddedDateTimes = useMemo(
    () => extractLoadAddedDateTimes(detailsModal.payload, detailsModal.row?.metrics),
    [detailsModal.payload, detailsModal.row?.metrics]
  );
  const detailData = useMemo(() => toDetailsObject(detailsModal.payload), [detailsModal.payload]);

  return (
    <div className="p-4 md:p-6 font-poppins max-w-[1920px] mx-auto w-full">
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={filters.search}
              onChange={(e) => onFilterChange("search", e.target.value)}
              placeholder="Search by company, email, phone, userId, mcDot"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange("status", e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm min-w-[140px]"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="blacklist">Blacklist</option>
          </select>
          <select
            value={filters.createdByType}
            onChange={(e) => onFilterChange("createdByType", e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm min-w-[160px]"
          >
            <option value="">Created By Type</option>
            <option value="employee">Employee</option>
            <option value="self_registered">Self Registered</option>
          </select>
          <select
            value={filters.addedByEmpId}
            onChange={(e) => onFilterChange("addedByEmpId", e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm min-w-[190px]"
            disabled={loadingEmployees}
          >
            <option value="">Added By Employee</option>
            {employeeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => fetchReport(1, pagination.limit)}
            className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold"
          >
            Apply
          </button>
          <button
            onClick={clearFilters}
            className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-gray-700 font-semibold">
            {reportMeta?.reportName || "Add Customer Report"}
          </p>
          {reportMeta?.module?.label ? (
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
              {reportMeta.module.label}
            </span>
          ) : null}
          {reportMeta?.module?.isActive === true ? (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              Active
            </span>
          ) : null}
        </div>
        <p className="text-xs text-gray-500 mt-1">{totalLabel}</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                {[
                  "Company Name",
                  "MC/DOT",
                  "Email",
                  "Phone",
                  "Added By",
                  "Total DOs",
                  "Total RR",
                  "Created Date",
                  "Action",
                ].map((h) => (
                  <th key={h} className="text-left px-3 py-3 text-xs uppercase text-gray-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={`${row.shipperId || idx}`} className="border-b border-gray-100">
                  <td className="px-3 py-2.5 text-sm">{row.companyName || "-"}</td>
                  <td className="px-3 py-2.5 text-sm">{row.mcDotNo || "-"}</td>
                  <td className="px-3 py-2.5 text-sm">{row.email || "-"}</td>
                  <td className="px-3 py-2.5 text-sm">{row.phoneNo || "-"}</td>
                  <td className="px-3 py-2.5 text-sm">{row?.addedBy?.employeeName || "-"}</td>
                  <td className="px-3 py-2.5 text-sm">{row?.metrics?.totalDOs ?? "-"}</td>
                  <td className="px-3 py-2.5 text-sm">{row?.metrics?.totalLoads ?? "-"}</td>
                  <td className="px-3 py-2.5 text-sm">{formatDateTime(row.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => openDetails(row)}
                      disabled={!row?.shipperId}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-md bg-indigo-600 text-white disabled:opacity-50"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {row?.actions?.viewLabel || "View"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && rows.length === 0 && (
            <div className="p-10 text-center text-sm text-gray-500">No records found.</div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between">
        <div className="text-sm text-gray-700">{totalLabel}</div>
        <div className="flex items-center gap-2">
          <select
            value={pagination.limit}
            onChange={(e) => setPagination((p) => ({ ...p, limit: Number(e.target.value) }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            {LIMIT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt} / page
              </option>
            ))}
          </select>
          <button
            onClick={() => fetchReport(Math.max(1, pagination.page - 1), pagination.limit)}
            disabled={pagination.page <= 1 || loading}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() =>
              fetchReport(
                Math.min(pagination.totalPages, pagination.page + 1),
                pagination.limit
              )
            }
            disabled={pagination.page >= pagination.totalPages || loading}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 z-40 bg-black/20 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {detailsModal.open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setDetailsModal({ open: false, payload: null, row: null })}
        >
          <div
            className="w-full max-w-4xl max-h-[85vh] overflow-auto bg-white rounded-xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800">Shipper Details</h2>
              <button
                className="text-sm px-3 py-1.5 border border-gray-300 rounded-md"
                onClick={() => setDetailsModal({ open: false, payload: null, row: null })}
              >
                Close
              </button>
            </div>
            {detailsLoading ? (
              <div className="text-sm text-gray-600">Loading details...</div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-sm font-semibold text-gray-800 mb-2">Customer Details</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Company:</span>{" "}
                      <span className="text-gray-800">
                        {readValue(detailData?.compName, detailData?.companyName, detailsModal.row?.companyName)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">MC/DOT:</span>{" "}
                      <span className="text-gray-800">
                        {readValue(detailData?.mc_dot, detailData?.mcDotNo, detailsModal.row?.mcDotNo)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Email:</span>{" "}
                      <span className="text-gray-800">
                        {readValue(detailData?.email, detailsModal.row?.email)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Phone:</span>{" "}
                      <span className="text-gray-800">
                        {readValue(detailData?.phoneNo, detailData?.phone, detailsModal.row?.phoneNo)}
                      </span>
                    </div>
                    {/* <div>
                      <span className="text-gray-500">Status:</span>{" "}
                      <span className="text-gray-800">
                        {readValue(detailData?.status, detailsModal.row?.status)}
                      </span>
                    </div> */}  
                    <div>
                      <span className="text-gray-500">Added Date:</span>{" "}
                      <span className="text-gray-800">
                        {formatDateTime(readValue(detailData?.createdAt, detailsModal.row?.createdAt))}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Total DOs:</span>{" "}
                      <span className="text-gray-800">
                        {readValue(
                          detailData?.metrics?.totalDOs,
                          detailsModal.row?.metrics?.totalDOs
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Total RR:</span>{" "}
                      <span className="text-gray-800">
                        {readValue(
                          detailData?.metrics?.totalLoads,
                          detailsModal.row?.metrics?.totalLoads
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-sm font-semibold text-gray-800 mb-2">All RR Added Date/Time</p>
                  {allLoadAddedDateTimes.length > 0 ? (
                    <ul className="space-y-1 text-sm text-gray-700">
                      {allLoadAddedDateTimes.map((dt, idx) => (
                        <li key={`${dt}-${idx}`}>{dt}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No load added date/time found in details response.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
