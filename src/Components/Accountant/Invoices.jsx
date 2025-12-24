import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import Logo from '../../assets/LogoFinal.png';
import { Search, CheckCircle, XCircle, Clock, FileText, RefreshCw, Eye, Edit, Download, User, Truck, DollarSign, MapPin, Calendar, Send } from 'lucide-react';

import {
  Box,
  Container,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Chip,
  Stack,
  Toolbar,
  TextField,
  InputAdornment,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Divider,
  Tooltip,
  Drawer,
  Grid,
  Link as MuiLink,
  Paper,
  Pagination,
  Snackbar,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  Tabs,
  Tab,
  Checkbox,
} from "@mui/material";
import { createTheme, ThemeProvider, alpha } from "@mui/material/styles";
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Print as PrintIcon,
  PictureAsPdf as PictureAsPdfIcon,
  AttachFile as AttachFileIcon,
  Description as DescriptionIcon,
  Image as ImageIcon,
  Send as SendIcon,
  Edit as EditIcon,
} from "@mui/icons-material";

// ========= Config =========
const API_CONFIG = {
  BASE_URL: "https://vpl-liveproject-1.onrender.com",
};
const BRAND = "#16A34A"; // Tailwind green-600 type
const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: BRAND },
    secondary: { main: "#0EA5E9" },
    success: { main: BRAND },
    warning: { main: "#F59E0B" },
    error: { main: "#EF4444" },
    info: { main: "#3B82F6" },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 12, textTransform: "none", fontWeight: 600 },
        containedPrimary: { color: "#fff" },
        outlinedPrimary: { borderWidth: 1.5 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 10 },
        colorPrimary: { backgroundColor: alpha(BRAND, 0.12), color: BRAND },
        outlinedPrimary: { borderColor: alpha(BRAND, 0.4), color: BRAND },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { height: 3, borderRadius: 3, backgroundColor: BRAND },
      },
    },
    MuiTab: {
      styleOverrides: { root: { textTransform: "none", fontWeight: 700 } },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& th": {
            backgroundColor: alpha(BRAND, 0.06),
            fontWeight: 700,
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: { bar: { backgroundColor: BRAND } },
    },
    MuiLink: {
      styleOverrides: { root: { color: BRAND } },
    },
    MuiPaper: {
      styleOverrides: { root: { borderRadius: 12 } },
    },
  },
});

