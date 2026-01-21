import { configureStore } from '@reduxjs/toolkit';
import accountsPayableReducer from './slices/accountsPayableSlice';
import accountsReceivableReducer from './slices/accountsReceivableSlice';
import carrierApprovalReducer from './slices/carrierApprovalSlice';
import doReportReducer from './slices/doReportSlice';
import truckerReportReducer from './slices/truckerReportSlice';

export const store = configureStore({
  reducer: {
    accountsPayable: accountsPayableReducer,
    accountsReceivable: accountsReceivableReducer,
    carrierApproval: carrierApprovalReducer,
    doReport: doReportReducer,
    truckerReport: truckerReportReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          'accountsPayable/fetchDOs/pending', 
          'accountsPayable/fetchDOs/fulfilled',
          'accountsReceivable/fetchAssignedInvoices/pending',
          'accountsReceivable/fetchAssignedInvoices/fulfilled',
          'accountsReceivable/fetchProcessedInvoices/pending',
          'accountsReceivable/fetchProcessedInvoices/fulfilled',
          'accountsReceivable/fetchAcceptedInvoices/pending',
          'accountsReceivable/fetchAcceptedInvoices/fulfilled',
          'accountsReceivable/fetchRejectedInvoices/pending',
          'accountsReceivable/fetchRejectedInvoices/fulfilled',
          'carrierApproval/fetchTruckers/pending',
          'carrierApproval/fetchTruckers/fulfilled',
          'doReport/fetchDOReport/pending',
          'doReport/fetchDOReport/fulfilled',
          'truckerReport/fetchTruckers/pending',
          'truckerReport/fetchTruckers/fulfilled',
        ],
      },
    }),
});
