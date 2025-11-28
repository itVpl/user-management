  import { useState, useEffect } from 'react';
import { Search, Plus, Power, RefreshCw, Building, Settings } from 'lucide-react';
import companyService from '../../../services/companyService';
import CompanyForm from './CompanyForm';
import CompanyDetails from './CompanyDetails';
import CompanyFeaturesModal from './CompanyFeaturesModal';

const CompanyList = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Modals
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [formMode, setFormMode] = useState('create');

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
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };
      
      if (activeFilter !== 'all') {
        filters.isActive = activeFilter === 'active';
      }
      
      const response = await companyService.getAllCompanies(filters);
      
      if (response.success) {
        setCompanies(response.companies || []);
        setPagination(response.pagination || pagination);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormMode('create');
    setSelectedCompany(null);
    setShowForm(true);
  };

  const handleEdit = (company) => {
    setFormMode('edit');
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
    if (!window.confirm('Are you sure you want to deactivate this company?')) return;
    
    try {
      const response = await companyService.deleteCompany(companyId);
      if (response.success) {
        fetchCompanies();
      }
    } catch (err) {
      alert(err.message || 'Failed to deactivate company');
    }
  };

  const handleActivate = async (companyId) => {
    try {
      const response = await companyService.activateCompany(companyId);
      if (response.success) {
        fetchCompanies();
      }
    } catch (err) {
      alert(err.message || 'Failed to activate company');
    }
  };

  const handleSetDefault = async (companyId) => {
    try {
      const response = await companyService.setDefaultCompany(companyId);
      if (response.success) {
        fetchCompanies();
      }
    } catch (err) {
      alert(err.message || 'Failed to set default company');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedCompany(null);
    fetchCompanies();
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* Stats Cards and Actions - Same Row */}
      <div className="flex items-center justify-between gap-6 mb-6">
        {/* Left Side: Stats Cards */}
        <div className="flex items-center gap-4">
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100 cursor-pointer hover:shadow-2xl transition-shadow" onClick={() => setActiveFilter('all')}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                activeFilter === 'all' ? 'bg-blue-600' : 'bg-blue-100'
              }`}>
                <Building className={activeFilter === 'all' ? 'text-white' : 'text-blue-600'} size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Companies</p>
                <p className="text-xl font-bold text-gray-800">{pagination.total || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100 cursor-pointer hover:shadow-2xl transition-shadow" onClick={() => setActiveFilter('active')}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                activeFilter === 'active' ? 'bg-green-600' : 'bg-green-100'
              }`}>
                <Power className={activeFilter === 'active' ? 'text-white' : 'text-green-600'} size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-xl font-bold text-green-600">{companies.filter(c => c.isActive).length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100 cursor-pointer hover:shadow-2xl transition-shadow" onClick={() => setActiveFilter('inactive')}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                activeFilter === 'inactive' ? 'bg-red-600' : 'bg-red-100'
              }`}>
                <Power className={activeFilter === 'inactive' ? 'text-white' : 'text-red-600'} size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Inactive</p>
                <p className="text-xl font-bold text-red-600">{companies.filter(c => !c.isActive).length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Search, Refresh, Add Company */}
        <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={fetchCompanies}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
              title="Refresh list"
            >
              <RefreshCw size={18} />
              Refresh
            </button>

            {/* Add Company Button */}
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium shadow-md"
            >
              <Plus size={18} />
              Add Company
            </button>
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
          {/* Companies Table - EXACT Same as Delivery Order */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                  <tr>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Company Name</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Company Code</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">City</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Currency</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">GST</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Status</th>
                    <th className="text-left py-3 px-3 text-gray-800 font-bold text-sm uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company, index) => (
                    <tr key={company._id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">{company.companyName}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-mono text-base font-semibold text-gray-700">{company.companyCode}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">{company.address?.city || 'N/A'}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-700">{company.baseCurrency || 'INR'}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          company.enableGST ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {company.enableGST ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          company.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {company.isActive ? 'Open' : 'Close'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleView(company)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleEdit(company)}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(company._id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => handleManageFeatures(company)}
                            className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
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

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-700">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
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
