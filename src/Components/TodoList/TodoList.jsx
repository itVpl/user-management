import React, { useEffect, useState } from 'react';
import axios from 'axios';
import apiService from '../../services/apiService.js';
import { 
  PlusCircle, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Bell,
  FileText,
  Tag,
  AlertCircle
} from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import { format, parseISO, addMinutes } from 'date-fns';

// Searchable Dropdown Component
const SearchableDropdown = ({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  loading = false,
  className = "",
  searchPlaceholder = "Search...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
  }, [searchTerm, options]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedOption = options.find(option => option.value === value);
  const hasError = className.includes('border-red');

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className={`w-full px-2 py-2 border rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent cursor-pointer ${hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'} ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'
          }`}
        onClick={() => {
          if (!disabled && !loading) {
            setIsOpen(!isOpen);
          }
        }}
      >
        <div className="flex items-center justify-between">
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
            {loading ? 'Loading...' : selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && !disabled && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={index}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                  onClick={() => handleSelect(option)}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-gray-500 text-sm text-center">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Clickable Date Input Component
const ClickableDateInput = ({
  value,
  onChange,
  placeholder = 'mm/dd/yyyy',
  error,
  min,
  max,
  mode = 'date', // 'date' | 'time' | 'datetime'
  className = '',
}) => {
  const inputRef = React.useRef(null);

  const openPicker = () => {
    if (!inputRef.current) return;
    try { inputRef.current.showPicker?.(); } catch { }
    inputRef.current.focus();
    try { inputRef.current.click(); } catch { }
  };

  const type =
    mode === 'date' ? 'date' :
      mode === 'time' ? 'time' : 'datetime-local';

  return (
    <div
      className={`relative cursor-pointer ${className}`}
      role="button"
      tabIndex={0}
      onClick={openPicker}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); } }}
    >
      <input
        ref={inputRef}
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        placeholder={placeholder}
        className={`w-full px-4 py-3 border rounded-lg bg-white focus:outline-none focus:ring-2
        ${error ? 'border-red-500 focus:ring-red-200 bg-red-50' : 'border-gray-300 focus:ring-blue-500'}`}
      />
      <Calendar
        size={18}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      />
    </div>
  );
};

