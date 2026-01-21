import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import API_CONFIG from '../../config/api.js';

// Fetch truckers with pagination and caching
export const fetchTruckers = createAsyncThunk(
  'carrierApproval/fetchTruckers',
  async ({ page = 1, limit = 15, forceRefresh = false }, { getState, rejectWithValue }) => {
    const state = getState();
    const { pageCache, cacheTimestamps, cacheExpiry } = state.carrierApproval;
    
    // Check if cache is valid for this page and no force refresh
    if (!forceRefresh && pageCache[page] && cacheTimestamps[page] && 
        (Date.now() - cacheTimestamps[page] < cacheExpiry)) {
      console.log(`Returning cached data for page ${page}`);
      return {
        truckers: pageCache[page],
        statistics: state.carrierApproval.statistics,
        pagination: state.carrierApproval.pagination,
        page: page
      };
    }

    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/shipper_driver/all-truckers`, {
        params: { page, limit },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        const truckers = response.data.truckers || [];
        const statistics = response.data.statistics || {};
        
        // Calculate pagination from response
        const totalItems = statistics.totalTruckers || truckers.length;
        const totalPages = Math.ceil(totalItems / limit);
        
        return {
          truckers,
          statistics,
          pagination: {
            currentPage: page,
            totalPages: totalPages,
            totalItems: totalItems,
            itemsPerPage: limit
          },
          page: page
        };
      }
      
      throw new Error('Failed to fetch truckers');
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch truckers');
    }
  }
);

const initialState = {
  truckers: [],
  statistics: {},
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 15
  },
  loading: false,
  error: null,
  pageCache: {}, // Cache data by page number
  cacheTimestamps: {}, // Track when each page was cached
  cacheExpiry: 5 * 60 * 1000, // 5 minutes cache expiry
};

const carrierApprovalSlice = createSlice({
  name: 'carrierApproval',
  initialState,
  reducers: {
    setCurrentPage: (state, action) => {
      state.pagination.currentPage = action.payload;
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
      .addCase(fetchTruckers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTruckers.fulfilled, (state, action) => {
        state.loading = false;
        const { truckers, statistics, pagination, page } = action.payload;
        
        state.truckers = truckers;
        state.statistics = statistics;
        state.pagination = pagination;
        
        // Cache the data for this page
        state.pageCache[page] = truckers;
        state.cacheTimestamps[page] = Date.now();
      })
      .addCase(fetchTruckers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch truckers';
      });
  },
});

export const { setCurrentPage, clearError, clearCache } = carrierApprovalSlice.actions;
export const selectTruckers = (state) => state.carrierApproval.truckers;
export const selectStatistics = (state) => state.carrierApproval.statistics;
export const selectPagination = (state) => state.carrierApproval.pagination;
export const selectLoading = (state) => state.carrierApproval.loading;
export const selectError = (state) => state.carrierApproval.error;

export default carrierApprovalSlice.reducer;
