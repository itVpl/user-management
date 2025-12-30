import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FaBox, FaSearch, FaFilePdf, FaEye, FaTimes, FaTrash, FaUpload } from 'react-icons/fa';
import { FaDownload } from 'react-icons/fa';
import { Search, FileText, CheckCircle, XCircle, Clock, RefreshCw, Truck, Package, DollarSign, Calendar, User } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';
import Logo from '../../assets/LogoFinal.png';
import IdentificaLogo from '../../assets/identifica_logo.png';
import MtPoconoLogo from '../../assets/mtPocono.png';

/* ====================== Helpers ====================== */
const fmtCurrency = (amount) => {
  const n = Number(amount || 0);
  return n ? `${n.toLocaleString()}` : '$0';
};
const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return '—';
  return dt.toLocaleString();
};

// Shipment # extractor
const extractShipmentNumber = (order = {}) => {
  const r = order.raw || {};
  const direct =
    r?.loadReference?.shipmentNumber ||
    r?.shipmentNumber ||
    r?.load?.shipmentNumber ||
    r?.load?.shipment?.shipmentNumber ||
    order?.shipmentNumber;

  if (direct) return String(direct);

  const files = r?.uploadedFiles || order?.uploadedFiles || [];
  for (const f of files) {
    const url = f?.fileUrl || f?.url || '';
    const m = url.match(/\/(SHP\d{6,})\//i);
    if (m && m[1]) return m[1].toUpperCase();
  }
  return null;
};

// Filename + isImage helpers
const getFileName = (url = '') => {
  try { return decodeURIComponent(url.split('/').pop() || 'document'); } catch { return 'document'; }
};
const isImage = (url = '') => /\.(png|jpe?g|webp|gif)$/i.test(url);

/* ====================== MS/Fluent theme tokens (COLORS ONLY) ====================== */
const MS = {
  primaryBtn: 'bg-[#0078D4] hover:bg-[#106EBE] focus:ring-2 focus:ring-[#9CCCF5] text-white',
  disabledBtn: 'bg-[#C8C6C4] text-white cursor-not-allowed',
  subtleBtn: 'bg-white border border-[#D6D6D6] hover:bg-[#F5F5F5]',
  successPill: 'bg-[#DFF6DD] text-[#107C10]',
  neutralPill: 'bg-[#F3F2F1] text-[#323130]',
  ring: 'focus:ring-2 focus:ring-[#9CCCF5]',
  spinner: 'border-b-2 border-[#0078D4]',
};

/* ====================== Soft Theme (colors only) ====================== */
const SOFT = {
  header: 'rounded-2xl bg-gradient-to-r from-[#6D5DF6] via-[#7A5AF8] to-[#19C3FB] text-white px-5 py-4 shadow',
  cardMint: 'p-4 rounded-2xl border bg-[#F3FBF6] border-[#B9E6C9]',   // Customer
  cardPink: 'p-4 rounded-2xl border bg-[#FFF3F7] border-[#F7CADA]',   // Carrier
  cardBlue: 'p-4 rounded-2xl border bg-[#EEF4FF] border-[#C9D5FF]',   // BOL / Files / Assignment / CreatedBy / LoadRef / Additional Docs
  cardButter: 'p-4 rounded-2xl border bg-[#FFF7E6] border-[#FFE2AD]',   // Shipper
  insetWhite: 'p-3 rounded-xl border bg-white',
};

/* ============= Small helper view used in Driver Images ============= */
function ImageStrip({ title, urls = [] }) {
  if (!Array.isArray(urls) || urls.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="text-xs font-semibold text-gray-700 mb-2">{title}</div>

      {/* Horizontal scroll row */}
      <div className="flex overflow-x-auto gap-2 pb-1 snap-x snap-mandatory">
        {urls.map((u, i) => (
          <a
            key={`${title}-${i}`}
            href={u}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 snap-start w-28 h-20 md:w-32 md:h-24 rounded-lg border overflow-hidden"
            title={`${title} ${i + 1}`}
          >
            <img
              src={u}
              alt={`${title} ${i + 1}`}
              loading="lazy"
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.opacity = 0.35; }}
            />
          </a>
        ))}
      </div>
    </div>
  );
}



