import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Power,
  RefreshCw,
  Building,
  Settings,
} from "lucide-react";
import companyService from "../../../services/companyService";
import CompanyForm from "./CompanyForm";
import CompanyDetails from "./CompanyDetails";
import CompanyFeaturesModal from "./CompanyFeaturesModal";

const CompanyList = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 7,
    total: 0,
    pages: 0,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [formMode, setFormMode] = useState("create");

  useEffect(() => {
    fetchCompanies();
  }, [pagination.page, searchTerm, activeFilter]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        sortBy: "createdAt",
        sortOrder: "desc",
      };

      if (activeFilter !== "all") {
        filters.isActive = activeFilter === "active";
      }

      const response = await companyService.getAllCompanies(filters);

      if (response.success) {
        setCompanies(response.companies || []);
        setPagination(response.pagination || pagination);
      }
    } catch (err) {
      setError(err.message || "Failed to fetch companies");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormMode("create");
    setSelectedCompany(null);
    setShowForm(true);
  };

  const handleEdit = (company) => {
    setFormMode("edit");
    setSelectedCompany(company);
    setShowForm(true);
  };

  const handleView = (company) => {
    setSelectedCompany(company);
    setShowDetails(true);
  };

  const handleManageFeatures = (company) => {
    setSelectedCompany(company);
    setShowFeatures(true);
  };

  const handleDelete = async (companyId) => {
    if (!window.confirm("Are you sure you want to deactivate this company?"))
      return;

    try {
      const response = await companyService.deleteCompany(companyId);
      if (response.success) {
        fetchCompanies();
      }
    } catch (err) {
      alert(err.message || "Failed to deactivate company");
    }
  };

  const handleActivate = async (companyId) => {
    try {
      const response = await companyService.activateCompany(companyId);
      if (response.success) {
        fetchCompanies();
      }
    } catch (err) {
      alert(err.message || "Failed to activate company");
    }
  };

  const handleSetDefault = async (companyId) => {
    try {
      const response = await companyService.setDefaultCompany(companyId);
      if (response.success) {
        fetchCompanies();
      }
    } catch (err) {
      alert(err.message || "Failed to set default company");
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedCompany(null);
    fetchCompanies();
  };

  const getPaginationPages = () => {
    const total = pagination.pages || 1;
    const current = pagination.page || 1;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [];
    if (current > 3) pages.push(1, "ellipsis");
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push("ellipsis", total);
    return pages;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6 bg-white rounded-2xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className="relative bg-white rounded-xl p-4 border border-gray-200 hover:bg-blue-50 transition-colors cursor-pointer text-left h-[84px] flex items-center gap-4"
          >
            <div
              className={`w-10 h-10 rounded-full text-2xl flex items-center justify-center ${activeFilter === "all" ? "bg-blue-100 text-gray-800" : "bg-blue-50 text-gray-700"} font-bold`}
            >
              {pagination.total || 0}
            </div>
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-700 font-medium text-lg">
              Total Companies
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("active")}
            className="relative bg-white rounded-xl p-4 border border-gray-200 hover:bg-blue-50 transition-colors cursor-pointer text-left h-[84px] flex items-center gap-4"
          >
            <div
              className={`w-10 h-10 rounded-full text-2xl flex items-center justify-center ${activeFilter === "active" ? "bg-green-100 text-gray-800" : "bg-green-50 text-gray-700"} font-bold`}
            >
              {companies.filter((c) => c.isActive).length}
            </div>
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-700 font-medium text-lg">
              Active
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("inactive")}
            className="relative bg-white rounded-xl p-4 border border-gray-200 hover:bg-blue-50 transition-colors cursor-pointer text-left h-[84px] flex items-center gap-4"
          >
            <div
              className={`w-10 h-10 rounded-full text-2xl flex items-center justify-center ${activeFilter === "inactive" ? "bg-purple-100 text-gray-800" : "bg-purple-50 text-gray-700"} font-bold`}
            >
              {companies.filter((c) => !c.isActive).length}
            </div>
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-700 font-medium text-lg">
              Inactive
            </span>
          </button>
        </div>
        <div className="flex items-stretch gap-3 mt-4 justify-between">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 text-gray-700 placeholder-gray-400"
            />
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchCompanies}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors font-medium cursor-pointer"
              title="Refresh list"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium cursor-pointer"
            >
              <Plus size={18} />
              Add Company
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto px-4 md:px-6">
              <table className="w-full border-separate border-spacing-y-4">
                <thead>
                  <tr>
                    <th className="text-left py-3 px-4 text-gray-700 font-medium text-base bg-gray-100 border-y border-gray-200 first:rounded-l-xl last:rounded-r-xl first:border-l">
                      Company Name
                    </th>
                    <th className="text-left py-3 px-4 text-gray-700 font-medium text-base bg-gray-100 border-y border-gray-200">
                      Company Code
                    </th>
                    <th className="text-left py-3 px-4 text-gray-700 font-medium text-base bg-gray-100 border-y border-gray-200">
                      City
                    </th>
                    <th className="text-left py-3 px-4 text-gray-700 font-medium text-base bg-gray-100 border-y border-gray-200">
                      Currency
                    </th>
                    <th className="text-left py-3 px-4 text-gray-700 font-medium text-base bg-gray-100 border-y border-gray-200">
                      GST
                    </th>
                    <th className="text-left py-3 px-4 text-gray-700 font-medium text-base bg-gray-100 border-y border-gray-200">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-gray-700 font-medium text-base bg-gray-100 border-y border-gray-200 last:rounded-r-xl last:border-r">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <tr key={company._id}>
                      <td className="py-3 px-4 bg-white border-y border-gray-200 first:rounded-l-xl first:border-l">
                        <span className="font-medium text-gray-700">
                          {company.companyName}
                        </span>
                      </td>
                      <td className="py-3 px-4 bg-white border-y border-gray-200">
                        <span className="font-medium text-gray-700">
                          {company.companyCode}
                        </span>
                      </td>
                      <td className="py-3 px-4 bg-white border-y border-gray-200">
                        <span className="font-medium text-gray-700">
                          {company.address?.city || "N/A"}
                        </span>
                      </td>
                      <td className="py-3 px-4 bg-white border-y border-gray-200">
                        <span className="font-medium text-gray-700">
                          {company.baseCurrency || "INR"}
                        </span>
                      </td>
                      <td className="py-3 px-4 bg-white border-y border-gray-200">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                            company.enableGST
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {company.enableGST ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                      <td className="py-3 px-4 bg-white border-y border-gray-200">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                            company.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {company.isActive ? "Open" : "Close"}
                        </span>
                      </td>
                      <td className="py-3 px-4 bg-white border-y border-gray-200 last:rounded-r-xl last:border-r">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => handleView(company)}
                            className="px-3 py-1.5 rounded-lg text-base font-medium border border-blue-600 text-blue-600 bg-transparent hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleEdit(company)}
                            className="px-3 py-1.5 rounded-lg text-base font-medium border border-green-600 text-green-600 bg-transparent hover:bg-green-600 hover:text-white transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(company._id)}
                            className="px-3 py-1.5 rounded-lg text-base font-medium border border-red-600 text-red-600 bg-transparent hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => handleManageFeatures(company)}
                            className="px-3 py-1.5 rounded-lg text-base font-medium border border-purple-600 text-purple-600 bg-transparent hover:bg-purple-600 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                            title="Manage Features"
                          >
                            <Settings size={14} />
                            Features
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Empty State */}
          {companies.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-gray-500 mb-4">No companies found</p>
              <button
                onClick={handleCreate}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={18} />
                Create Your First Company
              </button>
            </div>
          )}

          {pagination.pages > 0 && (
            <div className="flex flex-wrap justify-between items-center gap-4 mt-6 bg-white rounded-2xl border border-gray-200 p-4">
              <div className="text-sm text-gray-600">
                {(() => {
                  const hasRows = companies.length > 0;
                  const start = hasRows
                    ? (pagination.page - 1) * pagination.limit + 1
                    : 0;
                  const total = pagination.total ?? companies.length ?? 0;
                  const end = hasRows
                    ? Math.min(pagination.page * pagination.limit, total)
                    : 0;
                  return `Showing ${start} to ${end} of ${total} companies (Page ${pagination.page} of ${pagination.pages || 1})`;
                })()}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setPagination({ ...pagination, page: pagination.page - 1 })
                  }
                  disabled={pagination.page === 1}
                  className="px-4 h-9 rounded-lg text-black-500 hover:text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  {getPaginationPages().map((p, i) =>
                    p === "ellipsis" ? (
                      <span
                        key={`ellipsis-${i}`}
                        className="px-2 text-gray-400"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() =>
                          setPagination({ ...pagination, page: p })
                        }
                        className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                          pagination.page === p
                            ? "border border-black text-black bg-white"
                            : "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    ),
                  )}
                </div>
                <button
                  onClick={() =>
                    setPagination({ ...pagination, page: pagination.page + 1 })
                  }
                  disabled={pagination.page === pagination.pages}
                  className="px-4 h-9 rounded-lg text-black-500 hover:text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showForm && (
        <CompanyForm
          mode={formMode}
          company={selectedCompany}
          onClose={() => {
            setShowForm(false);
            setSelectedCompany(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {showDetails && selectedCompany && (
        <CompanyDetails
          company={selectedCompany}
          onClose={() => {
            setShowDetails(false);
            setSelectedCompany(null);
          }}
          onEdit={() => {
            setShowDetails(false);
            handleEdit(selectedCompany);
          }}
        />
      )}

      {showFeatures && selectedCompany && (
        <CompanyFeaturesModal
          company={selectedCompany}
          onClose={() => {
            setShowFeatures(false);
            setSelectedCompany(null);
          }}
          onSuccess={() => {
            setShowFeatures(false);
            setSelectedCompany(null);
            fetchCompanies();
          }}
        />
      )}
    </div>
  );
};

export default CompanyList;
