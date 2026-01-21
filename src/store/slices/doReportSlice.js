import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import API_CONFIG from '../../config/api.js';

// Fetch DO Report data with pagination and caching
export const fetchDOReport = createAsyncThunk(
  'doReport/fetchDOReport',
  async ({ page = 1, limit = 15, addDispature = null, forceRefresh = false }, { getState, rejectWithValue }) => {
    const state = getState();
    const { pageCache, cacheTimestamps, cacheExpiry } = state.doReport;
    
    // Create cache key that includes both page and addDispature parameter
    const cacheKey = addDispature ? `${page}_${addDispature}` : `${page}_all`;
    
    // Check if cache is valid for this page and no force refresh
    if (!forceRefresh && pageCache[cacheKey] && cacheTimestamps[cacheKey] && 
        (Date.now() - cacheTimestamps[cacheKey] < cacheExpiry)) {
      console.log(`Returning cached data for DO Report page ${page}${addDispature ? ` (company: ${addDispature})` : ''}`);
      return {
        orders: pageCache[cacheKey],
        pagination: state.doReport.pagination,
        cacheKey: cacheKey
      };
    }

    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      // Build API URL with pagination and optional addDispature parameter
      let apiUrl = `${API_CONFIG.BASE_URL}/api/v1/do/do/report`;
      const params = { page, limit };
      if (addDispature) {
        params.addDispature = addDispature;
      }
      
      const response = await axios.get(apiUrl, {
        params: params,
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        // API response structure: { success: true, data: { dos: [...] } }
        const ordersArray = response.data.data?.dos || [];
        
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
            _fullOrderData: order
          };
        });

        // Calculate pagination from response
        const totalItems = response.data.pagination?.totalItems || response.data.total || transformedOrders.length;
        const totalPages = response.data.pagination?.totalPages || Math.ceil(totalItems / limit);
        
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
