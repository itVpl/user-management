import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import API_CONFIG from '../../config/api.js';

// Fetch DO Report data with pagination and caching
export const fetchDOReport = createAsyncThunk(
  'doReport/fetchDOReport',
  async ({ 
    page = 1, 
    limit = 15, 
    addDispature = null, 
    loadNumber = null,
    shipmentNo = null,
    carrierName = null,
    containerNo = null,
    workOrderNo = null,
    billTo = null,
    pickupDate = null,
    dropDate = null,
    returnDate = null,
    assignedToCMT = null,
    createdByEmpId = null,
    startDate = null,
    endDate = null,
    cmtAssignedOnly = false,
    forceRefresh = false 
  }, { getState, rejectWithValue }) => {
    const state = getState();
    const { pageCache, cacheTimestamps, cacheExpiry } = state.doReport;
    
    // Create cache key that includes page, addDispature, and search parameters
    const cacheKeyParts = [page];
    if (addDispature) cacheKeyParts.push(`company_${addDispature}`);
    if (loadNumber) cacheKeyParts.push(`load_${loadNumber}`);
    if (shipmentNo) cacheKeyParts.push(`shipment_${shipmentNo}`);
    if (carrierName) cacheKeyParts.push(`carrier_${carrierName}`);
    if (containerNo) cacheKeyParts.push(`container_${containerNo}`);
    if (workOrderNo) cacheKeyParts.push(`workorder_${workOrderNo}`);
    if (billTo) cacheKeyParts.push(`billto_${billTo}`);
    if (pickupDate) cacheKeyParts.push(`pickup_${pickupDate}`);
    if (dropDate) cacheKeyParts.push(`drop_${dropDate}`);
    if (returnDate) cacheKeyParts.push(`return_${returnDate}`);
    if (assignedToCMT) cacheKeyParts.push(`cmt_${assignedToCMT}`);
    if (createdByEmpId) cacheKeyParts.push(`created_${createdByEmpId}`);
    if (startDate) cacheKeyParts.push(`start_${startDate}`);
    if (endDate) cacheKeyParts.push(`end_${endDate}`);
    if (cmtAssignedOnly) cacheKeyParts.push('cmtOnly');
    const cacheKey = cacheKeyParts.join('_');
    
    // Check if cache is valid for this page and no force refresh
    if (!forceRefresh && pageCache[cacheKey] && cacheTimestamps[cacheKey] && 
        (Date.now() - cacheTimestamps[cacheKey] < cacheExpiry)) {
      console.log(`Returning cached data for DO Report page ${page}${addDispature ? ` (company: ${addDispature})` : ''}${loadNumber ? ` (loadNumber: ${loadNumber})` : ''}${shipmentNo ? ` (shipmentNo: ${shipmentNo})` : ''}${carrierName ? ` (carrierName: ${carrierName})` : ''}${containerNo ? ` (containerNo: ${containerNo})` : ''}${workOrderNo ? ` (workOrderNo: ${workOrderNo})` : ''}${billTo ? ` (billTo: ${billTo})` : ''}${pickupDate ? ` (pickupDate: ${pickupDate})` : ''}${dropDate ? ` (dropDate: ${dropDate})` : ''}${returnDate ? ` (returnDate: ${returnDate})` : ''}${assignedToCMT ? ` (assignedToCMT: ${assignedToCMT})` : ''}${createdByEmpId ? ` (createdByEmpId: ${createdByEmpId})` : ''}${startDate ? ` (startDate: ${startDate})` : ''}${endDate ? ` (endDate: ${endDate})` : ''}${cmtAssignedOnly ? ` (cmtAssignedOnly: true)` : ''}`);
      return {
        orders: pageCache[cacheKey],
        pagination: state.doReport.pagination,
        cacheKey: cacheKey
      };
    }

    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      // Build API URL with pagination and optional parameters
      let apiUrl = `${API_CONFIG.BASE_URL}/api/v1/do/do/report`;
      const params = { page, limit };
      if (addDispature) {
        params.addDispature = addDispature;
      }
      if (loadNumber) {
        params.loadNumber = loadNumber;
      }
      if (shipmentNo) {
        params.shipmentNo = shipmentNo;
      }
      if (carrierName) {
        params.carrierName = carrierName;
      }
      if (containerNo) {
        params.containerNo = containerNo;
      }
      if (workOrderNo) {
        params.workOrderNo = workOrderNo;
      }
      if (billTo) {
        params.billTo = billTo;
      }
      if (pickupDate) {
        params.pickupDate = pickupDate;
      }
      if (dropDate) {
        params.dropDate = dropDate;
      }
      if (returnDate) {
        params.returnDate = returnDate;
      }
      if (assignedToCMT) {
        params.assignedToCMT = assignedToCMT;
      }
      if (createdByEmpId) {
        params.createdByEmpId = createdByEmpId;
      }
      if (startDate) {
        params.startDate = startDate;
      }
      if (endDate) {
        params.endDate = endDate;
      }
      if (cmtAssignedOnly) {
        params.assignmentStatus = 'assigned';
      }
      
      console.log('DO Report API Request:', {
        url: apiUrl,
        params: params,
        fullUrl: `${apiUrl}?${new URLSearchParams(params).toString()}`
      });
      
      const response = await axios.get(apiUrl, {
        params: params,
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('DO Report API Response:', {
        success: response.data?.success,
        dataLength: Array.isArray(response.data?.data) ? response.data.data.length : 'not array',
        pagination: response.data?.pagination
      });

      if (response.data && response.data.success) {
        // Updated API response structure (standardized):
        // { success: true, data: [...], pagination: { page, limit, total, totalPages, ... } }
        // data is now a direct array, not nested in data.dos
        const ordersArray = Array.isArray(response.data.data) 
          ? response.data.data 
          : (response.data.data?.dos || []);
        
        // Transform orders (same logic as component)
        const transformedOrders = ordersArray.map(order => {
          const puLocs =
            order.shipper?.pickUpLocations ||
            order.shipper?.pickupLocations ||
            [];
          const drLocs =
            order.shipper?.dropLocations ||
            order.shipper?.deliveryLocations ||
            [];

          const puW = puLocs[0]?.weight;
          const drW = drLocs[0]?.weight;

          const loadNo = order.customers?.[0]?.loadNo || 'N/A';
          const orderId = order.doId || order._id;

          return {
            id: `DO-${String(orderId).slice(-6)}`,
            originalId: orderId,
            doNum: loadNo,
            clientName: order.customers?.[0]?.billTo || order.customerName || 'N/A',
            clientEmail: `${(order.customers?.[0]?.billTo || order.customerName || 'customer').toLowerCase().replace(/\s+/g, '')}@example.com`,
            pickupLocation: puLocs[0]?.name || 'Pickup Location',
            deliveryLocation: drLocs[0]?.name || 'Delivery Location',
            amount: order.customers?.[0]?.totalAmount || 0,
            description: `Load: ${loadNo}`,
            priority: 'normal',
            status: order.status || 'open',
            assignmentStatus: order.assignmentStatus || 'unassigned',
            assignedToCMT: order.assignedToCMT || null,
            createdAt: order.date ? new Date(order.date).toISOString().split('T')[0] : '',
            createdBy: `Employee ${order.empId || 'N/A'}`,
            createdByEmpId: order.empId || 'N/A',
            docUpload: 'sample-doc.jpg',
            productName: order.shipper?.containerType || 'N/A',
            quantity: (puW ?? drW ?? order.shipper?.weight ?? 0),
            remarks: order.remarks || '',
            shipperName: order.shipper?.name || 'N/A',
            carrierName: order.carrier?.carrierName || 'N/A',
            carrierFees: order.carrier?.totalCarrierFees || 0,
            createdBySalesUser: order.createdBySalesUser || 'N/A',
            supportingDocs: order.supportingDocs || [],
            customers: order.customers || [],
            shipper: order.shipper || {},
            carrier: order.carrier || {},
            containerNo: order.shipper?.containerNo || order.containerNo || 'N/A',
            returnLocation: order.returnLocation || null,
            _fullOrderData: order
          };
        });

        // Extract pagination from standardized API response structure
        // New structure: { pagination: { page, limit, total, totalPages, hasNextPage, hasPrevPage } }
        const paginationData = response.data.pagination || {};
        
        // Use standardized field names: 'total' instead of 'totalItems' or 'totalCount'
        const totalItems = paginationData.total || 
                          paginationData.totalItems ||  // Fallback for backward compatibility
                          paginationData.totalCount ||   // Fallback for backward compatibility
                          (transformedOrders.length >= limit ? limit * 10 : transformedOrders.length); // Estimate if no total provided
        
        // Use standardized field name: 'totalPages' (already standardized)
        const apiTotalPages = paginationData.totalPages;
        
        // Calculate totalPages from totalItems to ensure accuracy
        // Always calculate to prevent issues where API returns wrong totalPages
        const calculatedTotalPages = limit > 0 ? Math.ceil(totalItems / limit) : 1;
        
        // Use API totalPages if it matches calculation, otherwise use calculated value
        const totalPages = (apiTotalPages && apiTotalPages === calculatedTotalPages) 
                          ? apiTotalPages 
                          : calculatedTotalPages;
        
        console.log('DO Report Pagination (Standardized API):', {
          totalItems,
          apiTotalPages,
          calculatedTotalPages,
          totalPages,
          currentPage: page,
          itemsPerPage: limit,
          ordersInResponse: transformedOrders.length,
          paginationData,
          apiPage: paginationData.page, // Standardized: 'page' instead of 'currentPage'
          responseStructure: {
            hasPagination: !!response.data.pagination,
            hasTotal: !!paginationData.total,
            hasTotalPages: !!paginationData.totalPages,
            hasPage: !!paginationData.page
          }
        });
        
        return {
          orders: transformedOrders,
          pagination: {
            currentPage: page,
            totalPages: totalPages,
            totalItems: totalItems,
            itemsPerPage: limit
          },
          cacheKey: cacheKey
        };
      }
      
      throw new Error('Failed to fetch DO Report data');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch DO Report data');
    }
  }
);

const initialState = {
  orders: [],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 15
  },
  loading: false,
  error: null,
  pageCache: {}, // Cache data by cache key (page + addDispature)
  cacheTimestamps: {}, // Track when each cache key was cached
  cacheExpiry: 5 * 60 * 1000, // 5 minutes cache expiry
  currentAddDispature: null, // Track current company filter
};

