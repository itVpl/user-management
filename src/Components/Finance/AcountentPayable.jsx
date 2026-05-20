import React, { useEffect, useState, useMemo, memo } from "react";
import axios from "axios";
import { FaArrowLeft, FaDownload, FaUpload, FaTimes } from "react-icons/fa";
import {
  User,
  Mail,
  Phone,
  Building,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  PlusCircle,
  MapPin,
  Truck,
  Calendar,
  DollarSign,
  Search,
  Paperclip,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import AppModal, {
  ModalSection,
  SECTION_TONES,
  MODAL_INPUT,
  MODAL_LABEL,
  MODAL_BTN_CANCEL,
  MODAL_BTN_PRIMARY,
} from "../common/AppModal";
import { ViewActionButton, PayActionButton } from "../common/InvoiceTableActions";
import API_CONFIG from "../../config/api.js";
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.css";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchDOs,
  markCarrierAsPaid,
  setCurrentPage,
  setSelectedStatus,
  setPaymentStatus,
  selectDOs,
  selectStatistics,
  selectPagination,
  selectPaymentStatus,
  selectLoading,
  selectError,
  selectSelectedStatus,
} from "../../store/slices/accountsPayableSlice";

// Utility functions
const fmtMoney = (v) => (typeof v === "number" ? v.toFixed(2) : "0.00");
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : "—");
const shortId = (id = "") =>
  id?.length > 8 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
const isImageUrl = (url = "") => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url);
const isPdfUrl = (url = "") => /\.pdf$/i.test(url);

