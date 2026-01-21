import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import API_CONFIG from '../../config/api.js';

// Async thunk for fetching assigned invoices (Tab 0)
export const fetchAssignedInvoices = createAsyncThunk(
  'accountsReceivable/fetchAssignedInvoices',
  async ({ accountantEmpId, page = 1, limit = 50, forceRefresh = false }, { rejectWithValue, getState }) => {
    try {
      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        const state = getState();
        const { cacheTimestamp, cacheExpiry, lastFetchParams, assignedRows } = state.accountsReceivable;
        
        if (cacheTimestamp && lastFetchParams && assignedRows.length > 0 &&
            lastFetchParams.tab === 'assigned' &&
            lastFetchParams.page === page &&
            lastFetchParams.accountantEmpId === accountantEmpId &&
            (Date.now() - cacheTimestamp) < cacheExpiry) {
          return {
            rows: assignedRows,
            pagination: state.accountsReceivable.assignedPagination,
            accountantUser: state.accountsReceivable.accountantUser,
            fromCache: true
          };
        }
      }
      
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const url = `${API_CONFIG.BASE_URL}/api/v1/accountant/assigned-to-accountant`;
      
      const response = await axios.get(url, {
        params: { accountantEmpId, page, limit },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const payload = response?.data?.data || {};
      
      return {
        rows: payload.assignedDOs || [],
        pagination: payload.pagination || {
          currentPage: page,
          totalPages: 1,
          totalItems: (payload.assignedDOs || []).length,
          itemsPerPage: limit
        },
        accountantUser: payload.accountantUser || null,
        fromCache: false
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch assigned invoices');
    }
  }
);

// Async thunk for fetching processed invoices (Tab 1)
export const fetchProcessedInvoices = createAsyncThunk(
  'accountsReceivable/fetchProcessedInvoices',
  async ({ accountantEmpId, page = 1, limit = 50, forceRefresh = false }, { rejectWithValue, getState }) => {
    try {
      if (!forceRefresh) {
        const state = getState();
        const { cacheTimestamp, cacheExpiry, lastFetchParams, processedRows } = state.accountsReceivable;
        
        if (cacheTimestamp && lastFetchParams && processedRows.length > 0 &&
            lastFetchParams.tab === 'processed' &&
            lastFetchParams.page === page &&
            lastFetchParams.accountantEmpId === accountantEmpId &&
            (Date.now() - cacheTimestamp) < cacheExpiry) {
          return {
            rows: processedRows,
            pagination: state.accountsReceivable.processedPagination,
            fromCache: true
          };
        }
      }
      
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const url = `${API_CONFIG.BASE_URL}/api/v1/accountant/processed-by-accountant`;
      
      const response = await axios.get(url, {
        params: { accountantEmpId, page, limit },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const payload = response?.data?.data || {};
      
      return {
        rows: payload.processedDOs || [],
        pagination: payload.pagination || {
          currentPage: page,
          totalPages: 1,
          totalItems: (payload.processedDOs || []).length,
          itemsPerPage: limit
        },
        fromCache: false
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch processed invoices');
    }
  }
);

// Async thunk for fetching accepted invoices (Tab 2)
export const fetchAcceptedInvoices = createAsyncThunk(
  'accountsReceivable/fetchAcceptedInvoices',
  async ({ accountantEmpId, page = 1, limit = 50, forceRefresh = false }, { rejectWithValue, getState }) => {
    try {
      if (!forceRefresh) {
        const state = getState();
        const { cacheTimestamp, cacheExpiry, lastFetchParams, acceptedRows } = state.accountsReceivable;
        
        if (cacheTimestamp && lastFetchParams && acceptedRows.length > 0 &&
            lastFetchParams.tab === 'accepted' &&
            lastFetchParams.page === page &&
            lastFetchParams.accountantEmpId === accountantEmpId &&
            (Date.now() - cacheTimestamp) < cacheExpiry) {
          return {
            rows: acceptedRows,
            pagination: state.accountsReceivable.acceptedPagination,
            fromCache: true
          };
        }
      }
      
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const url = `${API_CONFIG.BASE_URL}/api/v1/accountant/finance/sales-verified-dos`;
      
      const response = await axios.get(url, {
        params: { accountantEmpId, page, limit },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const payload = response?.data?.data || {};
      
      return {
        rows: payload.salesVerifiedDOs || [],
        pagination: payload.pagination || {
          currentPage: page,
          totalPages: 1,
          totalItems: (payload.salesVerifiedDOs || []).length,
          itemsPerPage: limit
        },
        fromCache: false
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch accepted invoices');
    }
  }
);

// Async thunk for fetching rejected invoices (Tab 3)
export const fetchRejectedInvoices = createAsyncThunk(
  'accountsReceivable/fetchRejectedInvoices',
  async ({ accountantEmpId, page = 1, limit = 50, forceRefresh = false }, { rejectWithValue, getState }) => {
    try {
      if (!forceRefresh) {
        const state = getState();
        const { cacheTimestamp, cacheExpiry, lastFetchParams, rejectedRows } = state.accountsReceivable;
        
        if (cacheTimestamp && lastFetchParams && rejectedRows.length > 0 &&
            lastFetchParams.tab === 'rejected' &&
            lastFetchParams.page === page &&
            lastFetchParams.accountantEmpId === accountantEmpId &&
            (Date.now() - cacheTimestamp) < cacheExpiry) {
          return {
            rows: rejectedRows,
            pagination: state.accountsReceivable.rejectedPagination,
            fromCache: true
          };
        }
      }
      
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const url = `${API_CONFIG.BASE_URL}/api/v1/accountant/accountant/rejected-by-sales`;
      
      const response = await axios.get(url, {
        params: { accountantEmpId, page, limit },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const payload = response?.data?.data || {};
      
      return {
        rows: payload.rejectedDOs || [],
        pagination: payload.pagination || {
          currentPage: page,
          totalPages: 1,
          totalItems: (payload.rejectedDOs || []).length,
          itemsPerPage: limit
        },
        fromCache: false
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch rejected invoices');
    }
  }
);

const initialState = {
  // Tab 0: Assigned
  assignedRows: [],
  assignedPagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50
  },
  assignedLoading: false,
  assignedError: null,
  
  // Tab 1: Processed
  processedRows: [],
  processedPagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50
  },
  processedLoading: false,
  processedError: null,
  
  // Tab 2: Accepted
  acceptedRows: [],
  acceptedPagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50
  },
  acceptedLoading: false,
  acceptedError: null,
  
  // Tab 3: Rejected
  rejectedRows: [],
  rejectedPagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50
  },
  rejectedLoading: false,
  rejectedError: null,
  
  // Shared
  accountantUser: null,
  cacheTimestamp: null,
  cacheExpiry: 5 * 60 * 1000, // 5 minutes
  lastFetchParams: null,
};

const accountsReceivableSlice = createSlice({
  name: 'accountsReceivable',
  initialState,
  reducers: {
    setAssignedPage: (state, action) => {
      state.assignedPagination.currentPage = action.payload;
    },
    setProcessedPage: (state, action) => {
      state.processedPagination.currentPage = action.payload;
    },
    setAcceptedPage: (state, action) => {
      state.acceptedPagination.currentPage = action.payload;
    },
    setRejectedPage: (state, action) => {
      state.rejectedPagination.currentPage = action.payload;
    },
    clearError: (state, action) => {
      const { tab } = action.payload || {};
      if (!tab || tab === 'assigned') state.assignedError = null;
      if (!tab || tab === 'processed') state.processedError = null;
      if (!tab || tab === 'accepted') state.acceptedError = null;
      if (!tab || tab === 'rejected') state.rejectedError = null;
    },
    clearCache: (state) => {
      state.assignedRows = [];
      state.processedRows = [];
      state.acceptedRows = [];
      state.rejectedRows = [];
      state.cacheTimestamp = null;
      state.lastFetchParams = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Assigned
      .addCase(fetchAssignedInvoices.pending, (state) => {
        state.assignedLoading = true;
        state.assignedError = null;
      })
      .addCase(fetchAssignedInvoices.fulfilled, (state, action) => {
        state.assignedLoading = false;
        if (!action.payload.fromCache) {
          state.assignedRows = action.payload.rows;
          state.assignedPagination = action.payload.pagination;
          state.accountantUser = action.payload.accountantUser;
          state.lastFetchParams = { tab: 'assigned', page: action.meta.arg.page, accountantEmpId: action.meta.arg.accountantEmpId };
          state.cacheTimestamp = Date.now();
        }
      })
      .addCase(fetchAssignedInvoices.rejected, (state, action) => {
        state.assignedLoading = false;
        state.assignedError = action.payload;
      })
      // Fetch Processed
      .addCase(fetchProcessedInvoices.pending, (state) => {
        state.processedLoading = true;
        state.processedError = null;
      })
      .addCase(fetchProcessedInvoices.fulfilled, (state, action) => {
        state.processedLoading = false;
        if (!action.payload.fromCache) {
          state.processedRows = action.payload.rows;
          state.processedPagination = action.payload.pagination;
          state.lastFetchParams = { tab: 'processed', page: action.meta.arg.page, accountantEmpId: action.meta.arg.accountantEmpId };
          state.cacheTimestamp = Date.now();
        }
      })
      .addCase(fetchProcessedInvoices.rejected, (state, action) => {
        state.processedLoading = false;
        state.processedError = action.payload;
      })
      // Fetch Accepted
      .addCase(fetchAcceptedInvoices.pending, (state) => {
        state.acceptedLoading = true;
        state.acceptedError = null;
      })
      .addCase(fetchAcceptedInvoices.fulfilled, (state, action) => {
        state.acceptedLoading = false;
        if (!action.payload.fromCache) {
          state.acceptedRows = action.payload.rows;
          state.acceptedPagination = action.payload.pagination;
          state.lastFetchParams = { tab: 'accepted', page: action.meta.arg.page, accountantEmpId: action.meta.arg.accountantEmpId };
          state.cacheTimestamp = Date.now();
        }
      })
      .addCase(fetchAcceptedInvoices.rejected, (state, action) => {
        state.acceptedLoading = false;
        state.acceptedError = action.payload;
      })
      // Fetch Rejected
      .addCase(fetchRejectedInvoices.pending, (state) => {
        state.rejectedLoading = true;
        state.rejectedError = null;
      })
      .addCase(fetchRejectedInvoices.fulfilled, (state, action) => {
        state.rejectedLoading = false;
        if (!action.payload.fromCache) {
          state.rejectedRows = action.payload.rows;
          state.rejectedPagination = action.payload.pagination;
          state.lastFetchParams = { tab: 'rejected', page: action.meta.arg.page, accountantEmpId: action.meta.arg.accountantEmpId };
          state.cacheTimestamp = Date.now();
        }
      })
      .addCase(fetchRejectedInvoices.rejected, (state, action) => {
        state.rejectedLoading = false;
        state.rejectedError = action.payload;
      });
  },
});

export const { 
  setAssignedPage, 
  setProcessedPage, 
  setAcceptedPage, 
  setRejectedPage,
  clearError, 
  clearCache 
} = accountsReceivableSlice.actions;

// Selectors
export const selectAssignedRows = (state) => state.accountsReceivable.assignedRows;
export const selectAssignedPagination = (state) => state.accountsReceivable.assignedPagination;
export const selectAssignedLoading = (state) => state.accountsReceivable.assignedLoading;
export const selectAssignedError = (state) => state.accountsReceivable.assignedError;

export const selectProcessedRows = (state) => state.accountsReceivable.processedRows;
export const selectProcessedPagination = (state) => state.accountsReceivable.processedPagination;
export const selectProcessedLoading = (state) => state.accountsReceivable.processedLoading;
export const selectProcessedError = (state) => state.accountsReceivable.processedError;

export const selectAcceptedRows = (state) => state.accountsReceivable.acceptedRows;
export const selectAcceptedPagination = (state) => state.accountsReceivable.acceptedPagination;
export const selectAcceptedLoading = (state) => state.accountsReceivable.acceptedLoading;
export const selectAcceptedError = (state) => state.accountsReceivable.acceptedError;

export const selectRejectedRows = (state) => state.accountsReceivable.rejectedRows;
export const selectRejectedPagination = (state) => state.accountsReceivable.rejectedPagination;
export const selectRejectedLoading = (state) => state.accountsReceivable.rejectedLoading;
export const selectRejectedError = (state) => state.accountsReceivable.rejectedError;

export const selectAccountantUser = (state) => state.accountsReceivable.accountantUser;

export default accountsReceivableSlice.reducer;
