import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaBox, FaSearch } from 'react-icons/fa';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

export default function DODetails() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

      // Check if response has data property
      if (response.data && response.data.success) {
        const apiData = response.data.data;
        
        // Check if apiData has dos property (new structure)
        let ordersArray = [];
        if (apiData && apiData.dos && Array.isArray(apiData.dos)) {
          ordersArray = apiData.dos;
        } else if (Array.isArray(apiData)) {
          ordersArray = apiData;
        }
        
        if (Array.isArray(ordersArray) && ordersArray.length > 0) {
          const transformedData = ordersArray.map((item, index) => ({
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

          setOrders(transformedData);
        } else {
          setOrders([]);
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

        setOrders(transformedData);
      } else {
        alertify.error('Unexpected response format from server');
      }
    } catch (error) {
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


  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return '$0';
    return `$${Number(amount).toLocaleString()}`;
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

    </div>
  );
}
