import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Building,
  Search,
  Plus,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  User,
  Globe,
  CreditCard,
} from "lucide-react";
import API_CONFIG from "../../config/api.js";
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.css";

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
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter((option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
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
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        className={`w-full px-4 py-3 border rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent cursor-pointer ${
          hasError ? "border-red-500 bg-red-50" : "border-gray-300"
        } ${
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
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
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
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
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

export default function SubCompanies() {
  const [subCompanies, setSubCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);

  // Form data
  const [formData, setFormData] = useState({
    companyName: "",
    companyAlias: "",
    description: "",
    address: {
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      country: "",
      pincode: "",
    },
    contact: {
      phone: "",
      mobile: "",
      email: "",
      website: "",
      fax: "",
    },
    taxDetails: {
      gstin: "",
      pan: "",
      tan: "",
      cin: "",
    },
    management: {
      ceo: "",
      director: "",
      contactPerson: "",
      contactPersonPhone: "",
      contactPersonEmail: "",
    },
    establishedDate: "",
    registrationNumber: "",
  });

  const [formErrors, setFormErrors] = useState({});

  // Fetch all sub-companies
  const fetchSubCompanies = async () => {
    try {
      setLoading(true);
      const token =
        sessionStorage.getItem("authToken") ||
        localStorage.getItem("authToken");
      const headers = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const params = {
        page: currentPage,
        limit: limit,
      };

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response = await axios.get(`${API_CONFIG.BASE_URL}/api/v1/sub-company`, {
        headers,
        params,
      });

      if (response.data && response.data.success) {
        setSubCompanies(response.data.subCompanies || []);
        setTotalPages(response.data.totalPages || 1);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error("Error fetching sub-companies:", error);
      alertify.error("Failed to fetch sub-companies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubCompanies();
  }, [currentPage, searchTerm]);

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!formData.companyName.trim()) {
      errors.companyName = "Company name is required";
    }
    if (!formData.companyAlias.trim()) {
      errors.companyAlias = "Company alias is required";
    }
    if (!formData.address.city.trim()) {
      errors["address.city"] = "City is required";
    }
    if (!formData.address.state.trim()) {
      errors["address.state"] = "State is required";
    }
    if (!formData.contact.email.trim()) {
      errors["contact.email"] = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact.email)) {
      errors["contact.email"] = "Invalid email format";
    }
    if (!formData.taxDetails.gstin.trim()) {
      errors["taxDetails.gstin"] = "GSTIN is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      alertify.error("Please fill all required fields");
      return;
    }

    try {
      setSubmitting(true);
      const token =
        sessionStorage.getItem("authToken") ||
        localStorage.getItem("authToken");
      const headers = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      if (showEditModal && selectedCompany) {
        // Update
        await axios.patch(
          `${API_CONFIG.BASE_URL}/api/v1/sub-company/${selectedCompany._id}`,
          formData,
          { headers }
        );
        alertify.success("Sub-company updated successfully");
      } else {
        // Create
        await axios.post(
          `${API_CONFIG.BASE_URL}/api/v1/sub-company`,
          formData,
          { headers }
        );
        alertify.success("Sub-company created successfully");
      }

      handleCloseModal();
      fetchSubCompanies();
    } catch (error) {
      console.error("Error saving sub-company:", error);
      alertify.error(
        error.response?.data?.message || "Failed to save sub-company"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Handle activate/deactivate
  const handleStatusChange = async (companyId, action) => {
    try {
      const token =
        sessionStorage.getItem("authToken") ||
        localStorage.getItem("authToken");
      const headers = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      await axios.patch(
        `${API_CONFIG.BASE_URL}/api/v1/sub-company/${companyId}/${action}`,
        {},
        { headers }
      );

      alertify.success(
        `Sub-company ${action === "activate" ? "activated" : "deactivated"} successfully`
      );
      fetchSubCompanies();
    } catch (error) {
      console.error(`Error ${action}ing sub-company:`, error);
      alertify.error(`Failed to ${action} sub-company`);
    }
  };

  // Handle view
  const handleView = async (company) => {
    try {
      const token =
        sessionStorage.getItem("authToken") ||
        localStorage.getItem("authToken");
      const headers = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/sub-company/${company._id}`,
        { headers }
      );

      if (response.data && response.data.success) {
        setSelectedCompany(response.data.subCompany);
        setShowViewModal(true);
      }
    } catch (error) {
      console.error("Error fetching sub-company details:", error);
      alertify.error("Failed to fetch sub-company details");
    }
  };

  // Handle edit
  const handleEdit = (company) => {
    setSelectedCompany(company);
    setFormData({
      companyName: company.companyName || "",
      companyAlias: company.companyAlias || "",
      description: company.description || "",
      address: {
        addressLine1: company.address?.addressLine1 || "",
        addressLine2: company.address?.addressLine2 || "",
        city: company.address?.city || "",
        state: company.address?.state || "",
        country: company.address?.country || "",
        pincode: company.address?.pincode || "",
      },
      contact: {
        phone: company.contact?.phone || "",
        mobile: company.contact?.mobile || "",
        email: company.contact?.email || "",
        website: company.contact?.website || "",
        fax: company.contact?.fax || "",
      },
      taxDetails: {
        gstin: company.taxDetails?.gstin || "",
        pan: company.taxDetails?.pan || "",
        tan: company.taxDetails?.tan || "",
        cin: company.taxDetails?.cin || "",
      },
      management: {
        ceo: company.management?.ceo || "",
        director: company.management?.director || "",
        contactPerson: company.management?.contactPerson || "",
        contactPersonPhone: company.management?.contactPersonPhone || "",
        contactPersonEmail: company.management?.contactPersonEmail || "",
      },
      establishedDate: company.establishedDate
        ? new Date(company.establishedDate).toISOString().split("T")[0]
        : "",
      registrationNumber: company.registrationNumber || "",
    });
    setShowEditModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowViewModal(false);
    setSelectedCompany(null);
    setFormData({
      companyName: "",
      companyAlias: "",
      description: "",
      address: {
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        country: "",
        pincode: "",
      },
      contact: {
        phone: "",
        mobile: "",
        email: "",
        website: "",
        fax: "",
      },
      taxDetails: {
        gstin: "",
        pan: "",
        tan: "",
        cin: "",
      },
      management: {
        ceo: "",
        director: "",
        contactPerson: "",
        contactPersonPhone: "",
        contactPersonEmail: "",
      },
      establishedDate: "",
      registrationNumber: "",
    });
    setFormErrors({});
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Use companies directly from API (already paginated)
  const currentCompanies = subCompanies;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Sub Companies</h2>
            <p className="text-gray-500 text-sm mt-1">
              Manage sub-companies and their details
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus size={20} />
            Add Sub Company
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by company name, alias, or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 mt-4">Loading sub-companies...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-spacing-0">
              <thead>
                <tr className="bg-[#F1F4F9]">
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base rounded-l-2xl">
                    Company Code
                  </th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">
                    Company Name
                  </th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">
                    Alias
                  </th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">
                    Email
                  </th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">
                    City
                  </th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base">
                    Status
                  </th>
                  <th className="text-left py-4 px-4 text-gray-800 font-medium text-base rounded-r-2xl">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentCompanies.map((company) => (
                  <tr
                    key={company._id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-4 align-middle">
                      <span className="text-gray-600 text-sm font-medium">
                        {company.companyCode || "N/A"}
                      </span>
                    </td>
                    <td className="py-4 px-4 align-middle">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 text-sm">
                          {company.companyName || "N/A"}
                        </span>
                        {company.description && (
                          <span className="text-gray-400 text-xs mt-0.5">
                            {company.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 align-middle">
                      <span className="text-gray-600 text-sm">
                        {company.companyAlias || "N/A"}
                      </span>
                    </td>
                    <td className="py-4 px-4 align-middle">
                      <span className="text-gray-600 text-sm">
                        {company.contact?.email || "N/A"}
                      </span>
                    </td>
                    <td className="py-4 px-4 align-middle">
                      <span className="text-gray-600 text-sm">
                        {company.address?.city || "N/A"}
                      </span>
                    </td>
                    <td className="py-4 px-4 align-middle">
                      <div
                        className={`inline-block px-4 py-1.5 rounded-md text-sm font-medium text-center min-w-[100px] whitespace-nowrap ${
                          company.isActive && company.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {company.isActive && company.status === "active"
                          ? "Active"
                          : "Inactive"}
                      </div>
                    </td>
                    <td className="py-4 px-4 align-middle">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(company)}
                          className="px-3 py-1 border border-blue-500 text-blue-500 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors flex items-center gap-1"
                        >
                          <Eye size={12} />
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(company)}
                          className="px-3 py-1 border border-green-500 text-green-500 rounded-md text-sm font-medium hover:bg-green-50 transition-colors"
                        >
                          Edit
                        </button>
                        {company.isActive && company.status === "active" ? (
                          <button
                            onClick={() =>
                              handleStatusChange(company._id, "deactivate")
                            }
                            className="px-3 py-1 border border-red-500 text-red-500 rounded-md text-sm font-medium hover:bg-red-50 transition-colors"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleStatusChange(company._id, "activate")
                            }
                            className="px-3 py-1 border border-green-500 text-green-500 rounded-md text-sm font-medium hover:bg-green-50 transition-colors"
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {currentCompanies.length === 0 && !loading && (
          <div className="text-center py-12">
            <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {searchTerm
                ? "No sub-companies found matching your search"
                : "No sub-companies found"}
            </p>
            <p className="text-gray-400 text-sm">
              {searchTerm
                ? "Try adjusting your search terms"
                : "Create your first sub-company to get started"}
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && currentCompanies.length > 0 && (
          <div className="flex justify-between items-center p-2 mt-4">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, total)} of {total} sub-companies
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium focus:outline-none"
              >
                <ChevronLeft size={16} /> Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none ${
                    currentPage === page
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium focus:outline-none"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4">
          <style>{`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
          `}</style>

          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto hide-scrollbar">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Building className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      {showEditModal ? "Edit Sub Company" : "Add Sub Company"}
                    </h2>
                    <p className="text-blue-100">
                      {showEditModal
                        ? "Update sub-company information"
                        : "Create a new sub-company"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.companyName
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="Company Name"
                    />
                    {formErrors.companyName && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors.companyName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Alias <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="companyAlias"
                      value={formData.companyAlias}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.companyAlias
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="Company Alias"
                    />
                    {formErrors.companyAlias && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors.companyAlias}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Established Date
                    </label>
                    <input
                      type="date"
                      name="establishedDate"
                      value={formData.establishedDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Registration Number
                    </label>
                    <input
                      type="text"
                      name="registrationNumber"
                      value={formData.registrationNumber}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Registration Number"
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Address Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address Line 1
                    </label>
                    <input
                      type="text"
                      name="address.addressLine1"
                      value={formData.address.addressLine1}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Address Line 1"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      name="address.addressLine2"
                      value={formData.address.addressLine2}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Address Line 2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="address.city"
                      value={formData.address.city}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors["address.city"]
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="City"
                    />
                    {formErrors["address.city"] && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors["address.city"]}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="address.state"
                      value={formData.address.state}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors["address.state"]
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="State"
                    />
                    {formErrors["address.state"] && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors["address.state"]}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      name="address.country"
                      value={formData.address.country}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Country"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pincode
                    </label>
                    <input
                      type="text"
                      name="address.pincode"
                      value={formData.address.pincode}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Pincode"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="contact.phone"
                      value={formData.contact.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Phone"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mobile
                    </label>
                    <input
                      type="tel"
                      name="contact.mobile"
                      value={formData.contact.mobile}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Mobile"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="contact.email"
                      value={formData.contact.email}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors["contact.email"]
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="Email"
                    />
                    {formErrors["contact.email"] && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors["contact.email"]}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      name="contact.website"
                      value={formData.contact.website}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="www.example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fax
                    </label>
                    <input
                      type="text"
                      name="contact.fax"
                      value={formData.contact.fax}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Fax"
                    />
                  </div>
                </div>
              </div>

              {/* Tax Details */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Tax Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GSTIN <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="taxDetails.gstin"
                      value={formData.taxDetails.gstin}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors["taxDetails.gstin"]
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="GSTIN"
                    />
                    {formErrors["taxDetails.gstin"] && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors["taxDetails.gstin"]}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PAN
                    </label>
                    <input
                      type="text"
                      name="taxDetails.pan"
                      value={formData.taxDetails.pan}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="PAN"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      TAN
                    </label>
                    <input
                      type="text"
                      name="taxDetails.tan"
                      value={formData.taxDetails.tan}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="TAN"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CIN
                    </label>
                    <input
                      type="text"
                      name="taxDetails.cin"
                      value={formData.taxDetails.cin}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="CIN"
                    />
                  </div>
                </div>
              </div>

              {/* Management Information */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Management Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CEO
                    </label>
                    <input
                      type="text"
                      name="management.ceo"
                      value={formData.management.ceo}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="CEO Name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Director
                    </label>
                    <input
                      type="text"
                      name="management.director"
                      value={formData.management.director}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Director Name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      name="management.contactPerson"
                      value={formData.management.contactPerson}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Contact Person Name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Person Phone
                    </label>
                    <input
                      type="tel"
                      name="management.contactPersonPhone"
                      value={formData.management.contactPersonPhone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Contact Person Phone"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Person Email
                    </label>
                    <input
                      type="email"
                      name="management.contactPersonEmail"
                      value={formData.management.contactPersonEmail}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Contact Person Email"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? "Saving..."
                    : showEditModal
                    ? "Update"
                    : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedCompany && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Eye className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Sub Company Details</h2>
                    <p className="text-blue-100">{selectedCompany.companyName}</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-white hover:text-gray-200 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Building size={20} />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Company Code</p>
                    <p className="text-gray-900 font-medium">
                      {selectedCompany.companyCode || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Company Name</p>
                    <p className="text-gray-900 font-medium">
                      {selectedCompany.companyName || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Company Alias</p>
                    <p className="text-gray-900 font-medium">
                      {selectedCompany.companyAlias || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span
                      className={`inline-block px-3 py-1 rounded-md text-sm font-medium ${
                        selectedCompany.isActive && selectedCompany.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {selectedCompany.isActive && selectedCompany.status === "active"
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </div>
                  {selectedCompany.description && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500">Description</p>
                      <p className="text-gray-900">{selectedCompany.description}</p>
                    </div>
                  )}
                  {selectedCompany.establishedDate && (
                    <div>
                      <p className="text-sm text-gray-500">Established Date</p>
                      <p className="text-gray-900 font-medium">
                        {formatDate(selectedCompany.establishedDate)}
                      </p>
                    </div>
                  )}
                  {selectedCompany.registrationNumber && (
                    <div>
                      <p className="text-sm text-gray-500">Registration Number</p>
                      <p className="text-gray-900 font-medium">
                        {selectedCompany.registrationNumber}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Address Information */}
              {selectedCompany.address && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <MapPin size={20} />
                    Address Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCompany.address.addressLine1 && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500">Address Line 1</p>
                        <p className="text-gray-900">
                          {selectedCompany.address.addressLine1}
                        </p>
                      </div>
                    )}
                    {selectedCompany.address.addressLine2 && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500">Address Line 2</p>
                        <p className="text-gray-900">
                          {selectedCompany.address.addressLine2}
                        </p>
                      </div>
                    )}
                    {selectedCompany.address.city && (
                      <div>
                        <p className="text-sm text-gray-500">City</p>
                        <p className="text-gray-900 font-medium">
                          {selectedCompany.address.city}
                        </p>
                      </div>
                    )}
                    {selectedCompany.address.state && (
                      <div>
                        <p className="text-sm text-gray-500">State</p>
                        <p className="text-gray-900 font-medium">
                          {selectedCompany.address.state}
                        </p>
                      </div>
                    )}
                    {selectedCompany.address.country && (
                      <div>
                        <p className="text-sm text-gray-500">Country</p>
                        <p className="text-gray-900 font-medium">
                          {selectedCompany.address.country}
                        </p>
                      </div>
                    )}
                    {selectedCompany.address.pincode && (
                      <div>
                        <p className="text-sm text-gray-500">Pincode</p>
                        <p className="text-gray-900 font-medium">
                          {selectedCompany.address.pincode}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Contact Information */}
              {selectedCompany.contact && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Phone size={20} />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCompany.contact.phone && (
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="text-gray-900 font-medium">
                          {selectedCompany.contact.phone}
                        </p>
                      </div>
                    )}
                    {selectedCompany.contact.mobile && (
                      <div>
                        <p className="text-sm text-gray-500">Mobile</p>
                        <p className="text-gray-900 font-medium">
                          {selectedCompany.contact.mobile}
                        </p>
                      </div>
                    )}
                    {selectedCompany.contact.email && (
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="text-gray-900 font-medium">
                          {selectedCompany.contact.email}
                        </p>
                      </div>
                    )}
                    {selectedCompany.contact.website && (
                      <div>
                        <p className="text-sm text-gray-500">Website</p>
                        <p className="text-gray-900 font-medium">
                          {selectedCompany.contact.website}
                        </p>
                      </div>
                    )}
                    {selectedCompany.contact.fax && (
                      <div>
                        <p className="text-sm text-gray-500">Fax</p>
                        <p className="text-gray-900 font-medium">
                          {selectedCompany.contact.fax}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tax Details */}
              {selectedCompany.taxDetails && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <CreditCard size={20} />
                    Tax Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCompany.taxDetails.gstin && (
                      <div>
                        <p className="text-sm text-gray-500">GSTIN</p>
                        <p className="text-gray-900 font-medium">
                          {selectedCompany.taxDetails.gstin}
                        </p>
                      </div>
                    )}
                    {selectedCompany.taxDetails.pan && (
                      <div>
                        <p className="text-sm text-gray-500">PAN</p>
                        <p className="text-gray-900 font-medium">
                          {selectedCompany.taxDetails.pan}
                        </p>
                      </div>
                    )}
                    {selectedCompany.taxDetails.tan && (
                      <div>
                        <p className="text-sm text-gray-500">TAN</p>
                        <p className="text-gray-900 font-medium">
                          {selectedCompany.taxDetails.tan}
                        </p>
                      </div>
                    )}
                    {selectedCompany.taxDetails.cin && (
                      <div>
                        <p className="text-sm text-gray-500">CIN</p>
                        <p className="text-gray-900 font-medium">
                          {selectedCompany.taxDetails.cin}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Management Information */}
              {selectedCompany.management && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <User size={20} />
                    Management Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCompany.management.ceo && (
                      <div>
                        <p className="text-sm text-gray-500">CEO</p>
                        <p className="text-gray-900 font-medium">
                          {selectedCompany.management.ceo}
                        </p>
                      </div>
                    )}
                    {selectedCompany.management.director && (
                      <div>
                        <p className="text-sm text-gray-500">Director</p>
                        <p className="text-gray-900 font-medium">
                          {selectedCompany.management.director}
                        </p>
                      </div>
                    )}
                    {selectedCompany.management.contactPerson && (
                      <div>
                        <p className="text-sm text-gray-500">Contact Person</p>
                        <p className="text-gray-900 font-medium">
                          {selectedCompany.management.contactPerson}
                        </p>
                      </div>
                    )}
                    {selectedCompany.management.contactPersonPhone && (
                      <div>
                        <p className="text-sm text-gray-500">Contact Person Phone</p>
                        <p className="text-gray-900 font-medium">
                          {selectedCompany.management.contactPersonPhone}
                        </p>
                      </div>
                    )}
                    {selectedCompany.management.contactPersonEmail && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500">Contact Person Email</p>
                        <p className="text-gray-900 font-medium">
                          {selectedCompany.management.contactPersonEmail}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Created By */}
              {selectedCompany.createdBy && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <User size={20} />
                    Created Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Created By</p>
                      <p className="text-gray-900 font-medium">
                        {selectedCompany.createdBy.employeeName || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Employee ID</p>
                      <p className="text-gray-900 font-medium">
                        {selectedCompany.createdBy.empId || "N/A"}
                      </p>
                    </div>
                    {selectedCompany.createdAt && (
                      <div>
                        <p className="text-sm text-gray-500">Created At</p>
                        <p className="text-gray-900 font-medium">
                          {formatDate(selectedCompany.createdAt)}
                        </p>
                      </div>
                    )}
                    {selectedCompany.updatedAt && (
                      <div>
                        <p className="text-sm text-gray-500">Updated At</p>
                        <p className="text-gray-900 font-medium">
                          {formatDate(selectedCompany.updatedAt)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                <button
                  onClick={handleCloseModal}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleCloseModal();
                    handleEdit(selectedCompany);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