// Searchable Dropdown Component
const SearchableDropdown = ({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  loading = false,
  className = "",
  searchPlaceholder = "Search...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOptions, setFilteredOptions] = useState(options);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter((option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredOptions(filtered);
    }
  }, [searchTerm, options]);

  useEffect(() => {
    if (isOpen) setHighlightIndex(0);
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen]);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm("");
  };

  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className={`w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent ${disabled ? "bg-gray-100" : ""}`}
      >
        <div className="relative flex items-center">
          <input
            type="text"
            value={
              searchTerm !== ""
                ? searchTerm
                : selectedOption
                  ? selectedOption.label
                  : ""
            }
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!disabled && !loading) setIsOpen(true);
            }}
            onFocus={() => !disabled && !loading && setIsOpen(true)}
            onKeyDown={(e) => {
              if (!isOpen) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightIndex((prev) =>
                  Math.min(prev + 1, filteredOptions.length - 1),
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightIndex((prev) => Math.max(prev - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const opt = filteredOptions[highlightIndex];
                if (opt) handleSelect(opt);
              } else if (e.key === "Escape") {
                setIsOpen(false);
                setSearchTerm("");
              }
            }}
            placeholder={loading ? "Loading..." : placeholder}
            disabled={disabled || loading}
            className="w-full bg-transparent outline-none p-0 text-gray-900"
          />
          <Search className="w-4 h-4 absolute right-3 text-gray-400" />
        </div>
      </div>

      {isOpen && !disabled && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={index}
                  className={`px-4 py-2 cursor-pointer text-sm ${index === highlightIndex ? "bg-blue-100" : "hover:bg-blue-50"}`}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => handleSelect(option)}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-gray-500 text-sm text-center">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AcountentPayable = () => {
  // Redux hooks
  const dispatch = useAppDispatch();
  const dos = useAppSelector(selectDOs);
  const statistics = useAppSelector(selectStatistics);
  const pagination = useAppSelector(selectPagination);
  const paymentStatus = useAppSelector(selectPaymentStatus);
  const loading = useAppSelector(selectLoading);
  const error = useAppSelector(selectError);
  const selectedStatus = useAppSelector(selectSelectedStatus);
  const currentPage = pagination?.currentPage || 1;
  const itemsPerPage = 10; // Server-side pagination limit

  // Local component state
  const [selectedDoId, setSelectedDoId] = useState("");
  const [selectedDoDetails, setSelectedDoDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [attachments, setAttachments] = useState({}); // { doId: [files] }
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false); // For DO selection modal
  const [markAsPaidChecked, setMarkAsPaidChecked] = useState({}); // { doId: boolean }
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'paid', 'unpaid', 'pending'
  const [remarks, setRemarks] = useState({}); // { doId: 'remark text' }

  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: "",
    paymentReference: "",
    paymentNotes: "",
    carrierPaymentProof: null,
  });
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Shipment images and additional documents state
  const [shipImgs, setShipImgs] = useState(null);
  const [shipImgsLoading, setShipImgsLoading] = useState(false);
  const [shipImgsErr, setShipImgsErr] = useState("");
  const [addDocs, setAddDocs] = useState([]);
  const [addDocsLoading, setAddDocsLoading] = useState(false);
  const [addDocsErr, setAddDocsErr] = useState("");
  const [accountantImgs, setAccountantImgs] = useState(null);
  const [accountantImgsLoading, setAccountantImgsLoading] = useState(false);
  const [accountantImgsErr, setAccountantImgsErr] = useState("");

  // Fetch DOs using Redux - smart caching
  useEffect(() => {
    // Skip server fetch while searching; use client-side pagination instead
    if ((searchTerm || "").trim() !== "") return;
    dispatch(
      fetchDOs({
        page: currentPage,
        limit: itemsPerPage,
        status: selectedStatus,
        forceRefresh: false,
      }),
    );
  }, [dispatch, currentPage, selectedStatus, searchTerm]);

  // Show error alerts
  useEffect(() => {
    if (error) {
      alertify.error(`Failed to load delivery orders: ${error}`);
    }
  }, [error]);

  const handleDoSelect = async (doId) => {
    if (!doId) {
      setSelectedDoDetails(null);
      setAccountantImgs(null);
      setAccountantImgsErr("");
      return;
    }

    try {
      setLoadingDetails(true);
      setAccountantImgs(null);
      setAccountantImgsErr("");
      const token =
        sessionStorage.getItem("token") || localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch DO details
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/do/do/${doId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data && response.data.success) {
        const order = response.data.data;
        setSelectedDoDetails(order);
        setShowPaymentModal(false); // Close selection modal
        setShowDetailsModal(true); // Open details modal

        // Fetch shipment images
        const shipmentNo = order?.loadReference?.shipmentNumber;
        if (shipmentNo) {
          setShipImgsLoading(true);
          try {
            const imgResp = await axios.get(
              `${API_CONFIG.BASE_URL}/api/v1/load/shipment/${shipmentNo}/images`,
              { headers },
            );
            setShipImgs(imgResp?.data || null);
          } catch (e) {
            setShipImgsErr(
              e?.response?.data?.message ||
                e?.message ||
                "Failed to load shipment images",
            );
          } finally {
            setShipImgsLoading(false);
          }
        }

        // Fetch additional documents
        setAddDocsLoading(true);
        try {
          const docResp = await axios.get(
            `${API_CONFIG.BASE_URL}/api/v1/do/do/${doId}/additional-documents`,
            { headers },
          );
          setAddDocs(
            docResp?.data?.data?.documents ||
              docResp?.data?.additionalDocuments ||
              [],
          );
        } catch (e) {
          setAddDocsErr(
            e?.response?.data?.message ||
              e?.message ||
              "Failed to load additional documents",
          );
          setAddDocs([]);
        } finally {
          setAddDocsLoading(false);
        }

        const doIdForAccountant = order?._id || order?.id;
        if (doIdForAccountant) {
          setAccountantImgsLoading(true);
          setAccountantImgsErr("");
          try {
            const accResp = await axios.get(
              `${API_CONFIG.BASE_URL}/api/v1/do/${doIdForAccountant}/accountant-images`,
              { headers },
            );
            setAccountantImgs(accResp?.data?.data || null);
          } catch (e) {
            setAccountantImgsErr(
              e?.response?.data?.message ||
                e?.message ||
                "Failed to load reupload documents",
            );
            setAccountantImgs(null);
          } finally {
            setAccountantImgsLoading(false);
          }
        } else {
          setAccountantImgs(null);
        }
      } else {
        alertify.error("Failed to load DO details");
      }
    } catch (error) {
      console.error("Error fetching DO details:", error);
      alertify.error("Failed to load DO details");
    } finally {
      setLoadingDetails(false);
    }
  };

  // Compute totals helper
  const computeTotals = (order) => {
    const customers = order?.customers || [];
    const billTotal = customers.reduce((sum, cust) => {
      const other = Array.isArray(cust?.other)
        ? cust?.otherTotal ||
          cust.other.reduce((s, item) => s + (Number(item?.total) || 0), 0)
        : cust?.other || cust?.otherTotal || 0;
      return sum + (cust?.lineHaul || 0) + (cust?.fsc || 0) + other;
    }, 0);
    const carrierTotal = order?.carrier?.totalCarrierFees || 0;
    const netRevenue = billTotal - carrierTotal;
    return { billTotal, carrierTotal, netRevenue };
  };

  const handleSubmitPayment = async (doId) => {
    const doAttachments = attachments[doId] || [];

    // Validation: Attachment is compulsory
    if (doAttachments.length === 0) {
      alertify.error("Please upload at least one attachment before submitting");
      return;
    }

    try {
      setSubmittingPayment(true);

      // Simulate API call (add your actual API call here)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update the payment status to 'paid'
      setPaymentStatus((prev) => ({
        ...prev,
        [doId]: "paid",
      }));

      setMarkAsPaidChecked((prev) => ({
        ...prev,
        [doId]: true,
      }));

      alertify.success("Payment marked as paid successfully");

      // Close modal
      setShowDetailsModal(false);
      setSelectedDoDetails(null);
      setSelectedDoId("");
      setAccountantImgs(null);
      setAccountantImgsErr("");
    } catch (error) {
      console.error("Error submitting payment:", error);
      alertify.error("Failed to submit payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleMarkAsPaid = (doId) => {
    const isChecked = markAsPaidChecked[doId] || false;
    setMarkAsPaidChecked((prev) => ({
      ...prev,
      [doId]: !isChecked,
    }));

    // Update payment status using Redux
    if (!isChecked) {
      dispatch(setPaymentStatus({ doId, status: "paid" }));
    } else {
      dispatch(setPaymentStatus({ doId, status: "unpaid" }));
    }
  };

  const handleFileUpload = (doId, event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter((file) => {
      const isValidImage = file.type.startsWith("image/");
      const isValidPDF = file.type === "application/pdf";
      return isValidImage || isValidPDF;
    });

    if (validFiles.length !== files.length) {
      alertify.warning("Only images and PDF files are allowed");
    }

    if (validFiles.length > 0) {
      setAttachments((prev) => ({
        ...prev,
        [doId]: [...(prev[doId] || []), ...validFiles],
      }));
      alertify.success(`${validFiles.length} file(s) added`);
    }
  };

  const handleRemoveFile = (doId, index) => {
    setAttachments((prev) => {
      const newFiles = [...(prev[doId] || [])];
      newFiles.splice(index, 1);
      return {
        ...prev,
        [doId]: newFiles,
      };
    });
    alertify.success("File removed");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "unpaid":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "paid":
        return <CheckCircle size={14} />;
      case "unpaid":
        return <XCircle size={14} />;
      case "pending":
        return <Clock size={14} />;
      default:
        return null;
    }
  };

  // Filter DOs based on search and active tab (payment status) - client-side only for display
  const filteredDOs = useMemo(() => {
    const term = (searchTerm || "").toLowerCase().trim();
    const base = dos.filter((deliveryOrder) => {
      // Search filter - matches multiple fields
      const matchesSearch =
        !term ||
        deliveryOrder.id?.toLowerCase().includes(term) ||
        deliveryOrder.doNum?.toLowerCase().includes(term) ||
        deliveryOrder.clientName?.toLowerCase().includes(term) ||
        deliveryOrder.carrierName?.toLowerCase().includes(term) ||
        deliveryOrder.createdBySalesUser?.toLowerCase().includes(term);

      // Filter by active tab (payment status: all/paid/pending)
      const status = paymentStatus[deliveryOrder.originalId] || "pending";
      const matchesTab = activeTab === "all" || status === activeTab;

      return matchesSearch && matchesTab;
    });

    return base;
  }, [dos, searchTerm, activeTab, paymentStatus]);

  // Search mode: when searchTerm is active, switch to client-side pagination over full set
  const isSearching = Boolean((searchTerm || "").trim() !== "");

  // When searching, use client-side pagination over filtered list
  const totalPages = isSearching
    ? Math.max(1, Math.ceil(filteredDOs.length / itemsPerPage))
    : pagination?.totalPages || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = isSearching
    ? Math.min(startIndex + itemsPerPage, filteredDOs.length)
    : Math.min(startIndex + itemsPerPage, pagination?.totalItems || dos.length);
  const currentDOs = isSearching
    ? filteredDOs.slice(startIndex, endIndex)
    : filteredDOs; // Server returns paginated, we only filter within current page

  // Reset to page 1 when search term or active tab changes
  useEffect(() => {
    dispatch(setCurrentPage(1));
  }, [searchTerm, activeTab, dispatch]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      dispatch(setCurrentPage(page));
      // Scroll to top when page changes
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Reset to page 1 when status filter changes
  useEffect(() => {
    dispatch(setCurrentPage(1));
  }, [selectedStatus, dispatch]);

  // DO options for dropdown
  const doOptions = dos.map((deliveryOrder) => ({
    value: deliveryOrder.originalId,
    label: `${deliveryOrder.doNum} - ${deliveryOrder.clientName} - ${deliveryOrder.carrierName}`,
  }));

  const handleOpenPaymentModal = (deliveryOrder) => {
    setPaymentData(deliveryOrder);
    setPaymentForm({
      paymentMethod: "",
      paymentReference: "",
      paymentNotes: "",
      carrierPaymentProof: null,
    });
    setPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async () => {
    if (!paymentData) return;

    // Validation
    if (!paymentForm.paymentMethod) {
      alertify.error("Please select a payment method");
      return;
    }
    if (!paymentForm.carrierPaymentProof) {
      alertify.error("Please upload carrier payment proof document");
      return;
    }

    setPaymentLoading(true);
    try {
      const formData = new FormData();
      formData.append("doId", paymentData.originalId);

      // Get employee ID from storage
      const empId =
        sessionStorage.getItem("empId") || localStorage.getItem("empId") || "";
      if (empId) {
        formData.append("accountantEmpId", empId);
      }

      formData.append("paymentMethod", paymentForm.paymentMethod);
      if (paymentForm.paymentReference) {
        formData.append("paymentReference", paymentForm.paymentReference);
      }
      if (paymentForm.paymentNotes) {
        formData.append("paymentNotes", paymentForm.paymentNotes);
      }
      formData.append("carrierPaymentProof", paymentForm.carrierPaymentProof);

      // Use Redux action
      const result = await dispatch(
        markCarrierAsPaid({
          doId: paymentData.originalId,
          paymentData: paymentData,
          formData: formData,
        }),
      );

      if (markCarrierAsPaid.fulfilled.match(result)) {
        alertify.success("Carrier payment marked as paid successfully!");
        setPaymentModalOpen(false);
        // Refresh the data with force refresh
        dispatch(
          fetchDOs({
            page: currentPage,
            limit: itemsPerPage,
            status: selectedStatus,
            forceRefresh: true,
          }),
        );
      } else {
        alertify.error(result.payload || "Failed to mark carrier as paid");
      }
    } catch (error) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to mark carrier as paid";
      alertify.error(errorMsg);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleRefresh = () => {
    dispatch(
      fetchDOs({
        page: currentPage,
        limit: itemsPerPage,
        status: selectedStatus,
        forceRefresh: true,
      }),
    );
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col gap-6 mb-6 border border-gray-200 rounded-xl p-6 bg-white">
        {/* Stats Cards - full width */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-gray-700 font-bold text-xl">
              {statistics.total || dos.length}
            </div>
            <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold">
              Total DO
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-gray-700 font-bold text-xl">
              {statistics.sales_verified ?? 0}
            </div>
            <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold">
              Sales Verified
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 h-[90px] flex items-center relative">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-gray-700 font-bold text-xl">
              {statistics.cmt_verified ?? 0}
            </div>
            <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-semibold">
              CMT Verified
            </div>
          </div>
        </div>

        {/* Search + Status Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={22}
            />
            <input
              type="text"
              placeholder="Search DOs (Load No / Bill To / Carrier)..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                dispatch(setCurrentPage(1));
              }}
              className="w-full pl-6 pr-12 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-colors text-gray-600 placeholder-gray-400"
            />
          </div>
          <div className="w-full sm:w-[220px] shrink-0">
            <select
              value={selectedStatus}
              onChange={(e) => {
                dispatch(setSelectedStatus(e.target.value));
                dispatch(setCurrentPage(1));
              }}
              className="w-full h-11 px-4 border border-gray-200 rounded-xl bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            >
              <option value="all">All Statuses</option>
              <option value="sales_verified">Sales Verified</option>
              <option value="cmt_verified">CMT Verified</option>
              <option value="sales_rejected">Sales Rejected</option>
              <option value="accountant_rejected">Accountant Rejected</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 h-11 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <AppModal
        open={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedDoId("");
        }}
        title="Make Payment"
        subtitle="Select a Delivery Order"
        icon={DollarSign}
        size="md"
      >
        {loadingDetails && (
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            Loading DO details...
          </div>
        )}
        <p className="text-sm text-gray-600 mb-4">
          Select a delivery order to manage payment details
        </p>
        <SearchableDropdown
          value={selectedDoId}
          onChange={(doId) => {
            setSelectedDoId(doId);
            handleDoSelect(doId);
          }}
          options={doOptions}
          placeholder="Select a Delivery Order"
          loading={loading}
          searchPlaceholder="Search DOs..."
        />
      </AppModal>

      {/* Loading Modal */}
      {loadingDetails && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-700 font-semibold text-lg">
                Loading DO Details...
              </p>
              <p className="text-gray-500 text-sm mt-2">Please wait</p>
            </div>
          </div>
        </div>
      )}

      <AppModal
        open={showDetailsModal && !!selectedDoDetails}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedDoDetails(null);
          setSelectedDoId("");
          setAccountantImgs(null);
          setAccountantImgsErr("");
        }}
        title="DO Details"
        subtitle={
          selectedDoDetails?.customers?.[0]?.loadNo
            ? `Load #${selectedDoDetails.customers[0].loadNo}`
            : "Payment management"
        }
        icon={FileText}
        size="xl"
        contentClassName="!py-5"
      >
        <div className="space-y-5">
              {/* Customer Information */}
              {selectedDoDetails?.customers?.length > 0 && (
                <ModalSection title="Customer Information" icon={User} tone="customer">
                  <div className="space-y-3">
                    {selectedDoDetails.customers.map((customer, index) => (
                      <div
                        key={customer?._id || index}
                        className={`rounded-lg p-3.5 border ${SECTION_TONES.customer.card}`}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 font-bold text-sm">
                              {index + 1}
                            </span>
                          </div>
                          <h4 className="font-semibold text-gray-800">
                            Customer {index + 1}
                          </h4>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Bill To</p>
                            <p className="font-medium text-gray-800">
                              {customer?.billTo ||
                                selectedDoDetails?.customerName ||
                                "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">
                              Dispatcher Name
                            </p>
                            <p className="font-medium text-gray-800">
                              {customer?.dispatcherName || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Load No</p>
                            <p className="font-medium text-gray-800">
                              {customer?.loadNo || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">
                              Work Order No
                            </p>
                            <p className="font-medium text-gray-800">
                              {customer?.workOrderNo || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Line Haul</p>
                            <p className="font-medium text-gray-800">
                              ${fmtMoney(customer?.lineHaul || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">FSC</p>
                            <p className="font-medium text-gray-800">
                              ${fmtMoney(customer?.fsc || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Other</p>
                            <p className="font-medium text-gray-800">
                              $
                              {fmtMoney(
                                Array.isArray(customer?.other)
                                  ? customer?.otherTotal ||
                                      customer.other.reduce(
                                        (sum, item) =>
                                          sum + (Number(item?.total) || 0),
                                        0,
                                      )
                                  : customer?.other ||
                                      customer?.otherTotal ||
                                      0,
                              )}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-sm text-gray-600">
                              Total Amount
                            </p>
                            <p className="font-bold text-lg text-green-600">
                              $
                              {fmtMoney(
                                customer?.calculatedTotal ??
                                  customer?.totalAmount ??
                                  0,
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ModalSection>
              )}

              {/* Carrier Information */}
              {selectedDoDetails?.carrier && (
                <ModalSection title="Carrier Information" icon={Truck} tone="carrier">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <Truck className="text-purple-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Carrier Name</p>
                        <p className="font-semibold text-gray-800">
                          {selectedDoDetails.carrier?.carrierName || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                        <Truck className="text-pink-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Equipment Type</p>
                        <p className="font-semibold text-gray-800">
                          {selectedDoDetails.carrier?.equipmentType || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <DollarSign className="text-green-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Total Carrier Fees
                        </p>
                        <p className="font-semibold text-gray-800">
                          $
                          {fmtMoney(
                            selectedDoDetails.carrier?.totalCarrierFees || 0,
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedDoDetails.carrier?.carrierFees?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-800 mb-3">
                        Carrier Charges
                      </h4>
                      <div className="space-y-2">
                        {selectedDoDetails.carrier.carrierFees.map(
                          (charge, i) => (
                            <div
                              key={i}
                              className="bg-white rounded-lg p-3 border border-purple-200"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-gray-800">
                                  {charge?.name}
                                </span>
                                <span className="font-bold text-green-600">
                                  ${fmtMoney(charge?.total || 0)}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500">
                                Quantity: {charge?.quantity || 0} × Amount: $
                                {fmtMoney(charge?.amount || 0)}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </ModalSection>
              )}

              {/* Shipper Information */}
              {selectedDoDetails?.shipper && (
                <ModalSection title="Shipper Information" icon={Truck} tone="shipper">
                  <div className="flex items-center gap-2 mb-4">
                    <Truck className="text-orange-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">
                      Shipper Information
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <User className="text-orange-600" size={16} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Shipper Name</p>
                        <p className="font-semibold text-gray-800">
                          {selectedDoDetails.shipper?.name || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pickup Locations */}
                  {(selectedDoDetails.shipper?.pickUpLocations || []).length >
                    0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-800 mb-3">
                        Pickup Locations
                      </h4>
                      <div className="space-y-3">
                        {(selectedDoDetails.shipper?.pickUpLocations || []).map(
                          (location, index) => (
                            <div
                              key={location?._id || index}
                              className="bg-white rounded-lg p-3 border border-orange-200"
                            >
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-gray-600">Name</p>
                                  <p className="font-medium text-gray-800">
                                    {location?.name || "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">
                                    Address
                                  </p>
                                  <p className="font-medium text-gray-800">
                                    {location?.address || "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">City</p>
                                  <p className="font-medium text-gray-800">
                                    {location?.city || "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">State</p>
                                  <p className="font-medium text-gray-800">
                                    {location?.state || "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">
                                    Zip Code
                                  </p>
                                  <p className="font-medium text-gray-800">
                                    {location?.zipCode || "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">
                                    Pickup Date
                                  </p>
                                  <p className="font-medium text-gray-800">
                                    {location?.pickUpDate
                                      ? fmtDateTime(location.pickUpDate)
                                      : "N/A"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  {/* Drop Locations */}
                  {(selectedDoDetails.shipper?.dropLocations || []).length >
                    0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-800 mb-3">
                        Drop Locations
                      </h4>
                      <div className="space-y-3">
                        {(selectedDoDetails.shipper?.dropLocations || []).map(
                          (location, index) => (
                            <div
                              key={location?._id || index}
                              className="bg-white rounded-lg p-3 border border-yellow-200"
                            >
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-gray-600">Name</p>
                                  <p className="font-medium text-gray-800">
                                    {location?.name || "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">
                                    Address
                                  </p>
                                  <p className="font-medium text-gray-800">
                                    {location?.address || "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">City</p>
                                  <p className="font-medium text-gray-800">
                                    {location?.city || "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">State</p>
                                  <p className="font-medium text-gray-800">
                                    {location?.state || "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">
                                    Zip Code
                                  </p>
                                  <p className="font-medium text-gray-800">
                                    {location?.zipCode || "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">
                                    Drop Date
                                  </p>
                                  <p className="font-medium text-gray-800">
                                    {location?.dropDate
                                      ? fmtDateTime(location.dropDate)
                                      : "N/A"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </ModalSection>
              )}

              {/* Shipment Images */}
              {shipImgsLoading && (
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <p className="text-gray-600">Loading shipment images...</p>
                </div>
              )}
              {shipImgsErr && (
                <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
                  <p className="text-red-600 text-sm">{shipImgsErr}</p>
                </div>
              )}
              {!shipImgsLoading && shipImgs?.images && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="text-purple-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">
                      Shipment Images
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {/* Pickup Images */}
                    {[
                      ...(shipImgs.images.emptyTruckImages || []),
                      ...(shipImgs.images.loadedTruckImages || []),
                      ...(shipImgs.images.podImages || []),
                      ...(shipImgs.images.eirTickets || []),
                      ...(shipImgs.images.containerImages || []),
                      ...(shipImgs.images.sealImages || []),
                    ].length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">
                          Pickup Images
                        </h4>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {[
                            ...(shipImgs.images.emptyTruckImages || []),
                            ...(shipImgs.images.loadedTruckImages || []),
                            ...(shipImgs.images.podImages || []),
                            ...(shipImgs.images.eirTickets || []),
                            ...(shipImgs.images.containerImages || []),
                            ...(shipImgs.images.sealImages || []),
                          ].map((img, i) => (
                            <a
                              key={i}
                              href={img}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={img}
                                alt={`Pickup Image ${i + 1}`}
                                className="h-24 rounded-lg object-cover border border-gray-200"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Drop Images */}
                    {[
                      ...(shipImgs.images.dropLocationImages?.podImages || []),
                      ...(shipImgs.images.dropLocationImages
                        ?.loadedTruckImages || []),
                      ...(shipImgs.images.dropLocationImages
                        ?.dropLocationImages || []),
                      ...(shipImgs.images.dropLocationImages
                        ?.emptyTruckImages || []),
                    ].length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">
                          Drop Images
                        </h4>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {[
                            ...(shipImgs.images.dropLocationImages?.podImages ||
                              []),
                            ...(shipImgs.images.dropLocationImages
                              ?.loadedTruckImages || []),
                            ...(shipImgs.images.dropLocationImages
                              ?.dropLocationImages || []),
                            ...(shipImgs.images.dropLocationImages
                              ?.emptyTruckImages || []),
                          ].map((img, i) => (
                            <a
                              key={i}
                              href={img}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={img}
                                alt={`Drop Image ${i + 1}`}
                                className="h-24 rounded-lg object-cover border border-gray-200"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Documents */}
              {addDocsLoading && (
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <p className="text-gray-600">
                    Loading additional documents...
                  </p>
                </div>
              )}
              {addDocsErr && (
                <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
                  <p className="text-red-600 text-sm">{addDocsErr}</p>
                </div>
              )}
              {!addDocsLoading && addDocs.length > 0 && (
                <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-6 border border-pink-200">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="text-pink-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">
                      Additional Documents
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {addDocs.map((doc, i) => {
                      const url = doc?.documentUrl || "";
                      const isImg = isImageUrl(url);
                      return (
                        <div
                          key={doc?._id || i}
                          className="bg-white rounded-lg p-3 border border-pink-200"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {isImg ? (
                              <FileText className="text-blue-500" size={16} />
                            ) : (
                              <FileText className="text-gray-500" size={16} />
                            )}
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              {isPdfUrl(url)
                                ? "PDF Document"
                                : isImg
                                  ? "Image"
                                  : "File"}
                            </a>
                          </div>
                          {isImg && (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={url}
                                alt="additional-doc"
                                className="w-full h-32 object-cover rounded border border-gray-200"
                              />
                            </a>
                          )}
                          {doc?.uploadedBy && (
                            <div className="mt-2 text-xs text-gray-500">
                              <p>
                                Uploaded by:{" "}
                                {doc.uploadedBy.employeeName || "N/A"} (
                                {doc.uploadedBy.empId || "N/A"})
                              </p>
                              <p>Dept: {doc.uploadedBy.department || "N/A"}</p>
                              <p>At: {fmtDateTime(doc.uploadedAt)}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Reupload documents (same API as Accountant Invoices) */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200">
                <div className="flex items-center gap-2 mb-4">
                  <Paperclip className="text-emerald-600" size={20} />
                  <h3 className="text-lg font-bold text-gray-800">
                    Reupload Documents
                  </h3>
                </div>
                {accountantImgsLoading && (
                  <p className="text-gray-600 text-sm">
                    Loading reupload documents...
                  </p>
                )}
                {accountantImgsErr && (
                  <p className="text-red-600 text-sm">{accountantImgsErr}</p>
                )}
                {!accountantImgsLoading &&
                  !accountantImgsErr &&
                  (() => {
                    const fromSnapshot = accountantImgs?.reuploadImages || [];
                    const fromImagesArray = (
                      accountantImgs?.images || []
                    ).filter(
                      (img) =>
                        (img?.sourceType || "").toLowerCase() === "reupload",
                    );
                    const docs = [...fromSnapshot, ...fromImagesArray];
                    if (!docs.length) {
                      return (
                        <p className="text-gray-500 text-sm">
                          No reupload documents.
                        </p>
                      );
                    }
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {docs.map((doc, idx) => {
                          const url = doc?.url || doc?.imageUrl || "";
                          const isImg = isImageUrl(url);
                          if (!url) return null;
                          return (
                            <div
                              key={doc?._id || doc?.imageId || `${url}-${idx}`}
                              className="bg-white rounded-lg p-3 border border-emerald-200"
                            >
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <FileText
                                  className={
                                    isImg ? "text-blue-500" : "text-gray-500"
                                  }
                                  size={16}
                                />
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                  {isPdfUrl(url)
                                    ? "PDF Document"
                                    : isImg
                                      ? "Image"
                                      : "File"}
                                </a>
                              </div>
                              {isImg && (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <img
                                    src={url}
                                    alt="reupload-doc"
                                    className="w-full h-32 object-cover rounded border border-gray-200"
                                  />
                                </a>
                              )}
                              <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                                <p>
                                  Uploaded by:{" "}
                                  {doc?.uploadedBy?.employeeName ||
                                    accountantImgs?.forwardedBy?.employeeName ||
                                    "—"}
                                </p>
                                <p>
                                  At:{" "}
                                  {fmtDateTime(
                                    doc?.uploadedAt ||
                                      accountantImgs?.forwardedAt,
                                  )}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                {!accountantImgsLoading &&
                  !accountantImgsErr &&
                  accountantImgs && (
                    <div className="mt-3 space-y-1 text-xs text-gray-600 border-t border-emerald-100 pt-3">
                      <p>
                        Forwarded At:{" "}
                        {fmtDateTime(accountantImgs?.forwardedAt)}
                      </p>
                      <p>
                        Forwarded By:{" "}
                        {accountantImgs?.forwardedBy?.employeeName || "—"} (
                        {accountantImgs?.forwardedBy?.empId || "—"})
                      </p>
                      {accountantImgs?.remarks ? (
                        <p>Remarks: {accountantImgs.remarks}</p>
                      ) : null}
                    </div>
                  )}
              </div>

              {/* Totals */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="text-green-600" size={20} />
                  <h3 className="text-lg font-bold text-gray-800">Totals</h3>
                </div>
                <div className="space-y-2">
                  {(() => {
                    const totals = computeTotals(selectedDoDetails);
                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Bill Amount (Customer)
                          </span>
                          <span className="font-semibold text-gray-800">
                            ${fmtMoney(totals.billTotal)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            Carrier Fees
                          </span>
                          <span className="font-semibold text-gray-800">
                            ${fmtMoney(totals.carrierTotal)}
                          </span>
                        </div>
                        <div className="border-t border-gray-300 pt-2 mt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-gray-700">
                              Net Revenue
                            </span>
                            <span className="font-bold text-lg text-green-600">
                              ${fmtMoney(totals.netRevenue)}
                            </span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Carrier Payment Information - Only show carrier payment details */}
              {selectedDoDetails?.carrierPaymentStatus?.status === "paid" && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="text-green-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">
                      Carrier Payment Information
                    </h3>
                    <span className="ml-auto inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700">
                      <CheckCircle size={14} />
                      Paid
                    </span>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-green-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">
                          Payment Method
                        </p>
                        <p className="font-medium text-gray-800 capitalize">
                          {selectedDoDetails?.carrierPaymentStatus?.paymentMethod?.replace(
                            "_",
                            " ",
                          ) || "N/A"}
                        </p>
                      </div>
                      {selectedDoDetails?.carrierPaymentStatus
                        ?.paymentReference && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">
                            Payment Reference
                          </p>
                          <p className="font-medium text-gray-800">
                            {
                              selectedDoDetails.carrierPaymentStatus
                                .paymentReference
                            }
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Paid At</p>
                        <p className="font-medium text-gray-800">
                          {selectedDoDetails?.carrierPaymentStatus?.paidAt
                            ? fmtDateTime(
                                selectedDoDetails.carrierPaymentStatus.paidAt,
                              )
                            : "N/A"}
                        </p>
                      </div>
                      {selectedDoDetails?.carrierPaymentStatus
                        ?.paymentNotes && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600 mb-1">
                            Payment Notes
                          </p>
                          <p className="font-medium text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200">
                            {
                              selectedDoDetails.carrierPaymentStatus
                                .paymentNotes
                            }
                          </p>
                        </div>
                      )}
                      {selectedDoDetails?.carrierPaymentStatus
                        ?.paymentProof && (
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600 mb-2">
                            Carrier Payment Proof
                          </p>
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-3">
                              {isImageUrl(
                                selectedDoDetails.carrierPaymentStatus
                                  .paymentProof.fileUrl,
                              ) ? (
                                <a
                                  href={
                                    selectedDoDetails.carrierPaymentStatus
                                      .paymentProof.fileUrl
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                  <FileText
                                    className="text-blue-600"
                                    size={24}
                                  />
                                  <div>
                                    <p className="font-medium">
                                      {selectedDoDetails.carrierPaymentStatus
                                        .paymentProof.fileName ||
                                        "Payment Proof"}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Click to view image
                                    </p>
                                  </div>
                                </a>
                              ) : isPdfUrl(
                                  selectedDoDetails.carrierPaymentStatus
                                    .paymentProof.fileUrl,
                                ) ? (
                                <a
                                  href={
                                    selectedDoDetails.carrierPaymentStatus
                                      .paymentProof.fileUrl
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                  <FileText
                                    className="text-red-600"
                                    size={24}
                                  />
                                  <div>
                                    <p className="font-medium">
                                      {selectedDoDetails.carrierPaymentStatus
                                        .paymentProof.fileName ||
                                        "Payment Proof"}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Click to view PDF
                                    </p>
                                  </div>
                                </a>
                              ) : (
                                <a
                                  href={
                                    selectedDoDetails.carrierPaymentStatus
                                      .paymentProof.fileUrl
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                  <FileText
                                    className="text-gray-600"
                                    size={24}
                                  />
                                  <div>
                                    <p className="font-medium">
                                      {selectedDoDetails.carrierPaymentStatus
                                        .paymentProof.fileName ||
                                        "Payment Proof"}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Click to download
                                    </p>
                                  </div>
                                </a>
                              )}
                            </div>
                            {selectedDoDetails.carrierPaymentStatus.paymentProof
                              .uploadedAt && (
                              <p className="text-xs text-gray-500 mt-2">
                                Uploaded:{" "}
                                {fmtDateTime(
                                  selectedDoDetails.carrierPaymentStatus
                                    .paymentProof.uploadedAt,
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Uploaded Files */}
              {selectedDoDetails?.uploadedFiles &&
                selectedDoDetails.uploadedFiles.length > 0 && (
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="text-blue-600" size={20} />
                      <h3 className="text-lg font-bold text-gray-800">Files</h3>
                    </div>
                    <div className="space-y-2">
                      {selectedDoDetails.uploadedFiles.map((f, i) => (
                        <div
                          key={f?._id || i}
                          className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200"
                        >
                          <FileText className="text-blue-500" size={20} />
                          <a
                            href={f?.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {f?.fileName || "File"}
                          </a>
                          <span className="ml-auto text-xs text-gray-500">
                            {fmtDateTime(f?.uploadDate)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
        </div>
      </AppModal>

      {/* Loading overlay for pagination changes */}
      {loading && dos.length > 0 && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-700 font-semibold">Loading...</p>
            </div>
          </div>
        </div>
      )}

      {/* DOs Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Load No.</th>
                <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Container No.</th>
                <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Bill To</th>
                <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Carrier Name</th>
                <th className="text-right py-4 px-4 text-gray-800 font-medium text-base">Carrier Fees</th>
                <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">Created By</th>
                <th className="text-center py-4 px-4 text-gray-800 font-medium text-base">Invoice</th>
                <th className="text-center py-4 px-4 text-gray-800 font-medium text-base">Payment Due</th>
                <th className="text-center py-4 px-4 text-gray-800 font-medium text-base">Pay</th>
                <th className="text-center py-4 px-4 text-gray-800 font-medium text-base">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentDOs.map((deliveryOrder, index) => (
                <TableRow
                  key={deliveryOrder.id}
                  deliveryOrder={deliveryOrder}
                  index={index}
                  onViewDetails={(doId) => {
                    setSelectedDoId(doId);
                    handleDoSelect(doId);
                  }}
                  onPayClick={handleOpenPaymentModal}
                />
              ))}
            </tbody>
          </table>
        </div>
        {filteredDOs.length === 0 && (
          <div className="text-center py-12">
            <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {searchTerm
                ? "No DOs found matching your search"
                : "No delivery orders found"}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {(currentDOs.length > 0 || dos.length > 0) && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 bg-white rounded-2xl border border-gray-200 px-4 py-3">
          <div className="text-sm text-gray-600">
            Showing {currentDOs.length ? startIndex + 1 : 0} to{" "}
            {startIndex + currentDOs.length} of{" "}
            {isSearching ? filteredDOs.length : pagination?.totalItems || dos.length} DOs
            {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <ChevronLeft size={18} />
              <span>Previous</span>
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let p;
              if (totalPages <= 7) p = i + 1;
              else if (currentPage <= 4) p = i + 1;
              else if (currentPage >= totalPages - 3) p = totalPages - 6 + i;
              else p = currentPage - 3 + i;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePageChange(p)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                    currentPage === p
                      ? "bg-white border border-black shadow-sm text-black"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <span>Next</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      <AppModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Pay to Carrier"
        subtitle={
          paymentData
            ? `${paymentData.carrierName || "Carrier"} · Load ${paymentData.doNum || "—"}`
            : undefined
        }
        icon={DollarSign}
        size="md"
        footer={
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={() => setPaymentModalOpen(false)}
              className={MODAL_BTN_CANCEL}
              disabled={paymentLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePaymentSubmit}
              disabled={
                paymentLoading ||
                !paymentForm.paymentMethod ||
                !paymentForm.carrierPaymentProof
              }
              className={MODAL_BTN_PRIMARY}
            >
              {paymentLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Processing...
                </span>
              ) : (
                "Pay to Carrier"
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {paymentData && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
              <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 text-gray-600">
                <span>
                  Carrier:{" "}
                  <span className="font-medium text-gray-900">
                    {paymentData.carrierName || "—"}
                  </span>
                </span>
                <span>
                  Load:{" "}
                  <span className="font-medium text-gray-900">
                    {paymentData.doNum || "—"}
                  </span>
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center">
                <span className="text-gray-600">Carrier fees</span>
                <span className="font-semibold text-gray-900">
                  ${fmtMoney(Number(paymentData.carrierFees) || 0)}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className={MODAL_LABEL}>
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentForm.paymentMethod}
              onChange={(e) =>
                setPaymentForm({
                  ...paymentForm,
                  paymentMethod: e.target.value,
                })
              }
              className={MODAL_INPUT}
            >
              <option value="">Select payment method</option>
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="online">Online</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className={MODAL_LABEL}>Payment Reference (optional)</label>
            <input
              type="text"
              value={paymentForm.paymentReference}
              onChange={(e) =>
                setPaymentForm({
                  ...paymentForm,
                  paymentReference: e.target.value,
                })
              }
              placeholder="Transaction ID, check number, etc."
              className={MODAL_INPUT}
            />
          </div>

          <div>
            <label className={MODAL_LABEL}>Notes (optional)</label>
            <textarea
              value={paymentForm.paymentNotes}
              onChange={(e) =>
                setPaymentForm({
                  ...paymentForm,
                  paymentNotes: e.target.value,
                })
              }
              placeholder="Additional notes"
              rows={2}
              className={`${MODAL_INPUT} resize-none`}
            />
          </div>

          <div>
            <label className={MODAL_LABEL}>
              Payment Proof <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    if (file.size > 10 * 1024 * 1024) {
                      alertify.error("File size must be less than 10MB");
                      return;
                    }
                    setPaymentForm({
                      ...paymentForm,
                      carrierPaymentProof: file,
                    });
                  }
                }}
                className="hidden"
                id="carrier-payment-proof-upload"
              />
              <label
                htmlFor="carrier-payment-proof-upload"
                className="cursor-pointer flex flex-col items-center text-center"
              >
                {paymentForm.carrierPaymentProof ? (
                  <>
                    <CheckCircle size={28} className="text-green-600 mb-2" />
                    <p className="text-sm font-medium text-gray-800">
                      {paymentForm.carrierPaymentProof.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(paymentForm.carrierPaymentProof.size / 1024).toFixed(2)} KB
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPaymentForm({
                          ...paymentForm,
                          carrierPaymentProof: null,
                        });
                        const el = document.getElementById(
                          "carrier-payment-proof-upload",
                        );
                        if (el) el.value = "";
                      }}
                      className="mt-2 text-xs text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <>
                    <Paperclip size={32} className="text-gray-400 mb-2" />
                    <p className="text-sm text-gray-700">
                      Click to upload proof
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, JPG, PNG (max 10MB)
                    </p>
                  </>
                )}
              </label>
            </div>
          </div>
        </div>
      </AppModal>
    </div>
  );
};

// Memoized Table Row Component for better performance
const TableRow = memo(({ deliveryOrder, index, onViewDetails, onPayClick }) => {
  const isPaid =
    deliveryOrder.fullData?.carrierPaymentStatus?.status === "paid";
  const invoice = deliveryOrder.invoice;
  const invoiceDueDateInfo = invoice?.dueDateInfo;
  const containerNo =
    deliveryOrder?.fullData?.shipper?.containerNo ||
    deliveryOrder?.shipper?.containerNo ||
    deliveryOrder?.fullData?.customers?.[0]?.containerNo ||
    "—";

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="py-4 px-4">
        <span className="font-medium text-gray-700">{deliveryOrder.doNum}</span>
      </td>
      <td className="py-4 px-4">
        <span className="font-medium text-gray-700">{containerNo}</span>
      </td>
      <td className="py-4 px-4">
        <div className="relative group max-w-[100px]">
          <span className="font-medium text-gray-700 block truncate">
            {deliveryOrder.clientName || "-"}
          </span>

          {deliveryOrder.clientName && (
            <div
              className="absolute left-0 top-full mt-2 hidden group-hover:block
                      bg-gray-900 text-white text-sm
                      px-3 py-2.5
                      rounded-lg shadow-xl
                      max-w-[180px]
                      break-words
                      z-50"
            >
              {deliveryOrder.clientName}
            </div>
          )}
        </div>
      </td>

      <td className="py-4 px-4">
        <div className="relative group max-w-[100px]">
          <span className="font-medium text-gray-700 block truncate">
            {deliveryOrder.carrierName || "-"}
          </span>

          {deliveryOrder.carrierName && (
            <div
              className="absolute left-0 top-full mt-2 hidden group-hover:block
                      bg-gray-900 text-white text-sm
                      px-3 py-2.5
                      rounded-lg shadow-xl
                      max-w-[180px]
                      break-words
                      z-50"
            >
              {deliveryOrder.carrierName}
            </div>
          )}
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="relative group max-w-[60px]">
          {/* Truncated Text */}
          <span className="font-medium text-gray-700 block truncate">
            ${deliveryOrder.carrierFees || 0}
          </span>

          {/* Tooltip */}
          <div
            className="absolute left-0 top-full mt-2 hidden group-hover:block
                    bg-gray-900 text-white text-sm
                    px-3 py-2.5
                    rounded-lg shadow-xl
                    max-w-[150px]
                    break-words
                    z-50"
          >
            ${deliveryOrder.carrierFees || 0}
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        {(() => {
          const salesUser =
            deliveryOrder.createdBySalesUser?.employeeName ||
            deliveryOrder.createdBySalesUser ||
            "N/A";

          return (
            <div className="relative group max-w-[100px]">
              {/* Truncated Text */}
              <span className="font-medium text-gray-700 block truncate">
                {salesUser}
              </span>

              {/* Tooltip */}
              {salesUser !== "N/A" && (
                <div
                  className="absolute left-0 top-full mt-2 hidden group-hover:block
                          bg-gray-900 text-white text-sm
                          px-3 py-2.5
                          rounded-lg shadow-xl
                          max-w-[180px]
                          break-words
                          z-50"
                >
                  {salesUser}
                </div>
              )}
            </div>
          );
        })()}
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center justify-center">
          {invoice ? (
            <div className="flex flex-col items-center gap-1">
              <a
                href={invoice.invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                title="View Invoice"
              >
                <FileText size={16} />
                <span className="text-xs">View</span>
              </a>
              <div className="text-xs text-gray-500">
                {formatDate(invoice.uploadedAt)}
              </div>
            </div>
          ) : (
            <span className="text-sm text-gray-400 italic whitespace-nowrap">
              No Invoice
            </span>
          )}
        </div>
      </td>
      <td className="py-4 px-4">
        {(() => {
          if (!invoice || !invoice.dueDate) {
            return <span className="text-gray-400">—</span>;
          }

          const dueDateInfo = invoice.dueDateInfo;
          if (!dueDateInfo) {
            return (
              <div className="flex flex-col gap-1 items-center">
                <span className="text-sm font-semibold text-gray-600">
                  {formatDate(invoice.dueDate)}
                </span>
              </div>
            );
          }

          // Get status color
          const statusColor = dueDateInfo.isOverdue
            ? "#dc3545" // Red for overdue
            : dueDateInfo.status === "due_soon" || dueDateInfo.isDueToday
              ? "#ffc107" // Yellow/Orange for due soon
              : "#28a745"; // Green for pending

          // Calculate days value
          const daysValue = dueDateInfo.isOverdue
            ? `-${dueDateInfo.daysOverdue}`
            : dueDateInfo.daysRemaining;

          const dueDateFormatted = formatDate(invoice.dueDate);

          return (
            <div className="flex flex-col gap-1 items-center">
              <span
                className="font-semibold text-sm"
                style={{ color: statusColor }}
              >
                {dueDateFormatted}
              </span>
              <div className="flex items-center gap-1">
                <span
                  className="font-bold text-base"
                  style={{ color: statusColor }}
                  title={
                    dueDateInfo.isOverdue
                      ? `${dueDateInfo.daysOverdue} days overdue`
                      : `${dueDateInfo.daysRemaining} days remaining`
                  }
                >
                  {daysValue}
                </span>
                <span
                  className="text-xs font-medium"
                  style={{ color: statusColor }}
                >
                  {dueDateInfo.isOverdue ? "days overdue" : "days left"}
                </span>
                <CheckCircle
                  size={16}
                  style={{ color: statusColor }}
                  className="flex-shrink-0"
                />
              </div>
            </div>
          );
        })()}
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center justify-center">
          {isPaid ? (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold bg-green-100 text-green-700">
              <CheckCircle size={14} />
              Paid
            </span>
          ) : (
            <PayActionButton onClick={() => onPayClick(deliveryOrder)} />
          )}
        </div>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center justify-center gap-1.5">
          <ViewActionButton onClick={() => onViewDetails(deliveryOrder.originalId)} />
        </div>
      </td>
    </tr>
  );
});

TableRow.displayName = "TableRow";

export default AcountentPayable;
