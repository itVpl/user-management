// CheckInvoice.jsx
import React, { useEffect, useMemo, useState } from "react";
import Logo from '../../assets/LogoFinal.png';
import axios from "axios";
import { Search, FileText, CheckCircle, XCircle, Clock, RefreshCw, Truck, Package, DollarSign, Calendar, Eye, Download, Receipt, User } from 'lucide-react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Divider,
  LinearProgress,
  IconButton,
  Link as MuiLink,
  Paper,
  Stack,
  TextField,
  Snackbar,
  Alert,
} from "@mui/material";
import {
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
} from "@mui/icons-material";
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

/* ================= Config ================ */
import API_CONFIG from '../../config/api';

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
  <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-xl bg-white">
    <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
    <p className="text-sm text-gray-500">{subtitle}</p>
  </div>
);

const DetailsRow = ({ label, value }) => (
  <div className="flex justify-between items-center py-2">
    <p className="text-sm text-gray-600">{label}</p>
    <p className="text-sm font-semibold text-gray-800">
      {typeof value === "string" || typeof value === "number" ? value : value || "—"}
    </p>
  </div>
);

const ImageGrid = ({ title, images = [] }) => (
  <div className="mb-4">
    <p className="text-sm font-bold text-gray-800 mb-2">{title}</p>
    {images.length === 0 ? (
      <p className="text-xs text-gray-500">No images</p>
    ) : (
      <div className="flex flex-wrap gap-2">
        {images.map((src, i) => (
          <a key={i} href={src} target="_blank" rel="noopener noreferrer">
            <img
              src={src}
              alt={`${title}-${i}`}
              className="w-28 h-20 object-cover rounded-lg border border-gray-200 hover:border-blue-400 transition-colors"
            />
          </a>
        ))}
      </div>
    )}
  </div>
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
  
  // Notification state
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success', // 'success', 'error', 'warning', 'info'
  });

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
        setNotification({
          open: true,
          message: `Sales person ${approvalAction === 'approve' ? 'approval' : 'rejection'} successful!`,
          severity: 'success',
        });
        // Close modal and refresh data
        setShowApprovalModal(false);
        setApprovalAction(null);
        setApprovalRemarks("");
        setDetailsOpen(false);
        fetchList(page);
      } else {
        setNotification({
          open: true,
          message: `Failed to ${approvalAction}: ${response.data.message || 'Unknown error'}`,
          severity: 'error',
        });
      }
    } catch (e) {
      console.error('Sales person approval failed:', e);
      setNotification({
        open: true,
        message: `Error: ${e?.response?.data?.message || e?.message || 'Unknown error'}`,
        severity: 'error',
      });
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

  // Pagination calculations
  const itemsPerPage = pagination?.itemsPerPage || 50;
  const totalPages = pagination?.totalPages || 1;
  const currentPage = page;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRows = filtered.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  return (
    <div className="p-6">
      {/* Statistics Cards */}
      <div className="flex items-center gap-6 mb-6">
        <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Approved</p>
              <p className="text-xl font-bold text-gray-800">{rows.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Package className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Filtered</p>
              <p className="text-xl font-bold text-blue-600">{filtered.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Calendar className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Today</p>
              <p className="text-xl font-bold text-purple-600">
                {filtered.filter(r => {
                  const date = r?.accountantApproval?.approvedAt;
                  if (!date) return false;
                  return new Date(date).toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                }).length}
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1"></div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search (Load No / Bill To / Carrier / Shipper / DO ID / Shipment#)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-96 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
            onClick={() => fetchList(page)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Loading...</span>
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                <span>Refresh</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">Loading invoices...</p>
            <p className="text-gray-400 text-sm">Please wait while we fetch the data</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No records" subtitle={serverError || "Try different search."} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                  <tr>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">DO ID</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Shipment #</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Load No</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Bill To</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Carrier</th>
                    <th className="text-right py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Bill</th>
                    <th className="text-right py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Carrier</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Approved At</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRows.map((r, index) => {
                    const cust = r?.customers?.[0] || {};
                    const t = computeTotals(r);
                    return (
                      <tr key={r?._id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                        <td className="py-2 px-3">
                          <span className="font-medium text-gray-700" title={r?._id || ""}>{shortId(r?._id)}</span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-medium text-gray-700">{r?.loadReference?.shipmentNumber || "—"}</span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-medium text-gray-700">{cust?.loadNo || "—"}</span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-medium text-gray-700">{cust?.billTo || r?.customerName || "—"}</span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-medium text-gray-700">{r?.carrier?.carrierName || "—"}</span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className="font-bold text-green-600">${fmtMoney(t.bill)}</span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className="font-bold text-blue-600">${fmtMoney(t.carrier)}</span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-medium text-gray-700">{fmtDateTime(r?.accountantApproval?.approvedAt)}</span>
                        </td>
                        <td className="py-2 px-3">
                          <button
                            onClick={() => openDetails(r)}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg hover:from-blue-600 hover:to-indigo-700 hover:shadow-xl"
                          >
                            <Eye size={12} />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Enhanced Pagination */}
      {totalPages > 1 && filtered.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filtered.length)} of {filtered.length} invoices
            {search && ` (filtered from ${rows.length} total)`}
          </div>

          <div className="flex items-center gap-2 bg-white rounded-xl shadow-lg border border-gray-200 p-2">
            {/* Previous Button */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {/* First Page */}
              {currentPage > 3 && (
                <>
                  <button
                    onClick={() => handlePageChange(1)}
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all duration-200"
                  >
                    1
                  </button>
                  {currentPage > 4 && (
                    <span className="px-2 text-gray-400">...</span>
                  )}
                </>
              )}

              {/* Current Page Range */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  if (totalPages <= 7) return true;
                  if (currentPage <= 4) return page <= 5;
                  if (currentPage >= totalPages - 3) return page >= totalPages - 4;
                  return page >= currentPage - 2 && page <= currentPage + 2;
                })
                .map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      currentPage === pageNum
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

              {/* Last Page */}
              {currentPage < totalPages - 2 && totalPages > 7 && (
                <>
                  {currentPage < totalPages - 3 && (
                    <span className="px-2 text-gray-400">...</span>
                  )}
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all duration-200"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            {/* Next Button */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
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

      {/* ===== Details Dialog ===== */}
      {detailsOpen && (
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
                    <h2 className="text-xl font-bold">Delivery Order Details</h2>
                    <p className="text-blue-100">Sales Department View</p>
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
              {!selected ? (
                <EmptyState title="No record selected" />
              ) : (
                <React.Fragment>
            

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
                                <p className="font-medium text-gray-800">{selected?.salesUser?.employeeName || 'N/A'}</p>
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
                                <p className="font-medium text-gray-800">${fmtMoney(customer?.other || 0)}</p>
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
                              <div key={charge?._id || i} className="bg-white rounded-lg p-3 border border-purple-200">
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

                  {/* BOL Information */}
                  {(() => {
                    const bols = selected?.loadReference?.bolNumber ? [selected.loadReference.bolNumber] : [];
                    const additionalBols = selected?.additionalDocuments?.filter(doc => doc?.documentType === 'BOL') || [];
                    const allBols = [...bols, ...additionalBols.map(doc => doc?.fileName || doc?.documentUrl)].filter(Boolean);
                    return allBols.length > 0 ? (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-blue-800 mb-2">BOL Information</h3>
                        <ul className="list-disc pl-5 text-gray-800">
                          {allBols.map((b, i) => (
                            <li key={i} className="break-all">{b}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null;
                  })()}

                  {/* Shipper Information */}
                  {selected?.shipper && (
                    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Truck className="text-orange-600" size={20} />
                        <h3 className="text-lg font-bold text-gray-800">Shipper Information</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <User className="text-orange-600" size={16} />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Shipper Name</p>
                            <p className="font-semibold text-gray-800">{selected.shipper?.name || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <FileText className="text-blue-600" size={16} />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Container No</p>
                            <p className="font-semibold text-gray-800">{selected.shipper?.containerNo || 'N/A'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <Truck className="text-green-600" size={16} />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Container Type</p>
                            <p className="font-semibold text-gray-800">{selected.shipper?.containerType || 'N/A'}</p>
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


                  {/* Shipment Images Section */}
                  {shipImgsLoading && (
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <FileText className="text-purple-600" size={20} />
                        <h3 className="text-lg font-bold text-gray-800">Shipment Images</h3>
                      </div>
                      <div className="text-center py-8">
                        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading shipment images...</p>
                      </div>
                    </div>
                  )}

                  {shipImgsErr && (
                    <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <XCircle className="text-red-600" size={20} />
                        <h3 className="text-lg font-bold text-gray-800">Shipment Images</h3>
                      </div>
                      <p className="text-red-600">{shipImgsErr}</p>
                    </div>
                  )}

                  {!shipImgsLoading && !shipImgsErr && shipImgs?.images && (
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <FileText className="text-purple-600" size={20} />
                        <h3 className="text-lg font-bold text-gray-800">Shipment Images</h3>
                      </div>

                      {/* Pickup Images */}
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-800 mb-3">Pickup Images</h4>
                        <div className="bg-white rounded-lg p-4 border border-purple-200">
                          <div className="flex flex-wrap gap-4">
                            <ImageGrid title="Empty Truck" images={shipImgs.images.emptyTruckImages || []} />
                            <ImageGrid title="Loaded Truck" images={shipImgs.images.loadedTruckImages || []} />
                            <ImageGrid title="POD" images={shipImgs.images.podImages || []} />
                            <ImageGrid title="EIR Tickets" images={shipImgs.images.eirTickets || []} />
                            <ImageGrid title="Container Images" images={shipImgs.images.containerImages || []} />
                            <ImageGrid title="Seal Images" images={shipImgs.images.sealImages || []} />
                          </div>
                        </div>
                      </div>

                      {/* Drop Location Images */}
                      {shipImgs.images.dropLocationImages && (
                        <div className="mb-6">
                          <h4 className="font-semibold text-gray-800 mb-3">Drop Location Images</h4>
                          <div className="bg-white rounded-lg p-4 border border-purple-200">
                            <div className="flex flex-wrap gap-4">
                              <ImageGrid title="Drop – POD" images={shipImgs.images.dropLocationImages?.podImages || []} />
                              <ImageGrid title="Drop – Loaded Truck" images={shipImgs.images.dropLocationImages?.loadedTruckImages || []} />
                              <ImageGrid title="Drop – Site Images" images={shipImgs.images.dropLocationImages?.dropLocationImages || []} />
                              <ImageGrid title="Drop – Empty Truck" images={shipImgs.images.dropLocationImages?.emptyTruckImages || []} />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Origin & Destination */}
                      {(shipImgs.images.originPlace || shipImgs.images.destinationPlace || shipImgs.images.dropLocationCompleted !== undefined) && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {shipImgs.images.originPlace && (
                            <div className="bg-white rounded-lg p-4 border border-green-200">
                              <h5 className="font-semibold text-gray-800 mb-2">🚚 Origin</h5>
                              <p className="font-medium text-gray-800 mb-1">{shipImgs.images.originPlace?.location || 'N/A'}</p>
                              <p className="text-sm text-gray-500">
                                Arrived: {shipImgs.images.originPlace?.arrivedAt ? fmtDateTime(shipImgs.images.originPlace.arrivedAt) : 'N/A'}
                              </p>
                            </div>
                          )}
                          {shipImgs.images.destinationPlace && (
                            <div className="bg-white rounded-lg p-4 border border-blue-200">
                              <h5 className="font-semibold text-gray-800 mb-2">🎯 Destination</h5>
                              <p className="font-medium text-gray-800 mb-1">{shipImgs.images.destinationPlace?.location || 'N/A'}</p>
                              <p className="text-sm text-gray-500">
                                Arrived: {shipImgs.images.destinationPlace?.arrivedAt ? fmtDateTime(shipImgs.images.destinationPlace.arrivedAt) : 'N/A'}
                              </p>
                            </div>
                          )}
                          {shipImgs.images.dropLocationCompleted !== undefined && (
                            <div className="bg-white rounded-lg p-4 border border-purple-200">
                              <h5 className="font-semibold text-gray-800 mb-2">✅ Drop Status</h5>
                              <p className="font-medium text-gray-800 mb-1">
                                Completed: {shipImgs.images.dropLocationCompleted ? 'Yes' : 'No'}
                              </p>
                              <p className="text-sm text-gray-500">
                                Drop Arrived: {shipImgs.images.dropLocationArrivalTime ? fmtDateTime(shipImgs.images.dropLocationArrivalTime) : 'N/A'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Additional Documents Section */}
                  {selected?.additionalDocuments?.length > 0 && (
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <FileText className="text-indigo-600" size={20} />
                        <h3 className="text-lg font-bold text-gray-800">Additional Documents</h3>
                      </div>
                      
                      {/* Images in a row */}
                      <div className="mb-4">
                        <h4 className="font-semibold text-gray-800 mb-3">Images</h4>
                        <div className="flex flex-wrap gap-4">
                          {selected.additionalDocuments
                            .filter(doc => isImageUrl(doc?.documentUrl || ""))
                            .map((doc) => {
                              const url = doc?.documentUrl || "";
                              return (
                                <div key={doc?._id} className="bg-white rounded-lg p-3 border border-indigo-200">
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                                    <img
                                      src={url}
                                      alt="document"
                                      className="w-32 h-32 object-cover rounded-lg border border-gray-200 hover:border-indigo-400 transition-colors"
                                    />
                                  </a>
                                  <p className="text-xs text-gray-600 mt-2 text-center truncate max-w-[128px]">
                                    {doc?.fileName || 'Image'}
                                  </p>
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      {/* Documents in grid */}
                      {selected.additionalDocuments.filter(doc => !isImageUrl(doc?.documentUrl || "")).length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-3">Documents</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {selected.additionalDocuments
                              .filter(doc => !isImageUrl(doc?.documentUrl || ""))
                              .map((doc) => {
                                const url = doc?.documentUrl || "";
                                const isPdf = isPdfUrl(url);
                                return (
                                  <div key={doc?._id} className="bg-white rounded-lg p-4 border border-indigo-200 hover:border-indigo-400 transition-colors">
                                    <div className="flex items-center gap-3 mb-3">
                                      <FileText className="text-indigo-600" size={16} />
                                      <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 font-medium text-gray-800 hover:text-indigo-600 truncate"
                                      >
                                        {isPdf ? "PDF Document" : doc?.fileName || "File"}
                                      </a>
                                    </div>
                                    <div className="space-y-1 text-sm text-gray-600">
                                      <p><strong>Uploaded by:</strong> {doc?.uploadedBy?.employeeName || 'N/A'} ({doc?.uploadedBy?.empId || 'N/A'})</p>
                                      <p><strong>Department:</strong> {doc?.uploadedBy?.department || 'N/A'}</p>
                                      <p><strong>Uploaded at:</strong> {doc?.uploadedAt ? fmtDateTime(doc.uploadedAt) : 'N/A'}</p>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Load Reference Information */}
                  {selected?.loadReference && (
                    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <FileText className="text-cyan-600" size={20} />
                        <h3 className="text-lg font-bold text-gray-800">Load Reference & Tracking</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-sm text-gray-600">Shipment #</p>
                          <p className="font-semibold text-gray-800 font-mono">{selected.loadReference?.shipmentNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">PO #</p>
                          <p className="font-semibold text-gray-800">{selected.loadReference?.poNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">BOL #</p>
                          <p className="font-semibold text-gray-800">{selected.loadReference?.bolNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Load Type</p>
                          <p className="font-semibold text-gray-800">{selected.loadReference?.loadType || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Vehicle Type</p>
                          <p className="font-semibold text-gray-800">{selected.loadReference?.vehicleType || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Rate (Type)</p>
                          <p className="font-semibold text-green-600">
                            ${fmtMoney(selected.loadReference?.rate || 0)} ({selected.loadReference?.rateType || 'N/A'})
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Pickup Date</p>
                          <p className="font-semibold text-gray-800">
                            {selected.loadReference?.pickupDate ? fmtDateTime(selected.loadReference.pickupDate) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Delivery Date</p>
                          <p className="font-semibold text-gray-800">
                            {selected.loadReference?.deliveryDate ? fmtDateTime(selected.loadReference.deliveryDate) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Status</p>
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                            selected.loadReference?.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : selected.loadReference?.status === 'in-progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {selected.loadReference?.status || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Delivery Approved</p>
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                            selected.loadReference?.deliveryApproval 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {selected.loadReference?.deliveryApproval ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>

                      {/* Origin & Destination */}
                      {(selected.loadReference?.origin || selected.loadReference?.destination) && (
                        <div className="mt-6 grid grid-cols-2 gap-4">
                          {selected.loadReference?.origin && (
                            <div className="bg-white rounded-lg p-4 border border-green-200">
                              <h5 className="font-semibold text-gray-800 mb-2">🚚 Origin</h5>
                              <p className="font-medium text-gray-800 mb-1">
                                {selected.loadReference.origin?.city || 'N/A'}, {selected.loadReference.origin?.state || 'N/A'}
                              </p>
                              <p className="text-sm text-gray-500">
                                Arrived: {selected.loadReference?.originPlace?.arrivedAt ? fmtDateTime(selected.loadReference.originPlace.arrivedAt) : 'N/A'}
                              </p>
                            </div>
                          )}
                          {selected.loadReference?.destination && (
                            <div className="bg-white rounded-lg p-4 border border-blue-200">
                              <h5 className="font-semibold text-gray-800 mb-2">🎯 Destination</h5>
                              <p className="font-medium text-gray-800 mb-1">
                                {selected.loadReference.destination?.city || 'N/A'}, {selected.loadReference.destination?.state || 'N/A'}
                              </p>
                              <p className="text-sm text-gray-500">
                                Arrived: {selected.loadReference?.destinationPlace?.arrivedAt ? fmtDateTime(selected.loadReference.destinationPlace.arrivedAt) : 'N/A'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Basic Information & Approval Status */}
                  <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="text-gray-600" size={20} />
                      <h3 className="text-lg font-bold text-gray-800">Basic Information & Approval Status</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-600">DO ID</p>
                        <p className="font-semibold text-gray-800 font-mono text-sm">{selected?._id || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Assignment Status</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                          selected?.assignmentStatus === 'assigned' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selected?.assignmentStatus || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">DO Status</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                          selected?.doStatus === 'approved' 
                            ? 'bg-green-100 text-green-800' 
                            : selected?.doStatus === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selected?.doStatus || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Updated At</p>
                        <p className="font-semibold text-gray-800">{selected?.updatedAt ? fmtDateTime(selected.updatedAt) : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Approved By</p>
                        <p className="font-semibold text-gray-800">
                          {selected?.accountantApproval?.approvedBy?.employeeName || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Approved At</p>
                        <p className="font-semibold text-gray-800">
                          {selected?.accountantApproval?.approvedAt ? fmtDateTime(selected.accountantApproval.approvedAt) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Approval Status</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                          selected?.accountantApproval?.status === 'approved' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selected?.accountantApproval?.status || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email To Shipper</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                          selected?.emailNotification?.sentToShipper 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selected?.emailNotification?.sentToShipper ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                    {selected?.accountantApproval?.remarks && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 mb-2">Remarks</p>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-sm text-gray-800">{selected.accountantApproval.remarks}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Approval Section */}
                  <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                          <CheckCircle className="text-white" size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-800">Approval</h3>
                          <p className="text-sm text-gray-500">Review and approve or reject this delivery order</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-row gap-3 justify-start">
                      <button
                        onClick={() => openApprovalModal('approve')}
                        className="w-1/2 max-w-[200px] bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 hover:from-green-600 hover:via-green-700 hover:to-emerald-700 text-white px-4 py-2.5 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 font-semibold text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5 hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <CheckCircle size={18} />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => openApprovalModal('reject')}
                        className="w-1/2 max-w-[200px] bg-gradient-to-r from-red-500 via-red-600 to-rose-600 hover:from-red-600 hover:via-red-700 hover:to-rose-700 text-white px-4 py-2.5 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 font-semibold text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5 hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <XCircle size={18} />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                </React.Fragment>
              )}
            </div>
          </div>
        </div>
      )}

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
                {approvalAction === 'approve' ? 'Approve' : 'Reject'}
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
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: '50%',
              width: 36,
              height: 36,
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.25)',
                transform: 'rotate(90deg) scale(1.1)',
              }
            }}
          >
            ×
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {selected && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Load No
              </Typography>
              <Typography variant="body1" fontWeight={600} sx={{ 
                fontFamily: 'monospace',
                backgroundColor: '#f5f5f5',
                p: 1,
                borderRadius: 1,
                border: '1px solid #e0e0e0'
              }}>
                {selected?.customers?.[0]?.loadNo || selected?._id || 'N/A'}
              </Typography>
            </Box>
          )}

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

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{
          '& .MuiSnackbar-root': {
            top: '24px !important',
          }
        }}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          variant="filled"
          sx={{
            width: '100%',
            fontSize: '15px',
            fontWeight: 500,
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            '& .MuiAlert-icon': {
              fontSize: '24px',
            },
            '&.MuiAlert-filledSuccess': {
              background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
              color: 'white',
            },
            '&.MuiAlert-filledError': {
              background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
              color: 'white',
            },
          }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </div>
  );
}


