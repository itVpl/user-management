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
  const itemsPerPage = 5;


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
      <div className="mb-6 bg-white rounded-2xl border border-gray-200 p-4 flex flex-col gap-4">
        <div className="flex flex-wrap gap-3 justify-between">
          {[
            {
              key: 'all',
              label: 'Total Tasks',
              icon: FaCalendarAlt,
              iconBg: 'bg-blue-50',
              iconColor: 'text-blue-600',
              activeClass: 'ring-2 ring-blue-500 bg-blue-50',
              value: statistics.total,
            },
            {
              key: 'low',
              label: 'Low Priority',
              icon: FaFlag,
              iconBg: 'bg-green-50',
              iconColor: 'text-green-600',
              activeClass: 'ring-2 ring-green-500 bg-green-50',
              value: tasks.filter(t => t.priority === 'low').length,
            },
            {
              key: 'medium',
              label: 'Medium Priority',
              icon: FaFlag,
              iconBg: 'bg-blue-50',
              iconColor: 'text-blue-600',
              activeClass: 'ring-2 ring-blue-500 bg-blue-50',
              value: tasks.filter(t => t.priority === 'medium').length,
            },
            {
              key: 'high',
              label: 'High Priority',
              icon: FaExclamationTriangle,
              iconBg: 'bg-orange-50',
              iconColor: 'text-orange-500',
              activeClass: 'ring-2 ring-orange-500 bg-orange-50',
              value: tasks.filter(t => t.priority === 'high').length,
            },
            {
              key: 'urgent',
              label: 'Urgent Priority',
              icon: FaClock,
              iconBg: 'bg-red-50',
              iconColor: 'text-red-500',
              activeClass: 'ring-2 ring-red-500 bg-red-50',
              value: tasks.filter(t => t.priority === 'urgent').length,
            },
          ].map((c) => {
            const Icon = c.icon;
            const isActive = priorityFilter === c.key;
            return (
              <div
                key={c.key}
                className={`flex-1 min-w-[180px] max-w-[230px] rounded-2xl px-4 py-3 border border-gray-200 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                  isActive ? c.activeClass : 'bg-white'
                }`}
                onClick={() => setPriorityFilter(c.key)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-medium text-gray-600">{c.label}</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">{c.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${c.iconBg}`}>
                    <Icon className={c.iconColor} size={18} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>


        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setFormData({ taskTitle: '', taskDescription: '', scheduledDateTime: '', priority: 'select' });
              setErrors({});
              setSubmitAttempted(false);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-lg font-semibold transition-colors duration-200"
          >
            
            <span>Create Task</span>
            <FaPlus size={14} />
          </button>
        </div>
      </div>


      {/* Tasks Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">Loading tasks...</p>
            <p className="text-gray-400 text-sm">Please wait while we fetch the data</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto p-4">
              <table className="min-w-full text-sm border-separate border-spacing-y-4">
                <thead>
                  <tr>
                    <th className="px-6 py-3 border-y border-l border-gray-200 rounded-l-2xl bg-gray-50 text-sm font-semibold text-gray-700 uppercase tracking-wide text-left">
                      Task Title
                    </th>
                    <th className="px-4 py-3 border-y border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700 uppercase tracking-wide text-left">
                      Description
                    </th>
                    <th className="px-6 py-3 border-y border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700 uppercase tracking-wide text-left">
                      Scheduled Date
                    </th>
                    <th className="px-6 py-3 border-y border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700 uppercase tracking-wide text-left">
                      Time
                    </th>
                    <th className="px-6 py-3 border-y border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700 uppercase tracking-wide text-left">
                      Priority
                    </th>
                    <th className="pl-6 pr-18 py-3 border-y border-r border-gray-200 rounded-r-2xl bg-gray-50 text-sm font-semibold text-gray-700 uppercase tracking-wide text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentTasks.map((task) => (
                    <tr key={task._id} className="bg-white hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 border-y border-l border-gray-200 rounded-l-2xl align-middle text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{task.taskTitle}</span>
                          {isOverdue(task.scheduledDateTime, task.status) && (
                            <FaExclamationTriangle className="text-red-500" size={14} title="Overdue" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 border-y border-gray-200 align-middle text-left">
                        <span className="font-semibold text-gray-900 truncate block">
                          {task.taskDescription}
                        </span>
                      </td>
                      <td className="px-6 py-3 border-y border-gray-200 align-middle text-left">
                        <div className="flex items-center gap-1">
                          {/* <FaCalendar className="text-gray-400" size={12} /> */}
                          <span className="font-semibold text-gray-900">{formatDateTime(task.scheduledDateTime).date}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 border-y border-gray-200 align-middle text-left">
                        <div className="flex items-center gap-1">
                          {/* <FaClock className="text-gray-400" size={12} /> */}
                          <span className="font-semibold text-gray-900">{formatDateTime(task.scheduledDateTime).time}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 border-y border-gray-200 align-middle">
                        <span className={`font-semibold text-gray-900 text-base px-3 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                          {/* <FaFlag className="inline mr-1" size={10} /> */}
                          {task.priority}
                        </span>
                      </td>
                      <td className="pl-6 pr-10 py-3 border-y border-r border-gray-200 text-right rounded-r-2xl align-middle">
                        <div className="inline-flex items-center justify-end gap-3">
                         <button
  onClick={() => openDeleteModal(task._id)}
  className="text-red-600 border border-red-600 px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ease-in-out hover:bg-red-600 hover:text-white hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1 cursor-pointer"
  title="Delete task"
>
  Delete Task
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
        <div className="mt-4 flex justify-between items-center px-4 border border-gray-200 p-2 rounded-xl bg-white">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredTasks.length)} of {filteredTasks.length} tasks
            {(searchTerm || priorityFilter !== 'all') && ` (filtered from ${tasks.length} total)`}
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-medium text-gray-600 hover:text-gray-900"
            >
              Previous
            </button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'border border-gray-900 text-gray-900 bg-white'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-medium text-gray-600 hover:text-gray-900"
            >
              Next
            </button>
          </div>
        </div>
      )}


      {/* ===== Create Task Modal ===== */}
      {showCreateModal && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4"
          // onClick={() => !createLoading && setShowCreateModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
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
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold disabled:opacity-60 flex items-center gap-2"
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
          onClick={() => !deleteLoading && setShowDeleteModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md overflow-hidden border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
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



