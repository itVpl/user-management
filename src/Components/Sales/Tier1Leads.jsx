import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Search, Calendar, RefreshCw } from 'lucide-react';
import Tier1LeadsModals from './Tier1LeadsModals.jsx';
import { format } from 'date-fns';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const getToken = () =>
  sessionStorage.getItem('token') ||
  localStorage.getItem('token') ||
  sessionStorage.getItem('authToken') ||
  localStorage.getItem('authToken') ||
  null;

const ALLOWED_ACTION_EXT = ['PNG', 'JPG', 'JPEG', 'WEBP', 'PDF', 'DOC', 'DOCX'];
const fileOk = (f) =>
  !f || (ALLOWED_ACTION_EXT.includes((f?.name?.split('.').pop() || '').toUpperCase()) && f.size <= 10 * 1024 * 1024);

export default function Tier1Leads() {
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [accessError, setAccessError] = useState(null);

  const [viewModal, setViewModal] = useState({ open: false, customer: null, data: null, loading: false });
  const [followUpHistory, setFollowUpHistory] = useState({ data: null, loading: false });
  const [followUpModal, setFollowUpModal] = useState({ open: false, customer: null });
  const [followUpForm, setFollowUpForm] = useState({
    followUpMethod: 'call',
    followUpNotes: '',
    followUpDate: new Date().toISOString().slice(0, 16),
    nextFollowUpDate: ''
  });
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);
  const [followUpErrors, setFollowUpErrors] = useState({});
  const [prospectForm, setProspectForm] = useState({
    remark: '',
    prospectStatus: 'Warm',
    attachment: null
  });
  const [prospectSubmitting, setProspectSubmitting] = useState(false);
  const [prospectErrors, setProspectErrors] = useState({});

  const [actionOpen, setActionOpen] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionTarget, setActionTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionForm, setActionForm] = useState({ reason: '', remarks: '', attachment: null });
  const [actionErr, setActionErr] = useState({});

  const fetchLaneForwards = useCallback(async () => {
    setLoading(true);
    setAccessError(null);
    try {
      const res = await api.get('/api/v1/shipper_driver/tier3/lane-forwards');
      const data = res?.data?.data ?? res?.data;
      const list = data?.items ?? [];
      setItems(Array.isArray(list) ? list : []);
      setTotalCount(typeof data?.count === 'number' ? data.count : list.length);
    } catch (err) {
      console.error('Fetch tier3 lane-forwards error:', err);
      if (err?.response?.status === 403) {
        const msg = err?.response?.data?.message || 'Access denied to lane forwards';
        setAccessError(msg);
        alertify.error(msg);
      }
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLaneForwards();
  }, [fetchLaneForwards]);

  const searchLower = (searchTerm || '').trim().toLowerCase();
  const filteredItems = searchLower
    ? items.filter((row) => {
        const added = row.addedBy || {};
        const last = row.lastForward || {};
        const fb = last.forwardedBy || {};
        const rec = last.tier3Recipient || {};
        return (
          (row.compName || '').toLowerCase().includes(searchLower) ||
          (row.email || '').toLowerCase().includes(searchLower) ||
          (row.phoneNo || '').toLowerCase().includes(searchLower) ||
          (row.userId || '').toLowerCase().includes(searchLower) ||
          (added.employeeName || '').toLowerCase().includes(searchLower) ||
          (added.empId || '').toLowerCase().includes(searchLower) ||
          (fb.employeeName || '').toLowerCase().includes(searchLower) ||
          (rec.employeeName || '').toLowerCase().includes(searchLower) ||
          (last.note || '').toLowerCase().includes(searchLower)
        );
      })
    : items;

  const handleView = async (customer) => {
    const customerId = customer.userId || customer._id || customer.id;
    if (!customerId) {
      toast.error('Customer ID not found');
      return;
    }

    setViewModal({ open: true, customer, data: null, loading: true });
    setFollowUpHistory({ data: null, loading: true });

    try {
      const [customerResponse, followUpResponse] = await Promise.all([
        api.get(`/api/v1/shipper_driver/${customerId}`),
        api.get(`/api/v1/shipper_driver/${customerId}/follow-up-history`).catch((err) => {
          console.warn('Failed to fetch follow-up history:', err);
          return { data: { success: false } };
        })
      ]);

      if (customerResponse.data && customerResponse.data.success) {
        const customerData = customerResponse.data.data;
        setViewModal({ open: true, customer, data: customerData, loading: false });
        setItems((prev) =>
          prev.map((it) => (it.userId === customerId ? { ...it, status: customerData?.status ?? it.status } : it))
        );

        if (customerData.prospectDetails) {
          if (Array.isArray(customerData.prospectDetails) && customerData.prospectDetails.length > 0) {
            const latestProspect = customerData.prospectDetails.sort((a, b) => {
              const dateA = new Date(a.createdAt || a.prospectDate || 0);
              const dateB = new Date(b.createdAt || b.prospectDate || 0);
              return dateB - dateA;
            })[0];
            setProspectForm({
              remark: latestProspect.remark || '',
              prospectStatus: latestProspect.prospectStatus || 'Warm',
              attachment: null
            });
          } else if (customerData.prospectDetails.remark || customerData.prospectDetails.prospectStatus) {
            setProspectForm({
              remark: customerData.prospectDetails.remark || '',
              prospectStatus: customerData.prospectDetails.prospectStatus || 'Warm',
              attachment: null
            });
          } else {
            setProspectForm({ remark: '', prospectStatus: 'Warm', attachment: null });
          }
        } else {
          setProspectForm({ remark: '', prospectStatus: 'Warm', attachment: null });
        }
      } else {
        toast.error('Failed to fetch customer details');
        setViewModal({ open: false, customer: null, data: null, loading: false });
        setFollowUpHistory({ data: null, loading: false });
      }

      if (followUpResponse.data && followUpResponse.data.success) {
        setFollowUpHistory({ data: followUpResponse.data.data, loading: false });
      } else {
        setFollowUpHistory({ data: null, loading: false });
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch customer details');
      setViewModal({ open: false, customer: null, data: null, loading: false });
      setFollowUpHistory({ data: null, loading: false });
    }
  };

  const closeViewModal = () => {
    setViewModal({ open: false, customer: null, data: null, loading: false });
    setFollowUpHistory({ data: null, loading: false });
    setProspectForm({ remark: '', prospectStatus: 'Warm', attachment: null });
    setProspectErrors({});
  };

  const handleFollowUp = (customer) => {
    setFollowUpModal({ open: true, customer });
    setFollowUpForm({
      followUpMethod: 'call',
      followUpNotes: '',
      followUpDate: new Date().toISOString().slice(0, 16),
      nextFollowUpDate: ''
    });
    setFollowUpErrors({});
  };

  const closeFollowUpModal = () => {
    setFollowUpModal({ open: false, customer: null });
    setFollowUpForm({
      followUpMethod: 'call',
      followUpNotes: '',
      followUpDate: new Date().toISOString().slice(0, 16),
      nextFollowUpDate: ''
    });
    setFollowUpErrors({});
    setFollowUpSubmitting(false);
  };

  const handleFollowUpSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!followUpForm.followUpNotes.trim()) errors.followUpNotes = 'Follow-up notes are required';
    if (!followUpForm.followUpMethod) errors.followUpMethod = 'Follow-up method is required';
    if (Object.keys(errors).length > 0) {
      setFollowUpErrors(errors);
      return;
    }

    const customerId =
      followUpModal.customer?.userId || followUpModal.customer?._id || followUpModal.customer?.id;
    if (!customerId) {
      toast.error('Customer ID not found');
      return;
    }

    setFollowUpSubmitting(true);
    setFollowUpErrors({});

    try {
      const token = getToken();
      const payload = {
        followUpMethod: followUpForm.followUpMethod,
        followUpNotes: followUpForm.followUpNotes.trim(),
        followUpDate: followUpForm.followUpDate
          ? new Date(followUpForm.followUpDate).toISOString()
          : new Date().toISOString()
      };
      if (followUpForm.nextFollowUpDate) {
        payload.nextFollowUpDate = new Date(followUpForm.nextFollowUpDate).toISOString();
      }

      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/${customerId}/follow-up`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        }
      );

      if (response.data && response.data.success) {
        toast.success('Follow-up added successfully!');
        closeFollowUpModal();

        if (viewModal.open && viewModal.customer) {
          const currentCustomerId =
            viewModal.customer.userId || viewModal.customer._id || viewModal.customer.id;
          if (currentCustomerId === customerId) {
            try {
              const followUpResponse = await axios.get(
                `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/${customerId}/follow-up-history`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                  withCredentials: true
                }
              );
              if (followUpResponse.data && followUpResponse.data.success) {
                setFollowUpHistory({ data: followUpResponse.data.data, loading: false });
              }
            } catch (err) {
              console.warn('Failed to refresh follow-up history:', err);
            }
          }
        }
      } else {
        toast.error(response.data?.message || 'Failed to add follow-up');
      }
    } catch (error) {
      console.error('Error adding follow-up:', error);
      toast.error(error.response?.data?.message || 'Failed to add follow-up. Please try again.');
    } finally {
      setFollowUpSubmitting(false);
    }
  };

  const handleProspectInput = (e) => {
    const { name, value, files } = e.target;
    if (name === 'attachment') {
      const file = files?.[0] || null;
      setProspectForm((prev) => ({ ...prev, attachment: file }));
      if (file) {
        setProspectErrors((prev) => {
          const next = { ...prev };
          delete next.attachment;
          return next;
        });
      }
      return;
    }
    setProspectForm((prev) => ({ ...prev, [name]: value }));
    if (value) {
      setProspectErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleProspectSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!prospectForm.remark.trim()) errors.remark = 'Remark is required';
    if (!prospectForm.prospectStatus) errors.prospectStatus = 'Prospect status is required';
    if (Object.keys(errors).length > 0) {
      setProspectErrors(errors);
      return;
    }

    const customerId =
      viewModal.data?.userId ||
      viewModal.customer?.userId ||
      viewModal.data?._id ||
      viewModal.customer?._id ||
      viewModal.customer?.id;
    if (!customerId) {
      toast.error('Customer ID not found');
      return;
    }

    setProspectSubmitting(true);
    setProspectErrors({});

    try {
      const token = getToken();
      const formData = new FormData();
      formData.append(
        'prospectDetails',
        JSON.stringify({
          remark: prospectForm.remark.trim(),
          prospectStatus: prospectForm.prospectStatus
        })
      );
      if (prospectForm.attachment) {
        formData.append('prospectAttachments', prospectForm.attachment);
      }

      const response = await axios.patch(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/update/${customerId}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          withCredentials: true
        }
      );

      if (response.data && response.data.success) {
        toast.success('Prospect information updated successfully!');
        const refreshCustomerId = viewModal.data?.userId || customerId;
        try {
          const customerResponse = await axios.get(
            `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/${refreshCustomerId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
              withCredentials: true
            }
          );
          if (customerResponse.data && customerResponse.data.success) {
            setViewModal((prev) => ({ ...prev, data: customerResponse.data.data }));
          }
        } catch (err) {
          console.warn('Failed to refresh customer data:', err);
        }
        setProspectForm({ remark: '', prospectStatus: 'Warm', attachment: null });
      } else {
        toast.error(response.data?.message || 'Failed to update prospect information');
      }
    } catch (error) {
      console.error('Error updating prospect information:', error);
      toast.error(error.response?.data?.message || 'Failed to update prospect information. Please try again.');
    } finally {
      setProspectSubmitting(false);
    }
  };

  const openAction = (cust) => {
    const blacklisted = /blacklist/i.test(cust?.status);
    setActionTarget(cust);
    setActionType(blacklisted ? 'ok' : 'blacklist');
    setActionForm({ reason: '', remarks: '', attachment: null });
    setActionErr({});
    setActionOpen(true);
  };

  const closeAction = () => {
    setActionOpen(false);
    setActionTarget(null);
  };

  const onActionInput = (e) => {
    const { name, value, files } = e.target;
    if (name === 'attachment') {
      const f = files?.[0] || null;
      if (!fileOk(f)) setActionErr((p) => ({ ...p, attachment: 'Only image/PDF/DOC/DOCX up to 10MB' }));
      else {
        setActionErr((p) => {
          const c = { ...p };
          delete c.attachment;
          return c;
        });
        setActionForm((p) => ({ ...p, attachment: f }));
      }
      return;
    }
    setActionForm((p) => ({ ...p, [name]: value }));
  };

  const submitAction = async () => {
    const errs = {};
    if (!actionForm.reason.trim()) errs.reason = 'Required';
    if (!fileOk(actionForm.attachment)) errs.attachment = 'Invalid file';
    setActionErr(errs);
    if (Object.keys(errs).length) return;

    try {
      setActionLoading(true);
      const token = getToken();
      const axiosInstance = axios.create({
        baseURL: `${API_CONFIG.BASE_URL}`,
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });

      const userId = actionTarget?._id || actionTarget?.userId || actionTarget?.id;
      const fd = new FormData();

      if (actionType === 'blacklist') {
        fd.append('blacklistReason', actionForm.reason);
        if (actionForm.remarks) fd.append('blacklistRemarks', actionForm.remarks);
        if (actionForm.attachment) fd.append('attachments', actionForm.attachment);
        fd.append('userid', userId);
        await axiosInstance.put(`/api/v1/shipper_driver/blacklist/${userId}`, fd);
        toast.success('User blacklisted successfully.');
      } else {
        fd.append('removalReason', actionForm.reason);
        if (actionForm.remarks) fd.append('removalRemarks', actionForm.remarks);
        if (actionForm.attachment) fd.append('attachments', actionForm.attachment);
        await axiosInstance.put(`/api/v1/shipper_driver/blacklist/${userId}/remove`, fd);
        toast.success('Removed from blacklist successfully.');
      }

      await fetchLaneForwards();
      closeAction();
    } catch (err) {
      console.error('action failed', err);
      toast.error('Action failed. Please try again.');
    } finally {
      setActionLoading(false);
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
                {totalCount}
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold text-lg">
                Lane forwards
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
              <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-gray-700 font-bold text-2xl">
                {items.length}
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold text-lg">
                Shippers listed
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full xl:w-[200px] justify-center">
            <button
              type="button"
              onClick={() => fetchLaneForwards()}
              disabled={loading}
              className="w-full px-4 h-[45px] border border-gray-200 rounded-lg bg-white flex items-center justify-center gap-2 text-gray-700 font-medium hover:border-gray-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by company, email, phone, added by, forward note…"
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
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Company</th>
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Email</th>
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Phone</th>
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Added by</th>
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Forwards</th>
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Last forward</th>
                    <th className="text-left py-4 px-4 text-gray-600 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((row) => (
                    <tr key={row.userId || row.email} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4 font-medium text-gray-800">{row.compName || '—'}</td>
                      <td className="py-4 px-4 text-gray-700 max-w-[200px] truncate">{row.email || '—'}</td>
                      <td className="py-4 px-4 text-gray-700">{row.phoneNo || '—'}</td>
                      <td className="py-4 px-4 text-sm text-gray-700">
                        {row.addedBy?.employeeName || '—'}
                        {row.addedBy?.empId ? <span className="text-gray-500"> ({row.addedBy.empId})</span> : null}
                      </td>
                      <td className="py-4 px-4 text-gray-700">{row.forwardCountToMe ?? '—'}</td>
                      <td className="py-4 px-4 text-sm text-gray-600 max-w-[220px]">
                        {row.lastForward?.forwardedAt ? fmtDateTime(row.lastForward.forwardedAt) : '—'}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap align-middle">
                        <div className="flex items-center gap-2 flex-nowrap">
                          <button
                            type="button"
                            onClick={() => handleView(row)}
                            className="px-4 py-1 font-medium rounded-md transition-colors border border-blue-300 text-blue-700 hover:bg-blue-50"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFollowUp(row)}
                            className="px-4 py-1 font-medium rounded-md transition-colors border border-green-300 text-green-700 hover:bg-green-50 flex items-center gap-1"
                          >
                            Follow Up
                          </button>
                          <button
                            type="button"
                            onClick={() => openAction(row)}
                            className={`px-4 py-1 text-sm font-medium rounded-md transition-colors border ${
                              /blacklist/i.test(row?.status)
                                ? 'text-green-700 border-green-300 hover:bg-green-50'
                                : 'text-red-700 border-red-300 hover:bg-red-50'
                            }`}
                          >
                            {/blacklist/i.test(row?.status) ? 'Remove From Blacklist' : 'Blacklist'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredItems.length === 0 && !loading && (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  {accessError ? accessError : searchTerm ? 'No rows match your search' : 'No lane forwards yet'}
                </p>
                <p className="text-gray-400 text-sm">
                  {!accessError && (searchTerm ? 'Try adjusting your search' : 'Data from tier3/lane-forwards API')}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <Tier1LeadsModals
        viewModal={viewModal}
        followUpHistory={followUpHistory}
        closeViewModal={closeViewModal}
        prospectForm={prospectForm}
        prospectErrors={prospectErrors}
        prospectSubmitting={prospectSubmitting}
        handleProspectInput={handleProspectInput}
        handleProspectSubmit={handleProspectSubmit}
        followUpModal={followUpModal}
        followUpForm={followUpForm}
        setFollowUpForm={setFollowUpForm}
        followUpErrors={followUpErrors}
        followUpSubmitting={followUpSubmitting}
        closeFollowUpModal={closeFollowUpModal}
        handleFollowUpSubmit={handleFollowUpSubmit}
        actionOpen={actionOpen}
        actionType={actionType}
        actionTarget={actionTarget}
        actionForm={actionForm}
        actionErr={actionErr}
        closeAction={closeAction}
        onActionInput={onActionInput}
        submitAction={submitAction}
        actionLoading={actionLoading}
      />

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}
