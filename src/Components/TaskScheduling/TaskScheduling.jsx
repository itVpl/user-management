import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  FaPlus, FaCalendar, FaClock, FaCheckCircle, FaTimesCircle, 
  FaExclamationTriangle, FaEdit, FaTrash, FaSearch, FaFilter,
  FaBell, FaList, FaChartBar, FaCalendarAlt, FaFlag
} from 'react-icons/fa';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

export default function TaskScheduling() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
    overdue: 0,
    today: 0
  });

  // Form states
  const [formData, setFormData] = useState({
    taskTitle: '',
    taskDescription: '',
    scheduledDateTime: '',
    priority: 'medium'
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  useEffect(() => {
    fetchTasks();
    fetchStatistics();
  }, []);

   // Reset to first page when filters change
   useEffect(() => {
     setCurrentPage(1);
   }, [searchTerm, priorityFilter]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      
      if (!token) {
        alertify.error('Authentication required. Please login again.');
        return;
      }

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/tasks`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        setTasks(response.data.tasks || []);
      } else {
        console.error('API response format error:', response.data);
        setTasks([]);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      alertify.error(`Error: ${error.response?.data?.message || error.message}`);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      
      if (!token) return;

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/tasks/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        setStatistics(response.data.stats || {
          total: 0,
          pending: 0,
          completed: 0,
          cancelled: 0,
          overdue: 0,
          today: 0
        });
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      
      if (!token) {
        alertify.error('Authentication required. Please login again.');
        return;
      }

      const response = await axios.post(`${API_CONFIG.BASE_URL}/api/v1/tasks/create`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        alertify.success('✅ Task created successfully!');
        setShowCreateModal(false);
        setFormData({
          taskTitle: '',
          taskDescription: '',
          scheduledDateTime: '',
          priority: 'medium'
        });
        fetchTasks();
        fetchStatistics();
      }
    } catch (error) {
      console.error('Error creating task:', error);
      alertify.error(`Error: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      
      if (!token) {
        alertify.error('Authentication required. Please login again.');
        return;
      }

      const response = await axios.put(`${API_CONFIG.BASE_URL}/api/v1/tasks/${selectedTask._id}`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        alertify.success('✅ Task updated successfully!');
        setShowEditModal(false);
        setSelectedTask(null);
        fetchTasks();
        fetchStatistics();
      }
    } catch (error) {
      console.error('Error updating task:', error);
      alertify.error(`Error: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      
      if (!token) {
        alertify.error('Authentication required. Please login again.');
        return;
      }

      const response = await axios.delete(`${API_CONFIG.BASE_URL}/api/v1/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        alertify.success('✅ Task deleted successfully!');
        fetchTasks();
        fetchStatistics();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alertify.error(`Error: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      
      if (!token) {
        alertify.error('Authentication required. Please login again.');
        return;
      }

      const response = await axios.patch(`${API_CONFIG.BASE_URL}/api/v1/tasks/${taskId}/complete`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        alertify.success('✅ Task marked as completed!');
        fetchTasks();
        fetchStatistics();
      }
    } catch (error) {
      console.error('Error completing task:', error);
      alertify.error(`Error: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleCancelTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to cancel this task?')) return;

    try {
      const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
      
      if (!token) {
        alertify.error('Authentication required. Please login again.');
        return;
      }

      const response = await axios.patch(`${API_CONFIG.BASE_URL}/api/v1/tasks/${taskId}/cancel`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        alertify.success('✅ Task marked as cancelled!');
        fetchTasks();
        fetchStatistics();
      }
    } catch (error) {
      console.error('Error cancelling task:', error);
      alertify.error(`Error: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setFormData({
      taskTitle: task.taskTitle,
      taskDescription: task.taskDescription,
      scheduledDateTime: new Date(task.scheduledDateTime).toISOString().slice(0, 16),
      priority: task.priority
    });
    setShowEditModal(true);
  };

   // Filter and sort tasks
   const filteredTasks = tasks
     .filter(task => {
       // Priority filter
       if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
         return false;
       }
       
       // Search filter
       if (!searchTerm) return true;
       
       const searchLower = searchTerm.toLowerCase();
       return task.taskTitle?.toLowerCase().includes(searchLower) ||
              task.taskDescription?.toLowerCase().includes(searchLower);
     })
     .sort((a, b) => new Date(a.scheduledDateTime) - new Date(b.scheduledDateTime));

  // Pagination calculations
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTasks = filteredTasks.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-800 border border-green-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'high': return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'urgent': return 'bg-red-100 text-red-800 border border-red-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'completed': return 'bg-green-100 text-green-800 border border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border border-red-200';
      case 'overdue': return 'bg-red-100 text-red-800 border border-red-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // Format date and time
  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString('en-IN'),
      time: date.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  // Check if task is overdue
  const isOverdue = (scheduledDateTime, status) => {
    if (status === 'completed' || status === 'cancelled') return false;
    return new Date(scheduledDateTime) < new Date();
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">     

       {/* Statistics Cards */}
       <div className="flex justify-between items-center mb-6">
         <div className="flex items-center gap-6">
           <div 
             className={`bg-white rounded-2xl shadow-xl p-4 border border-gray-100 cursor-pointer transition-all duration-200 hover:shadow-2xl hover:scale-105 ${
               priorityFilter === 'all' ? 'ring-2 ring-blue-500 bg-blue-50' : ''
             }`}
             onClick={() => setPriorityFilter('all')}
           >
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                 <FaList className="text-blue-600" size={20} />
               </div>
               <div>
                 <p className="text-sm text-gray-600">Total Tasks</p>
                 <p className="text-xl font-bold text-gray-800">{statistics.total}</p>
               </div>
             </div>
           </div>
           
           <div 
             className={`bg-white rounded-2xl shadow-xl p-4 border border-gray-100 cursor-pointer transition-all duration-200 hover:shadow-2xl hover:scale-105 ${
               priorityFilter === 'low' ? 'ring-2 ring-green-500 bg-green-50' : ''
             }`}
             onClick={() => setPriorityFilter('low')}
           >
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                 <FaFlag className="text-green-600" size={20} />
               </div>
               <div>
                 <p className="text-sm text-gray-600">Low Priority</p>
                 <p className="text-xl font-bold text-green-600">{tasks.filter(t => t.priority === 'low').length}</p>
               </div>
             </div>
           </div>
           
           <div 
             className={`bg-white rounded-2xl shadow-xl p-4 border border-gray-100 cursor-pointer transition-all duration-200 hover:shadow-2xl hover:scale-105 ${
               priorityFilter === 'medium' ? 'ring-2 ring-blue-500 bg-blue-50' : ''
             }`}
             onClick={() => setPriorityFilter('medium')}
           >
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                 <FaFlag className="text-blue-600" size={20} />
               </div>
               <div>
                 <p className="text-sm text-gray-600">Medium Priority</p>
                 <p className="text-xl font-bold text-blue-600">{tasks.filter(t => t.priority === 'medium').length}</p>
               </div>
             </div>
           </div>
           
           <div 
             className={`bg-white rounded-2xl shadow-xl p-4 border border-gray-100 cursor-pointer transition-all duration-200 hover:shadow-2xl hover:scale-105 ${
               priorityFilter === 'high' ? 'ring-2 ring-orange-500 bg-orange-50' : ''
             }`}
             onClick={() => setPriorityFilter('high')}
           >
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                 <FaFlag className="text-orange-600" size={20} />
               </div>
               <div>
                 <p className="text-sm text-gray-600">High Priority</p>
                 <p className="text-xl font-bold text-orange-600">{tasks.filter(t => t.priority === 'high').length}</p>
               </div>
             </div>
           </div>
           
           <div 
             className={`bg-white rounded-2xl shadow-xl p-4 border border-gray-100 cursor-pointer transition-all duration-200 hover:shadow-2xl hover:scale-105 ${
               priorityFilter === 'urgent' ? 'ring-2 ring-red-500 bg-red-50' : ''
             }`}
             onClick={() => setPriorityFilter('urgent')}
           >
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                 <FaFlag className="text-red-600" size={20} />
               </div>
               <div>
                 <p className="text-sm text-gray-600">Urgent Priority</p>
                 <p className="text-xl font-bold text-red-600">{tasks.filter(t => t.priority === 'urgent').length}</p>
               </div>
             </div>
           </div>
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
             onClick={() => setShowCreateModal(true)}
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
                            <FaExclamationTriangle className="text-red-500" size={14} />
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
                         <div className="flex items-center gap-2">
                           <button
                             onClick={() => handleDeleteTask(task._id)}
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
      {totalPages > 1 && filteredTasks.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
           <div className="text-sm text-gray-600">
             Showing {startIndex + 1} to {Math.min(endIndex, filteredTasks.length)} of {filteredTasks.length} tasks
             {(searchTerm || priorityFilter !== 'all') && ` (filtered from ${tasks.length} total)`}
           </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-2 border rounded-lg transition-colors ${currentPage === page
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'border-gray-300 hover:bg-gray-50'
                  }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
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
                  onClick={() => setShowCreateModal(false)}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.taskTitle}
                  onChange={(e) => setFormData({...formData, taskTitle: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter task title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Description
                </label>
                <textarea
                  value={formData.taskDescription}
                  onChange={(e) => setFormData({...formData, taskDescription: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Enter task description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.scheduledDateTime}
                  onChange={(e) => setFormData({...formData, scheduledDateTime: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="flex gap-4 justify-end pt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditModal && selectedTask && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <FaEdit className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Edit Task</h2>
                    <p className="text-green-100">Update task details</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateTask} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.taskTitle}
                  onChange={(e) => setFormData({...formData, taskTitle: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter task title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Description
                </label>
                <textarea
                  value={formData.taskDescription}
                  onChange={(e) => setFormData({...formData, taskDescription: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                  placeholder="Enter task description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.scheduledDateTime}
                  onChange={(e) => setFormData({...formData, scheduledDateTime: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="flex gap-4 justify-end pt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg shadow-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 font-semibold"
                >
                  Update Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
