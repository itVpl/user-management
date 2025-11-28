import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import companyService from '../../../services/companyService';

const TDSConfigModal = ({ company, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    tdsDeductorDetails: {
      tanRegistrationNumber: '',
      taxDeductionAccountNumber: '',
      deductorType: 'Company',
      deductorBranchDivision: '',
      salariesDetailsIfPersonResponsible: 'No'
    },
    rateExemptionDetails: {
      ignoreITExemptionLimitForTDSDeduction: false,
      activateTDSForStockItems: false
    }
  });

  useEffect(() => {
    fetchTDSConfig();
  }, [company._id]);

  const fetchTDSConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await companyService.getTDSConfig(company._id);
      if (response.success && response.tdsConfig) {
        setFormData(response.tdsConfig);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch TDS configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      const response = await companyService.updateTDSConfig(company._id, formData);
      if (response.success) {
        onSuccess();
      }
    } catch (err) {
      setError(err.message || 'Failed to update TDS configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold">TDS Configuration</h2>
            <p className="text-indigo-100 mt-1">{company.companyName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-indigo-800 rounded-lg p-2 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {/* Basic Details */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="w-2 h-6 bg-blue-500 rounded"></div>
                    Basic Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        TAN Registration Number
                      </label>
                      <input
                        type="text"
                        value={formData.tdsDeductorDetails.tanRegistrationNumber}
                        onChange={(e) => handleInputChange('tdsDeductorDetails', 'tanRegistrationNumber', e.target.value.toUpperCase())}
                        placeholder="e.g., ABCD12345E"
                        maxLength={10}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
                      />
                      <p className="text-xs text-gray-500 mt-1">Format: 4 letters + 5 digits + 1 letter</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tax Deduction Account Number
                      </label>
                      <input
                        type="text"
                        value={formData.tdsDeductorDetails.taxDeductionAccountNumber}
                        onChange={(e) => handleInputChange('tdsDeductorDetails', 'taxDeductionAccountNumber', e.target.value)}
                        placeholder="e.g., TAN123456"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Deductor Details */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="w-2 h-6 bg-green-500 rounded"></div>
                    Deductor Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Deductor Type
                      </label>
                      <select
                        value={formData.tdsDeductorDetails.deductorType}
                        onChange={(e) => handleInputChange('tdsDeductorDetails', 'deductorType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="Company">Company</option>
                        <option value="Individual/HUF">Individual/HUF</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Deductor Branch/Division
                      </label>
                      <input
                        type="text"
                        value={formData.tdsDeductorDetails.deductorBranchDivision}
                        onChange={(e) => handleInputChange('tdsDeductorDetails', 'deductorBranchDivision', e.target.value)}
                        placeholder="e.g., Head Office"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Salaries Details */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="w-2 h-6 bg-purple-500 rounded"></div>
                    Salaries Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Salaries Details If Person Responsible
                      </label>
                      <select
                        value={formData.tdsDeductorDetails.salariesDetailsIfPersonResponsible}
                        onChange={(e) => handleInputChange('tdsDeductorDetails', 'salariesDetailsIfPersonResponsible', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Select if person is responsible for salary details</p>
                    </div>
                  </div>
                </div>

                {/* Rate & Exemption Details */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="w-2 h-6 bg-orange-500 rounded"></div>
                    Rate & Exemption Details
                  </h3>
                  <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={formData.rateExemptionDetails.ignoreITExemptionLimitForTDSDeduction}
                        onChange={(e) => handleInputChange('rateExemptionDetails', 'ignoreITExemptionLimitForTDSDeduction', e.target.checked)}
                        className="w-4 h-4 mt-1 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">
                          Ignore IT exemption limit for TDS deduction
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          When enabled, TDS will be deducted regardless of exemption limits
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={formData.rateExemptionDetails.activateTDSForStockItems}
                        onChange={(e) => handleInputChange('rateExemptionDetails', 'activateTDSForStockItems', e.target.checked)}
                        className="w-4 h-4 mt-1 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">
                          Activate TDS for stock items
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          Enable TDS deduction on stock item transactions
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Important Information</h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>TAN format: 4 uppercase letters + 5 digits + 1 uppercase letter (e.g., ABCD12345E)</li>
                    <li>TAN is mandatory for TDS compliance and reporting</li>
                    <li>Ensure all details match with your Income Tax Department records</li>
                    <li>Deductor type should match your organization type</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || loading}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TDSConfigModal;
