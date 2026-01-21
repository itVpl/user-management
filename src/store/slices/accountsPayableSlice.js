import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import API_CONFIG from '../../config/api.js';

// Async thunk for fetching DOs
export const fetchDOs = createAsyncThunk(
  'accountsPayable/fetchDOs',
  async ({ page = 1, limit = 15, status = 'all', forceRefresh = false }, { rejectWithValue, getState }) => {
    try {
      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        const state = getState();
        const { cacheTimestamp, cacheExpiry, lastFetchParams, dos } = state.accountsPayable;
        
        // If cache is valid and params match, skip API call
        if (cacheTimestamp && lastFetchParams && dos.length > 0 &&
            lastFetchParams.page === page && 
            lastFetchParams.status === status &&
            (Date.now() - cacheTimestamp) < cacheExpiry) {
          // Return cached data without API call
          return {
            dos: dos,
            statistics: state.accountsPayable.statistics,
            pagination: state.accountsPayable.pagination,
            fromCache: true
          };
        }
      }
      
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      const params = {
        page,
        limit
      };
      
      if (status !== 'all') {
        params.status = status;
      }
      
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/accountant/dos-by-statuses`, {
        params,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        const transformedDOs = (response.data.data?.doDocuments || []).map(order => {
          const shipper = order.shipperId || order.shipper || {};
          const carrier = order.carrierId || order.carrier || {};
          const puLocs = shipper.pickUpLocations || shipper.pickupLocations || [];
          const drLocs = shipper.dropLocations || shipper.deliveryLocations || [];
          const loadNo = order.customers?.[0]?.loadNo || order.loadReference?.loadId || 'N/A';

          return {
            id: `DO-${String(order._id).slice(-6)}`,
            originalId: order._id,
            doNum: loadNo,
            clientName: order.customers?.[0]?.billTo || order.customers?.[0]?.customerName || order.customerName || 'N/A',
            carrierName: carrier.compName || carrier.carrierName || 'N/A',
            carrierFees: carrier.totalCarrierFees || order.carrier?.totalCarrierFees || 0,
            createdAt: new Date(order.createdAt || order.date).toISOString().split('T')[0],
            createdBySalesUser: order.createdBySalesUser?.employeeName || order.createdBySalesUser || 'N/A',
            status: order.assignmentStatus || order.status || 'open',
            invoice: order.invoice || null,
            fullData: order
          };
        });

        return {
          dos: transformedDOs,
          statistics: response.data.data?.statistics || {},
          pagination: response.data.data?.pagination || {
            currentPage: page,
            totalPages: Math.ceil((response.data.data?.totalItems || transformedDOs.length) / limit),
            totalItems: response.data.data?.totalItems || transformedDOs.length,
            itemsPerPage: limit
          }
        };
      }
      
      throw new Error('Failed to fetch DOs');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch DOs');
    }
  }
);

// Async thunk for marking carrier as paid
export const markCarrierAsPaid = createAsyncThunk(
  'accountsPayable/markCarrierAsPaid',
  async ({ doId, paymentData, formData }, { rejectWithValue }) => {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const url = `${API_CONFIG.BASE_URL}/api/v1/accountant/mark-carrier-as-paid`;
      
      const response = await axios.post(url, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response?.data?.success) {
        return { doId, paymentData: response.data.data };
      }
      
      throw new Error(response?.data?.message || 'Failed to mark carrier as paid');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to mark carrier as paid');
    }
  }
);

const initialState = {
  dos: [],
  statistics: {},
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 15
  },
  paymentStatus: {},
  loading: false,
  error: null,
  lastFetchParams: null, // Cache the last fetch parameters
  cacheTimestamp: null, // Cache timestamp
  cacheExpiry: 5 * 60 * 1000, // 5 minutes cache expiry
  selectedStatus: 'all',
};

const accountsPayableSlice = createSlice({
  name: 'accountsPayable',
  initialState,
  reducers: {
    setCurrentPage: (state, action) => {
      state.pagination.currentPage = action.payload;
    },
    setSelectedStatus: (state, action) => {
      state.selectedStatus = action.payload;
      state.pagination.currentPage = 1; // Reset to page 1 when status changes
    },
    setPaymentStatus: (state, action) => {
      const { doId, status } = action.payload;
      state.paymentStatus[doId] = status;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearCache: (state) => {
      state.dos = [];
      state.statistics = {};
      state.pagination = {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 15
      };
      state.lastFetchParams = null;
      state.cacheTimestamp = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch DOs
      .addCase(fetchDOs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDOs.fulfilled, (state, action) => {
        state.loading = false;
        
        // Only update if not from cache
        if (!action.payload.fromCache) {
          state.dos = action.payload.dos;
          state.statistics = action.payload.statistics;
          state.pagination = action.payload.pagination;
          state.lastFetchParams = action.meta.arg;
          state.cacheTimestamp = Date.now();
          
          // Initialize carrier payment statuses
          const initialStatus = {};
          action.payload.dos.forEach(deliveryOrder => {
            initialStatus[deliveryOrder.originalId] = deliveryOrder.fullData?.carrierPaymentStatus?.status || 'pending';
          });
          state.paymentStatus = { ...state.paymentStatus, ...initialStatus };
        }
        // If from cache, just update loading state, keep existing data
      })
      .addCase(fetchDOs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Mark carrier as paid
      .addCase(markCarrierAsPaid.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markCarrierAsPaid.fulfilled, (state, action) => {
        state.loading = false;
        const { doId } = action.payload;
        state.paymentStatus[doId] = 'paid';
        
        // Update the DO in the list
        const doIndex = state.dos.findIndex(deliveryOrder => deliveryOrder.originalId === doId);
        if (doIndex !== -1) {
          state.dos[doIndex].fullData = {
            ...state.dos[doIndex].fullData,
            carrierPaymentStatus: {
              ...state.dos[doIndex].fullData?.carrierPaymentStatus,
              status: 'paid',
              ...action.payload.paymentData
            }
          };
        }
      })
      .addCase(markCarrierAsPaid.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { 
  setCurrentPage, 
  setSelectedStatus, 
  setPaymentStatus, 
  clearError, 
  clearCache 
} = accountsPayableSlice.actions;

// Selectors
export const selectDOs = (state) => state.accountsPayable.dos;
export const selectStatistics = (state) => state.accountsPayable.statistics;
export const selectPagination = (state) => state.accountsPayable.pagination;
export const selectPaymentStatus = (state) => state.accountsPayable.paymentStatus;
export const selectLoading = (state) => state.accountsPayable.loading;
export const selectError = (state) => state.accountsPayable.error;
export const selectSelectedStatus = (state) => state.accountsPayable.selectedStatus;
export const selectIsCacheValid = (state) => {
  const { cacheTimestamp, cacheExpiry, lastFetchParams } = state.accountsPayable;
  if (!cacheTimestamp || !lastFetchParams) return false;
  return (Date.now() - cacheTimestamp) < cacheExpiry;
};

export default accountsPayableSlice.reducer;
