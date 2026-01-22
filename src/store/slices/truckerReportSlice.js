import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import API_CONFIG from '../../config/api.js';

// Fetch truckers with pagination and caching
export const fetchTruckers = createAsyncThunk(
  'truckerReport/fetchTruckers',
  async ({ 
    page = 1, 
    limit = 15, 
    forceRefresh = false,
    // Search and filter parameters
    search = null,
    userId = null,
    compName = null,
    mcDotNo = null,
    email = null,
    phone = null,
    status = null,
    createdFrom = null,
    createdTo = null,
    // Created By filters
    createdByEmpId = null,
    createdByEmployeeName = null,
    createdByDepartment = null
  }, { getState, rejectWithValue }) => {
    const state = getState();
    const { pageCache, cacheTimestamps, cacheExpiry } = state.truckerReport;
    
    // Build cache key based on all search parameters
    const cacheKey = `${page}_${JSON.stringify({ search, userId, compName, mcDotNo, email, phone, status, createdFrom, createdTo, createdByEmpId, createdByEmployeeName, createdByDepartment })}`;
    
    // Check if cache is valid for this page and filters, and no force refresh
    if (!forceRefresh && pageCache[cacheKey] && cacheTimestamps[cacheKey] && 
        (Date.now() - cacheTimestamps[cacheKey] < cacheExpiry)) {
      console.log(`Returning cached data for Trucker Report page ${page} with filters`);
      return {
        truckers: pageCache[cacheKey],
        statistics: state.truckerReport.statistics,
        pagination: state.truckerReport.pagination,
        page: page
      };
    }

    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      // Build query parameters
      const params = { page, limit };
      
      // Add search parameter (general search - searches across multiple fields)
      if (search && search.trim()) {
        params.search = search.trim();
      } else {
        // Individual field filters (only used when search is not provided)
        if (userId && userId.trim()) params.userId = userId.trim();
        if (compName && compName.trim()) params.compName = compName.trim();
        if (mcDotNo && mcDotNo.trim()) params.mcDotNo = mcDotNo.trim();
        if (email && email.trim()) params.email = email.trim();
        if (phone && phone.trim()) params.phone = phone.trim();
      }
      
      // Status filter can be combined with search
      if (status && status !== 'all') {
        params.status = status;
      }
      
      // Date range filters
      if (createdFrom) {
        // Convert to YYYY-MM-DD format if needed
        const fromDate = createdFrom instanceof Date 
          ? createdFrom.toISOString().split('T')[0]
          : createdFrom;
        params.createdFrom = fromDate;
      }
      if (createdTo) {
        // Convert to YYYY-MM-DD format if needed
        const toDate = createdTo instanceof Date 
          ? createdTo.toISOString().split('T')[0]
          : createdTo;
        params.createdTo = toDate;
      }
      
      // Created By filters
      if (createdByEmpId && createdByEmpId.trim()) {
        params.createdByEmpId = createdByEmpId.trim();
      }
      if (createdByEmployeeName && createdByEmployeeName.trim()) {
        params.createdByEmployeeName = createdByEmployeeName.trim();
      }
      if (createdByDepartment && createdByDepartment.trim()) {
        params.createdByDepartment = createdByDepartment.trim();
      }
      
      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/shipper_driver/truckers`, {
        params,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        const truckersData = response.data.data || [];
        
        // Use pagination from API response
        const apiPagination = response.data.pagination || {};
        const totalItems = apiPagination.totalCount || apiPagination.totalItems || truckersData.length;
        const totalPages = apiPagination.totalPages || Math.ceil(totalItems / limit);
        
        // Use statistics from API if available, otherwise calculate from current page data
        const apiStats = response.data.statistics || {};
        
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
        
        return {
          truckers: truckersData,
          statistics,
          pagination: {
            currentPage: apiPagination.currentPage || page,
            totalPages: totalPages,
            totalItems: totalItems,
            itemsPerPage: apiPagination.limit || limit,
            hasNextPage: apiPagination.hasNextPage || (page < totalPages),
            hasPrevPage: apiPagination.hasPrevPage || (page > 1)
          },
          page: page,
          cacheKey: cacheKey
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
        const { truckers, statistics, pagination, page, cacheKey } = action.payload;
        
        state.truckers = truckers;
        state.statistics = statistics;
        state.pagination = pagination;
        
        // Cache the data using cacheKey (includes page and filters)
        if (cacheKey) {
          state.pageCache[cacheKey] = truckers;
          state.cacheTimestamps[cacheKey] = Date.now();
        }
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
