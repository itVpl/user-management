import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Building, DollarSign, FileText, CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';
import API_CONFIG from '../config/api';

const CreditLimitForm = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    requestedCreditLimit: '',
    businessType: '',
    yearsInBusiness: '',
    annualRevenue: '',
    paymentTerms: '',
    references: '',
    additionalNotes: ''
  });
  const [shipperInfo, setShipperInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    fetchFormInfo();
  }, [token]);

  const fetchFormInfo = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/credit-limit-form/${token}`
      );

      if (response.data.success) {
        setShipperInfo(response.data.data.shipper);
        const expiresAt = new Date(response.data.data.expiresAt);
        if (expiresAt < new Date()) {
          setExpired(true);
          setError('This form link has expired. Please contact your account manager for a new form.');
        }
      } else {
        setError(response.data.message || 'Invalid or expired form link');
      }
    } catch (error) {
      console.error('Error fetching form info:', error);
      if (error.response?.status === 404) {
        setError('Invalid or expired form link');
      } else if (error.response?.status === 400) {
        const message = error.response.data?.message || '';
        if (message.includes('expired')) {
          setExpired(true);
          setError(message);
        } else if (message.includes('already been submitted')) {
          setError(message);
        } else {
          setError(message || 'Failed to load form. Please try again.');
        }
      } else {
        setError('Failed to load form. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.requestedCreditLimit || parseFloat(formData.requestedCreditLimit) <= 0) {
      setError('Please enter a valid credit limit amount');
      return;
    }

    if (!formData.businessType) {
      setError('Please select a business type');
      return;
    }

    if (!formData.yearsInBusiness || parseInt(formData.yearsInBusiness) < 0) {
      setError('Please enter valid years in business');
      return;
    }

    if (!formData.annualRevenue || parseFloat(formData.annualRevenue) <= 0) {
      setError('Please enter a valid annual revenue');
      return;
    }

    if (!formData.paymentTerms) {
      setError('Please select payment terms');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        requestedCreditLimit: parseFloat(formData.requestedCreditLimit),
        businessType: formData.businessType,
        yearsInBusiness: parseInt(formData.yearsInBusiness),
        annualRevenue: parseFloat(formData.annualRevenue),
        paymentTerms: formData.paymentTerms,
        references: formData.references || '',
        additionalNotes: formData.additionalNotes || ''
      };

      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/credit-limit-form/${token}`,
        payload
      );

      if (response.data.success) {
        setSuccess(true);
      } else {
        setError(response.data.message || 'Failed to submit form');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      if (error.response?.status === 400) {
        const message = error.response.data?.message || '';
        if (message.includes('expired')) {
          setExpired(true);
          setError(message);
        } else if (message.includes('already been submitted')) {
          setError(message);
        } else {
          setError(message || 'Failed to submit form. Please try again.');
        }
      } else {
        setError('Failed to submit form. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading Form...</h2>
          <p className="text-gray-600">Please wait while we load your credit limit form.</p>
        </div>
      </div>
    );
  }

  if (error && !expired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Form Link Expired</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500 mb-6">
            Please contact your account manager or V Power Logistics support for a new form link.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Form Submitted Successfully!</h2>
          <p className="text-gray-600 mb-6">
            Your credit limit request has been submitted and will be reviewed by our team.
            You will be notified once a decision has been made.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 border border-blue-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Building className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Credit Limit Request Form</h1>
              <p className="text-gray-600 mt-1">V Power Logistics</p>
            </div>
          </div>

          {shipperInfo && (
            <div className="bg-blue-50 rounded-lg p-4 mt-4">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Building size={18} />
                Company Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Company Name:</strong>
                  <br />
                  <span className="text-gray-700">{shipperInfo.compName || 'N/A'}</span>
                </div>
                <div>
                  <strong>MC/DOT No:</strong>
                  <br />
                  <span className="text-gray-700">{shipperInfo.mc_dot_no || 'N/A'}</span>
                </div>
                <div>
                  <strong>Email:</strong>
                  <br />
                  <span className="text-gray-700">{shipperInfo.email || 'N/A'}</span>
                </div>
                <div>
                  <strong>Current Credit Limit:</strong>
                  <br />
                  <span className="font-semibold text-blue-600">
                    {formatCurrency(shipperInfo.creditLimit)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 border border-blue-100">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-semibold text-red-800 mb-1">Error</h4>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Requested Credit Limit */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Requested Credit Limit <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="number"
                  name="requestedCreditLimit"
                  value={formData.requestedCreditLimit}
                  onChange={handleChange}
                  placeholder="Enter requested credit limit amount"
                  min="0"
                  step="0.01"
                  required
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter the credit limit amount you are requesting
              </p>
            </div>

            {/* Business Type */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Business Type <span className="text-red-500">*</span>
              </label>
              <select
                name="businessType"
                value={formData.businessType}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value="">Select business type</option>
                <option value="Freight Broker">Freight Broker</option>
                <option value="Shipper">Shipper</option>
                <option value="Carrier">Carrier</option>
                <option value="3PL">3PL (Third-Party Logistics)</option>
                <option value="Freight Forwarder">Freight Forwarder</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Years in Business */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Years in Business <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="yearsInBusiness"
                value={formData.yearsInBusiness}
                onChange={handleChange}
                placeholder="Enter years in business"
                min="0"
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>

            {/* Annual Revenue */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Annual Revenue <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="number"
                  name="annualRevenue"
                  value={formData.annualRevenue}
                  onChange={handleChange}
                  placeholder="Enter annual revenue"
                  min="0"
                  step="0.01"
                  required
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
            </div>

            {/* Payment Terms */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Payment Terms <span className="text-red-500">*</span>
              </label>
              <select
                name="paymentTerms"
                value={formData.paymentTerms}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value="">Select payment terms</option>
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 45">Net 45</option>
                <option value="Net 60">Net 60</option>
                <option value="Due on Receipt">Due on Receipt</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* References */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                References
              </label>
              <textarea
                name="references"
                value={formData.references}
                onChange={handleChange}
                placeholder="Provide business references or credit references (optional)"
                rows="4"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
              />
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Additional Notes
              </label>
              <textarea
                name="additionalNotes"
                value={formData.additionalNotes}
                onChange={handleChange}
                placeholder="Any additional information you'd like to provide (optional)"
                rows="4"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
            <button
              type="submit"
              disabled={submitting}
              className={`px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center gap-2 ${
                submitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {submitting ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <FileText size={20} />
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreditLimitForm;
