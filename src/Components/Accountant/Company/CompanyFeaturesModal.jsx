import { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import companyService from '../../../services/companyService';
import GSTConfigModal from './GSTConfigModal';
import TDSConfigModal from './TDSConfigModal';

const CompanyFeaturesModal = ({ company, onClose, onSuccess }) => {
  const [features, setFeatures] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showGSTConfig, setShowGSTConfig] = useState(false);
  const [showTDSConfig, setShowTDSConfig] = useState(false);

  useEffect(() => {
    fetchFeatures();
  }, [company._id]);

  const fetchFeatures = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await companyService.getCompanyFeatures(company._id);
      
      if (response.success) {
        setFeatures(response.features);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch company features');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFeature = async (featureName, currentValue) => {
    try {
      setSaving(true);
      setError(null);
      
      const response = currentValue 
        ? await companyService.disableFeature(company._id, featureName)
        : await companyService.enableFeature(company._id, featureName);
      
      if (response.success) {
        setFeatures(response.features);
        
        // If enabling GST or setAlterCompanyGSTRateAndDetails, open GST config modal
        if (!currentValue && (featureName === 'enableGST' || featureName === 'setAlterCompanyGSTRateAndDetails')) {
          setShowGSTConfig(true);
        }
        
        // If enabling TDS, open TDS config modal
        if (!currentValue && featureName === 'enableTDS') {
          setShowTDSConfig(true);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to update feature');
    } finally {
      setSaving(false);
    }
  };

  const featureGroups = {
    accounting: [
      { name: 'maintainAccounts', label: 'Maintain Accounts', description: 'Enable account management and ledger entries' },
      { name: 'enableBillWiseEntry', label: 'Enable Bill-wise Entry', description: 'Track outstanding bills and payments' }
    ],
    inventory: [
      { name: 'maintainInventory', label: 'Maintain Inventory', description: 'Enable stock management and inventory tracking' },
      { name: 'integrateAccountsWithInventory', label: 'Integrate Accounts with Inventory', description: 'Link inventory transactions with accounting' }
    ],
    taxation: [
      { name: 'enableGST', label: 'Enable GST', description: 'Enable Goods and Services Tax compliance' },
      { name: 'setAlterCompanyGSTRateAndDetails', label: 'Set/Alter Company GST Rate', description: 'Configure company-specific GST rates' },
      { name: 'enableTDS', label: 'Enable TDS', description: 'Enable Tax Deducted at Source compliance' }
    ],
    options: [
      { name: 'showMoreFeatures', label: 'Show More Features', description: 'Display additional advanced features' }
    ]
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold">Manage Company Features</h2>
            <p className="text-purple-100 mt-1">{company.companyName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-purple-800 rounded-lg p-2 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={fetchFeatures} className="text-red-700 hover:text-red-900">
                <RefreshCw size={16} />
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : features ? (
            <div className="space-y-6">
              {/* Accounting Features */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <div className="w-2 h-6 bg-blue-500 rounded"></div>
                  Accounting Features
                </h3>
                <div className="space-y-3">
                  {featureGroups.accounting.map(feature => (
                    <FeatureToggle
                      key={feature.name}
                      feature={feature}
                      enabled={features[feature.name]}
                      onToggle={handleToggleFeature}
                      disabled={saving}
                    />
                  ))}
                </div>
              </div>

              {/* Inventory Features */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <div className="w-2 h-6 bg-green-500 rounded"></div>
                  Inventory Features
                </h3>
                <div className="space-y-3">
                  {featureGroups.inventory.map(feature => (
                    <FeatureToggle
                      key={feature.name}
                      feature={feature}
                      enabled={features[feature.name]}
                      onToggle={handleToggleFeature}
                      disabled={saving}
                    />
                  ))}
                </div>
              </div>

              {/* Taxation Features */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <div className="w-2 h-6 bg-orange-500 rounded"></div>
                  Taxation Features
                </h3>
                <div className="space-y-3">
                  {featureGroups.taxation.map(feature => (
                    <FeatureToggle
                      key={feature.name}
                      feature={feature}
                      enabled={features[feature.name]}
                      onToggle={handleToggleFeature}
                      disabled={saving}
                    />
                  ))}
                </div>
              </div>

              {/* Additional Options */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <div className="w-2 h-6 bg-purple-500 rounded"></div>
                  Additional Options
                </h3>
                <div className="space-y-3">
                  {featureGroups.options.map(feature => (
                    <FeatureToggle
                      key={feature.name}
                      feature={feature}
                      enabled={features[feature.name]}
                      onToggle={handleToggleFeature}
                      disabled={saving}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>

      {/* GST Configuration Modal */}
      {showGSTConfig && (
        <GSTConfigModal
          company={company}
          onClose={() => setShowGSTConfig(false)}
          onSuccess={() => {
            setShowGSTConfig(false);
            fetchFeatures();
          }}
        />
      )}

      {/* TDS Configuration Modal */}
      {showTDSConfig && (
        <TDSConfigModal
          company={company}
          onClose={() => setShowTDSConfig(false)}
          onSuccess={() => {
            setShowTDSConfig(false);
            fetchFeatures();
          }}
        />
      )}
    </div>
  );
};

// Feature Toggle Component
const FeatureToggle = ({ feature, enabled, onToggle, disabled }) => {
  return (
    <div className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-800 mb-1">{feature.label}</h4>
          <p className="text-sm text-gray-600">{feature.description}</p>
        </div>
        <button
          onClick={() => onToggle(feature.name, enabled)}
          disabled={disabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
            enabled ? 'bg-green-500' : 'bg-gray-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
};

export default CompanyFeaturesModal;
