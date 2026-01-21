import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import API_CONFIG from '../../config/api.js';

// Fetch truckers with pagination and caching
export const fetchTruckers = createAsyncThunk(
  'truckerReport/fetchTruckers',
  async ({ page = 1, limit = 15, forceRefresh = false }, { getState, rejectWithValue }) => {
    const state = getState();
    const { pageCache, cacheTimestamps, cacheExpiry } = state.truckerReport;
    
    // Check if cache is valid for this page and no force refresh
    if (!forceRefresh && pageCache[page] && cacheTimestamps[page] && 
        (Date.now() - cacheTimestamps[page] < cacheExpiry)) {
      console.log(`Returning cached data for Trucker Report page ${page}`);
      return {
        truckers: pageCache[page],
        statistics: state.truckerReport.statistics,
        pagination: state.truckerReport.pagination,
        page: page
      };
    }

    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/shipper_driver/truckers`, {
        params: { page, limit },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        const truckersData = response.data.data || [];
        
        // Use statistics from API if available, otherwise calculate from current page data
        const apiStats = response.data.statistics || {};
        const totalItems = response.data.pagination?.totalItems || response.data.total || truckersData.length;
        
        // Calculate statistics from current page data (for display)
        const approvedCount = truckersData.filter(t => t.status === 'approved' || t.status === 'accountant_approved').length;
        const rejectedCount = truckersData.filter(t => t.status === 'rejected').length;
        const pendingCount = truckersData.filter(t => t.status === 'pending').length;

        const statistics = {
          totalTruckers: totalItems,
          approvedTruckers: apiStats.approvedTruckers || approvedCount,
          rejectedTruckers: apiStats.rejectedTruckers || rejectedCount,
          pendingApproval: apiStats.pendingTruckers || apiStats.pendingApproval || pendingCount,
          totalLoads: truckersData.reduce((sum, t) => sum + (t.totalLoads || 0), 0),
          completedLoads: truckersData.reduce((sum, t) => sum + (t.completedLoads || 0), 0),
          pendingLoads: truckersData.reduce((sum, t) => sum + (t.pendingLoads || 0), 0),
          totalRevenue: truckersData.reduce((sum, t) => sum + (t.totalRevenue || 0), 0)
        };
        
        // Calculate pagination from response
        const totalPages = response.data.pagination?.totalPages || Math.ceil(totalItems / limit);
        
        return {
          truckers: truckersData,
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
  statistics: {
    totalTruckers: 0,
    approvedTruckers: 0,
    rejectedTruckers: 0,
    pendingApproval: 0,
    totalLoads: 0,
    completedLoads: 0,
    pendingLoads: 0,
    totalRevenue: 0
  },
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

const truckerReportSlice = createSlice({
  name: 'truckerReport',
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

export const { setCurrentPage, clearError, clearCache } = truckerReportSlice.actions;
export const selectTruckers = (state) => state.truckerReport.truckers;
export const selectStatistics = (state) => state.truckerReport.statistics;
export const selectPagination = (state) => state.truckerReport.pagination;
export const selectLoading = (state) => state.truckerReport.loading;
export const selectError = (state) => state.truckerReport.error;

export default truckerReportSlice.reducer;
