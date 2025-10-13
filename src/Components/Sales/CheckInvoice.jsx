// CheckInvoice.jsx
import React, { useEffect, useMemo, useState } from "react";
import Logo from '../../assets/LogoFinal.png';
import axios from "axios";
import {
  Box,
  Container,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Stack,
  Toolbar,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  LinearProgress,
  Tooltip,
  Divider,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Pagination,
  Link as MuiLink,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  AttachFile as AttachFileIcon,
  Image as ImageIcon,
  Description as DescriptionIcon,
  Person as PersonIcon,
  LocalShipping as TruckIcon,
  AttachMoney as MoneyIcon,
  PictureAsPdf as PdfIcon,
  Receipt as InvoiceIcon,
  Assignment as BolIcon,
  CheckCircle as RateIcon,
  CheckCircle,
  Cancel as XCircle,
} from "@mui/icons-material";

/* ================= Config ================ */
const API_CONFIG = {
  BASE_URL: "https://vpl-liveproject-1.onrender.com",
};

/* ================= Utils ================= */
const fmtMoney = (v) => (typeof v === "number" ? v.toFixed(2) : "0.00");
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : "—");
const shortId = (id = "") => (id?.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id);
const isImageUrl = (url = "") => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url);
const isPdfUrl = (url = "") => /\.pdf$/i.test(url);

const getStored = (k) => {
  if (typeof window === "undefined") return null;
  const s = sessionStorage.getItem(k);
  if (s !== null && s !== undefined) return s;
  return localStorage.getItem(k);
};

const EmptyState = ({ title = "No data", subtitle = "Try adjusting filters or search." }) => (
  <Paper elevation={0} sx={{ p: 4, textAlign: "center", border: "1px dashed #ddd" }}>
    <Typography variant="h6" gutterBottom>{title}</Typography>
    <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
  </Paper>
);

const DetailsRow = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between" gap={2} sx={{ py: 0.5 }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={600}>
      {typeof value === "string" || typeof value === "number" ? value : value || "—"}
    </Typography>
  </Stack>
);

const ImageGrid = ({ title, images = [] }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="body2" fontWeight={700} gutterBottom>{title}</Typography>
    {images.length === 0 ? (
      <Typography variant="caption" color="text.secondary">No images</Typography>
    ) : (
      <Grid container spacing={1}>
        {images.map((src, i) => (
          <Grid item key={i}>
            <a href={src} target="_blank" rel="noopener noreferrer">
              <img
                src={src}
                alt={`${title}-${i}`}
                style={{ width: 108, height: 80, objectFit: "cover", borderRadius: 6, border: "1px solid #eee" }}
              />
            </a>
          </Grid>
        ))}
      </Grid>
    )}
  </Box>
);

