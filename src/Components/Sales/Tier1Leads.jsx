import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Search,
  Calendar,
  X,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const toYMD = (d) => (d ? format(d, 'yyyy-MM-dd') : null);

export default function Tier1Leads() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [range, setRange] = useState({
    startDate: addDays(new Date(), -6),
    endDate: new Date(),
    key: 'selection'
  });
  const [accessError, setAccessError] = useState(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const presets = {
    'Today': [new Date(), new Date()],
    'Yesterday': [addDays(new Date(), -1), addDays(new Date(), -1)],
    'Last 7 Days': [addDays(new Date(), -6), new Date()],
    'Last 30 Days': [addDays(new Date(), -29), new Date()],
    'This Month': [
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    ],
    'Last Month': [
      new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
      new Date(new Date().getFullYear(), new Date().getMonth(), 0)
    ]
  };

  const applyPreset = (label) => {
    const [s, e] = presets[label];
    setRange({ startDate: s, endDate: e, key: 'selection' });
    setShowPresetMenu(false);
  };

  const fetchSummary = async () => {
    const start = range.startDate ? toYMD(range.startDate) : null;
    const end = range.endDate ? toYMD(range.endDate) : null;
    if (!start || !end) {
      setEmployees([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setAccessError(null);
    try {
      const res = await api.get('/api/v1/sales-executive-target/tier1-shippers-summary', {
        params: { startDate: start, endDate: end }
      });
      const data = res?.data?.data ?? res?.data;
      const list = data?.tier1Employees ?? [];
      setEmployees(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Fetch tier1 shippers summary error:', err);
      if (err?.response?.status === 403) {
        const msg = err?.response?.data?.message || 'Access denied to Tier 1 shippers summary';
        setAccessError(msg);
        alertify.error(msg);
      }
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [range.startDate, range.endDate]);

  const searchLower = (searchTerm || '').trim().toLowerCase();
  const filteredEmployees = searchLower
    ? employees.filter(
        (e) =>
          (e.employeeName || '').toLowerCase().includes(searchLower) ||
          (e.empId || '').toLowerCase().includes(searchLower)
      )
    : employees;
  const totalShippersAdded = employees.reduce((sum, e) => sum + (e.shippersAddedCount ?? 0), 0);

  const openView = (emp) => {
    setSelectedEmployee(emp);
    setShowViewModal(true);
  };

  const fmtDate = (d) => {
    if (!d) return '—';
    try {
      const s = typeof d === 'string' ? d.slice(0, 10) : d;
      return format(new Date(s), 'MMM dd, yyyy');
    } catch {
      return d;
    }
  };

  const fmtDateTime = (d) => {
    if (!d) return '—';
    try {
      return format(new Date(d), 'MMM dd, yyyy HH:mm');
    } catch {
      return d;
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="flex flex-col gap-6 mb-6 border border-gray-200 rounded-xl p-6 bg-white">
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-gray-700 font-bold text-2xl">
                {employees.length}
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold text-lg">
                Tier 1 Employees
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-gray-700 font-bold text-2xl">
                {totalShippersAdded}
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold text-lg">
                Shippers Added
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1 w-full xl:w-[350px]">
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => setShowPresetMenu((v) => !v)}
                className="w-full text-left px-4 h-[45px] border border-gray-200 rounded-lg bg-white flex items-center justify-between text-gray-700 font-medium hover:border-gray-300 transition-colors cursor-pointer"
              >
                <span>
                  {range.startDate && range.endDate
                    ? `${format(range.startDate, 'MMM dd, yyyy')} - ${format(range.endDate, 'MMM dd, yyyy')}`
                    : 'Select Date Range'}
                </span>
                <span className="ml-3 text-gray-400">▼</span>
              </button>
              {showPresetMenu && (
                <div className="absolute z-50 mt-2 w-full rounded-lg border border-gray-100 bg-white shadow-lg py-1 right-0">
                  <button type="button" onClick={() => { setRange({ startDate: addDays(new Date(), -6), endDate: new Date(), key: 'selection' }); setShowPresetMenu(false); }} className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-600">Last 7 Days</button>
                  <div className="my-1 border-t border-gray-100" />
                  {Object.keys(presets).map((lbl) => (
                    <button key={lbl} type="button" onClick={() => applyPreset(lbl)} className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700">{lbl}</button>
                  ))}
                  <div className="my-1 border-t border-gray-100" />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by employee name or ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-colors text-gray-600 placeholder-gray-400"
            />
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          </div>
        </div>
        {accessError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {accessError}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white border-b border-gray-200">
                  <tr>
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Employee Name</th>
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Emp ID</th>
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Shippers Added</th>
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.empId || emp.employeeName} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4 font-medium text-gray-700">{emp.employeeName || '—'}</td>
                      <td className="py-4 px-4 font-medium text-gray-700">{emp.empId || '—'}</td>
                      <td className="py-4 px-4 font-medium text-gray-700">{emp.shippersAddedCount ?? 0}</td>
                      <td className="py-4 px-4">
                        <button type="button" onClick={() => openView(emp)} className="px-3 py-1 rounded-lg border border-blue-500 text-blue-500 text-base font-medium hover:bg-blue-500 hover:text-white transition-all duration-200 cursor-pointer">View Shippers</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredEmployees.length === 0 && !loading && (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">{accessError ? accessError : searchTerm ? 'No employees match your search' : 'Select a date range to load Tier 1 shippers summary'}</p>
                <p className="text-gray-400 text-sm">{!accessError && (searchTerm ? 'Try adjusting your search' : 'Data from tier1-shippers-summary API')}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* View Shippers Modal */}
      {showViewModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => { setShowViewModal(false); setSelectedEmployee(null); }}>
          <div className="bg-white rounded-2xl border border-gray-200 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 bg-blue-600 text-white rounded-t-2xl">
              <h3 className="text-lg font-semibold">Shippers — {selectedEmployee.employeeName || selectedEmployee.empId || '—'}</h3>
              <button type="button" onClick={() => { setShowViewModal(false); setSelectedEmployee(null); }} className="p-2 rounded-lg hover:bg-white/10 cursor-pointer text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-sm text-gray-600 mb-4">Shippers added in selected date range: <span className="font-semibold text-gray-800">{selectedEmployee.shippersAddedCount ?? 0}</span></p>
              {(selectedEmployee.shippers || []).length === 0 ? (
                <p className="text-sm text-gray-500">No shippers in this period.</p>
              ) : (
                <div className="space-y-4">
                  {(selectedEmployee.shippers || []).map((s) => (
                    <div key={s._id} className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-medium text-gray-800">{s.compName || '—'}</span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">{s.status || '—'}</span>
                        {s.mc_dot_no && <span className="text-xs text-gray-500">MC/DOT: {s.mc_dot_no}</span>}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="text-gray-400 shrink-0" size={14} />
                          <span className="text-gray-700 break-all">{s.email || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="text-gray-400 shrink-0" size={14} />
                          <span className="text-gray-700">{s.phoneNo || '—'}</span>
                        </div>
                        <div className="sm:col-span-2 flex items-center gap-2">
                          <MapPin className="text-gray-400 shrink-0" size={14} />
                          <span className="text-gray-700">{[s.compAdd, s.city, s.state, s.zipcode].filter(Boolean).join(', ') || '—'}</span>
                        </div>
                      </div>
                      {s.addedBy && (
                        <p className="text-xs text-gray-500 mt-2">Added by: {s.addedBy.employeeName || s.addedBy.empId || '—'}</p>
                      )}
                      {s.createdAt && (
                        <p className="text-xs text-gray-500">Created: {fmtDateTime(s.createdAt)}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-6 flex justify-end">
                <button type="button" onClick={() => { setShowViewModal(false); setSelectedEmployee(null); }} className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
