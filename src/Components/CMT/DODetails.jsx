import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaTruck, FaBox, FaCalendar, FaClock, FaUser, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaSearch, FaEdit, FaEye, FaFileAlt } from 'react-icons/fa';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

export default function DODetails() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Fetch orders from API
  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Get authentication token
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      if (!token) {
        alertify.error('Authentication required. Please login again.');
        return;
      }

      // Fetch data from the assigned-to-cmt API endpoint
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/do/do/assigned-to-cmt`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('API Response:', response);

      // Check if response has data property
      if (response.data && response.data.success) {
        const apiData = response.data.data || response.data;
        console.log('API Data:', apiData);
        
        // Check if apiData is an array
        if (Array.isArray(apiData)) {
          const transformedData = apiData.map((item, index) => ({
            id: item._id || index,
            sNo: index + 1,
            doId: `DO-${String(item._id).slice(-6)}`,
            loadNo: item.customers?.[0]?.loadNo || 'N/A',
            billTo: item.customers?.[0]?.billTo || 'N/A',
            dispatcherName: item.customers?.[0]?.dispatcherName || 'N/A',
            workOrderNo: item.customers?.[0]?.workOrderNo || 'N/A',
            lineHaul: item.customers?.[0]?.lineHaul || 0,
            fsc: item.customers?.[0]?.fsc || 0,
            other: item.customers?.[0]?.other || 0,
            totalAmount: item.customers?.[0]?.totalAmount || 0,
            carrierName: item.carrier?.carrierName || 'N/A',
            equipmentType: item.carrier?.equipmentType || 'N/A',
            carrierFees: item.carrier?.totalCarrierFees || 0,
            shipperName: item.shipper?.name || 'N/A',
            pickupDate: item.shipper?.pickUpDate || 'N/A',
            dropDate: item.shipper?.dropDate || 'N/A',
            createdBy: item.createdBySalesUser?.employeeName || 'N/A',
            department: item.createdBySalesUser?.department || 'N/A',
            uploadedFiles: item.uploadedFiles || [],
            status: item.status || 'open',
            assignmentStatus: item.assignmentStatus || 'unassigned',
            assignedToCMT: item.assignedToCMT || null,
            createdAt: item.createdAt || new Date().toISOString()
          }));

          console.log('Transformed Data:', transformedData);
          setOrders(transformedData);
        } else {
          console.log('API Data is not an array:', apiData);
          alertify.error('API returned data is not in expected format');
        }
      } else if (response.data && Array.isArray(response.data)) {
        // If response.data is directly an array
        const transformedData = response.data.map((item, index) => ({
          id: item._id || index,
          sNo: index + 1,
          doId: `DO-${String(item._id).slice(-6)}`,
          loadNo: item.customers?.[0]?.loadNo || 'N/A',
          billTo: item.customers?.[0]?.billTo || 'N/A',
          dispatcherName: item.customers?.[0]?.dispatcherName || 'N/A',
          workOrderNo: item.customers?.[0]?.workOrderNo || 'N/A',
          lineHaul: item.customers?.[0]?.lineHaul || 0,
          fsc: item.customers?.[0]?.fsc || 0,
          other: item.customers?.[0]?.other || 0,
          totalAmount: item.customers?.[0]?.totalAmount || 0,
          carrierName: item.carrier?.carrierName || 'N/A',
          equipmentType: item.carrier?.equipmentType || 'N/A',
          carrierFees: item.carrier?.totalCarrierFees || 0,
          shipperName: item.shipper?.name || 'N/A',
          pickupDate: item.shipper?.pickUpDate || 'N/A',
          dropDate: item.shipper?.dropDate || 'N/A',
          createdBy: item.createdBySalesUser?.employeeName || 'N/A',
          department: item.createdBySalesUser?.department || 'N/A',
          uploadedFiles: item.uploadedFiles || [],
          status: item.status || 'open',
          assignmentStatus: item.assignmentStatus || 'unassigned',
          assignedToCMT: item.assignedToCMT || null,
          createdAt: item.createdAt || new Date().toISOString()
        }));

        console.log('Transformed Data (Array):', transformedData);
        setOrders(transformedData);
      } else {
        console.log('Unexpected response format:', response.data);
        alertify.error('Unexpected response format from server');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      if (error.response?.status === 401) {
        alertify.error('Authentication failed. Please login again.');
      } else if (error.response?.status === 403) {
        alertify.error('Access denied. You do not have permission to view this data.');
      } else {
        alertify.error(`Failed to load orders: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Filter orders based on search term
  const filteredOrders = orders.filter(order =>
    order.loadNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.billTo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.dispatcherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.workOrderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.carrierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.shipperName.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // LIFO sorting

  // Pagination calculations
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleViewOrder = async (order) => {
    setSelectedOrder(order);
    setShowViewModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === 'N/A') return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return '$0';
    return `$${Number(amount).toLocaleString()}`;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'close': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Delivery Orders - CMT Assigned</h1>
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">Loading orders...</p>
            <p className="text-gray-400 text-sm">Please wait while we fetch the data</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                  <tr>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">S.No</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">DO ID</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Load No</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Bill To</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Dispatcher</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Carrier</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Total Amount</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Carrier Fees</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Assigned To</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Files</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">View</th>
                  </tr>
                </thead>
                <tbody>
                  {currentOrders.map((order, index) => (
                    <tr key={order.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">{order.sNo}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">{order.doId}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">{order.loadNo}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">{order.billTo}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">{order.dispatcherName}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">{order.carrierName}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">{formatCurrency(order.totalAmount)}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">{formatCurrency(order.carrierFees)}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-3 py-1 rounded-full font-bold ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">{order.assignedToCMT?.employeeName || 'Unassigned'}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">
                          {order.uploadedFiles && order.uploadedFiles.length > 0 ? `${order.uploadedFiles.length} files` : 'No files'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <button
                          onClick={() => handleViewOrder(order)}
                          disabled={viewLoading}
                          className={`px-3 py-1 text-blue-600 text-xs rounded-md transition-colors border border-blue-300 hover:bg-blue-50 ${
                            viewLoading 
                              ? 'opacity-50 cursor-not-allowed' 
                              : ''
                          }`}
                        >
                          {viewLoading ? 'Loading...' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredOrders.length === 0 && (
              <div className="text-center py-12">
                <FaBox className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  {searchTerm ? 'No orders found matching your search' : 'No orders found'}
                </p>
                <p className="text-gray-400 text-sm">
                  {searchTerm ? 'Try adjusting your search terms' : 'No orders available'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && filteredOrders.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} orders
            {searchTerm && ` (filtered from ${orders.length} total)`}
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

      {/* View Details Modal */}
      {showViewModal && selectedOrder && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <FaEye className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Order Details</h2>
                    <p className="text-blue-100">View order information</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Order Information</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p><strong>DO ID:</strong> {selectedOrder.doId}</p>
                    <p><strong>Load No:</strong> {selectedOrder.loadNo}</p>
                    <p><strong>Bill To:</strong> {selectedOrder.billTo}</p>
                    <p><strong>Dispatcher:</strong> {selectedOrder.dispatcherName}</p>
                    <p><strong>Work Order:</strong> {selectedOrder.workOrderNo}</p>
                    <p><strong>Status:</strong> 
                      <span className={`ml-2 text-white text-xs px-2 py-1 rounded-full ${getStatusColor(selectedOrder.status)}`}>
                        {selectedOrder.status}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Financial & Carrier Details</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p><strong>Total Amount:</strong> {formatCurrency(selectedOrder.totalAmount)}</p>
                    <p><strong>Line Haul:</strong> {formatCurrency(selectedOrder.lineHaul)}</p>
                    <p><strong>FSC:</strong> {formatCurrency(selectedOrder.fsc)}</p>
                    <p><strong>Other:</strong> {formatCurrency(selectedOrder.other)}</p>
                    <p><strong>Carrier Name:</strong> {selectedOrder.carrierName}</p>
                    <p><strong>Carrier Fees:</strong> {formatCurrency(selectedOrder.carrierFees)}</p>
                    <p><strong>Assigned To:</strong> {selectedOrder.assignedToCMT?.employeeName || 'Unassigned'}</p>
                    <p><strong>Created By:</strong> {selectedOrder.createdBy}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