export default function TodoList() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'cancel' or 'delete'
  const [todoToAction, setTodoToAction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'completed', 'cancelled'
  const [priorityFilter, setPriorityFilter] = useState('all'); // 'all', 'Low', 'Medium', 'High'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'Work', 'Personal', etc.
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    cancelled: 0
  });

  const itemsPerPage = 20;

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledDate: '',
    scheduledTime: '',
    category: 'Work',
    priority: 'Medium'
  });

  const [errors, setErrors] = useState({});

  // Categories and Priorities
  const categories = ['Work', 'Personal', 'Meeting', 'Deadline', 'Follow-up', 'Other'];
  const priorities = ['Low', 'Medium', 'High'];

  // Error helper
  const errCls = (has) =>
    `w-full px-4 py-3 border rounded-lg focus:outline-none ${has ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-200 error-field'
      : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
    }`;

  // Focus first error
  const focusFirstError = () => {
    requestAnimationFrame(() => {
      const el = document.querySelector('.error-field') || document.querySelector('[aria-invalid="true"]');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        try {
          if (typeof el.focus === 'function') el.focus({ preventScroll: true });
          else {
            const input = el.querySelector('input, textarea, select, [tabindex]');
            input?.focus?.({ preventScroll: true });
          }
        } catch { }
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  };

  // Fetch todos
  const fetchTodos = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sortBy: 'scheduledDateTime',
        sortOrder: 'asc'
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (priorityFilter !== 'all') {
        params.append('priority', priorityFilter);
      }
      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/todos/my-todos?${params.toString()}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        setTodos(response.data.data.todos || []);
        setTotalPages(response.data.data.pagination?.totalPages || 1);
        setTotalItems(response.data.data.pagination?.totalItems || 0);
        setStatistics(response.data.data.statistics || {
          total: 0,
          pending: 0,
          completed: 0,
          cancelled: 0
        });
      }
    } catch (error) {
      console.error('Error fetching todos:', error);
      alertify.error('Failed to load todos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, [currentPage, statusFilter, priorityFilter, categoryFilter]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, priorityFilter, categoryFilter]);

  // Create todo
  const handleCreateTodo = async (e) => {
    e.preventDefault();
    
    // Validation
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.scheduledDate) {
      newErrors.scheduledDate = 'Scheduled date is required';
    }
    if (!formData.scheduledTime) {
      newErrors.scheduledTime = 'Scheduled time is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      focusFirstError();
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});
      
      // Combine date and time
      const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
      
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const user = JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || '{}');
      
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        category: formData.category,
        priority: formData.priority
      };

      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/todos/create`,
        payload,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        alertify.success('Todo created successfully');
        setShowAddForm(false);
        resetForm();
        fetchTodos();
      } else {
        alertify.error(response.data.message || 'Failed to create todo');
      }
    } catch (error) {
      console.error('Error creating todo:', error);
      alertify.error(error.response?.data?.message || 'Failed to create todo');
    } finally {
      setSubmitting(false);
    }
  };

  // Update todo
  const handleUpdateTodo = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.scheduledDate) {
      newErrors.scheduledDate = 'Scheduled date is required';
    }
    if (!formData.scheduledTime) {
      newErrors.scheduledTime = 'Scheduled time is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      focusFirstError();
      return;
    }

    try {
      setSubmitting(true);
      setErrors({});
      
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        category: formData.category,
        priority: formData.priority
      };

      const response = await axios.put(
        `${API_CONFIG.BASE_URL}/api/v1/todos/${editingTodo._id}`,
        payload,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        alertify.success('Todo updated successfully');
        setShowEditModal(false);
        setEditingTodo(null);
        resetForm();
        fetchTodos();
      } else {
        alertify.error(response.data.message || 'Failed to update todo');
      }
    } catch (error) {
      console.error('Error updating todo:', error);
      alertify.error(error.response?.data?.message || 'Failed to update todo');
    } finally {
      setSubmitting(false);
    }
  };

  // Mark as completed
  const handleCompleteTodo = async (todoId) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const response = await axios.patch(
        `${API_CONFIG.BASE_URL}/api/v1/todos/${todoId}/complete`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        alertify.success('Todo marked as completed');
        fetchTodos();
      } else {
        alertify.error(response.data.message || 'Failed to complete todo');
      }
    } catch (error) {
      console.error('Error completing todo:', error);
      alertify.error(error.response?.data?.message || 'Failed to complete todo');
    }
  };

  // Open cancel confirmation modal
  const openCancelConfirm = (todo) => {
    setTodoToAction(todo);
    setConfirmAction('cancel');
    setShowConfirmModal(true);
  };

  // Cancel todo
  const handleCancelTodo = async () => {
    if (!todoToAction) return;

    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const response = await axios.patch(
        `${API_CONFIG.BASE_URL}/api/v1/todos/${todoToAction._id}/cancel`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        alertify.success('Todo cancelled successfully');
        setShowConfirmModal(false);
        setTodoToAction(null);
        setConfirmAction(null);
        fetchTodos();
      } else {
        alertify.error(response.data.message || 'Failed to cancel todo');
      }
    } catch (error) {
      console.error('Error cancelling todo:', error);
      alertify.error(error.response?.data?.message || 'Failed to cancel todo');
    }
  };

  // Open delete confirmation modal
  const openDeleteConfirm = (todo) => {
    setTodoToAction(todo);
    setConfirmAction('delete');
    setShowConfirmModal(true);
  };

  // Delete todo
  const handleDeleteTodo = async () => {
    if (!todoToAction) return;

    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const response = await axios.delete(
        `${API_CONFIG.BASE_URL}/api/v1/todos/${todoToAction._id}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        alertify.success('Todo deleted successfully');
        setShowConfirmModal(false);
        setTodoToAction(null);
        setConfirmAction(null);
        fetchTodos();
      } else {
        alertify.error(response.data.message || 'Failed to delete todo');
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
      alertify.error(error.response?.data?.message || 'Failed to delete todo');
    }
  };

  // Open edit modal
  const handleEditClick = (todo) => {
    setEditingTodo(todo);
    setFormData({
      title: todo.title || '',
      description: todo.description || '',
      scheduledDate: todo.scheduledDate ? format(parseISO(todo.scheduledDate), 'yyyy-MM-dd') : '',
      scheduledTime: todo.scheduledTime || '',
      category: todo.category || 'Work',
      priority: todo.priority || 'Medium'
    });
    setErrors({});
    setShowEditModal(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      scheduledDate: '',
      scheduledTime: '',
      category: 'Work',
      priority: 'Medium'
    });
    setErrors({});
  };

  // Status color helper
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Priority color helper
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  // Format time
  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  // Pagination pages
  const getPageNumbers = (totalPagesToUse = totalPages) => {
    const maxVisible = 7;
    if (totalPagesToUse <= maxVisible) {
      return Array.from({ length: totalPagesToUse }, (_, i) => i + 1);
    }

    const pages = [];
    const halfVisible = Math.floor(maxVisible / 2);

    if (currentPage <= halfVisible + 1) {
      for (let i = 1; i <= maxVisible - 1; i++) {
        pages.push(i);
      }
      pages.push(totalPagesToUse);
    } else if (currentPage >= totalPagesToUse - halfVisible) {
      pages.push(1);
      for (let i = totalPagesToUse - (maxVisible - 2); i <= totalPagesToUse; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      for (let i = currentPage - halfVisible + 1; i <= currentPage + halfVisible - 1; i++) {
        pages.push(i);
      }
      pages.push(totalPagesToUse);
    }

    return pages;
  };

  // Filter todos based on search term (client-side filtering)
  const filteredTodos = todos.filter(todo => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    const title = (todo.title || '').toLowerCase();
    const description = (todo.description || '').toLowerCase();
    const category = (todo.category || '').toLowerCase();
    const status = (todo.status || '').toLowerCase();
    const priority = (todo.priority || '').toLowerCase();
    return title.includes(term) || description.includes(term) || category.includes(term) || status.includes(term) || priority.includes(term);
  });

  // Apply pagination to filtered results
  const totalFilteredPages = Math.max(1, Math.ceil(filteredTodos.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredTodos.length);
  const paginatedTodos = filteredTodos.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    const maxPage = searchTerm ? totalFilteredPages : totalPages;
    if (page >= 1 && page <= maxPage) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">TO-DO List</h1>
        <button
          onClick={() => {
            resetForm();
            setShowAddForm(true);
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg text-sm sm:text-base"
        >
          <PlusCircle size={18} className="sm:w-5 sm:h-5" />
          <span className="font-semibold">Create Task</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by ID, name, status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Status Filter */}
          <SearchableDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' }
            ]}
            placeholder="Filter by Status"
            className="w-full"
          />

          {/* Priority Filter */}
          <SearchableDropdown
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={[
              { value: 'all', label: 'All Priorities' },
              { value: 'High', label: 'High Priority' },
              { value: 'Medium', label: 'Medium Priority' },
              { value: 'Low', label: 'Low Priority' }
            ]}
            placeholder="Filter by Priority"
            className="w-full"
          />

          {/* Category Filter */}
          <SearchableDropdown
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[
              { value: 'all', label: 'All Categories' },
              ...categories.map(cat => ({ value: cat, label: cat }))
            ]}
            placeholder="Filter by Category"
            className="w-full"
          />
        </div>
      </div>

      {/* Todos List */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto p-4">
          <table className="min-w-full text-left border-separate border-spacing-y-4">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y first:border-l border-gray-200 rounded-l-lg">
                  Title
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200">
                  Category
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200">
                  Priority
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200">
                  Scheduled Date
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200">
                  Scheduled Time
                </th>
                <th className="px-8 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y border-gray-200">
                  Status
                </th>
                <th className="px-6 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wide border-y last:border-r border-gray-200 rounded-r-lg">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-4 py-12 text-center border-y first:border-l last:border-r border-gray-200 first:rounded-l-lg last:rounded-r-lg"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                      <p className="text-gray-600">Loading tasks...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedTodos.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-4 py-12 text-center border-y first:border-l last:border-r border-gray-200 first:rounded-l-lg last:rounded-r-lg"
                  >
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">
                      {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all'
                        ? 'No tasks found'
                        : 'No tasks yet'}
                    </p>
                    <p className="text-gray-400 text-sm mt-2">
                      {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Create your first task to get started'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedTodos.map((todo) => (
                  <tr key={todo._id} className="bg-white hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 border-y first:border-l border-gray-200 first:rounded-l-lg text-gray-900 font-semibold">
                      {todo.title}
                    </td>
                    <td className="px-4 py-4 border-y border-gray-200 text-gray-700 font-medium">
                      {todo.category || 'Work'}
                    </td>
                    <td className="px-4 py-4 border-y border-gray-200">
                      <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold border ${getPriorityColor(todo.priority || 'Medium')}`}>
                        {todo.priority || 'Medium'}
                      </span>
                    </td>
                    <td className="px-4 py-4 border-y border-gray-200 text-gray-700 font-medium">
                      {formatDate(todo.scheduledDate)}
                    </td>
                    <td className="px-4 py-4 border-y border-gray-200 text-gray-700 font-medium">
                      {formatTime(todo.scheduledTime)}
                    </td>
                    <td className="px-4 py-4 border-y border-gray-200">
                      <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold border ${getStatusColor(todo.status)}`}>
                        {todo.status === 'completed' && <CheckCircle size={14} className="mr-1" />}
                        {todo.status === 'cancelled' && <XCircle size={14} className="mr-1" />}
                        {todo.status === 'pending' && <Clock size={14} className="mr-1" />}
                        {todo.status || 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-4 border-y last:border-r border-gray-200 last:rounded-r-lg">
                      <div className="flex gap-2 flex-wrap">
                        {todo.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleCompleteTodo(todo._id)}
                              className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold border border-green-300 text-green-700 bg-green-50 hover:bg-green-500 hover:text-white hover:border-green-500 transition-colors cursor-pointer"
                              title="Mark as Completed"
                            >
                              <CheckCircle size={14} className="mr-1" />
                              Complete
                            </button>
                            <button
                              onClick={() => handleEditClick(todo)}
                              className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit size={14} className="mr-1" />
                              Edit
                            </button>
                          </>
                        )}
                        {todo.status !== 'completed' && (
                          <button
                            onClick={() => openCancelConfirm(todo)}
                            className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold border border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-colors cursor-pointer"
                            title="Cancel"
                          >
                            <XCircle size={14} className="mr-1" />
                            Cancel
                          </button>
                        )}
                        {(todo.status === 'pending' || todo.status === 'cancelled') && (
                          <button
                            onClick={() => openDeleteConfirm(todo)}
                            className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold border border-red-300 text-red-700 bg-red-50 hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={14} className="mr-1" />
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredTodos.length > 0 && totalFilteredPages > 1 && (
        <div className="mt-4 flex justify-between items-center px-4 border border-gray-200 p-2 rounded-xl bg-white">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {endIndex} of {filteredTodos.length} tasks
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-medium text-gray-600 hover:text-gray-900"
            >
              Previous
            </button>
            <div className="flex gap-1">
              {getPageNumbers(totalFilteredPages).map((page, idx, arr) => {
                const showEllipsisBefore = idx > 0 && page - arr[idx - 1] > 1;
                return (
                  <React.Fragment key={page}>
                    {showEllipsisBefore && (
                      <span className="px-2 text-gray-400">...</span>
                    )}
                    <button
                      onClick={() => handlePageChange(page)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        currentPage === page
                          ? 'border border-gray-900 text-gray-900 bg-white'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalFilteredPages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-base font-medium text-gray-600 hover:text-gray-900"
            >
              Next
            </button>
          </div>
        </div>
      )}

        {/* Create Todo Modal */}
        {showAddForm && (
          <div className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl mx-2 sm:mx-4">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 sm:p-6 rounded-t-2xl sm:rounded-t-3xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <PlusCircle className="text-white" size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold">Create New Task</h2>
                      <p className="text-blue-100 text-xs sm:text-sm">Add a new task to your todo list</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      resetForm();
                    }}
                    className="text-white hover:text-gray-200 text-xl sm:text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>

              <form onSubmit={handleCreateTodo} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({ ...formData, title: e.target.value });
                      setErrors({ ...errors, title: '' });
                    }}
                    className={errCls(errors.title)}
                    placeholder="Enter task title"
                    maxLength={200}
                  />
                  {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter task description (optional)"
                    rows={4}
                    maxLength={1000}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Scheduled Date <span className="text-red-500">*</span>
                    </label>
                    <ClickableDateInput
                      value={formData.scheduledDate}
                      onChange={(value) => {
                        setFormData({ ...formData, scheduledDate: value });
                        setErrors({ ...errors, scheduledDate: '' });
                      }}
                      error={errors.scheduledDate}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      mode="date"
                    />
                    {errors.scheduledDate && <p className="mt-1 text-xs text-red-600">{errors.scheduledDate}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Scheduled Time <span className="text-red-500">*</span>
                    </label>
                    <ClickableDateInput
                      value={formData.scheduledTime}
                      onChange={(value) => {
                        setFormData({ ...formData, scheduledTime: value });
                        setErrors({ ...errors, scheduledTime: '' });
                      }}
                      error={errors.scheduledTime}
                      mode="time"
                    />
                    {errors.scheduledTime && <p className="mt-1 text-xs text-red-600">{errors.scheduledTime}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <SearchableDropdown
                      value={formData.category}
                      onChange={(value) => setFormData({ ...formData, category: value })}
                      options={categories.map(cat => ({ value: cat, label: cat }))}
                      placeholder="Select Category"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <SearchableDropdown
                      value={formData.priority}
                      onChange={(value) => setFormData({ ...formData, priority: value })}
                      options={priorities.map(pri => ({ value: pri, label: pri }))}
                      placeholder="Select Priority"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      resetForm();
                    }}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold transition-colors text-sm sm:text-base ${
                      submitting ? 'opacity-50 cursor-not-allowed' : 'hover:from-blue-600 hover:to-blue-700'
                    }`}
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                        Creating...
                      </span>
                    ) : (
                      'Create Task'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Todo Modal */}
        {showEditModal && editingTodo && (
          <div className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl mx-2 sm:mx-4">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 sm:p-6 rounded-t-2xl sm:rounded-t-3xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <Edit className="text-white" size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold">Edit Task</h2>
                      <p className="text-blue-100 text-xs sm:text-sm">Update task details</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingTodo(null);
                      resetForm();
                    }}
                    className="text-white hover:text-gray-200 text-xl sm:text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>

              <form onSubmit={handleUpdateTodo} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({ ...formData, title: e.target.value });
                      setErrors({ ...errors, title: '' });
                    }}
                    className={errCls(errors.title)}
                    placeholder="Enter task title"
                    maxLength={200}
                  />
                  {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter task description (optional)"
                    rows={4}
                    maxLength={1000}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Scheduled Date <span className="text-red-500">*</span>
                    </label>
                    <ClickableDateInput
                      value={formData.scheduledDate}
                      onChange={(value) => {
                        setFormData({ ...formData, scheduledDate: value });
                        setErrors({ ...errors, scheduledDate: '' });
                      }}
                      error={errors.scheduledDate}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      mode="date"
                    />
                    {errors.scheduledDate && <p className="mt-1 text-xs text-red-600">{errors.scheduledDate}</p>}
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Scheduled Time <span className="text-red-500">*</span>
                    </label>
                    <ClickableDateInput
                      value={formData.scheduledTime}
                      onChange={(value) => {
                        setFormData({ ...formData, scheduledTime: value });
                        setErrors({ ...errors, scheduledTime: '' });
                      }}
                      error={errors.scheduledTime}
                      mode="time"
                    />
                    {errors.scheduledTime && <p className="mt-1 text-xs text-red-600">{errors.scheduledTime}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <SearchableDropdown
                      value={formData.category}
                      onChange={(value) => setFormData({ ...formData, category: value })}
                      options={categories.map(cat => ({ value: cat, label: cat }))}
                      placeholder="Select Category"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <SearchableDropdown
                      value={formData.priority}
                      onChange={(value) => setFormData({ ...formData, priority: value })}
                      options={priorities.map(pri => ({ value: pri, label: pri }))}
                      placeholder="Select Priority"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingTodo(null);
                      resetForm();
                    }}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold transition-colors text-sm sm:text-base ${
                      submitting ? 'opacity-50 cursor-not-allowed' : 'hover:from-blue-600 hover:to-blue-700'
                    }`}
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                        Updating...
                      </span>
                    ) : (
                      'Update Task'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
            <div className={`p-6 rounded-t-2xl ${confirmAction === 'delete' ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-orange-500 to-orange-600'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${confirmAction === 'delete' ? 'bg-red-100' : 'bg-orange-100'}`}>
                  {confirmAction === 'delete' ? (
                    <Trash2 className="text-red-600" size={24} />
                  ) : (
                    <XCircle className="text-orange-600" size={24} />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white">
                    {confirmAction === 'delete' ? 'Delete Task' : 'Cancel Task'}
                  </h3>
                  <p className="text-white/90 text-sm mt-1">
                    {confirmAction === 'delete' 
                      ? 'This action cannot be undone' 
                      : 'Are you sure you want to cancel this task?'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setTodoToAction(null);
                    setConfirmAction(null);
                  }}
                  className="text-white hover:text-gray-200 text-2xl font-bold transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6">
              {todoToAction && (
                <div className="mb-6">
                  <p className="text-gray-600 text-sm mb-2">Task Details:</p>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="font-semibold text-gray-900 mb-1">{todoToAction.title}</p>
                    {todoToAction.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{todoToAction.description}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(todoToAction.status)}`}>
                        {todoToAction.status || 'pending'}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(todoToAction.priority || 'Medium')}`}>
                        {todoToAction.priority || 'Medium'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setTodoToAction(null);
                    setConfirmAction(null);
                  }}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
                >
                  No, Keep It
                </button>
                <button
                  onClick={() => {
                    if (confirmAction === 'delete') {
                      handleDeleteTodo();
                    } else {
                      handleCancelTodo();
                    }
                  }}
                  className={`px-6 py-2.5 rounded-lg text-white font-semibold transition-colors ${
                    confirmAction === 'delete'
                      ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                      : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
                  }`}
                >
                  {confirmAction === 'delete' ? 'Yes, Delete' : 'Yes, Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