/* ====================== Details Modal ====================== */
function DetailsModal({ open, onClose, order, cmtEmpId, onForwardSuccess }) {
  if (!open || !order) return null;

  const raw = order.raw || {};
  const customers = raw.customers || [];
  const cust0 = customers[0] || {};
  const carrier = raw.carrier || {};
  const shipper = raw.shipper || {};
  const pickUps = shipper.pickUpLocations || [];
  const drops = shipper.dropLocations || [];
  const assign = raw.assignedToCMT || order.assignedToCMT || null;
  const createdBy = raw.createdBySalesUser || {};
  const loadRef = raw.loadReference || {};

  // Driver images
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState('');
  const [imgPayload, setImgPayload] = useState(null);

  // Forward to accountant
  const [remarks, setRemarks] = useState('All documents verified and delivery confirmed');
  const [fwLoading, setFwLoading] = useState(false);

  // Additional Docs (Upload)
  const [selFiles, setSelFiles] = useState([]); // File[]
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Additional Docs (View)
  const [addDocsLoading, setAddDocsLoading] = useState(false);
  const [addDocsError, setAddDocsError] = useState('');
  const [additionalDocs, setAdditionalDocs] = useState([]); // array of {documentUrl, uploadedBy, uploadedAt, _id}

  // Drivers / Assign Driver UI state
  const [drivers, setDrivers] = useState([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [driverSearch, setDriverSearch] = useState('');
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null); // { _id, fullName, vehicleNumber }
  const [vehicleNumberInput, setVehicleNumberInput] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  // Important Dates state
  const getDateValue = (date) => {
    if (!date) return '';
    try {
      return new Date(date).toISOString();
    } catch {
      return '';
    }
  };

  // API uses different field names, so we need to map them
  const apiImportantDates = raw.importantDates || raw.loadReference?.importantDates || {};
  const [importantDates, setImportantDates] = useState({
    vesselETA: getDateValue(raw.vesselETA || raw.loadReference?.vesselETA || apiImportantDates.vesselDate || apiImportantDates.vesselETA),
    latfreeDate: getDateValue(raw.latfreeDate || raw.loadReference?.latfreeDate || apiImportantDates.lastFreeDate || apiImportantDates.latfreeDate),
    dischargeDate: getDateValue(raw.dischargeDate || raw.loadReference?.dischargeDate || apiImportantDates.dischargeDate),
    outgateDate: getDateValue(raw.outgateDate || raw.loadReference?.outgateDate || apiImportantDates.outgateDate),
    emptyDate: getDateValue(raw.emptyDate || raw.loadReference?.emptyDate || apiImportantDates.emptyDate),
    perDiemFreeDay: getDateValue(raw.perDiemFreeDay || raw.loadReference?.perDiemFreeDay || apiImportantDates.perDiemFreeDate || apiImportantDates.perDiemFreeDay),
    ingateDate: getDateValue(raw.ingateDate || raw.loadReference?.ingateDate || apiImportantDates.ingateDate),
    readyToReturnDate: getDateValue(raw.readyToReturnDate || raw.loadReference?.readyToReturnDate || apiImportantDates.readyToReturnDate)
  });
  const [updatingDates, setUpdatingDates] = useState(false);

  // Update important dates when modal opens or order changes
  useEffect(() => {
    if (open && order) {
      // API uses different field names, so we need to map them
      const apiImportantDates = raw.importantDates || raw.loadReference?.importantDates || {};
      setImportantDates({
        vesselETA: getDateValue(raw.vesselETA || raw.loadReference?.vesselETA || apiImportantDates.vesselDate || apiImportantDates.vesselETA),
        latfreeDate: getDateValue(raw.latfreeDate || raw.loadReference?.latfreeDate || apiImportantDates.lastFreeDate || apiImportantDates.latfreeDate),
        dischargeDate: getDateValue(raw.dischargeDate || raw.loadReference?.dischargeDate || apiImportantDates.dischargeDate),
        outgateDate: getDateValue(raw.outgateDate || raw.loadReference?.outgateDate || apiImportantDates.outgateDate),
        emptyDate: getDateValue(raw.emptyDate || raw.loadReference?.emptyDate || apiImportantDates.emptyDate),
        perDiemFreeDay: getDateValue(raw.perDiemFreeDay || raw.loadReference?.perDiemFreeDay || apiImportantDates.perDiemFreeDate || apiImportantDates.perDiemFreeDay),
        ingateDate: getDateValue(raw.ingateDate || raw.loadReference?.ingateDate || apiImportantDates.ingateDate),
        readyToReturnDate: getDateValue(raw.readyToReturnDate || raw.loadReference?.readyToReturnDate || apiImportantDates.readyToReturnDate)
      });
    }
  }, [open, order]); // eslint-disable-line
  // PDF generate/download loading state
  const [genLoading, setGenLoading] = useState(null); // 'invoice' | 'rate' | 'bol' | null

  // Logo source for PDF generation - using your actual logo
  const logoSrc = Logo;

  // Generate Rate Load Confirmation PDF function
  const generateRateLoadConfirmationPDF = async (order) => {
    try {
      // Determine logo based on company name
      const companyName = order?.company || order?.addDispature || '';
      let pdfLogo = Logo;
      if (companyName === 'IDENTIFICA LLC') {
        pdfLogo = IdentificaLogo;
      } else if (companyName === 'MT. POCONO TRANSPORTATION INC' || companyName === 'Mt Pocono Transportation') {
        pdfLogo = MtPoconoLogo;
      }
      
      // 1) Dispatcher info
      let dispatcherPhone = 'N/A';
      let dispatcherEmail = 'N/A';
      try {
        const cmtUsers = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/cmt/users`, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem('token') || localStorage.getItem('token')}` }
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

        let rateRaw = (ch && ch.amount !== undefined && ch.amount !== null) ? ch.amount : 0;
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
      const drops = Array.isArray(ship.dropLocations) ? ship.dropLocations : [];

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
            '<strong>Weight:</strong> ' + ((l.weight !== undefined && l.weight !== null) ? l.weight : 'N/A') + ' lbs' +
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
            '<strong>Weight:</strong> ' + ((l.weight !== undefined && l.weight !== null) ? l.weight : 'N/A') + ' lbs' +
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
        alertify.error('Popup blocked. Please allow popups and try again.');
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
        <img src="${pdfLogo}" alt="Company Logo" class="logo" style="max-width:100%; max-height:100%; object-fit:contain;" 
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
      alertify.success('Rate and Load Confirmation PDF generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alertify.error('Failed to generate PDF. Please try again.');
    }
  };

  // Generate Invoice PDF function
  const generateInvoicePDF = (order) => {
    try {
      const printWindow = window.open('', '_blank');
      const orderCompanyName = order?.company || order?.addDispature || '';
      let pdfLogo = Logo;
      if (orderCompanyName === 'IDENTIFICA LLC') {
        pdfLogo = IdentificaLogo;
      } else if (orderCompanyName === 'MT. POCONO TRANSPORTATION INC' || orderCompanyName === 'Mt Pocono Transportation') {
        pdfLogo = MtPoconoLogo;
      }
      let companyDisplayName = '';
      let companyDisplayAddress = '';
      if (orderCompanyName === 'V Power Logistics') {
        companyDisplayName = 'V Power Logistics';
        companyDisplayAddress = '7945 14TH AVE SW SEATTLE, WA 98106';
      } else if (orderCompanyName === 'IDENTIFICA LLC') {
        companyDisplayName = 'IDENTIFICA LLC';
        companyDisplayAddress = '8601 FURRAY RD HOUSTON, TX USA 77028';
      }

      // hi

      // ---- Bill To + Address (from shippers list if available) ----
      const cust = order?.customers?.[0] || {};
      const companyName = (cust.billTo || order?.customerName || '').trim();
      const billToDisplay = [companyName || 'N/A'].filter(Boolean).join('<br>');
      const workOrderNo = cust.workOrderNo || 'N/A';
      const invoiceNo = order.doNum || cust.loadNo || 'N/A';
      const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });

      const LH = Number(cust.lineHaul) || 0;
      const FSC_PERCENT = Number(cust.fsc) || 0;
      const FSC_AMOUNT = LH * (FSC_PERCENT / 100);
      const otherFromCharges = Array.isArray(cust.chargeRows)
        ? cust.chargeRows.reduce((s, r) => s + (Number(r?.total) || 0), 0)
        : 0;
      const OTH = Number(
        (cust.otherTotal !== undefined && cust.otherTotal !== null) ? cust.otherTotal :
        (cust.other !== undefined && cust.other !== null) ? cust.other :
        otherFromCharges
      ) || 0;
      const CUSTOMER_TOTAL = LH + FSC_AMOUNT + OTH;

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
  .logo{width:280px;height:180px;object-fit:contain;flex:0 0 auto}
  .logo-container{margin-bottom:12px;width:100%}
  .company-table{border-collapse:collapse;width:100%;font-size:12px;margin-top:8px}
  .company-table th,.company-table td{border:1px solid #ddd;padding:6px;text-align:left;vertical-align:top}
  .company-table th{background:#f5f5f5;font-weight:bold}
  .company-table th:first-child{width:20%}
  .company-table th:last-child{width:80%}
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
      <div>
        <div class="logo-container">
          <img src="${pdfLogo}" alt="Company Logo" class="logo" style="width:100%; max-width:300px; height:auto; object-fit:contain;" >
        </div>
        <table class="company-table">
          <tr><th>Bill From</th><td>${companyDisplayName ? `${companyDisplayName}<br>${companyDisplayAddress}` : 'N/A'}</td></tr>
        </table>
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

    ${(() => {
      const returnLoc = order.returnLocation || {};
      const loadType = order.loadType || '';
      if (loadType !== 'DRAYAGE' || !returnLoc) return '';
      const hasReturnData = returnLoc.address || returnLoc.returnFullAddress || returnLoc.city || returnLoc.state || returnLoc.zipCode;
      if (!hasReturnData) return '';
      const fullAddr2 = (loc) => {
        if (!loc) return 'N/A';
        const parts = [loc.address, loc.city, loc.state, loc.zipCode].filter(Boolean);
        return parts.length ? parts.join(', ') : 'N/A';
      };
      const fmtDate2 = (d) => {
        if (!d) return 'N/A';
        const dt = new Date(d);
        return isNaN(dt) ? 'N/A' : dt.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
      };
      let returnAddr = 'N/A';
      if (returnLoc.returnFullAddress && returnLoc.returnFullAddress.trim()) {
        returnAddr = returnLoc.returnFullAddress.trim();
      } else {
        returnAddr = fullAddr2({
          address: returnLoc.address || '',
          city: returnLoc.city || '',
          state: returnLoc.state || '',
          zipCode: returnLoc.zipCode || ''
        });
      }
      const contNo2 = order.shipper?.containerNo || 'N/A';
      const contTp2 = order.shipper?.containerType || 'N/A';
      const qty2 = 1;
      const dateSrc2 = returnLoc.returnDate;
      return `
    <div class="section">
      <table class="tbl">
        <thead>
          <tr>
            <th>Return Address</th>
            <th>Container No</th>
            <th>Container Type</th>
            <th>Qty</th>
            <th>Return Date</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${returnAddr}</td>
            <td>${contNo2}</td>
            <td>${contTp2}</td>
            <td>${qty2}</td>
            <td>${fmtDate2(dateSrc2)}</td>
          </tr>
        </tbody>
      </table>
    </div>`;
    })()}
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
          ${FSC_AMOUNT > 0 ? `<tr><td>FSC</td><td class="amount">$${FSC_AMOUNT.toLocaleString()}</td></tr>` : ''}
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
      alertify.success('Invoice PDF generated successfully!');
    } catch (err) {
      console.error('Error generating PDF:', err);
      alertify.error('Failed to generate PDF. Please try again.');
    }
  };

  // Generate BOL PDF function
  const generateBolPDF = (orderInput) => {
    // ---------- SAFE DEFAULTS ----------
    const order = orderInput || {};
    const shipper = order.shipper || {};
    const pickupLocs = Array.isArray(shipper.pickUpLocations) ? shipper.pickUpLocations : (Array.isArray(order.origins) ? order.origins : []);
    const dropLocs = Array.isArray(shipper.dropLocations) ? shipper.dropLocations : (Array.isArray(order.destinations) ? order.destinations : []);

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
    const companyName = order?.company || order?.addDispature || '';
    let pdfLogo = Logo;
    if (companyName === 'IDENTIFICA LLC') {
      pdfLogo = IdentificaLogo;
    } else if (companyName === 'MT. POCONO TRANSPORTATION INC' || companyName === 'Mt Pocono Transportation') {
      pdfLogo = MtPoconoLogo;
    }
    const safeLogo = order.logoSrc || pdfLogo || logoSrc;

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
        <div class="field"><span class="label">Name:</span><span class="value">${shipper?.dropLocations?.[0]?.name || 'N/A'}</span></div>
        <div class="field"><span class="label">Container No:</span><span class="value">${shipper.containerNo || 'N/A'}</span></div>
        <div class="field"><span class="label">Container Type:</span><span class="value">${shipper.containerType || 'N/A'}</span></div>
        <div class="field"><span class="label">Weight:</span><span class="value">${pickupLocs[0]?.weight || shipper.weight || order.weight || 'N/A'} lbs</span></div>
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
                <td>${(loc.weight !== undefined && loc.weight !== null) ? loc.weight + ' lbs' : 'N/A'}</td>
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
        alertify.success('BOL PDF generated successfully!');
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
      alertify.error('Failed to generate BOL PDF. Please try again.');
    }
  };

  const generateDoc = async (type) => {
    try {
      setGenLoading(type);
      switch (type) {
        case 'invoice':
          generateInvoicePDF(order.raw || order);
          break;
        case 'rate':
          generateRateLoadConfirmationPDF(order.raw || order);
          break;
        case 'bol':
          generateBolPDF(order.raw || order);
          break;
        default:
          throw new Error('Invalid document type');
      }
    } catch (e) {
      alertify.error(e?.response?.data?.message || e.message || 'PDF generation failed');
    } finally {
      setGenLoading(null);
    }
  };

  const doMongoId = order?.raw?._id || order?.id;
  const shipmentNumber = extractShipmentNumber(order);
  const isForwarded = !!order?.raw?.forwardedToAccountant || !!order?.forwardedToAccountant;
  const isSalesVerified = order?.raw?.assignmentStatus === 'sales_verified' || order?.assignmentStatus === 'sales_verified';
  const isCmtVerified = order?.raw?.assignmentStatus === 'cmt_verified' || order?.assignmentStatus === 'cmt_verified';
  const assignmentStatus = order?.raw?.assignmentStatus || order?.assignmentStatus || '';
  const isAssigned = assignmentStatus === 'assigned';
  
  // Disable button if:
  // 1. Already CMT verified
  // 2. Already forwarded (any status)
  // 3. Sales verified AND already forwarded (user requirement)
  // 4. Status is sales_verified (backend requires 'assigned' status)
  const alreadyForwarded =
    isCmtVerified || 
    isForwarded ||
    (isSalesVerified && isForwarded) ||
    isSalesVerified; // Disable if sales_verified (backend requires 'assigned' status)

  // Debug logging
  console.log('DO Details Modal - Order:', order?.doId, 'Already Forwarded:', alreadyForwarded, 'Assignment Status:', order?.raw?.assignmentStatus, 'Forwarded To Accountant:', isForwarded, 'Sales Verified:', isSalesVerified, 'CMT Verified:', isCmtVerified);
  function RowImages({ groups = {} }) {
    // groups = { Label: [urls], Label2: [urls], ... }
    const items = [];
    Object.entries(groups || {}).forEach(([label, arr]) => {
      (arr || []).forEach((u, i) => items.push({ label, url: u, key: `${label}-${i}` }));
    });

    if (items.length === 0) {
      return <div className="text-sm text-gray-400">No images.</div>;
    }

    return (
      <div className="flex overflow-x-auto gap-2 pb-1 snap-x snap-mandatory">
        {items.map(({ label, url, key }) => (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="relative shrink-0 snap-start w-28 h-20 md:w-32 md:h-24 rounded-lg border overflow-hidden"
            title={label}
          >
            <img
              src={url}
              alt={label}
              loading="lazy"
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.opacity = 0.35; }}
            />
            <span className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white">
              {label}
            </span>
          </a>
        ))}
      </div>
    );
  }

  // Fetch driver images
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!open || !shipmentNumber) return;
      try {
        setImgLoading(true);
        setImgError('');
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const url = `${API_CONFIG.BASE_URL}/api/v1/load/shipment/${encodeURIComponent(shipmentNumber)}/images`;
        const res = await axios.get(url, {
          headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
        });
        if (!cancelled) {
          if (res?.data?.success) setImgPayload(res.data);
          else setImgError('Could not load images (unexpected response).');
        }
      } catch (e) {
        if (!cancelled) setImgError(e?.response?.data?.message || e?.message || 'Failed to load images');
      } finally {
        if (!cancelled) setImgLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [open, shipmentNumber]);

  const images = imgPayload?.images || null;
  const loadStatus = imgPayload?.loadStatus || null;
  // filter drivers by search text (name or id)
  const filteredDrivers = (drivers || []).filter((d) => {
    const needle = (driverSearch || '').toLowerCase().trim();
    if (!needle) return true;
    const name = (d?.fullName || d?.name || '').toLowerCase();
    const id = String(d?._id || d?.id || '').toLowerCase();
    return name.includes(needle) || id.includes(needle);
  });

  // Forward
  const forwardToAccountant = async () => {
    // Prevent forwarding if already forwarded
    if (alreadyForwarded) {
      alertify.warning('This DO has already been forwarded to accountant');
      return;
    }
    
    try {
      if (!doMongoId || !cmtEmpId) return alertify.error('Missing DO ID or CMT EmpId');
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) return alertify.error('Authentication required');

      setFwLoading(true);
      const url = `${API_CONFIG.BASE_URL}/api/v1/accountant/forward-to-accountant`;
      const payload = { doId: String(doMongoId), cmtEmpId: String(cmtEmpId), accountantEmpId: 'VPL039', remarks: (remarks || '').trim() || 'Forwarded by CMT' };

      const res = await axios.post(url, payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (res?.data?.success) {
        alertify.success('Forwarded to Accountant');
        onForwardSuccess?.({
          _id: doMongoId,
          assignmentStatus: res.data?.data?.assignmentStatus || 'cmt_verified',
          forwardedToAccountant: res.data?.data?.forwardedToAccountant,
        });
      } else {
        alertify.error(res?.data?.message || 'Forward failed');
      }
    } catch (e) {
      alertify.error(e?.response?.data?.message || e.message || 'Forward failed');
    } finally {
      setFwLoading(false);
    }
  };

  /* ---------------- Additional Docs: VIEW ---------------- */
  const fetchAdditionalDocs = async () => {
    if (!doMongoId) return;
    try {
      setAddDocsLoading(true);
      setAddDocsError('');
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const url = `${API_CONFIG.BASE_URL}/api/v1/do/do/${encodeURIComponent(doMongoId)}/additional-documents`;
      const res = await axios.get(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (res?.data?.success) {
        const docs = Array.isArray(res.data?.data?.documents) ? res.data.data.documents : [];
        setAdditionalDocs(docs);
      } else {
        setAddDocsError(res?.data?.message || 'Could not fetch additional docs');
      }
    } catch (e) {
      setAddDocsError(e?.response?.data?.message || e.message || 'Could not fetch additional docs');
    } finally {
      setAddDocsLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchAdditionalDocs();
  }, [open, doMongoId]); // eslint-disable-line

  // Fetch drivers for the CMT user by truckerId
  const fetchDriversForCarrier = async () => {
    try {
      setDriversLoading(true);
      setDrivers([]);

      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token found');
        setDrivers([]);
        return;
      }

      // Get compName from carrier
      const compName = 
        loadRef?.acceptedBid?.carrier?.compName || 
        carrier?.compName || 
        carrier?.carrierName ||
        raw?.acceptedBid?.carrier?.compName;
      
      if (!compName) {
        console.warn('No compName found in carrier/acceptedBid data');
        alertify.warning('Company name not found. Cannot load drivers.');
        setDrivers([]);
        return;
      }

      // Fetch drivers by compName
      const url = `${API_CONFIG.BASE_URL}/api/v1/cmt-reports/drivers-by-company?compName=${encodeURIComponent(
        compName
      )}`;
      
      console.log('Fetching drivers for compName:', compName);
      
      const res = await axios.get(url, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      if (res?.data?.success) {
        const payload = res?.data?.data || {};
        const all = Array.isArray(payload.drivers) ? payload.drivers : [];

        if (all.length === 0) {
          console.warn(`No drivers found for truckerId: ${campName}`);
          alertify.warning('No drivers found for this carrier');
        }

        const mapped = all.map((d) => ({
          _id: d.driverId || d._id || d.id,
          fullName: d.fullName || d.name || d.driverName || 'Unknown Driver',
          vehicleNumber: d.licenseInfo?.mcDot || d.vehicleNumber || d.vehicleNo || '',
          phoneNo: d.contactInfo?.phone || d.contactInfo?.phoneNo || '',
          email: d.contactInfo?.email || '',
          driverLicense: d.licenseInfo?.driverLicense || '',
          mcDot: d.licenseInfo?.mcDot || '',
          gender: d.personalInfo?.gender || '',
          city: d.personalInfo?.address?.city || '',
          state: d.personalInfo?.address?.state || '',
          companyName: d.company?.companyName || '',
          companyPhone: d.company?.companyPhone || '',
          raw: d,
        }));

        setDrivers(mapped);
        console.log(`Loaded ${mapped.length} drivers`);
      } else {
        console.warn('API response success is false');
        alertify.error('Failed to load drivers');
        setDrivers([]);
      }
    } catch (err) {
      console.error('Error fetching drivers:', err?.response?.data?.message || err?.message || err);
      alertify.error(err?.response?.data?.message || 'Failed to load drivers');
      setDrivers([]);
    } finally {
      setDriversLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    fetchDriversForCarrier();
    // re-run when carrier or CMT user changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, carrier?._id, carrier?.compName, carrier?.carrierName, cmtEmpId]);

  // Assign driver to load via API
  const handleAssignDriver = async () => {
    try {
      if (!selectedDriver || !selectedDriver._id) return alertify.error('Please select a driver');

      const loadId = loadRef._id || loadRef.loadId || loadRef.id || order?.raw?.loadId || order?.raw?._id;
      if (!loadId) return alertify.error('Missing load id to assign driver');

      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) return alertify.error('Authentication required');

      setAssignLoading(true);
      const url = `${API_CONFIG.BASE_URL}/api/v1/do/load/${encodeURIComponent(loadId)}/assign-driver`;
      
      // Prepare payload - only driverId and vehicleNumber as per API spec
      const payload = { 
        driverId: String(selectedDriver._id),
        vehicleNumber: (vehicleNumberInput || selectedDriver.mcDot || selectedDriver.vehicleNumber || '').trim()
      };

      console.log('Assigning driver with payload:', payload);
      console.log('Load ID:', loadId);
      console.log('Selected Driver:', selectedDriver);

      const res = await axios.post(url, payload, { 
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        } 
      });

      if (res?.data?.success) {
        alertify.success(res.data?.message || 'Driver assigned successfully');
        // Update the local order object to reflect assigned driver so UI updates
        try {
          if (!order.raw) order.raw = {};
          order.raw.acceptedBid = { 
            ...(order.raw.acceptedBid || {}), 
            driverId: payload.driverId, 
            vehicleNumber: payload.vehicleNumber, 
            driverName: selectedDriver.fullName || selectedDriver.name || '',
            phoneNo: selectedDriver.phoneNo || '',
            email: selectedDriver.email || ''
          };
          setSelectedDriver((s) => ({ ...(s || {}), _id: payload.driverId, vehicleNumber: payload.vehicleNumber }));
        } catch (e) {
          console.error('Error updating local state:', e);
        }
      } else {
        alertify.error(res?.data?.message || 'Failed to assign driver');
      }
    } catch (e) {
      console.error('Assign driver error:', e);
      const errorMsg = e?.response?.data?.error || e?.response?.data?.message || e.message || 'Assign driver failed';
      alertify.error(errorMsg);
    } finally {
      setAssignLoading(false);
    }
  };

  /* ---------------- Important Dates: UPDATE ---------------- */
  const updateImportantDates = async () => {
    try {
      // Get loadId from loadReference
      const loadId = loadRef._id || loadRef.loadId || loadRef.id;

      if (!loadId) {
        return alertify.error('Missing Load ID. Please ensure load reference is available.');
      }

      if (!cmtEmpId) return alertify.error('Missing CMT EmpId');

      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) return alertify.error('Authentication required');

      setUpdatingDates(true);

      const url = `${API_CONFIG.BASE_URL}/api/v1/load/cmt/load/${encodeURIComponent(loadId)}`;

      // Helper function to format date properly for API
      const formatDateForAPI = (dateValue) => {
        if (!dateValue || dateValue === '' || dateValue === null || dateValue === undefined) {
          return null;
        }
        try {
          // If it's already a valid ISO string, return as is
          if (typeof dateValue === 'string' && dateValue.includes('T')) {
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
              return date.toISOString();
            }
          }
          // If it's a Date object
          if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
            return dateValue.toISOString();
          }
        } catch (error) {
          console.error('Error formatting date:', error, dateValue);
          return null;
        }
        return null;
      };

      // Wrap dates in importantDates object as required by API
      // Format each date properly - only include valid dates
      // Map frontend field names to API field names
      const fieldMapping = {
        'vesselETA': 'vesselDate',           // Frontend: vesselETA -> API: vesselDate
        'latfreeDate': 'lastFreeDate',       // Frontend: latfreeDate -> API: lastFreeDate
        'dischargeDate': 'dischargeDate',    // Same
        'outgateDate': 'outgateDate',        // Same
        'emptyDate': 'emptyDate',            // Same
        'perDiemFreeDay': 'perDiemFreeDate', // Frontend: perDiemFreeDay -> API: perDiemFreeDate
        'ingateDate': 'ingateDate',          // Same
        'readyToReturnDate': 'readyToReturnDate' // Same
      };

      const importantDatesPayload = {};

      // Process each date field with proper mapping
      Object.entries(fieldMapping).forEach(([frontendField, apiField]) => {
        const dateValue = importantDates[frontendField];
        // Only process if value exists and is not empty string
        if (dateValue && dateValue !== '' && dateValue !== null && dateValue !== undefined) {
          const formatted = formatDateForAPI(dateValue);
          // Only add if formatting was successful
          if (formatted && formatted !== null && formatted !== '') {
            importantDatesPayload[apiField] = formatted;
          }
        }
      });

      // Log payload for debugging
      console.log('Important Dates State:', importantDates);
      console.log('Important Dates Payload:', importantDatesPayload);

      // Send ONLY importantDates object (without empId) 
      // This ensures API recognizes it as importantDates-only update which is allowed in any status
      const response = await axios.put(
        url,
        {
          importantDates: importantDatesPayload
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response?.data?.success) {
        alertify.success(response?.data?.message || 'Important dates updated successfully');
      } else {
        alertify.error(response?.data?.message || 'Update failed');
      }
    } catch (e) {
      alertify.error(e?.response?.data?.message || e.message || 'Update failed');
    } finally {
      setUpdatingDates(false);
    }
  };

  /* ---------------- Additional Docs: UPLOAD ---------------- */
  const MAX_SIZE_MB = 10;
  const allowed = [
    'image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ];

  const onFilePick = (e) => {
    const picked = Array.from(e.target.files || []);
    const filtered = [];
    for (const f of picked) {
      const tooBig = f.size > MAX_SIZE_MB * 1024 * 1024;
      const badType = !allowed.includes(f.type);
      if (tooBig) { alertify.error(`${f.name}: exceeds ${MAX_SIZE_MB}MB`); continue; }
      if (badType) { alertify.error(`${f.name}: unsupported type`); continue; }
      filtered.push(f);
    }
    setSelFiles(prev => [...prev, ...filtered]);
    e.target.value = '';
  };

  const removeDraftFile = (idx) => setSelFiles(prev => prev.filter((_, i) => i !== idx));

  const submitAdditionalDocs = async () => {
    try {
      if (!doMongoId) return alertify.error('Missing DO ID');
      if (!cmtEmpId) return alertify.error('Missing CMT EmpId');
      if (!selFiles.length) return alertify.error('Please select at least one file');

      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) return alertify.error('Authentication required');

      const url = `${API_CONFIG.BASE_URL}/api/v1/do/do/${encodeURIComponent(doMongoId)}/additional-documents`;

      const form = new FormData();
      form.append('empId', String(cmtEmpId));
      selFiles.forEach(f => form.append('files', f));

      setUploading(true);
      setProgress(0);

      const res = await axios.post(url, form, {
        headers: { Authorization: `Bearer ${token}` },
        onUploadProgress: (pe) => {
          if (pe?.total) setProgress(Math.round((pe.loaded * 100) / pe.total));
        }
      });

      if (res?.data?.success) {
        alertify.success(res?.data?.message || 'Documents uploaded successfully');
        setSelFiles([]); setProgress(0);
        fetchAdditionalDocs(); // refresh list
      } else {
        alertify.error(res?.data?.message || 'Upload failed');
      }
    } catch (e) {
      alertify.error(e?.response?.data?.message || e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-6xl max-h-[95vh] bg-white rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden flex flex-col transform transition-all duration-300 scale-100">
        {/* Custom scrollbar styling - subtle scrollbar that appears on hover */}
        <style jsx>{`
          .modal-content {
            scroll-behavior: smooth;
          }
          .modal-content::-webkit-scrollbar {
            width: 6px;
          }
          .modal-content::-webkit-scrollbar-track {
            background: transparent;
          }
          .modal-content::-webkit-scrollbar-thumb {
            background: rgba(156, 163, 175, 0.2);
            border-radius: 3px;
            transition: background 0.2s;
          }
          .modal-content:hover::-webkit-scrollbar-thumb {
            background: rgba(156, 163, 175, 0.4);
          }
          .modal-content::-webkit-scrollbar-thumb:hover {
            background: rgba(156, 163, 175, 0.6);
          }
          /* Firefox */
          .modal-content {
            scrollbar-width: thin;
            scrollbar-color: rgba(156, 163, 175, 0.2) transparent;
          }
        `}</style>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-3xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Truck className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">DO Details — {order.doId}</h2>
                <p className="text-blue-100">Delivery Order Details</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="modal-content overflow-y-auto flex-1 p-6 space-y-6">
          {/* Customer Information - Hidden per user request */}
          {false && customers.length > 0 && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="text-green-600" size={20} />
                <h3 className="text-lg font-bold text-gray-800">Customer Information</h3>
              </div>

              <div className="space-y-4">
                {customers.map((customer, index) => (
                  <div key={index} className="bg-white rounded-xl p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-bold text-sm">{index + 1}</span>
                      </div>
                      <h4 className="font-semibold text-gray-800">Customer {index + 1}</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Bill To</p>
                        <p className="font-medium text-gray-800">{customer?.billTo || raw.customerName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Dispatcher Name</p>
                        <p className="font-medium text-gray-800">{customer?.dispatcherName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Work Order No</p>
                        <p className="font-medium text-gray-800">{customer?.workOrderNo || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Load No</p>
                        <p className="font-medium text-gray-800">{customer?.loadNo || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Line Haul</p>
                        <p className="font-medium text-gray-800">${fmtCurrency(customer?.lineHaul || 0)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">FSC</p>
                        <p className="font-medium text-gray-800">{fmtCurrency(customer?.fsc || 0)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Other</p>
                        <p className="font-medium text-gray-800">${fmtCurrency(customer?.otherTotal || 0)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="font-bold text-lg text-green-600">{fmtCurrency(customer?.totalAmount || customer?.calculatedTotal || 0)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Carrier Information */}
          {Object.keys(carrier).length > 0 && (
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
                    <p className="font-semibold text-gray-800">{carrier?.carrierName || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                    <Truck className="text-pink-600" size={16} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Equipment Type</p>
                    <p className="font-semibold text-gray-800">{carrier?.equipmentType || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <DollarSign className="text-green-600" size={16} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Carrier Fees</p>
                    <p className="font-semibold text-gray-800">{fmtCurrency(carrier?.totalCarrierFees || 0)}</p>
                  </div>
                </div>
              </div>

              {Array.isArray(carrier.carrierFees) && carrier.carrierFees.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Carrier Charges</h4>
                  <div className="space-y-2">
                    {carrier.carrierFees.map((charge, i) => (
                      <div key={i} className="bg-white rounded-lg p-3 border border-purple-200">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-800">{charge?.name || 'N/A'}</span>
                          <span className="font-bold text-green-600">{fmtCurrency(charge?.total || 0)}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          Quantity: {charge?.quantity || 0} × Amount: {fmtCurrency(charge?.amount || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assign Driver UI */}
              <div className="mt-4 pt-4">
                <h4 className="font-semibold text-black mb-3">Assign Driver</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 items-end">
                  <div className="relative md:col-span-1">
                    <label className="text-md font-medium text-black">Driver name</label>
                    <input
                      type="text"
                      value={selectedDriver ? `${selectedDriver.fullName || selectedDriver.name || ''} (${selectedDriver._id || ''})` : driverSearch}
                      placeholder="Start typing driver name or id..."
                      onChange={(e) => { setDriverSearch(e.target.value); if (selectedDriver) setSelectedDriver(null); setShowDriverDropdown(true); }}
                      onFocus={() => setShowDriverDropdown(true)}
                      className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white"
                    />

                    {showDriverDropdown && (
                      <div className="absolute z-30 mt-1 w-full max-h-60 overflow-auto bg-white rounded shadow-lg border border-gray-200">
                        {driversLoading ? (
                          <div className="p-3 text-sm text-gray-600 flex items-center gap-2">
                            <RefreshCw className="animate-spin" size={14} />
                            Loading drivers...
                          </div>
                        ) : filteredDrivers.length === 0 ? (
                          <div className="p-3 text-sm text-gray-500">No drivers found for this carrier</div>
                        ) : (
                          filteredDrivers.map((d) => (
                            <button
                              key={d._id || d.id}
                              onClick={() => { setSelectedDriver(d); setVehicleNumberInput(d.mcDot || d.vehicleNumber || ''); setDriverSearch(''); setShowDriverDropdown(false); }}
                              className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b last:border-b-0 text-sm transition-colors"
                            >
                              <div className="font-semibold text-gray-900">{d.fullName || d.name || 'Unnamed'}</div>
                              <div className="text-xs text-gray-600 mt-0.5">ID: {d._id || d.id}</div>
                             
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-md font-medium text-black">Vehicle Number</label>
                    <input
                      type="text"
                      value={vehicleNumberInput}
                      onChange={(e) => setVehicleNumberInput(e.target.value)}
                      placeholder="ABC-1234"
                      className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAssignDriver}
                      disabled={assignLoading || !selectedDriver}
                      className={`px-4 py-2 rounded-lg font-semibold ${assignLoading || !selectedDriver ? MS.disabledBtn : MS.primaryBtn}`}
                    >
                      {assignLoading ? 'Assigning...' : 'Assign Driver'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Shipper Information */}
          {Object.keys(shipper).length > 0 && (
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Truck className="text-orange-600" size={20} />
                <h3 className="text-lg font-bold text-gray-800">Shipper Information</h3>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileText className="text-blue-600" size={16} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Container No</p>
                    <p className="font-semibold text-gray-800">{shipper?.containerNo || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Truck className="text-green-600" size={16} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Container Type</p>
                    <p className="font-semibold text-gray-800">{shipper?.containerType || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {pickUps.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Pickup Locations</h4>
                  <div className="space-y-3">
                    {pickUps.map((location, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-orange-200">
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
                            <p className="font-medium text-gray-800">{fmtDate(location?.pickUpDate) || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Drop Locations */}
              {drops.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Drop Locations</h4>
                  <div className="space-y-3">
                    {drops.map((location, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-yellow-200">
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
                            <p className="font-medium text-gray-800">{fmtDate(location?.dropDate) || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Return Location - Only for DRAYAGE */}
          {raw.loadType === 'DRAYAGE' && raw.returnLocation && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="text-indigo-600" size={20} />
                <h3 className="text-lg font-bold text-gray-800">Return Location</h3>
              </div>

              <div className="bg-white rounded-lg p-4 border border-indigo-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Return Full Address</p>
                    <p className="font-medium text-gray-800">{raw.returnLocation?.returnFullAddress || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">City</p>
                    <p className="font-medium text-gray-800">{raw.returnLocation?.city || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">State</p>
                    <p className="font-medium text-gray-800">{raw.returnLocation?.state || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Zip Code</p>
                    <p className="font-medium text-gray-800">{raw.returnLocation?.zipCode || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Return Date</p>
                    <p className="font-medium text-gray-800">{fmtDate(raw.returnLocation?.returnDate) || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Assignment */}
          <section className={SOFT.cardBlue}>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Assignment</h3>
            {assign ? (
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div>
                  <div className="text-gray-500">Assigned To</div>
                  <div className="font-medium">{assign.employeeName} ({assign.empId}) • {assign.department}</div>
                </div>
                {assign.assignedBy && (
                  <div>
                    <div className="text-gray-500">Assigned By</div>
                    <div className="font-medium">{assign.assignedBy.employeeName} ({assign.assignedBy.empId}) • {assign.assignedBy.department}</div>
                  </div>
                )}
                <div>
                  <div className="text-gray-500">Assigned At</div>
                  <div className="font-medium">{fmtDate(assign.assignedAt)}</div>
                </div>

                {order?.raw?.forwardedToAccountant && (
                  <div className={`${SOFT.insetWhite} mt-2 border-l-4 border-green-500 bg-green-50`}>
                    <div className="text-xs text-green-700">
                      <div className="font-semibold mb-1">✅ Forwarded to Accountant</div>
                      Forwarded At: <span className="font-medium">{fmtDate(order.raw.forwardedToAccountant.forwardedAt)}</span><br />
                      By: <span className="font-medium">{order.raw.forwardedToAccountant.forwardedBy?.employeeName} ({order.raw.forwardedToAccountant.forwardedBy?.empId})</span>
                    </div>
                  </div>
                )}


              </div>
            ) : (
              <div className="text-sm text-gray-500">Not assigned</div>
            )}
          </section>

          {/* Created By */}
          <section className={SOFT.cardBlue}>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Created By</h3>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="font-medium">{createdBy.employeeName || createdBy.empName || '—'}</div>
              <div className="text-gray-600">{createdBy.empId ? `EmpId: ${createdBy.empId}` : ''}</div>
              <div className="text-gray-600">{createdBy.department || '—'}</div>
            </div>
          </section>

          {/* Load Reference */}
          <section className={`${SOFT.cardBlue} md:col-span-2`}>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Load Reference</h3>
            {Object.keys(loadRef).length ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div><div className="text-gray-500">Shipment #</div><div className="font-medium">{loadRef.shipmentNumber || extractShipmentNumber(order) || '—'}</div></div>
                <div><div className="text-gray-500">Load Type</div><div className="font-medium">{loadRef.loadType || '—'}</div></div>
                <div><div className="text-gray-500">Vehicle</div><div className="font-medium">{loadRef.vehicleType || '—'}</div></div>
                <div><div className="text-gray-500">Weight</div><div className="font-medium">{loadRef.weight || '—'}</div></div>
                <div><div className="text-gray-500">Commodity</div><div className="font-medium">{loadRef.commodity || '—'}</div></div>
                <div><div className="text-gray-500">Rate</div><div className="font-medium">{fmtCurrency(loadRef.rate)} ({loadRef.rateType || '—'})</div></div>
                <div><div className="text-gray-500">Status</div><div className="font-medium">{loadRef.status || '—'}</div></div>
                <div className="md:col-span-3 text-xs text-gray-500">Pickup: {fmtDate(loadRef.pickupDate)} • Delivery: {fmtDate(loadRef.deliveryDate)}</div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No load reference</div>
            )}
          </section>


          {/* Document Display */}
          {/* Driver Images */}

          <section className={`${SOFT.cardBlue} md:col-span-2`}>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Driver Images</h3>

            {!shipmentNumber ? (
              <div className="text-sm text-gray-500">Shipment number missing. Cannot fetch images.</div>
            ) : imgLoading ? (
              <div className="flex items-center gap-3 text-gray-600">
                <div className={`animate-spin rounded-full h-5 w-5 ${MS.spinner}`}></div>
                Loading images...
              </div>
            ) : imgError ? (
              <div className="text-sm text-red-600">Error: {imgError}</div>
            ) : images ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pickup */}
                <div className="p-3 bg-white border rounded-xl border-gray-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="font-semibold text-gray-800 text-sm">Pickup</div>
                    <div className="text-[11px] text-gray-500">{images.originPlace?.location || '—'}</div>
                  </div>
                  <div className="text-[11px] text-gray-500 mb-2">
                    Arrived: {fmtDate(images.originPlace?.arrivedAt)} • Status:{' '}
                    <span className="font-semibold">{images.originPlace?.status ?? '—'}</span>
                    {images.notes ? <> • Notes: <span className="font-normal">{images.notes}</span></> : null}
                  </div>

                  {/* SINGLE FLEX ROW for all pickup images */}
                  <RowImages
                    groups={{
                      'Empty': images.emptyTruckImages,
                      'Loaded': images.loadedTruckImages,
                      'POD': images.podImages,
                      'EIR': images.eirTickets,
                      'Container': images.containerImages,
                      'Seal': images.sealImages,
                    }}
                  />

                  {(!images.emptyTruckImages?.length &&
                    !images.loadedTruckImages?.length &&
                    !images.podImages?.length &&
                    !images.eirTickets?.length &&
                    !images.containerImages?.length &&
                    !images.sealImages?.length) && (
                      <div className="text-sm text-gray-400 mt-2">No pickup images.</div>
                    )}
                </div>

                {/* Drop */}
                <div className="p-3 bg-white border rounded-xl border-gray-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="font-semibold text-gray-800 text-sm">Drop</div>
                    <div className="text-[11px] text-gray-500">{images.destinationPlace?.location || '—'}</div>
                  </div>
                  <div className="text-[11px] text-gray-500 mb-2">
                    Arrived: {fmtDate(images.dropLocationArrivalTime)} • Completed:{' '}
                    <span className="font-semibold">{images.dropLocationCompleted ? 'Yes' : 'No'}</span>
                    {images.dropLocationImages?.notes ? <> • Notes: <span className="font-normal">{images.dropLocationImages.notes}</span></> : null}
                  </div>

                  {/* SINGLE FLEX ROW for all drop images */}
                  <RowImages
                    groups={{
                      'Drop Loc': images.dropLocationImages?.dropLocationImages,
                      'Loaded': images.dropLocationImages?.loadedTruckImages,
                      'Empty': images.dropLocationImages?.emptyTruckImages,
                      'POD': images.dropLocationImages?.podImages,
                    }}
                  />

                  {(!images.dropLocationImages?.dropLocationImages?.length &&
                    !images.dropLocationImages?.loadedTruckImages?.length &&
                    !images.dropLocationImages?.emptyTruckImages?.length &&
                    !images.dropLocationImages?.podImages?.length) && (
                      <div className="text-sm text-gray-400 mt-2">No drop images.</div>
                    )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No images available.</div>
            )}
          </section>






          {/* ========== Additional Documents (VIEW) ========== */}
          <section className={`${SOFT.cardBlue} md:col-span-2`}>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Additional Documents</h3>

            {addDocsLoading ? (
              <div className="flex items-center gap-3 text-gray-600">
                <div className={`animate-spin rounded-full h-5 w-5 ${MS.spinner}`}></div>
                Loading additional documents...
              </div>
            ) : addDocsError ? (
              <div className="text-sm text-red-600">Error: {addDocsError}</div>
            ) : additionalDocs.length === 0 ? (
              <div className="text-sm text-gray-500">No additional documents uploaded yet.</div>
            ) : (
              <div className="flex overflow-x-auto gap-3 pb-1 snap-x snap-mandatory">
                {additionalDocs.map((d) => {
                  const url = d.documentUrl;
                  const name = getFileName(url);
                  const by = d?.uploadedBy;

                  const Card = (
                    <div className="shrink-0 snap-start w-44 md:w-56 p-3 rounded-lg border bg-white">
                      <a href={url} target="_blank" rel="noreferrer" title={name} className="block">
                        {isImage(url) ? (
                          <img src={url} alt={name} className="w-full h-28 md:h-36 object-cover rounded-md border" />
                        ) : (
                          <div className="h-28 md:h-36 rounded-md border flex items-center justify-center">
                            <div className="text-center text-xs md:text-sm">
                              <div className="text-gray-700 font-semibold mb-1">View / Download</div>
                              <div className="text-gray-500 truncate max-w-[180px] mx-auto">{name}</div>
                            </div>
                          </div>
                        )}
                      </a>

                      <div className="mt-2 text-[11px] text-gray-600 space-y-0.5">
                        <div className="truncate"><span className="text-gray-500">File:</span> {name}</div>
                        <div>
                          <span className="text-gray-500">Uploaded By:</span>{' '}
                          {by?.employeeName ? `${by.employeeName} (${by.empId || '-'})` : '—'}
                        </div>
                        <div><span className="text-gray-500">Dept:</span> {by?.department || '—'}</div>
                        <div><span className="text-gray-500">At:</span> {fmtDate(d?.uploadedAt)}</div>
                      </div>
                    </div>
                  );

                  return <div key={d._id}>{Card}</div>;
                })}
              </div>


            )}
          </section>
          {/* ========== Additional Documents (UPLOAD) ========== */}
          <section className={`${SOFT.cardBlue} md:col-span-2`}>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Additional Documents (CMT Upload)</h3>
            <div className="p-4 bg-white border rounded-xl">
              <div className="text-sm text-gray-600 mb-3">
                DO ID: <span className="font-medium">{String(doMongoId).slice(-8)}</span> • CMT EmpId:{' '}
                <span className="font-medium">{cmtEmpId || '—'}</span>
              </div>

              <label className={`inline-flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 ${MS.subtleBtn}`}>
                <FaUpload />
                <span>Select files</span>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={onFilePick}
                  accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp"
                />
              </label>

              {selFiles.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm text-gray-700 font-medium mb-2">
                    {selFiles.length} file(s) selected
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selFiles.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-gray-50">
                        <span className="text-sm truncate max-w-[220px]" title={f.name}>{f.name}</span>
                        <button onClick={() => removeDraftFile(idx)} className="text-red-600 hover:text-red-700" title="Remove">
                          <FaTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {uploading && (
                <div className="mt-4">
                  <div className="w-full h-2 bg-gray-200 rounded">
                    <div className="h-2 bg-[#0078D4] rounded" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="text-xs text-gray-600 mt-1">{progress}%</div>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  onClick={submitAdditionalDocs}
                  disabled={uploading || selFiles.length === 0}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${(uploading || selFiles.length === 0) ? MS.disabledBtn : MS.primaryBtn
                    }`}
                  title="Upload selected files"
                >
                  {uploading ? 'Uploading...' : 'Submit Documents'}
                </button>
              </div>

              <div className="mt-3 text-xs text-gray-500">
                Allowed: PDF, DOC, DOCX, JPG, PNG, WEBP • Max {MAX_SIZE_MB}MB per file
              </div>
            </div>
          </section>

          {/* Important Dates */}
          <section className="p-4 rounded-2xl border bg-[#F8FAFF] border-[#E0E7FF] md:col-span-2">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Important Dates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Row 1 */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Vessel ETA</label>
                  <input
                    type="datetime-local"
                    value={importantDates.vesselETA ? (() => { try { return new Date(importantDates.vesselETA).toISOString().slice(0, 16); } catch { return ''; } })() : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) {
                        // Convert datetime-local format to ISO string
                        const date = new Date(value);
                        if (!isNaN(date.getTime())) {
                          setImportantDates(prev => ({ ...prev, vesselETA: date.toISOString() }));
                        }
                      } else {
                        setImportantDates(prev => ({ ...prev, vesselETA: '' }));
                      }
                    }}
                    className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Lastfree Date</label>
                  <input
                    type="datetime-local"
                    value={importantDates.latfreeDate ? (() => { try { return new Date(importantDates.latfreeDate).toISOString().slice(0, 16); } catch { return ''; } })() : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) {
                        const date = new Date(value);
                        if (!isNaN(date.getTime())) {
                          setImportantDates(prev => ({ ...prev, latfreeDate: date.toISOString() }));
                        }
                      } else {
                        setImportantDates(prev => ({ ...prev, latfreeDate: '' }));
                      }
                    }}
                    className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Discharge Date</label>
                  <input
                    type="datetime-local"
                    value={importantDates.dischargeDate ? (() => { try { return new Date(importantDates.dischargeDate).toISOString().slice(0, 16); } catch { return ''; } })() : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) {
                        const date = new Date(value);
                        if (!isNaN(date.getTime())) {
                          setImportantDates(prev => ({ ...prev, dischargeDate: date.toISOString() }));
                        }
                      } else {
                        setImportantDates(prev => ({ ...prev, dischargeDate: '' }));
                      }
                    }}
                    className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Outgate Date</label>
                  <input
                    type="datetime-local"
                    value={importantDates.outgateDate ? (() => { try { return new Date(importantDates.outgateDate).toISOString().slice(0, 16); } catch { return ''; } })() : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) {
                        const date = new Date(value);
                        if (!isNaN(date.getTime())) {
                          setImportantDates(prev => ({ ...prev, outgateDate: date.toISOString() }));
                        }
                      } else {
                        setImportantDates(prev => ({ ...prev, outgateDate: '' }));
                      }
                    }}
                    className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* Row 3 */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Empty Date</label>
                  <input
                    type="datetime-local"
                    value={importantDates.emptyDate ? (() => { try { return new Date(importantDates.emptyDate).toISOString().slice(0, 16); } catch { return ''; } })() : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) {
                        const date = new Date(value);
                        if (!isNaN(date.getTime())) {
                          setImportantDates(prev => ({ ...prev, emptyDate: date.toISOString() }));
                        }
                      } else {
                        setImportantDates(prev => ({ ...prev, emptyDate: '' }));
                      }
                    }}
                    className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Per Diem Free Day</label>
                  <input
                    type="datetime-local"
                    value={importantDates.perDiemFreeDay ? (() => { try { return new Date(importantDates.perDiemFreeDay).toISOString().slice(0, 16); } catch { return ''; } })() : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) {
                        const date = new Date(value);
                        if (!isNaN(date.getTime())) {
                          setImportantDates(prev => ({ ...prev, perDiemFreeDay: date.toISOString() }));
                        }
                      } else {
                        setImportantDates(prev => ({ ...prev, perDiemFreeDay: '' }));
                      }
                    }}
                    className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* Row 4 */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Ingate Date</label>
                  <input
                    type="datetime-local"
                    value={importantDates.ingateDate ? (() => { try { return new Date(importantDates.ingateDate).toISOString().slice(0, 16); } catch { return ''; } })() : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) {
                        const date = new Date(value);
                        if (!isNaN(date.getTime())) {
                          setImportantDates(prev => ({ ...prev, ingateDate: date.toISOString() }));
                        }
                      } else {
                        setImportantDates(prev => ({ ...prev, ingateDate: '' }));
                      }
                    }}
                    className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Ready To Return Date</label>
                  <input
                    type="datetime-local"
                    value={importantDates.readyToReturnDate ? (() => { try { return new Date(importantDates.readyToReturnDate).toISOString().slice(0, 16); } catch { return ''; } })() : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) {
                        const date = new Date(value);
                        if (!isNaN(date.getTime())) {
                          setImportantDates(prev => ({ ...prev, readyToReturnDate: date.toISOString() }));
                        }
                      } else {
                        setImportantDates(prev => ({ ...prev, readyToReturnDate: '' }));
                      }
                    }}
                    className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              {(() => {
                const isDelivered = loadRef.status && loadRef.status.toLowerCase() === 'delivered';
                const isDisabled = updatingDates || isDelivered;
                return (
                  <button
                    onClick={updateImportantDates}
                    disabled={isDisabled}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${isDisabled ? MS.disabledBtn : MS.primaryBtn}`}
                    title={isDelivered ? 'Cannot update dates for delivered loads' : 'Update important dates'}
                  >
                    {updatingDates ? (
                      <>
                        <div className={`animate-spin rounded-full h-4 w-4 ${MS.spinner} border-2`}></div>
                        Updating...
                      </>
                    ) : (
                      'Update'
                    )}
                  </button>
                );
              })()}
            </div>
          </section>

          {/* Rejected by Accountant */}
          {order?.raw?.accountantApproval?.status === 'rejected' && (
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-200">
              <div className="flex items-center gap-2 mb-4">
                <XCircle className="text-orange-600" size={20} />
                <h3 className="text-lg font-bold text-gray-800">Rejected by Accountant</h3>
              </div>
              <div className="bg-white rounded-xl p-4 border border-orange-200">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Rejected By</p>
                    <p className="font-medium text-gray-800">
                      {order?.raw?.accountantApproval?.rejectedBy?.employeeName || order?.raw?.accountantApproval?.rejectedBy?.empId || order?.raw?.accountantApproval?.assignedTo?.employeeName || order?.raw?.accountantApproval?.assignedTo?.empId || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Rejected At</p>
                    <p className="font-medium text-gray-800">
                      {order?.raw?.accountantApproval?.rejectedAt ? (() => {
                        try {
                          return new Date(order.raw.accountantApproval.rejectedAt).toLocaleString();
                        } catch {
                          return 'N/A';
                        }
                      })() : order?.raw?.accountantApproval?.updatedAt ? (() => {
                        try {
                          return new Date(order.raw.accountantApproval.updatedAt).toLocaleString();
                        } catch {
                          return 'N/A';
                        }
                      })() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Rejection Reason</p>
                    <p className="font-medium text-gray-800 bg-orange-50 p-3 rounded-lg border border-orange-200">
                      {order?.raw?.accountantApproval?.rejectionReason || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Remarks & Forward */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Forward to Accountant</h3>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <label className="text-sm text-gray-600 mb-2 block">Message to Accountant</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Add remarks for accountant"
              />
              <div className="mt-4 flex justify-end">
                <button
                  onClick={(e) => {
                    if (alreadyForwarded) {
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    forwardToAccountant();
                  }}
                  disabled={fwLoading || alreadyForwarded}
                  className={`px-6 py-3 rounded-lg transition-all font-semibold ${alreadyForwarded
                      ? 'bg-gray-400 text-white cursor-not-allowed opacity-60'
                      : fwLoading
                        ? 'bg-blue-300 text-white cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl'
                    }`}
                  title={alreadyForwarded ? 'This DO has already been forwarded to accountant' : 'Forward this DO to accountant'}
                >
                  {alreadyForwarded ? (
                    <>
                      <CheckCircle size={18} className="inline mr-2" />
                      Already forwarded to the accountant
                    </>
                  ) : fwLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2"></div>
                      Forwarding...
                    </>
                  ) : (
                    <>
                      <FileText size={18} className="inline mr-2" />
                      Forward to Accountant
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Generate Documents */}
          <div className="bg-gradient-to-br from-purple-50 to-rose-50 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <FaDownload className="text-purple-500" size={20} />
              <h3 className="text-lg font-bold text-gray-800">Generate Documents</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {/* Rate Confirmation */}
              <button
                onClick={() => generateDoc('rate')}
                disabled={genLoading === 'rate'}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${genLoading === 'rate'
                    ? 'bg-indigo-300 text-white cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white hover:from-indigo-700 hover:to-purple-800 shadow-lg hover:shadow-xl'
                  }`}
                title="Generate Rate Confirmation PDF"
              >
                {genLoading === 'rate' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <FaDownload size={16} />
                    <span>Rate Confirmation PDF</span>
                  </>
                )}
              </button>

              {/* BOL */}
              <button
                onClick={() => generateDoc('bol')}
                disabled={genLoading === 'bol'}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${genLoading === 'bol'
                    ? 'bg-orange-300 text-white cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700 shadow-lg hover:shadow-xl'
                  }`}
                title="Generate BOL PDF"
              >
                {genLoading === 'bol' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <FaDownload size={16} />
                    <span>BOL PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ====================== Main Page ====================== */
export default function DODetails({ overrideEmpId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cmtUser, setCmtUser] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);

  // Tab management
  const [activeTab, setActiveTab] = useState('assign-do');

  // Rejected DOs data
  const [rejectedDOs, setRejectedDOs] = useState([]);
  const [rejectedLoading, setRejectedLoading] = useState(false);

  // Resubmit modal state
  const [resubmitModal, setResubmitModal] = useState({ open: false, order: null });
  const [corrections, setCorrections] = useState('');
  const [remarks, setRemarks] = useState('');
  const [resubmitLoading, setResubmitLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const resolvedEmpId =
    overrideEmpId ||
    localStorage.getItem('empId') ||
    sessionStorage.getItem('empId') ||
    '';

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) { alertify.error('Authentication required. Please login again.'); setOrders([]); return; }
      if (!resolvedEmpId) { alertify.error('CMT Employee ID not found.'); setOrders([]); return; }

      const url = `${API_CONFIG.BASE_URL}/api/v1/do/do/assigned-to-cmt-user?cmtEmpId=${encodeURIComponent(resolvedEmpId)}`;
      const response = await axios.get(url, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });

      if (response?.data?.success && response?.data?.data) {
        const apiData = response.data.data;
        if (apiData.cmtUser) setCmtUser(apiData.cmtUser);
        const assigned = Array.isArray(apiData.assignedDOs) ? apiData.assignedDOs : [];

        const transformed = assigned.map((item, index) => {
          const cust0 = item?.customers?.[0] || {};
          const car = item?.carrier || {};
          const ship = item?.shipper || {};
          const pu0 = ship?.pickUpLocations?.[0] || {};
          const dr0 = ship?.dropLocations?.[0] || {};

          const shipmentNumber =
            item?.loadReference?.shipmentNumber ||
            item?.shipmentNumber ||
            item?.load?.shipmentNumber ||
            item?.load?.shipment?.shipmentNumber ||
            (() => {
              const files = item?.uploadedFiles || [];
              for (const f of files) {
                const m = (f?.fileUrl || '').match(/\/(SHP\d{6,})\//i);
                if (m && m[1]) return m[1].toUpperCase();
              }
              return null;
            })();

          return {
            id: item._id || item.doId || index,
            sNo: index + 1,
            doId: `DO-${String(item.doId || item._id || '').slice(-6) || '—'}`,
            loadNo: cust0.loadNo || 'N/A',
            billTo: cust0.billTo || item.customerName || 'N/A',
            dispatcherName: cust0.dispatcherName || 'N/A',
            workOrderNo: cust0.workOrderNo || 'N/A',
            lineHaul: cust0.lineHaul || 0,
            fsc: cust0.fsc || 0,
            other: cust0.other || 0,
            totalAmount: cust0.totalAmount || cust0.calculatedTotal || 0,

            carrierName: car.carrierName || 'N/A',
            equipmentType: car.equipmentType || 'N/A',
            carrierFees: car.totalCarrierFees || 0,

            shipperName: ship.name || 'N/A',
            pickupDate: pu0.pickUpDate || ship.pickUpDate || item.pickupDate || 'N/A',
            dropDate: dr0.dropDate || ship.dropDate || item.dropDate || 'N/A',

            createdBy: item?.createdBySalesUser?.employeeName || item?.createdBySalesUser?.empName || 'N/A',
            department: item?.createdBySalesUser?.department || cmtUser?.department || 'N/A',

            uploadedFiles: item?.uploadedFiles || [],
            status: item?.status || 'open',
            doStatus: item?.doStatus || 'Active',
            assignmentStatus: item?.assignmentStatus || 'assigned',
            assignedToCMT: item?.assignedToCMT || null,
            loadReferenceStatus: item?.loadReference?.status || item?.doStatus || 'Active',

            createdAt: item?.createdAt || new Date().toISOString(),
            updatedAt: item?.updatedAt || null,

            shipmentNumber,
            raw: item,
          };
        });

        setOrders(transformed);
      } else {
        alertify.error('Unexpected response format from server');
        setOrders([]);
      }
    } catch (error) {
      if (error.response?.status === 401) alertify.error('Authentication failed. Please login again.');
      else if (error.response?.status === 403) alertify.error('Access denied.');
      else alertify.error(`Failed to load DOs: ${error.message}`);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch rejected DOs using the API from the image
  const fetchRejectedDOs = async () => {
    try {
      setRejectedLoading(true);
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) { alertify.error('Authentication required. Please login again.'); setRejectedDOs([]); return; }
      if (!resolvedEmpId) { alertify.error('CMT Employee ID not found.'); setRejectedDOs([]); return; }

      const url = `${API_CONFIG.BASE_URL}/api/v1/accountant/cmt-user/rejected-dos?cmtEmpId=${encodeURIComponent(resolvedEmpId)}`;
      console.log('Fetching rejected DOs from:', url);
      console.log('CMT EmpId:', resolvedEmpId);

      const response = await axios.get(url, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
      console.log('Rejected DOs API Response:', response.data);

      if (response?.data?.success && response?.data?.data) {
        const apiData = response.data.data;
        console.log('API Data:', apiData);
        const rejected = Array.isArray(apiData.rejectedDOs) ? apiData.rejectedDOs : [];
        console.log('Rejected DOs array:', rejected);

        const transformed = rejected.map((item, index) => {
          const cust0 = item?.customers?.[0] || {};
          const car = item?.carrier || {};
          const ship = item?.shipper || {};
          const pu0 = ship?.pickUpLocations?.[0] || {};
          const dr0 = ship?.dropLocations?.[0] || {};

          const shipmentNumber =
            item?.loadReference?.shipmentNumber ||
            item?.shipmentNumber ||
            item?.load?.shipmentNumber ||
            item?.load?.shipment?.shipmentNumber ||
            (() => {
              const files = item?.uploadedFiles || [];
              for (const f of files) {
                const m = (f?.fileUrl || '').match(/\/(SHP\d{6,})\//i);
                if (m && m[1]) return m[1].toUpperCase();
              }
              return null;
            })();

          return {
            id: item._id || item.doId || index,
            sNo: index + 1,
            doId: `DO-${String(item.doId || item._id || '').slice(-6) || '—'}`,
            loadNo: cust0.loadNo || 'N/A',
            billTo: cust0.billTo || item.customerName || 'N/A',
            dispatcherName: cust0.dispatcherName || 'N/A',
            workOrderNo: cust0.workOrderNo || 'N/A',
            lineHaul: cust0.lineHaul || 0,
            fsc: cust0.fsc || 0,
            other: cust0.other || 0,
            totalAmount: cust0.totalAmount || cust0.calculatedTotal || 0,

            carrierName: car.carrierName || 'N/A',
            equipmentType: car.equipmentType || 'N/A',
            carrierFees: car.totalCarrierFees || 0,

            shipperName: ship.name || 'N/A',
            pickupDate: pu0.pickUpDate || ship.pickUpDate || item.pickupDate || 'N/A',
            dropDate: dr0.dropDate || ship.dropDate || item.dropDate || 'N/A',

            createdBy: item?.createdBySalesUser?.employeeName || item?.createdBySalesUser?.empName || 'N/A',
            department: item?.createdBySalesUser?.department || cmtUser?.department || 'N/A',

            uploadedFiles: item?.uploadedFiles || [],
            status: item?.status || 'rejected',
            doStatus: item?.doStatus || 'Rejected',
            assignmentStatus: item?.assignmentStatus || 'rejected',
            assignedToCMT: item?.assignedToCMT || null,
            forwardedToAccountant: item?.forwardedToAccountant || null,
            loadReferenceStatus: item?.loadReference?.status || item?.doStatus || 'Rejected',

            createdAt: item?.createdAt || new Date().toISOString(),
            updatedAt: item?.updatedAt || null,

            shipmentNumber,
            raw: item,
          };
        });

        setRejectedDOs(transformed);
        console.log('Transformed rejected DOs:', transformed);
      } else {
        console.log('Unexpected response format:', response.data);
        alertify.error('Unexpected response format from server');
        setRejectedDOs([]);
      }
    } catch (error) {
      console.error('Error fetching rejected DOs:', error);
      if (error.response?.status === 401) alertify.error('Authentication failed. Please login again.');
      else if (error.response?.status === 403) alertify.error('Access denied.');
      else if (error.response?.status === 404) alertify.error('API endpoint not found. Please check the URL.');
      else alertify.error(`Failed to load rejected DOs: ${error.message}`);
      setRejectedDOs([]);
    } finally {
      setRejectedLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchRejectedDOs();
    /* eslint-disable-next-line */
  }, [resolvedEmpId]);

 const filteredOrders = useMemo(() => {
  const term = (searchTerm || '').toLowerCase();
  const base = orders.filter((o) =>
    o.loadNo?.toLowerCase().includes(term) ||
    o.billTo?.toLowerCase().includes(term) ||
    o.dispatcherName?.toLowerCase().includes(term) ||
    o.workOrderNo?.toLowerCase().includes(term) ||
    o.carrierName?.toLowerCase().includes(term) ||
    o.shipperName?.toLowerCase().includes(term) ||
    o.doId?.toLowerCase().includes(term)
  );
  return base.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}, [orders, searchTerm]);

 const filteredRejectedDOs = useMemo(() => {
  const term = (searchTerm || '').toLowerCase();
  const base = rejectedDOs.filter((o) =>
    o.loadNo?.toLowerCase().includes(term) ||
    o.billTo?.toLowerCase().includes(term) ||
    o.dispatcherName?.toLowerCase().includes(term) ||
    o.workOrderNo?.toLowerCase().includes(term) ||
    o.carrierName?.toLowerCase().includes(term) ||
    o.shipperName?.toLowerCase().includes(term) ||
    o.doId?.toLowerCase().includes(term)
  );
  return base.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}, [rejectedDOs, searchTerm]);

  const currentData = activeTab === 'assign-do' ? filteredOrders : filteredRejectedDOs;
  const totalPages = Math.ceil(currentData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrders = currentData.slice(startIndex, endIndex);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, activeTab]);

  const handlePageChange = (page) => { if (page >= 1 && page <= totalPages) setCurrentPage(page); };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);

    // If switching to rejected tab and no data, fetch it
    if (tab === 'rejected' && rejectedDOs.length === 0 && !rejectedLoading) {
      fetchRejectedDOs();
    }
  };

  // Handle resubmit DO
  const handleResubmitDO = async () => {
    try {
      if (!resubmitModal.order) return alertify.error('No order selected');
      if (!resolvedEmpId) return alertify.error('CMT Employee ID not found');

      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) return alertify.error('Authentication required');

      setResubmitLoading(true);

      const doMongoId = resubmitModal.order?.raw?._id || resubmitModal.order?.id;
      if (!doMongoId) return alertify.error('DO ID not found');

      const url = `${API_CONFIG.BASE_URL}/api/v1/accountant/cmt-user/resubmit-do`;
      const payload = {
        doId: String(doMongoId),
        cmtEmpId: String(resolvedEmpId),
        corrections: (corrections || '').trim() || 'Corrections made by CMT',
        remarks: (remarks || '').trim() || 'Resubmitted by CMT user'
      };

      console.log('Resubmitting DO with payload:', payload);

      const response = await axios.post(url, payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });

      if (response?.data?.success) {
        alertify.success('DO resubmitted successfully');
        setResubmitModal({ open: false, order: null });
        setCorrections('');
        setRemarks('');
        // Refresh the rejected DOs list
        fetchRejectedDOs();
      } else {
        alertify.error(response?.data?.message || 'Resubmit failed');
      }
    } catch (error) {
      console.error('Error resubmitting DO:', error);
      alertify.error(error?.response?.data?.message || error.message || 'Resubmit failed');
    } finally {
      setResubmitLoading(false);
    }
  };

  // Open resubmit modal
  const openResubmitModal = (order) => {
    setResubmitModal({ open: true, order });
    setCorrections('');
    setRemarks('');
  };

  const handleForwardSuccess = (updated) => {
    setOrders((prev) =>
      prev.map((o) => {
        const oid = o?.raw?._id || o?.id;
        if (oid === updated?._id) {
          return {
            ...o,
            assignmentStatus: updated.assignmentStatus || 'cmt_verified',
            raw: { ...(o.raw || {}), assignmentStatus: updated.assignmentStatus || 'cmt_verified', forwardedToAccountant: updated.forwardedToAccountant },
          };
        }
        return o;
      })
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex flex-col justify-center items-center h-96 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-purple-600 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xl font-semibold text-gray-800 mb-2">Loading Delivery Orders...</p>
            <p className="text-sm text-gray-600">Please wait while we fetch the information</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Tabs */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => handleTabChange('assign-do')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${activeTab === 'assign-do'
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
        >
          <div className="flex items-center gap-2">
            <Package size={18} />
            <span>Assign DO ({filteredOrders.length})</span>
          </div>
        </button>
        <button
          onClick={() => handleTabChange('rejected')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${activeTab === 'rejected'
              ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
        >
          <div className="flex items-center gap-2">
            <XCircle size={18} />
            <span>Rejected by Accountant ({filteredRejectedDOs.length})</span>
          </div>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'assign-do' && (
        <div>
          {/* Statistics Cards */}
          <div className="flex items-center gap-6 mb-6">
            <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Package className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Assigned DOs</p>
                  <p className="text-xl font-bold text-gray-800">{filteredOrders.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="text-green-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Verified</p>
                  <p className="text-xl font-bold text-green-600">{filteredOrders.filter(o => o.assignmentStatus === 'cmt_verified').length}</p>
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
                  <p className="text-xl font-bold text-purple-600">{filteredOrders.filter(o => o.createdAt?.split('T')[0] === new Date().toISOString().split('T')[0]).length}</p>
                </div>
              </div>
            </div>
            <div className="flex-1"></div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search DO / Load / Carrier / Shipper..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rejected' && (
        <div>
          {/* Statistics Cards */}
          <div className="flex items-center gap-6 mb-6">
            <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <XCircle className="text-red-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Rejected</p>
                  <p className="text-xl font-bold text-gray-800">{filteredRejectedDOs.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Calendar className="text-orange-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Today</p>
                  <p className="text-xl font-bold text-orange-600">{filteredRejectedDOs.filter(o => o.createdAt?.split('T')[0] === new Date().toISOString().split('T')[0]).length}</p>
                </div>
              </div>
            </div>
            <div className="flex-1"></div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search rejected DOs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={fetchRejectedDOs}
                disabled={rejectedLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh rejected DOs"
              >
                {rejectedLoading ? (
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
        </div>
      )}



      {/* Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {(loading || (activeTab === 'rejected' && rejectedLoading)) ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">
              {activeTab === 'assign-do' ? 'Loading Assigned DOs...' : 'Loading Rejected DOs...'}
            </p>
            <p className="text-gray-400 text-sm">Please wait while we fetch the data</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                  <tr>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">S.No</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">DO ID</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Load No</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Dispatcher</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Carrier</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Total Amount</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Carrier Fees</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentOrders.map((order, index) => (
                    <tr key={order.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="py-2 px-3"><span className="font-medium text-gray-700">{order.sNo}</span></td>
                      <td className="py-2 px-3"><span className="font-medium text-gray-700">{order.doId}</span></td>
                      <td className="py-2 px-3"><span className="font-medium text-gray-700">{order.loadNo}</span></td>
                      <td className="py-2 px-3"><span className="font-medium text-gray-700">{order.dispatcherName}</span></td>
                      <td className="py-2 px-3"><span className="font-medium text-gray-700">{order.carrierName}</span></td>
                      <td className="py-2 px-3"><span className="font-medium text-gray-700">{fmtCurrency(order.totalAmount)}</span></td>
                      <td className="py-2 px-3"><span className="font-medium text-gray-700">{fmtCurrency(order.carrierFees)}</span></td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full ${order.status === 'open' ? MS.successPill : MS.neutralPill
                              }`}
                          >
                            {order.loadReferenceStatus || order.doStatus || order.status}
                          </span>
                          {order.assignmentStatus === 'cmt_verified' && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                              CMT Verified
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              console.log('Opening modal for order:', order.doId, 'Active Tab:', activeTab, 'Assignment Status:', order.assignmentStatus, 'Raw Assignment Status:', order.raw?.assignmentStatus, 'Forwarded:', !!order.raw?.forwardedToAccountant);
                              setViewingOrder(order);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg hover:from-blue-600 hover:to-indigo-700 hover:shadow-xl"
                          >
                            <FaEye size={12} />
                            <span>View</span>
                          </button>

                          {/* Resubmit button for rejected DOs */}
                          {activeTab === 'rejected' && (
                            <button
                              onClick={() => openResubmitModal(order)}
                              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg hover:from-orange-600 hover:to-amber-700 hover:shadow-xl"
                              title="Resubmit this DO with corrections"
                            >
                              <RefreshCw size={12} />
                              <span>Resubmit</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {currentData.length === 0 && (
              <div className="text-center py-12">
                <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  {searchTerm
                    ? 'No DOs found matching your search'
                    : activeTab === 'assign-do'
                      ? 'No DOs assigned'
                      : 'No rejected DOs'
                  }
                </p>
                <p className="text-gray-400 text-sm">
                  {searchTerm
                    ? 'Try adjusting your search terms'
                    : activeTab === 'assign-do'
                      ? 'Currently no data for this CMT user'
                      : 'No DOs have been rejected by accountant yet'
                  }
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Enhanced Pagination */}
      {totalPages > 1 && currentData.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, currentData.length)} of {currentData.length} DOs
            {searchTerm && ` (filtered from ${activeTab === 'assign-do' ? orders.length : rejectedDOs.length} total)`}
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
                .map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${currentPage === page
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                  >
                    {page}
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

      {/* View Modal */}
      <DetailsModal
        open={!!viewingOrder}
        onClose={() => setViewingOrder(null)}
        order={viewingOrder}
        cmtEmpId={resolvedEmpId}
        onForwardSuccess={handleForwardSuccess}
      />

      {/* Resubmit Modal */}
      {resubmitModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setResubmitModal({ open: false, order: null })} />
          <div className="relative w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-gray-100 p-6">

            {/* Header */}
            <div className={`${SOFT.header} mb-5`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">Resubmit DO — {resubmitModal.order?.doId}</h2>
                  <p className="text-xs/5 opacity-90 mt-1">
                    This DO was rejected by the accountant and needs corrections
                  </p>
                </div>
                <button
                  onClick={() => setResubmitModal({ open: false, order: null })}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25"
                >
                  <FaTimes /> Close
                </button>
              </div>
            </div>

            {/* DO Summary */}
            <div className={`${SOFT.cardBlue} mb-6`}>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">DO Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><div className="text-gray-500">Load No</div><div className="font-medium">{resubmitModal.order?.loadNo || 'N/A'}</div></div>
                <div><div className="text-gray-500">Bill To</div><div className="font-medium">{resubmitModal.order?.billTo || 'N/A'}</div></div>
                <div><div className="text-gray-500">Carrier</div><div className="font-medium">{resubmitModal.order?.carrierName || 'N/A'}</div></div>
                <div><div className="text-gray-500">Total Amount</div><div className="font-medium">{fmtCurrency(resubmitModal.order?.totalAmount)}</div></div>
              </div>
            </div>

            {/* Corrections */}
            <div className={`${SOFT.cardBlue} mb-6`}>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Corrections Made</h3>
              <div className={`${SOFT.insetWhite}`}>
                <label className="text-xs text-gray-500">What corrections were made?</label>
                <textarea
                  value={corrections}
                  onChange={(e) => setCorrections(e.target.value)}
                  rows={3}
                  className={`mt-1 w-full text-sm px-3 py-2 border rounded-lg focus:outline-none ${MS.ring} resize-none`}
                  placeholder="e.g., Amount corrected from $5000 to $5500 after shipper confirmation"
                />
              </div>
            </div>

            {/* Remarks */}
            <div className={`${SOFT.cardBlue} mb-6`}>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Additional Remarks</h3>
              <div className={`${SOFT.insetWhite}`}>
                <label className="text-xs text-gray-500">Any additional notes or remarks?</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  className={`mt-1 w-full text-sm px-3 py-2 border rounded-lg focus:outline-none ${MS.ring} resize-none`}
                  placeholder="e.g., Shipper confirmed the correct amount via phone call"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setResubmitModal({ open: false, order: null })}
                className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleResubmitDO}
                disabled={resubmitLoading}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resubmitLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Resubmitting...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={18} />
                    <span>Resubmit DO</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


