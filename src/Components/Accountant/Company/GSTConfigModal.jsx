import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import companyService from '../../../services/companyService';

const GSTConfigModal = ({ company, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    hsnSacDetails: {
      hsnSac: 'Specify Details Here',
      hsnSacCode: '',
      description: '',
      gstClassification: ''
    },
    gstRateDetails: {
      taxabilityType: 'Taxable',
      gstRate: 18,
      cgstRate: 9,
      sgstRate: 9,
      igstRate: 18,
      cessRate: 0
    },
    additionalConfig: {
      createHsnSacSummaryFor: 'All Sections',
      minimumLengthOfHsnSac: 4,
      minimumLengthBasedOn: 'Annual Turnover',
      annualTurnover: 0,
      showGSTAdvancesForAdjustments: false,
      updateGSTStatusOfVouchersAfterMasterAlteration: false,
      updateGSTStatusFrom: 'GST Reports'
    }
  });

  useEffect(() => {
    fetchGSTConfig();
  }, [company._id]);

  const fetchGSTConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await companyService.getGSTConfig(company._id);
      
      if (response.success && response.gstConfig) {
        setFormData(response.gstConfig);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch GST configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleGSTRateChange = (value) => {
    const gstRate = parseFloat(value) || 0;
    const cgstRate = gstRate / 2;
    const sgstRate = gstRate / 2;
    
    setFormData(prev => ({
      ...prev,
      gstRateDetails: {
        ...prev.gstRateDetails,
        gstRate,
        cgstRate,
        sgstRate,
        igstRate: gstRate
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      const response = await companyService.updateGSTConfig(company._id, formData);
      
      if (response.success) {
        onSuccess();
      }
    } catch (err) {
      setError(err.message || 'Failed to update GST configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold">GST Configuration</h2>
            <p className="text-orange-100 mt-1">{company.companyName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-orange-800 rounded-lg p-2 transition-colors"
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
                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {/* HSN/SAC Details */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="w-2 h-6 bg-blue-500 rounded"></div>
                    HSN/SAC Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        HSN/SAC Option
                      </label>
                      <select
                        value={formData.hsnSacDetails.hsnSac}
                        onChange={(e) => handleInputChange('hsnSacDetails', 'hsnSac', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="Not Defined">Not Defined</option>
                        <option value="Specify Details Here">Specify Details Here</option>
                        <option value="Use GST Classification">Use GST Classification</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        HSN/SAC Code
                      </label>
                      <input
                        type="text"
                        value={formData.hsnSacDetails.hsnSacCode}
                        onChange={(e) => handleInputChange('hsnSacDetails', 'hsnSacCode', e.target.value)}
                        placeholder="e.g., 8471"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">4-8 digits, numeric only</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <input
                        type="text"
                        value={formData.hsnSacDetails.description}
                        onChange={(e) => handleInputChange('hsnSacDetails', 'description', e.target.value)}
                        placeholder="e.g., Automatic data processing machines"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        GST Classification
                      </label>
                      <input
                        type="text"
                        value={formData.hsnSacDetails.gstClassification}
                        onChange={(e) => handleInputChange('hsnSacDetails', 'gstClassification', e.target.value)}
                        placeholder="e.g., Goods or Services"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* GST Rate Details */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="w-2 h-6 bg-green-500 rounded"></div>
                    GST Rate Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Taxability Type
                      </label>
                      <select
                        value={formData.gstRateDetails.taxabilityType}
                        onChange={(e) => handleInputChange('gstRateDetails', 'taxabilityType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="Not Defined">Not Defined</option>
                        <option value="Taxable">Taxable</option>
                        <option value="Exempt">Exempt</option>
                        <option value="Nil Rated">Nil Rated</option>
                        <option value="Non-GST">Non-GST</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        GST Rate (%)
                      </label>
                      <input
                        type="number"
                        value={formData.gstRateDetails.gstRate}
                        onChange={(e) => handleGSTRateChange(e.target.value)}
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">Common rates: 0, 5, 12, 18, 28</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CGST Rate (%)
                      </label>
                      <input
                        type="number"
                        value={formData.gstRateDetails.cgstRate}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SGST Rate (%)
                      </label>
                      <input
                        type="number"
                        value={formData.gstRateDetails.sgstRate}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        IGST Rate (%)
                      </label>
                      <input
                        type="number"
                        value={formData.gstRateDetails.igstRate}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CESS Rate (%)
                      </label>
                      <input
                        type="number"
                        value={formData.gstRateDetails.cessRate}
                        onChange={(e) => handleInputChange('gstRateDetails', 'cessRate', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Configuration */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="w-2 h-6 bg-purple-500 rounded"></div>
                    Additional Configuration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Create HSN/SAC Summary For
                      </label>
                      <select
                        value={formData.additionalConfig.createHsnSacSummaryFor}
                        onChange={(e) => handleInputChange('additionalConfig', 'createHsnSacSummaryFor', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="All Sections">All Sections</option>
                        <option value="Sales Only">Sales Only</option>
                        <option value="Purchase Only">Purchase Only</option>
                        <option value="None">None</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Length of HSN/SAC
                      </label>
                      <input
                        type="number"
                        value={formData.additionalConfig.minimumLengthOfHsnSac}
                        onChange={(e) => handleInputChange('additionalConfig', 'minimumLengthOfHsnSac', parseInt(e.target.value) || 4)}
                        min="4"
                        max="8"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Length Based On
                      </label>
                      <select
                        value={formData.additionalConfig.minimumLengthBasedOn}
                        onChange={(e) => handleInputChange('additionalConfig', 'minimumLengthBasedOn', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="Annual Turnover">Annual Turnover</option>
                        <option value="Fixed">Fixed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Annual Turnover (₹)
                      </label>
                      <input
                        type="number"
                        value={formData.additionalConfig.annualTurnover}
                        onChange={(e) => handleInputChange('additionalConfig', 'annualTurnover', parseFloat(e.target.value) || 0)}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.additionalConfig.showGSTAdvancesForAdjustments}
                          onChange={(e) => handleInputChange('additionalConfig', 'showGSTAdvancesForAdjustments', e.target.checked)}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">Show GST Advances for Adjustments</span>
                      </label>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.additionalConfig.updateGSTStatusOfVouchersAfterMasterAlteration}
                          onChange={(e) => handleInputChange('additionalConfig', 'updateGSTStatusOfVouchersAfterMasterAlteration', e.target.checked)}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">Update GST Status of Vouchers After Master Alteration</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Update GST Status From
                      </label>
                      <select
                        value={formData.additionalConfig.updateGSTStatusFrom}
                        onChange={(e) => handleInputChange('additionalConfig', 'updateGSTStatusFrom', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="GST Reports">GST Reports</option>
                        <option value="Master Alteration">Master Alteration</option>
                      </select>
                    </div>
                  </div>
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
            className="px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GSTConfigModal;
