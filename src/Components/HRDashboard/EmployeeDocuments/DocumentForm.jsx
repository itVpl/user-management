import React, { useState, useEffect, useRef } from 'react';
import { X, Loader, FileText, Briefcase, DollarSign, Receipt, UserCheck } from 'lucide-react';
import employeeDocumentsService from '../../../services/employeeDocumentsService';
import alertify from 'alertifyjs';
import 'alertifyjs/build/css/alertify.css';

const DEFAULT_RELIEVING_COMPANY_NAME = 'V Power Logistics';
const DEFAULT_RELIEVING_COMPANY_ADDRESS =
  'Ground floor, C-14, Phase V, Udyog Vihar, Sector 19, Gurgaon - 122016';
const DEFAULT_SIGNATORY_NAME = 'Rishi Jyoti';
const DEFAULT_SIGNATORY_DESIGNATION = 'CEO';

const DocumentForm = ({ documentType, documentId, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [signatures, setSignatures] = useState([]);
  const [formData, setFormData] = useState({
    // Common fields
    employeeId: '',
    employeeEmail: '',
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
    workingHours: '',
    placeOfPosting: '',
    noticePeriod: '',
    documentsRequired: [],
    
    // Letter of Intent fields
    expectedJoiningDate: '',
    
    // Salary Slip fields
    month: '',
    vplSalaryPolicy: false,
    profileBasicSalary: '',
    salarySnapshotDoj: '',
    salaryDetails: {
      basicSalary: '',
      allowances: {
        housing: '',
        cca: '',
        transport: '',
        medical: '',
        other: '',
      },
      deductions: {
        tax: '',
        insurance: '',
        meal: '',
        other: '',
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

    // Relieving letter fields
    dateOfJoining: '',
    resignationDate: '',
    relievingDate: '',
    issueDate: '',
    signatoryName: '',
    signatoryDesignation: '',
    companyName: '',
    companyAddress: '',
    customParagraphText: '',
  });

  const [newBenefit, setNewBenefit] = useState('');
  const [newDocumentRequired, setNewDocumentRequired] = useState('');
  const [prefillLoading, setPrefillLoading] = useState(false);
  const prefillAbortRef = useRef(null);
  const salaryPrefillAbortRef = useRef(null);

  // Fetch signatures and document data if editing
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch signatures
        const sigResponse = await employeeDocumentsService.getSignatures();
        if (sigResponse.success) {
          const sigs = sigResponse.data || [];
          console.log('Fetched signatures:', sigs);
          setSignatures(sigs);
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

  useEffect(() => {
    if (documentType !== 'experience_cum_relieving_letter' && documentType !== 'relieving_letter') {
      return;
    }
    setFormData((prev) => {
      const next = { ...prev };
      if (!String(prev.companyName || '').trim()) {
        next.companyName = DEFAULT_RELIEVING_COMPANY_NAME;
      }
      if (!String(prev.companyAddress || '').trim()) {
        next.companyAddress = DEFAULT_RELIEVING_COMPANY_ADDRESS;
      }
      if (!String(prev.signatoryName || '').trim()) {
        next.signatoryName = DEFAULT_SIGNATORY_NAME;
      }
      if (!String(prev.signatoryDesignation || '').trim()) {
        next.signatoryDesignation = DEFAULT_SIGNATORY_DESIGNATION;
      }
      return next;
    });
  }, [documentType]);

  useEffect(() => {
    if (documentId) return;
    if (documentType !== 'experience_cum_relieving_letter' && documentType !== 'relieving_letter') {
      return;
    }

    const empId = formData.employeeId?.trim();
    if (!empId) {
      setPrefillLoading(false);
      return;
    }

    if (prefillAbortRef.current) {
      prefillAbortRef.current.abort();
    }
    const ctrl = new AbortController();
    prefillAbortRef.current = ctrl;

    let cancelled = false;
    const requestedId = empId;

    const t = setTimeout(async () => {
      setPrefillLoading(true);
      try {
        const res = await employeeDocumentsService.prefillEmployee(requestedId, { signal: ctrl.signal });
        if (cancelled || !res?.success || !res?.data) return;
        const d = res.data;
        setFormData((prev) => {
          if (prev.employeeId?.trim() !== requestedId) return prev;
          return {
            ...prev,
            employeeId: d.employeeId ?? prev.employeeId,
            employeeName: d.employeeName ?? prev.employeeName,
            position: d.designation != null && d.designation !== '' ? d.designation : prev.position,
            department: d.department != null && d.department !== '' ? d.department : prev.department,
            dateOfJoining: d.dateOfJoining != null && d.dateOfJoining !== '' ? d.dateOfJoining : prev.dateOfJoining,
          };
        });
      } catch (e) {
        if (e.name === 'AbortError' || cancelled) return;
        if (e.status === 404) {
          alertify.warning(e.message || 'Employee not found for this Employee ID');
        } else {
          console.warn('Employee prefill:', e.message);
        }
      } finally {
        if (!cancelled && !ctrl.signal.aborted) {
          setPrefillLoading(false);
        }
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(t);
      ctrl.abort();
      setPrefillLoading(false);
    };
  }, [formData.employeeId, documentType, documentId]);

  useEffect(() => {
    if (documentId) return;
    if (documentType !== 'salary_slip') return;

    const empId = formData.employeeId?.trim();
    if (!empId) {
      setPrefillLoading(false);
      return;
    }

    if (salaryPrefillAbortRef.current) {
      salaryPrefillAbortRef.current.abort();
    }
    const ctrl = new AbortController();
    salaryPrefillAbortRef.current = ctrl;

    let cancelled = false;
    const requestedId = empId;

    const t = setTimeout(async () => {
      setPrefillLoading(true);
      try {
        const res = await employeeDocumentsService.salarySlipPrefill(requestedId, { signal: ctrl.signal });
        if (cancelled || !res?.success || !res?.data) return;
        const d = res.data;
        const sd = d.salaryDetails || {};
        const al = sd.allowances || {};
        const ded = sd.deductions || {};
        setFormData((prev) => {
          if (prev.employeeId?.trim() !== requestedId) return prev;
          return {
            ...prev,
            employeeId: d.employeeId ?? prev.employeeId,
            employeeName: d.employeeName ?? prev.employeeName,
            department: d.department != null && d.department !== '' ? d.department : prev.department,
            vplSalaryPolicy: d.vplSalaryPolicy === true,
            profileBasicSalary:
              d.profileBasicSalary != null && d.profileBasicSalary !== ''
                ? String(d.profileBasicSalary)
                : prev.profileBasicSalary,
            salarySnapshotDoj: d.dateOfJoining ?? prev.salarySnapshotDoj,
            salaryDetails: {
              ...prev.salaryDetails,
              basicSalary:
                sd.basicSalary != null && sd.basicSalary !== ''
                  ? String(sd.basicSalary)
                  : prev.salaryDetails.basicSalary,
              allowances: {
                ...prev.salaryDetails.allowances,
                housing:
                  al.housing != null && al.housing !== ''
                    ? String(al.housing)
                    : prev.salaryDetails.allowances.housing,
                cca:
                  al.cca != null && al.cca !== ''
                    ? String(al.cca)
                    : prev.salaryDetails.allowances.cca || '',
                transport:
                  al.transport != null && al.transport !== ''
                    ? String(al.transport)
                    : prev.salaryDetails.allowances.transport,
                medical:
                  al.medical != null && al.medical !== ''
                    ? String(al.medical)
                    : prev.salaryDetails.allowances.medical,
                other:
                  al.other != null && al.other !== ''
                    ? String(al.other)
                    : prev.salaryDetails.allowances.other,
              },
              deductions: {
                ...prev.salaryDetails.deductions,
                meal:
                  ded.meal != null && ded.meal !== ''
                    ? String(ded.meal)
                    : prev.salaryDetails.deductions.meal || '',
                tax:
                  ded.tax != null && ded.tax !== '' ? String(ded.tax) : prev.salaryDetails.deductions.tax,
                insurance:
                  ded.insurance != null && ded.insurance !== ''
                    ? String(ded.insurance)
                    : prev.salaryDetails.deductions.insurance,
                other:
                  ded.other != null && ded.other !== ''
                    ? String(ded.other)
                    : prev.salaryDetails.deductions.other,
              },
              netSalary:
                sd.netSalary != null && sd.netSalary !== ''
                  ? String(sd.netSalary)
                  : prev.salaryDetails.netSalary,
            },
          };
        });
      } catch (e) {
        if (e.name === 'AbortError' || cancelled) return;
        if (e.status === 404) {
          alertify.warning(e.message || 'Employee not found for this Employee ID');
        } else if (e.status === 400) {
          alertify.error(e.message || 'Set basic salary on the employee profile first.');
        } else {
          console.warn('Salary slip prefill:', e.message);
        }
      } finally {
        if (!cancelled && !ctrl.signal.aborted) {
          setPrefillLoading(false);
        }
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(t);
      ctrl.abort();
      setPrefillLoading(false);
    };
  }, [formData.employeeId, documentType, documentId]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.employeeName || !formData.employeeName.trim()) {
        alertify.error('Please enter Employee Name');
        setLoading(false);
        return;
      }

      // For LOI: require either Employee ID or Employee Email
      if (documentType === 'letter_of_intent') {
        const hasId = formData.employeeId && formData.employeeId.trim();
        const hasEmail = formData.employeeEmail && formData.employeeEmail.trim();
        if (!hasId && !hasEmail) {
          alertify.error('Please enter Employee ID or Employee Email (required for new candidates)');
          setLoading(false);
          return;
        }
      } else {
        // For other document types: Employee ID is required
        if (!formData.employeeId || !formData.employeeId.trim()) {
          alertify.error('Please enter Employee ID');
          setLoading(false);
          return;
        }
      }

      let response;
      // Remove _id and other MongoDB-specific fields when creating (not updating)
      const { _id, __v, createdAt, updatedAt, id, ...payload } = formData;
      
      // Recursive function to remove _id fields from nested objects
      const removeIdFields = (obj) => {
        if (Array.isArray(obj)) {
          return obj.map(item => removeIdFields(item));
        }
        if (obj !== null && typeof obj === 'object') {
          const cleaned = {};
          for (const [key, value] of Object.entries(obj)) {
            // Skip _id, __v, id fields
            if (key !== '_id' && key !== '__v' && key !== 'id') {
              // Skip empty strings, null, undefined
              if (value !== null && value !== undefined && value !== '') {
                cleaned[key] = removeIdFields(value);
              }
            }
          }
          return cleaned;
        }
        return obj;
      };
      
      // Clean payload: remove empty strings, null, undefined values, and _id fields
      const cleanPayload = Object.keys(payload).reduce((acc, key) => {
        const value = payload[key];
        // Skip _id fields
        if (key === '_id' || key === '__v' || key === 'id') {
          return acc;
        }
        // Keep objects and arrays, but clean nested empty strings and _id fields
        if (value !== null && value !== undefined && value !== '') {
          if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
            // Clean nested objects recursively
            const cleanedNested = removeIdFields(value);
            // Remove empty nested objects
            if (Object.keys(cleanedNested).length > 0) {
              acc[key] = cleanedNested;
            }
          } else if (Array.isArray(value)) {
            // Clean arrays
            acc[key] = removeIdFields(value);
          } else {
            acc[key] = value;
          }
        }
        return acc;
      }, {});

      // Ensure employeeName is trimmed
      cleanPayload.employeeName = cleanPayload.employeeName.trim();
      // Trim employeeId if present (LOI may omit it when using employeeEmail)
      if (cleanPayload.employeeId) {
        cleanPayload.employeeId = cleanPayload.employeeId.trim();
      }
      // Trim employeeEmail if present (LOI only)
      if (cleanPayload.employeeEmail) {
        cleanPayload.employeeEmail = cleanPayload.employeeEmail.trim();
      }
      
      // Remove signatureId if it's empty or invalid
      if (!cleanPayload.signatureId || cleanPayload.signatureId.trim() === '') {
        delete cleanPayload.signatureId;
      } else {
        cleanPayload.signatureId = cleanPayload.signatureId.trim();
      }

      // For salary slip: Remove basicSalary if 0 or empty (backend will use employee's salary from profile)
      if (documentType === 'salary_slip' && cleanPayload.salaryDetails && cleanPayload.salaryDetails.basicSalary !== undefined) {
        const basicSalary = parseFloat(cleanPayload.salaryDetails.basicSalary);
        if (!basicSalary || basicSalary === 0 || cleanPayload.salaryDetails.basicSalary === '') {
          // Remove basicSalary from salaryDetails, but keep the object if it has other fields
          const { basicSalary: _, ...restSalaryDetails } = cleanPayload.salaryDetails;
          if (Object.keys(restSalaryDetails).length > 0) {
            cleanPayload.salaryDetails = restSalaryDetails;
          } else {
            // If salaryDetails only had basicSalary, remove the whole object
            delete cleanPayload.salaryDetails;
          }
        }
      }

      if (documentType === 'salary_slip') {
        delete cleanPayload.profileBasicSalary;
        delete cleanPayload.salarySnapshotDoj;
        if (formData.vplSalaryPolicy) {
          cleanPayload.vplSalaryPolicy = true;
        }
      }

      if (documentType === 'experience_cum_relieving_letter' || documentType === 'relieving_letter') {
        const requiredFields = [
          ['position', 'Designation'],
          ['department', 'Department'],
          ['dateOfJoining', 'Date of Joining'],
          ['lastWorkingDate', 'Last Working Date'],
          ['relievingDate', 'Relieving Date'],
          ['issueDate', 'Issue Date'],
          ['companyName', 'Company Name'],
          ['signatoryName', 'Signatory Name'],
          ['signatoryDesignation', 'Signatory Designation'],
        ];

        for (const [key, label] of requiredFields) {
          if (!cleanPayload[key] || !String(cleanPayload[key]).trim()) {
            alertify.error(`Please enter ${label}`);
            setLoading(false);
            return;
          }
        }

        const dateOfJoining = new Date(cleanPayload.dateOfJoining);
        const lastWorkingDate = new Date(cleanPayload.lastWorkingDate);
        const relievingDate = new Date(cleanPayload.relievingDate);
        const issueDate = new Date(cleanPayload.issueDate);

        if (lastWorkingDate < dateOfJoining) {
          alertify.error('Last Working Date must be on or after Date of Joining');
          setLoading(false);
          return;
        }
        if (relievingDate < lastWorkingDate) {
          alertify.error('Relieving Date must be on or after Last Working Date');
          setLoading(false);
          return;
        }
        if (issueDate < dateOfJoining) {
          alertify.error('Issue Date must be on or after Date of Joining');
          setLoading(false);
          return;
        }
      }

      console.log('Sending payload:', cleanPayload);
      console.log('Payload keys:', Object.keys(cleanPayload));

      switch (documentType) {
        case 'offer_letter':
          response = await employeeDocumentsService.createOfferLetter(cleanPayload);
          break;
        case 'letter_of_intent':
          response = await employeeDocumentsService.createLetterOfIntent(cleanPayload);
          break;
        case 'salary_slip':
          response = await employeeDocumentsService.createSalarySlip(cleanPayload);
          break;
        case 'fnf':
          response = await employeeDocumentsService.createFNF(cleanPayload);
          break;
        case 'experience_cum_relieving_letter':
        case 'relieving_letter': {
          const customParagraphs = cleanPayload.customParagraphText
            ? cleanPayload.customParagraphText
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
            : [];

          const createBody = {
            employeeId: cleanPayload.employeeId,
            documentType: documentType.toUpperCase(),
            payload: {
              employeeName: cleanPayload.employeeName,
              employeeId: cleanPayload.employeeId,
              designation: cleanPayload.position,
              department: cleanPayload.department,
              dateOfJoining: cleanPayload.dateOfJoining,
              resignationDate: cleanPayload.resignationDate,
              lastWorkingDate: cleanPayload.lastWorkingDate,
              relievingDate: cleanPayload.relievingDate,
              issueDate: cleanPayload.issueDate,
              companyName: cleanPayload.companyName,
              companyAddress: cleanPayload.companyAddress,
              signatoryName: cleanPayload.signatoryName,
              signatoryDesignation: cleanPayload.signatoryDesignation,
              remarks: cleanPayload.remarks,
              customParagraphs,
            },
          };
          if (cleanPayload.signatureId) {
            createBody.signatureId = cleanPayload.signatureId;
          }

          response = await employeeDocumentsService.createDocument(createBody);
          break;
        }
        default:
          throw new Error('Invalid document type');
      }

      if (response.success) {
        const status = response?.data?.status;
        const fileUrl = response?.data?.fileUrl;
        if (status === 'CREATED' && (fileUrl == null || fileUrl === '')) {
          alertify.message(
            'Document saved. Open it from history and use Download PDF to generate the file if the PDF was not created automatically.'
          );
        } else if (status === 'CREATED') {
          alertify.message('Document created. You can download or regenerate the PDF from history if needed.');
        } else {
          alertify.success('Document created successfully');
        }
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating document:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
      });
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

  // Add document required
  const handleAddDocumentRequired = () => {
    if (newDocumentRequired.trim()) {
      setFormData({
        ...formData,
        documentsRequired: [...formData.documentsRequired, newDocumentRequired.trim()],
      });
      setNewDocumentRequired('');
    }
  };

  // Remove document required
  const handleRemoveDocumentRequired = (index) => {
    setFormData({
      ...formData,
      documentsRequired: formData.documentsRequired.filter((_, i) => i !== index),
    });
  };

  // Calculate net salary (preview only - backend does pro-rata calculation)
  useEffect(() => {
    if (documentType === 'salary_slip') {
      const basic = parseFloat(formData.salaryDetails.basicSalary) || 0;
      const allowances = 
        (parseFloat(formData.salaryDetails.allowances.housing) || 0) +
        (parseFloat(formData.salaryDetails.allowances.cca) || 0) +
        (parseFloat(formData.salaryDetails.allowances.transport) || 0) +
        (parseFloat(formData.salaryDetails.allowances.medical) || 0) +
        (parseFloat(formData.salaryDetails.allowances.other) || 0);
      const deductions = 
        (parseFloat(formData.salaryDetails.deductions.tax) || 0) +
        (parseFloat(formData.salaryDetails.deductions.insurance) || 0) +
        (parseFloat(formData.salaryDetails.deductions.meal) || 0) +
        (parseFloat(formData.salaryDetails.deductions.other) || 0);
      // Note: This is a simple preview. Backend calculates pro-rata:
      // (Basic Salary ÷ Total Days in Month) × Present Days + Allowances - Deductions
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
    formData.salaryDetails.allowances.cca,
    formData.salaryDetails.allowances.transport,
    formData.salaryDetails.allowances.medical,
    formData.salaryDetails.allowances.other,
    formData.salaryDetails.deductions.tax,
    formData.salaryDetails.deductions.insurance,
    formData.salaryDetails.deductions.meal,
    formData.salaryDetails.deductions.other,
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
      case 'experience_cum_relieving_letter':
      case 'relieving_letter':
        return <UserCheck className="w-5 h-5" />;
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
      case 'experience_cum_relieving_letter':
        return 'Create Experience Cum Relieving Letter';
      case 'relieving_letter':
        return 'Create Relieving Letter';
      default:
        return 'Create Document';
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4 overflow-y-auto">
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
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <span>
                  Employee ID {documentType === 'letter_of_intent' ? '(optional for new candidates)' : '*'}
                </span>
                {prefillLoading &&
                  (documentType === 'experience_cum_relieving_letter' ||
                    documentType === 'relieving_letter' ||
                    documentType === 'salary_slip') && (
                    <Loader className="w-4 h-4 animate-spin text-blue-600" aria-hidden />
                  )}
              </label>
              <input
                type="text"
                required={documentType !== 'letter_of_intent'}
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={documentType === 'letter_of_intent' ? 'e.g., VPL001 (omit for new candidates)' : ''}
              />
              {(documentType === 'experience_cum_relieving_letter' || documentType === 'relieving_letter') && (
                <p className="mt-1 text-xs text-gray-500">
                  After you enter Employee ID, name, designation, department, and date of joining load automatically (short delay).
                </p>
              )}
              {documentType === 'salary_slip' && (
                <p className="mt-1 text-xs text-gray-500">
                  Enter Employee ID to load VPL salary slip defaults (profile basic, HRA, CCA, meal) when available.
                </p>
              )}
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
          {/* Employee Email - LOI only (for new candidates; used when sending LOI PDF) */}
          {documentType === 'letter_of_intent' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee Email
              </label>
              <input
                type="email"
                value={formData.employeeEmail}
                onChange={(e) => setFormData({ ...formData, employeeEmail: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="candidate@example.com (required for new candidates without Employee ID)"
              />
              <p className="mt-1 text-xs text-gray-500">Provide either Employee ID or Email. Email is used when sending LOI PDF to new candidates.</p>
            </div>
          )}

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
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional"
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
                  placeholder="Optional custom terms (in addition to standard terms & conditions)"
                />
              </div>
              
              {/* Working Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Working Hours
                </label>
                <input
                  type="text"
                  value={formData.workingHours}
                  onChange={(e) => setFormData({ ...formData, workingHours: e.target.value })}
                  placeholder="e.g., Monday to Friday (3:00pm to 12:00 am)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">Leave empty to use default working hours</p>
              </div>

              {/* Place of Posting */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Place of Posting
                </label>
                <textarea
                  value={formData.placeOfPosting}
                  onChange={(e) => setFormData({ ...formData, placeOfPosting: e.target.value })}
                  rows={2}
                  placeholder="V Power Logistics, Ground Floor, C-14, Phase V, Udyog Vihar, Sector 19, Gurugram, Haryana 122008, India"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">Leave empty to use default: V Power Logistics, Ground Floor, C-14, Phase V, Udyog Vihar, Sector 19, Gurugram, Haryana 122008, India</p>
              </div>

              {/* Notice Period */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notice Period
                </label>
                <input
                  type="text"
                  value={formData.noticePeriod}
                  onChange={(e) => setFormData({ ...formData, noticePeriod: e.target.value })}
                  placeholder="e.g., 30 days or As per company policy"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">Leave empty to use default notice period</p>
              </div>

              {/* Documents Required */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Documents Required
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newDocumentRequired}
                    onChange={(e) => setNewDocumentRequired(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDocumentRequired())}
                    placeholder="Add required document"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleAddDocumentRequired}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.documentsRequired.map((doc, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-2"
                    >
                      {doc}
                      <button
                        type="button"
                        onClick={() => handleRemoveDocumentRequired(index)}
                        className="text-purple-700 hover:text-purple-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-500">Leave empty to use default list of required documents</p>
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
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional"
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
              {formData.vplSalaryPolicy && (
                <div className="rounded-lg border border-blue-100 bg-blue-50/80 p-4 space-y-2 text-sm">
                  <p className="font-medium text-blue-900">VPL salary policy</p>
                  <p className="text-gray-700">
                    Profile basic (gross):{' '}
                    <span className="font-semibold text-gray-900">
                      {formData.profileBasicSalary
                        ? Number(formData.profileBasicSalary).toLocaleString()
                        : '—'}
                    </span>
                  </p>
                  <p className="text-gray-700">
                    Slip basic (full month, policy):{' '}
                    <span className="font-semibold text-gray-900">
                      {formData.salaryDetails.basicSalary
                        ? Number(formData.salaryDetails.basicSalary).toLocaleString()
                        : '—'}
                    </span>
                  </p>
                  {formData.salarySnapshotDoj && (
                    <p className="text-gray-700">
                      Date of joining (from profile):{' '}
                      <span className="font-semibold text-gray-900">{formData.salarySnapshotDoj}</span>
                    </p>
                  )}
                  <p className="text-xs text-gray-600">
                    Submit sends <code className="text-xs bg-white px-1 rounded">vplSalaryPolicy: true</code>; server recomputes slip components from profile and merges your allowances/deductions.
                  </p>
                </div>
              )}
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
                <p className="mt-1 text-xs text-gray-500">Used to calculate total days in month for pro-rata salary</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Basic Salary (Full Month)
                  </label>
                  <input
                    type="number"
                    value={formData.salaryDetails.basicSalary}
                    onChange={(e) => setFormData({
                      ...formData,
                      salaryDetails: {
                        ...formData.salaryDetails,
                        basicSalary: e.target.value,
                      },
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional"
                    readOnly={formData.vplSalaryPolicy}
                    title={formData.vplSalaryPolicy ? 'Filled from VPL prefill; server may recompute from profile' : ''}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.vplSalaryPolicy
                      ? 'From VPL prefill (½ profile basic). Server recomputes on create.'
                      : "Leave empty to use employee's basic from profile, or enter a value for manual slip."}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Working Days
                  </label>
                  <input
                    type="number"
                    value={formData.workingDays}
                    onChange={(e) => setFormData({ ...formData, workingDays: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Defaults to days in month"
                  />
                  <p className="mt-1 text-xs text-gray-500">Leave empty to use total days in month</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Present Days *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.presentDays}
                    onChange={(e) => setFormData({ ...formData, presentDays: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 19.5"
                  />
                  <p className="mt-1 text-xs text-gray-500">Can be decimal (e.g., 19.5 days)</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leave Days
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.leaveDays}
                  onChange={(e) => setFormData({ ...formData, leaveDays: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    HRA (housing)
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
                    CCA
                  </label>
                  <input
                    type="number"
                    value={formData.salaryDetails.allowances.cca || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      salaryDetails: {
                        ...formData.salaryDetails,
                        allowances: {
                          ...formData.salaryDetails.allowances,
                          cca: e.target.value,
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Other Allowances
                </label>
                <input
                  type="number"
                  value={formData.salaryDetails.allowances.other || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    salaryDetails: {
                      ...formData.salaryDetails,
                      allowances: {
                        ...formData.salaryDetails.allowances,
                        other: e.target.value,
                      },
                    },
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meal deduction
                  </label>
                  <input
                    type="number"
                    value={formData.salaryDetails.deductions.meal || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      salaryDetails: {
                        ...formData.salaryDetails,
                        deductions: {
                          ...formData.salaryDetails.deductions,
                          meal: e.target.value,
                        },
                      },
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Other Deductions
                  </label>
                  <input
                    type="number"
                    value={formData.salaryDetails.deductions.other || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      salaryDetails: {
                        ...formData.salaryDetails,
                        deductions: {
                          ...formData.salaryDetails.deductions,
                          other: e.target.value,
                        },
                      },
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Net Salary (Preview)
                </label>
                <input
                  type="text"
                  value={formData.salaryDetails.netSalary || 'Calculated by backend'}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <p className="mt-1 text-xs text-gray-500">Final Net Salary is calculated by backend using pro-rata: (Basic Salary ÷ Total Days) × Present Days + Allowances - Deductions</p>
              </div>
            </>
          )}

          {/* Additional Notes (for salary slip) */}
          {documentType === 'salary_slip' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={formData.additionalNotes}
                onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Optional additional notes or comments"
              />
            </div>
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

          {(documentType === 'experience_cum_relieving_letter' || documentType === 'relieving_letter') && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Designation *
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Joining *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfJoining}
                    onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resignation Date
                  </label>
                  <input
                    type="date"
                    value={formData.resignationDate}
                    onChange={(e) => setFormData({ ...formData, resignationDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    Relieving Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.relievingDate}
                    onChange={(e) => setFormData({ ...formData, relievingDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Issue Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Address
                  </label>
                  <input
                    type="text"
                    value={formData.companyAddress}
                    onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Signatory Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.signatoryName}
                    onChange={(e) => setFormData({ ...formData, signatoryName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Signatory Designation *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.signatoryDesignation}
                    onChange={(e) => setFormData({ ...formData, signatoryDesignation: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
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

              {documentType === 'experience_cum_relieving_letter' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Paragraphs (one paragraph per line)
                  </label>
                  <textarea
                    value={formData.customParagraphText}
                    onChange={(e) => setFormData({ ...formData, customParagraphText: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
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
              {signatures.map((sig) => {
                // Use MongoDB _id if available, otherwise use signatureId
                const sigId = sig._id || sig.signatureId || sig.id;
                return (
                  <option key={sigId} value={sigId}>
                    {sig.signatureName || 'Unnamed Signature'} {sig.signatureType && `(${sig.signatureType})`}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Additional Notes (for offer letter and LOI) */}
          {(documentType === 'offer_letter' || documentType === 'letter_of_intent') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={formData.additionalNotes}
                onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Optional additional notes or comments"
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
