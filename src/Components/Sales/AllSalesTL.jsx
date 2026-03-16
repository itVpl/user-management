import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, User, Mail, ChevronDown, ChevronRight, Target } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import { format } from 'date-fns';

const formatDate = (d) => {
  if (!d) return '—';
  try {
    const s = typeof d === 'string' ? d.slice(0, 10) : d;
    return format(new Date(s), 'dd MMM yyyy');
  } catch {
    return '—';
  }
};

const getTargetSummary = (target) => {
  if (!target) return null;
  const tier = target.tier;
  const status = target.status || '—';
  const weekStart = target.weekStartDate ? formatDate(target.weekStartDate) : null;
  const weekEnd = target.weekEndDate ? formatDate(target.weekEndDate) : null;
  const weekRange = weekStart && weekEnd ? `${weekStart} – ${weekEnd}` : null;
  const parts = [`Tier ${tier}`, status];
  if (weekRange) parts.push(weekRange);
  const t1 = target.tier1Targets;
  if (t1) {
    parts.push(`Lead ${t1.followUpCompleted ?? 0}/${t1.followUpPerDay ?? 0}`);
    parts.push(`Calls ${t1.callsCompleted ?? 0}/${t1.callsPerDay ?? 0}`);
    parts.push(`M ${t1.meetingsCompleted ?? 0}/${t1.meetingsPerWeek ?? 0}`);
  }
  const t2 = target.tier2Targets;
  if (t2) {
    parts.push(`Active ${t2.activeCustomersCompleted ?? 0}/${t2.activeCustomersMin ?? 0}-${t2.activeCustomersMax ?? 0}`);
    parts.push(`DO ${t2.doAddedCompleted ?? 0}/${t2.doAddedMin ?? 0}-${t2.doAddedMax ?? 0}`);
  }
  const t3 = target.tier3Targets;
  if (t3) {
    parts.push(`Leads ${t3.leadsClosedCompleted ?? 0}/${t3.leadsToCloseTarget ?? 0}`);
  }
  return parts.join(' · ');
};

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function AllSalesTL() {
  const [tlEmployees, setTlEmployees] = useState([]);
  const [totalTls, setTotalTls] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTl, setExpandedTl] = useState(null);

  const fetchTlEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/inhouseUser/tl-employees');
      const data = res?.data?.data ?? res?.data;
      const list = data?.tlEmployees ?? [];
      setTlEmployees(Array.isArray(list) ? list : []);
      setTotalTls(data?.totalTls ?? list?.length ?? 0);
    } catch (err) {
      console.error('Fetch TL employees error:', err);
      alertify.error(err?.response?.data?.message || err?.message || 'Failed to load TL employees');
      setTlEmployees([]);
      setTotalTls(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTlEmployees();
  }, []);

  const searchLower = (searchTerm || '').trim().toLowerCase();
  const filteredTlEmployees = searchLower
    ? tlEmployees.filter((item) => {
        const tl = item.tl || {};
        const tlMatch =
          (tl.employeeName || '').toLowerCase().includes(searchLower) ||
          (tl.empId || '').toLowerCase().includes(searchLower) ||
          (tl.email || '').toLowerCase().includes(searchLower) ||
          (tl.department || '').toLowerCase().includes(searchLower) ||
          (tl.designation || '').toLowerCase().includes(searchLower);
        const empMatch = (item.employees || []).some(
          (e) =>
            (e.employeeName || '').toLowerCase().includes(searchLower) ||
            (e.empId || '').toLowerCase().includes(searchLower) ||
            (e.email || '').toLowerCase().includes(searchLower) ||
            (e.designation || '').toLowerCase().includes(searchLower)
        );
        return tlMatch || empMatch;
      })
    : tlEmployees;

  const totalEmployeesCount = tlEmployees.reduce((sum, item) => sum + (item.employeesCount ?? (item.employees?.length ?? 0)), 0);

  const toggleExpand = (idx) => {
    setExpandedTl((prev) => (prev === idx ? null : idx));
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Top Section - same layout as DeliveryOrder */}
      <div className="flex flex-col gap-6 mb-6 border border-gray-200 rounded-xl p-6 bg-white">
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-gray-700 font-bold text-2xl">
                {totalTls}
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold text-lg">
                Total TLs
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-gray-700 font-bold text-2xl">
                {totalEmployeesCount}
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold text-lg">
                Total Employees
              </div>
            </div>
          </div>
        </div>

        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search by TL or employee name, ID, email, department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-6 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-colors text-gray-600 placeholder-gray-400"
          />
          <Search className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
        </div>
      </div>

      {/* Content - cards per TL, same card style as DeliveryOrder */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : filteredTlEmployees.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {searchTerm ? 'No TL or employee matches your search' : 'No TL employees data'}
            </p>
          </div>
        ) : (
          filteredTlEmployees.map((item, idx) => {
            const tl = item.tl || {};
            const employees = item.employees || [];
            const count = item.employeesCount ?? employees.length;
            const isExpanded = expandedTl === idx;

            return (
              <div
                key={tl.empId || idx}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(idx)}
                  className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 text-left hover:bg-gray-50/80 transition-colors border-b border-gray-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{tl.employeeName || '—'}</div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mt-0.5">
                        <span>{tl.empId || '—'}</span>
                        <span>·</span>
                        <span>{tl.designation || '—'}</span>
                        <span>·</span>
                        <span>{tl.department || '—'}</span>
                        {tl.email && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Mail size={12} /> {tl.email}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">
                      {count} employee{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-6 pt-0 bg-gray-50/50 space-y-4">
                    {tl.target && (
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                        <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm mb-2">
                          <Target size={16} /> TL Target
                        </div>
                        <p className="text-sm text-gray-700">{getTargetSummary(tl.target) || '—'}</p>
                        {tl.target.weekStartDate && tl.target.weekEndDate && (
                          <p className="text-xs text-gray-500 mt-1">
                            Week: {formatDate(tl.target.weekStartDate)} – {formatDate(tl.target.weekEndDate)}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left py-3 px-4 text-gray-600 font-semibold text-sm">Employee Name</th>
                            <th className="text-left py-3 px-4 text-gray-600 font-semibold text-sm">Emp ID</th>
                            <th className="text-left py-3 px-4 text-gray-600 font-semibold text-sm">Email</th>
                            <th className="text-left py-3 px-4 text-gray-600 font-semibold text-sm">Department</th>
                            <th className="text-left py-3 px-4 text-gray-600 font-semibold text-sm">Designation</th>
                            <th className="text-left py-3 px-4 text-gray-600 font-semibold text-sm">Target</th>
                          </tr>
                        </thead>
                        <tbody>
                          {employees.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">
                                No employees under this TL
                              </td>
                            </tr>
                          ) : (
                            employees.map((emp) => {
                              const summary = getTargetSummary(emp.target);
                              return (
                                <tr key={emp._id || emp.empId} className="border-b border-gray-100 hover:bg-gray-50/80">
                                  <td className="py-3 px-4 font-medium text-gray-800">{emp.employeeName || '—'}</td>
                                  <td className="py-3 px-4 text-gray-700">{emp.empId || '—'}</td>
                                  <td className="py-3 px-4 text-gray-700 max-w-[200px] truncate">{emp.email || '—'}</td>
                                  <td className="py-3 px-4 text-gray-700">{emp.department || '—'}</td>
                                  <td className="py-3 px-4 text-gray-700">{emp.designation || '—'}</td>
                                  <td className="py-3 px-4 text-gray-700 text-sm max-w-[280px]">
                                    {summary ? (
                                      <span className="inline-block text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded border border-gray-200">
                                        {summary}
                                      </span>
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