const doReportSlice = createSlice({
  name: 'doReport',
  initialState,
  reducers: {
    setCurrentPage: (state, action) => {
      state.pagination.currentPage = action.payload;
    },
    setAddDispature: (state, action) => {
      state.currentAddDispature = action.payload;
      // Reset to page 1 when company filter changes
      state.pagination.currentPage = 1;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearCache: (state) => {
      state.pageCache = {};
      state.cacheTimestamps = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDOReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDOReport.fulfilled, (state, action) => {
        state.loading = false;
        const { orders, pagination, cacheKey } = action.payload;
        
        state.orders = orders;
        state.pagination = pagination;
        
        // Cache the data for this cache key
        state.pageCache[cacheKey] = orders;
        state.cacheTimestamps[cacheKey] = Date.now();
      })
      .addCase(fetchDOReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch DO Report data';
      });
  },
});

export const { setCurrentPage, setAddDispature, clearError, clearCache } = doReportSlice.actions;
export const selectDOReportOrders = (state) => state.doReport.orders;
export const selectDOReportPagination = (state) => state.doReport.pagination;
export const selectDOReportLoading = (state) => state.doReport.loading;
export const selectDOReportError = (state) => state.doReport.error;
export const selectCurrentAddDispature = (state) => state.doReport.currentAddDispature;

export default doReportSlice.reducer;