// ========= Utils =========
const fmtMoney = (v) => (typeof v === "number" ? v.toFixed(2) : "0.00");
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : "—");
const shortId = (id = "") => (id?.length > 8 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id);
const isImageUrl = (url = "") => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url);
const isPdfUrl = (url = "") => /\.pdf$/i.test(url);
const uniqueById = (arr = []) => {
  const seen = new Set();
  return (arr || []).filter((it) => {
    const id = it?._id ?? it?.documentUrl ?? it?.fileUrl ?? JSON.stringify(it);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

// prefer sessionStorage, fallback localStorage
const getStored = (k) => {
  if (typeof window === "undefined") return null;
  const fromSession = sessionStorage.getItem(k);
  if (fromSession !== null && fromSession !== undefined) return fromSession;
  return localStorage.getItem(k);
};

function StatusChip({ status }) {
  const map = {
    pending: { label: "Pending", color: "warning" },
    approved: { label: "Approved", color: "success" },
    rejected: { label: "Rejected", color: "error" },
  };
  const meta = map[status] || { label: status || "Unknown", color: "default" };
  return <Chip size="small" label={meta.label} color={meta.color} />;
}

const DetailsRow = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between" gap={2} sx={{ py: 0.5 }}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={600}>
      {typeof value === "string" || typeof value === "number" ? value : value || "—"}
    </Typography>
  </Stack>
);

const EmptyState = ({ title = "No data", subtitle = "Try adjusting filters or search." }) => (
  <Paper elevation={0} sx={{ p: 4, textAlign: "center", border: "1px dashed #ddd" }}>
    <Typography variant="h6" gutterBottom>
      {title}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {subtitle}
    </Typography>
  </Paper>
);

// Small image grid for thumbnails
const ImageGrid = ({ title, images = [] }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="body2" fontWeight={700} gutterBottom>
      {title}
    </Typography>
    {images.length === 0 ? (
      <Typography variant="caption" color="text.secondary">
        No images
      </Typography>
    ) : (
      <Grid container spacing={1}>
        {images.map((src, i) => (
          <Grid item key={i}>
            <a href={src} target="_blank" rel="noopener noreferrer">
              <img
                src={src}
                alt={`${title}-${i}`}
                style={{
                  width: 110,
                  height: 80,
                  objectFit: "cover",
                  borderRadius: 6,
                  border: "1px solid #eee",
                }}
              />
            </a>
          </Grid>
        ))}
      </Grid>
    )}
  </Box>
);

// Simple TabPanel helper
function TabPanel({ value, index, children }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

// Edit Form Component
function EditForm({ data, onSubmit, loading, onClose }) {
  // Initialize form data with calculated totals
  const initializeFormData = (data) => {
    const customers = (data?.customers || []).map(customer => {
      // Handle billTo - fallback to customerName from root if not in customer object
      const billTo = customer.billTo || data.customerName || '';
      
      // Handle other - if it's an array, use otherTotal or sum it up; otherwise use the value directly
      let otherValue = 0;
      if (Array.isArray(customer.other)) {
        otherValue = customer.otherTotal || customer.other.reduce((sum, item) => sum + (Number(item?.total) || 0), 0);
      } else {
        otherValue = customer.other || customer.otherTotal || 0;
      }
      
      return {
        ...customer,
        billTo: billTo,
        other: otherValue,
        totalAmount: (customer.lineHaul || 0) + (customer.fsc || 0) + otherValue
      };
    });
    
    const carrierFees = (data?.carrier?.carrierFees || []).map(fee => ({
      ...fee,
      total: (fee.quantity || 0) * (fee.amount || 0)
    }));
    
    const totalCarrierFees = carrierFees.reduce((sum, fee) => sum + (fee.total || 0), 0);
    
    return {
      customers,
      carrier: {
        ...data?.carrier,
        carrierFees,
        totalCarrierFees
      }
    };
  };

  const [formData, setFormData] = useState(initializeFormData(data));

  // Update form data when data prop changes
  React.useEffect(() => {
    setFormData(initializeFormData(data));
  }, [data]);

  const handleCustomerChange = (index, field, value) => {
    const newCustomers = [...formData.customers];
    newCustomers[index] = { ...newCustomers[index], [field]: value };
    
    // Auto-calculate total amount when line haul, FSC, or other changes
    if (field === 'lineHaul' || field === 'fsc' || field === 'other') {
      const lineHaul = field === 'lineHaul' ? value : (newCustomers[index].lineHaul || 0);
      const fsc = field === 'fsc' ? value : (newCustomers[index].fsc || 0);
      const other = field === 'other' ? value : (newCustomers[index].other || 0);
      newCustomers[index].totalAmount = lineHaul + fsc + other;
    }
    
    setFormData({ ...formData, customers: newCustomers });
  };

  const handleCarrierChange = (field, value) => {
    setFormData({
      ...formData,
      carrier: { ...formData.carrier, [field]: value }
    });
  };

  const handleCarrierFeeChange = (index, field, value) => {
    const newFees = [...(formData.carrier.carrierFees || [])];
    newFees[index] = { ...newFees[index], [field]: value };
    
    // Auto-calculate total for carrier fee when quantity or amount changes
    if (field === 'quantity' || field === 'amount') {
      const quantity = field === 'quantity' ? value : (newFees[index].quantity || 0);
      const amount = field === 'amount' ? value : (newFees[index].amount || 0);
      newFees[index].total = quantity * amount;
    }
    
    // Calculate total carrier fees
    const totalCarrierFees = newFees.reduce((sum, fee) => sum + (fee.total || 0), 0);
    
    setFormData({
      ...formData,
      carrier: { 
        ...formData.carrier, 
        carrierFees: newFees,
        totalCarrierFees: totalCarrierFees
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Details */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
        <div className="flex items-center gap-2 mb-4">
          <User className="text-green-600" size={20} />
          <h3 className="text-lg font-bold text-gray-800">Customer Details</h3>
        </div>
        <div className="space-y-4">
          {formData.customers.map((customer, index) => (
            <div key={index} className="bg-white rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold text-sm">{index + 1}</span>
                </div>
                <h4 className="font-semibold text-gray-800">Customer {index + 1}</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <TextField
                  fullWidth
                  label="Load No"
                  value={customer.loadNo || ""}
                  InputProps={{
                    readOnly: true,
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      backgroundColor: '#f5f5f5'
                    }
                  }}
                />
                <TextField
                  fullWidth
                  label="Bill To"
                  value={customer.billTo || ""}
                  InputProps={{
                    readOnly: true,
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      backgroundColor: '#f5f5f5'
                    }
                  }}
                />
                <TextField
                  fullWidth
                  label="Dispatcher Name"
                  value={customer.dispatcherName || ""}
                  InputProps={{
                    readOnly: true,
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      backgroundColor: '#f5f5f5'
                    }
                  }}
                />
                <TextField
                  fullWidth
                  label="Work Order No"
                  value={customer.workOrderNo || ""}
                  InputProps={{
                    readOnly: true,
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      backgroundColor: '#f5f5f5'
                    }
                  }}
                />
                <div className="md:col-span-2">
                  <TextField
                    fullWidth
                    label="Line Haul"
                    type="number"
                    value={customer.lineHaul || ""}
                    onChange={(e) => handleCustomerChange(index, 'lineHaul', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <TextField
                  fullWidth
                  label="FSC"
                  type="number"
                  value={customer.fsc || ""}
                  onChange={(e) => handleCustomerChange(index, 'fsc', parseFloat(e.target.value) || 0)}
                />
                <TextField
                  fullWidth
                  label="Other"
                  type="number"
                  value={customer.other || ""}
                  onChange={(e) => handleCustomerChange(index, 'other', parseFloat(e.target.value) || 0)}
                />
                <TextField
                  fullWidth
                  label="Total Amount"
                  type="number"
                  value={customer.totalAmount || ""}
                  InputProps={{
                    readOnly: true,
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      backgroundColor: '#f5f5f5',
                      fontWeight: 'bold'
                    }
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Carrier Details */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
        <div className="flex items-center gap-2 mb-4">
          <Truck className="text-purple-600" size={20} />
          <h3 className="text-lg font-bold text-gray-800">Carrier Details</h3>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              fullWidth
              label="Carrier Name"
              value={formData.carrier.carrierName || ""}
              InputProps={{
                readOnly: true,
              }}
              sx={{
                '& .MuiInputBase-input': {
                  backgroundColor: '#f5f5f5'
                }
              }}
            />
            <TextField
              fullWidth
              label="Equipment Type"
              value={formData.carrier.equipmentType || ""}
              InputProps={{
                readOnly: true,
              }}
              sx={{
                '& .MuiInputBase-input': {
                  backgroundColor: '#f5f5f5'
                }
              }}
            />
          </div>

          {/* Carrier Fees */}
          <div className="mt-4">
            <h4 className="text-md font-semibold text-gray-800 mb-3">Carrier Fees</h4>
            <div className="space-y-3">
              {(formData.carrier.carrierFees || []).map((fee, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-purple-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <TextField
                      fullWidth
                      label="Name"
                      value={fee.name || ""}
                      InputProps={{
                        readOnly: true,
                      }}
                      sx={{
                        '& .MuiInputBase-input': {
                          backgroundColor: '#f5f5f5'
                        }
                      }}
                    />
                    <TextField
                      fullWidth
                      label="Quantity"
                      type="number"
                      value={fee.quantity || ""}
                      onChange={(e) => handleCarrierFeeChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                    <TextField
                      fullWidth
                      label="Amount"
                      type="number"
                      value={fee.amount || ""}
                      onChange={(e) => handleCarrierFeeChange(index, 'amount', parseFloat(e.target.value) || 0)}
                    />
                    <TextField
                      fullWidth
                      label="Total"
                      type="number"
                      value={fee.total || ""}
                      InputProps={{
                        readOnly: true,
                      }}
                      sx={{
                        '& .MuiInputBase-input': {
                          backgroundColor: '#f5f5f5',
                          fontWeight: 'bold'
                        }
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <TextField
                fullWidth
                label="Total Carrier Fees"
                type="number"
                value={formData.carrier.totalCarrierFees || ""}
                InputProps={{
                  readOnly: true,
                }}
                sx={{
                  '& .MuiInputBase-input': {
                    backgroundColor: '#f5f5f5',
                    fontWeight: 'bold'
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex-1 max-w-[200px] px-6 py-3 h-12 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 flex items-center justify-center"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className={`${onClose ? 'flex-1 max-w-[200px]' : ''} px-6 py-3 h-12 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Updating...</span>
            </>
          ) : (
            <>
              <CheckCircle size={18} />
              <span>Update Details</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ========= Component =========
export default function Invoices({ accountantEmpId: propEmpId }) {
  // resolve auth + emp
  const storedEmpId = getStored("empId");
  const empId = propEmpId || storedEmpId || "VPL010";
  const token = getStored("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // UI: Tabs
  const [activeTab, setActiveTab] = useState(0);

  // common selected/details/preview
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  // toasts
  const [toast, setToast] = useState({ open: false, severity: "success", msg: "" });

  // === TAB 0: Assigned to Accountant ===
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50,
  });
  const [accountantUser, setAccountantUser] = useState(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // === TAB 1: Accountant Approved (Processed) ===
  const [processedLoading, setProcessedLoading] = useState(false);
  const [processedError, setProcessedError] = useState("");
  const [processedRows, setProcessedRows] = useState([]);
  const [processedPagination, setProcessedPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50,
  });
  const [processedPage, setProcessedPage] = useState(1);
  const [processedSearch, setProcessedSearch] = useState("");

  // === TAB 2: Approved By Sales ===
  const [acceptedLoading, setAcceptedLoading] = useState(false);
  const [acceptedError, setAcceptedError] = useState("");
  const [acceptedRows, setAcceptedRows] = useState([]);
  const [acceptedPagination, setAcceptedPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50,
  });
  const [acceptedPage, setAcceptedPage] = useState(1);
  const [acceptedSearch, setAcceptedSearch] = useState("");

  // === TAB 3: Rejected by Sales ===
  const [rejectedLoading, setRejectedLoading] = useState(false);
  const [rejectedError, setRejectedError] = useState("");
  const [rejectedRows, setRejectedRows] = useState([]);
  const [rejectedPagination, setRejectedPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50,
  });
  const [rejectedPage, setRejectedPage] = useState(1);
  const [rejectedSearch, setRejectedSearch] = useState("");

  // Shipment images state
  const [shipImgs, setShipImgs] = useState(null);
  const [shipImgsLoading, setShipImgsLoading] = useState(false);
  const [shipImgsErr, setShipImgsErr] = useState("");

  // Additional documents state
  const [addDocs, setAddDocs] = useState([]);
  const [addDocsLoading, setAddDocsLoading] = useState(false);
  const [addDocsErr, setAddDocsErr] = useState("");

  // Final approval form state
  const [approvalAction, setApprovalAction] = useState("approve"); // "approve" | "reject"
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [posting, setPosting] = useState(false);

  // Resubmit form state
  const [resubmitCorrections, setResubmitCorrections] = useState("");
  const [resubmitRemarks, setResubmitRemarks] = useState("");
  const [resubmitPosting, setResubmitPosting] = useState(false);

  // PDF generation state
  const [pdfLoading, setPdfLoading] = useState({ invoice: false, rate: false, bol: false });

  // Edit functionality state
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: '',
    paymentReference: '',
    paymentNotes: '',
    paymentProof: null
  });
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Bulk payment state
  const [bulkPaymentModalOpen, setBulkPaymentModalOpen] = useState(false);
  const [selectedDOs, setSelectedDOs] = useState(new Set());
  const [bulkPaymentDOIds, setBulkPaymentDOIds] = useState([]); // Store DO IDs when modal opens
  const [bulkPaymentForm, setBulkPaymentForm] = useState({
    paymentMethod: '',
    paymentReference: '',
    paymentNotes: '',
    paymentProof: null
  });
  const [bulkPaymentLoading, setBulkPaymentLoading] = useState(false);

  // Short Pay modal state
  const [shortPayModalOpen, setShortPayModalOpen] = useState(false);
  const [shortPayData, setShortPayData] = useState(null);
  const [shortPayForm, setShortPayForm] = useState({
    paymentAmount: '',
    paymentMethod: '',
    paymentReference: '',
    paymentNotes: '',
    carrierPaymentProof: null
  });
  const [shortPayLoading, setShortPayLoading] = useState(false);

  // Logo source for PDF generation - using your actual logo
  const logoSrc = Logo;

  // Generate Rate Load Confirmation PDF function
  const generateRateLoadConfirmationPDF = async (order) => {
    try {
      // 1) Dispatcher info
      let dispatcherPhone = 'N/A';
      let dispatcherEmail = 'N/A';
      try {
        const cmtUsers = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/cmt/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const dispatcher = cmtUsers.data?.data?.find(
          (user) => user.aliasName === ((order.customers && order.customers[0] && order.customers[0].dispatcherName) || '')
        );
        if (dispatcher) {
          dispatcherPhone = dispatcher.mobileNo || 'N/A';
          dispatcherEmail = dispatcher.email || 'N/A';
        }
      } catch (err) {
        console.error('Error fetching dispatcher info:', err);
      }

      // 2) Helpers (NO nullish + logical mixing)
      const toNum = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };
      const currency = (n) =>
        Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const formatDateStr = (d) => {
        if (!d) return 'N/A';
        try { return new Date(d).toLocaleDateString(); } catch { return 'N/A'; }
      };
      const formatDateStrUS = (d) => {
        if (!d) return 'N/A';
        try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }); } catch { return 'N/A'; }
      };
      const formatAddr = (l) => {
        if (!l) return 'N/A';
        const parts = [l.address, l.city, l.state, l.zipCode].filter(Boolean);
        return parts.length ? parts.join(', ') : 'N/A';
      };
      // NEW: name + address line
      const formatLocLine = (l) => {
        if (!l) return 'N/A';
        const name = (l.name || '').trim();
        const addr = formatAddr(l);
        return name ? `${name} — ${addr}` : addr;
      };

      // 3) Carrier fees (names + qty + rate + total)
      const rawFees = (order.carrier && Array.isArray(order.carrier.carrierFees)) ? order.carrier.carrierFees : [];
      const feeEntries = rawFees.map((ch, idx) => {
        let qtyRaw;
        if (ch && ch.qty !== undefined && ch.qty !== null) qtyRaw = ch.qty;
        else if (ch && ch.quantity !== undefined && ch.quantity !== null) qtyRaw = ch.quantity;
        else qtyRaw = 1;
        const qty = toNum(qtyRaw) || 1;

        let rateRaw = (ch && ch.rate !== undefined && ch.rate !== null) ? ch.rate : 0;
        const rate = toNum(rateRaw);

        let totalRaw = null;
        if (ch && ch.total !== undefined && ch.total !== null) totalRaw = ch.total;
        else if (ch && ch.amount !== undefined && ch.amount !== null) totalRaw = ch.amount;
        const total = totalRaw !== null ? toNum(totalRaw) : (rate * qty);

        let desc = 'Charge ' + (idx + 1);
        if (ch && ch.description) desc = ch.description;
        else if (ch && ch.name) desc = ch.name;
        else if (ch && ch.type) desc = ch.type;

        return { desc, qty, rate, total };
      });
      const totalCarrierFees = feeEntries.reduce((s, it) => s + toNum(it.total), 0);

      // Carrier Charges list (under Carrier Info)
      const chargesListItemsHTML = feeEntries.length
        ? feeEntries.map((it) =>
          '<div style="display:flex;justify-content:space-between;align-items:center;border:1px solid #ececec;border-radius:8px;padding:8px 10px;margin:6px 0;">' +
          `<div><div style="font-weight:700;">${it.desc}</div><div style="font-size:11px;color:#555;">Quantity: ${it.qty} × Amount: $${currency(it.rate)}</div></div>` +
          `<div style="font-weight:700;">$ ${currency(it.total)}</div>` +
          '</div>'
        ).join('')
        : '<div style="color:#777;border:1px dashed #ccc;border-radius:8px;padding:8px 10px;">No carrier charges</div>';

      const chargesListHTML =
        '<div style="margin:-6px 0 10px 0;padding:10px;border:1px solid #f0e8ff;background:#fbf7ff;border-radius:10px;">' +
        '<h4 style="font-size:12px;margin:0 0 8px 0;color:#2c3e50;">Carrier Charges</h4>' +
        chargesListItemsHTML +
        '</div>';

      // 4) Pickup/Drop sections (EACH location separately)
      const ship = order.shipper || {};
      const pickUps = Array.isArray(ship.pickUpLocations) ? ship.pickUpLocations : [];
      const drops  = Array.isArray(ship.dropLocations) ? ship.dropLocations : [];

      const pickupSectionsHTML = pickUps.length
        ? pickUps.map((l, i) => {
            const addrLine = formatLocLine(l); // << name + address
            const dateStr = formatDateStr(l && l.pickUpDate);
            const hoursLabel = 'Shipping Hours';
            return (
              '<table class="rates-table">' +
              '<thead><tr><th colspan="2" style="text-align:left;background:#f0f0f0;font-size:14px;font-weight:bold;">Pickup Location ' + (i + 1) + '</th></tr></thead>' +
              '<tbody>' +
              '<tr>' +
              '<td colspan="2" style="padding:8px;font-weight:bold;border-bottom:1px solid #ddd;">' + addrLine + '</td>' +
              '</tr>' +
              '<tr>' +
              '<td style="width:50%;padding:8px;">' +
              '<strong>Date:</strong> ' + dateStr + '<br>' +
              '<strong>Time:</strong> N/A<br>' +
              '<strong>Type:</strong> ' + (ship.containerType || '40HC') + '<br>' +
              '<strong>Quantity:</strong> 1<br>' +
              '<strong>Weight:</strong> ' + ((ship.weight !== undefined && ship.weight !== null) ? ship.weight : 'N/A') + ' lbs' +
              '</td>' +
              '<td style="width:50%;padding:8px;">' +
              '<strong>Purchase Order #:</strong> N/A<br>' +
              '<strong>' + hoursLabel + ':</strong> N/A<br>' +
              '<strong>Appointment:</strong> No<br>' +
              '<strong>Container/Trailer Number:</strong> ' + (ship.containerNo || 'N/A') +
              '</td>' +
              '</tr>' +
              '</tbody>' +
              '</table>'
            );
          }).join('')
        : (
          '<table class="rates-table">' +
          '<thead><tr><th colspan="2" style="text-align:left;background:#f0f0f0;font-size:14px;font-weight:bold;">Pickup Location</th></tr></thead>' +
          '<tbody><tr><td colspan="2" style="padding:8px;">N/A</td></tr></tbody>' +
          '</table>'
        );

      const dropSectionsHTML = drops.length
        ? drops.map((l, i) => {
            const addrLine = formatLocLine(l); // << name + address
            const dateStr = formatDateStr(l && l.dropDate);
            const hoursLabel = 'Receiving Hours';
            return (
              '<table class="rates-table">' +
              '<thead><tr><th colspan="2" style="text-align:left;background:#f0f0f0;font-size:14px;font-weight:bold;">Drop Location ' + (i + 1) + '</th></tr></thead>' +
              '<tbody>' +
              '<tr>' +
              '<td colspan="2" style="padding:8px;font-weight:bold;border-bottom:1px solid #ddd;">' + addrLine + '</td>' +
              '</tr>' +
              '<tr>' +
              '<td style="width:50%;padding:8px;">' +
              '<strong>Date:</strong> ' + dateStr + '<br>' +
              '<strong>Time:</strong> N/A<br>' +
              '<strong>Type:</strong> ' + (ship.containerType || '40HC') + '<br>' +
              '<strong>Quantity:</strong> 1<br>' +
              '<strong>Weight:</strong> ' + ((ship.weight !== undefined && ship.weight !== null) ? ship.weight : 'N/A') + ' lbs' +
              '</td>' +
              '<td style="width:50%;padding:8px;">' +
              '<strong>Purchase Order #:</strong> N/A<br>' +
              '<strong>' + hoursLabel + ':</strong> N/A<br>' +
              '<strong>Appointment:</strong> No<br>' +
              '<strong>Container/Trailer Number:</strong> ' + (ship.containerNo || 'N/A') +
              '</td>' +
              '</tr>' +
              '</tbody>' +
              '</table>'
            );
          }).join('')
        : (
          '<table class="rates-table">' +
          '<thead><tr><th colspan="2" style="text-align:left;background:#f0f0f0;font-size:14px;font-weight:bold;">Drop Location</th></tr></thead>' +
          '<tbody><tr><td colspan="2" style="padding:8px;">N/A</td></tr></tbody>' +
          '</table>'
        );

      // 5) Bottom: total with signature
      const amountBottomBlockHTML =
        '<div style="margin-top: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9; max-width: 90%; margin-left: auto; margin-right: auto;">' +
        '<h3 style="text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 12px; color: #2c3e50;">Total Carrier Fees</h3>' +
        '<p style="text-align:center; font-size: 16px; font-weight: 700; margin: 0 0 14px 0;">$ ' + currency(totalCarrierFees) + '</p>' +
        '<div style="margin-top: 10px; font-size: 12px; line-height: 1.6;">' +
        '<p style="margin-bottom: 10px; text-align: center;">' +
        'Accepted By _________________________ Date ________________ Signature ____________________' +
        '</p>' +
        '<p style="text-align: center;">' +
        'Driver Name _________________________ Cell __________________ Truck _____________ Trailer _____________' +
        '</p>' +
        '</div>' +
        '</div>';

      // 6) Dates for header
      const todayUS = formatDateStrUS(new Date());
      const shipDateUS = formatDateStrUS(order.shipper && order.shipper.pickUpDate);

      // 7) Build HTML
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        setToast({ open: true, severity: 'error', msg: 'Popup blocked. Please allow popups and try again.' });
        return;
      }

      const confirmationHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Rate and Load Confirmation</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Arial', sans-serif; line-height: 1.4; color: #333; background: white; font-size: 12px; }
  .confirmation-container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; gap: 20px; }
  .logo { width: 120px; height: 90px; object-fit: contain; }
  .bill-to { text-align: right; }
  .rates-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  .rates-table th, .rates-table td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
  .rates-table th { background-color: #f5f5f5; font-weight: bold; }
  .rates-table .amount { text-align: right; font-weight: bold; }
  @media print { @page { margin: 0; size: A4; } }
</style>
</head>
<body>
  <div class="confirmation-container">
    <!-- Header -->
    <div class="header">
      <div style="width:120px; height:90px; display:flex; align-items:center; justify-content:center; background:#f0f0f0; border:1px solid #ddd;">
        <img src="${logoSrc}" alt="Company Logo" class="logo" style="max-width:100%; max-height:100%; object-fit:contain;" 
             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"/>
        <div style="display:none; text-align:center; color:#666; font-size:12px;">
          <div style="font-weight:bold;">COMPANY</div>
          <div>LOGO</div>
        </div>
      </div>
      <div class="bill-to">
        <table style="border-collapse: collapse; width: 100%; font-size: 12px;">
          <tr>
            <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Dispatcher</td>
            <td style="padding: 2px 8px; border: 1px solid #ddd;">${(order.customers && order.customers[0] && order.customers[0].dispatcherName) || 'N/A'}</td>
            <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Load</td>
            <td style="padding: 2px 8px; border: 1px solid #ddd;">${order.doNum || (order.customers && order.customers[0] && order.customers[0].loadNo) || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Phone</td>
            <td style="padding: 2px 8px; border: 1px solid #ddd;">${dispatcherPhone}</td>
            <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Ship Date</td>
            <td style="padding: 2px 8px; border: 1px solid #ddd;">${shipDateUS}</td>
          </tr>
          <tr>
            <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Fax</td>
            <td style="padding: 2px 8px; border: 1px solid #ddd;">${(order.customers && order.customers[0] && order.customers[0].fax) || 'N/A'}</td>
            <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Today Date</td>
            <td style="padding: 2px 8px; border: 1px solid #ddd;">${todayUS}</td>
          </tr>
          <tr>
            <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">Email</td>
            <td style="padding: 2px 8px; border: 1px solid #ddd;">${dispatcherEmail}</td>
            <td style="padding: 2px 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f5f5f5;">W/O</td>
            <td style="padding: 2px 8px; border: 1px solid #ddd;">${(order.customers && order.customers[0] && order.customers[0].workOrderNo) || 'N/A'}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Carrier Information -->
    <table class="rates-table">
      <thead>
        <tr>
          <th>Carrier</th>
          <th>Phone</th>
          <th>Equipment</th>
          <th>Load Status</th>
          <th>Total Carrier Fees</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${(order.carrier && order.carrier.carrierName) || 'N/A'}</td>
          <td>${(order.carrier && order.carrier.phone) || 'N/A'}</td>
          <td>${(order.carrier && order.carrier.equipmentType) || 'N/A'}</td>
          <td>${order.status ? (order.status[0].toUpperCase() + order.status.slice(1)) : 'N/A'}</td>
          <td class="amount">$ ${currency(totalCarrierFees)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Carrier Charges (names + qty + amount) -->
    ${chargesListHTML}

    <!-- Pickup Locations (each separately) -->
    ${pickupSectionsHTML}

    <!-- Drop Locations (each separately) -->
    ${dropSectionsHTML}

    <!-- Dispatcher Notes -->
    <div style="margin-top: 20px;">
      <h4 style="font-size: 14px; font-weight: bold; color:#0b0e11;">Dispatcher Notes:</h4>
    </div>
  </div>

  <!-- PAGE BREAK: Terms & Conditions (UNCHANGED, FULL) -->
  <div style="page-break-before: always; margin-top: 20px;">
    <div class="confirmation-container" style="width: 100%; margin: 0 auto;">
      <h2 style="text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #2c3e50;">
        Terms and Conditions
      </h2>

      <div style="font-size: 9px; line-height: 1.2; text-align: justify;">
        <p style="margin-bottom: 8px;">
          This rate confirmation hereby serves as an agreement governing the movement of freight/commodity as specified & becomes a part of the
          transportation agreement between the signing parties.
        </p>

        <h3 style="font-size: 12px; font-weight: bold; margin: 10px 0 6px 0; color: #2c3e50;">SAFE DELIVERY NORMS</h3>

        <ol style="margin-left: 8px; margin-bottom: 8px;">
          <li style="margin-bottom: 3px;">All freights /commodities shall be picked-up & delivered within the time frame mentioned on the rate confirmation. Failure to do this may attract penalty from the agreed freight rate.</li>
          <li style="margin-bottom: 3px;">Drivers are required to comply by appointment timings in case of Live loading / Unloading. Failure to comply by the same would result in a penalty of $150 per appointment for late delivery on same day or in case of missed appointment, $200 per day.</li>
          <li style="margin-bottom: 3px;">In case of missed delivery appointments, the carrier will have to compensate for storage or re-scheduling costs for all such loads.</li>
          <li style="margin-bottom: 3px;">Any damage to the load that might occur due to the negligence of the Driver at the time of loading / unloading or during transit is to be paid by the Appointed Carrier / driver.</li>
          <li style="margin-bottom: 3px;">Whilst loading, the driver must do a piece count & inspect the condition of the load. Driver shall not leave the shipper without picking up complete load & getting our BOL signed from the site.</li>
          <li style="margin-bottom: 3px;">Please ensure our BOL is presented and signed at delivery for POD. Using any other paperwork will result in a $100 penalty.</li>
          <li style="margin-bottom: 3px;">Pictures are required at the time of Unloading/Loading of the Container/Trailor and once the Delivery is completed pictures for empty/loaded container/trailor is mandatory. Failure to do so will result in $50 penalty.</li>
          <li style="margin-bottom: 3px;">Assigned Carriers /drivers /dispatchers shall not contact the shipper or consignee directly under any conditions.</li>
          <li style="margin-bottom: 3px;">Assigned Carrier is required to ensure that seals, if attached on the loads are not tempered with at any given time. If seal is required to be removed, it should only be done by the receiver.</li>
          <li style="margin-bottom: 3px;">Re-assigning / Double Brokering / Interlining / Warehousing of this load is strictly prohibited until & unless a written consent for the same is obtained from us. This may lead to deferred payments to the contracted carrier plus we might report you to the authorities & pull a Freight Card against you.</li>
          <li style="margin-bottom: 3px;">All detentions due to missed appointments or late arrivals are to be paid by the driver.</li>
          <li style="margin-bottom: 3px;">A standard fee of $300 per day shall be implied in case you hold our freight hostage for whatsoever reason.</li>
          <li style="margin-bottom: 3px;">Macro-point is required as long as it has been requested by the customer. Macro point must be accepted/activated with the actual driver</li>
          <li style="margin-bottom: 3px;">Follow safety protocols at times. Wear masks at the time of pick-up & drop off. In case of FSD loads, drivers are required to wear Hard hats, safety glasses, and safety vests when in facility.</li>
          <li style="margin-bottom: 3px;">For all loads booked as FTL, trailers are exclusive & no LTL/ Partial loads can be added to it. Payments will be voided if LTL loads are added.</li>
          <li style="margin-bottom: 3px;">Any damage to the load that might occur due to the negligence of the Driver at the time of loading / unloading or during transit is to be paid by the Appointed Carrier.</li>
          <li style="margin-bottom: 3px;">Should there be any damage or loss to the freight during the load movement, the carrier is inclined to pay for complete loss as demanded by the Shipper</li>
          <li style="margin-bottom: 3px;">In case if we book a load with you & you are unable to keep up to the commitment and deliver the services, you are liable to pay us $100 for the time & losses that we had to incur on that load.</li>
          <li style="margin-bottom: 3px;">Freight charges payments shall be made when we receive POD and carrier invoice within 48 hours of the load delivery. Payment will be made 30 days after all required paperwork is received by our accounts department.</li>
          <li style="margin-bottom: 3px;">Any additional charge receipts such as for detention, lumper & overtime are to be submitted along with the POD within 72 hours of freight delivery along with the required documentation to arrange for the reimbursement.</li>
          <li style="margin-bottom: 3px;">If under any circumstances load gets delayed by 1-2 days and the temperature is maintained as an agreed term, there would be no claim entertained on that load.</li>
        </ol>

        <h3 style="font-size: 13px; font-weight: bold; margin: 15px 0 8px 0; color: #2c3e50;">Additional information</h3>
        <p style="margin-bottom: 10px;">
          After the successful completion of the load / empty trailer delivery, if the carrier is unable to submit invoices & complete documentation as per
          the set time frames, deductions as below will be applicable:
        </p>
        <ul style="margin-left: 15px; margin-bottom: 15px;">
          <li style="margin-bottom: 4px;">In case, documents are not submitted within 1 day of the load delivery, $100 shall be deducted</li>
          <li style="margin-bottom: 4px;">In case, documents are not submitted within 2 days, $150 shall be deducted</li>
          <li style="margin-bottom: 4px;">In case, documents are not submitted within 5 days, $250 shall be deducted</li>
        </ul>

        <p style="font-weight: bold; margin-top: 20px; padding: 10px; background-color: #f8f9fa; border-left: 4px solid #2c3e50;">
          DOCUMENTS BE MUST CLEAR AND LEGIBLE. POD'S MUST BE SENT VIA E-MAIL OR FAX WITHIN 24 HRS OF THE DELIVERY
          FOR STRAIGHT THROUGH DELIVERIES AND WITHIN 3 HOURS FOR FIXED APPOINTMENT DELIVERIES
          WITH OUR LOAD NUMBER CLEARLY NOTED ON THE TOP OF IT
        </p>
      </div>
    </div>
  </div>

  <!-- Bottom: Total with signature -->
  ${amountBottomBlockHTML}
</body>
</html>
      `;

      printWindow.document.write(confirmationHTML);
      printWindow.document.close();
      printWindow.onload = function () {
        printWindow.print();
        printWindow.close();
      };
      setToast({ open: true, severity: 'success', msg: 'Rate and Load Confirmation PDF generated successfully!' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      setToast({ open: true, severity: 'error', msg: 'Failed to generate PDF. Please try again.' });
    }
  };

  // Generate Invoice PDF function
  const generateInvoicePDF = async (order) => {
    try {
      // Fetch shipment images and additional documents
      let shipmentImages = null;
      let additionalDocs = [];
      
      try {
        const shipmentNo = order?.loadReference?.shipmentNumber;
        if (shipmentNo) {
          const imgResp = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/load/shipment/${shipmentNo}/images`, { headers });
          shipmentImages = imgResp?.data || null;
        }
      } catch (e) {
        console.warn('Could not fetch shipment images:', e);
      }

      try {
        const docResp = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/do/do/${order._id}/additional-documents`, { headers });
        additionalDocs = docResp?.data?.data?.documents || docResp?.data?.additionalDocuments || [];
      } catch (e) {
        console.warn('Could not fetch additional documents:', e);
      }

      const printWindow = window.open('', '_blank');

      // ---- Bill To + Address (from shippers list if available) ----
      const cust = order?.customers?.[0] || {};
      const companyName = (cust.billTo || '').trim();
      const billToDisplay = [companyName || 'N/A'].filter(Boolean).join('<br>');
      const workOrderNo = cust.workOrderNo || 'N/A';
      const invoiceNo = order.doNum || cust.loadNo || 'N/A';
      const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });

      // ---- ONLY customer rates ----
      const LH = Number(cust.lineHaul) || 0;
      const FSC = Number(cust.fsc) || 0;
      const OTH = Number(cust.other) || 0;
      const CUSTOMER_TOTAL = LH + FSC + OTH;

      // helpers
      const fmtDate = (d) => {
        if (!d) return 'N/A';
        try {
          const dt = new Date(d);
          if (Number.isNaN(dt.getTime())) return 'Invalid Date';
          // Sirf date; UTC use kiya to avoid timezone issues
          return dt.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'UTC'
          });
        } catch (error) {
          console.error('Error formatting date:', error, d);
          return 'Invalid Date';
        }
      };

      const fullAddr = (loc) =>
        [loc?.address, loc?.city, loc?.state, loc?.zipCode].filter(Boolean).join(', ') || 'N/A';

      const pickRows = Array.isArray(order?.shipper?.pickUpLocations) ? order.shipper.pickUpLocations : [];
      const dropRows = Array.isArray(order?.shipper?.dropLocations) ? order.shipper.dropLocations : [];

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Delivery Order Invoice</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;line-height:1.4;color:#333;background:#fff;font-size:12px}
  .invoice{max-width:800px;margin:0 auto;background:#fff;padding:20px}
  .header{display:flex;gap:16px;align-items:flex-start;margin-bottom:16px;border-bottom:1px solid #333;padding-bottom:12px}
  .logo{width:140px;height:90px;object-fit:contain;flex:0 0 auto}
  .header-right{flex:1 1 auto}
  .billto{border-collapse:collapse;width:65%;font-size:12px;margin-left:auto}
  .billto th,.billto td{border:1px solid #ddd;padding:6px;text-align:left;vertical-align:top}
  .billto th{background:#f5f5f5;font-weight:bold;width:35%}
  .section{margin-top:14px}
  .tbl{width:100%;border-collapse:collapse;margin-top:8px}
  .tbl th,.tbl td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}
  .amount{text-align:right;font-weight:bold}
  .total-row{background:#fff;color:#000;font-weight:bold;font-size:14px}
  .total-row td{border-top:2px solid #000;padding:12px}
  .images-section{page-break-before: always; margin-top: 20px; padding: 15px 10px; background: #fafafa;}
  .images-main-title{text-align: center; margin-bottom: 20px; font-size: 18px; font-weight: bold; color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 10px; letter-spacing: 0.5px; page-break-after: avoid;}
  .image-section-container{margin-bottom: 20px; padding: 15px; background: #fff; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.06);}
  .image-grid{display: flex; flex-direction: column; gap: 20px; margin-top: 12px;}
  .image-item{page-break-inside: avoid; page-break-after: avoid; border: 1.5px solid #e0e0e0; padding: 20px; border-radius: 6px; text-align: center; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.08); margin-bottom: 20px; width: 100%;}
  .image-item img{width: 100%; max-width: 600px; height: auto; max-height: 700px; object-fit: contain; border-radius: 4px; margin-bottom: 10px; border: 1px solid #e8e8e8; display: block; margin-left: auto; margin-right: auto;}
  .image-item p{font-size: 12px; color: #555; margin: 0; font-weight: 500; padding-top: 8px;}
  .section-title{page-break-after: avoid; font-size: 15px; font-weight: bold; margin-bottom: 12px; color: #1a1a1a; border-left: 4px solid #4caf50; padding: 8px 10px; background: linear-gradient(to right, rgba(76, 175, 80, 0.08), transparent); border-radius: 4px;}
  .section-title.drop{border-left-color: #2196f3; background: linear-gradient(to right, rgba(33, 150, 243, 0.08), transparent);}
  .section-title.additional{border-left-color: #ff9800; background: linear-gradient(to right, rgba(255, 152, 0, 0.08), transparent);}
  .no-images-msg{text-align: center; color: #888; margin: 15px 0; font-style: italic; padding: 12px; background: #f5f5f5; border-radius: 6px;}
  @media print{@page{margin:0;size:A4}}
</style>
</head>
<body>
  <div class="invoice">
    <!-- HEADER: logo (left) + Bill To table (right) -->
    <div class="header">
      <div style="width:140px; height:90px; display:flex; align-items:center; justify-content:center; background:#f0f0f0; border:1px solid #ddd;">
        <img src="${logoSrc}" alt="Company Logo" class="logo" style="max-width:100%; max-height:100%; object-fit:contain;" 
             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"/>
        <div style="display:none; text-align:center; color:#666; font-size:12px;">
          <div style="font-weight:bold;">COMPANY</div>
          <div>LOGO</div>
        </div>
      </div>
      <div class="header-right">
        <table class="billto">
          <tr><th>Bill To</th><td>${billToDisplay}</td></tr>
          <tr><th>W/O (Ref)</th><td>${workOrderNo}</td></tr>
          <tr><th>Invoice Date</th><td>${todayStr}</td></tr>
          <tr><th>Invoice No</th><td>${invoiceNo}</td></tr>
        </table>
      </div>
    </div>

    <!-- Pick Up Locations -->
    <div class="section">
      <table class="tbl">
        <thead>
          <tr>
            <th>Pick Up Location</th>
            <th>Address</th>
            <th>Weight (lbs)</th>
            <th>Container No</th>
            <th>Container Type</th>
            <th>Qty</th>
            <th>Pickup Date</th>
          </tr>
        </thead>
        <tbody>
          ${pickRows.map(l => {
        const weight = (l?.weight ?? '') !== '' && l?.weight !== null ? l.weight : 'N/A';
        const contNo = l?.containerNo || order.shipper?.containerNo || 'N/A';
        const contTp = l?.containerType || order.shipper?.containerType || 'N/A';
        const qty = Number(l?.quantity ?? order.shipper?.quantity) || 1;
        const dateSrc = l?.pickUpDate || order.shipper?.pickUpDate;
        return `
              <tr>
                <td>${l?.name || 'N/A'}</td>
                <td>${fullAddr(l)}</td>
                <td>${weight}</td>
                <td>${contNo}</td>
                <td>${contTp}</td>
                <td>${qty}</td>
                <td>${fmtDate(dateSrc)}</td>
              </tr>
            `;
      }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Drop Locations -->
    <div class="section">
      <table class="tbl">
        <thead>
          <tr>
            <th>Drop Location</th>
            <th>Address</th>
            <th>Weight (lbs)</th>
            <th>Container No</th>
            <th>Container Type</th>
            <th>Qty</th>
            <th>Drop Date</th>
          </tr>
        </thead>
        <tbody>
          ${dropRows.map(l => {
        const weight = (l?.weight ?? '') !== '' && l?.weight !== null ? l.weight : 'N/A';
        const contNo = l?.containerNo || order.shipper?.containerNo || 'N/A';
        const contTp = l?.containerType || order.shipper?.containerType || 'N/A';
        const qty = Number(l?.quantity ?? order.shipper?.quantity) || 1;
        const dateSrc = l?.dropDate || order.shipper?.dropDate;
        return `
              <tr>
                <td>${l?.name || 'N/A'}</td>
                <td>${fullAddr(l)}</td>
                <td>${weight}</td>
                <td>${contNo}</td>
                <td>${contTp}</td>
                <td>${qty}</td>
                <td>${fmtDate(dateSrc)}</td>
              </tr>
            `;
      }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Charges: ONLY customer information rates -->
    <div class="section">
      <table class="tbl">
        <thead><tr><th>Description</th><th>Amount</th></tr></thead>
        <tbody>
          ${LH > 0 ? `<tr><td>Line Haul</td><td class="amount">$${LH.toLocaleString()}</td></tr>` : ''}
          ${FSC > 0 ? `<tr><td>FSC</td><td class="amount">$${FSC.toLocaleString()}</td></tr>` : ''}
          ${OTH > 0 ? `<tr><td>Other</td><td class="amount">$${OTH.toLocaleString()}</td></tr>` : ''}
          <tr class="total-row">
            <td><strong>TOTAL</strong></td>
            <td class="amount"><strong>$${CUSTOMER_TOTAL.toLocaleString()} USD</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">Thank you for your business!</div>
  </div>

  <!-- Images Section - New Page -->
  <div class="images-section">
    <h2 class="images-main-title">SHIPMENT IMAGES</h2>
    
    ${(() => {
      const images = shipmentImages?.images;
      if (!images) return '<p class="no-images-msg">No shipment images available</p>';
      
      // Pickup Images
      const pickupImages = [
        ...(images.emptyTruckImages || []),
        ...(images.loadedTruckImages || []),
        ...(images.podImages || []),
        ...(images.eirTickets || []),
        ...(images.containerImages || []),
        ...(images.sealImages || []),
      ];

      // Drop Images
      const dropImages = [
        ...(images.dropLocationImages?.podImages || []),
        ...(images.dropLocationImages?.loadedTruckImages || []),
        ...(images.dropLocationImages?.dropLocationImages || []),
        ...(images.dropLocationImages?.emptyTruckImages || []),
      ];

      // Additional Images (from additionalDocuments)
      const additionalImages = (additionalDocs || [])
        .filter(doc => {
          const url = doc?.documentUrl || '';
          return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url);
        })
        .map(doc => doc.documentUrl);

      let htmlSection = '';
      let totalImageIndex = 0;

      // Pickup Images Section - Each image on separate page
      if (pickupImages.length > 0) {
        htmlSection += pickupImages.map((img, idx) => {
          const isFirst = idx === 0;
          return `
            <div class="image-item" style="${isFirst ? '' : 'page-break-before: always;'}">
              ${isFirst ? '<h3 class="section-title" style="page-break-after: avoid; margin-bottom: 15px;">Pickup Images</h3>' : ''}
              <img src="${img}" alt="Pickup Image ${idx + 1}" 
                   onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
              <div style="display: none; padding: 50px 10px; color: #999; font-size: 11px; background: #f5f5f5; border-radius: 6px;">Image ${idx + 1}<br>Failed to load</div>
              <p>Pickup Image ${idx + 1}</p>
            </div>
          `;
        }).join('');
        totalImageIndex += pickupImages.length;
      }

      // Drop Images Section - Each image on separate page
      if (dropImages.length > 0) {
        htmlSection += dropImages.map((img, idx) => {
          const isFirstInSection = idx === 0;
          return `
            <div class="image-item" style="page-break-before: always;">
              ${isFirstInSection ? '<h3 class="section-title drop" style="page-break-after: avoid; margin-bottom: 15px;">Drop Images</h3>' : ''}
              <img src="${img}" alt="Drop Image ${idx + 1}" 
                   onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
              <div style="display: none; padding: 50px 10px; color: #999; font-size: 11px; background: #f5f5f5; border-radius: 6px;">Image ${idx + 1}<br>Failed to load</div>
              <p>Drop Image ${idx + 1}</p>
            </div>
          `;
        }).join('');
        totalImageIndex += dropImages.length;
      }

      // Additional Images Section - Each image on separate page
      if (additionalImages.length > 0) {
        htmlSection += additionalImages.map((img, idx) => {
          const isFirstInSection = idx === 0;
          return `
            <div class="image-item" style="page-break-before: always;">
              ${isFirstInSection ? '<h3 class="section-title additional" style="page-break-after: avoid; margin-bottom: 15px;">Additional Documents</h3>' : ''}
              <img src="${img}" alt="Additional Image ${idx + 1}" 
                   onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
              <div style="display: none; padding: 50px 10px; color: #999; font-size: 11px; background: #f5f5f5; border-radius: 6px;">Image ${idx + 1}<br>Failed to load</div>
              <p>Additional Image ${idx + 1}</p>
            </div>
          `;
        }).join('');
      }

      if (!pickupImages.length && !dropImages.length && !additionalImages.length) {
        return '<p class="no-images-msg">No images available for this shipment</p>';
      }

      return htmlSection;
    })()}
  </div>
</body>
</html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = function () {
        printWindow.print();
        printWindow.close();
      };
      setToast({ open: true, severity: 'success', msg: 'Invoice PDF generated successfully!' });
    } catch (err) {
      console.error('Error generating PDF:', err);
      setToast({ open: true, severity: 'error', msg: 'Failed to generate PDF. Please try again.' });
    }
  };

  // Generate BOL PDF function
  const generateBolPDF = (orderInput) => {
    // ---------- SAFE DEFAULTS ----------
    const order = orderInput || {};
    const shipper = order.shipper || {};
    const pickupLocs = Array.isArray(shipper.pickUpLocations) ? shipper.pickUpLocations : [];
    const dropLocs = Array.isArray(shipper.dropLocations) ? shipper.dropLocations : [];

    // Multi-key Load Number (first available)
    const getLoadNumber = () => {
      // 1) customers[].loadNo (pehle non-empty lo)
      const fromCustomers = Array.isArray(order?.customers)
        ? (order.customers.map(c => (c?.loadNo || '').trim()).find(v => v))
        : null;

      // 2) table/list me aksar doNum me loadNo aa jata hai
      const fromDoNum = (order?.doNum || '').trim();

      // 3) legacy/other fields
      const fromOrder =
        (order?.loadNo || order?.loadNumber || order?.loadId || order?.referenceNo || '').trim();
      const fromShipper =
        (shipper?.loadNo || shipper?.loadNumber || '').trim();

      // 4) (optional) last fallback: workOrderNo (agar chaho)
      const fromWON =
        Array.isArray(order?.customers)
          ? (order.customers.map(c => (c?.workOrderNo || '').trim()).find(v => v) || '')
          : '';

      // priority: customers.loadNo → doNum → order.* → shipper.* → workOrderNo → 'N/A'
      return fromCustomers || fromDoNum || fromOrder || fromShipper || fromWON || 'N/A';
    };

    // NEW: Collect BOL(s)
    const bolLine = (() => {
      const arr = [];
      if (Array.isArray(order?.bols)) {
        order.bols.forEach(b => {
          const v = typeof b === 'string' ? b : (b?.bolNo || b?.number || '');
          if (v && String(v).trim()) arr.push(String(v).trim());
        });
      }
      if (!arr.length && order?.bolInformation) arr.push(String(order.bolInformation));
      return arr.length ? Array.from(new Set(arr)).join(', ') : 'N/A';
    })();

    // Use your actual logo
    const safeLogo = logoSrc;

    // ---------- HELPERS ----------
    const fmtDate = (d) => {
      if (!d) return 'N/A';
      const dt = new Date(d);
      return isNaN(dt)
        ? 'N/A'
        : dt.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    };

    const fmtTime = (d) => {
      if (!d) return '';
      const dt = new Date(d);
      return isNaN(dt)
        ? ''
        : dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const fmtAddr = (loc) => {
      if (!loc || typeof loc !== 'object') return 'N/A';
      const parts = [loc.name, loc.address, loc.city, loc.state, loc.zipCode].filter(Boolean);
      return parts.length ? parts.join(', ') : 'N/A';
    };

    const rowsLen = Math.max(pickupLocs.length, dropLocs.length);

    // Truck In/Out (blank lines if not present)
    const truckIn = fmtTime(order.truckInTime);
    const truckOut = fmtTime(order.truckOutTime);

    // ---------- HTML ----------
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Bill of Lading</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; line-height:1.4; color:#333; background:#fff; font-size:12px; }
  .container { max-width:800px; margin:0 auto; padding:20px; }
  .header { display:flex; justify-content:space-between; align-items:start; margin-bottom:20px; }
  .logo { width:140px; height:90px; object-fit:contain; }
  .section { margin-bottom:20px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
  .box { border:1px solid #ccc; padding:15px; border-radius:8px; }
  .box-title { font-weight:bold; margin-bottom:10px; color:#2c3e50; }
  .field { margin-bottom:8px; }
  .label { font-weight:bold; color:#666; }
  .value { margin-left:5px; }
  table { width:100%; border-collapse:collapse; margin:15px 0; }
  th, td { border:1px solid #ddd; padding:8px; text-align:left; }
  th { background:#f5f5f5; }
  .footer { margin-top:30px; padding-top:20px; border-top:1px solid #ddd; }
  .signatures { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:20px; }
  .signature-box { border-top:1px solid #999; padding-top:5px; margin-top:50px; }
  .time-row { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:10px; }
  .line { display:inline-block; min-width:140px; border-bottom:1px solid #999; padding:0 6px; }
  @media print { @page { margin: 0.5cm; } }
</style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div style="width:140px; height:90px; display:flex; align-items:center; justify-content:center; background:#f0f0f0; border:1px solid #ddd;">
        <img src="${safeLogo}" alt="Company Logo" class="logo" style="max-width:100%; max-height:100%; object-fit:contain;" 
             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"/>
        <div style="display:none; text-align:center; color:#666; font-size:12px;">
          <div style="font-weight:bold;">COMPANY</div>
          <div>LOGO</div>
        </div>
      </div>
      <div style="text-align:right;">
        <h2 style="color:#2c3e50; margin-bottom:5px;">BILL OF LADING</h2>
        <p>Date: ${fmtDate(new Date())}</p>
        <p>BOL Number(s): ${bolLine}</p>           <!-- UPDATED: BOLs -->
        <p>Load Number: ${getLoadNumber()}</p>     <!-- NEW: Load No -->
        <p>DO ID: ${order._id || 'N/A'}</p>
      </div>
    </div>

    <!-- Shipper Info -->
    <div class="grid">
      <div class="box">
        <div class="box-title">Shipper Information</div>
        <div class="field"><span class="label">Name:</span><span class="value">${shipper.name || 'N/A'}</span></div>
        <div class="field"><span class="label">Container No:</span><span class="value">${shipper.containerNo || 'N/A'}</span></div>
        <div class="field"><span class="label">Container Type:</span><span class="value">${shipper.containerType || 'N/A'}</span></div>
        <div class="field"><span class="label">Weight:</span><span class="value">${shipper.weight || 'N/A'}</span></div>
      </div>
      <div class="box">
        <div class="box-title">Order Information</div>
        <div class="field"><span class="label">DO ID:</span><span class="value">${order._id || 'N/A'}</span></div>
        <div class="field"><span class="label">Status:</span><span class="value">${order.status || 'N/A'}</span></div>
        <div class="field"><span class="label">Created:</span><span class="value">${fmtDate(order.createdAt)}</span></div>
        <div class="field"><span class="label">Updated:</span><span class="value">${fmtDate(order.updatedAt)}</span></div>
      </div>
    </div>

    <!-- Pickup & Delivery -->
    <div class="section">
      <table>
        <thead>
          <tr><th colspan="2">Pickup Location(s)</th><th colspan="2">Delivery Location(s)</th></tr>
        </thead>
        <tbody>
          <tr>
            <td style="width:25%"><strong>Address</strong></td>
            <td style="width:25%"><strong>Date </strong></td>
            <td style="width:25%"><strong>Address</strong></td>
            <td style="width:25%"><strong>Date </strong></td>
          </tr>
          ${rowsLen > 0
        ? Array.from({ length: rowsLen }).map((_, i) => {
          const pu = pickupLocs[i];
          const dr = dropLocs[i];
          const puDate = pu?.pickUpDate ? fmtDate(pu.pickUpDate) : 'N/A';
          const drDate = dr?.dropDate ? fmtDate(dr.dropDate) : 'N/A';
          return `
                  <tr>
                    <td>${pu ? fmtAddr(pu) : 'N/A'}</td>
                    <td>${puDate}</td>
                    <td>${dr ? fmtAddr(dr) : 'N/A'}</td>
                    <td>${drDate}</td>
                  </tr>`;
        }).join('')
        : '<tr><td colspan="4" style="text-align:center;">No locations specified</td></tr>'
      }
        </tbody>
      </table>
    </div>

    <!-- Freight Information (Load # included) -->
    <div class="section">
      <table>
        <thead>
          <tr>
            <th>Handling Units</th>
            <th>Load #</th>
            <th>Weight</th>
            <th>Description</th>
            <th>Special Instructions</th>
          </tr>
        </thead>
        <tbody>
          ${(pickupLocs.length ? pickupLocs : [{}]).map((loc) => `
              <tr>
                <td>1</td>
                <td>${getLoadNumber()}</td>
                <td>${loc?.weight ? loc.weight + ' lbs' : 'N/A'}</td>
                <td>${shipper.containerType || 'N/A'}</td>
                <td>${loc?.remarks || 'N/A'}</td>
              </tr>
            `).join('')
      }
        </tbody>
      </table>
    </div>

    <!-- Footer & Signatures -->
    <div class="footer">
      <!-- Arrival / Departure just ABOVE Shipper Signature -->
      <div class="box" style="margin-top:10px;">
        <div class="box-title">Arrival / Departure</div>
        <div class="time-row">
          <div class="field">
            <span class="label">Truck In Time:</span>
            <span class="value">${truckIn || '<span class="line">&nbsp;</span>'}</span>
          </div>
          <div class="field">
            <span class="label">Truck Out Time:</span>
            <span class="value">${truckOut || '<span class="line">&nbsp;</span>'}</span>
          </div>
        </div>
      </div>

      <div class="signatures">
        <div>
          <p><strong>Shipper Signature / Date</strong></p>
          <div class="signature-box">
            _____________________________________________<br>
            <span style="font-size:10px;">
              This is to certify that the above named materials are properly classified, packaged, marked, and labeled,
              and are in proper condition for transportation according to the applicable regulations of the DOT.
            </span>
          </div>
        </div>

        <div>
          <p><strong>Carrier Signature / Date</strong></p>
          <div class="signature-box">
            _____________________________________________<br>
            <span style="font-size:10px;">
              Carrier acknowledges receipt of packages and required placards. Carrier certifies emergency response information
              was made available and/or carrier has the DOT emergency response guidebook or equivalent documentation in the vehicle.
            </span>
          </div>
        </div>
      </div>

      <div style="margin-top:20px; font-size:10px;">
        <p>Note: Liability Limitation for loss or damage in this shipment may be applicable. See 49 U.S.C. § 14706(c)(1)(A) and (B).</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    // ---------- PRINT: popup first, then iframe fallback ----------
    const openAndPrint = (docTarget) => {
      docTarget.document.open();
      docTarget.document.write(html);
      docTarget.document.close();
      
      // Add a small delay to ensure content is loaded
      setTimeout(() => {
        docTarget.focus();
        docTarget.print();
        if (docTarget !== window && docTarget.close) {
          setTimeout(() => docTarget.close(), 1000);
        }
        setToast({ open: true, severity: 'success', msg: 'BOL PDF generated successfully!' });
      }, 500);
    };

    try {
      const printWindow = window.open('', '_blank', 'noopener,noreferrer');
      if (printWindow && !printWindow.closed) {
        openAndPrint(printWindow);
      } else {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        openAndPrint(iframe.contentWindow);
        setTimeout(() => iframe.remove(), 5000);
      }
    } catch (err) {
      console.error('Error generating BOL PDF:', err);
      setToast({ open: true, severity: 'error', msg: 'Failed to generate BOL PDF. Please try again.' });
    }
  };

  // Generate PDF function
  const generatePDF = async (type) => {
    if (!selected) {
      setToast({ open: true, severity: 'error', msg: 'No order selected. Please select an order first.' });
      return;
    }
    
    setPdfLoading(prev => ({ ...prev, [type]: true }));
    try {
      switch (type) {
        case 'invoice':
          generateInvoicePDF(selected);
          break;
        case 'rate':
          generateRateLoadConfirmationPDF(selected);
          break;
        case 'bol':
          generateBolPDF(selected);
          break;
        default:
          return;
      }
    } catch (e) {
      console.error(`Failed to generate ${type} PDF:`, e);
      setToast({ open: true, severity: 'error', msg: `Failed to generate ${type} PDF: ${e?.response?.data?.message || e?.message || 'Unknown error'}` });
    } finally {
      setPdfLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  // ===== API: Assigned to Accountant =====
  const fetchData = async (targetPage = 1) => {
    setLoading(true);
    setServerError("");
    try {
      const url = `${API_CONFIG.BASE_URL}/api/v1/accountant/assigned-to-accountant`;
      const resp = await axios.get(url, {
        params: { accountantEmpId: empId, page: targetPage, limit: 50 },
        headers,
      });
      const payload = resp?.data?.data || {};
      // prefer latest accountantUser from either API
      setAccountantUser(payload.accountantUser || null);
      setRows(payload.assignedDOs || []);
      if (payload.pagination) {
        setPagination(payload.pagination);
      } else {
        setPagination((p) => ({
          ...p,
          currentPage: 1,
          totalPages: 1,
          totalItems: (payload.assignedDOs || []).length,
        }));
      }
      // Update selected item if modal is open
      setTimeout(() => updateSelectedFromTable(), 100);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to fetch invoices.";
      setServerError(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // ===== API: Processed by Accountant (APPROVED tab) =====
  const fetchProcessed = async (targetPage = 1) => {
    setProcessedLoading(true);
    setProcessedError("");
    try {
      const url = `${API_CONFIG.BASE_URL}/api/v1/accountant/processed-by-accountant`;
      const resp = await axios.get(url, {
        params: { accountantEmpId: empId, page: targetPage, limit: 50 }, // status removed
        headers,
      });
      const payload = resp?.data?.data || {};
      // ensure accountantUser populated even if only processed API hits
      setAccountantUser((prev) => prev || payload.accountantUser || null);
      setProcessedRows(payload.processedDOs || []);
      if (payload.pagination) {
        setProcessedPagination(payload.pagination);
      } else {
        setProcessedPagination((p) => ({
          ...p,
          currentPage: 1,
          totalPages: 1,
          totalItems: (payload.processedDOs || []).length,
        }));
      }
      // Update selected item if modal is open
      setTimeout(() => updateSelectedFromTable(), 100);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to fetch processed DOs.";
      setProcessedError(msg);
      setProcessedRows([]);
    } finally {
      setProcessedLoading(false);
    }
  };

  // ===== API: Approved By Sales (Sales Verified) =====
  const fetchAccepted = async (targetPage = 1) => {
    setAcceptedLoading(true);
    setAcceptedError("");
    try {
      const url = `${API_CONFIG.BASE_URL}/api/v1/accountant/finance/sales-verified-dos`;
      const resp = await axios.get(url, {
        params: { accountantEmpId: empId, page: targetPage, limit: 50 },
        headers,
      });
      const payload = resp?.data?.data || {};
      // ensure accountantUser populated even if only accepted API hits
      setAccountantUser((prev) => prev || payload.financeEmployee || null);
      const salesVerifiedDOs = payload.salesVerifiedDOs || [];
      
      // Log paid DOs for debugging
      const paidDOs = salesVerifiedDOs.filter(doItem => {
        const billPaid = doItem?.paymentStatus?.status === 'paid';
        const carrierPaid = doItem?.carrierPaymentStatus?.status === 'paid';
        return billPaid || carrierPaid;
      });
      
      if (paidDOs.length > 0) {
        console.log(`📊 Found ${paidDOs.length} paid DO(s) out of ${salesVerifiedDOs.length} total:`, {
          total: salesVerifiedDOs.length,
          paid: paidDOs.length,
          unpaid: salesVerifiedDOs.length - paidDOs.length,
          paidDOs: paidDOs.map(doItem => ({
            doId: doItem._id,
            loadNo: doItem?.customers?.[0]?.loadNo || 'N/A',
            billTo: doItem?.customers?.[0]?.billTo || doItem?.customerName || 'N/A',
            billPaid: doItem?.paymentStatus?.status === 'paid',
            carrierPaid: doItem?.carrierPaymentStatus?.status === 'paid',
            carrierTotalPaid: doItem?.carrierPaymentStatus?.totalPaidAmount || 0,
            carrierTotal: doItem?.carrier?.totalCarrierFees || 0
          }))
        });
      }
      
      setAcceptedRows(salesVerifiedDOs);
      if (payload.pagination) {
        setAcceptedPagination(payload.pagination);
      } else {
        setAcceptedPagination((p) => ({
          ...p,
          currentPage: 1,
          totalPages: 1,
          totalItems: (payload.salesVerifiedDOs || []).length,
        }));
      }
      // Update selected item if modal is open
      setTimeout(() => updateSelectedFromTable(), 100);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to fetch approved DOs.";
      setAcceptedError(msg);
      setAcceptedRows([]);
    } finally {
      setAcceptedLoading(false);
    }
  };

  // ===== API: Rejected by Sales =====
  const fetchRejected = async (targetPage = 1) => {
    setRejectedLoading(true);
    setRejectedError("");
    try {
      const url = `${API_CONFIG.BASE_URL}/api/v1/accountant/accountant/rejected-by-sales`;
      const resp = await axios.get(url, {
        params: { accountantEmpId: empId, page: targetPage, limit: 50 },
        headers,
      });
      const payload = resp?.data?.data || {};
      // ensure accountantUser populated even if only rejected API hits
      setAccountantUser((prev) => prev || payload.accountantUser || null);
      setRejectedRows(payload.rejectedDOs || []);
      if (payload.pagination) {
        setRejectedPagination(payload.pagination);
      } else {
        setRejectedPagination((p) => ({
          ...p,
          currentPage: 1,
          totalPages: 1,
          totalItems: (payload.rejectedDOs || []).length,
        }));
      }
      // Update selected item if modal is open
      setTimeout(() => updateSelectedFromTable(), 100);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to fetch rejected DOs.";
      setRejectedError(msg);
      setRejectedRows([]);
    } finally {
      setRejectedLoading(false);
    }
  };

  // ===== Shipment images by shipmentNumber =====
  const fetchShipmentImages = async (shipmentNumber) => {
    if (!shipmentNumber) {
      setShipImgs(null);
      return;
    }
    setShipImgsLoading(true);
    setShipImgsErr("");
    try {
      const url = `${API_CONFIG.BASE_URL}/api/v1/load/shipment/${shipmentNumber}/images`;
      const resp = await axios.get(url, { headers });
      setShipImgs(resp?.data || null);
    } catch (e) {
      setShipImgsErr(e?.response?.data?.message || e?.message || "Failed to load shipment images");
      setShipImgs(null);
    } finally {
      setShipImgsLoading(false);
    }
  };

  // ===== Additional docs by DO id =====
  const fetchAdditionalDocs = async (doId) => {
    if (!doId) {
      setAddDocs([]);
      return;
    }
    setAddDocsLoading(true);
    setAddDocsErr("");
    try {
      const url = `${API_CONFIG.BASE_URL}/api/v1/do/do/${doId}/additional-documents`;
      const resp = await axios.get(url, { headers });
      const docs = resp?.data?.data?.documents || [];
      setAddDocs(docs);
    } catch (e) {
      setAddDocsErr(e?.response?.data?.message || e?.message || "Failed to load additional documents");
      setAddDocs([]);
    } finally {
      setAddDocsLoading(false);
    }
  };

  // ===== POST: Accountant approval (Approve) =====
  const postAccountantApproval = async () => {
    if (!selected?._id) {
      setToast({ open: true, severity: "error", msg: "No DO selected." });
      return;
    }

    setPosting(true);
    try {
      const url = `${API_CONFIG.BASE_URL}/api/v1/accountant/approval`;
      const body = {
        doId: selected._id,
        accountantEmpId: empId,
        action: "approve",
        remarks: approvalRemarks || "All details verified and approved",
      };
      const resp = await axios.post(url, body, { headers });

      const baseMsg = resp?.data?.message || "Action completed";
      const successMsg = `${baseMsg}. Check the "Accountant Approved" tab to see the approved DO.`;
      setToast({ open: true, severity: "success", msg: successMsg });

      const newApproval = resp?.data?.data?.accountantApproval;
      const updatedSelected = {
        ...selected,
        assignmentStatus: resp?.data?.data?.assignmentStatus || selected.assignmentStatus,
        accountantApproval: newApproval || selected.accountantApproval,
      };
      setSelected(updatedSelected);

      // refresh both tabs to ensure approved DOs are visible
      if (activeTab === 0) {
        fetchData(page);
        fetchProcessed(processedPage); // Also refresh approved tab
        // Switch to approved tab to show the result
        setTimeout(() => setActiveTab(1), 500);
      } else {
        fetchProcessed(processedPage);
        fetchData(page); // Also refresh assigned tab
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to submit approval";
      setToast({ open: true, severity: "error", msg });
    } finally {
      setPosting(false);
    }
  };

  // ===== POST: Resubmit to Sales =====
  const postResubmitToSales = async () => {
    if (!selected?._id) {
      setToast({ open: true, severity: "error", msg: "No DO selected." });
      return;
    }

    setResubmitPosting(true);
    try {
      const url = `${API_CONFIG.BASE_URL}/api/v1/accountant/accountant/resubmit-to-sales`;
      const body = {
        doId: selected._id,
        accountantEmpId: empId,
        corrections: resubmitCorrections || undefined,
        remarks: resubmitRemarks || undefined,
      };
      const resp = await axios.post(url, body, { headers });

      const msg = resp?.data?.message || "DO resubmitted to sales successfully";
      setToast({ open: true, severity: "success", msg });

      // refresh rejected tab silently
      fetchRejected(rejectedPage);
      
      // close modal
      setDetailsOpen(false);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to resubmit to sales";
      setToast({ open: true, severity: "error", msg });
    } finally {
      setResubmitPosting(false);
    }
  };

  // ===== PUT: Edit DO Details =====
  const editDODetails = async (editFormData) => {
    if (!editData?._id) {
      setToast({ open: true, severity: "error", msg: "No DO selected for editing." });
      return;
    }

    setEditLoading(true);
    try {
      const url = `${API_CONFIG.BASE_URL}/api/v1/accountant/edit-do-details`;
      const body = {
        doId: editData._id,
        accountantEmpId: empId,
        customers: editFormData.customers,
        carrier: editFormData.carrier
      };
      
      const resp = await axios.put(url, body, { headers });
      
      const msg = resp?.data?.message || "DO details updated successfully";
      setToast({ open: true, severity: "success", msg });
      
      // Refresh current tab data
      if (activeTab === 0) {
        fetchData(page);
      } else if (activeTab === 1) {
        fetchProcessed(processedPage);
      } else if (activeTab === 2) {
        fetchAccepted(acceptedPage);
      } else if (activeTab === 3) {
        fetchRejected(rejectedPage);
      }
      
      // Close edit modal
      setEditOpen(false);
      setEditData(null);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to update DO details";
      setToast({ open: true, severity: "error", msg });
    } finally {
      setEditLoading(false);
    }
  };

  // ===== Open Edit Modal =====
  const openEditModal = (row) => {
    setEditData(row);
    setEditOpen(true);
  };

  const openPaymentModal = (row) => {
    setPaymentData(row);
    setPaymentForm({
      paymentMethod: '',
      paymentReference: '',
      paymentNotes: '',
      paymentProof: null
    });
    setPaymentModalOpen(true);
  };

  const openShortPayModal = (row) => {
    setShortPayData(row);
    const totals = computeTotals(row);
    const carrierPaymentStatus = row?.carrierPaymentStatus || {};
    const totalPaid = carrierPaymentStatus?.totalPaidAmount || 0;
    const remaining = totals.carrierTotal - totalPaid;
    
    setShortPayForm({
      paymentAmount: '',
      paymentMethod: '',
      paymentReference: '',
      paymentNotes: '',
      carrierPaymentProof: null
    });
    setShortPayModalOpen(true);
  };

  const handlePaymentSubmit = async () => {
    if (!paymentData) return;

    // Validation
    if (!paymentForm.paymentMethod) {
      setToast({ open: true, severity: "error", msg: "Please select a payment method" });
      return;
    }
    if (!paymentForm.paymentProof) {
      setToast({ open: true, severity: "error", msg: "Please upload payment proof document" });
      return;
    }

    setPaymentLoading(true);
    try {
      const formData = new FormData();
      formData.append('doId', paymentData._id);
      formData.append('accountantEmpId', empId);
      formData.append('paymentMethod', paymentForm.paymentMethod);
      if (paymentForm.paymentReference) {
        formData.append('paymentReference', paymentForm.paymentReference);
      }
      if (paymentForm.paymentNotes) {
        formData.append('paymentNotes', paymentForm.paymentNotes);
      }
      // Use carrierPaymentProof as per API documentation
      formData.append('carrierPaymentProof', paymentForm.paymentProof);

      // Use mark-carrier-as-paid endpoint as per API documentation
      const url = `${API_CONFIG.BASE_URL}/api/v1/accountant/mark-carrier-as-paid`;
      const resp = await axios.post(url, formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (resp?.data?.success) {
        const isFullyPaid = resp?.data?.data?.carrierPaymentStatus?.status === 'paid';
        const message = resp?.data?.message || (isFullyPaid ? "Carrier payment marked as paid successfully!" : "Payment recorded successfully!");
        setToast({ open: true, severity: "success", msg: message });
        setPaymentModalOpen(false);
        // Refresh the data
        fetchAccepted();
      } else {
        setToast({ open: true, severity: "error", msg: resp?.data?.message || "Failed to mark carrier as paid" });
      }
    } catch (error) {
      const errorMsg = error?.response?.data?.message || error?.message || "Failed to mark as paid";
      setToast({ open: true, severity: "error", msg: errorMsg });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleShortPaySubmit = async () => {
    if (!shortPayData) return;

    // Validation
    if (!shortPayForm.paymentAmount || parseFloat(shortPayForm.paymentAmount) <= 0) {
      setToast({ open: true, severity: "error", msg: "Please enter a valid payment amount" });
      return;
    }
    if (!shortPayForm.paymentMethod) {
      setToast({ open: true, severity: "error", msg: "Please select a payment method" });
      return;
    }
    if (!shortPayForm.carrierPaymentProof) {
      setToast({ open: true, severity: "error", msg: "Please upload payment proof document" });
      return;
    }

    const totals = computeTotals(shortPayData);
    const carrierPaymentStatus = shortPayData?.carrierPaymentStatus || {};
    const totalPaid = carrierPaymentStatus?.totalPaidAmount || 0;
    const remaining = totals.carrierTotal - totalPaid;
    const paymentAmount = parseFloat(shortPayForm.paymentAmount);

    // Allow small rounding differences (0.01 tolerance)
    if (paymentAmount > remaining + 0.01) {
      setToast({ 
        open: true, 
        severity: "error", 
        msg: `Payment amount ($${paymentAmount.toFixed(2)}) exceeds remaining amount ($${remaining.toFixed(2)})` 
      });
      return;
    }

    setShortPayLoading(true);
    try {
      const formData = new FormData();
      formData.append('doId', shortPayData._id);
      formData.append('accountantEmpId', empId);
      formData.append('paymentAmount', paymentAmount);
      formData.append('paymentMethod', shortPayForm.paymentMethod);
      if (shortPayForm.paymentReference) {
        formData.append('paymentReference', shortPayForm.paymentReference);
      }
      if (shortPayForm.paymentNotes) {
        formData.append('paymentNotes', shortPayForm.paymentNotes);
      }
      formData.append('carrierPaymentProof', shortPayForm.carrierPaymentProof);

      const url = `${API_CONFIG.BASE_URL}/api/v1/accountant/short-pay-carrier`;
      const resp = await axios.post(url, formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (resp?.data?.success) {
        const isFullyPaid = resp?.data?.data?.isFullyPaid;
        if (isFullyPaid) {
          setToast({ open: true, severity: "success", msg: "Carrier payment fully paid through short payments!" });
        } else {
          setToast({ open: true, severity: "success", msg: `Short payment of $${paymentAmount.toFixed(2)} recorded successfully!` });
        }
        setShortPayModalOpen(false);
        // Refresh the data
        fetchAccepted();
      } else {
        setToast({ open: true, severity: "error", msg: resp?.data?.message || "Failed to record short payment" });
      }
    } catch (error) {
      const errorMsg = error?.response?.data?.message || error?.message || "Failed to record short payment";
      setToast({ open: true, severity: "error", msg: errorMsg });
    } finally {
      setShortPayLoading(false);
    }
  };

  const handleBulkPaymentSubmit = async () => {
    // Use the stored DO IDs from when modal was opened, or fallback to current selectedDOs
    const doIdsToProcess = bulkPaymentDOIds.length > 0 ? bulkPaymentDOIds : Array.from(selectedDOs);
    
    if (doIdsToProcess.length === 0) {
      setToast({ open: true, severity: "error", msg: "Please select at least one DO to mark as paid" });
      return;
    }

    // Validation
    if (!bulkPaymentForm.paymentMethod) {
      setToast({ open: true, severity: "error", msg: "Please select a payment method" });
      return;
    }
    if (!bulkPaymentForm.paymentProof) {
      setToast({ open: true, severity: "error", msg: "Please upload payment proof document" });
      return;
    }

    setBulkPaymentLoading(true);
    try {
      const formData = new FormData();
      // Ensure we have valid DO IDs
      const validDoIds = doIdsToProcess.filter(id => id && typeof id === 'string' && id.trim() !== '');
      
      if (validDoIds.length === 0) {
        setToast({ open: true, severity: "error", msg: "No valid DO IDs found. Please select DOs again." });
        setBulkPaymentLoading(false);
        return;
      }
      
      formData.append('doIds', JSON.stringify(validDoIds));
      formData.append('accountantEmpId', empId);
      formData.append('paymentMethod', bulkPaymentForm.paymentMethod);
      if (bulkPaymentForm.paymentReference) {
        formData.append('paymentReference', bulkPaymentForm.paymentReference);
      }
      if (bulkPaymentForm.paymentNotes) {
        formData.append('paymentNotes', bulkPaymentForm.paymentNotes);
      }
      formData.append('paymentProof', bulkPaymentForm.paymentProof);

      const url = `${API_CONFIG.BASE_URL}/api/v1/accountant/bulk-mark-as-paid`;
      const resp = await axios.post(url, formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (resp?.data?.success) {
        const data = resp?.data?.data || {};
        const successfullyMarked = data.successfullyMarked || 0;
        const alreadyPaid = data.alreadyPaid || 0;
        const invalidStatus = data.invalidStatus || 0;
        
        let message = `Successfully marked ${successfullyMarked} DO(s) as paid`;
        if (alreadyPaid > 0) {
          message += `. ${alreadyPaid} DO(s) were already paid`;
        }
        if (invalidStatus > 0) {
          message += `. ${invalidStatus} DO(s) had invalid status`;
        }
        
        setToast({ open: true, severity: "success", msg: message });
        setBulkPaymentModalOpen(false);
        setSelectedDOs(new Set());
        setBulkPaymentDOIds([]);
        setBulkPaymentForm({
          paymentMethod: '',
          paymentReference: '',
          paymentNotes: '',
          paymentProof: null
        });
        // Refresh the data
        fetchAccepted(acceptedPage);
      } else {
        setToast({ open: true, severity: "error", msg: resp?.data?.message || "Failed to mark DOs as paid" });
      }
    } catch (error) {
      const errorMsg = error?.response?.data?.message || error?.message || "Failed to mark DOs as paid";
      setToast({ open: true, severity: "error", msg: errorMsg });
      console.error('Bulk payment error:', error);
      console.error('DO IDs being sent:', doIdsToProcess);
    } finally {
      setBulkPaymentLoading(false);
    }
  };

  // initial loads
  useEffect(() => {
    fetchData(page);
    // Mount pe processed bhi ek baar fetch (so first time tab-1 me empty na lage)
    fetchProcessed(processedPage);
    // Mount pe accepted bhi ek baar fetch (so first time tab-2 me empty na lage)
    fetchAccepted(acceptedPage);
    // Mount pe rejected bhi ek baar fetch (so first time tab-3 me empty na lage)
    fetchRejected(rejectedPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empId]);

  // pagination change pe refetch
  useEffect(() => {
    fetchData(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    fetchProcessed(processedPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processedPage]);

  useEffect(() => {
    fetchAccepted(acceptedPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acceptedPage]);

  // Clean up selected DOs when acceptedRows change (remove selections for DOs that are now paid or no longer exist)
  useEffect(() => {
    if (acceptedRows.length > 0) {
      const validDOIds = new Set(acceptedRows
        .filter(r => r?.paymentStatus?.status !== 'paid')
        .map(r => r._id));
      setSelectedDOs(prev => new Set([...Array.from(prev)].filter(id => validDOIds.has(id))));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acceptedRows]);

  useEffect(() => {
    fetchRejected(rejectedPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rejectedPage]);

  // tab change pe processed search reset
  useEffect(() => {
    if (activeTab === 1) setProcessedSearch("");
    if (activeTab === 2) {
      setAcceptedSearch("");
      setSelectedDOs(new Set()); // Clear selections when switching to this tab
    }
    if (activeTab === 3) setRejectedSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // filters (tab 0)
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const rowSt = r?.accountantApproval?.status || "pending";
      const okStatus = statusFilter === "all" ? true : rowSt === statusFilter;
      if (!okStatus) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();

      const loadNo = r?.customers?.[0]?.loadNo || "";
      const billTo = r?.customers?.[0]?.billTo || "";
      const carrierName = r?.carrier?.carrierName || "";
      const shipperName = r?.shipper?.name || "";
      const doId = r?._id || "";

      return (
        loadNo.toLowerCase().includes(q) ||
        billTo.toLowerCase().includes(q) ||
        carrierName.toLowerCase().includes(q) ||
        shipperName.toLowerCase().includes(q) ||
        doId.toLowerCase().includes(q)
      );
    });
  }, [rows, statusFilter, search]);

  // filters (tab 1)
  const processedFiltered = useMemo(() => {
    // First filter: Only show approved, exclude rejected and pending
    let filtered = processedRows.filter((r) => {
      const status = r?.accountantApproval?.status;
      return status === 'approved';
    });
    
    // Second filter: Apply search if provided
    if (!processedSearch.trim()) return filtered;
    const q = processedSearch.toLowerCase();
    return filtered.filter((r) => {
      const cust = r?.customers?.[0] || {};
      return (
        (cust?.loadNo || "").toLowerCase().includes(q) ||
        (cust?.billTo || r?.customerName || "").toLowerCase().includes(q) ||
        (r?.carrier?.carrierName || "").toLowerCase().includes(q) ||
        (r?.shipper?.name || "").toLowerCase().includes(q) ||
        (r?._id || "").toLowerCase().includes(q)
      );
    });
  }, [processedRows, processedSearch]);

  // filters (tab 2 - Approved By Sales)
  const acceptedFiltered = useMemo(() => {
    if (!acceptedSearch.trim()) return acceptedRows;
    const q = acceptedSearch.toLowerCase();
    return acceptedRows.filter((r) => {
      const cust = r?.customers?.[0] || {};
      return (
        (cust?.loadNo || "").toLowerCase().includes(q) ||
        (cust?.billTo || r?.customerName || "").toLowerCase().includes(q) ||
        (r?.carrier?.carrierName || "").toLowerCase().includes(q) ||
        (r?.shipper?.name || "").toLowerCase().includes(q) ||
        (r?._id || "").toLowerCase().includes(q) ||
        (r?.loadReference?.shipmentNumber || "").toLowerCase().includes(q)
      );
    });
  }, [acceptedRows, acceptedSearch]);

  // filters (tab 2)
  const rejectedFiltered = useMemo(() => {
    if (!rejectedSearch.trim()) return rejectedRows;
    const q = rejectedSearch.toLowerCase();
    return rejectedRows.filter((r) => {
      const cust = r?.customers?.[0] || {};
      return (
        (cust?.loadNo || "").toLowerCase().includes(q) ||
        (cust?.billTo || "").toLowerCase().includes(q) ||
        (r?.carrier?.carrierName || "").toLowerCase().includes(q) ||
        (r?.shipper?.name || "").toLowerCase().includes(q) ||
        (r?._id || "").toLowerCase().includes(q)
      );
    });
  }, [rejectedRows, rejectedSearch]);

  const openDetails = (row) => {
    setSelected(row);
    setDetailsOpen(true);
    setApprovalAction("approve");
    setApprovalRemarks("");
    setResubmitCorrections("");
    setResubmitRemarks("");
    const shipmentNo = row?.loadReference?.shipmentNumber;
    fetchShipmentImages(shipmentNo);
    fetchAdditionalDocs(row?._id);
  };

  // Update selected item when table data changes (to keep modal in sync)
  const updateSelectedFromTable = () => {
    if (!selected?._id) return;
    
    let updatedRow = null;
    if (activeTab === 0) {
      updatedRow = rows.find(r => r._id === selected._id);
    } else if (activeTab === 1) {
      updatedRow = processedRows.find(r => r._id === selected._id);
    } else if (activeTab === 2) {
      updatedRow = acceptedRows.find(r => r._id === selected._id);
    } else if (activeTab === 3) {
      updatedRow = rejectedRows.find(r => r._id === selected._id);
    }
    
    if (updatedRow) {
      setSelected(updatedRow);
    }
  };

  const openPreview = (row) => {
    setSelected(row);
    setPreviewOpen(true);
    const shipmentNo = row?.loadReference?.shipmentNumber;
    fetchShipmentImages(shipmentNo);
  };


  const computeTotals = (row) => {
    const customerTotals = (row?.customers || []).reduce(
      (acc, c) => acc + (c?.calculatedTotal ?? c?.totalAmount ?? 0),
      0
    );
    const carrierFees = Number(row?.carrier?.totalCarrierFees ?? 0);
    return {
      billTotal: customerTotals,
      carrierTotal: carrierFees,
      netRevenue: customerTotals - carrierFees,
    };
  };

  // Status color helper
  const statusColor = (status) => {
    if (!status) return 'bg-yellow-100 text-yellow-700';
    if (status === 'approved') return 'bg-green-100 text-green-700';
    if (status === 'rejected') return 'bg-red-100 text-red-700';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
    return 'bg-blue-100 text-blue-700';
  };

  return (
    <ThemeProvider theme={theme}>
      <div className="p-6">
        {/* Tabs */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setActiveTab(0)}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${activeTab === 0
            ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg'
            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
        >
          <div className="flex items-center gap-2">
            <Clock size={18} />
            <span>Assigned to Accountant</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab(1)}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${activeTab === 1
            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle size={18} />
            <span>Accountant Approved</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab(2)}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${activeTab === 2
            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle size={18} />
            <span>Approved By Sales</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab(3)}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${activeTab === 3
            ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg'
            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
        >
          <div className="flex items-center gap-2">
            <XCircle size={18} />
            <span>Rejected by Sales</span>
          </div>
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {/* TAB 0: Assigned to Accountant */}
        {activeTab === 0 && (
          <div>
            {/* Search and Stats */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-6">
                <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <Clock className="text-yellow-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Invoices</p>
                      <p className="text-xl font-bold text-gray-800">{rows.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <FileText className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Filtered</p>
                      <p className="text-xl font-bold text-blue-600">{filtered.length}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search (Load No / Bill To / Carrier / Shipper / DO ID)"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  )}
                </div>
                <button
                  onClick={() => fetchData(page)}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {loading && (
              <div className="mb-4">
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-emerald-600 animate-pulse" style={{ width: '100%' }}></div>
                </div>
              </div>
            )}

            {!loading && filtered.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No invoices found</h3>
                <p className="text-sm text-gray-500">Try adjusting filters or search.</p>
                {serverError && (
                  <p className="text-sm text-red-600 mt-2">{serverError}</p>
                )}
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                        <tr>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">DO ID</th>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Load No</th>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Bill To</th>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Carrier</th>
                          <th className="text-right py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Bill Amount</th>
                          <th className="text-right py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Carrier Fees</th>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Forwarded By</th>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Updated</th>
                          <th className="text-center py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((row, index) => {
                          const cust = row?.customers?.[0] || {};
                          const totals = computeTotals(row);
                          const fwBy = row?.forwardedToAccountant?.forwardedBy?.employeeName || "—";
                          return (
                            <tr key={row?._id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                              <td className="py-2 px-3">
                                <span className="font-medium text-gray-700" title={row?._id || ""}>{shortId(row?._id)}</span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-medium text-gray-700">{cust?.loadNo || "—"}</span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-medium text-gray-700">{cust?.billTo || row?.customerName || "—"}</span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-medium text-gray-700">{row?.carrier?.carrierName || "—"}</span>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <span className="font-bold text-green-600">${fmtMoney(totals.billTotal)}</span>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <span className="font-bold text-blue-600">${fmtMoney(totals.carrierTotal)}</span>
                              </td>
                              <td className="py-2 px-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${statusColor(row?.accountantApproval?.status)}`}>
                                  {row?.accountantApproval?.status === 'approved' && <CheckCircle size={12} />}
                                  {row?.accountantApproval?.status === 'rejected' && <XCircle size={12} />}
                                  {(!row?.accountantApproval?.status || row?.accountantApproval?.status === 'pending') && <Clock size={12} />}
                                  {row?.accountantApproval?.status || 'Pending'}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-medium text-gray-700">{fwBy}</span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-medium text-gray-700">{fmtDateTime(row?.updatedAt)}</span>
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => openDetails(row)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="View Details"
                                  >
                                    <Eye size={16} />
                                  </button>
                                  <button
                                    onClick={() => openEditModal(row)}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Edit Details"
                                  >
                                    <Edit size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {!loading && pagination?.totalPages > 1 && (
                  <div className="flex justify-end mt-4">
                    <div className="flex items-center gap-2 bg-white rounded-xl shadow-lg border border-gray-200 p-2">
                      <button
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Previous
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                          .filter(p => {
                            if (pagination.totalPages <= 7) return true;
                            if (page <= 4) return p <= 5;
                            if (page >= pagination.totalPages - 3) return p >= pagination.totalPages - 4;
                            return p >= page - 2 && p <= page + 2;
                          })
                          .map((p) => (
                            <button
                              key={p}
                              onClick={() => setPage(p)}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                page === p
                                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                                  : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                      </div>
                      <button
                        onClick={() => setPage(page + 1)}
                        disabled={page === pagination.totalPages}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        Next
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 1: Accountant Approved */}
        {activeTab === 1 && (
          <div>
            {/* Search and Stats */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-6">
                <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="text-green-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Approved</p>
                      <p className="text-xl font-bold text-gray-800">{processedRows.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <FileText className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Filtered</p>
                      <p className="text-xl font-bold text-blue-600">{processedFiltered.length}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search (Load No / Bill To / Carrier / Shipper / DO ID)"
                    value={processedSearch}
                    onChange={(e) => setProcessedSearch(e.target.value)}
                    className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  {processedSearch && (
                    <button
                      onClick={() => setProcessedSearch("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  )}
                </div>
                <button
                  onClick={() => fetchProcessed(processedPage)}
                  disabled={processedLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={18} className={processedLoading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {processedLoading && (
              <div className="mb-4">
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-emerald-600 animate-pulse" style={{ width: '100%' }}></div>
                </div>
              </div>
            )}

            {!processedLoading && processedFiltered.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
                <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No approved DOs</h3>
                <p className="text-sm text-gray-500">Koi processed record nahi mila.</p>
                {processedError && (
                  <p className="text-sm text-red-600 mt-2">{processedError}</p>
                )}
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                        <tr>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">DO ID</th>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Load No</th>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Bill To</th>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Carrier</th>
                          <th className="text-right py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Bill Amount</th>
                          <th className="text-right py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Carrier Fees</th>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Approved By</th>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Approved At</th>
                          <th className="text-center py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {processedFiltered.map((row, index) => {
                          const cust = row?.customers?.[0] || {};
                          const totals = computeTotals(row);
                          // Get Approved By with multiple fallbacks
                          const apprBy = row?.accountantApproval?.approvedBy?.employeeName 
                            || row?.accountantApproval?.resubmittedBy?.employeeName 
                            || row?.accountantApproval?.assignedTo?.employeeName
                            || row?.accountantApproval?.approvedBy?.empId 
                            || row?.accountantApproval?.resubmittedBy?.empId
                            || row?.accountantApproval?.assignedTo?.empId
                            || "—";
                          const apprAt = row?.accountantApproval?.approvedAt || row?.updatedAt;
                          return (
                            <tr key={row?._id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                              <td className="py-2 px-3">
                                <span className="font-medium text-gray-700" title={row?._id || ""}>{shortId(row?._id)}</span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-medium text-gray-700">{cust?.loadNo || "—"}</span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-medium text-gray-700">{cust?.billTo || row?.customerName || "—"}</span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-medium text-gray-700">{row?.carrier?.carrierName || "—"}</span>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <span className="font-bold text-green-600">${fmtMoney(totals.billTotal)}</span>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <span className="font-bold text-blue-600">${fmtMoney(totals.carrierTotal)}</span>
                              </td>
                              <td className="py-2 px-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${statusColor(row?.accountantApproval?.status)}`}>
                                  {row?.accountantApproval?.status === 'approved' && <CheckCircle size={12} />}
                                  {row?.accountantApproval?.status === 'rejected' && <XCircle size={12} />}
                                  {(!row?.accountantApproval?.status || row?.accountantApproval?.status === 'pending') && <Clock size={12} />}
                                  {row?.accountantApproval?.status || 'Pending'}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-medium text-gray-700">{apprBy}</span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-medium text-gray-700">{fmtDateTime(apprAt)}</span>
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => openDetails(row)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="View Details"
                                  >
                                    <Eye size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {!processedLoading && processedPagination?.totalPages > 1 && (
                  <div className="flex justify-end mt-4">
                    <div className="flex items-center gap-2 bg-white rounded-xl shadow-lg border border-gray-200 p-2">
                      <button
                        onClick={() => setProcessedPage(processedPage - 1)}
                        disabled={processedPage === 1}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Previous
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: processedPagination.totalPages }, (_, i) => i + 1)
                          .filter(p => {
                            if (processedPagination.totalPages <= 7) return true;
                            if (processedPage <= 4) return p <= 5;
                            if (processedPage >= processedPagination.totalPages - 3) return p >= processedPagination.totalPages - 4;
                            return p >= processedPage - 2 && p <= processedPage + 2;
                          })
                          .map((p) => (
                            <button
                              key={p}
                              onClick={() => setProcessedPage(p)}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                processedPage === p
                                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                                  : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                      </div>
                      <button
                        onClick={() => setProcessedPage(processedPage + 1)}
                        disabled={processedPage === processedPagination.totalPages}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        Next
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 2: Approved By Sales */}
        {activeTab === 2 && (
          <div>
            {/* Search and Stats */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-6">
                <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Approved</p>
                      <p className="text-xl font-bold text-gray-800">{acceptedRows.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="text-green-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Paid</p>
                      <p className="text-xl font-bold text-green-600">
                        {acceptedRows.filter(r => {
                          const carrierPaid = r?.carrierPaymentStatus?.status === 'paid';
                          return carrierPaid;
                        }).length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                      <Clock className="text-orange-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Unpaid/Partial</p>
                      <p className="text-xl font-bold text-orange-600">
                        {acceptedRows.filter(r => {
                          const carrierPaid = r?.carrierPaymentStatus?.status === 'paid';
                          return !carrierPaid;
                        }).length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <FileText className="text-purple-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Filtered</p>
                      <p className="text-xl font-bold text-blue-600">{acceptedFiltered.length}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search (Load No / Bill To / Carrier / Shipper / DO ID / Shipment#)"
                    value={acceptedSearch}
                    onChange={(e) => setAcceptedSearch(e.target.value)}
                    className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  {acceptedSearch && (
                    <button
                      onClick={() => setAcceptedSearch("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (selectedDOs.size === 0) {
                      setToast({ open: true, severity: "error", msg: "Please select at least one DO to mark as paid" });
                      return;
                    }
                    // Store the selected DO IDs when opening modal
                    setBulkPaymentDOIds(Array.from(selectedDOs));
                    setBulkPaymentModalOpen(true);
                  }}
                  disabled={acceptedLoading || selectedDOs.size === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 shadow-lg ${
                    acceptedLoading || selectedDOs.size === 0
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-60'
                      : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 hover:shadow-xl'
                  }`}
                >
                  <DollarSign size={18} />
                  <span>Bulk Pay ({selectedDOs.size})</span>
                </button>
                <button
                  onClick={() => fetchAccepted(acceptedPage)}
                  disabled={acceptedLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={18} className={acceptedLoading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {acceptedLoading && (
              <div className="mb-4">
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-emerald-600 animate-pulse" style={{ width: '100%' }}></div>
                </div>
              </div>
            )}

            {!acceptedLoading && acceptedFiltered.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No approved DOs found</h3>
                <p className="text-sm text-gray-500">Try adjusting filters or search.</p>
                {acceptedError && (
                  <p className="text-sm text-red-600 mt-2">{acceptedError}</p>
                )}
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                        <tr>
                          <th className="text-center py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide w-12">
                            <Checkbox
                              checked={acceptedFiltered.length > 0 && acceptedFiltered.filter(r => r?.paymentStatus?.status !== 'paid').every(r => selectedDOs.has(r._id))}
                              indeterminate={acceptedFiltered.filter(r => r?.paymentStatus?.status !== 'paid').some(r => selectedDOs.has(r._id)) && !acceptedFiltered.filter(r => r?.paymentStatus?.status !== 'paid').every(r => selectedDOs.has(r._id))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const unpaidDOs = acceptedFiltered.filter(r => r?.paymentStatus?.status !== 'paid').map(r => r._id);
                                  setSelectedDOs(new Set([...selectedDOs, ...unpaidDOs]));
                                } else {
                                  const unpaidDOIds = acceptedFiltered.filter(r => r?.paymentStatus?.status !== 'paid').map(r => r._id);
                                  setSelectedDOs(new Set([...Array.from(selectedDOs)].filter(id => !unpaidDOIds.includes(id))));
                                }
                              }}
                              size="small"
                            />
                          </th>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">DO ID</th>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Load No</th>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Bill To</th>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Carrier</th>
                          <th className="text-right py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Bill Amount</th>
                          <th className="text-right py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Carrier Fees</th>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Approved By</th>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Approved At</th>
                          <th className="text-center py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Actions</th>
                          <th className="text-center py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Pay</th>
                        </tr>
                      </thead>
                      <tbody>
                        {acceptedFiltered.map((row, index) => {
                          const cust = row?.customers?.[0] || {};
                          const totals = computeTotals(row);
                          const apprBy = row?.salesApproval?.approvedBy?.employeeName 
                            || row?.salesApproval?.approvedBy?.empId
                            || "—";
                          const apprAt = row?.salesApproval?.approvedAt || row?.updatedAt;
                          // Check both paymentStatus (for bill payment) and carrierPaymentStatus (for carrier payment)
                          const isPaid = row?.paymentStatus?.status === 'paid';
                          const carrierPaymentStatus = row?.carrierPaymentStatus || {};
                          // More robust check for paid status - check status and also if fully paid through short payments
                          const carrierStatus = (carrierPaymentStatus?.status || '').toLowerCase().trim();
                          const carrierTotalPaid = parseFloat(carrierPaymentStatus?.totalPaidAmount || 0);
                          const carrierTotal = parseFloat(totals.carrierTotal || 0);
                          
                          // Multiple checks for paid status:
                          // 1. Status is explicitly 'paid'
                          // 2. Total paid equals or exceeds carrier total (with tolerance)
                          // 3. Check if remaining amount is 0 or negative
                          const remainingAmount = carrierPaymentStatus?.remainingAmount || (carrierTotal - carrierTotalPaid);
                          const isFullyPaidByAmount = carrierTotal > 0 && carrierTotalPaid >= carrierTotal - 0.01;
                          const isFullyPaidByRemaining = parseFloat(remainingAmount) <= 0.01;
                          
                          const carrierIsPaid = carrierStatus === 'paid' || isFullyPaidByAmount || isFullyPaidByRemaining;
                          const carrierIsPartiallyPaid = carrierStatus === 'pending' && carrierTotalPaid > 0 && carrierTotalPaid < carrierTotal - 0.01 && remainingAmount > 0.01;
                          const carrierRemaining = Math.max(0, carrierTotal - carrierTotalPaid);
                          const isSelected = selectedDOs.has(row._id);
                          
                          // Debug logging for all DOs to understand data structure
                          if (!carrierIsPaid && carrierTotal > 0) {
                            console.log('🔍 DO Payment Status Check:', {
                              doId: row._id?.substring(0, 10) + '...',
                              loadNo: cust?.loadNo,
                              carrierStatus: carrierStatus || 'undefined',
                              carrierTotalPaid: carrierTotalPaid,
                              carrierTotal: carrierTotal,
                              remainingAmount: remainingAmount,
                              isFullyPaidByAmount: isFullyPaidByAmount,
                              isFullyPaidByRemaining: isFullyPaidByRemaining,
                              carrierIsPaid: carrierIsPaid,
                              carrierPaymentStatus: carrierPaymentStatus
                            });
                          }
                          return (
                            <tr key={row?._id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} ${isSelected ? 'bg-blue-50' : ''}`}>
                              <td className="py-2 px-3 text-center">
                                <Checkbox
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const newSelected = new Set(selectedDOs);
                                    if (e.target.checked) {
                                      newSelected.add(row._id);
                                    } else {
                                      newSelected.delete(row._id);
                                    }
                                    setSelectedDOs(newSelected);
                                  }}
                                  disabled={isPaid}
                                  size="small"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-medium text-gray-700" title={row?._id || ""}>{shortId(row?._id)}</span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-medium text-gray-700">{cust?.loadNo || "—"}</span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-medium text-gray-700">{cust?.billTo || row?.customerName || "—"}</span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-medium text-gray-700">{row?.carrier?.carrierName || "—"}</span>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <span className="font-bold text-green-600">${fmtMoney(totals.billTotal)}</span>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <span className="font-bold text-blue-600">${fmtMoney(totals.carrierTotal)}</span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-medium text-gray-700">{apprBy}</span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-medium text-gray-700">{fmtDateTime(apprAt)}</span>
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => openDetails(row)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="View Details"
                                  >
                                    <Eye size={16} />
                                  </button>
                                </div>
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex items-center justify-center gap-2">
                                  {carrierIsPaid ? (
                                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold bg-green-100 text-green-700">
                                      <CheckCircle size={14} />
                                      Paid
                                    </span>
                                  ) : carrierIsPartiallyPaid ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-orange-100 text-orange-700">
                                        Partial: ${fmtMoney(carrierTotalPaid)}/${fmtMoney(totals.carrierTotal)}
                                      </span>
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => openShortPayModal(row)}
                                          className="px-2 py-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-semibold rounded hover:from-orange-600 hover:to-orange-700 transition-all shadow-sm"
                                          title="Short Pay"
                                        >
                                          Short Pay
                                        </button>
                                        <button
                                          onClick={() => openPaymentModal(row)}
                                          className="px-2 py-1 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-semibold rounded hover:from-green-600 hover:to-green-700 transition-all shadow-sm"
                                          title="Mark as Paid"
                                        >
                                          Pay
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => openShortPayModal(row)}
                                        className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-md hover:shadow-lg"
                                        title="Short Pay (Partial Payment)"
                                      >
                                        Short Pay
                                      </button>
                                      <button
                                        onClick={() => openPaymentModal(row)}
                                        className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-semibold rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg"
                                        title="Mark as Paid"
                                      >
                                        Pay
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {!acceptedLoading && acceptedPagination?.totalPages > 1 && (
                  <div className="flex justify-end mt-4">
                    <div className="flex items-center gap-2 bg-white rounded-xl shadow-lg border border-gray-200 p-2">
                      <button
                        onClick={() => setAcceptedPage(acceptedPage - 1)}
                        disabled={acceptedPage === 1}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Previous
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: acceptedPagination.totalPages }, (_, i) => i + 1)
                          .filter(p => {
                            if (acceptedPagination.totalPages <= 7) return true;
                            if (acceptedPage <= 4) return p <= 5;
                            if (acceptedPage >= acceptedPagination.totalPages - 3) return p >= acceptedPagination.totalPages - 4;
                            return p >= acceptedPage - 2 && p <= acceptedPage + 2;
                          })
                          .map((p) => (
                            <button
                              key={p}
                              onClick={() => setAcceptedPage(p)}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                acceptedPage === p
                                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                                  : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                      </div>
                      <button
                        onClick={() => setAcceptedPage(acceptedPage + 1)}
                        disabled={acceptedPage === acceptedPagination.totalPages}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        Next
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 3: Rejected by Sales */}
        {activeTab === 3 && (
          <div>
            {/* Search and Stats */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-6">
                <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                      <XCircle className="text-red-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Rejected</p>
                      <p className="text-xl font-bold text-gray-800">{rejectedRows.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <FileText className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Filtered</p>
                      <p className="text-xl font-bold text-blue-600">{rejectedFiltered.length}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search (Load No / Bill To / Carrier / Shipper / DO ID)"
                    value={rejectedSearch}
                    onChange={(e) => setRejectedSearch(e.target.value)}
                    className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  {rejectedSearch && (
                    <button
                      onClick={() => setRejectedSearch("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  )}
                </div>
                <button
                  onClick={() => fetchRejected(rejectedPage)}
                  disabled={rejectedLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={18} className={rejectedLoading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {rejectedLoading && (
              <div className="mb-4">
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-emerald-600 animate-pulse" style={{ width: '100%' }}></div>
                </div>
              </div>
            )}

            {!rejectedLoading && rejectedFiltered.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
                <XCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No rejected DOs found</h3>
                <p className="text-sm text-gray-500">No DOs have been rejected by sales.</p>
                {rejectedError && (
                  <p className="text-sm text-red-600 mt-2">{rejectedError}</p>
                )}
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                        <tr>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">DO ID</th>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Load No</th>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Bill To</th>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Carrier</th>
                          <th className="text-right py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Bill Amount</th>
                          <th className="text-right py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Carrier Fees</th>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Rejected By</th>
                          <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Rejected At</th>
                          <th className="text-center py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rejectedFiltered.map((row, index) => {
                          const cust = row?.customers?.[0] || {};
                          const totals = computeTotals(row);
                          const rejectedBy = row?.salesApproval?.rejectedBy?.employeeName || "—";
                          const rejectedAt = row?.salesApproval?.rejectedAt || row?.updatedAt;
                          return (
                            <tr key={row?._id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                              <td className="py-2 px-3">
                                <span className="font-medium text-gray-700" title={row?._id || ""}>{shortId(row?._id)}</span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-medium text-gray-700">{cust?.loadNo || "—"}</span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-medium text-gray-700">{cust?.billTo || row?.customerName || "—"}</span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-medium text-gray-700">{row?.carrier?.carrierName || "—"}</span>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <span className="font-bold text-green-600">${fmtMoney(totals.billTotal)}</span>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <span className="font-bold text-blue-600">${fmtMoney(totals.carrierTotal)}</span>
                              </td>
                              <td className="py-2 px-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${statusColor(row?.salesApproval?.status)}`}>
                                  {row?.salesApproval?.status === 'approved' && <CheckCircle size={12} />}
                                  {row?.salesApproval?.status === 'rejected' && <XCircle size={12} />}
                                  {(!row?.salesApproval?.status || row?.salesApproval?.status === 'pending') && <Clock size={12} />}
                                  {row?.salesApproval?.status || 'Pending'}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-medium text-gray-700">{rejectedBy}</span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-medium text-gray-700">{fmtDateTime(rejectedAt)}</span>
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => openDetails(row)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="View Details"
                                  >
                                    <Eye size={16} />
                                  </button>
                                  <button
                                    onClick={() => openEditModal(row)}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Edit Details"
                                  >
                                    <Edit size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {!rejectedLoading && rejectedPagination?.totalPages > 1 && (
                  <div className="flex justify-end mt-4">
                    <div className="flex items-center gap-2 bg-white rounded-xl shadow-lg border border-gray-200 p-2">
                      <button
                        onClick={() => setRejectedPage(rejectedPage - 1)}
                        disabled={rejectedPage === 1}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Previous
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: rejectedPagination.totalPages }, (_, i) => i + 1)
                          .filter(p => {
                            if (rejectedPagination.totalPages <= 7) return true;
                            if (rejectedPage <= 4) return p <= 5;
                            if (rejectedPage >= rejectedPagination.totalPages - 3) return p >= rejectedPagination.totalPages - 4;
                            return p >= rejectedPage - 2 && p <= rejectedPage + 2;
                          })
                          .map((p) => (
                            <button
                              key={p}
                              onClick={() => setRejectedPage(p)}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                rejectedPage === p
                                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                                  : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                      </div>
                      <button
                        onClick={() => setRejectedPage(rejectedPage + 1)}
                        disabled={rejectedPage === rejectedPagination.totalPages}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        Next
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Employee DO Data Modal */}
      {detailsOpen && selected && (
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4"
          onClick={() => setDetailsOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Truck className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Employee DO Data</h2>
                    <p className="text-blue-100">Delivery Order Details</p>
                  </div>
                </div>
                <button
                  onClick={() => setDetailsOpen(false)}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Customer Information */}
              {selected?.customers?.length > 0 && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="text-green-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Customer Information</h3>
                  </div>

                  <div className="space-y-4">
                    {selected.customers.map((customer, index) => (
                      <div key={customer?._id || index} className="bg-white rounded-xl p-4 border border-green-200">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 font-bold text-sm">{index + 1}</span>
                          </div>
                          <h4 className="font-semibold text-gray-800">Customer {index + 1}</h4>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Bill To</p>
                            <p className="font-medium text-gray-800">{customer?.billTo || selected?.customerName || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Dispatcher Name</p>
                            <p className="font-medium text-gray-800">{customer?.dispatcherName || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Load No</p>
                            <p className="font-medium text-gray-800">{customer?.loadNo || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Work Order No</p>
                            <p className="font-medium text-gray-800">{customer?.workOrderNo || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Line Haul</p>
                            <p className="font-medium text-gray-800">${fmtMoney(customer?.lineHaul || 0)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">FSC</p>
                            <p className="font-medium text-gray-800">${fmtMoney(customer?.fsc || 0)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Other</p>
                            <p className="font-medium text-gray-800">${fmtMoney(
                              Array.isArray(customer?.other) 
                                ? (customer?.otherTotal || customer.other.reduce((sum, item) => sum + (Number(item?.total) || 0), 0))
                                : (customer?.other || customer?.otherTotal || 0)
                            )}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-sm text-gray-600">Total Amount</p>
                            <p className="font-bold text-lg text-green-600">${fmtMoney(customer?.calculatedTotal ?? customer?.totalAmount ?? 0)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rejection Information - Only show for rejected DOs */}
              {activeTab === 3 && selected?.salesApproval?.status === 'rejected' && selected?.salesApproval?.rejectionReason && (
                <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl p-6 border border-red-200">
                  <div className="flex items-center gap-2 mb-4">
                    <XCircle className="text-red-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Rejection Details</h3>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-red-200">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Rejected By</p>
                        <p className="font-medium text-gray-800">
                          {selected?.salesApproval?.rejectedBy?.employeeName || selected?.salesApproval?.rejectedBy?.empId || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Rejected At</p>
                        <p className="font-medium text-gray-800">
                          {selected?.salesApproval?.rejectedAt ? fmtDateTime(selected.salesApproval.rejectedAt) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Rejection Reason</p>
                        <p className="font-medium text-gray-800 bg-red-50 p-3 rounded-lg border border-red-200">
                          {selected?.salesApproval?.rejectionReason || 'N/A'}
                        </p>
                      </div>
                      {selected?.salesApproval?.remarks && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Remarks</p>
                          <p className="font-medium text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200">
                            {selected.salesApproval.remarks}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Carrier Information */}
              {selected?.carrier && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Truck className="text-purple-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Carrier Information</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <Truck className="text-purple-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Carrier Name</p>
                        <p className="font-semibold text-gray-800">{selected.carrier?.carrierName || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                        <Truck className="text-pink-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Equipment Type</p>
                        <p className="font-semibold text-gray-800">{selected.carrier?.equipmentType || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <DollarSign className="text-green-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Carrier Fees</p>
                        <p className="font-semibold text-gray-800">${fmtMoney(selected.carrier?.totalCarrierFees || 0)}</p>
                      </div>
                    </div>
                  </div>

                  {selected.carrier?.carrierFees?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Carrier Charges</h4>
                      <div className="space-y-2">
                        {selected.carrier.carrierFees.map((charge, i) => (
                          <div key={i} className="bg-white rounded-lg p-3 border border-purple-200">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-800">{charge?.name}</span>
                              <span className="font-bold text-green-600">${fmtMoney(charge?.total || 0)}</span>
                            </div>
                            <div className="text-sm text-gray-500">
                              Quantity: {charge?.quantity || 0} × Amount: ${fmtMoney(charge?.amount || 0)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Shipper Information */}
              {selected?.shipper && (
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Truck className="text-orange-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Shipper Information</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <User className="text-orange-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Shipper Name</p>
                        <p className="font-semibold text-gray-800">{selected.shipper?.name || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Pickup Locations */}
                  {((selected.shipper?.pickUpLocations || []).length > 0) && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Pickup Locations</h4>
                      <div className="space-y-3">
                        {(selected.shipper?.pickUpLocations || []).map((location, index) => (
                          <div key={location?._id || index} className="bg-white rounded-lg p-3 border border-orange-200">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-600">Name</p>
                                <p className="font-medium text-gray-800">{location?.name || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Address</p>
                                <p className="font-medium text-gray-800">{location?.address || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">City</p>
                                <p className="font-medium text-gray-800">{location?.city || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">State</p>
                                <p className="font-medium text-gray-800">{location?.state || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Zip Code</p>
                                <p className="font-medium text-gray-800">{location?.zipCode || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Weight (lbs)</p>
                                <p className="font-medium text-gray-800">
                                  {typeof location?.weight !== 'undefined' && location?.weight !== null && location?.weight !== ''
                                    ? location.weight
                                    : 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Pickup Date</p>
                                <p className="font-medium text-gray-800">
                                  {location?.pickUpDate ? fmtDateTime(location.pickUpDate) : 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Drop Locations */}
                  {((selected.shipper?.dropLocations || []).length > 0) && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Drop Locations</h4>
                      <div className="space-y-3">
                        {(selected.shipper?.dropLocations || []).map((location, index) => (
                          <div key={location?._id || index} className="bg-white rounded-lg p-3 border border-yellow-200">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-600">Name</p>
                                <p className="font-medium text-gray-800">{location?.name || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Address</p>
                                <p className="font-medium text-gray-800">{location?.address || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">City</p>
                                <p className="font-medium text-gray-800">{location?.city || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">State</p>
                                <p className="font-medium text-gray-800">{location?.state || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Zip Code</p>
                                <p className="font-medium text-gray-800">{location?.zipCode || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Weight (lbs)</p>
                                <p className="font-medium text-gray-800">
                                  {typeof location?.weight !== 'undefined' && location?.weight !== null && location?.weight !== ''
                                    ? location.weight
                                    : 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Drop Date</p>
                                <p className="font-medium text-gray-800">
                                  {location?.dropDate ? fmtDateTime(location.dropDate) : 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

                {/* Load Reference */}
                <Card variant="outlined">
                  <Box sx={{ px: 2, py: 1, backgroundColor: alpha("#facc15", 0.05) }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Load Reference
                    </Typography>
                  </Box>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <DetailsRow label="Shipment #" value={selected?.loadReference?.shipmentNumber} />
                        <DetailsRow label="PO #" value={selected?.loadReference?.poNumber} />
                        <DetailsRow label="BOL #" value={selected?.loadReference?.bolNumber} />
                        <DetailsRow label="Load Type" value={selected?.loadReference?.loadType} />
                        <DetailsRow label="Vehicle" value={selected?.loadReference?.vehicleType} />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <DetailsRow
                          label="Pickup Date"
                          value={fmtDateTime(selected?.loadReference?.pickupDate)}
                        />
                        <DetailsRow
                          label="Delivery Date"
                          value={fmtDateTime(selected?.loadReference?.deliveryDate)}
                        />
                        <DetailsRow
                          label="Rate (Type)"
                          value={`$${fmtMoney(selected?.loadReference?.rate)} (${selected?.loadReference?.rateType})`}
                        />
                        <DetailsRow label="Status" value={selected?.loadReference?.status} />
                        <DetailsRow
                          label="Delivery Approved"
                          value={selected?.loadReference?.deliveryApproval ? "Yes" : "No"}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Shipment Images & Status */}

                <Card variant="outlined">
                  <Box sx={{ px: 2, py: 1, backgroundColor: alpha("#8b5cf6", 0.05) }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Shipment Images & Status
                    </Typography>
                  </Box>
                  <CardContent>
                    {shipImgsLoading && <Typography variant="body2">Loading images…</Typography>}
                    {shipImgsErr && <Typography variant="body2" color="error">{shipImgsErr}</Typography>}
                    {!shipImgsLoading && shipImgs?.images && (
                      <Stack spacing={3}>
                        {/* Pickup Images Row */}
                        <Box>
                          <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
                            Pickup Images
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              overflowX: "auto",
                              pb: 1,
                              "&::-webkit-scrollbar": { height: 6 },
                              "&::-webkit-scrollbar-thumb": { background: "#c1c1c1" },
                              "& img": { height: 100, borderRadius: 1, objectFit: "cover" },
                            }}
                          >
                            {[
                              ...(shipImgs.images.emptyTruckImages || []),
                              ...(shipImgs.images.loadedTruckImages || []),
                              ...(shipImgs.images.podImages || []),
                              ...(shipImgs.images.eirTickets || []),
                              ...(shipImgs.images.containerImages || []),
                              ...(shipImgs.images.sealImages || []),
                            ].map((img, i) => (
                              <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                                <img src={img} alt={`Pickup Image ${i + 1}`} />
                              </a>
                            ))}
                          </Box>
                        </Box>

                        {/* Drop Images Row */}
                        <Box>
                          <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
                            Drop Images
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              overflowX: "auto",
                              pb: 1,
                              "&::-webkit-scrollbar": { height: 6 },
                              "&::-webkit-scrollbar-thumb": { background: "#c1c1c1" },
                              "& img": { height: 100, borderRadius: 1, objectFit: "cover" },
                            }}
                          >
                            {[
                              ...(shipImgs.images.dropLocationImages?.podImages || []),
                              ...(shipImgs.images.dropLocationImages?.loadedTruckImages || []),
                              ...(shipImgs.images.dropLocationImages?.dropLocationImages || []),
                              ...(shipImgs.images.dropLocationImages?.emptyTruckImages || []),
                            ].map((img, i) => (
                              <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                                <img src={img} alt={`Drop Image ${i + 1}`} />
                              </a>
                            ))}
                          </Box>
                        </Box>

                        {/* Status Info */}
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={4}>
                            <Typography variant="body2" fontWeight={700}>Origin</Typography>
                            <Typography variant="body2">{shipImgs.images.originPlace?.location || "—"}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Arrived: {fmtDateTime(shipImgs.images.originPlace?.arrivedAt)}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <Typography variant="body2" fontWeight={700}>Destination</Typography>
                            <Typography variant="body2">{shipImgs.images.destinationPlace?.location || "—"}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Arrived: {fmtDateTime(shipImgs.images.destinationPlace?.arrivedAt)}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <Typography variant="body2" fontWeight={700}>Drop Status</Typography>
                            <Typography variant="body2">
                              Completed: {shipImgs.images.dropLocationCompleted ? "Yes" : "No"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Drop Arrived: {fmtDateTime(shipImgs.images.dropLocationArrivalTime)}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Stack>
                    )}
                  </CardContent>
                </Card>


                {/* Additional Documents */}
                <Card variant="outlined">
                  <Box sx={{ px: 2, py: 1, backgroundColor: alpha("#f472b6", 0.05) }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Additional Documents
                    </Typography>
                  </Box>
                  <CardContent>
                    {addDocsLoading && <Typography variant="body2">Loading documents…</Typography>}
                    {addDocsErr && <Typography variant="body2" color="error">{addDocsErr}</Typography>}
                    {!addDocsLoading && (!addDocs || addDocs.length === 0) && !addDocsErr && (
                      <Typography variant="body2" color="text.secondary">No additional documents.</Typography>
                    )}
                    {!addDocsLoading && addDocs.length > 0 && (
                      <Grid container spacing={2}>
                        {uniqueById(addDocs).map((doc) => {
                          const url = doc?.documentUrl || "";
                          const isImg = isImageUrl(url);
                          const isPdf = isPdfUrl(url);
                          return (
                            <Grid item xs={12} sm={6} md={4} key={doc?._id ?? url}>
                              <Paper variant="outlined" sx={{ p: 1.5 }}>
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                  {isImg ? <ImageIcon fontSize="small" /> : <DescriptionIcon fontSize="small" />}
                                  <MuiLink href={url} target="_blank" rel="noopener" underline="hover">
                                    {isPdf ? "PDF Document" : (isImg ? "Image" : "File")}
                                  </MuiLink>
                                  <Chip size="small" variant="outlined" label={isPdf ? "PDF" : isImg ? "Image" : "File"} sx={{ ml: "auto" }} />
                                </Stack>
                                {isImg && (
                                  <a href={url} target="_blank" rel="noopener noreferrer">
                                    <img src={url} alt="additional-doc" style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 6, border: "1px solid #eee" }} />
                                  </a>
                                )}
                                <Divider sx={{ my: 1 }} />
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Uploaded by: {doc?.uploadedBy?.employeeName || "—"} ({doc?.uploadedBy?.empId || "—"})
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">Dept: {doc?.uploadedBy?.department || "—"}</Typography>
                                <Typography variant="caption" color="text.secondary" display="block">At: {fmtDateTime(doc?.uploadedAt)}</Typography>
                              </Paper>
                            </Grid>
                          );
                        })}
                      </Grid>
                    )}
                  </CardContent>
                </Card>
                {/* Totals */}
                <Card variant="outlined">
                  <Box sx={{ px: 2, py: 1, backgroundColor: alpha("#22c55e", 0.05) }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Totals
                    </Typography>
                  </Box>
                  <CardContent>
                    {(() => {
                      const t = computeTotals(selected);
                      return (
                        <Stack spacing={0.5}>
                          <DetailsRow label="Bill Amount (Customer)" value={`$${fmtMoney(t.billTotal)}`} />
                          <DetailsRow label="Carrier Fees" value={`$${fmtMoney(t.carrierTotal)}`} />
                          <Divider sx={{ my: 1 }} />
                          <DetailsRow label="Net Revenue" value={<span style={{ fontWeight: 700 }}>${fmtMoney(t.netRevenue)}</span>} />
                        </Stack>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Payment Information - Only show for paid DOs */}
                {selected?.paymentStatus?.status === 'paid' && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="text-green-600" size={20} />
                      <h3 className="text-lg font-bold text-gray-800">Payment Information</h3>
                      <span className="ml-auto inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700">
                        <CheckCircle size={14} />
                        Paid
                      </span>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-green-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                          <p className="font-medium text-gray-800 capitalize">
                            {selected?.paymentStatus?.paymentMethod?.replace('_', ' ') || 'N/A'}
                          </p>
                        </div>
                        {selected?.paymentStatus?.paymentReference && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Payment Reference</p>
                            <p className="font-medium text-gray-800">
                              {selected.paymentStatus.paymentReference}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Paid At</p>
                          <p className="font-medium text-gray-800">
                            {selected?.paymentStatus?.paidAt ? fmtDateTime(selected.paymentStatus.paidAt) : 'N/A'}
                          </p>
                        </div>
                        {selected?.paymentStatus?.paymentNotes && (
                          <div className="col-span-2">
                            <p className="text-sm text-gray-600 mb-1">Payment Notes</p>
                            <p className="font-medium text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200">
                              {selected.paymentStatus.paymentNotes}
                            </p>
                          </div>
                        )}
                        {selected?.paymentStatus?.paymentProof && (
                          <div className="col-span-2">
                            <p className="text-sm text-gray-600 mb-2">Payment Proof</p>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                              <div className="flex items-center gap-3">
                                {isImageUrl(selected.paymentStatus.paymentProof.fileUrl) ? (
                                  <a
                                    href={selected.paymentStatus.paymentProof.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                                  >
                                    <ImageIcon className="text-blue-600" style={{ fontSize: 24 }} />
                                    <div>
                                      <p className="font-medium">{selected.paymentStatus.paymentProof.fileName || 'Payment Proof'}</p>
                                      <p className="text-xs text-gray-500">Click to view image</p>
                                    </div>
                                  </a>
                                ) : isPdfUrl(selected.paymentStatus.paymentProof.fileUrl) ? (
                                  <a
                                    href={selected.paymentStatus.paymentProof.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                                  >
                                    <PictureAsPdfIcon className="text-red-600" style={{ fontSize: 24 }} />
                                    <div>
                                      <p className="font-medium">{selected.paymentStatus.paymentProof.fileName || 'Payment Proof'}</p>
                                      <p className="text-xs text-gray-500">Click to view PDF</p>
                                    </div>
                                  </a>
                                ) : (
                                  <a
                                    href={selected.paymentStatus.paymentProof.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                                  >
                                    <AttachFileIcon className="text-gray-600" style={{ fontSize: 24 }} />
                                    <div>
                                      <p className="font-medium">{selected.paymentStatus.paymentProof.fileName || 'Payment Proof'}</p>
                                      <p className="text-xs text-gray-500">Click to download</p>
                                    </div>
                                  </a>
                                )}
                              </div>
                              {selected.paymentStatus.paymentProof.uploadedAt && (
                                <p className="text-xs text-gray-500 mt-2">
                                  Uploaded: {fmtDateTime(selected.paymentStatus.paymentProof.uploadedAt)}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Carrier Payment Information */}
                {(() => {
                  const carrierPaymentStatus = selected?.carrierPaymentStatus || {};
                  const totals = computeTotals(selected);
                  const totalPaid = carrierPaymentStatus?.totalPaidAmount || 0;
                  const remaining = totals.carrierTotal - totalPaid;
                  const shortPayments = carrierPaymentStatus?.shortPayments || [];
                  const isFullyPaid = carrierPaymentStatus?.status === 'paid';
                  const isPartiallyPaid = carrierPaymentStatus?.status === 'pending' && totalPaid > 0;

                  if (!isFullyPaid && !isPartiallyPaid && totalPaid === 0) {
                    return null; // Don't show if no payments made
                  }

                  return (
                    <div className={`bg-gradient-to-br rounded-2xl p-6 border ${
                      isFullyPaid 
                        ? 'from-green-50 to-emerald-50 border-green-200' 
                        : 'from-orange-50 to-amber-50 border-orange-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-4">
                        <DollarSign className={isFullyPaid ? "text-green-600" : "text-orange-600"} size={20} />
                        <h3 className="text-lg font-bold text-gray-800">Carrier Payment Information</h3>
                        <span className={`ml-auto inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                          isFullyPaid 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {isFullyPaid ? (
                            <>
                              <CheckCircle size={14} />
                              Paid
                            </>
                          ) : (
                            <>
                              <Clock size={14} />
                              Partial
                            </>
                          )}
                        </span>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-gray-200 mb-4">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Total Carrier Fees</p>
                            <p className="text-lg font-bold text-gray-800">${fmtMoney(totals.carrierTotal)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Total Paid</p>
                            <p className={`text-lg font-bold ${isFullyPaid ? 'text-green-600' : 'text-orange-600'}`}>
                              ${fmtMoney(totalPaid)}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-sm text-gray-600 mb-1">Remaining Amount</p>
                            <p className={`text-xl font-bold ${isFullyPaid ? 'text-green-600' : 'text-orange-600'}`}>
                              ${fmtMoney(remaining)}
                            </p>
                          </div>
                        </div>
                        {isFullyPaid && carrierPaymentStatus?.paidAt && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Fully Paid At</p>
                            <p className="font-medium text-gray-800">
                              {fmtDateTime(carrierPaymentStatus.paidAt)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Payment History */}
                      {shortPayments && shortPayments.length > 0 && (
                        <div className="bg-white rounded-xl p-4 border border-gray-200">
                          <h4 className="text-md font-bold text-gray-800 mb-3">Payment History</h4>
                          <div className="space-y-3">
                            {shortPayments.map((payment, index) => (
                              <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <p className="font-semibold text-gray-800">Payment #{index + 1}</p>
                                    <p className="text-sm text-gray-600">
                                      {fmtDateTime(payment.paidAt)}
                                    </p>
                                  </div>
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-semibold">
                                    ${fmtMoney(payment.amount)}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <p className="text-gray-600">Method</p>
                                    <p className="font-medium text-gray-800 capitalize">
                                      {payment.paymentMethod?.replace('_', ' ') || 'N/A'}
                                    </p>
                                  </div>
                                  {payment.paymentReference && (
                                    <div>
                                      <p className="text-gray-600">Reference</p>
                                      <p className="font-medium text-gray-800">{payment.paymentReference}</p>
                                    </div>
                                  )}
                                  {payment.paidBy && (
                                    <div className="col-span-2">
                                      <p className="text-gray-600">Paid By</p>
                                      <p className="font-medium text-gray-800">
                                        {payment.paidBy?.employeeName || payment.paidBy?.empId || 'N/A'}
                                      </p>
                                    </div>
                                  )}
                                  {payment.paymentNotes && (
                                    <div className="col-span-2">
                                      <p className="text-gray-600">Notes</p>
                                      <p className="font-medium text-gray-800 bg-white p-2 rounded border border-gray-200">
                                        {payment.paymentNotes}
                                      </p>
                                    </div>
                                  )}
                                  {payment.paymentProof?.fileUrl && (
                                    <div className="col-span-2">
                                      <p className="text-gray-600 mb-1">Proof</p>
                                      <a
                                        href={payment.paymentProof.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                                      >
                                        {isImageUrl(payment.paymentProof.fileUrl) ? (
                                          <>
                                            <ImageIcon className="text-blue-600" style={{ fontSize: 20 }} />
                                            <span className="text-sm">{payment.paymentProof.fileName || 'View Image'}</span>
                                          </>
                                        ) : isPdfUrl(payment.paymentProof.fileUrl) ? (
                                          <>
                                            <PictureAsPdfIcon className="text-red-600" style={{ fontSize: 20 }} />
                                            <span className="text-sm">{payment.paymentProof.fileName || 'View PDF'}</span>
                                          </>
                                        ) : (
                                          <>
                                            <DescriptionIcon className="text-gray-600" style={{ fontSize: 20 }} />
                                            <span className="text-sm">{payment.paymentProof.fileName || 'View File'}</span>
                                          </>
                                        )}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Uploaded Files */}
                <Card variant="outlined">
                  <Box sx={{ px: 2, py: 1, backgroundColor: alpha("#0ea5e9", 0.05) }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Files
                    </Typography>
                  </Box>
                  <CardContent>
                    {(!selected?.uploadedFiles || selected.uploadedFiles.length === 0) ? (
                      <Typography variant="body2" color="text.secondary">No files uploaded.</Typography>
                    ) : (
                      <Stack spacing={1}>
                        {uniqueById(selected.uploadedFiles).map((f) => (
                          <Stack key={f?._id ?? f?.fileUrl} direction="row" alignItems="center" spacing={1}>
                            <AttachFileIcon fontSize="small" />
                            <MuiLink href={f?.fileUrl} target="_blank" rel="noopener">{f?.fileName}</MuiLink>
                            <Chip size="small" label={f?.fileType} />
                            <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>{fmtDateTime(f?.uploadDate)}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              {/* Final Approval - Only show for Assigned to Accountant tab (tab 0) */}
              {activeTab === 0 && (
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-200">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="text-orange-600" size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">Final Approval</h3>
                      <p className="text-sm text-gray-600">Review and approve this delivery order</p>
                    </div>
                  </div>

                  {/* Remarks */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Remarks
                    </label>
                    <textarea
                      placeholder="All charges verified and approved"
                      value={approvalRemarks}
                      onChange={(e) => setApprovalRemarks(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Send to Sales Button */}
                  <div className="space-y-4">
                    <button
                      onClick={postAccountantApproval}
                      disabled={posting}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 h-12 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {posting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send size={18} />
                          <span>Send to Sales</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Generate PDFs */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="text-blue-600" size={20} />
                  <h3 className="text-lg font-bold text-gray-800">Generate PDFs</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => generatePDF('invoice')}
                    disabled={pdfLoading.invoice}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2.5 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pdfLoading.invoice ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        <span>Invoice PDF</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => generatePDF('rate')}
                    disabled={pdfLoading.rate}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pdfLoading.rate ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        <span>Rate Confirmation PDF</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => generatePDF('bol')}
                    disabled={pdfLoading.bol}
                    className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2.5 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pdfLoading.bol ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        <span>BOL PDF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

                {/* Resubmit to Sales - Only show for rejected DOs */}
                {activeTab === 3 && (
                  <Card variant="outlined">
                    <Box sx={{ px: 2, py: 1, backgroundColor: alpha("#dc2626", 0.05) }}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        Resubmit to Sales
                      </Typography>
                    </Box>
                    <CardContent>
                      {/* Corrections */}
                      <TextField
                        label="Corrections Made"
                        placeholder="Describe what corrections were made (e.g., Amount corrected from $5000 to $5500 after shipper confirmation)"
                        fullWidth
                        multiline
                        minRows={3}
                        maxRows={6}
                        value={resubmitCorrections}
                        onChange={(e) => setResubmitCorrections(e.target.value)}
                        sx={{ mb: 2 }}
                      />

                      {/* Remarks */}
                      <TextField
                        label="Additional Remarks"
                        placeholder="Additional remarks or notes (e.g., Shipper confirmed the correct amount via phone call)"
                        fullWidth
                        multiline
                        minRows={3}
                        maxRows={6}
                        value={resubmitRemarks}
                        onChange={(e) => setResubmitRemarks(e.target.value)}
                        sx={{ mb: 2 }}
                      />

                      {/* Submit Button */}
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<SendIcon />}
                        onClick={postResubmitToSales}
                        disabled={resubmitPosting}
                        fullWidth
                        size="large"
                      >
                        {resubmitPosting ? "Resubmitting..." : "Resubmit to Sales"}
                      </Button>

                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
                        This will resubmit the DO back to sales with your corrections and remarks.
                      </Typography>
                    </CardContent>
                  </Card>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Edit DO Details Modal */}
      {editOpen && (
        <>
          <style>{`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
          `}</style>
          <div 
            className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4"
            onClick={() => setEditOpen(false)}
          >
            <div 
              className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto hide-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-t-3xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <Edit className="text-white" size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Edit DO Details</h2>
                      <p className="text-green-100">Update delivery order details</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditOpen(false)}
                    className="text-white hover:text-gray-200 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6">
                {editData ? (
                  <EditForm 
                    data={editData} 
                    onSubmit={editDODetails}
                    loading={editLoading}
                    onClose={() => setEditOpen(false)}
                  />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No data available for editing.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}





      {/* Payment Modal */}
      {paymentModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setPaymentModalOpen(false)}
          >
            <div 
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto hide-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-t-3xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <DollarSign size={24} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Mark as Paid</h2>
                      <p className="text-white/80 text-sm">DO ID: {paymentData?._id ? shortId(paymentData._id) : 'N/A'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPaymentModalOpen(false)}
                    className="text-white hover:text-gray-200 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6">
                <div className="space-y-4">
                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Payment Method <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={paymentForm.paymentMethod}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      required
                    >
                      <option value="">Select Payment Method</option>
                      <option value="cash">Cash</option>
                      <option value="check">Check</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="online">Online</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Payment Reference */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Payment Reference (Optional)
                    </label>
                    <input
                      type="text"
                      value={paymentForm.paymentReference}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentReference: e.target.value })}
                      placeholder="Transaction ID, Check Number, etc."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>

                  {/* Payment Notes */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Payment Notes (Optional)
                    </label>
                    <textarea
                      value={paymentForm.paymentNotes}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentNotes: e.target.value })}
                      placeholder="Additional notes about the payment"
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none"
                    />
                  </div>

                  {/* Payment Proof Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Payment Proof <span className="text-red-500">*</span>
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-green-500 transition-colors">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            if (file.size > 10 * 1024 * 1024) {
                              setToast({ open: true, severity: "error", msg: "File size must be less than 10MB" });
                              return;
                            }
                            setPaymentForm({ ...paymentForm, paymentProof: file });
                          }
                        }}
                        className="hidden"
                        id="payment-proof-upload"
                        required
                      />
                      <label
                        htmlFor="payment-proof-upload"
                        className="cursor-pointer flex flex-col items-center justify-center"
                      >
                        {paymentForm.paymentProof ? (
                          <div className="text-center">
                            <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
                            <p className="text-sm font-medium text-gray-700">{paymentForm.paymentProof.name}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {(paymentForm.paymentProof.size / 1024).toFixed(2)} KB
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPaymentForm({ ...paymentForm, paymentProof: null });
                                document.getElementById('payment-proof-upload').value = '';
                              }}
                              className="mt-2 text-sm text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <AttachFileIcon className="text-gray-400 mb-2" style={{ fontSize: 40 }} />
                            <p className="text-sm font-medium text-gray-700">Click to upload payment proof</p>
                            <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (Max 10MB)</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setPaymentModalOpen(false)}
                      className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                      disabled={paymentLoading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePaymentSubmit}
                      disabled={paymentLoading || !paymentForm.paymentMethod || !paymentForm.paymentProof}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                    >
                      {paymentLoading ? "Processing..." : "Mark as Paid"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bulk Payment Modal */}
      {bulkPaymentModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setBulkPaymentModalOpen(false)}
          >
            <div 
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto hide-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-t-3xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <DollarSign size={24} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Bulk Mark as Paid</h2>
                      <p className="text-white/80 text-sm">{bulkPaymentDOIds.length || selectedDOs.size} DO(s) selected</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setBulkPaymentModalOpen(false)}
                    className="text-white hover:text-gray-200 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6">
                <div className="space-y-4">
                  {/* Selected DOs Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-blue-800 mb-2">Selected DOs:</p>
                    <div className="flex flex-wrap gap-2">
                      {(bulkPaymentDOIds.length > 0 ? bulkPaymentDOIds : Array.from(selectedDOs)).slice(0, 10).map((doId) => (
                        <span key={doId} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-mono">
                          {shortId(doId)}
                        </span>
                      ))}
                      {(bulkPaymentDOIds.length || selectedDOs.size) > 10 && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          +{(bulkPaymentDOIds.length || selectedDOs.size) - 10} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Payment Method <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={bulkPaymentForm.paymentMethod}
                      onChange={(e) => setBulkPaymentForm({ ...bulkPaymentForm, paymentMethod: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      required
                    >
                      <option value="">Select Payment Method</option>
                      <option value="cash">Cash</option>
                      <option value="check">Check</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="online">Online</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Payment Reference */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Payment Reference (Optional)
                    </label>
                    <input
                      type="text"
                      value={bulkPaymentForm.paymentReference}
                      onChange={(e) => setBulkPaymentForm({ ...bulkPaymentForm, paymentReference: e.target.value })}
                      placeholder="Transaction ID, Check Number, etc."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>

                  {/* Payment Notes */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Payment Notes (Optional)
                    </label>
                    <textarea
                      value={bulkPaymentForm.paymentNotes}
                      onChange={(e) => setBulkPaymentForm({ ...bulkPaymentForm, paymentNotes: e.target.value })}
                      placeholder="Additional notes about the payment"
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none"
                    />
                  </div>

                  {/* Payment Proof Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Payment Proof <span className="text-red-500">*</span>
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-green-500 transition-colors">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            if (file.size > 10 * 1024 * 1024) {
                              setToast({ open: true, severity: "error", msg: "File size must be less than 10MB" });
                              return;
                            }
                            setBulkPaymentForm({ ...bulkPaymentForm, paymentProof: file });
                          }
                        }}
                        className="hidden"
                        id="bulk-payment-proof-upload"
                        required
                      />
                      <label
                        htmlFor="bulk-payment-proof-upload"
                        className="cursor-pointer flex flex-col items-center justify-center"
                      >
                        {bulkPaymentForm.paymentProof ? (
                          <div className="text-center">
                            <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
                            <p className="text-sm font-medium text-gray-700">{bulkPaymentForm.paymentProof.name}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {(bulkPaymentForm.paymentProof.size / 1024).toFixed(2)} KB
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setBulkPaymentForm({ ...bulkPaymentForm, paymentProof: null });
                                document.getElementById('bulk-payment-proof-upload').value = '';
                              }}
                              className="mt-2 text-sm text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <AttachFileIcon className="text-gray-400 mb-2" style={{ fontSize: 40 }} />
                            <p className="text-sm font-medium text-gray-700">Click to upload payment proof</p>
                            <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (Max 10MB)</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setBulkPaymentModalOpen(false)}
                      className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                      disabled={bulkPaymentLoading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBulkPaymentSubmit}
                      disabled={bulkPaymentLoading || !bulkPaymentForm.paymentMethod || !bulkPaymentForm.paymentProof}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                    >
                      {bulkPaymentLoading ? "Processing..." : `Mark ${bulkPaymentDOIds.length || selectedDOs.size} DO(s) as Paid`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Short Pay Modal */}
      {shortPayModalOpen && shortPayData && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShortPayModalOpen(false)}
          >
            <div 
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto hide-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-t-3xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <DollarSign size={24} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Short Pay Carrier</h2>
                      <p className="text-white/80 text-sm">DO ID: {shortPayData?._id ? shortId(shortPayData._id) : 'N/A'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShortPayModalOpen(false)}
                    className="text-white hover:text-gray-200 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6">
                {(() => {
                  const totals = computeTotals(shortPayData);
                  const carrierPaymentStatus = shortPayData?.carrierPaymentStatus || {};
                  const totalPaid = carrierPaymentStatus?.totalPaidAmount || 0;
                  const remaining = totals.carrierTotal - totalPaid;
                  
                  return (
                    <div className="space-y-4">
                      {/* Payment Summary */}
                      <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Total Carrier Fees</p>
                            <p className="text-lg font-bold text-gray-800">${fmtMoney(totals.carrierTotal)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Already Paid</p>
                            <p className="text-lg font-bold text-green-600">${fmtMoney(totalPaid)}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-sm text-gray-600 mb-1">Remaining Amount</p>
                            <p className="text-xl font-bold text-orange-600">${fmtMoney(remaining)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Payment Amount */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Payment Amount <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 font-bold text-lg">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={remaining}
                            value={shortPayForm.paymentAmount}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || (parseFloat(value) > 0 && parseFloat(value) <= remaining)) {
                                setShortPayForm({ ...shortPayForm, paymentAmount: value });
                              } else if (parseFloat(value) > remaining) {
                                setToast({ open: true, severity: "error", msg: `Amount cannot exceed remaining balance of $${fmtMoney(remaining)}` });
                              }
                            }}
                            placeholder="0.00"
                            className={`w-full pl-10 pr-4 py-3 text-lg font-semibold border-2 rounded-xl transition-all ${
                              shortPayForm.paymentAmount && parseFloat(shortPayForm.paymentAmount) > remaining
                                ? 'border-red-400 bg-red-50 focus:ring-red-500 focus:border-red-500'
                                : 'border-gray-300 bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500'
                            } outline-none`}
                            required
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-xs text-gray-500">
                            Maximum: <span className="font-semibold text-orange-600">${fmtMoney(remaining)}</span>
                          </p>
                          {shortPayForm.paymentAmount && parseFloat(shortPayForm.paymentAmount) > 0 && (
                            <p className="text-xs text-gray-500">
                              Remaining after payment: <span className="font-semibold text-gray-700">
                                ${fmtMoney(remaining - parseFloat(shortPayForm.paymentAmount || 0))}
                              </span>
                            </p>
                          )}
                        </div>
                        {/* Quick Fill Buttons */}
                        {remaining > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setShortPayForm({ ...shortPayForm, paymentAmount: remaining.toFixed(2) })}
                              className="px-3 py-1.5 text-xs font-semibold bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors border border-orange-300"
                            >
                              Pay Full (${fmtMoney(remaining)})
                            </button>
                            <button
                              type="button"
                              onClick={() => setShortPayForm({ ...shortPayForm, paymentAmount: (remaining / 2).toFixed(2) })}
                              className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
                            >
                              Pay Half (${fmtMoney(remaining / 2)})
                            </button>
                            {remaining >= 100 && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setShortPayForm({ ...shortPayForm, paymentAmount: '100.00' })}
                                  className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
                                >
                                  $100
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShortPayForm({ ...shortPayForm, paymentAmount: '500.00' })}
                                  className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
                                >
                                  $500
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Payment Method */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Payment Method <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={shortPayForm.paymentMethod}
                          onChange={(e) => setShortPayForm({ ...shortPayForm, paymentMethod: e.target.value })}
                          className={`w-full px-4 py-3 border-2 rounded-xl transition-all ${
                            shortPayForm.paymentMethod
                              ? 'border-green-300 bg-green-50 focus:ring-green-500 focus:border-green-500'
                              : 'border-gray-300 bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500'
                          } outline-none font-medium`}
                          required
                        >
                          <option value="">Select Payment Method</option>
                          <option value="cash">💵 Cash</option>
                          <option value="check">📝 Check</option>
                          <option value="bank_transfer">🏦 Bank Transfer</option>
                          <option value="online">💻 Online Payment</option>
                          <option value="other">📄 Other</option>
                        </select>
                        {shortPayForm.paymentMethod && (
                          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <CheckCircle size={12} />
                            Payment method selected
                          </p>
                        )}
                      </div>

                      {/* Payment Reference */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Payment Reference <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={shortPayForm.paymentReference}
                          onChange={(e) => setShortPayForm({ ...shortPayForm, paymentReference: e.target.value })}
                          placeholder="e.g., TXN123456, Check #789, Wire Transfer ID"
                          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white hover:border-gray-400"
                        />
                        <p className="text-xs text-gray-500 mt-1">Helpful for tracking and reconciliation</p>
                      </div>

                      {/* Payment Notes */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Payment Notes <span className="text-gray-400 text-xs font-normal">(Optional)</span>
                        </label>
                        <textarea
                          value={shortPayForm.paymentNotes}
                          onChange={(e) => setShortPayForm({ ...shortPayForm, paymentNotes: e.target.value })}
                          placeholder="Add any additional notes about this payment (e.g., reason for partial payment, special instructions, etc.)"
                          rows={4}
                          maxLength={500}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none transition-all bg-white hover:border-gray-400"
                        />
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-xs text-gray-500">Optional notes for internal records</p>
                          <p className={`text-xs ${shortPayForm.paymentNotes?.length > 450 ? 'text-orange-600' : 'text-gray-400'}`}>
                            {shortPayForm.paymentNotes?.length || 0}/500
                          </p>
                        </div>
                      </div>

                      {/* Payment Proof Upload */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Payment Proof <span className="text-red-500">*</span>
                        </label>
                        <div className={`border-2 border-dashed rounded-xl p-6 transition-all ${
                          shortPayForm.carrierPaymentProof
                            ? 'border-green-400 bg-green-50'
                            : 'border-gray-300 bg-gray-50 hover:border-orange-400 hover:bg-orange-50'
                        }`}>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                if (file.size > 10 * 1024 * 1024) {
                                  setToast({ open: true, severity: "error", msg: "File size must be less than 10MB" });
                                  return;
                                }
                                setShortPayForm({ ...shortPayForm, carrierPaymentProof: file });
                              }
                            }}
                            className="hidden"
                            id="short-pay-proof-upload"
                            required
                          />
                          <label
                            htmlFor="short-pay-proof-upload"
                            className="cursor-pointer flex flex-col items-center justify-center min-h-[120px]"
                          >
                            {shortPayForm.carrierPaymentProof ? (
                              <div className="text-center w-full">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-3">
                                  <CheckCircle size={32} className="text-green-600" />
                                </div>
                                <p className="text-sm font-semibold text-gray-800 mb-1">{shortPayForm.carrierPaymentProof.name}</p>
                                <p className="text-xs text-gray-600 mb-3">
                                  {(shortPayForm.carrierPaymentProof.size / 1024).toFixed(2)} KB
                                </p>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShortPayForm({ ...shortPayForm, carrierPaymentProof: null });
                                    document.getElementById('short-pay-proof-upload').value = '';
                                  }}
                                  className="px-4 py-2 text-sm font-semibold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors border border-red-300"
                                >
                                  Remove File
                                </button>
                              </div>
                            ) : (
                              <div className="text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-200 rounded-full mb-3">
                                  <AttachFileIcon className="text-gray-500" style={{ fontSize: 32 }} />
                                </div>
                                <p className="text-sm font-semibold text-gray-700 mb-1">Click to upload payment proof</p>
                                <p className="text-xs text-gray-500 mb-2">PDF, JPG, PNG files supported</p>
                                <p className="text-xs text-gray-400">Maximum file size: 10MB</p>
                              </div>
                            )}
                          </label>
                        </div>
                        {!shortPayForm.carrierPaymentProof && (
                          <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                            <Clock size={12} />
                            Payment proof is required to complete the transaction
                          </p>
                        )}
                      </div>

                      {/* Submit Button */}
                      <div className="pt-6 border-t border-gray-200">
                        <div className="flex gap-3">
                          <button
                            onClick={() => setShortPayModalOpen(false)}
                            className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors border-2 border-gray-300"
                            disabled={shortPayLoading}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleShortPaySubmit}
                            disabled={(() => {
                              const amount = parseFloat(shortPayForm.paymentAmount || 0);
                              const isAmountValid = amount > 0 && amount <= remaining + 0.01; // Allow small rounding differences
                              return shortPayLoading || 
                                     !shortPayForm.paymentAmount || 
                                     !shortPayForm.paymentMethod || 
                                     !shortPayForm.carrierPaymentProof || 
                                     !isAmountValid;
                            })()}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-lg"
                            title={(() => {
                              if (shortPayLoading) return "Processing payment...";
                              if (!shortPayForm.paymentAmount) return "Please enter payment amount";
                              if (!shortPayForm.paymentMethod) return "Please select payment method";
                              if (!shortPayForm.carrierPaymentProof) return "Please upload payment proof";
                              const amount = parseFloat(shortPayForm.paymentAmount || 0);
                              if (amount <= 0) return "Payment amount must be greater than 0";
                              if (amount > remaining + 0.01) return `Amount cannot exceed remaining balance of $${fmtMoney(remaining)}`;
                              return "Click to record short payment";
                            })()}
                          >
                            {shortPayLoading ? (
                              <span className="flex items-center justify-center gap-2">
                                <RefreshCw size={18} className="animate-spin" />
                                Processing...
                              </span>
                            ) : (
                              <span className="flex items-center justify-center gap-2">
                                <DollarSign size={18} />
                                Record Short Payment
                              </span>
                            )}
                          </button>
                        </div>
                        {/* Validation Messages */}
                        {(() => {
                          const amount = parseFloat(shortPayForm.paymentAmount || 0);
                          const isAmountValid = amount > 0 && amount <= remaining + 0.01;
                          const missingFields = [];
                          
                          if (!shortPayForm.paymentAmount) missingFields.push("Payment Amount");
                          if (!shortPayForm.paymentMethod) missingFields.push("Payment Method");
                          if (!shortPayForm.carrierPaymentProof) missingFields.push("Payment Proof");
                          if (amount <= 0 && shortPayForm.paymentAmount) missingFields.push("Valid Payment Amount (> 0)");
                          if (amount > remaining + 0.01) missingFields.push(`Amount within limit (max $${fmtMoney(remaining)})`);

                          if (missingFields.length > 0 && shortPayForm.paymentAmount) {
                            return (
                              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-xs text-red-800 font-semibold mb-1">⚠️ Please complete the following:</p>
                                <ul className="text-xs text-red-700 list-disc list-inside space-y-0.5">
                                  {missingFields.map((field, idx) => (
                                    <li key={idx}>{field}</li>
                                  ))}
                                </ul>
                              </div>
                            );
                          }
                          
                          if (shortPayForm.paymentAmount && isAmountValid && shortPayForm.paymentMethod && shortPayForm.carrierPaymentProof) {
                            return (
                              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-xs text-green-800 font-medium">
                                  ✅ Ready to submit! You're about to record a payment of <span className="font-bold">${fmtMoney(amount)}</span>. 
                                  After this payment, <span className="font-bold">${fmtMoney(Math.max(0, remaining - amount))}</span> will remain.
                                </p>
                              </div>
                            );
                          }
                          
                          return null;
                        })()}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </>
      )}

        {/* Snackbar */}
        <Snackbar
          open={toast.open}
          autoHideDuration={4000}
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setToast((t) => ({ ...t, open: false }))}
            severity={toast.severity}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {toast.msg}
          </Alert>
        </Snackbar>
      </div>
    </ThemeProvider>
  );
}