/* =============== Component =============== */
export default function CheckInvoice({ salesEmpId: propSalesId, defaultStatus = "accountant_approved" }) {
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, itemsPerPage: 50, totalItems: 0 });
  const [salesUser, setSalesUser] = useState(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(defaultStatus);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const [shipImgs, setShipImgs] = useState(null);
  const [shipImgsLoading, setShipImgsLoading] = useState(false);
  const [shipImgsErr, setShipImgsErr] = useState("");

  // PDF generation states
  const [pdfLoading, setPdfLoading] = useState({ invoice: false, rate: false, bol: false });

  // Sales person approval states
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState(null); // 'approve' or 'reject'
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [approvalLoading, setApprovalLoading] = useState(false);

  const token = getStored("token");
  const salesEmpId = propSalesId || getStored("salesEmpId") || "1234";

  const fetchList = async (targetPage = 1) => {
    setLoading(true);
    setServerError("");
    try {
      const url = `${API_CONFIG.BASE_URL}/api/v1/accountant/sales-user/dos-by-status`;
      const resp = await axios.get(url, {
        params: { salesEmpId, status, page: targetPage, limit: 50 },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = resp?.data?.data || {};
      setSalesUser(data.salesUser || null);
      setRows(data.doDocuments || []);
      setPagination(data.pagination || { currentPage: 1, totalPages: 1, itemsPerPage: 50, totalItems: (data.doDocuments || []).length });
    } catch (e) {
      setServerError(e?.response?.data?.message || e?.message || "Failed to fetch data");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchShipmentImages = async (shipmentNumber) => {
    if (!shipmentNumber) return setShipImgs(null);
    setShipImgsLoading(true);
    setShipImgsErr("");
    try {
      const url = `${API_CONFIG.BASE_URL}/api/v1/load/shipment/${shipmentNumber}/images`;
      const resp = await axios.get(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      setShipImgs(resp?.data || null);
    } catch (e) {
      setShipImgsErr(e?.response?.data?.message || e?.message || "Failed to load shipment images");
      setShipImgs(null);
    } finally {
      setShipImgsLoading(false);
    }
  };

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
          headers: token ? { Authorization: `Bearer ${token}` } : {}
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
        alert('Popup blocked. Please allow popups and try again.');
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
      alert('Rate and Load Confirmation PDF generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
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
      alert('Invoice PDF generated successfully!');
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
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
        <p>BOL Number(s): ${bolLine}</p>
        <p>Load Number: ${getLoadNumber()}</p>
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
        alert('BOL PDF generated successfully!');
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
      alert('Failed to generate BOL PDF. Please try again.');
    }
  };

  const generatePDF = async (type) => {
    if (!selected) {
      alert('No order selected. Please select an order first.');
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
      alert(`Failed to generate ${type} PDF: ${e?.response?.data?.message || e?.message || 'Unknown error'}`);
    } finally {
      setPdfLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleSalesPersonApproval = async () => {
    if (!selected || !approvalAction) return;
    
    setApprovalLoading(true);
    try {
      const payload = {
        doId: selected._id,
        salesEmpId: salesEmpId,
        action: approvalAction,
        remarks: approvalRemarks.trim() || (approvalAction === 'approve' ? 'All details verified and approved' : 'Details verification failed')
      };

      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/accountant/sales-person/approval`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        }
      );

      if (response.data.success) {
        alert(`✅ Sales person ${approvalAction} successful!`);
        // Close modal and refresh data
        setShowApprovalModal(false);
        setApprovalAction(null);
        setApprovalRemarks("");
        setDetailsOpen(false);
        fetchList(page);
      } else {
        alert(`❌ Failed to ${approvalAction}: ${response.data.message || 'Unknown error'}`);
      }
    } catch (e) {
      console.error('Sales person approval failed:', e);
      alert(`❌ Error: ${e?.response?.data?.message || e?.message || 'Unknown error'}`);
    } finally {
      setApprovalLoading(false);
    }
  };

  const openApprovalModal = (action) => {
    setApprovalAction(action);
    setApprovalRemarks("");
    setShowApprovalModal(true);
  };

  useEffect(() => {
    fetchList(page);
  }, [salesEmpId, status, page]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const loadNo = r?.customers?.[0]?.loadNo || "";
      const billTo = r?.customers?.[0]?.billTo || "";
      const carrierName = r?.carrier?.carrierName || "";
      const shipperName = r?.shipper?.name || "";
      const doId = r?._id || "";
      const shipment = r?.loadReference?.shipmentNumber || "";
      return (
        loadNo.toLowerCase().includes(q) ||
        billTo.toLowerCase().includes(q) ||
        carrierName.toLowerCase().includes(q) ||
        shipperName.toLowerCase().includes(q) ||
        doId.toLowerCase().includes(q) ||
        shipment.toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const openDetails = (row) => {
    setSelected(row);
    setDetailsOpen(true);
    fetchShipmentImages(row?.loadReference?.shipmentNumber);
  };

  const computeTotals = (row) => {
    const bill = (row?.customers || []).reduce(
      (sum, c) => sum + (c?.calculatedTotal ?? c?.totalAmount ?? (c?.lineHaul || 0) + (c?.fsc || 0) + (c?.other || 0)),
      0
    );
    const carrier = Number(row?.carrier?.totalCarrierFees ?? 0);
    return { bill, carrier, net: bill - carrier };
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* ===== Table Card ===== */}
      <Card elevation={2}>
        <CardHeader
          title="Check Invoices (Sales • Accountant Approved)"
          subheader={
            salesUser ? (
              <Typography variant="body2" color="text.secondary">
                Logged as: <b>{salesUser.employeeName}</b> ({salesUser.empId}) — {salesUser.department}
              </Typography>
            ) : "—"
          }
          action={
            <Tooltip title="Refresh">
              <span>
                <IconButton onClick={() => fetchList(page)} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          }
        />
        <CardContent>
          <Toolbar disableGutters sx={{ gap: 2, flexWrap: "wrap", pb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <MenuItem value="accountant_approved">Accountant Approved</MenuItem>
              </Select>
            </FormControl>

            <TextField
              size="small"
              placeholder="Search (Load No / Bill To / Carrier / Shipper / DO ID / Shipment#)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: 1, minWidth: 320 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch("")}>×</IconButton>
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
            <EmptyState title="No records" subtitle={serverError || "Try different search."} />
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>DO ID</TableCell>
                    <TableCell>Shipment #</TableCell>
                    <TableCell>Load No</TableCell>
                    <TableCell>Bill To</TableCell>
                    <TableCell>Carrier</TableCell>
                    <TableCell align="right">Bill</TableCell>
                    <TableCell align="right">Carrier</TableCell>
                    <TableCell>Approved At</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((r) => {
                    const cust = r?.customers?.[0] || {};
                    const t = computeTotals(r);
                    return (
                      <TableRow key={r?._id}>
                        <TableCell><Tooltip title={r?._id || ""}><span>{shortId(r?._id)}</span></Tooltip></TableCell>
                        <TableCell>{r?.loadReference?.shipmentNumber || "—"}</TableCell>
                        <TableCell>{cust?.loadNo || "—"}</TableCell>
                        <TableCell>{cust?.billTo || "—"}</TableCell>
                        <TableCell>{r?.carrier?.carrierName || "—"}</TableCell>
                        <TableCell align="right">${fmtMoney(t.bill)}</TableCell>
                        <TableCell align="right">${fmtMoney(t.carrier)}</TableCell>
                        <TableCell>{fmtDateTime(r?.accountantApproval?.approvedAt)}</TableCell>
                        <TableCell align="center">
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => openDetails(r)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {pagination?.totalPages > 1 && (
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
              <Pagination count={pagination.totalPages} page={page} onChange={(_, v) => setPage(v)} color="primary" />
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* ===== Details Dialog ===== */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          position: 'relative',
          pb: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <VisibilityIcon sx={{ fontSize: 28 }} />
            <Box>
              <Typography variant="h5" fontWeight={600}>
                Delivery Order Details
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Sales Department View
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => setDetailsOpen(false)}
            sx={{ 
              position: "absolute", 
              right: 16, 
              top: 16,
              color: 'white',
              backgroundColor: 'rgba(255,255,255,0.1)',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.2)'
              }
            }}
          >
            ✕
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 0, backgroundColor: '#f8f9fa' }}>
          {!selected ? (
            <EmptyState title="No record selected" />
          ) : (
            <React.Fragment>
            

            <Box sx={{ p: 3 }}>
            {/* Basic Information Section */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                mb: 2,
                p: 2,
                background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
                borderRadius: 2,
                border: '1px solid #bbdefb'
              }}>
                <DescriptionIcon sx={{ color: '#1976d2', fontSize: 24 }} />
                <Typography variant="h6" fontWeight={600} color="#1565c0">
                  Basic Information & Approval Status
                </Typography>
              </Box>
              
              <Card sx={{ 
                border: '2px solid #bbdefb',
                borderRadius: 2,
                background: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          DO ID
                        </Typography>
                        <Typography variant="body1" fontWeight={600} sx={{ 
                          fontFamily: 'monospace',
                          backgroundColor: '#f5f5f5',
                          p: 1,
                          borderRadius: 1,
                          border: '1px solid #e0e0e0'
                        }}>
                          {selected?._id || "—"}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Assignment Status
                        </Typography>
                        <Chip 
                          label={selected?.assignmentStatus || "—"} 
                          color="primary" 
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          DO Status
                        </Typography>
                        <Chip 
                          label={selected?.doStatus || "—"} 
                          color="secondary" 
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Updated At
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {fmtDateTime(selected?.updatedAt)}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Approved By
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {selected?.accountantApproval?.approvedBy?.employeeName || "—"}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Approved At
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {fmtDateTime(selected?.accountantApproval?.approvedAt)}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Approval Status
                        </Typography>
                        <Chip 
                          label={selected?.accountantApproval?.status || "—"} 
                          color="success" 
                          variant="filled"
                          size="small"
                        />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Email To Shipper
                        </Typography>
                        <Chip 
                          label={selected?.emailNotification?.sentToShipper ? "Yes" : "No"} 
                          color={selected?.emailNotification?.sentToShipper ? "success" : "default"} 
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                    </Grid>
                  </Grid>
                  
                  {selected?.accountantApproval?.remarks && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Remarks
                        </Typography>
                        <Box sx={{ 
                          p: 2, 
                          backgroundColor: '#f8f9fa', 
                          borderRadius: 1,
                          border: '1px solid #e9ecef'
                        }}>
                          <Typography variant="body2">
                            {selected?.accountantApproval?.remarks}
                          </Typography>
                        </Box>
                      </Box>
                    </>
                  )}
                </CardContent>
              </Card>
            </Box>

            {/* Customer Information Card */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                mb: 2,
                p: 2,
                background: 'linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%)',
                borderRadius: 2,
                border: '1px solid #c8e6c9'
              }}>
                <PersonIcon sx={{ color: '#4caf50', fontSize: 24 }} />
                <Typography variant="h6" fontWeight={600} color="#2e7d32">
                  Customer Information
                </Typography>
              </Box>
              
              <Card sx={{ 
                border: '2px solid #c8e6c9',
                borderRadius: 2,
                background: '#fafafa'
              }}>
                <CardContent sx={{ p: 3 }}>
                  {(selected?.customers || []).map((c, index) => (
                    <Box key={c?._id}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1, 
                        mb: 2 
                      }}>
                        <Box sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: '#4caf50',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {index + 1}
                        </Box>
                        <Typography variant="h6" fontWeight={600} color="#2e7d32">
                          Customer {index + 1}
                        </Typography>
                      </Box>
                      
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              Bill To
                            </Typography>
                            <Typography variant="body1" fontWeight={600}>
                              {c?.billTo || "—"}
                            </Typography>
                          </Box>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              Work Order No
                            </Typography>
                            <Typography variant="body1" fontWeight={600}>
                              {c?.workOrderNo || "—"}
                            </Typography>
                          </Box>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              FSC
                            </Typography>
                            <Typography variant="body1" fontWeight={600}>
                              ${fmtMoney(c?.fsc || 0)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              Total Amount
                            </Typography>
                            <Typography variant="h6" fontWeight={700} color="#4caf50">
                              ${fmtMoney(c?.calculatedTotal ?? c?.totalAmount ?? 0)}
                            </Typography>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              Dispatcher Name
                            </Typography>
                            <Typography variant="body1" fontWeight={600}>
                              {selected?.salesUser?.employeeName || "—"}
                            </Typography>
                          </Box>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              Line Haul
                            </Typography>
                            <Typography variant="body1" fontWeight={600}>
                              ${fmtMoney(c?.lineHaul || 0)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              Other
                            </Typography>
                            <Typography variant="body1" fontWeight={600}>
                              ${fmtMoney(c?.other || 0)}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Box>

            {/* Carrier Information Card */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                mb: 2,
                p: 2,
                background: 'linear-gradient(135deg, #f3e5f5 0%, #fce4ec 100%)',
                borderRadius: 2,
                border: '1px solid #e1bee7'
              }}>
                <TruckIcon sx={{ color: '#9c27b0', fontSize: 24 }} />
                <Typography variant="h6" fontWeight={600} color="#7b1fa2">
                  Carrier Information
                </Typography>
              </Box>
              
              <Card sx={{ 
                border: '2px solid #e1bee7',
                borderRadius: 2,
                background: '#fafafa'
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <TruckIcon sx={{ color: '#9c27b0', fontSize: 20 }} />
                          <Typography variant="body2" color="text.secondary">
                            Carrier Name
                          </Typography>
                        </Box>
                        <Typography variant="body1" fontWeight={600}>
                          {selected?.carrier?.carrierName || "—"}
                        </Typography>
                      </Box>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <MoneyIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                          <Typography variant="body2" color="text.secondary">
                            Total Carrier Fees
                          </Typography>
                        </Box>
                        <Typography variant="h6" fontWeight={700} color="#4caf50">
                          ${fmtMoney(selected?.carrier?.totalCarrierFees || 0)}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <TruckIcon sx={{ color: '#9c27b0', fontSize: 20 }} />
                          <Typography variant="body2" color="text.secondary">
                            Equipment Type
                          </Typography>
                        </Box>
                        <Typography variant="body1" fontWeight={600}>
                          {selected?.carrier?.equipmentType || "—"}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  
                  {/* Carrier Charges Section */}
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="body1" fontWeight={600} sx={{ mb: 2 }}>
                      Carrier Charges
                    </Typography>
                    <Box sx={{ 
                      p: 2, 
                      backgroundColor: '#f3e5f5', 
                      borderRadius: 1,
                      border: '1px solid #e1bee7'
                    }}>
                      {(selected?.carrier?.carrierFees || []).map((f) => (
                        <Box key={f?._id} sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          mb: 1
                        }}>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {f?.name || "—"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Quantity: {f?.quantity || 1} × Amount: ${fmtMoney(f?.total || 0)}
                            </Typography>
                          </Box>
                          <Typography variant="body1" fontWeight={700} color="#4caf50">
                            ${fmtMoney(f?.total || 0)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* Shipper & Locations Section */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                mb: 2,
                p: 2,
                background: 'linear-gradient(135deg, #fff3e0 0%, #fce4ec 100%)',
                borderRadius: 2,
                border: '1px solid #ffcc02'
              }}>
                <TruckIcon sx={{ color: '#ff9800', fontSize: 24 }} />
                <Typography variant="h6" fontWeight={600} color="#f57c00">
                  Shipper & Locations
                </Typography>
              </Box>
              
              <Card sx={{ 
                border: '2px solid #ffcc02',
                borderRadius: 2,
                background: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Shipper Name
                    </Typography>
                    <Typography variant="h6" fontWeight={600} color="#f57c00">
                      {selected?.shipper?.name || "—"}
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ 
                        p: 2, 
                        backgroundColor: '#fff8e1', 
                        borderRadius: 2,
                        border: '1px solid #ffcc02'
                      }}>
                        <Typography variant="h6" fontWeight={600} color="#f57c00" sx={{ mb: 2 }}>
                          📍 Pickup Locations
                        </Typography>
                        {(selected?.shipper?.pickUpLocations || []).length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            No pickup locations
                          </Typography>
                        ) : (
                          (selected?.shipper?.pickUpLocations || []).map((p, i) => (
                            <Box key={p?._id || i} sx={{ mb: 2, p: 2, backgroundColor: 'white', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                              <Typography variant="body1" fontWeight={600} sx={{ mb: 1 }}>
                                {p?.name || `Pickup ${i + 1}`}
                              </Typography>
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                📍 {p?.address}, {p?.city}, {p?.state} {p?.zipCode}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Chip size="small" label={`Weight: ${p?.weight || "—"}`} variant="outlined" />
                                <Chip size="small" label={`Pickup: ${fmtDateTime(p?.pickUpDate)}`} variant="outlined" />
                              </Box>
                              {p?.remarks && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                  Notes: {p?.remarks}
                                </Typography>
                              )}
                            </Box>
                          ))
                        )}
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ 
                        p: 2, 
                        backgroundColor: '#f3e5f5', 
                        borderRadius: 2,
                        border: '1px solid #e1bee7'
                      }}>
                        <Typography variant="h6" fontWeight={600} color="#7b1fa2" sx={{ mb: 2 }}>
                          🎯 Drop Locations
                        </Typography>
                        {(selected?.shipper?.dropLocations || []).length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            No drop locations
                          </Typography>
                        ) : (
                          (selected?.shipper?.dropLocations || []).map((d, i) => (
                            <Box key={d?._id || i} sx={{ mb: 2, p: 2, backgroundColor: 'white', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                              <Typography variant="body1" fontWeight={600} sx={{ mb: 1 }}>
                                {d?.name || `Drop ${i + 1}`}
                              </Typography>
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                📍 {d?.address}, {d?.city}, {d?.state} {d?.zipCode}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Chip size="small" label={`Weight: ${d?.weight || "—"}`} variant="outlined" />
                                <Chip size="small" label={`Drop: ${fmtDateTime(d?.dropDate)}`} variant="outlined" />
                              </Box>
                              {d?.remarks && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                  Notes: {d?.remarks}
                                </Typography>
                              )}
                            </Box>
                          ))
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Box>

            {/* Load Reference Section */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                mb: 2,
                p: 2,
                background: 'linear-gradient(135deg, #e8f5e8 0%, #e3f2fd 100%)',
                borderRadius: 2,
                border: '1px solid #4caf50'
              }}>
                <DescriptionIcon sx={{ color: '#4caf50', fontSize: 24 }} />
                <Typography variant="h6" fontWeight={600} color="#2e7d32">
                  Load Reference & Tracking
                </Typography>
              </Box>
              
              <Card sx={{ 
                border: '2px solid #4caf50',
                borderRadius: 2,
                background: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Shipment #
                        </Typography>
                        <Typography variant="body1" fontWeight={600} sx={{ 
                          fontFamily: 'monospace',
                          backgroundColor: '#f5f5f5',
                          p: 1,
                          borderRadius: 1,
                          border: '1px solid #e0e0e0'
                        }}>
                          {selected?.loadReference?.shipmentNumber || "—"}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          PO #
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {selected?.loadReference?.poNumber || "—"}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          BOL #
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {selected?.loadReference?.bolNumber || "—"}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Load Type
                        </Typography>
                        <Chip 
                          label={selected?.loadReference?.loadType || "—"} 
                          color="primary" 
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Vehicle Type
                        </Typography>
                        <Chip 
                          label={selected?.loadReference?.vehicleType || "—"} 
                          color="secondary" 
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Pickup Date
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {fmtDateTime(selected?.loadReference?.pickupDate)}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Delivery Date
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {fmtDateTime(selected?.loadReference?.deliveryDate)}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Rate (Type)
                        </Typography>
                        <Typography variant="body1" fontWeight={600} color="#4caf50">
                          ${fmtMoney(selected?.loadReference?.rate)} ({selected?.loadReference?.rateType})
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Status
                        </Typography>
                        <Chip 
                          label={selected?.loadReference?.status || "—"} 
                          color="success" 
                          variant="filled"
                          size="small"
                        />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Delivery Approved
                        </Typography>
                        <Chip 
                          label={selected?.loadReference?.deliveryApproval ? "Yes" : "No"} 
                          color={selected?.loadReference?.deliveryApproval ? "success" : "default"} 
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 3 }} />
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ 
                        p: 2, 
                        backgroundColor: '#e8f5e8', 
                        borderRadius: 2,
                        border: '1px solid #4caf50'
                      }}>
                        <Typography variant="h6" fontWeight={600} color="#2e7d32" sx={{ mb: 2 }}>
                          🚚 Origin
                        </Typography>
                        <Typography variant="body1" fontWeight={600} sx={{ mb: 1 }}>
                          {selected?.loadReference?.origin?.city}, {selected?.loadReference?.origin?.state}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Arrived: {fmtDateTime(selected?.loadReference?.originPlace?.arrivedAt)}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ 
                        p: 2, 
                        backgroundColor: '#e3f2fd', 
                        borderRadius: 2,
                        border: '1px solid #2196f3'
                      }}>
                        <Typography variant="h6" fontWeight={600} color="#1565c0" sx={{ mb: 2 }}>
                          🎯 Destination
                        </Typography>
                        <Typography variant="body1" fontWeight={600} sx={{ mb: 1 }}>
                          {selected?.loadReference?.destination?.city}, {selected?.loadReference?.destination?.state}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Arrived: {fmtDateTime(selected?.loadReference?.destinationPlace?.arrivedAt)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Box>

            {/* Shipment Images Section */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                mb: 2,
                p: 2,
                background: 'linear-gradient(135deg, #f3e5f5 0%, #e8f5e8 100%)',
                borderRadius: 2,
                border: '1px solid #9c27b0'
              }}>
                <ImageIcon sx={{ color: '#9c27b0', fontSize: 24 }} />
                <Typography variant="h6" fontWeight={600} color="#7b1fa2">
                  Shipment Images & Status
                </Typography>
              </Box>
              
              <Card sx={{ 
                border: '2px solid #9c27b0',
                borderRadius: 2,
                background: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <CardContent sx={{ p: 3 }}>
                  {shipImgsLoading && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <LinearProgress sx={{ mb: 2 }} />
                      <Typography variant="body2">Loading shipment images…</Typography>
                    </Box>
                  )}
                  {shipImgsErr && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="error">{shipImgsErr}</Typography>
                    </Box>
                  )}
                  {!shipImgsLoading && shipImgs?.images && (
                    <Box>
                      {/* Pickup Images Row */}
                      <Typography variant="h6" fontWeight={600} color="#7b1fa2" sx={{ mb: 3 }}>
                        📸 Pickup Images
                      </Typography>
                      <Box sx={{ 
                        p: 3, 
                        backgroundColor: '#f3e5f5', 
                        borderRadius: 2,
                        border: '1px solid #9c27b0',
                        mb: 4
                      }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6} md={4}>
                            <ImageGrid title="Empty Truck" images={shipImgs.images.emptyTruckImages || []} />
                          </Grid>
                          <Grid item xs={12} sm={6} md={4}>
                            <ImageGrid title="Loaded Truck" images={shipImgs.images.loadedTruckImages || []} />
                          </Grid>
                          <Grid item xs={12} sm={6} md={4}>
                            <ImageGrid title="POD" images={shipImgs.images.podImages || []} />
                          </Grid>
                          <Grid item xs={12} sm={6} md={4}>
                            <ImageGrid title="EIR Tickets" images={shipImgs.images.eirTickets || []} />
                          </Grid>
                          <Grid item xs={12} sm={6} md={4}>
                            <ImageGrid title="Container Images" images={shipImgs.images.containerImages || []} />
                          </Grid>
                          <Grid item xs={12} sm={6} md={4}>
                            <ImageGrid title="Seal Images" images={shipImgs.images.sealImages || []} />
                          </Grid>
                        </Grid>
                      </Box>

                      {/* Drop Images Row */}
                      <Typography variant="h6" fontWeight={600} color="#7b1fa2" sx={{ mb: 3 }}>
                        🎯 Drop Location Images
                      </Typography>
                      <Box sx={{ 
                        p: 3, 
                        backgroundColor: '#e8f5e8', 
                        borderRadius: 2,
                        border: '1px solid #4caf50',
                        mb: 4
                      }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6} md={3}>
                            <ImageGrid title="Drop – POD" images={shipImgs.images.dropLocationImages?.podImages || []} />
                          </Grid>
                          <Grid item xs={12} sm={6} md={3}>
                            <ImageGrid title="Drop – Loaded Truck" images={shipImgs.images.dropLocationImages?.loadedTruckImages || []} />
                          </Grid>
                          <Grid item xs={12} sm={6} md={3}>
                            <ImageGrid title="Drop – Site Images" images={shipImgs.images.dropLocationImages?.dropLocationImages || []} />
                          </Grid>
                          <Grid item xs={12} sm={6} md={3}>
                            <ImageGrid title="Drop – Empty Truck" images={shipImgs.images.dropLocationImages?.emptyTruckImages || []} />
                          </Grid>
                        </Grid>
                      </Box>

                      <Divider sx={{ my: 3 }} />
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                          <Box sx={{ 
                            p: 2, 
                            backgroundColor: '#e8f5e8', 
                            borderRadius: 2,
                            border: '1px solid #4caf50'
                          }}>
                            <Typography variant="h6" fontWeight={600} color="#2e7d32" sx={{ mb: 1 }}>
                              🚚 Origin
                            </Typography>
                            <Typography variant="body1" fontWeight={600} sx={{ mb: 1 }}>
                              {shipImgs.images.originPlace?.location || "—"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Arrived: {fmtDateTime(shipImgs.images.originPlace?.arrivedAt)}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Box sx={{ 
                            p: 2, 
                            backgroundColor: '#e3f2fd', 
                            borderRadius: 2,
                            border: '1px solid #2196f3'
                          }}>
                            <Typography variant="h6" fontWeight={600} color="#1565c0" sx={{ mb: 1 }}>
                              🎯 Destination
                            </Typography>
                            <Typography variant="body1" fontWeight={600} sx={{ mb: 1 }}>
                              {shipImgs.images.destinationPlace?.location || "—"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Arrived: {fmtDateTime(shipImgs.images.destinationPlace?.arrivedAt)}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Box sx={{ 
                            p: 2, 
                            backgroundColor: '#f3e5f5', 
                            borderRadius: 2,
                            border: '1px solid #9c27b0'
                          }}>
                            <Typography variant="h6" fontWeight={600} color="#7b1fa2" sx={{ mb: 1 }}>
                              ✅ Drop Status
                            </Typography>
                            <Typography variant="body1" fontWeight={600} sx={{ mb: 1 }}>
                              Completed: {shipImgs.images.dropLocationCompleted ? "Yes" : "No"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Drop Arrived: {fmtDateTime(shipImgs.images.dropLocationArrivalTime)}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                  
                </CardContent>
              </Card>
            </Box>

            {/* Additional Documents Section */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                mb: 2,
                p: 2,
                background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
                borderRadius: 2,
                border: '1px solid #2196f3'
              }}>
                <AttachFileIcon sx={{ color: '#2196f3', fontSize: 24 }} />
                <Typography variant="h6" fontWeight={600} color="#1565c0">
                  Additional Documents
                </Typography>
              </Box>
              
              <Card sx={{ 
                border: '2px solid #2196f3',
                borderRadius: 2,
                background: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <CardContent sx={{ p: 3 }}>
                  {(selected?.additionalDocuments || []).length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <AttachFileIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="body2" color="text.secondary">
                        No additional documents uploaded
                      </Typography>
                    </Box>
                  ) : (
                    <Grid container spacing={3}>
                      {selected.additionalDocuments.map((doc) => {
                        const url = doc?.documentUrl || "";
                        const isImg = isImageUrl(url);
                        const isPdf = isPdfUrl(url);
                        return (
                          <Grid item xs={12} sm={6} md={4} key={doc?._id}>
                            <Paper 
                              variant="outlined" 
                              sx={{ 
                                p: 2, 
                                borderRadius: 2,
                                border: '2px solid #e3f2fd',
                                '&:hover': {
                                  border: '2px solid #2196f3',
                                  boxShadow: '0 4px 12px rgba(33, 150, 243, 0.15)'
                                }
                              }}
                            >
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                {isImg ? <ImageIcon fontSize="small" color="primary" /> : <DescriptionIcon fontSize="small" color="primary" />}
                                <MuiLink href={url} target="_blank" rel="noopener" underline="hover" sx={{ fontWeight: 600 }}>
                                  {isPdf ? "PDF Document" : (isImg ? "Image" : "File")}
                                </MuiLink>
                                <Chip 
                                  size="small" 
                                  variant="outlined" 
                                  label={isPdf ? "PDF" : isImg ? "Image" : "File"} 
                                  color="primary"
                                  sx={{ ml: "auto" }} 
                                />
                              </Stack>
                              {isImg && (
                                <a href={url} target="_blank" rel="noopener noreferrer">
                                  <img 
                                    src={url} 
                                    alt="additional" 
                                    style={{ 
                                      width: "100%", 
                                      height: 140, 
                                      objectFit: "cover", 
                                      borderRadius: 8, 
                                      border: "2px solid #e3f2fd",
                                      cursor: 'pointer'
                                    }} 
                                  />
                                </a>
                              )}
                              <Divider sx={{ my: 2 }} />
                              <Box>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                  <strong>Uploaded by:</strong> {doc?.uploadedBy?.employeeName || "—"} ({doc?.uploadedBy?.empId || "—"})
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                  <strong>Department:</strong> {doc?.uploadedBy?.department || "—"}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  <strong>Uploaded at:</strong> {fmtDateTime(doc?.uploadedAt)}
                                </Typography>
                              </Box>
                            </Paper>
                          </Grid>
                        );
                      })}
                    </Grid>
                  )}
                </CardContent>
              </Card>
            </Box>

            {/* Uploaded Files Section */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                mb: 2,
                p: 2,
                background: 'linear-gradient(135deg, #fff3e0 0%, #e8f5e8 100%)',
                borderRadius: 2,
                border: '1px solid #ff9800'
              }}>
                <AttachFileIcon sx={{ color: '#ff9800', fontSize: 24 }} />
                <Typography variant="h6" fontWeight={600} color="#f57c00">
                  Uploaded Files
                </Typography>
              </Box>
              
              <Card sx={{ 
                border: '2px solid #ff9800',
                borderRadius: 2,
                background: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <CardContent sx={{ p: 3 }}>
                  {(selected?.uploadedFiles || []).length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <AttachFileIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="body2" color="text.secondary">
                        No files uploaded
                      </Typography>
                    </Box>
                  ) : (
                    <Stack spacing={2}>
                      {selected.uploadedFiles.map((f) => (
                        <Paper 
                          key={f?._id} 
                          variant="outlined" 
                          sx={{ 
                            p: 2, 
                            borderRadius: 2,
                            border: '2px solid #fff3e0',
                            '&:hover': {
                              border: '2px solid #ff9800',
                              boxShadow: '0 4px 12px rgba(255, 152, 0, 0.15)'
                            }
                          }}
                        >
                          <Stack direction="row" spacing={2} alignItems="center">
                            <AttachFileIcon fontSize="small" color="warning" />
                            <MuiLink 
                              href={f?.fileUrl} 
                              target="_blank" 
                              rel="noopener"
                              sx={{ fontWeight: 600, flex: 1 }}
                            >
                              {f?.fileName}
                            </MuiLink>
                            <Chip 
                              size="small" 
                              label={f?.fileType} 
                              color="warning" 
                              variant="outlined"
                            />
                            <Typography variant="caption" color="text.secondary">
                              {fmtDateTime(f?.uploadDate)}
                            </Typography>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                  
                </CardContent>
              </Card>
              {/* Sales Person Approval Buttons */}
            <Box sx={{ 
              p: 3, 
              backgroundColor: 'white',
              borderBottom: '1px solid #e0e0e0'
            }}>
              <Typography variant="h6" fontWeight={600} color="#1565c0" sx={{ mb: 2 }}>
                🎯 Sales Person Approval
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<CheckCircle />}
                    onClick={() => openApprovalModal('approve')}
                    sx={{
                      background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                      color: 'white',
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #45a049 0%, #3d8b40 100%)',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(76, 175, 80, 0.4)'
                      }
                    }}
                  >
                    Approve
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<XCircle />}
                    onClick={() => openApprovalModal('reject')}
                    sx={{
                      background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                      color: 'white',
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #d32f2f 0%, #c62828 100%)',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(244, 67, 54, 0.4)'
                      }
                    }}
                  >
                    Reject
                  </Button>
                </Grid>
              </Grid>
            </Box>

              {/* PDF Generation Buttons */}
            <Box sx={{ 
              p: 3, 
              backgroundColor: 'white',
              borderBottom: '1px solid #e0e0e0'
            }}>
              <Typography variant="h6" fontWeight={600} color="#1565c0" sx={{ mb: 2 }}>
                📄 Generate Documents
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={pdfLoading.invoice ? <LinearProgress size={20} /> : <InvoiceIcon />}
                    onClick={() => generatePDF('invoice')}
                    disabled={pdfLoading.invoice}
                    sx={{
                      background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
                      color: 'white',
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #45a049 0%, #3d8b40 100%)',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(76, 175, 80, 0.4)'
                      },
                      '&:disabled': {
                        background: '#cccccc',
                        color: '#666666'
                      }
                    }}
                  >
                    {pdfLoading.invoice ? 'Generating...' : 'Invoice PDF'}
                  </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={pdfLoading.rate ? <LinearProgress size={20} /> : <RateIcon />}
                    onClick={() => generatePDF('rate')}
                    disabled={pdfLoading.rate}
                    sx={{
                      background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                      color: 'white',
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(33, 150, 243, 0.4)'
                      },
                      '&:disabled': {
                        background: '#cccccc',
                        color: '#666666'
                      }
                    }}
                  >
                    {pdfLoading.rate ? 'Generating...' : 'Rate Confirmation PDF'}
                  </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={pdfLoading.bol ? <LinearProgress size={20} /> : <BolIcon />}
                    onClick={() => generatePDF('bol')}
                    disabled={pdfLoading.bol}
                    sx={{
                      background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                      color: 'white',
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #f57c00 0%, #ef6c00 100%)',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(255, 152, 0, 0.4)'
                      },
                      '&:disabled': {
                        background: '#cccccc',
                        color: '#666666'
                      }
                    }}
                  >
                    {pdfLoading.bol ? 'Generating...' : 'BOL PDF'}
                  </Button>
                </Grid>
              </Grid>
            </Box>
            </Box>
            </Box>
            </React.Fragment>
          )}
        </DialogContent>

        <DialogActions sx={{ 
          p: 3, 
          backgroundColor: '#f8f9fa',
          borderTop: '1px solid #e0e0e0'
        }}>
          <Button 
            onClick={() => setDetailsOpen(false)} 
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              px: 4,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
              }
            }}
          >
            Close Details
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sales Person Approval Modal */}
      <Dialog
        open={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          }
        }}
      >
        <DialogTitle sx={{ 
          background: approvalAction === 'approve' 
            ? 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)'
            : 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
          color: 'white',
          position: 'relative',
          pb: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {approvalAction === 'approve' ? (
              <CheckCircle sx={{ fontSize: 28 }} />
            ) : (
              <XCircle sx={{ fontSize: 28 }} />
            )}
            <Box>
              <Typography variant="h5" fontWeight={600}>
                {approvalAction === 'approve' ? 'Approve Sales Person' : 'Reject Sales Person'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {approvalAction === 'approve' 
                  ? 'Confirm approval of this delivery order' 
                  : 'Confirm rejection of this delivery order'}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => setShowApprovalModal(false)}
            sx={{ 
              position: "absolute", 
              right: 16, 
              top: 16,
              color: 'white',
              backgroundColor: 'rgba(255,255,255,0.1)',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.2)'
              }
            }}
          >
            ✕
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {selected && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Delivery Order ID
              </Typography>
              <Typography variant="body1" fontWeight={600} sx={{ 
                fontFamily: 'monospace',
                backgroundColor: '#f5f5f5',
                p: 1,
                borderRadius: 1,
                border: '1px solid #e0e0e0'
              }}>
                {selected._id}
              </Typography>
            </Box>
          )}

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Sales Employee ID
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {salesEmpId}
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Remarks {approvalAction === 'reject' && <span style={{ color: '#f44336' }}>*</span>}
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={approvalRemarks}
              onChange={(e) => setApprovalRemarks(e.target.value)}
              placeholder={
                approvalAction === 'approve' 
                  ? 'Add optional remarks for approval...'
                  : 'Please provide reason for rejection...'
              }
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: approvalAction === 'approve' ? '#4caf50' : '#f44336',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: approvalAction === 'approve' ? '#4caf50' : '#f44336',
                  },
                }
              }}
            />
            {approvalAction === 'reject' && !approvalRemarks.trim() && (
              <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                Remarks are required for rejection
              </Typography>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ 
          p: 3, 
          backgroundColor: '#f8f9fa',
          borderTop: '1px solid #e0e0e0'
        }}>
          <Button 
            onClick={() => setShowApprovalModal(false)}
            variant="outlined"
            sx={{
              borderColor: '#e0e0e0',
              color: '#666',
              px: 3,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#ccc',
                backgroundColor: '#f5f5f5'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSalesPersonApproval}
            disabled={approvalLoading || (approvalAction === 'reject' && !approvalRemarks.trim())}
            variant="contained"
            sx={{
              background: approvalAction === 'approve' 
                ? 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)'
                : 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
              color: 'white',
              px: 4,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                background: approvalAction === 'approve' 
                  ? 'linear-gradient(135deg, #45a049 0%, #3d8b40 100%)'
                  : 'linear-gradient(135deg, #d32f2f 0%, #c62828 100%)',
                transform: 'translateY(-1px)',
                boxShadow: approvalAction === 'approve' 
                  ? '0 4px 12px rgba(76, 175, 80, 0.4)'
                  : '0 4px 12px rgba(244, 67, 54, 0.4)'
              },
              '&:disabled': {
                background: '#cccccc',
                color: '#666666',
                transform: 'none',
                boxShadow: 'none'
              }
            }}
          >
            {approvalLoading ? 'Processing...' : `Confirm ${approvalAction === 'approve' ? 'Approve' : 'Reject'}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
