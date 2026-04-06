import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Truck,
  User,
  X,
} from "lucide-react";
import API_CONFIG from "../../config/api";

const BASE = `${API_CONFIG.BASE_URL}/api/v1/trucker-assignments`;

function authHeaders() {
  const token =
    sessionStorage.getItem("token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("authToken") ||
    localStorage.getItem("authToken");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function formatDateShort(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "—";
  }
}

export default function TruckerAssign() {
  const [assignments, setAssignments] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [cmtEmployees, setCmtEmployees] = useState([]);
  const [empFilter, setEmpFilter] = useState("");
  const [employeeNameFilter, setEmployeeNameFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [windowStartFilter, setWindowStartFilter] = useState("");
  const [windowEndFilter, setWindowEndFilter] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [includeCancelled, setIncludeCancelled] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formEmpId, setFormEmpId] = useState("");
  const [formStart, setFormStart] = useState("");
  const [endMode, setEndMode] = useState("endDate");
  const [formEnd, setFormEnd] = useState("");
  const [formDuration, setFormDuration] = useState("7");
  const [formNotes, setFormNotes] = useState("");
  const [formTargetCount, setFormTargetCount] = useState("4");
  const [submitting, setSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [windowPreset, setWindowPreset] = useState("all");

  const [empDdOpen, setEmpDdOpen] = useState(false);
  const [empDdQuery, setEmpDdQuery] = useState("");
  const empDdRef = useRef(null);
  const empDdInputRef = useRef(null);

  const [filterEmpDdOpen, setFilterEmpDdOpen] = useState(false);
  const [filterEmpDdQuery, setFilterEmpDdQuery] = useState("");
  const filterEmpDdRef = useRef(null);
  const filterEmpDdInputRef = useRef(null);
  const filterEmpBtnRef = useRef(null);
  const [filterEmpMenuPos, setFilterEmpMenuPos] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const [presetDdOpen, setPresetDdOpen] = useState(false);
  const presetDdRef = useRef(null);
  const presetBtnRef = useRef(null);
  const [presetMenuPos, setPresetMenuPos] = useState({ top: 0, left: 0, width: 0 });

  const calcMenuPos = useCallback((el) => {
    const r = el.getBoundingClientRect();
    const width = r.width;
    const left = Math.min(r.left, Math.max(8, window.innerWidth - width - 8));
    const top = r.bottom + 8;
    return { top, left, width };
  }, []);

  useEffect(() => {
    function onDocClick(e) {
      if (empDdRef.current && !empDdRef.current.contains(e.target))
        setEmpDdOpen(false);
      if (filterEmpDdRef.current && !filterEmpDdRef.current.contains(e.target))
        setFilterEmpDdOpen(false);
      if (presetDdRef.current && !presetDdRef.current.contains(e.target))
        setPresetDdOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (empDdOpen && empDdInputRef.current) {
      empDdInputRef.current.focus();
    }
  }, [empDdOpen]);

  useEffect(() => {
    if (filterEmpDdOpen && filterEmpDdInputRef.current) {
      filterEmpDdInputRef.current.focus();
    }
  }, [filterEmpDdOpen]);

  useEffect(() => {
    if (!filterEmpDdOpen && !presetDdOpen) return;
    function update() {
      if (filterEmpDdOpen && filterEmpBtnRef.current) {
        setFilterEmpMenuPos(calcMenuPos(filterEmpBtnRef.current));
      }
      if (presetDdOpen && presetBtnRef.current) {
        setPresetMenuPos(calcMenuPos(presetBtnRef.current));
      }
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [calcMenuPos, filterEmpDdOpen, presetDdOpen]);

  const fetchAssignmentList = useCallback(async (params) => {
    setListLoading(true);
    try {
      const res = await axios.get(BASE + "/", {
        params,
        headers: authHeaders(),
        withCredentials: true,
      });
      if (res.data?.success) {
        setAssignments(res.data.assignments || res.data.data || []);
      } else {
        setAssignments([]);
      }
    } catch (e) {
      if (e.response?.status === 403) {
        toast.error(
          e.response?.data?.message ||
            "You do not have access to Trucker Assign.",
        );
      } else {
        toast.error(
          e.response?.data?.message ||
            e.message ||
            "Failed to load assignments",
        );
      }
      setAssignments([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadAssignments = useCallback(async () => {
    const hasStart = windowStartFilter.trim().length > 0;
    const hasEnd = windowEndFilter.trim().length > 0;
    if (hasStart !== hasEnd) {
      toast.error(
        "Window range needs both start and end dates (or clear both).",
      );
      return;
    }

    const params = {};
    if (empFilter.trim()) params.empId = empFilter.trim();
    if (employeeNameFilter.trim())
      params.employeeName = employeeNameFilter.trim();
    if (dateFilter.trim()) params.date = dateFilter.trim();
    if (hasStart && hasEnd) {
      params.windowStart = windowStartFilter.trim();
      params.windowEnd = windowEndFilter.trim();
    }
    if (activeOnly) params.activeOnly = "true";
    if (includeCancelled) params.includeCancelled = "true";
    await fetchAssignmentList(params);
  }, [
    empFilter,
    employeeNameFilter,
    dateFilter,
    windowStartFilter,
    windowEndFilter,
    activeOnly,
    includeCancelled,
    fetchAssignmentList,
  ]);

  const loadCmtEmployees = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE}/cmt-employees`, {
        headers: authHeaders(),
        withCredentials: true,
      });
      if (res.data?.success) {
        setCmtEmployees(res.data.employees || []);
      }
    } catch (e) {
      if (e.response?.status === 403) {
        toast.error(
          e.response?.data?.message ||
            "You do not have access to load CMT employees.",
        );
      }
    }
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    loadCmtEmployees();
  }, [loadCmtEmployees]);

  const openCreate = () => {
    setEditId(null);
    setFormEmpId("");
    setFormStart("");
    setFormEnd("");
    setFormDuration("7");
    setFormNotes("");
    setFormTargetCount("4");
    setEndMode("endDate");
    setCreateOpen(true);
  };

  const openEdit = async (id) => {
    try {
      const res = await axios.get(`${BASE}/${id}`, {
        headers: authHeaders(),
        withCredentials: true,
      });
      const a = res.data?.assignment;
      if (!a) {
        toast.error("Assignment not found");
        return;
      }
      setEditId(id);
      setFormEmpId(a.empId || a.employee?.empId || "");
      const start = a.startDate
        ? new Date(a.startDate).toISOString().slice(0, 10)
        : "";
      const end = a.endDate
        ? new Date(a.endDate).toISOString().slice(0, 16)
        : "";
      setFormStart(start);
      setFormEnd(end);
      setFormNotes(a.notes || "");
      setFormTargetCount(String(a.targetNewTruckerCount ?? 4));
      setEndMode("endDate");
      setCreateOpen(true);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load assignment");
    }
  };

  const buildPayload = () => {
    if (!formEmpId.trim()) {
      toast.error("Select a CMT employee");
      return null;
    }
    const targetN = parseInt(formTargetCount, 10);
    if (!Number.isFinite(targetN) || targetN < 1 || targetN > 999) {
      toast.error("Target new truckers must be between 1 and 999");
      return null;
    }
    if (!formStart) {
      toast.error("Enter start date");
      return null;
    }
    const body = {
      empId: formEmpId.trim(),
      targetNewTruckerCount: targetN,
      startDate:
        formStart.length <= 10
          ? `${formStart}T00:00:00.000Z`
          : new Date(formStart).toISOString(),
      notes: formNotes.trim() || undefined,
    };
    if (endMode === "duration") {
      const d = parseInt(formDuration, 10);
      if (!d || d < 1 || d > 3660) {
        toast.error("Duration must be between 1 and 3660 days");
        return null;
      }
      body.durationDays = d;
    } else {
      if (!formEnd) {
        toast.error("Enter end date/time");
        return null;
      }
      body.endDate =
        formEnd.length <= 10
          ? `${formEnd}T23:59:59.999Z`
          : new Date(formEnd).toISOString();
    }
    return body;
  };

  const handleSubmit = async () => {
    const body = buildPayload();
    if (!body) return;
    setSubmitting(true);
    try {
      if (editId) {
        const patch = { ...body };
        delete patch.empId;
        await axios.patch(`${BASE}/${editId}`, patch, {
          headers: authHeaders(),
          withCredentials: true,
        });
        toast.success("Assignment updated");
      } else {
        await axios.post(`${BASE}/`, body, {
          headers: authHeaders(),
          withCredentials: true,
        });
        toast.success("Assignment created");
      }
      setCreateOpen(false);
      loadAssignments();
    } catch (e) {
      if (e.response?.status === 403) {
        toast.error(e.response?.data?.message || "Access denied");
      } else {
        toast.error(e.response?.data?.message || e.message || "Save failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAssignment = async (id) => {
    if (
      !window.confirm(
        "Cancel this assignment? This target window will no longer apply.",
      )
    )
      return;
    try {
      await axios.delete(`${BASE}/${id}`, {
        headers: authHeaders(),
        withCredentials: true,
      });
      toast.success("Assignment cancelled");
      loadAssignments();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || "Cancel failed");
    }
  };

  const toYmd = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  useEffect(() => {
    const now = new Date();
    const startOfMonth = (year, monthIndex) => new Date(year, monthIndex, 1);
    const endOfMonth = (year, monthIndex) => new Date(year, monthIndex + 1, 0);

    if (windowPreset === "all") {
      setWindowStartFilter("");
      setWindowEndFilter("");
      setDateFilter("");
      return;
    }
    if (windowPreset === "custom") return;

    let s = null;
    let e = null;

    if (windowPreset === "today") {
      s = now;
      e = now;
    } else if (windowPreset === "yesterday") {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      s = d;
      e = d;
    } else if (windowPreset === "last7") {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      s = d;
      e = now;
    } else if (windowPreset === "thisMonth") {
      s = startOfMonth(now.getFullYear(), now.getMonth());
      e = endOfMonth(now.getFullYear(), now.getMonth());
    } else if (windowPreset === "lastMonth") {
      const m = now.getMonth() - 1;
      const y = m < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const mi = (m + 12) % 12;
      s = startOfMonth(y, mi);
      e = endOfMonth(y, mi);
    }

    if (s && e) {
      setWindowStartFilter(toYmd(s));
      setWindowEndFilter(toYmd(e));
      setDateFilter("");
    }
  }, [windowPreset]);

  const filteredAssignments = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return assignments;
    return assignments.filter((row) => {
      const emp =
        row.employeeName ||
        row.employee?.employeeName ||
        row.employee?.aliasName ||
        row.empId ||
        "";
      const blob = [
        emp,
        row.empId,
        row.employee?.empId,
        row.notes,
        row.targetNewTruckerCount,
        row.addedCount,
        row.isCancelled ? "cancelled" : "active",
      ]
        .filter((v) => v != null && v !== "")
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [assignments, searchTerm]);

  const exportAssignmentsCsv = useCallback(() => {
    const rows = filteredAssignments;
    const header = [
      "Emp ID",
      "Employee",
      "Target",
      "Progress",
      "Start",
      "End",
      "Status",
      "Notes",
    ];
    const esc = (v) => {
      const s = v == null ? "" : String(v);
      const needsQuotes = /[",\n]/.test(s);
      const out = s.replace(/"/g, '""');
      return needsQuotes ? `"${out}"` : out;
    };
    const lines = [
      header.map(esc).join(","),
      ...rows.map((r) => {
        const emp =
          r.employeeName ||
          r.employee?.employeeName ||
          r.employee?.aliasName ||
          r.empId ||
          "";
        const cancelled = r.isCancelled === true;
        const target = r.targetNewTruckerCount ?? "";
        const added = r.addedCount ?? 0;
        return [
          r.empId ?? r.employee?.empId ?? "",
          emp,
          target,
          `${added} / ${target || "—"}`,
          formatDateShort(r.startDate),
          formatDateShort(r.endDate),
          cancelled ? "Cancelled" : "Active",
          r.notes || "",
        ]
          .map(esc)
          .join(",");
      }),
    ].join("\n");

    const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trucker-assignments-${toYmd(new Date())}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [filteredAssignments]);

  const pagination = useMemo(() => {
    const total = filteredAssignments.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, total);
    return { total, totalPages, currentPage, startIndex, endIndex };
  }, [filteredAssignments.length, page]);

  const currentRows = useMemo(
    () => filteredAssignments.slice(pagination.startIndex, pagination.endIndex),
    [filteredAssignments, pagination.startIndex, pagination.endIndex],
  );

  useEffect(() => {
    setPage(1);
  }, [
    searchTerm,
    empFilter,
    employeeNameFilter,
    dateFilter,
    windowStartFilter,
    windowEndFilter,
    activeOnly,
    includeCancelled,
  ]);

  useEffect(() => {
    if (page !== pagination.currentPage) setPage(pagination.currentPage);
  }, [page, pagination.currentPage]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 md:px-6 py-4 md:py-6">
      <div className="w-full">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
          <div className="space-y-4">
            <div className="w-full sm:w-72 bg-white rounded-xl border border-gray-200 px-4 py-3">
              <div className="flex items-center gap-4">
                <div className="w-13 h-12 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-bold text-indigo-700 tabular-nums">
                    {pagination.total}
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-700 flex-1 text-center">
                  Total Assignments
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 min-w-0">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-0 focus:border-indigo-500 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={openCreate}
                  className="cursor-pointer shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" />
                  New assignment
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
          <div className="flex items-end justify-between gap-4">
            <div
              className="flex items-end gap-3 overflow-x-auto flex-nowrap w-full pb-1"
              onScroll={() => {
                if (filterEmpDdOpen) setFilterEmpDdOpen(false);
                if (presetDdOpen) setPresetDdOpen(false);
              }}
            >
              <div className="min-w-[140px]">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Emp ID
                </label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={empFilter}
                  onChange={(e) => setEmpFilter(e.target.value)}
                  placeholder="VPL003"
                />
              </div>

              <div ref={filterEmpDdRef} className="min-w-[240px] relative">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Employee name
                </label>
                <button
                  ref={filterEmpBtnRef}
                  type="button"
                  onClick={() =>
                    setFilterEmpDdOpen((v) => {
                      const next = !v;
                      if (next && filterEmpBtnRef.current) {
                        setFilterEmpMenuPos(calcMenuPos(filterEmpBtnRef.current));
                      }
                      return next;
                    })
                  }
                  aria-haspopup="listbox"
                  aria-expanded={filterEmpDdOpen}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="min-w-0 truncate text-gray-700">
                    {employeeNameFilter || "Select employee…"}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${filterEmpDdOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  style={{
                    top: filterEmpMenuPos.top,
                    left: filterEmpMenuPos.left,
                    width: filterEmpMenuPos.width || undefined,
                  }}
                  className={`fixed z-50 bg-white rounded-xl border border-gray-200 shadow-lg origin-top overflow-hidden transition-all duration-200 ${filterEmpDdOpen ? "opacity-100 translate-y-0 scale-100 max-h-[420px]" : "pointer-events-none opacity-0 -translate-y-1 scale-95 max-h-0"}`}
                  role="listbox"
                >
                  <div className="px-3 pt-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        ref={filterEmpDdInputRef}
                        type="text"
                        value={filterEmpDdQuery}
                        onChange={(e) => setFilterEmpDdQuery(e.target.value)}
                        placeholder="Search employee…"
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-0 focus:border-indigo-500 text-sm"
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-auto py-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEmployeeNameFilter("");
                        setFilterEmpDdOpen(false);
                        setFilterEmpDdQuery("");
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-gray-700"
                      role="option"
                      aria-selected={!employeeNameFilter}
                    >
                      All
                    </button>
                    {cmtEmployees
                      .filter((e) => {
                        const q = filterEmpDdQuery.trim().toLowerCase();
                        if (!q) return true;
                        const name = (
                          e.employeeName ||
                          e.aliasName ||
                          ""
                        ).toLowerCase();
                        const id = String(e.empId || "").toLowerCase();
                        return name.includes(q) || id.includes(q);
                      })
                      .map((e) => {
                        const id = e.empId;
                        const name = e.employeeName || e.aliasName || id;
                        const selected =
                          employeeNameFilter.trim().toLowerCase() ===
                          String(name).trim().toLowerCase();
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              setEmployeeNameFilter(name);
                              setFilterEmpDdOpen(false);
                              setFilterEmpDdQuery("");
                            }}
                            className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-50 ${selected ? "bg-indigo-50/60 text-indigo-700" : "text-gray-700"}`}
                            role="option"
                            aria-selected={selected}
                          >
                            <span className="truncate">{name}</span>
                            <span className="ml-2 text-xs text-gray-500 shrink-0">
                              {id}
                            </span>
                          </button>
                        );
                      })}
                    {cmtEmployees.length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        No employees
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div ref={presetDdRef} className="min-w-[220px] relative">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Date range
                </label>
                <button
                  ref={presetBtnRef}
                  type="button"
                  onClick={() =>
                    setPresetDdOpen((v) => {
                      const next = !v;
                      if (next && presetBtnRef.current) {
                        setPresetMenuPos(calcMenuPos(presetBtnRef.current));
                      }
                      return next;
                    })
                  }
                  aria-haspopup="listbox"
                  aria-expanded={presetDdOpen}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="min-w-0 truncate text-gray-700">
                    {windowPreset === "all"
                      ? "All"
                      : windowPreset === "today"
                        ? "Today"
                        : windowPreset === "yesterday"
                          ? "Yesterday"
                          : windowPreset === "last7"
                            ? "Last 7 days"
                            : windowPreset === "thisMonth"
                              ? "This month"
                              : windowPreset === "lastMonth"
                                ? "Last month"
                                : "Custom"}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${presetDdOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  style={{
                    top: presetMenuPos.top,
                    left: presetMenuPos.left,
                    width: presetMenuPos.width || undefined,
                  }}
                  className={`fixed z-50 bg-white rounded-xl border border-gray-200 shadow-lg origin-top overflow-hidden transition-all duration-200 ${presetDdOpen ? "opacity-100 translate-y-0 scale-100 max-h-72" : "pointer-events-none opacity-0 -translate-y-1 scale-95 max-h-0"}`}
                  role="listbox"
                >
                  {[
                    ["all", "All"],
                    ["today", "Today"],
                    ["yesterday", "Yesterday"],
                    ["last7", "Last 7 days"],
                    ["thisMonth", "This month"],
                    ["lastMonth", "Last month"],
                    ["custom", "Custom"],
                  ].map(([val, label]) => {
                    const selected = windowPreset === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setWindowPreset(val);
                          setPresetDdOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${selected ? "bg-indigo-50/60 text-indigo-700" : "text-gray-700"}`}
                        role="option"
                        aria-selected={selected}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {windowPreset === "custom" && (
                <>
                  <div className="min-w-[170px]">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Start
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="date"
                        className="w-full pl-10 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        value={windowStartFilter}
                        onChange={(e) => setWindowStartFilter(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="min-w-[170px]">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      End
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="date"
                        className="w-full pl-10 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        value={windowEndFilter}
                        onChange={(e) => setWindowEndFilter(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* <button
                type="button"
                onClick={() => loadAssignments()}
                className="cursor-pointer px-4 py-2.5 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Apply
              </button> */}
              <button
                type="button"
                onClick={() => {
                  setEmpFilter("");
                  setEmployeeNameFilter("");
                  setDateFilter("");
                  setWindowPreset("all");
                  setWindowStartFilter("");
                  setWindowEndFilter("");
                  setActiveOnly(false);
                  setIncludeCancelled(false);
                  void fetchAssignmentList({});
                }}
                className="cursor-pointer px-4 py-2.5 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Clear
              </button>
            </div>

           <button
  type="button"
  onClick={exportAssignmentsCsv}
  disabled={listLoading || pagination.total === 0}
  className="cursor-pointer shrink-0 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border-1 border-green-600 text-green-600 bg-white hover:bg-green-900 hover:text-white hover:border-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
>
  <Download className="w-4 h-4" />
  Export
</button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {listLoading ? (
            <div className="flex justify-center py-16 text-gray-500">
              <Loader2 className="w-10 h-10 animate-spin" />
            </div>
          ) : pagination.total === 0 ? (
            <div className="text-center py-16 text-gray-500">
              No assignments found
            </div>
          ) : (
            <div className="overflow-x-auto p-4">
              <table className="min-w-full text-base text-gray-700 border-separate border-spacing-y-3">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wide border-y border-l border-gray-200 rounded-l-xl whitespace-nowrap">
                      Employee
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wide border-y border-gray-200 whitespace-nowrap">
                      Target
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wide border-y border-gray-200 whitespace-nowrap">
                      Progress
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wide border-y border-gray-200 whitespace-nowrap">
                      Start
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wide border-y border-gray-200 whitespace-nowrap">
                      End
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wide border-y border-gray-200 whitespace-nowrap">
                      Notes
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 uppercase tracking-wide border-y border-gray-200 whitespace-nowrap">
                      Status
                    </th>
                    <th className="py-3 px-4 text-center text-sm font-medium text-gray-600 uppercase tracking-wide border-y border-r border-gray-200 rounded-r-xl whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentRows.map((row) => {
                    const id = row._id || row.id;
                    const emp =
                      row.employeeName ||
                      row.employee?.employeeName ||
                      row.employee?.aliasName ||
                      row.empId ||
                      "—";
                    const target = row.targetNewTruckerCount;
                    const added = row.addedCount ?? 0;
                    const cancelled = row.isCancelled === true;
                    return (
                      <tr key={id} className="group transition-colors">
                        <td className="py-4 px-4 border-y border-l border-gray-200 rounded-l-xl bg-white group-hover:bg-gray-50 align-middle font-medium text-gray-700">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* <User className="w-4 h-4 text-gray-400 shrink-0" /> */}
                            <span className="font-medium text-gray-700 truncate">{emp}</span>
                            <span className="font-medium text-xs text-gray-500 shrink-0">{row.empId}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 border-y border-gray-200 bg-white group-hover:bg-gray-50 align-middle tabular-nums whitespace-nowrap font-medium text-gray-700">
                          {target ?? "—"}
                        </td>
                        <td className="py-4 px-4 border-y border-gray-200 bg-white group-hover:bg-gray-50 align-middle tabular-nums whitespace-nowrap font-medium text-gray-700">
                          {added} / {target ?? "—"}
                        </td>
                        <td className="py-4 px-4 border-y border-gray-200 bg-white group-hover:bg-gray-50 align-middle whitespace-nowrap font-medium text-gray-700">
                          {formatDateShort(row.startDate)}
                        </td>
                        <td className="py-4 px-4 border-y border-gray-200 bg-white group-hover:bg-gray-50 align-middle whitespace-nowrap font-medium text-gray-700">
                          {formatDateShort(row.endDate)}
                        </td>
                        <td
                          className="py-4 px-4 border-y border-gray-200 bg-white group-hover:bg-gray-50 align-middle max-w-xs truncate font-medium text-gray-700"
                          title={row.notes}
                        >
                          {row.notes || "—"}
                        </td>
                        <td className="py-4 px-4 border-y border-gray-200 bg-white group-hover:bg-gray-50 align-middle whitespace-nowrap font-medium text-gray-700">
                          {cancelled ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-red-50 text-red-700 border border-red-200">
                              Cancelled
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 border-y border-r border-gray-200 rounded-r-xl bg-white group-hover:bg-gray-50 align-middle font-medium text-gray-700">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(id)}
                              disabled={cancelled}
                              className="cursor-pointer px-3 py-1 rounded-lg border border-indigo-600 text-indigo-600 hover:bg-indigo-800 hover:text-white disabled:opacity-40 disabled:border-gray-300 disabled:text-gray-400 transition-colors text-base font-medium"
                              title="Edit"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelAssignment(id)}
                              disabled={cancelled}
                              className="cursor-pointer px-3 py-1 rounded-lg border border-red-600 text-red-600 hover:bg-red-800 hover:text-white disabled:opacity-40 disabled:border-gray-300 disabled:text-gray-400 transition-colors text-base font-medium"
                              title="Cancel assignment"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!listLoading && pagination.total > 0 && (
          <div className="mt-6 bg-white rounded-2xl border border-gray-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              Showing <span>{pagination.startIndex + 1}</span> to{" "}
              <span>{pagination.endIndex}</span> of{" "}
              <span>{pagination.total}</span> assignments
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.currentPage <= 1}
                className="cursor-pointer flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-semibold text-gray-600 hover:text-gray-900"
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <span className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg border border-gray-900 text-gray-900 bg-white text-base font-semibold tabular-nums">
                {pagination.currentPage}
              </span>

              <button
                type="button"
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={pagination.currentPage >= pagination.totalPages}
                className="cursor-pointer flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-semibold text-gray-600 hover:text-gray-900"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col">
            <div className="px-6 py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                    <Truck className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl md:text-2xl font-bold leading-tight truncate">
                      {editId ? "Edit assignment" : "New assignment"}
                    </h2>
                    <p className="text-sm text-white/80">
                      Enter assignment information below
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="shrink-0 w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-6 space-y-5">
              <div className="bg-blue-50/70 rounded-2xl p-5 border border-blue-100">
                <div className="text-sm font-bold text-blue-700 mb-4">
                  Basic Information
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div ref={empDdRef} className="relative">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      CMT employee *
                    </label>
                    <button
                      type="button"
                      disabled={!!editId}
                      onClick={() => setEmpDdOpen((v) => !v)}
                      aria-haspopup="listbox"
                      aria-expanded={empDdOpen}
                      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-0 focus:border-indigo-500 transition-colors flex items-center justify-between gap-3 ${editId ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"}`}
                    >
                      <span className="min-w-0 truncate text-gray-700">
                        {formEmpId
                          ? (() => {
                              const found = cmtEmployees.find(
                                (x) => String(x.empId) === String(formEmpId),
                              );
                              const label =
                                found?.employeeName ||
                                found?.aliasName ||
                                found?.empId ||
                                formEmpId;
                              return `${label} (${found?.empId || formEmpId})`;
                            })()
                          : "Select employee…"}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${empDdOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {!editId && (
                      <div
                        className={`absolute z-50 mt-2 w-full bg-white rounded-xl border border-gray-200 shadow-lg origin-top overflow-hidden transition-all duration-200 ${empDdOpen ? "opacity-100 translate-y-0 scale-100 max-h-[420px]" : "pointer-events-none opacity-0 -translate-y-1 scale-95 max-h-0"}`}
                        role="listbox"
                      >
                        <div className="px-3 pt-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              ref={empDdInputRef}
                              type="text"
                              value={empDdQuery}
                              onChange={(e) => setEmpDdQuery(e.target.value)}
                              placeholder="Search employee…"
                              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-0 focus:border-indigo-500 text-sm"
                            />
                          </div>
                        </div>
                        <div className="max-h-64 overflow-auto py-2">
                          {cmtEmployees
                            .filter((e) => {
                              const q = empDdQuery.trim().toLowerCase();
                              if (!q) return true;
                              const name = (
                                e.employeeName ||
                                e.aliasName ||
                                ""
                              ).toLowerCase();
                              const id = String(e.empId || "").toLowerCase();
                              return name.includes(q) || id.includes(q);
                            })
                            .map((e) => {
                              const id = e.empId;
                              const label =
                                e.employeeName || e.aliasName || id;
                              const selected = String(formEmpId) === String(id);
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => {
                                    setFormEmpId(id);
                                    setEmpDdOpen(false);
                                    setEmpDdQuery("");
                                  }}
                                  className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-50 ${selected ? "bg-indigo-50/60 text-indigo-700" : "text-gray-700"}`}
                                  role="option"
                                  aria-selected={selected}
                                >
                                  <span className="truncate">{label}</span>
                                  <span className="ml-2 text-xs text-gray-500 shrink-0">
                                    {id}
                                  </span>
                                </button>
                              );
                            })}
                          {cmtEmployees.length === 0 && (
                            <div className="px-4 py-3 text-sm text-gray-500">
                              No employees
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Target new truckers *{" "}
                      <span className="text-gray-400 font-normal">(1–999)</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-0 focus:border-indigo-500"
                      value={formTargetCount}
                      onChange={(e) => setFormTargetCount(e.target.value)}
                      placeholder="e.g. 4"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      CMT users reach this by onboarding new carriers in the app;
                      carriers are not picked here.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50/70 rounded-2xl p-5 border border-emerald-100">
                <div className="text-sm font-bold text-emerald-700 mb-4">
                  Window Details
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      Start date *
                    </label>
                    <input
                      type="date"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-0 focus:border-indigo-500"
                      value={
                        formStart.length > 10
                          ? formStart.slice(0, 10)
                          : formStart
                      }
                      onChange={(e) => setFormStart(e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex flex-wrap items-center gap-4 mb-2 text-sm text-gray-700">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="endMode"
                          checked={endMode === "endDate"}
                          onChange={() => setEndMode("endDate")}
                        />
                        End date
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="endMode"
                          checked={endMode === "duration"}
                          onChange={() => setEndMode("duration")}
                        />
                        Duration (days)
                      </label>
                    </div>
                    {endMode === "endDate" ? (
                      <input
                        type="datetime-local"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-0 focus:border-indigo-500"
                        value={
                          formEnd.length > 16 ? formEnd.slice(0, 16) : formEnd
                        }
                        onChange={(e) => setFormEnd(e.target.value)}
                      />
                    ) : (
                      <input
                        type="number"
                        min={1}
                        max={3660}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-0 focus:border-indigo-500"
                        value={formDuration}
                        onChange={(e) => setFormDuration(e.target.value)}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-amber-50/70 rounded-2xl p-5 border border-amber-100">
                <div className="text-sm font-bold text-amber-700 mb-4">
                  Notes
                </div>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-0 focus:border-indigo-500 min-h-[96px]"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="px-6 py-5 border-t border-gray-100 flex justify-end gap-3 bg-white">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-5 py-2.5 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {editId ? "Save changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
