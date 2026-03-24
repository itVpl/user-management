import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import API_CONFIG from "../../config/api.js";
import {
  MapPin,
  Truck,
  Filter,
  Search,
  Calendar,
  FileText,
  DollarSign,
  Users,
  TrendingUp,
  X,
  Eye,
  Package,
  Building,
  User,
  Phone,
} from "lucide-react";
import { DateRange } from "react-date-range";
import { addDays, format } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

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
  const dropdownRef = useRef(null);

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
  const hasError = className.includes("border-red");

  return (
    <div
      className={`relative ${className}`}
      ref={dropdownRef}
      style={{ zIndex: isOpen ? 9999 : "auto" }}
    >
      <div
        className={`w-full px-4 py-2.5 border rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent cursor-pointer ${hasError ? "border-red-500 bg-red-50" : "border-gray-300"} ${
          disabled ? "bg-gray-100 cursor-not-allowed" : "hover:border-gray-400"
        }`}
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <span className={selectedOption ? "text-gray-900" : "text-gray-500"}>
            {loading
              ? "Loading..."
              : selectedOption
                ? selectedOption.label
                : placeholder}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {isOpen && !disabled && !loading && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-2xl max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={index}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
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

/**
 * Rate Request Report Component for CMT Users (Similar to EmptyTruckLocation Design)
 */
const RateRequestReport = () => {
  const [loads, setLoads] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [salesUsers, setSalesUsers] = useState([]);
  const [loadingSalesUsers, setLoadingSalesUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Date range state (default: last 30 days)
  const [range, setRange] = useState({
    startDate: addDays(new Date(), -29),
    endDate: new Date(),
    key: "selection",
  });
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);

  // Presets
  const presets = {
    Today: [new Date(), new Date()],
    Yesterday: [addDays(new Date(), -1), addDays(new Date(), -1)],
    "Last 7 Days": [addDays(new Date(), -6), new Date()],
    "Last 30 Days": [addDays(new Date(), -29), new Date()],
    "This Month": [
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
    ],
    "Last Month": [
      new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
      new Date(new Date().getFullYear(), new Date().getMonth(), 0),
    ],
  };
  const applyPreset = (label) => {
    const [s, e] = presets[label];
    setRange({ startDate: s, endDate: e, key: "selection" });
    setShowPresetMenu(false);
  };
  const ymd = (d) => format(d, "yyyy-MM-dd"); // "YYYY-MM-DD"

  const [filters, setFilters] = useState({
    userId: "",
    loadType: "",
    assignedCompany: "",
  });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  useEffect(() => {
    fetchSalesUsers();
  }, []);

  useEffect(() => {
    fetchLoadsWithBids();
  }, [range]);

  const fetchSalesUsers = async () => {
    setLoadingSalesUsers(true);
    try {
      const token =
        sessionStorage.getItem("authToken") ||
        localStorage.getItem("authToken");
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/inhouseUser/department/Sales`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.data?.employees) {
        setSalesUsers(response.data.employees || []);
      } else if (Array.isArray(response.data)) {
        setSalesUsers(response.data || []);
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        setSalesUsers(response.data.data || []);
      }
    } catch {
      toast.error("Failed to load Sales users");
    } finally {
      setLoadingSalesUsers(false);
    }
  };

  const fetchLoadsWithBids = async () => {
    setLoading(true);
    try {
      const token =
        sessionStorage.getItem("authToken") ||
        localStorage.getItem("authToken");

      // Fetch data for each date in range
      const datePromises = [];
      const currentDate = new Date(range.startDate);
      const endDateObj = new Date(range.endDate);
      while (currentDate <= endDateObj) {
        const dateStr = ymd(currentDate);
        datePromises.push(
          axios.get(
            `${API_CONFIG.BASE_URL}/api/v1/load/reports/today-loads-with-bids?date=${dateStr}`,
            { headers: { Authorization: `Bearer ${token}` } },
          ),
        );
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const responses = await Promise.all(datePromises);
      const allLoads = [];
      let totalSummary = {
        totalLoadsPosted: 0,
        totalBidsReceived: 0,
        loadsWithBids: 0,
        loadsWithoutBids: 0,
        postedBySalesUser: 0,
        postedByShipper: 0,
        uniqueCMTUsersWhoBid: 0,
      };

      responses.forEach((response) => {
        if (response.data?.success) {
          const loads = response.data.loads || [];
          allLoads.push(...loads);

          if (response.data.summary) {
            totalSummary.totalLoadsPosted +=
              response.data.summary.totalLoadsPosted || 0;
            totalSummary.totalBidsReceived +=
              response.data.summary.totalBidsReceived || 0;
            totalSummary.loadsWithBids +=
              response.data.summary.loadsWithBids || 0;
            totalSummary.loadsWithoutBids +=
              response.data.summary.loadsWithoutBids || 0;
            totalSummary.postedBySalesUser +=
              response.data.summary.postedBySalesUser || 0;
            totalSummary.postedByShipper +=
              response.data.summary.postedByShipper || 0;
          }
        }
      });

      // Get unique CMT users who bid
      const uniqueCMTUsers = new Set();
      allLoads.forEach((load) => {
        if (load.cmtUsersWhoBid && load.cmtUsersWhoBid.length > 0) {
          load.cmtUsersWhoBid.forEach((user) => {
            if (user._id) uniqueCMTUsers.add(user._id);
          });
        }
      });
      totalSummary.uniqueCMTUsersWhoBid = uniqueCMTUsers.size;

      setLoads(allLoads);
      setSummary(totalSummary);
    } catch (error) {
      toast.error(error.message || "Failed to fetch rate request data");
      setLoads([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      userId: "",
      loadType: "",
      assignedCompany: "",
    });
    setRange({
      startDate: addDays(new Date(), -29),
      endDate: new Date(),
      key: "selection",
    });
  };

  const handleViewDetails = (load) => {
    setSelectedLoad(load);
    setShowDetailsModal(true);
  };

  /** startedAt → completedAt: HH:MM:SS only */
  const formatSlaStartedToCompleted = (sla) => {
    if (!sla) return null;
    const start = sla.startedAt;
    const end = sla.completedAt || sla.closedAt;
    if (!start || !end) return null;
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (Number.isNaN(ms) || ms < 0) return null;
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n) => String(n).padStart(2, "0");
    const hms = `${pad(h)}:${pad(m)}:${pad(s)}`;
    return { hms, startedAt: start, completedAt: end };
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      Bidding: { bg: "bg-[#E1F5FE]", text: "text-[#0277BD]", label: "Bidding" },
      Assigned: {
        bg: "bg-[#DFF6DD]",
        text: "text-[#107C10]",
        label: "Assigned",
      },
      "In Transit": {
        bg: "bg-[#FFF9C4]",
        text: "text-[#F57F17]",
        label: "In Transit",
      },
      Delivered: {
        bg: "bg-[#E8F5E9]",
        text: "text-[#2E7D32]",
        label: "Delivered",
      },
      Cancelled: {
        bg: "bg-[#FFEBEE]",
        text: "text-[#C62828]",
        label: "Cancelled",
      },
    };
    const s = statusMap[status] || statusMap["Bidding"];
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}
      >
        {s.label}
      </span>
    );
  };

  const filteredLoads = loads.filter((load) => {
    if (filters.userId && load.postedBy?.empId !== filters.userId) return false;
    if (filters.loadType && load.loadType !== filters.loadType) return false;
    if (
      filters.assignedCompany &&
      load.assignedCompany !== filters.assignedCompany
    )
      return false;
    if (searchTerm && searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      const hay = [
        load.origin?.city,
        load.origin?.state,
        load.origin?.zip,
        load.origin?.addressLine1,
        load.destination?.city,
        load.destination?.state,
        load.destination?.zip,
        load.destination?.addressLine1,
        load.postedBy?.employeeName,
        load.postedBy?.empId,
        load.assignedCMTUser?.employeeName,
        load.assignedCMTUser?.empId,
        load.loadType,
      ]
        .filter(Boolean)
        .map(String)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const uniqueLoadTypes = [
    ...new Set(loads.map((load) => load.loadType).filter(Boolean)),
  ];

  // Pagination calculations
  const totalPages = Math.ceil(filteredLoads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLoads = filteredLoads.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Generate smart pagination page numbers
  const getPaginationPages = () => {
    const pages = [];
    const maxVisible = 7; // Maximum visible page numbers

    if (totalPages <= maxVisible) {
      // If total pages are less than maxVisible, show all
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage <= 4) {
        // Near the beginning
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // Near the end
        pages.push("ellipsis");
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push("ellipsis");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.userId, filters.loadType, filters.assignedCompany, range]);

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 h-30 border border-gray-200">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-xl font-medium text-gray-700">Total Loads</p>
                <p className="mt-4 text-2xl font-bold text-gray-900">
                  {summary?.totalLoadsPosted || 0}
                </p>
              </div>
              <div className="w-11 h-11 bg-blue-50 rounded-full flex items-center justify-center">
                <Package className="text-blue-600" size={28} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 h-30 border border-gray-200">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-xl font-medium text-gray-700">Total Bids</p>
                <p className="mt-4 text-2xl font-bold text-gray-900">
                  {summary?.totalBidsReceived || 0}
                </p>
              </div>
              <div className="w-11 h-11 bg-green-50 rounded-full flex items-center justify-center">
                <TrendingUp className="text-green-600" size={28} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 h-30 border border-gray-200">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-xl font-medium text-gray-700">
                  Loads with Bids
                </p>
                <p className="mt-4 text-2xl font-bold text-gray-900">
                  {summary?.loadsWithBids || 0}
                </p>
              </div>
              <div className="w-11 h-11 bg-purple-50 rounded-full flex items-center justify-center">
                <FileText className="text-purple-600" size={28} />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 h-30 border border-gray-200">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-xl font-medium text-gray-700">No Bids</p>
                <p className="mt-4 text-2xl font-bold text-gray-900">
                  {summary?.loadsWithoutBids || 0}
                </p>
              </div>
              <div className="w-11 h-11 bg-orange-50 rounded-full flex items-center justify-center">
                <X className="text-orange-600" size={28} />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search loads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-base pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div
        className="bg-white rounded-xl border border-gray-200 p-4 mb-6"
        style={{ overflow: "visible" }}
      >
        <div className="overflow-visible">
          <div className="flex items-end gap-4 flex-wrap">
            {/* Date Range Picker */}
            <div className="flex-1 min-w-[280px]">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="inline w-4 h-4 mr-1.5 text-gray-500" />
                Date Range
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPresetMenu((v) => !v)}
                  className="w-full text-left px-4 py-2.5 border border-gray-300 rounded-lg bg-white flex items-center justify-between hover:border-gray-400 transition-colors cursor-pointer"
                >
                  <span>
                    {format(range.startDate, "MMM dd, yyyy")} -{" "}
                    {format(range.endDate, "MMM dd, yyyy")}
                  </span>
                  <span className="ml-3">▼</span>
                </button>

                {showPresetMenu && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg">
                    {Object.keys(presets).map((label) => (
                      <div
                        key={label}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                        onClick={() => applyPreset(label)}
                      >
                        {label}
                      </div>
                    ))}
                    <div
                      className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm border-t border-gray-200"
                      onClick={() => {
                        setShowPresetMenu(false);
                        setShowCustomRange(true);
                      }}
                    >
                      Custom Range
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* User Filter */}
            <div className="flex-1 min-w-[180px]">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Users className="inline w-4 h-4 mr-1.5 text-gray-500" />
                User
              </label>
              <SearchableDropdown
                value={filters.userId}
                onChange={(value) =>
                  handleFilterChange({ target: { name: "userId", value } })
                }
                options={[
                  { value: "", label: "All Users" },
                  ...salesUsers.map((user) => ({
                    value: user.empId,
                    label: `${user.employeeName} (${user.empId})`,
                  })),
                ]}
                placeholder="Select User"
                disabled={loadingSalesUsers}
                loading={loadingSalesUsers}
                searchPlaceholder="Search users..."
                className="w-full"
              />
            </div>

            {/* Load Type Filter */}
            <div className="flex-1 min-w-[180px]">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Load Type
              </label>
              <SearchableDropdown
                value={filters.loadType}
                onChange={(value) =>
                  handleFilterChange({ target: { name: "loadType", value } })
                }
                options={[
                  { value: "", label: "All Load Types" },
                  ...uniqueLoadTypes.map((type) => ({
                    value: type,
                    label: type,
                  })),
                ]}
                placeholder="Select Load Type"
                searchPlaceholder="Search load type..."
                className="w-full"
              />
            </div>

            {/* Assigned Company Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Building className="inline w-4 h-4 mr-1.5 text-gray-500" />
                Assigned Company
              </label>
              <SearchableDropdown
                value={filters.assignedCompany}
                onChange={(value) =>
                  handleFilterChange({
                    target: { name: "assignedCompany", value },
                  })
                }
                options={[
                  { value: "", label: "ALL" },
                  { value: "V Power Logistics", label: "V Power Logistics" },
                  { value: "IDENTIFICA LLC", label: "IDENTIFICA LLC" },
                  {
                    value: "MT. POCONO TRANSPORTATION INC",
                    label: "MT. POCONO TRANSPORTATION INC",
                  },
                ]}
                placeholder="Select Company"
                searchPlaceholder="Search company..."
                className="w-full"
              />
            </div>

            {/* Clear Filters Button */}
            <div className="flex-none">
              <button
                onClick={handleClearFilters}
                className="px-5 py-2.5 bg-white border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Custom Range calendars */}
          {showCustomRange && (
            <div
              className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4"
              onClick={() => setShowCustomRange(false)}
            >
              <div
                className="bg-white rounded-xl p-4 border border-gray-200"
                onClick={(e) => e.stopPropagation()}
              >
                <DateRange
                  ranges={[range]}
                  onChange={(item) => setRange(item.selection)}
                  moveRangeOnFirstSelection={false}
                  months={2}
                  direction="horizontal"
                />
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setShowCustomRange(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomRange(false);
                      fetchLoadsWithBids();
                    }}
                    className="px-4 py-2 border border-blue-600 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-600 hover:text-white"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Data Table Section */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading rate requests...</p>
          </div>
        ) : (
          <div className="overflow-x-auto p-4">
            <table className="w-full border-separate border-spacing-y-4">
              <thead className="bg-slate-100">
                <tr className="rounded-xl">
                  <th className="text-left px-5 py-3 text-gray-700 font-medium first:rounded-l-xl border-y border-gray-200 first:border-l first:border-gray-200">
                    S.NO
                  </th>
                  <th className="text-left px-5 py-3 text-gray-700 font-medium border-y border-gray-200">
                    ORIGIN
                  </th>
                  <th className="text-left px-5 py-3 text-gray-700 font-medium border-y border-gray-200">
                    DESTINATION
                  </th>
                  <th className="text-left px-5 py-3 text-gray-700 font-medium border-y border-gray-200">
                    LOAD TYPE
                  </th>
                  <th className="text-center px-5 py-3 text-gray-700 font-medium border-y border-gray-200">
                    BID COUNT
                  </th>
                  <th className="text-left px-5 py-3 text-gray-700 font-medium border-y border-gray-200">
                    POSTED BY
                  </th>
                   <th className="text-left px-5 py-3 text-gray-700 font-medium border-y border-gray-200">
                    ASSIGNED CMT
                  </th>
                  <th className="text-left px-5 py-3 text-gray-700 font-medium border-y border-gray-200">
                    DATE
                  </th>  
                  <th className="text-center px-5 py-3 text-gray-700 font-medium text-[15px] last:rounded-r-xl border-y border-gray-200 last:border-r last:border-gray-200">
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentLoads.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center">
                      <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">
                        {filters.userId || filters.loadType
                          ? "No loads found matching your filters"
                          : "No loads found for the selected date range"}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        {filters.userId || filters.loadType
                          ? "Try adjusting your filters"
                          : "Select a different date range to view loads"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  currentLoads.map((load, index) => (
                    <tr
                      key={load.loadId}
                      className="bg-white hover:bg-gray-100 transition-colors"
                    >
                      <td className="px-5 py-3 border-y border-gray-200 first:rounded-l-xl first:border-l first:border-gray-200">
                        <span className="font-medium text-gray-700">
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-5 py-3 border-y border-gray-200">
                        <div className="relative group max-w-[200px]">
                          {/* City + State */}
                          <span className="font-medium text-gray-700 block">
                            {load.origin?.city || "N/A"},{" "}
                            {load.origin?.state || "N/A"}
                          </span>

                          {/* ZIP */}
                          {load.origin?.zip && (
                            <p className="text-sm text-gray-500 mt-1">
                              ZIP: {load.origin.zip}
                            </p>
                          )}

                          {/* Address (Truncated) */}
                          {load.origin?.addressLine1 && (
                            <p className="text-sm text-gray-500 truncate block max-w-[100px]">
                              {load.origin.addressLine1}
                            </p>
                          )}

                          {/* Tooltip */}
                          {load.origin?.addressLine1 && (
                            <div
                              className="absolute left-0 top-full mt-2 hidden group-hover:block
                      bg-gray-900 text-white text-SM
                      px-3 py-2.5
                      rounded-lg shadow-xl
                      max-w-[200px]
                      break-words
                      z-50"
                            >
                              {load.origin.addressLine1}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 border-y border-gray-200">
                        <div className="relative group max-w-[220px]">
                          {/* City + State */}
                          <span className="font-medium text-gray-700 block">
                            {load.destination?.city || "N/A"},{" "}
                            {load.destination?.state || "N/A"}
                          </span>

                          {/* ZIP */}
                          {load.destination?.zip && (
                            <p className="text-sm text-gray-500 mt-1">
                              ZIP: {load.destination.zip}
                            </p>
                          )}

                          {/* Address (Truncated) */}
                          {load.destination?.addressLine1 && (
                            <p className="text-sm text-gray-500 truncate block max-w-[100px]">
                              {load.destination.addressLine1}
                            </p>
                          )}

                          {/* Tooltip */}
                          {load.destination?.addressLine1 && (
                            <div
                              className="absolute left-0 top-full mt-2 hidden group-hover:block
                      bg-gray-900 text-white text-SM
                      px-3 py-2.5
                      rounded-lg shadow-xl
                      max-w-[180px]
                      break-words
                      z-50"
                            >
                              {load.destination.addressLine1}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 border-y border-gray-200">
                        <span className="font-medium text-gray-700">
                          {load.loadType || "N/A"}
                        </span>
                      </td>
                      <td className="px-5 py-3 border-y border-gray-200 text-center">
                        <span className="font-medium text-gray-700">
                          {load.bidCount || 0}
                        </span>
                        {load.cmtUsersCount > 0 && (
                          <p className="text-sm text-gray-500 mt-1">
                            {load.cmtUsersCount} CMT user(s)
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 border-y border-gray-200">
                        <div>
                          <span className="font-medium text-gray-700">
                            {load.postedBy?.employeeName || "N/A"}
                          </span>
                          <p className="text-sm text-gray-500 mt-1">
                            {load.postedBy?.type || "N/A"}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-3 border-y border-gray-200">
                        <div>
                          <span className="font-medium text-gray-700">
                            {load.assignedCMTUser?.employeeName || "N/A"}
                          </span>
                          {load.assignedCMTUser?.empId && (
                            <p className="text-sm text-gray-500 mt-1">
                              {load.assignedCMTUser.empId}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 border-y border-gray-200">
                        <div>
                          <span className="font-medium text-gray-700">
                            {load.createdAt
                              ? new Date(load.createdAt).toLocaleDateString()
                              : "N/A"}
                          </span>
                          <p className="text-sm text-gray-500 mt-1">
                            {load.createdAt
                              ? new Date(load.createdAt).toLocaleTimeString()
                              : ""}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-3 border-y border-gray-200 last:rounded-r-xl last:border-r last:border-gray-200">
                        <button
                          onClick={() => handleViewDetails(load)}
                          className="border border-blue-300 text-blue-700 bg-white px-3 py-1 rounded-full text-base font-semibold transition-colors flex items-center justify-center gap-1 mx-auto cursor-pointer hover:bg-blue-600 hover:text-white hover:border-blue-600"
                        >
                          {/* <Eye className="w-4 h-4" /> */}
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && filteredLoads.length > 0 && (
        <div className="flex justify-between items-center mt-6 bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to{" "}
            {Math.min(endIndex, filteredLoads.length)} of {filteredLoads.length}{" "}
            loads
            {filters.userId || filters.loadType
              ? ` (filtered from ${loads.length} total)`
              : ""}
          </div>
          <div className="flex gap-3 items-center flex-wrap">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2 py-1 text-balck-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors text-base font-medium cursor-pointer"
            >
              Previous
            </button>
            {getPaginationPages().map((page, index) => {
              if (page === "ellipsis") {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-1 text-gray-800 select-none"
                  >
                    ...
                  </span>
                );
              }
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors text-base font-medium cursor-pointer ${
                    currentPage === page
                      ? "border-1 border-black-400 text-gray-800 bg-white rounded-xl"
                      : "text-gray-700 hover:text-blue-700"
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-black-600 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors text-base font-medium cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedLoad && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
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
                    <h2 className="text-xl font-bold">Load Details</h2>
                    <p className="text-blue-100">Rate Request Report</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Load Information */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="text-green-600" size={20} />
                  <h3 className="text-lg font-bold text-gray-800">
                    Load Information
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Load ID</p>
                    <p className="font-medium text-gray-800">
                      {selectedLoad.loadId || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Shipment Number</p>
                    <p className="font-medium text-gray-800">
                      {selectedLoad.shipmentNumber || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <div className="mt-1">
                      {getStatusBadge(selectedLoad.status)}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Load Type</p>
                    <p className="font-medium text-gray-800">
                      {selectedLoad.loadType || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Vehicle Type</p>
                    <p className="font-medium text-gray-800">
                      {selectedLoad.vehicleType || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Weight</p>
                    <p className="font-medium text-gray-800">
                      {selectedLoad.weight
                        ? `${selectedLoad.weight.toLocaleString()} lbs`
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Commodity</p>
                    <p className="font-medium text-gray-800">
                      {selectedLoad.commodity || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Rate</p>
                    <p className="font-medium text-gray-800">
                      $
                      {selectedLoad.rate
                        ? selectedLoad.rate.toLocaleString()
                        : "0.00"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pickup Date</p>
                    <p className="font-medium text-gray-800">
                      {selectedLoad.pickupDate
                        ? new Date(selectedLoad.pickupDate).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Delivery Date</p>
                    <p className="font-medium text-gray-800">
                      {selectedLoad.deliveryDate
                        ? new Date(selectedLoad.deliveryDate).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Origin & Destination */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="text-green-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">Origin</h3>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-green-200">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">City</p>
                        <p className="font-medium text-gray-800">
                          {selectedLoad.origin?.city || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">State</p>
                        <p className="font-medium text-gray-800">
                          {selectedLoad.origin?.state || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">ZIP Code</p>
                        <p className="font-medium text-gray-800">
                          {selectedLoad.origin?.zip || "N/A"}
                        </p>
                      </div>
                      {selectedLoad.origin?.addressLine1 && (
                        <div>
                          <p className="text-sm text-gray-600">Address</p>
                          <p className="font-medium text-gray-800">
                            {selectedLoad.origin.addressLine1}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="text-orange-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">
                      Destination
                    </h3>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-orange-200">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">City</p>
                        <p className="font-medium text-gray-800">
                          {selectedLoad.destination?.city || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">State</p>
                        <p className="font-medium text-gray-800">
                          {selectedLoad.destination?.state || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">ZIP Code</p>
                        <p className="font-medium text-gray-800">
                          {selectedLoad.destination?.zip || "N/A"}
                        </p>
                      </div>
                      {selectedLoad.destination?.addressLine1 && (
                        <div>
                          <p className="text-sm text-gray-600">Address</p>
                          <p className="font-medium text-gray-800">
                            {selectedLoad.destination.addressLine1}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Posted By */}
              {selectedLoad.postedBy && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="text-purple-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">
                      Posted By
                    </h3>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-purple-200">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <Users className="text-purple-600" size={16} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Type</p>
                          <p className="font-semibold text-gray-800">
                            {selectedLoad.postedBy.type || "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                          <FileText className="text-pink-600" size={16} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Employee ID</p>
                          <p className="font-semibold text-gray-800">
                            {selectedLoad.postedBy.empId || "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <User className="text-green-600" size={16} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Name</p>
                          <p className="font-semibold text-gray-800">
                            {selectedLoad.postedBy.employeeName || "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Building className="text-blue-600" size={16} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Department</p>
                          <p className="font-semibold text-gray-800">
                            {selectedLoad.postedBy.department || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Assigned By */}
              {selectedLoad.assignedCMTUser && (
                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="text-cyan-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">
                      Assigned By
                    </h3>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-cyan-200">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center">
                          <FileText className="text-cyan-600" size={16} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Employee ID</p>
                          <p className="font-semibold text-gray-800">
                            {selectedLoad.assignedCMTUser.empId || "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="text-blue-600" size={16} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Name</p>
                          <p className="font-semibold text-gray-800">
                            {selectedLoad.assignedCMTUser.employeeName || "N/A"}
                          </p>
                        </div>
                      </div>
                      {selectedLoad.assignedCMTUser.displayName && (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <User className="text-purple-600" size={16} />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">
                              Display Name
                            </p>
                            <p className="font-semibold text-gray-800">
                              {selectedLoad.assignedCMTUser.displayName ||
                                selectedLoad.assignedCMTUser.aliasName ||
                                "N/A"}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                          <Building className="text-teal-600" size={16} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Department</p>
                          <p className="font-semibold text-gray-800">
                            {selectedLoad.assignedCMTUser.department || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SLA: startedAt → completedAt duration */}
              {selectedLoad.cmtBidSla &&
                (() => {
                  const slaFmt = formatSlaStartedToCompleted(
                    selectedLoad.cmtBidSla,
                  );
                  return (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
                      <div className="flex items-center gap-2 mb-4">
                        <Calendar className="text-amber-600" size={20} />
                        <h3 className="text-lg font-bold text-gray-800">
                          SLA (Bid window)
                        </h3>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-amber-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Started at</p>
                            <p className="font-medium text-gray-800">
                              {selectedLoad.cmtBidSla.startedAt
                                ? new Date(
                                    selectedLoad.cmtBidSla.startedAt,
                                  ).toLocaleString()
                                : "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Completed at</p>
                            <p className="font-medium text-gray-800">
                              {selectedLoad.cmtBidSla.completedAt
                                ? new Date(
                                    selectedLoad.cmtBidSla.completedAt,
                                  ).toLocaleString()
                                : "N/A"}
                            </p>
                          </div>
                          {slaFmt && (
                            <div className="sm:col-span-2 pt-2 border-t border-amber-100">
                              <p className="text-sm text-gray-600 mb-1">
                                Time between started & completed
                              </p>
                              <p className="font-semibold text-amber-800 text-lg tabular-nums tracking-tight font-mono">
                                {slaFmt.hms}
                              </p>
                            </div>
                          )}
                          {!slaFmt &&
                            selectedLoad.cmtBidSla.startedAt &&
                            !selectedLoad.cmtBidSla.completedAt && (
                              <div className="sm:col-span-2 text-sm text-gray-500">
                                Completed time not available yet — duration will
                                show once SLA is completed.
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

              {/* Bids Section */}
              {selectedLoad.bids && selectedLoad.bids.length > 0 ? (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="text-indigo-600" size={20} />
                    <h3 className="text-lg font-bold text-gray-800">
                      Bids ({selectedLoad.bidCount})
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {selectedLoad.bids.map((bid, index) => (
                      <div
                        key={bid.bidId || index}
                        className="bg-white rounded-xl p-4 border border-indigo-200"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Rate</p>
                            <p className="font-bold text-lg text-green-600">
                              ${bid.rate ? bid.rate.toLocaleString() : "0.00"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Bid placed</p>
                            <p className="font-medium text-gray-800">
                              {bid.createdAt
                                ? new Date(bid.createdAt).toLocaleString()
                                : "N/A"}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-sm text-gray-600">Carrier</p>
                            <p className="font-medium text-gray-800">
                              {bid.carrier?.compName || "N/A"}
                            </p>
                            {bid.carrier?.createdAt && (
                              <p className="text-xs text-gray-500 mt-1">
                                Added to system:{" "}
                                {new Date(
                                  bid.carrier.createdAt,
                                ).toLocaleString()}
                              </p>
                            )}
                          </div>
                          <div className="col-span-2">
                            <p className="text-sm text-gray-600">Placed By</p>
                            <p className="font-medium text-gray-800">
                              {bid.placedByCMTUser?.employeeName ||
                                bid.placedByTrucker?.name ||
                                "N/A"}
                            </p>
                          </div>
                        </div>
                        {bid.carrier && (
                          <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-indigo-100">
                            <div>
                              <p className="text-sm text-gray-600">Email</p>
                              <p className="font-medium text-gray-800">
                                {bid.carrier.email || "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Phone</p>
                              <p className="font-medium text-gray-800">
                                {bid.carrier.phoneNo || "N/A"}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center py-8">
                  <p className="text-gray-500 font-medium">
                    No bids received for this load
                  </p>
                </div>
              )}

              {/* CMT Users Who Bid */}
              {selectedLoad.cmtUsersWhoBid &&
                selectedLoad.cmtUsersWhoBid.length > 0 && (
                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="text-teal-600" size={20} />
                      <h3 className="text-lg font-bold text-gray-800">
                        CMT Users Who Bid ({selectedLoad.cmtUsersCount})
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {selectedLoad.cmtUsersWhoBid.map((user, index) => (
                        <div
                          key={user._id || index}
                          className="bg-white rounded-xl p-4 border border-teal-200"
                        >
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">
                                Employee ID
                              </p>
                              <p className="font-medium text-gray-800">
                                {user.empId || "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Name</p>
                              <p className="font-medium text-gray-800">
                                {user.employeeName || "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Email</p>
                              <p className="font-medium text-gray-800">
                                {user.email || "N/A"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">
                                Department
                              </p>
                              <p className="font-medium text-gray-800">
                                {user.department || "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RateRequestReport;
