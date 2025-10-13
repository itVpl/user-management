import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import Logo from '../../assets/LogoFinal.png';

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
function EditForm({ data, onSubmit, loading }) {
  // Initialize form data with calculated totals
  const initializeFormData = (data) => {
    const customers = (data?.customers || []).map(customer => ({
      ...customer,
      totalAmount: (customer.lineHaul || 0) + (customer.fsc || 0) + (customer.other || 0)
    }));
    
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
    <form onSubmit={handleSubmit}>
      <Stack spacing={3}>
        {/* Customer Details */}
        <Card>
          <CardHeader title="Customer Details" />
          <CardContent>
            <Stack spacing={2}>
              {formData.customers.map((customer, index) => (
                <Grid container spacing={2} key={index}>
                  <Grid item xs={12} sm={6}>
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
                  </Grid>
                  <Grid item xs={12} sm={6}>
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
                  </Grid>
                  <Grid item xs={12} sm={6}>
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
                  </Grid>
                  <Grid item xs={12} sm={6}>
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
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Line Haul"
                      type="number"
                      value={customer.lineHaul || ""}
                      onChange={(e) => handleCustomerChange(index, 'lineHaul', parseFloat(e.target.value) || 0)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="FSC"
                      type="number"
                      value={customer.fsc || ""}
                      onChange={(e) => handleCustomerChange(index, 'fsc', parseFloat(e.target.value) || 0)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Other"
                      type="number"
                      value={customer.other || ""}
                      onChange={(e) => handleCustomerChange(index, 'other', parseFloat(e.target.value) || 0)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
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
                  </Grid>
                </Grid>
              ))}
            </Stack>
          </CardContent>
        </Card>

        {/* Carrier Details */}
        <Card>
          <CardHeader title="Carrier Details" />
          <CardContent>
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
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
                </Grid>
                <Grid item xs={12} sm={6}>
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
                </Grid>
              </Grid>

              {/* Carrier Fees */}
              <Typography variant="h6">Carrier Fees</Typography>
              {(formData.carrier.carrierFees || []).map((fee, index) => (
                <Grid container spacing={2} key={index}>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Quantity"
                      type="number"
                      value={fee.quantity || ""}
                      onChange={(e) => handleCarrierFeeChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Amount"
                      type="number"
                      value={fee.amount || ""}
                      onChange={(e) => handleCarrierFeeChange(index, 'amount', parseFloat(e.target.value) || 0)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
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
                  </Grid>
                  <Grid item xs={12} sm={6}>
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
              </Grid>
                </Grid>
              ))}

              
            </Stack>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <DialogActions>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            {loading ? "Updating..." : "Update Details"}
          </Button>
        </DialogActions>
      </Stack>
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

  // === TAB 2: Rejected by Sales ===
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
  const generateInvoicePDF = (order) => {
    try {
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

  // ===== POST: Accountant approval (Approve/Reject) =====
  const postAccountantApproval = async () => {
    if (!selected?._id) {
      setToast({ open: true, severity: "error", msg: "No DO selected." });
      return;
    }
    if (approvalAction === "reject" && !approvalRemarks.trim()) {
      setToast({ open: true, severity: "warning", msg: "Remarks are required for rejection." });
      return;
    }

    setPosting(true);
    try {
      const url = `${API_CONFIG.BASE_URL}/api/v1/accountant/approval`;
      const body = {
        doId: selected._id,
        accountantEmpId: empId,
        action: approvalAction, // "approve" or "reject"
        remarks: approvalRemarks || (approvalAction === "approve" ? "All details verified and approved" : "Rejected by accountant"),
      };
      const resp = await axios.post(url, body, { headers });

      const baseMsg = resp?.data?.message || "Action completed";
      const successMsg = approvalAction === "approve" 
        ? `${baseMsg}. Check the "Accountant Approved" tab to see the approved DO.`
        : baseMsg;
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
        // If approved, switch to approved tab to show the result
        if (approvalAction === "approve") {
          setTimeout(() => setActiveTab(1), 500);
        }
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

  // initial loads
  useEffect(() => {
    fetchData(page);
    // Mount pe processed bhi ek baar fetch (so first time tab-1 me empty na lage)
    fetchProcessed(processedPage);
    // Mount pe rejected bhi ek baar fetch (so first time tab-2 me empty na lage)
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
    fetchRejected(rejectedPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rejectedPage]);

  // tab change pe processed search reset
  useEffect(() => {
    if (activeTab === 1) setProcessedSearch("");
    if (activeTab === 2) setRejectedSearch("");
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
    if (!processedSearch.trim()) return processedRows;
    const q = processedSearch.toLowerCase();
    return processedRows.filter((r) => {
      const cust = r?.customers?.[0] || {};
      return (
        (cust?.loadNo || "").toLowerCase().includes(q) ||
        (cust?.billTo || "").toLowerCase().includes(q) ||
        (r?.carrier?.carrierName || "").toLowerCase().includes(q) ||
        (r?.shipper?.name || "").toLowerCase().includes(q) ||
        (r?._id || "").toLowerCase().includes(q)
      );
    });
  }, [processedRows, processedSearch]);

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

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Card elevation={2}>
          <CardHeader
            title="Invoices"
            subheader={
              accountantUser ? (
                <Typography variant="body2" color="text.secondary">
                  Logged as: <b>{accountantUser.employeeName?.trim()}</b> ({accountantUser.empId}) — {accountantUser.department}
                </Typography>
              ) : (
                "—"
              )
            }
            action={
              <Stack direction="row" spacing={1} sx={{ pr: 2 }}>
                <Tooltip title="Refresh current tab">
                  <span>
                    <IconButton
                      onClick={() => {
                        if (activeTab === 0) fetchData(page);
                        else if (activeTab === 1) fetchProcessed(processedPage);
                        else fetchRejected(rejectedPage);
                      }}
                      disabled={activeTab === 0 ? loading : activeTab === 1 ? processedLoading : rejectedLoading}
                    >
                      <RefreshIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            }
          />

          {/* ===== Tabs ===== */}
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ px: 2, borderBottom: "1px solid #eee" }}
          >
            <Tab label="Assigned to Accountant" />
            <Tab label="Accountant Approved" />
            <Tab label="Rejected by Sales" />
          </Tabs>

          <CardContent>
            {/* ===== TAB 0: Assigned to Accountant ===== */}
            <TabPanel value={activeTab} index={0}>
              <Toolbar disableGutters sx={{ gap: 2, flexWrap: "wrap", pb: 2 }}>

                <TextField
                  size="small"
                  placeholder="Search (Load No / Bill To / Carrier / Shipper / DO ID)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  sx={{ flex: 1, minWidth: 280 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: search ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearch("")}>
                          ×
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                />

                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip size="small" label={`Total: ${rows.length}`} variant="outlined" />
                  <Chip size="small" label={`Filtered: ${filtered.length}`} variant="outlined" color="primary" />
                </Stack>
              </Toolbar>

              {loading && <LinearProgress sx={{ mb: 2 }} />}

              {!loading && filtered.length === 0 ? (
                <>
                  <EmptyState title="No invoices found" subtitle="Try adjusting filters or search." />
                  {serverError && (
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                      {serverError}
                    </Typography>
                  )}
                </>
              ) : (
                <>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>DO ID</TableCell>
                          <TableCell>Load No</TableCell>
                          <TableCell>Bill To</TableCell>
                          <TableCell>Carrier</TableCell>
                          <TableCell align="right">Bill Amount</TableCell>
                          <TableCell align="right">Carrier Fees</TableCell>
                          
                          <TableCell>Status</TableCell>
                          <TableCell>Forwarded By</TableCell>
                          <TableCell>Updated</TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filtered.map((row) => {
                          const cust = row?.customers?.[0] || {};
                          const totals = computeTotals(row);
                          const fwBy = row?.forwardedToAccountant?.forwardedBy?.employeeName || "—";
                          return (
                            <TableRow key={row?._id}>
                              <TableCell>
                                <Tooltip title={row?._id || ""}>
                                  <span>{shortId(row?._id)}</span>
                                </Tooltip>
                              </TableCell>
                              <TableCell>{cust?.loadNo || "—"}</TableCell>
                              <TableCell>{cust?.billTo || "—"}</TableCell>
                              <TableCell>{row?.carrier?.carrierName || "—"}</TableCell>
                              <TableCell align="right">${fmtMoney(totals.billTotal)}</TableCell>
                              <TableCell align="right">${fmtMoney(totals.carrierTotal)}</TableCell>
                              
                              <TableCell>
                                <StatusChip status={row?.accountantApproval?.status} />
                              </TableCell>
                              <TableCell>{fwBy}</TableCell>
                              <TableCell>{fmtDateTime(row?.updatedAt)}</TableCell>
                              <TableCell align="center">
                                <Stack direction="row" spacing={1} justifyContent="center">
                                  <Tooltip title="View Details">
                                    <IconButton onClick={() => openDetails(row)} size="small">
                                      <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Edit Details">
                                    <IconButton onClick={() => openEditModal(row)} size="small">
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {!loading && pagination?.totalPages > 1 && (
                    <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                      <Pagination count={pagination.totalPages} page={page} onChange={(_, val) => setPage(val)} color="primary" />
                    </Stack>
                  )}
                </>
              )}
            </TabPanel>

            {/* ===== TAB 1: Accountant Approved ===== */}
            <TabPanel value={activeTab} index={1}>
              <Toolbar disableGutters sx={{ gap: 2, flexWrap: "wrap", pb: 2 }}>
                <TextField
                  size="small"
                  placeholder="Search (Load No / Bill To / Carrier / Shipper / DO ID)"
                  value={processedSearch}
                  onChange={(e) => setProcessedSearch(e.target.value)}
                  sx={{ flex: 1, minWidth: 280 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: processedSearch ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setProcessedSearch("")}>
                          ×
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                />

                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip size="small" label={`Total: ${processedRows.length}`} variant="outlined" />
                  <Chip size="small" label={`Filtered: ${processedFiltered.length}`} variant="outlined" color="primary" />
                </Stack>
              </Toolbar>

              {/* Debug chips if needed */}
              {/* <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <Chip size="small" label={`API: ${processedRows.length}`} />
              <Chip size="small" color="primary" label={`UI: ${processedFiltered.length}`} />
            </Stack> */}

              {processedLoading && <LinearProgress sx={{ mb: 2 }} />}

              {!processedLoading && processedFiltered.length === 0 ? (
                <>
                  <EmptyState title="No approved DOs" subtitle="Koi processed record nahi mila." />
                  {processedError && (
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                      {processedError}
                    </Typography>
                  )}
                </>
              ) : (
                <>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>DO ID</TableCell>
                          <TableCell>Load No</TableCell>
                          <TableCell>Bill To</TableCell>
                          <TableCell>Carrier</TableCell>
                          <TableCell align="right">Bill Amount</TableCell>
                          <TableCell align="right">Carrier Fees</TableCell>
                          
                          <TableCell>Status</TableCell>
                          <TableCell>Approved By</TableCell>
                          <TableCell>Approved At</TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {processedFiltered.map((row) => {
                          const cust = row?.customers?.[0] || {};
                          const totals = computeTotals(row);
                          const apprBy = row?.accountantApproval?.approvedBy?.employeeName || "—";
                          const apprAt = row?.accountantApproval?.approvedAt || row?.updatedAt;
                          return (
                            <TableRow key={row?._id}>
                              <TableCell>
                                <Tooltip title={row?._id || ""}>
                                  <span>{shortId(row?._id)}</span>
                                </Tooltip>
                              </TableCell>
                              <TableCell>{cust?.loadNo || "—"}</TableCell>
                              <TableCell>{cust?.billTo || "—"}</TableCell>
                              <TableCell>{row?.carrier?.carrierName || "—"}</TableCell>
                              <TableCell align="right">${fmtMoney(totals.billTotal)}</TableCell>
                              <TableCell align="right">${fmtMoney(totals.carrierTotal)}</TableCell>
                             
                              <TableCell>
                                <StatusChip status={row?.accountantApproval?.status} />
                              </TableCell>
                              <TableCell>{apprBy}</TableCell>
                              <TableCell>{fmtDateTime(apprAt)}</TableCell>
                              <TableCell align="center">
                                <Stack direction="row" spacing={1} justifyContent="center">
                                  <Tooltip title="View Details">
                                    <IconButton onClick={() => openDetails(row)} size="small">
                                      <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Edit Details">
                                    <IconButton onClick={() => openEditModal(row)} size="small">
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {!processedLoading && processedPagination?.totalPages > 1 && (
                    <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                      <Pagination
                        count={processedPagination.totalPages}
                        page={processedPage}
                        onChange={(_, val) => setProcessedPage(val)}
                        color="primary"
                      />
                    </Stack>
                  )}
                </>
              )}
            </TabPanel>

            {/* ===== TAB 2: Rejected by Sales ===== */}
            <TabPanel value={activeTab} index={2}>
              <Toolbar disableGutters sx={{ gap: 2, flexWrap: "wrap", pb: 2 }}>
                <TextField
                  size="small"
                  placeholder="Search (Load No / Bill To / Carrier / Shipper / DO ID)"
                  value={rejectedSearch}
                  onChange={(e) => setRejectedSearch(e.target.value)}
                  sx={{ flex: 1, minWidth: 280 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: rejectedSearch ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setRejectedSearch("")}>
                          ×
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                />

                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip size="small" label={`Total: ${rejectedRows.length}`} variant="outlined" />
                  <Chip size="small" label={`Filtered: ${rejectedFiltered.length}`} variant="outlined" color="primary" />
                </Stack>
              </Toolbar>

              {rejectedLoading && <LinearProgress sx={{ mb: 2 }} />}

              {!rejectedLoading && rejectedFiltered.length === 0 ? (
                <>
                  <EmptyState title="No rejected DOs found" subtitle="No DOs have been rejected by sales." />
                  {rejectedError && (
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                      {rejectedError}
                    </Typography>
                  )}
                </>
              ) : (
                <>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>DO ID</TableCell>
                          <TableCell>Load No</TableCell>
                          <TableCell>Bill To</TableCell>
                          <TableCell>Carrier</TableCell>
                          <TableCell align="right">Bill Amount</TableCell>
                          <TableCell align="right">Carrier Fees</TableCell>
                          
                          <TableCell>Status</TableCell>
                          <TableCell>Rejected By</TableCell>
                          <TableCell>Rejected At</TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rejectedFiltered.map((row) => {
                          const cust = row?.customers?.[0] || {};
                          const totals = computeTotals(row);
                          const rejectedBy = row?.salesApproval?.rejectedBy?.employeeName || "—";
                          const rejectedAt = row?.salesApproval?.rejectedAt || row?.updatedAt;
                          return (
                            <TableRow key={row?._id}>
                              <TableCell>
                                <Tooltip title={row?._id || ""}>
                                  <span>{shortId(row?._id)}</span>
                                </Tooltip>
                              </TableCell>
                              <TableCell>{cust?.loadNo || "—"}</TableCell>
                              <TableCell>{cust?.billTo || "—"}</TableCell>
                              <TableCell>{row?.carrier?.carrierName || "—"}</TableCell>
                              <TableCell align="right">${fmtMoney(totals.billTotal)}</TableCell>
                              <TableCell align="right">${fmtMoney(totals.carrierTotal)}</TableCell>
                             
                              <TableCell>
                                <StatusChip status={row?.salesApproval?.status} />
                              </TableCell>
                              <TableCell>{rejectedBy}</TableCell>
                              <TableCell>{fmtDateTime(rejectedAt)}</TableCell>
                              <TableCell align="center">
                                <Stack direction="row" spacing={1} justifyContent="center">
                                  <Tooltip title="View Details">
                                    <IconButton onClick={() => openDetails(row)} size="small">
                                      <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Edit Details">
                                    <IconButton onClick={() => openEditModal(row)} size="small">
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {!rejectedLoading && rejectedPagination?.totalPages > 1 && (
                    <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                      <Pagination
                        count={rejectedPagination.totalPages}
                        page={rejectedPage}
                        onChange={(_, val) => setRejectedPage(val)}
                        color="primary"
                      />
                    </Stack>
                  )}
                </>
              )}
            </TabPanel>
          </CardContent>
        </Card>

        {/* Details Drawer */}
        <Dialog
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
        >
          {/* Header */}
          <DialogTitle sx={{ p: 0 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 3,
                py: 2,
                background: "linear-gradient(90deg,#7c3aed,#06b6d4)",
                color: "white",
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 1.5,
                    background: alpha("#fff", 0.12),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <VisibilityIcon sx={{ color: "#fff" }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={800}>
                    Employee DO Data
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.85 }}>
                    Delivery Order Details
                  </Typography>
                </Box>
              </Stack>
              <IconButton
                onClick={() => setDetailsOpen(false)}
                size="small"
                sx={{ color: "rgba(255,255,255,0.9)" }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent dividers sx={{ p: 3 }}>
            {selected ? (
              <Stack spacing={3}>
                {/* Basic Info */}
                <Card variant="outlined">
                  <Box sx={{ px: 2, py: 1, backgroundColor: alpha("#7c3aed", 0.05) }}>
                    <Typography variant="subtitle1" fontWeight={700}>Basic Info</Typography>
                  </Box>
                  <CardContent>
                    <DetailsRow label="DO ID" value={selected?._id} />
                    <DetailsRow label="Assignment Status" value={selected?.assignmentStatus} />
                    <DetailsRow label="DO Status" value={selected?.doStatus} />
                    <DetailsRow label="Updated At" value={fmtDateTime(selected?.updatedAt)} />
                    <DetailsRow label="Accountant Status" value={<StatusChip status={selected?.accountantApproval?.status} />} />
                    <DetailsRow label="Remarks" value={selected?.accountantApproval?.remarks || "—"} />
                  </CardContent>
                </Card>

                

                {/* Customer (Billing) */}
                <Card variant="outlined">
                  <Box sx={{ px: 2, py: 1, backgroundColor: alpha("#7c3aed", 0.05) }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Customer (Billing)
                    </Typography>
                  </Box>
                  <CardContent>
                    {(selected?.customers || []).map((c) => (
                      <Box key={c?._id} sx={{ mb: 2 }}>
                        <Typography fontWeight={600}>{c?.billTo || "—"}</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                          <Chip size="small" label={`Load: ${c?.loadNo || "—"}`} />
                          <Chip size="small" label={`WO#: ${c?.workOrderNo || "—"}`} />
                          <Chip size="small" label={`LineHaul: $${fmtMoney(c?.lineHaul || 0)}`} />
                          <Chip size="small" label={`FSC: $${fmtMoney(c?.fsc || 0)}`} />
                          <Chip size="small" label={`Other: $${fmtMoney(c?.other || 0)}`} />
                          <Chip
                            size="small"
                            color="primary"
                            label={`Total: $${fmtMoney(c?.calculatedTotal ?? c?.totalAmount ?? 0)}`}
                          />
                        </Stack>
                      </Box>
                    ))}
                  </CardContent>
                </Card>

                {/* Carrier */}
                <Card variant="outlined">
                  <Box sx={{ px: 2, py: 1, backgroundColor: alpha("#06b6d4", 0.05) }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Carrier
                    </Typography>
                  </Box>
                  <CardContent>
                    <DetailsRow label="Carrier Name" value={selected?.carrier?.carrierName} />
                    <DetailsRow label="Equipment Type" value={selected?.carrier?.equipmentType} />
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                      Fees
                    </Typography>
                    {(selected?.carrier?.carrierFees || []).map((f) => (
                      <Stack
                        key={f?._id ?? `${f?.name}-${f?.quantity}`}
                        direction="row"
                        justifyContent="space-between"
                        sx={{ mb: 0.5 }}
                      >
                        <Typography variant="body2">
                          {f?.name} × {f?.quantity}
                        </Typography>
                        <Typography variant="body2">${fmtMoney(f?.total || 0)}</Typography>
                      </Stack>
                    ))}
                    <Divider sx={{ my: 1 }} />
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" fontWeight={700}>
                        Total Carrier Fees
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        ${fmtMoney(selected?.carrier?.totalCarrierFees || 0)}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>

                {/* Shipper & Locations */}
                <Card variant="outlined">
                  <Box sx={{ px: 2, py: 1, backgroundColor: alpha("#34d399", 0.05) }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Shipper & Locations
                    </Typography>
                  </Box>
                  <CardContent>
                    <DetailsRow label="Shipper" value={selected?.shipper?.name} />
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" fontWeight={700} gutterBottom>
                          Pickups
                        </Typography>
                        {(selected?.shipper?.pickUpLocations || []).map((p, i) => (
                          <Box key={p?._id || i} sx={{ mb: 1 }}>
                            <Typography variant="body2">
                              {p?.name} — {p?.address}, {p?.city}, {p?.state} {p?.zipCode}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Weight: {p?.weight} • Pickup: {fmtDateTime(p?.pickUpDate)} • Notes:{" "}
                              {p?.remarks || "—"}
                            </Typography>
                          </Box>
                        ))}
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" fontWeight={700} gutterBottom>
                          Drops
                        </Typography>
                        {(selected?.shipper?.dropLocations || []).map((d, i) => (
                          <Box key={d?._id || i} sx={{ mb: 1 }}>
                            <Typography variant="body2">
                              {d?.name} — {d?.address}, {d?.city}, {d?.state} {d?.zipCode}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Weight: {d?.weight} • Drop: {fmtDateTime(d?.dropDate)} • Notes:{" "}
                              {d?.remarks || "—"}
                            </Typography>
                          </Box>
                        ))}
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

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
                {/* Final Approval - Only show for non-rejected DOs */}
                {activeTab !== 2 && (
                  <Card variant="outlined">
                    <Box sx={{ px: 2, py: 1, backgroundColor: alpha("#f97316", 0.05) }}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        Final Approval
                      </Typography>
                    </Box>
                    <CardContent>
                      {/* Remarks */}
                      <TextField
                        label="Remarks"
                        placeholder={approvalAction === "approve" ? "All charges verified and approved" : "Reason for rejection"}
                        fullWidth
                        multiline
                        minRows={6}   // large textarea
                        maxRows={12}
                        value={approvalRemarks}
                        onChange={(e) => setApprovalRemarks(e.target.value)}
                        required={approvalAction === "reject"}
                        sx={{ mb: 2 }}
                      />

                      {/* Action + Buttons */}
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={4}>
                          <FormControl fullWidth>
                            <InputLabel id="approval-action-label">Action</InputLabel>
                            <Select
                              labelId="approval-action-label"
                              value={approvalAction}
                              onChange={(e) => setApprovalAction(e.target.value)}
                            >
                              <MenuItem value="" disabled>Select Action</MenuItem>
                              <MenuItem value="approve">Approve</MenuItem>
                              <MenuItem value="reject">Reject</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>

                        <Grid item xs={12} sm={8} sx={{ display: "flex", gap: 2 }}>
                          <Button
                            variant="contained"
                            color="success"
                            startIcon={<SendIcon />}
                            onClick={postAccountantApproval}
                            disabled={posting || !approvalAction}
                          >
                            Send to Sales
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={() => setApprovalAction("reject")}
                          >
                            Mark as Reject
                          </Button>
                        </Grid>
                      </Grid>

                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
                        {/* This will call <code>/api/v1/do/accountant-approval</code>. */}
                      </Typography>
                    </CardContent>
                  </Card>
                )}

                {/* PDF Generation Buttons */}
                <Card variant="outlined">
                  <Box sx={{ px: 2, py: 1, backgroundColor: alpha("#7c3aed", 0.05) }}>
                    <Typography variant="subtitle1" fontWeight={700}>Generate PDFs</Typography>
                  </Box>
                  <CardContent>
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<PrintIcon />}
                        onClick={() => generatePDF('invoice')}
                        disabled={pdfLoading.invoice}
                        sx={{ minWidth: 160 }}
                      >
                        {pdfLoading.invoice ? 'Generating...' : 'Invoice PDF'}
                      </Button>
                      <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<PrintIcon />}
                        onClick={() => generatePDF('rate')}
                        disabled={pdfLoading.rate}
                        sx={{ minWidth: 160 }}
                      >
                        {pdfLoading.rate ? 'Generating...' : 'Rate Confirmation PDF'}
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<PrintIcon />}
                        onClick={() => generatePDF('bol')}
                        disabled={pdfLoading.bol}
                        sx={{ minWidth: 160 }}
                      >
                        {pdfLoading.bol ? 'Generating...' : 'BOL PDF'}
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>

                {/* Resubmit to Sales - Only show for rejected DOs */}
                {activeTab === 2 && (
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


              </Stack>
            ) : (
              <EmptyState title="No record selected" />
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setDetailsOpen(false)}>Close</Button>

          </DialogActions>
        </Dialog>

        {/* Edit DO Details Dialog */}
        <Dialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
        >
          <DialogTitle sx={{ p: 0 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 2,
                backgroundColor: BRAND,
                color: "white",
              }}
            >
              <Typography variant="h6" fontWeight={700}>
                Edit DO Details
              </Typography>
              <IconButton
                onClick={() => setEditOpen(false)}
                sx={{ color: "white" }}
                size="small"
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent dividers sx={{ p: 3 }}>
            {editData ? (
              <EditForm 
                data={editData} 
                onSubmit={editDODetails}
                loading={editLoading}
              />
            ) : (
              <Typography>No data available for editing.</Typography>
            )}
          </DialogContent>
        </Dialog>





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
      </Container>
    </ThemeProvider>
  );
}
