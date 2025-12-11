import { useState, useEffect } from 'react';
import { Building } from 'lucide-react';
import companyService from '../../../services/companyService';

const CompanyForm = ({ mode = 'create', company = null, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    companyName: '',
    companyAlias: '',
    mailingName: '',
    address: {
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      country: 'India',
      pincode: ''
    },
    contact: {
      phone: '',
      mobile: '',
      email: '',
      website: '',
      fax: ''
    },
    financialYear: {
      from: '',
      to: ''
    },
    booksBeginningFrom: '',
    baseCurrency: 'INR',
    language: 'English',
    taxDetails: {
      gstin: '',
      pan: '',
      tan: '',
      cin: ''
    },
    enableGST: true,
    enableTDS: false,
    enableTCS: false,
    companyLogo: ''
  });

  useEffect(() => {
    if (mode === 'edit' && company) {
      setFormData({
        companyName: company.companyName || '',
        companyAlias: company.companyAlias || '',
        mailingName: company.mailingName || '',
        address: {
          addressLine1: company.address?.addressLine1 || '',
          addressLine2: company.address?.addressLine2 || '',
          city: company.address?.city || '',
          state: company.address?.state || '',
          country: company.address?.country || 'India',
          pincode: company.address?.pincode || ''
        },
        contact: {
          phone: company.contact?.phone || '',
          mobile: company.contact?.mobile || '',
          email: company.contact?.email || '',
          website: (() => {
            const website = company.contact?.website || '';
            if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
              return 'https://' + website;
            }
            return website;
          })(),
          fax: company.contact?.fax || ''
        },
        financialYear: {
          from: company.financialYear?.from?.split('T')[0] || '',
          to: company.financialYear?.to?.split('T')[0] || ''
        },
        booksBeginningFrom: company.booksBeginningFrom?.split('T')[0] || '',
        baseCurrency: company.baseCurrency || 'INR',
        language: company.language || 'English',
        taxDetails: {
          gstin: company.taxDetails?.gstin || '',
          pan: company.taxDetails?.pan || '',
          tan: company.taxDetails?.tan || '',
          cin: company.taxDetails?.cin || ''
        },
        enableGST: company.enableGST ?? true,
        enableTDS: company.enableTDS ?? false,
        enableTCS: company.enableTCS ?? false,
        companyLogo: company.companyLogo || ''
      });
    }
  }, [mode, company]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const keys = name.split('.');
    
    if (keys.length === 1) {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    } else if (keys.length === 2) {
      setFormData(prev => ({
        ...prev,
        [keys[0]]: {
          ...prev[keys[0]],
          [keys[1]]: value
        }
      }));
    }
  };

  const handleWebsiteChange = (e) => {
    let value = e.target.value;
    
    // If value is empty, set empty
    if (value.trim() === '') {
      setFormData(prev => ({
        ...prev,
        contact: {
          ...prev.contact,
          website: ''
        }
      }));
      return;
    }
    
    // Remove existing http:// or https:// if user types it
    value = value.replace(/^https?:\/\//, '');
    
    // Always add https:// prefix
    value = 'https://' + value;
    
    // Update the form data
    setFormData(prev => ({
      ...prev,
      contact: {
        ...prev.contact,
        website: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let response;
      if (mode === 'create') {
        response = await companyService.createCompany(formData);
      } else {
        response = await companyService.updateCompany(company._id, formData);
      }

      if (response.success) {
        onSuccess();
      }
    } catch (err) {
      setError(err.message || `Failed to ${mode} company`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-4" onClick={onClose}>
      {/* Hide scrollbar for modal content */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>
      
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto hide-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Building className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  {mode === 'create' ? 'Add Company' : 'Edit Company'}
                </h2>
                <p className="text-blue-100">
                  {mode === 'create' ? 'Create a new company' : 'Update the existing company'}
                </p>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          
          {/* Basic Information - Orange Section */}
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-orange-800 mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Alias</label>
                <input
                  type="text"
                  name="companyAlias"
                  value={formData.companyAlias}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter company alias"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mailing Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="mailingName"
                  value={formData.mailingName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter mailing name"
                />
              </div>
            </div>
          </div>

          {/* Address - Blue Section */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">Address</h3>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 1 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address.addressLine1"
                  value={formData.address.addressLine1}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter address line 1"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                <input
                  type="text"
                  name="address.addressLine2"
                  value={formData.address.addressLine2}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter address line 2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter city"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter state"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  name="address.country"
                  value={formData.address.country}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter country"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pincode <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address.pincode"
                  value={formData.address.pincode}
                  onChange={handleChange}
                  required
                  pattern="[0-9]{6}"
                  maxLength="6"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter 6-digit pincode"
                />
              </div>
            </div>
          </div>

          {/* Contact Information - Green Section */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800 mb-4">Contact Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="contact.phone"
                  value={formData.contact.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                <input
                  type="tel"
                  name="contact.mobile"
                  value={formData.contact.mobile}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter mobile number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="contact.email"
                  value={formData.contact.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none">
                    https://
                  </span>
                  <input
                    type="text"
                    name="contact.website"
                    value={formData.contact.website.replace(/^https?:\/\//, '')}
                    onChange={handleWebsiteChange}
                    className="w-full pl-20 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fax</label>
                <input
                  type="text"
                  name="contact.fax"
                  value={formData.contact.fax}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter fax number"
                />
              </div>
            </div>
          </div>

          {/* Financial Configuration - Purple Section */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-800 mb-4">Financial Configuration</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Financial Year From <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="financialYear.from"
                  value={formData.financialYear.from}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Financial Year To <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="financialYear.to"
                  value={formData.financialYear.to}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Books Beginning From <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="booksBeginningFrom"
                  value={formData.booksBeginningFrom}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Currency</label>
                <select
                  name="baseCurrency"
                  value={formData.baseCurrency}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Marathi">Marathi</option>
                  <option value="Tamil">Tamil</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tax Details - Indigo Section */}
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-indigo-800 mb-4">Company Documents</h3>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GSTIN <span className="text-gray-500 text-xs">(15 characters)</span>
                  </label>
                  <input
                    type="text"
                    name="taxDetails.gstin"
                    value={formData.taxDetails.gstin}
                    onChange={handleChange}
                    maxLength="15"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 27ABCDE1234F1Z5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PAN <span className="text-gray-500 text-xs">(10 characters)</span>
                  </label>
                  <input
                    type="text"
                    name="taxDetails.pan"
                    value={formData.taxDetails.pan}
                    onChange={handleChange}
                    maxLength="10"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., ABCDE1234F"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TAN</label>
                  <input
                    type="text"
                    name="taxDetails.tan"
                    value={formData.taxDetails.tan}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter TAN"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CIN</label>
                  <input
                    type="text"
                    name="taxDetails.cin"
                    value={formData.taxDetails.cin}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter CIN"
                  />
                </div>
              </div>
          </div>

          {/* Features - Pink Section */}
          {/* <div className="bg-pink-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-pink-800 mb-4">Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center gap-4 p-4 bg-white rounded-xl border-2 border-gray-200 cursor-pointer hover:border-pink-400 hover:shadow-md transition-all">
                  <input
                    type="checkbox"
                    name="enableGST"
                    checked={formData.enableGST}
                    onChange={handleChange}
                    className="w-5 h-5 text-pink-600 rounded focus:ring-2 focus:ring-pink-500"
                  />
                  <span className="text-sm font-semibold text-gray-800">Enable GST</span>
                </label>
                <label className="flex items-center gap-4 p-4 bg-white rounded-xl border-2 border-gray-200 cursor-pointer hover:border-pink-400 hover:shadow-md transition-all">
                  <input
                    type="checkbox"
                    name="enableTDS"
                    checked={formData.enableTDS}
                    onChange={handleChange}
                    className="w-5 h-5 text-pink-600 rounded focus:ring-2 focus:ring-pink-500"
                  />
                  <span className="text-sm font-semibold text-gray-800">Enable TDS</span>
                </label>
                <label className="flex items-center gap-4 p-4 bg-white rounded-xl border-2 border-gray-200 cursor-pointer hover:border-pink-400 hover:shadow-md transition-all">
                  <input
                    type="checkbox"
                    name="enableTCS"
                    checked={formData.enableTCS}
                    onChange={handleChange}
                    className="w-5 h-5 text-pink-600 rounded focus:ring-2 focus:ring-pink-500"
                  />
                  <span className="text-sm font-semibold text-gray-800">Enable TCS</span>
                </label>
              </div>
          </div> */}

          {/* Footer with Action Buttons */}
          <div className="flex justify-end gap-4 mt-8 pt-8 border-t-2 border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all font-semibold shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {mode === 'create' ? 'Create Company' : 'Update Company'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyForm;
