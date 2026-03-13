import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Search,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Package
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import API_CONFIG from '../../config/api.js';

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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

const toYMD = (d) => (d ? format(d, 'yyyy-MM-dd') : '');

export default function SoftwareSellRecord() {
  const [activeTab, setActiveTab] = useState('my'); // 'my' | 'all'
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [range, setRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(),
    key: 'selection'
  });
  const [empIdFilter, setEmpIdFilter] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const [addForm, setAddForm] = useState({
    customerName: '',
    notes: '',
    soldAt: toYMD(new Date())
  });
  const [addErrors, setAddErrors] = useState({});
  const [addSubmitting, setAddSubmitting] = useState(false);

  const applyPreset = (label) => {
    const [s, e] = presets[label];
    setRange({ startDate: s, endDate: e, key: 'selection' });
    setShowPresetMenu(false);
  };

  const fetchMyLogs = async () => {
    const startDate = toYMD(range.startDate);
    const endDate = toYMD(range.endDate);
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await api.get('/api/v1/sales-executive-target/shipper-software-sells/my', { params });
      const data = res?.data?.data ?? res?.data;
      const list = data?.logs ?? data?.list ?? (Array.isArray(data) ? data : []);
      setLogs(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Fetch my software sells error:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllLogs = async () => {
    const startDate = toYMD(range.startDate);
    const endDate = toYMD(range.endDate);
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (empIdFilter.trim()) params.empId = empIdFilter.trim();
      const res = await api.get('/api/v1/sales-executive-target/shipper-software-sells', { params });
      const data = res?.data?.data ?? res?.data;
      const list = data?.list ?? data?.logs ?? (Array.isArray(data) ? data : []);
      setLogs(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Fetch all software sells error:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'my') fetchMyLogs();
    else fetchAllLogs();
  }, [activeTab, range.startDate, range.endDate, empIdFilter]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddErrors({});
    setAddSubmitting(true);
    try {
      const payload = {
        customerName: (addForm.customerName || '').trim() || undefined,
        notes: (addForm.notes || '').trim() || undefined
      };
      if (addForm.soldAt) {
        payload.soldAt = addForm.soldAt.includes('T') ? addForm.soldAt : `${addForm.soldAt}T00:00:00.000Z`;
      }
      await api.post('/api/v1/sales-executive-target/log-shipper-software-sell', payload);
      setShowAddModal(false);
      setAddForm({ customerName: '', notes: '', soldAt: toYMD(new Date()) });
      if (activeTab === 'my') fetchMyLogs();
      else fetchAllLogs();
    } catch (err) {
      setAddErrors({ submit: err?.response?.data?.message || err?.message || 'Failed to log sale' });
    } finally {
      setAddSubmitting(false);
    }
  };

  const getSoldAt = (item) => {
    const d = item?.soldAt ?? item?.createdAt;
    if (!d) return '—';
    if (typeof d === 'string' && d.length >= 10) return d.slice(0, 10);
    return d;
  };

  const getEmployeeName = (item) => item?.employeeName ?? item?.empId ?? item?.user?.employeeName ?? item?.user?.empId ?? '—';

  const filteredLogs = logs.filter((item) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    const customer = (item.customerName || '').toLowerCase();
    const notes = (item.notes || '').toLowerCase();
    const emp = getEmployeeName(item).toLowerCase();
    return customer.includes(q) || notes.includes(q) || emp.includes(q);
  });

  const totalLogs = filteredLogs.length;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayLogs = filteredLogs.filter((item) => getSoldAt(item) === todayStr).length;

  const itemsPerPage = 9;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const currentLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab, logs.length]);

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="flex flex-col gap-6 mb-6 border border-gray-200 rounded-xl p-6 bg-white">
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-gray-700 font-bold text-2xl">
                {totalLogs}
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold">
                Total Records
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-gray-700 font-bold text-2xl">
                {todayLogs}
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold">
                Today
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1 w-full xl:w-[350px]">
            <button
              type="button"
              onClick={() => {
                setAddForm({ customerName: '', notes: '', soldAt: toYMD(new Date()) });
                setAddErrors({});
                setShowAddModal(true);
              }}
              className="flex items-center justify-between gap-4 px-6 h-[40px] bg-blue-600 rounded-lg text-white font-semibold hover:bg-blue-700 transition w-full"
            >
              <span>Log Sale</span>
              <PlusCircle size={20} />
            </button>
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => setShowPresetMenu((v) => !v)}
                className="w-full text-left px-4 h-[45px] border border-gray-200 rounded-lg bg-white flex items-center justify-between text-gray-700 font-medium hover:border-gray-300 transition-colors"
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
                  <button type="button" onClick={() => setShowPresetMenu(false)} className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-600">Close</button>
                  <div className="my-1 border-t border-gray-100" />
                  {Object.keys(presets).map((lbl) => (
                    <button key={lbl} type="button" onClick={() => applyPreset(lbl)} className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700">{lbl}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs: My Records | All Records */}
        <div className="flex items-center gap-2 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('my')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'my' ? 'bg-blue-50 text-blue-700 border border-b-0 border-gray-200 -mb-px' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            My Records
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'all' ? 'bg-blue-50 text-blue-700 border border-b-0 border-gray-200 -mb-px' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            All Records
          </button>
        </div>

        {activeTab === 'all' && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Employee ID:</label>
            <input
              type="text"
              placeholder="Filter by empId (optional)"
              value={empIdFilter}
              onChange={(e) => setEmpIdFilter(e.target.value)}
              className="w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        )}

        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search records"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-6 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-colors text-gray-600 placeholder-gray-400"
          />
          <Search className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
        </div>
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
                    {activeTab === 'all' && (
                      <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Employee</th>
                    )}
                    <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Sold At</th>
                    <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Customer Name</th>
                    <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Notes</th>
                    <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLogs.map((item) => (
                    <tr key={item._id || item.soldAt + item.customerName} className="border-b border-gray-100 hover:bg-gray-50">
                      {activeTab === 'all' && (
                        <td className="py-4 px-4 text-sm text-gray-800">{getEmployeeName(item)}</td>
                      )}
                      <td className="py-4 px-4 text-sm text-gray-700">{getSoldAt(item)}</td>
                      <td className="py-4 px-4 text-sm font-medium text-gray-800">{item.customerName || '—'}</td>
                      <td className="py-4 px-4 text-sm text-gray-600 max-w-xs truncate">{item.notes || '—'}</td>
                      <td className="py-4 px-4">
                        <button type="button" onClick={() => { setSelectedLog(item); setShowViewModal(true); }} className="px-3 py-1 rounded border border-blue-500 text-blue-600 text-sm font-medium hover:bg-blue-50">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredLogs.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">{searchTerm ? 'No records found matching your search' : 'No software sell records in this date range'}</p>
                <p className="text-gray-400 text-sm">{searchTerm ? 'Try adjusting your search' : 'Log your first sale to get started'}</p>
              </div>
            )}
          </>
        )}
      </div>

      {!loading && filteredLogs.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl border border-gray-200 p-4">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} records
          </div>
          <div className="flex gap-1 items-center">
            <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium">
              <ChevronLeft size={18} /> Previous
            </button>
            <div className="flex items-center gap-1 mx-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} type="button" onClick={() => setCurrentPage(p)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium ${currentPage === p ? 'bg-white border border-gray-800 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}>{p}</button>
              ))}
            </div>
            <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium">
              Next <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Log Sale Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Log Software Sale</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer / Company Name</label>
                <input
                  type="text"
                  value={addForm.customerName}
                  onChange={(e) => setAddForm((f) => ({ ...f, customerName: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. ABC Transport"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={addForm.notes}
                  onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. Annual subscription sold"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sold At (optional)</label>
                <input
                  type="date"
                  value={addForm.soldAt}
                  onChange={(e) => setAddForm((f) => ({ ...f, soldAt: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              {addErrors.submit && <p className="text-red-600 text-sm">{addErrors.submit}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={addSubmitting} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {addSubmitting ? 'Saving...' : 'Log Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => { setShowViewModal(false); setSelectedLog(null); }}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Sale Details</h3>
              <button type="button" onClick={() => { setShowViewModal(false); setSelectedLog(null); }} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              {activeTab === 'all' && (
                <p><span className="font-medium text-gray-600">Employee:</span> {getEmployeeName(selectedLog)}</p>
              )}
              <p><span className="font-medium text-gray-600">Sold At:</span> {getSoldAt(selectedLog)}</p>
              <p><span className="font-medium text-gray-600">Customer:</span> {selectedLog.customerName || '—'}</p>
              <p><span className="font-medium text-gray-600">Notes:</span> {selectedLog.notes || '—'}</p>
            </div>
            <div className="mt-6">
              <button type="button" onClick={() => { setShowViewModal(false); setSelectedLog(null); }} className="w-full px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
