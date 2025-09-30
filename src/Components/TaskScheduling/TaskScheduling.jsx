import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  FaPlus, FaCalendar, FaClock,
  FaExclamationTriangle, FaEdit, FaTrash, FaSearch,
  FaCalendarAlt, FaFlag
} from 'react-icons/fa';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

export default function TaskScheduling() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters + search
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // stats
  const [statistics, setStatistics] = useState({
    total: 0, pending: 0, completed: 0, cancelled: 0, overdue: 0, today: 0
  });

  // modals
  const [showCreateModal, setShowCreateModal] = useState(false);



  // delete confirm modal (custom – no window.confirm)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  // create/update button loaders -> prevents multiple submits
  const [createLoading, setCreateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // form state
  const [formData, setFormData] = useState({
    taskTitle: '',
    taskDescription: '',
    scheduledDateTime: '',
    priority: 'select'  // default "Select"
  });

  // inline validation errors (no browser popups)
  const [errors, setErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // refs for “entire text field clickable”
  const titleInputRef = useRef(null);
  const dateTimeInputRef = useRef(null);

  useEffect(() => {
    fetchTasks();
    fetchStatistics();
  }, []);

  // Reset page when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, priorityFilter]);

  const authHeaders = () => {
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    if (!token) {
      alertify.error('Authentication required. Please login again.');
      return null;
    }
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const headers = authHeaders();
      if (!headers) return;

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/tasks`, { headers });
      if (response.data?.success) {
        setTasks(response.data.tasks || []);
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
      alertify.error(`Error: ${err.response?.data?.message || err.message}`);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const headers = authHeaders();
      if (!headers) return;

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/tasks/stats`, { headers });
      if (response.data?.success) {
        setStatistics(response.data.stats || { total: 0, pending: 0, completed: 0, cancelled: 0, overdue: 0, today: 0 });
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  // ===== VALIDATION =====
  const validateForm = (data, forEdit = false) => {
    const newErrors = {};
    const now = new Date();

    // Task Title
    if (!data.taskTitle?.trim()) {
      newErrors.taskTitle = 'Please enter the task title.';
    }

    // Scheduled Date & Time (must be present or future)
    if (!data.scheduledDateTime) {
      newErrors.scheduledDateTime = 'The selected date should be greater than the present date.';
    } else {
      const selected = new Date(data.scheduledDateTime);
      // treat "present" as >= current minute
      if (selected.getTime() <= now.getTime()) {
        newErrors.scheduledDateTime = 'The selected date should be greater than the present date.';
      }
    }

    // Priority
    if (!data.priority || data.priority === 'select') {
      newErrors.priority = 'Please select the priority.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ===== CREATE =====
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (createLoading) return; // one task at a time
    setSubmitAttempted(true);

    if (!validateForm(formData)) return;

    try {
      setCreateLoading(true);
      const headers = authHeaders();
      if (!headers) return;

      const response = await axios.post(`${API_CONFIG.BASE_URL}/api/v1/tasks/create`, formData, { headers });

      if (response.data?.success) {
        alertify.success('✅ Task created successfully!');
        setShowCreateModal(false);
        setFormData({ taskTitle: '', taskDescription: '', scheduledDateTime: '', priority: 'select' });
        setErrors({});
        setSubmitAttempted(false);
        await fetchTasks();
        await fetchStatistics();
      }
    } catch (error) {
      console.error('Error creating task:', error);
      alertify.error(`Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setCreateLoading(false);
    }
  };


  // --- helpers: dynamic min (always future) ---
  const getMinDateTimeLocal = (offsetMs = 60 * 1000) => {
    return new Date(Date.now() + offsetMs).toISOString().slice(0, 16); // +1 min
  };

  const [minLocal, setMinLocal] = useState(getMinDateTimeLocal());

  // jab Create Modal open ho tab dynamic min ko refresh karte raho (e.g. 30s):
  useEffect(() => {
    if (!showCreateModal) return;
    setMinLocal(getMinDateTimeLocal());
    const id = setInterval(() => setMinLocal(getMinDateTimeLocal()), 30_000);
    return () => clearInterval(id);
  }, [showCreateModal]);




  // ===== DELETE (custom modal – normal popup) =====
  const openDeleteModal = (taskId) => {
    setTaskToDelete(taskId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      setDeleteLoading(true);
      const headers = authHeaders();
      if (!headers) return;

      const response = await axios.delete(`${API_CONFIG.BASE_URL}/api/v1/tasks/${taskToDelete}`, { headers });
      if (response.data?.success) {
        alertify.success('✅ Task deleted successfully!');
        setShowDeleteModal(false);
        setTaskToDelete(null);
        await fetchTasks();
        await fetchStatistics();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alertify.error(`Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };



  // ===== HELPERS =====
  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString('en-IN'),
      time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };
  };

  const isOverdue = (scheduledDateTime, status) => {
    if (status === 'completed' || status === 'cancelled') return false;
    return new Date(scheduledDateTime) < new Date();
    // purely visual; backend should still be the source of truth for "overdue" status if you have one
  };

  const getPriorityColor = (priority) => {
    switch ((priority || '').toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-800 border border-green-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'high': return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'urgent': return 'bg-red-100 text-red-800 border border-red-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // ===== FILTER + SORT (latest on top) =====
  const filteredTasks = useMemo(() => {
    const list = tasks.filter((task) => {
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return task.taskTitle?.toLowerCase().includes(q) || task.taskDescription?.toLowerCase().includes(q);
    });

    // latest on top (prefer createdAt if available else scheduledDateTime)
    return list.sort((a, b) => {
      const aKey = a.createdAt || a.scheduledDateTime;
      const bKey = b.createdAt || b.scheduledDateTime;
      return new Date(bKey) - new Date(aKey); // DESC
    });
  }, [tasks, searchTerm, priorityFilter]);

  // pagination
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTasks = filteredTasks.slice(startIndex, endIndex);

  // now -> min value for datetime-local
  const minDateTimeLocal = new Date(Date.now() + 60 * 1000).toISOString().slice(0, 16); // +1 min buffer

  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* Top Stats + Filters */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          {[
            { key: 'all', label: 'Total Tasks', color: 'blue', icon: <FaCalendarAlt className="text-blue-600" size={20} />, value: statistics.total },
            { key: 'low', label: 'Low Priority', color: 'green', icon: <FaFlag className="text-green-600" size={20} />, value: tasks.filter(t => t.priority === 'low').length },
            { key: 'medium', label: 'Medium Priority', color: 'blue', icon: <FaFlag className="text-blue-600" size={20} />, value: tasks.filter(t => t.priority === 'medium').length },
            { key: 'high', label: 'High Priority', color: 'orange', icon: <FaFlag className="text-orange-600" size={20} />, value: tasks.filter(t => t.priority === 'high').length },
            { key: 'urgent', label: 'Urgent Priority', color: 'red', icon: <FaFlag className="text-red-600" size={20} />, value: tasks.filter(t => t.priority === 'urgent').length },
          ].map((c) => (
            <div
              key={c.key}
              className={`bg-white rounded-2xl shadow-xl p-4 border border-gray-100 cursor-pointer transition-all duration-200 hover:shadow-2xl hover:scale-105 ${priorityFilter === c.key ? `ring-2 ring-${c.color}-500 bg-${c.color}-50` : ''
                }`}
              onClick={() => setPriorityFilter(c.key)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 bg-${c.color}-100 rounded-xl flex items-center justify-center`}>
                  {c.icon}
                </div>
                <div>
                  <p className="text-sm text-gray-600">{c.label}</p>
                  <p className={`text-xl font-bold ${c.color === 'green' ? 'text-green-600' :
                    c.color === 'orange' ? 'text-orange-600' :
                      c.color === 'red' ? 'text-red-600' :
                        'text-blue-600'
                    }`}>{c.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => {
              setFormData({ taskTitle: '', taskDescription: '', scheduledDateTime: '', priority: 'select' });
              setErrors({});
              setSubmitAttempted(false);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold"
          >
            <FaPlus size={16} />
            Create Task
          </button>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">Loading tasks...</p>
            <p className="text-gray-400 text-sm">Please wait while we fetch the data</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                  <tr>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Task Title</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Description</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Scheduled Date</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Time</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Priority</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTasks.map((task, index) => (
                    <tr key={task._id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-700">{task.taskTitle}</span>
                          {isOverdue(task.scheduledDateTime, task.status) && (
                            <FaExclamationTriangle className="text-red-500" size={14} title="Overdue" />
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-sm text-gray-600 max-w-xs truncate block">
                          {task.taskDescription}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1">
                          <FaCalendar className="text-gray-400" size={12} />
                          <span className="text-sm text-gray-700">{formatDateTime(task.scheduledDateTime).date}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1">
                          <FaClock className="text-gray-400" size={12} />
                          <span className="text-sm text-gray-700">{formatDateTime(task.scheduledDateTime).time}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-3 py-1 rounded-full font-bold ${getPriorityColor(task.priority)}`}>
                          <FaFlag className="inline mr-1" size={10} />
                          {task.priority}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => openDeleteModal(task._id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Delete task"
                          >
                            <FaTrash size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredTasks.length === 0 && (
              <div className="text-center py-12">
                <FaCalendarAlt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  {searchTerm || priorityFilter !== 'all'
                    ? 'No tasks found matching your criteria'
                    : 'No tasks found'}
                </p>
                <p className="text-gray-400 text-sm">
                  {searchTerm || priorityFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria'
                    : 'Create your first task to get started'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {filteredTasks.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredTasks.length)} of {filteredTasks.length} tasks
            {(searchTerm || priorityFilter !== 'all') && ` (filtered from ${tasks.length} total)`}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-2 border rounded-lg transition-colors ${currentPage === page ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300 hover:bg-gray-50'
                  }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ===== Create Task Modal ===== */}
      {showCreateModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <FaPlus className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Create New Task</h2>
                    <p className="text-blue-100">Schedule a task with automatic email reminders</p>
                  </div>
                </div>
                <button
                  onClick={() => !createLoading && setShowCreateModal(false)}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                  disabled={createLoading}
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-6">
              {/* Task Title (clickable container focuses input) */}
              <div
                className="cursor-text"
                onClick={() => titleInputRef.current?.focus()}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title *
                </label>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={formData.taskTitle}
                  onChange={(e) => setFormData({ ...formData, taskTitle: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${submitAttempted && errors.taskTitle ? 'border-red-300' : 'border-gray-200'
                    }`}
                  placeholder="Enter task title"
                  disabled={createLoading}
                />
                {submitAttempted && errors.taskTitle && (
                  <p className="mt-1 text-sm text-red-600">{errors.taskTitle}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Description
                </label>
                <textarea
                  value={formData.taskDescription}
                  onChange={(e) => setFormData({ ...formData, taskDescription: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Enter task description"
                  disabled={createLoading}
                />
              </div>

              {/* Scheduled Date & Time (full container clickable) */}
              
              <div
                className="cursor-text"
                onClick={() => {
                  dateTimeInputRef.current?.focus();
                  // Mobile/desktop picker ko force-open (supported browsers me)
                  if (dateTimeInputRef.current?.showPicker) {
                    try { dateTimeInputRef.current.showPicker(); } catch { }
                  }
                }}
                onKeyDown={(e) => {
                  // Enter/Space se bhi open ho jaye (accessibility)
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    dateTimeInputRef.current?.focus();
                    if (dateTimeInputRef.current?.showPicker) {
                      try { dateTimeInputRef.current.showPicker(); } catch { }
                    }
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label="Open date and time picker"
              >
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="scheduledDateTime">
                  Scheduled Date & Time *
                </label>
                <input
                  id="scheduledDateTime"
                  ref={dateTimeInputRef}
                  type="datetime-local"
                  value={formData.scheduledDateTime}
                  min={minLocal}
                  onFocus={() => setMinLocal(getMinDateTimeLocal())}
                  onChange={(e) => {
                    const val = e.target.value;
                    // hard guard: if user ne past pick kiya, auto-bump to min
                    const selected = new Date(val).getTime();
                    const minTs = new Date(minLocal).getTime();

                    if (!val) {
                      setFormData({ ...formData, scheduledDateTime: '' });
                      setErrors((prev) => ({ ...prev, scheduledDateTime: 'The selected date should be greater than the present date.' }));
                      return;
                    }

                    if (isNaN(selected) || selected < minTs) {
                      // auto-correct to min and show inline error once
                      setFormData({ ...formData, scheduledDateTime: minLocal });
                      setErrors((prev) => ({ ...prev, scheduledDateTime: 'Please choose a future date & time.' }));
                    } else {
                      setFormData({ ...formData, scheduledDateTime: val });
                      // clear error if any
                      setErrors((prev) => {
                        const { scheduledDateTime, ...rest } = prev || {};
                        return rest;
                      });
                    }
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${submitAttempted && errors.scheduledDateTime ? 'border-red-300' : 'border-gray-200'
                    }`}
                  disabled={createLoading}
                />
                {submitAttempted && errors.scheduledDateTime && (
                  <p className="mt-1 text-sm text-red-600">{errors.scheduledDateTime}</p>
                )}
              </div>


              {/* Priority with * and default "Select" */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority *
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${submitAttempted && errors.priority ? 'border-red-300' : 'border-gray-200'
                    }`}
                  disabled={createLoading}
                >
                  <option value="select">Select</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                {submitAttempted && errors.priority && (
                  <p className="mt-1 text-sm text-red-600">{errors.priority}</p>
                )}
              </div>

              <div className="flex gap-4 justify-end pt-6">
                <button
                  type="button"
                  onClick={() => !createLoading && setShowCreateModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
                  disabled={createLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold disabled:opacity-60 flex items-center gap-2"
                >
                  {createLoading && (
                    <span className="inline-block h-4 w-4 border-2 border-white border-b-transparent rounded-full animate-spin" />
                  )}
                  {createLoading ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* ===== Delete Confirmation Modal (normal popup) ===== */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">Delete Task</h3>
              <p className="text-sm text-gray-500 mt-1">
                Are you sure you want to delete this task? This action cannot be undone.
              </p>
            </div>
            <div className="p-5 flex justify-end gap-3">
              <button
                onClick={() => !deleteLoading && setShowDeleteModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 flex items-center gap-2"
              >
                {deleteLoading && (
                  <span className="inline-block h-4 w-4 border-2 border-white border-b-transparent rounded-full animate-spin" />
                )}
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
