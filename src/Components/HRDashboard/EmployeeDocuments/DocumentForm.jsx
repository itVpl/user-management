import React, { useState, useEffect } from 'react';
import { X, Loader, FileText, Briefcase, DollarSign, Receipt, UserCheck } from 'lucide-react';
import employeeDocumentsService from '../../../services/employeeDocumentsService';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

const DocumentForm = ({ documentType, documentId, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [signatures, setSignatures] = useState([]);
  const [formData, setFormData] = useState({
    // Common fields
    employeeId: '',
    employeeName: '',
    signatureId: '',
    
    // Offer Letter fields
    position: '',
    department: '',
    joiningDate: '',
    salary: {
      amount: '',
      currency: 'USD',
      frequency: 'monthly',
    },
    benefits: [],
    terms: '',
    additionalNotes: '',
    
    // Letter of Intent fields
    expectedJoiningDate: '',
    
    // Salary Slip fields
    month: '',
    salaryDetails: {
      basicSalary: '',
      allowances: {
        housing: '',
        transport: '',
        medical: '',
      },
      deductions: {
        tax: '',
        insurance: '',
      },
      netSalary: '',
    },
    workingDays: '',
    presentDays: '',
    leaveDays: '',
    
    // FNF fields
    lastWorkingDate: '',
    settlementDate: '',
    settlementDetails: {
      pendingSalary: '',
      leaveEncashment: '',
      bonus: '',
      deductions: {
        outstanding: '',
        noticePeriod: '',
      },
      totalAmount: '',
    },
    remarks: '',
  });

  const [newBenefit, setNewBenefit] = useState('');

  // Fetch signatures and document data if editing
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch signatures
        const sigResponse = await employeeDocumentsService.getSignatures();
        if (sigResponse.success) {
          setSignatures(sigResponse.data || []);
        }

        // Fetch document data if editing
        if (documentId) {
          const docResponse = await employeeDocumentsService.getDocumentById(documentId);
          if (docResponse.success) {
            setFormData(docResponse.data);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        alertify.error(error.message || 'Failed to fetch data');
      }
    };

    fetchData();
  }, [documentId]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;
      const payload = { ...formData };

      switch (documentType) {
        case 'offer_letter':
          response = await employeeDocumentsService.createOfferLetter(payload);
          break;
        case 'letter_of_intent':
          response = await employeeDocumentsService.createLetterOfIntent(payload);
          break;
        case 'salary_slip':
          response = await employeeDocumentsService.createSalarySlip(payload);
          break;
        case 'fnf':
          response = await employeeDocumentsService.createFNF(payload);
          break;
        default:
          throw new Error('Invalid document type');
      }

      if (response.success) {
        alertify.success('Document created successfully');
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating document:', error);
      alertify.error(error.message || 'Failed to create document');
    } finally {
      setLoading(false);
    }
  };

  // Add benefit
  const handleAddBenefit = () => {
    if (newBenefit.trim()) {
      setFormData({
        ...formData,
        benefits: [...formData.benefits, newBenefit.trim()],
      });
      setNewBenefit('');
    }
  };

  // Remove benefit
  const handleRemoveBenefit = (index) => {
    setFormData({
      ...formData,
      benefits: formData.benefits.filter((_, i) => i !== index),
    });
  };

  // Calculate net salary
  useEffect(() => {
    if (documentType === 'salary_slip') {
      const basic = parseFloat(formData.salaryDetails.basicSalary) || 0;
      const allowances = 
        (parseFloat(formData.salaryDetails.allowances.housing) || 0) +
        (parseFloat(formData.salaryDetails.allowances.transport) || 0) +
        (parseFloat(formData.salaryDetails.allowances.medical) || 0);
      const deductions = 
        (parseFloat(formData.salaryDetails.deductions.tax) || 0) +
        (parseFloat(formData.salaryDetails.deductions.insurance) || 0);
      const netSalary = basic + allowances - deductions;
      
      setFormData({
        ...formData,
        salaryDetails: {
          ...formData.salaryDetails,
          netSalary: netSalary.toFixed(2),
        },
      });
    }
  }, [
    formData.salaryDetails.basicSalary,
    formData.salaryDetails.allowances.housing,
    formData.salaryDetails.allowances.transport,
    formData.salaryDetails.allowances.medical,
    formData.salaryDetails.deductions.tax,
    formData.salaryDetails.deductions.insurance,
  ]);

  // Calculate FNF total
  useEffect(() => {
    if (documentType === 'fnf') {
      const pendingSalary = parseFloat(formData.settlementDetails.pendingSalary) || 0;
      const leaveEncashment = parseFloat(formData.settlementDetails.leaveEncashment) || 0;
      const bonus = parseFloat(formData.settlementDetails.bonus) || 0;
      const outstanding = parseFloat(formData.settlementDetails.deductions.outstanding) || 0;
      const noticePeriod = parseFloat(formData.settlementDetails.deductions.noticePeriod) || 0;
      const totalAmount = pendingSalary + leaveEncashment + bonus - outstanding - noticePeriod;
      
      setFormData({
        ...formData,
        settlementDetails: {
          ...formData.settlementDetails,
          totalAmount: totalAmount.toFixed(2),
        },
      });
    }
  }, [
    formData.settlementDetails.pendingSalary,
    formData.settlementDetails.leaveEncashment,
    formData.settlementDetails.bonus,
    formData.settlementDetails.deductions.outstanding,
    formData.settlementDetails.deductions.noticePeriod,
  ]);

  const getDocumentIcon = () => {
    switch (documentType) {
      case 'offer_letter':
        return <Briefcase className="w-5 h-5" />;
      case 'letter_of_intent':
        return <FileText className="w-5 h-5" />;
      case 'salary_slip':
        return <DollarSign className="w-5 h-5" />;
      case 'fnf':
        return <Receipt className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getDocumentTitle = () => {
    switch (documentType) {
      case 'offer_letter':
        return 'Create Offer Letter';
      case 'letter_of_intent':
        return 'Create Letter of Intent';
      case 'salary_slip':
        return 'Create Salary Slip';
      case 'fnf':
        return 'Create FNF Document';
      default:
        return 'Create Document';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-8">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getDocumentIcon()}
            <h3 className="text-xl font-bold text-gray-900">{getDocumentTitle()}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Common Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee ID *
              </label>
              <input
                type="text"
                required
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee Name *
              </label>
              <input
                type="text"
                required
                value={formData.employeeName}
                onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Document Type Specific Fields */}
          {documentType === 'offer_letter' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Joining Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.joiningDate}
                  onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Salary Amount *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.salary.amount}
                    onChange={(e) => setFormData({
                      ...formData,
                      salary: { ...formData.salary, amount: e.target.value },
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={formData.salary.currency}
                    onChange={(e) => setFormData({
                      ...formData,
                      salary: { ...formData.salary, currency: e.target.value },
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="USD">USD</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency
                  </label>
                  <select
                    value={formData.salary.frequency}
                    onChange={(e) => setFormData({
                      ...formData,
                      salary: { ...formData.salary, frequency: e.target.value },
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Benefits
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newBenefit}
                    onChange={(e) => setNewBenefit(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddBenefit())}
                    placeholder="Add benefit"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleAddBenefit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.benefits.map((benefit, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2"
                    >
                      {benefit}
                      <button
                        type="button"
                        onClick={() => handleRemoveBenefit(index)}
                        className="text-blue-700 hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Terms & Conditions
                </label>
                <textarea
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {documentType === 'letter_of_intent' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Joining Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.expectedJoiningDate}
                  onChange={(e) => setFormData({ ...formData, expectedJoiningDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Terms & Conditions
                </label>
                <textarea
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {documentType === 'salary_slip' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Month (YYYY-MM) *
                </label>
                <input
                  type="month"
                  required
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Basic Salary *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.salaryDetails.basicSalary}
                    onChange={(e) => setFormData({
                      ...formData,
                      salaryDetails: {
                        ...formData.salaryDetails,
                        basicSalary: e.target.value,
                      },
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Working Days *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.workingDays}
                    onChange={(e) => setFormData({ ...formData, workingDays: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Present Days *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.presentDays}
                    onChange={(e) => setFormData({ ...formData, presentDays: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leave Days
                </label>
                <input
                  type="number"
                  value={formData.leaveDays}
                  onChange={(e) => setFormData({ ...formData, leaveDays: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Housing Allowance
                  </label>
                  <input
                    type="number"
                    value={formData.salaryDetails.allowances.housing}
                    onChange={(e) => setFormData({
                      ...formData,
                      salaryDetails: {
                        ...formData.salaryDetails,
                        allowances: {
                          ...formData.salaryDetails.allowances,
                          housing: e.target.value,
                        },
                      },
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transport Allowance
                  </label>
                  <input
                    type="number"
                    value={formData.salaryDetails.allowances.transport}
                    onChange={(e) => setFormData({
                      ...formData,
                      salaryDetails: {
                        ...formData.salaryDetails,
                        allowances: {
                          ...formData.salaryDetails.allowances,
                          transport: e.target.value,
                        },
                      },
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medical Allowance
                  </label>
                  <input
                    type="number"
                    value={formData.salaryDetails.allowances.medical}
                    onChange={(e) => setFormData({
                      ...formData,
                      salaryDetails: {
                        ...formData.salaryDetails,
                        allowances: {
                          ...formData.salaryDetails.allowances,
                          medical: e.target.value,
                        },
                      },
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Deduction
                  </label>
                  <input
                    type="number"
                    value={formData.salaryDetails.deductions.tax}
                    onChange={(e) => setFormData({
                      ...formData,
                      salaryDetails: {
                        ...formData.salaryDetails,
                        deductions: {
                          ...formData.salaryDetails.deductions,
                          tax: e.target.value,
                        },
                      },
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Insurance Deduction
                  </label>
                  <input
                    type="number"
                    value={formData.salaryDetails.deductions.insurance}
                    onChange={(e) => setFormData({
                      ...formData,
                      salaryDetails: {
                        ...formData.salaryDetails,
                        deductions: {
                          ...formData.salaryDetails.deductions,
                          insurance: e.target.value,
                        },
                      },
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Net Salary (Calculated)
                </label>
                <input
                  type="text"
                  value={formData.salaryDetails.netSalary}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
            </>
          )}

          {documentType === 'fnf' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Working Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.lastWorkingDate}
                    onChange={(e) => setFormData({ ...formData, lastWorkingDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Settlement Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.settlementDate}
                    onChange={(e) => setFormData({ ...formData, settlementDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pending Salary
                  </label>
                  <input
                    type="number"
                    value={formData.settlementDetails.pendingSalary}
                    onChange={(e) => setFormData({
                      ...formData,
                      settlementDetails: {
                        ...formData.settlementDetails,
                        pendingSalary: e.target.value,
                      },
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Leave Encashment
                  </label>
                  <input
                    type="number"
                    value={formData.settlementDetails.leaveEncashment}
                    onChange={(e) => setFormData({
                      ...formData,
                      settlementDetails: {
                        ...formData.settlementDetails,
                        leaveEncashment: e.target.value,
                      },
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bonus
                  </label>
                  <input
                    type="number"
                    value={formData.settlementDetails.bonus}
                    onChange={(e) => setFormData({
                      ...formData,
                      settlementDetails: {
                        ...formData.settlementDetails,
                        bonus: e.target.value,
                      },
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Outstanding Deduction
                  </label>
                  <input
                    type="number"
                    value={formData.settlementDetails.deductions.outstanding}
                    onChange={(e) => setFormData({
                      ...formData,
                      settlementDetails: {
                        ...formData.settlementDetails,
                        deductions: {
                          ...formData.settlementDetails.deductions,
                          outstanding: e.target.value,
                        },
                      },
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notice Period Deduction
                  </label>
                  <input
                    type="number"
                    value={formData.settlementDetails.deductions.noticePeriod}
                    onChange={(e) => setFormData({
                      ...formData,
                      settlementDetails: {
                        ...formData.settlementDetails,
                        deductions: {
                          ...formData.settlementDetails.deductions,
                          noticePeriod: e.target.value,
                        },
                      },
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Amount (Calculated)
                </label>
                <input
                  type="text"
                  value={formData.settlementDetails.totalAmount}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks
                </label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {/* Signature Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Signature
            </label>
            <select
              value={formData.signatureId}
              onChange={(e) => setFormData({ ...formData, signatureId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a signature</option>
              {signatures.map((sig) => (
                <option key={sig.signatureId} value={sig.signatureId}>
                  {sig.signatureName || 'Unnamed Signature'} {sig.signatureType && `(${sig.signatureType})`}
                </option>
              ))}
            </select>
          </div>

          {/* Additional Notes (for offer letter) */}
          {documentType === 'offer_letter' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={formData.additionalNotes}
                onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={loading}
            >
              {loading && <Loader className="w-4 h-4 animate-spin" />}
              Create Document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentForm;
