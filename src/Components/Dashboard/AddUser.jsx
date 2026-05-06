import React, { useMemo, useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { PlusCircle } from 'lucide-react';
import API_CONFIG from '../../config/api.js';
import SearchableSelect from './SearchableSelect';
import { UploadSlotPreview, hasUploadSelection } from './UploadSlotPreview';




const AddUserModal = ({ onClose, mode = 'create', existingMobiles = [] }) => {
  // === Regex & helpers ===
  const EMPID_ALNUM = /^[A-Za-z0-9]+$/;
  const EMPID_PATTERN = /^VPL\d{3,}$/;                     // e.g., VPL001
  const NAME_ALPHA = /^[A-Za-z ]+$/;                       // alphabets + space
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;   // supports .com.in
  const MOBILE_PATTERN = /^[6-9]\d{9}$/;                   // 10 digits, start 6–9
  const PASSWORD_COMBO = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W]).{8,14}$/; // 8–14

  // 10 MB in BYTES
  const MAX_FILE_BYTES = 10 * 1024 * 1024;


  const ID_DOCS = [
    { key: 'pancard', label: 'PAN Card', required: false, icon: '🆔' },
    { key: 'aadharcard', label: 'Aadhaar Card', required: false, icon: '🆔' },
    { key: 'educationalDocs', label: 'Educational Documents', required: false, multiple: true, icon: '📚' },
  ];
  const DEPARTMENT_OPTIONS = ['IT', 'HR', 'CMT', 'Sales', 'Finance', 'QA'];
  const SALES_TIER_OPTIONS = ['1', '2', '3'];
  /** API: `salesShiftTiming` — US Shift = day_shift, Indian Shift = night_shift */
  const SALES_SHIFT_TIMING_OPTIONS = [
    { value: 'day_shift', label: 'US Shift' },
    { value: 'night_shift', label: 'Indian Shift' },
  ];
  /** API: `salesTeam` — only when Indian Shift (night_shift) */
  const SALES_TEAM_NAME_OPTIONS = [
    { value: 'rate_request_team', label: 'Rate Request Team' },
    { value: 'operation_team', label: 'Operation Team' },
  ];
  const GENDER_SELECT_OPTIONS = [
    { value: '', label: 'Select Gender' },
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Other', label: 'Other' },
  ];
  const DEPARTMENT_SELECT_OPTIONS = [
    { value: '', label: 'Select Department' },
    ...DEPARTMENT_OPTIONS.map((d) => ({ value: d, label: d })),
  ];
  const SALES_TIER_SELECT_OPTIONS = [
    { value: '', label: 'Select Tier' },
    ...SALES_TIER_OPTIONS.map((t) => ({ value: t, label: t })),
  ];
  const SALES_SHIFT_SELECT_OPTIONS = [
    { value: '', label: 'Select Team Category' },
    ...SALES_SHIFT_TIMING_OPTIONS,
  ];
  const SALES_TEAM_SELECT_OPTIONS = [
    { value: '', label: 'Select Team name' },
    ...SALES_TEAM_NAME_OPTIONS,
  ];
  const getDesignationForSalesTier = (tier) => {
    if (tier === '1') return 'Sales Executive';
    if (tier === '2') return 'Account Manager';
    if (tier === '3') return 'Sales TL';
    return '';
  };

  const existingMobilesSet = useMemo(
    () => new Set(existingMobiles.filter(Boolean).map(m => String(m).replace(/\D/g, ''))),
    [existingMobiles]
  );
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const minusYears = (y) => {
    const d = new Date(); d.setFullYear(d.getFullYear() - y);
    return d.toISOString().slice(0, 10);
  };
  const maxDOB = minusYears(18); // DOB must be ≤ this
  const maxDOJ = todayStr();     // DOJ must be ≤ today


  const initialFields = [
    { name: 'empId', placeholder: 'e.g., VPL001', required: true, label: 'Employee ID', icon: '👤' },
    { name: 'password', placeholder: 'Create Password', required: true, label: 'Password', type: 'password', icon: '🔒' },
    { name: 'confirmPassword', placeholder: 'Confirm Password', required: true, label: 'Confirm Password', type: 'password', icon: '🔒' },
    { name: 'employeeName', placeholder: 'Enter Name', required: true, label: 'Full Name', icon: '👨‍💼' },
    { name: 'aliasName', placeholder: 'Enter Alias Name', label: 'Alias Name', icon: '🏷️' },
    { name: 'sex', placeholder: 'Sex', required: true, label: 'Gender', icon: '⚧' },
    { name: 'email', placeholder: 'name@company.com', required: true, label: 'Email Address', type: 'email', icon: '📧' },
    { name: 'mobileNo', placeholder: '10-digit mobile number', required: true, label: 'Mobile Number', icon: '📱' },
    { name: 'alternateNo', placeholder: 'Optional 10-digit alternate', label: 'Alternate Number', icon: '📞' },
    { name: 'emergencyNo', placeholder: '10-digit emergency contact', required: true, label: 'Emergency Contact', icon: '🚨' },
    { name: 'department', placeholder: 'Department', required: true, label: 'Department', icon: '🏢' },
    { name: 'designation', placeholder: 'Enter Designation', required: true, label: 'Designation', icon: '💼' },
    { name: 'dateOfBirth', placeholder: 'Select date of birth', type: 'date', required: true, label: 'Date of Birth', icon: '🎂' },
    { name: 'dateOfJoining', placeholder: 'Select date of joining', type: 'date', required: true, label: 'Date of Joining', icon: '📅' },
    // Banking set
    { name: 'accountHolderName', placeholder: 'Name as per bank passbook', label: 'Account Holder Name', icon: '👤' },
    { name: 'accountNumber', placeholder: '9 to 18 digit account number', label: 'Account Number', icon: '🏦' },
    { name: 'ifscCode', placeholder: 'e.g. SBIN0001234', label: 'IFSC Code', icon: '🏛️' },
    { name: 'basicSalary', placeholder: 'e.g. 50000', label: 'Basic Salary', icon: '💰' }
  ];


  const [formData, setFormData] = useState(
    initialFields.reduce((acc, field) => ({ ...acc, [field.name]: '' }), {
      role: 'superadmin',
      salesExecutiveTier: '',
      salesShiftTiming: '',
      salesTeam: '',
    })
  );


  const [files, setFiles] = useState({
    pancard: null,
    aadharcard: null,
    educationalDocs: [],
    releaseLetter: null,
    offerLetter: null,
    experienceLetter: null,
    bankStatementOrSalarySlip: [],
  });


  const [uploadStatus, setUploadStatus] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(true);
  const [fileErrors, setFileErrors] = useState({});
  const [fileNames, setFileNames] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorModal, setErrorModal] = useState(null);       // in-app error modal
  const [interceptedAlert, setInterceptedAlert] = useState(''); // blocks native alerts


  // Block any window.alert while this modal is open (route to in-app notice)
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg) => setInterceptedAlert(String(msg || ''));
    return () => { window.alert = originalAlert; };
  }, []);


  const setErr = (k, m) => setErrors(p => ({ ...p, [k]: m }));
  const clearErr = (k) => setErrors(p => { const n = { ...p }; delete n[k]; return n; });


  const handleInputChange = (e) => {
    const { name } = e.target;
    let { value } = e.target;


    // Name: only letters + single spaces
    if (name === 'accountHolderName' || name === 'employeeName' || name === 'aliasName' || name === 'department' || name === 'designation') {
      value = value.replace(/[^A-Za-z\s]/g, '').replace(/\s{2,}/g, ' ').slice(0, 50);
    }


    if (name === 'email') value = value.replace(/\s+/g, '');


    // Mobiles: only digits, max 10
    if (['mobileNo', 'alternateNo', 'emergencyNo'].includes(name)) {
      value = value.replace(/\D+/g, '').slice(0, 10);
    }


    // EmpId: no spaces
    if (name === 'empId') value = value.replace(/\s+/g, '');


    // Banking
    if (name === 'accountNumber') value = value.replace(/\D/g, '').slice(0, 18);
    if (name === 'ifscCode') value = value.toUpperCase();
    if (name === 'basicSalary') value = value.replace(/\D/g, '');


    // Password: hard cap 14
    if (name === 'password' || name === 'confirmPassword') value = value.slice(0, 14);
    // LIVE errors for banking fields (show while typing)
    if (name === 'accountHolderName') {
      const v = value.trim();
      if (v && !/^[A-Za-z ]+$/.test(v)) setErr('accountHolderName', 'Please enter the valid account holder name.');
      else clearErr('accountHolderName');
    }
    if (name === 'accountNumber') {
      const v = value;
      if (v && (v.length < 9 || v.length > 18)) setErr('accountNumber', 'Please enter the valid account number.');
      else clearErr('accountNumber');
    }

    if (name === 'basicSalary') {
      const v = value;
      if (v && +v <= 0) setErr('basicSalary', 'Please enter basic salary more than 0.');
      else clearErr('basicSalary');
    }
    if (name === 'department') {
      const v = value.trim();
      if (!v) setErr('department', 'Please select the department.');
      else clearErr('department');
    }
    if (name === 'designation') {
      const v = value.trim();
      if (!v) {
        setErr('designation', 'Please enter the designation name.');
      } else if (v.length < 2 || v.length > 50 || !NAME_ALPHA.test(v)) {
        setErr('designation', 'Please enter the valid designation name.');
      } else {
        clearErr('designation');
      }
    }
    // 10 digits poore hote hi duplicate check
    if (name === 'mobileNo' && value.length === 10) {
      if (existingMobilesSet.has(value)) {
        setErr('mobileNo', 'Mobile number already registered with us.');
      } else if (errors.mobileNo === 'Mobile number already registered with us.') {
        clearErr('mobileNo');
      }
    }
    // When department changes: auto-set designation for CMT; for Sales, clear tier (designation set when tier selected)
    if (name === 'department') {
      setFormData(prev => {
        const next = { ...prev, department: value };
        if (value === 'CMT') next.designation = 'CMT Operation';
        else if (value === 'Sales') {
          next.salesExecutiveTier = '';
          next.designation = '';
        }
        if (value !== 'Sales') {
          next.salesExecutiveTier = '';
          next.salesShiftTiming = '';
          next.salesTeam = '';
        }
        return next;
      });
      return;
    }
    if (name === 'salesShiftTiming') {
      setFormData((prev) => {
        const next = {
          ...prev,
          salesShiftTiming: value,
          salesTeam: value === 'day_shift' ? '' : prev.salesTeam,
        };
        if (value === 'night_shift') {
          next.salesExecutiveTier = '';
          next.designation = '';
        }
        return next;
      });
      setErrors((prev) => ({ ...prev, salesShiftTiming: '', salesTeam: '', salesExecutiveTier: '' }));
      return;
    }
    if (name === 'salesTeam') {
      setFormData((prev) => ({ ...prev, salesTeam: value }));
      setErrors((prev) => ({ ...prev, salesTeam: '' }));
      return;
    }
    // When Sales Executive Tier changes and department is Sales, auto-set designation
    if (name === 'salesExecutiveTier' && formData.department === 'Sales') {
      setFormData(prev => ({ ...prev, salesExecutiveTier: value, designation: getDesignationForSalesTier(value) }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));


  };


  const validateFile = (file, maxSizeBytes = MAX_FILE_BYTES) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/jpg',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Please upload PDF ,DOC,DOCX or image files only.' };
    }
    if (file.size > maxSizeBytes) {
      return { valid: false, error: `Please upload a file less than ${(maxSizeBytes / (1024 * 1024)).toFixed(0)} mb.` };
    }
    return { valid: true };
  };


  const handleFileChange = (e) => {
    const { name, files: selected } = e.target;
    if (!selected || selected.length === 0) return;
    const list = Array.from(selected);


    const firstBad = list.map((f) => validateFile(f, MAX_FILE_BYTES)).find((r) => !r.valid);
    if (firstBad) {
      setFileErrors((prev) => ({ ...prev, [name]: firstBad.error }));
      setFiles((prev) => ({ ...prev, [name]: null }));
      setUploadStatus((prev) => ({ ...prev, [name]: { status: 'error', fileName: '' } }));
      setFileNames((prev) => ({ ...prev, [name]: '' }));
      return;
    }


    const isMulti = name === 'educationalDocs' || name === 'bankStatementOrSalarySlip';
    const value = isMulti ? list : list[0];
    setFiles((prev) => ({ ...prev, [name]: value }));


    const displayNames = isMulti ? list.map((f) => f.name).join(', ') : list[0].name;
    setFileNames((prev) => ({ ...prev, [name]: displayNames }));
    setUploadStatus((prev) => ({ ...prev, [name]: { status: 'selected', fileName: displayNames } }));


    setFileErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
  };

  const clearUploadField = React.useCallback((fieldName, isMulti) => {
    setFiles((prev) => ({ ...prev, [fieldName]: isMulti ? [] : null }));
    setFileNames((prev) => ({ ...prev, [fieldName]: '' }));
    setUploadStatus((prev) => {
      const n = { ...prev };
      delete n[fieldName];
      return n;
    });
    setFileErrors((prev) => ({ ...prev, [fieldName]: '' }));
    requestAnimationFrame(() => {
      const el = document.getElementById(fieldName);
      if (el) el.value = '';
    });
  }, []);


  // === Field validators ===
  const validateEmpId = () => {
    const v = formData.empId;
    if (!v) return setErr('empId', 'Please enter the employee id.'), false;
    if (!EMPID_ALNUM.test(v)) return setErr('empId', 'Please enter the valid employee id.'), false;
    if (!EMPID_PATTERN.test(v)) return setErr('empId', 'Please enter the valid  employee id.'), false;
    clearErr('empId'); return true;
  };
  const validatePassword = () => {
    const v = formData.password;
    if (v.length < 8) return setErr('password', 'Please enter the minimum 8 characters.'), false;
    if (v.length > 14) return setErr('password', 'Maximum 14 characters allowed.'), false;
    if (!PASSWORD_COMBO.test(v))
      return setErr('password', 'Please enter all combinations of passwords like uppercase, lowercase, and a number or symbol.'), false;
    clearErr('password'); return true;
  };
  const validateConfirmPassword = () => {
    if (formData.password !== formData.confirmPassword)
      return setErr('confirmPassword', 'Kindly ensure the  password and confirm password are the same'), false;
    clearErr('confirmPassword'); return true;
  };
  const validateFullName = () => {
    const v = formData.employeeName.trim();
    if (!v) return setErr('employeeName', 'Please enter the full name.'), false;
    if (v.length < 3) return setErr('employeeName', 'Please enter minium 3 characters.'), false;
    if (v.length > 50 || !NAME_ALPHA.test(v)) return setErr('employeeName', 'Please enter the valid full name.'), false;
    clearErr('employeeName'); return true;
  };
  const validateGender = () => { if (!formData.sex) return setErr('sex', 'Please select the gender.'), false; clearErr('sex'); return true; };
  const validateEmail = () => {
    const v = formData.email;
    if (!v) return setErr('email', 'Please enter the email id.'), false;
    if (/\s/.test(v) || !EMAIL_PATTERN.test(v)) return setErr('email', 'Please enter the valid email id.'), false;
    clearErr('email'); return true;
  };
  const validateMobile = () => {
    const v = formData.mobileNo;
    if (!v) return setErr('mobileNo', 'Please enter the mobile number.'), false;
    if (!MOBILE_PATTERN.test(v)) return setErr('mobileNo', 'Please enter the valid mobile number.'), false;
    if (existingMobilesSet.has(v)) return setErr('mobileNo', 'Mobile number already registered with us.'), false;
    clearErr('mobileNo'); return true;
  };
  const validateAlternate = () => {
    const v = formData.alternateNo;
    if (!v) { clearErr('alternateNo'); return true; }
    if (!MOBILE_PATTERN.test(v)) return setErr('alternateNo', 'Please enter the valid mobile number.'), false;
    if (v === formData.mobileNo) return setErr('alternateNo', 'Alternate Mobile Number should not be the same as Mobile Number. !'), false;
    clearErr('alternateNo'); return true;
  };
  const validateEmergency = () => {
    const v = formData.emergencyNo;
    if (!v) return setErr('emergencyNo', 'Please enter the mobile number.'), false;
    if (!MOBILE_PATTERN.test(v)) return setErr('emergencyNo', 'Please enter the valid mobile number.'), false;
    clearErr('emergencyNo'); return true;
  };
  const validateDept = () => {
    const v = formData.department.trim();
    if (!v) {
      setErr('department', 'Please select the department.');
      return false;
    }
    if (!DEPARTMENT_OPTIONS.includes(v)) {
      setErr('department', 'Please select a valid department.');
      return false;
    }
    clearErr('department');
    return true;
  };


  const validateDesignation = () => {
    if (formData.department === 'Sales' && formData.salesShiftTiming === 'night_shift') {
      clearErr('designation');
      return true;
    }
    const v = formData.designation.trim();
    if (!v) return setErr('designation', 'Please enter the designation name.'), false;
    if (v.length < 2 || v.length > 50 || !NAME_ALPHA.test(v)) return setErr('designation', 'Please enter the valid designation name.'), false;
    clearErr('designation'); return true;
  };
  const validateAccountHolderName = () => {
    const v = (formData.accountHolderName || '').trim();
    if (!v) { clearErr('accountHolderName'); return true; }
    if (!/^[A-Za-z ]+$/.test(v)) return setErr('accountHolderName', 'Please enter the valid account holder name.'), false;
    clearErr('accountHolderName'); return true;
  };
  const validateAccountNumber = () => {
    const v = (formData.accountNumber || '').trim();
    if (!v) { clearErr('accountNumber'); return true; }
    if (v.length < 9 || v.length > 18) return setErr('accountNumber', 'Please enter the valid account number.'), false;
    clearErr('accountNumber'); return true;
  };

  const validateBasicSalary = () => {
    const v = (formData.basicSalary || '').trim();
    if (!v) { clearErr('basicSalary'); return true; }
    if (+v <= 0) return setErr('basicSalary', 'Please enter basic salary more than 0.'), false;
    clearErr('basicSalary'); return true;
  };


  const handleBlur = (field) => {
    const map = {
      empId: validateEmpId,
      password: validatePassword,
      confirmPassword: validateConfirmPassword,
      employeeName: validateFullName,
      sex: validateGender,
      email: validateEmail,
      mobileNo: validateMobile,
      alternateNo: validateAlternate,
      emergencyNo: validateEmergency,
      department: validateDept,
      designation: validateDesignation,
      salesExecutiveTier: validateSalesExecutiveTier,
      dateOfBirth: validateDob,
      dateOfJoining: validateDoj,
      accountHolderName: validateAccountHolderName,
      accountNumber: validateAccountNumber,
      basicSalary: validateBasicSalary,
    };
    map[field]?.();
  };


  const validateDob = () => {
    const v = formData.dateOfBirth;
    if (!v || v > maxDOB) return setErr('dateOfBirth', 'Please select the date of birth.'), false;
    clearErr('dateOfBirth'); return true;
  };
  const validateDoj = () => {
    const v = formData.dateOfJoining;
    if (!v || v > maxDOJ) return setErr('dateOfJoining', 'Please select the date of joining.'), false;
    clearErr('dateOfJoining'); return true;
  };


  // Function to convert date from YYYY-MM-DD to DD-MM-YYYY format
  const formatDateForAPI = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };


  // === Scroll-to-first-invalid setup ===
  const fieldRefs = useRef({});
  const fieldOrder = useMemo(() => [
    'empId', 'password', 'confirmPassword', 'employeeName', 'sex', 'email', 'mobileNo',
    'alternateNo', 'emergencyNo', 'department', 'salesShiftTiming', 'salesTeam', 'salesExecutiveTier', 'designation', 'dateOfBirth', 'dateOfJoining',
    // banking
    'accountHolderName', 'accountNumber', 'ifscCode', 'basicSalary'
  ], []);


  const validateSalesExecutiveTier = () => {
    if (formData.department !== 'Sales' || formData.salesShiftTiming !== 'day_shift') return true;
    if (!formData.salesExecutiveTier) return setErr('salesExecutiveTier', 'Please select Sales Executive Tier.'), false;
    clearErr('salesExecutiveTier');
    return true;
  };

  const validateSalesShiftTiming = () => {
    if (formData.department !== 'Sales') return true;
    if (!formData.salesShiftTiming) return setErr('salesShiftTiming', 'Please select Team Category.'), false;
    if (!['day_shift', 'night_shift'].includes(formData.salesShiftTiming)) {
      return setErr('salesShiftTiming', 'Please select a valid Team Category.'), false;
    }
    clearErr('salesShiftTiming');
    return true;
  };

  const validateSalesTeam = () => {
    if (formData.department !== 'Sales' || formData.salesShiftTiming !== 'night_shift') return true;
    if (!formData.salesTeam) return setErr('salesTeam', 'Please select Team name.'), false;
    if (!['rate_request_team', 'operation_team'].includes(formData.salesTeam)) {
      return setErr('salesTeam', 'Please select a valid team.'), false;
    }
    clearErr('salesTeam');
    return true;
  };

  const validatorsMap = {
    empId: validateEmpId,
    password: validatePassword,
    confirmPassword: validateConfirmPassword,
    employeeName: validateFullName,
    sex: validateGender,
    email: validateEmail,
    mobileNo: validateMobile,
    alternateNo: validateAlternate,
    emergencyNo: validateEmergency,
    department: validateDept,
    designation: validateDesignation,
    salesExecutiveTier: validateSalesExecutiveTier,
    salesShiftTiming: validateSalesShiftTiming,
    salesTeam: validateSalesTeam,
    dateOfBirth: validateDob,
    dateOfJoining: validateDoj,
    accountHolderName: validateAccountHolderName,
    accountNumber: validateAccountNumber,
    basicSalary: validateBasicSalary,
  };


  const scrollToField = (name) => {
    const el = fieldRefs.current[name];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    try { el.focus({ preventScroll: true }); } catch { }
    el.classList.add('ring-2', 'ring-red-400');
    setTimeout(() => el.classList.remove('ring-2', 'ring-red-400'), 1200);
  };


  const handleSubmit = async (e) => {
    e.preventDefault();


    // validators in order
    let firstInvalid = null;
    for (const name of fieldOrder) {
      const fn = validatorsMap[name];
      if (fn && !fn()) { firstInvalid = name; break; }
    }
    if (firstInvalid) { scrollToField(firstInvalid); return; }


    setIsSubmitting(true);


    try {
      const submitData = new FormData();


      // Dates => DD-MM-YYYY (API requirement)
      Object.entries(formData).forEach(([key, val]) => {
        if (key === 'dateOfBirth' || key === 'dateOfJoining') {
          submitData.append(key, formatDateForAPI(val));
        } else {
          submitData.append(key, val);
        }
      });


      // Files + upload status
      Object.entries(files).forEach(([key, val]) => {
        if (Array.isArray(val)) {
          val.forEach((file) => submitData.append(key, file));
        } else if (val) {
          submitData.append(key, val);
        }
        if (val && ((Array.isArray(val) && val.length) || !Array.isArray(val))) {
          setUploadStatus((prev) => ({
            ...prev,
            [key]: {
              status: 'uploading',
              fileName: Array.isArray(val) ? val[0]?.name : val.name,
            },
          }));
        }
      });


      // API call
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/v1/inhouseUser`,
        submitData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: true,
          timeout: 60000,
          onUploadProgress: (pe) => {
            const pct = Math.round((pe.loaded * 100) / (pe.total || 1));

          },
        }
      );

      // Mark success for any selected file
      Object.keys(files).forEach((key) => {
        const val = files[key];
        if (val && ((Array.isArray(val) && val.length) || !Array.isArray(val))) {
          setUploadStatus((prev) => ({
            ...prev,
            [key]: {
              status: 'success',
              fileName: Array.isArray(val) ? val[0]?.name : val.name,
            },
          }));
        }
      });


      setShowSuccess(true);


    } catch (err) {
      console.error('Error details:', err);


      // Mark error for any selected file
      Object.keys(files).forEach((key) => {
        const val = files[key];
        if (val && ((Array.isArray(val) && val.length) || !Array.isArray(val))) {
          setUploadStatus((prev) => ({
            ...prev,
            [key]: {
              status: 'error',
              fileName: Array.isArray(val) ? val[0]?.name : val.name,
            },
          }));
        }
      });


      // ---- Field-wise error mapping (duplicates + enums etc.) ----
      const res = err?.response;
      const rawMsg = res?.data?.message || res?.data || err?.message || '';
      const msg = String(rawMsg);
      let handledFieldError = false;


      // Mongo duplicate key pattern: E11000 ... dup key: { email: "x@y.com" }
      const dupKeyMatch = msg.match(/dup key:\s*\{\s*([^:]+):\s*"?([^"}]+)"?\s*\}/i);
      if (dupKeyMatch) {
        const field = dupKeyMatch[1].trim().toLowerCase();
        const setDup = (k, text) => {
          setErrors((p) => ({ ...p, [k]: text }));
          scrollToField(k);
        };
        if (field.includes('empid') || field === 'empid' || field.includes('employeeid')) {
          setDup('empId', 'Employee already registered with this Employee ID.');
          handledFieldError = true;
        } else if (field.includes('email')) {
          setDup('email', 'Employee already registered with this email.');
          handledFieldError = true;
        } else if (field.includes('mobile') || field.includes('mobileno') || field.includes('phone')) {
          setDup('mobileNo', 'Mobile number already registered with us.');
          handledFieldError = true;
        }
      }


      if (!handledFieldError) {
        const lower = msg.toLowerCase();
        const setInline = (k, text) => {
          setErrors((p) => ({ ...p, [k]: text }));
          scrollToField(k);
        };


        // Human-readable duplicate messages
        if (!handledFieldError && lower.includes('emp') && lower.includes('already')) {
          setInline('empId', 'Employee already registered with this Employee ID.');
          handledFieldError = true;
        }
        if (!handledFieldError && lower.includes('email') && lower.includes('already')) {
          setInline('email', 'Employee already registered with this email.');
          handledFieldError = true;
        }
        if (!handledFieldError && (lower.includes('mobile') || lower.includes('phone')) && (lower.includes('already') || lower.includes('exist') || lower.includes('duplicate'))) {
          setInline('mobileNo', 'Mobile number already registered with us.');
          handledFieldError = true;
        }
        // HTTP 409 (conflict) fallback
        if (!handledFieldError && res?.status === 409) {
          setInline('mobileNo', 'Mobile number already registered with us.');
          handledFieldError = true;
        }
        // 🔴 ENUM (Department) → inline error (NO POPUP)
        if (
          !handledFieldError &&
          (
            /is not a valid enum value for path [`'"]department[`'"]/.test(lower) ||
            (lower.includes('department') && lower.includes('enum') && lower.includes('valid'))
          )
        ) {
          setInline('department', 'Please select a valid department.');
          handledFieldError = true;
        }
      }


      // Agar field-level error handle ho gaya, to generic popup NAHIN dikhana
      if (handledFieldError) {
        setIsSubmitting(false);
        return;
      }


      // Fallback generic modal
      let errorMessage = 'Failed to add user';
      if (err.response) {
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        errorMessage = 'Network error. Please check your connection.';
      } else {
        errorMessage = err.message;
      }
      setErrorModal(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };


  const getFileStatusIcon = (status) => {
    switch (status) {
      case 'selected': return '📁';
      case 'uploading': return '⏳';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '📄';
    }
  };
  const getFileStatusColor = (status) => {
    switch (status) {
      case 'selected': return 'text-blue-600';
      case 'uploading': return 'text-yellow-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };


  // helper for key filtering
  const allowKey = (e, type) => {
    const nav = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
    if (nav.includes(e.key)) return;
    if (type === 'digit' && !/^\d$/.test(e.key)) e.preventDefault();
    if (type === 'ifsc' && !/^[A-Za-z0-9]$/.test(e.key)) e.preventDefault();
  };


  // success text (create vs update)
  const successTitle = mode === 'create' ? 'User Created Successfully!' : 'User Updated Successfully!';
  const successSubtitle = mode === 'create'
    ? 'The user has been added to the system.'
    : 'The user details have been saved.';

  const fieldInputClass = (fieldName, section = 'blue') => {
    const base =
      'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors placeholder:text-gray-500 hover:border-gray-400 focus:border-gray-400';
    if (errors[fieldName]) {
      return `${base} border-red-500 focus:ring-red-200 bg-red-50`;
    }
    const fill = {
      orange: 'bg-orange-50',
      blue: 'bg-blue-50',
      teal: 'bg-teal-50',
      amber: 'bg-amber-50',
    }[section] || 'bg-blue-50';
    return `${base} ${fill}`;
  };

  const renderOneField = (field, section = 'blue') => {
    const isPwd = field.name === 'password' || field.name === 'confirmPassword';
    const isGender = field.name === 'sex';
    const isDepartment = field.name === 'department';
    const isDesignation = field.name === 'designation';
    const isDate = field.type === 'date';
    const isEmail = field.name === 'email';
    const isMobileish = ['mobileNo', 'alternateNo', 'emergencyNo'].includes(field.name);
    const designationAuto = formData.department === 'CMT'
      ? 'CMT Operation'
      : formData.department === 'Sales' && formData.salesShiftTiming === 'day_shift'
        ? getDesignationForSalesTier(formData.salesExecutiveTier) || null
        : null;

    return (
      <div key={field.name} className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700 flex items-center">
          <span className="mr-2 text-base">{field.icon}</span>
          {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {isDepartment ? (
          <>
            <SearchableSelect
              ref={(el) => { fieldRefs.current.department = el; }}
              value={formData.department}
              onChange={(val) => handleInputChange({ target: { name: 'department', value: val } })}
              options={DEPARTMENT_SELECT_OPTIONS}
              placeholder="Select Department"
              hasError={!!errors.department}
              className="w-full"
              surface="teal"
            />
            {errors.department && <p className="text-red-600 text-xs">{errors.department}</p>}
          </>
        ) : isDesignation ? (
          <>
            <input
              ref={(el) => (fieldRefs.current.designation = el)}
              name="designation"
              type="text"
              placeholder={designationAuto ? '' : (field.placeholder || 'Enter designation')}
              value={designationAuto ?? formData.designation}
              onChange={handleInputChange}
              onBlur={() => handleBlur('designation')}
              readOnly={!!designationAuto}
              className={`${fieldInputClass('designation', 'teal')} ${designationAuto ? 'bg-teal-100/80 cursor-not-allowed border-gray-300' : ''}`}
              maxLength={50}
            />
            {errors.designation && <p className="text-red-600 text-xs">{errors.designation}</p>}
          </>
        ) : isGender ? (
          <>
            <SearchableSelect
              ref={(el) => { fieldRefs.current.sex = el; }}
              value={formData.sex}
              onChange={(val) => handleInputChange({ target: { name: 'sex', value: val } })}
              options={GENDER_SELECT_OPTIONS}
              placeholder="Select Gender"
              hasError={!!errors.sex}
              className="w-full"
              surface="blue"
            />
            {errors.sex && <p className="text-red-600 text-xs">{errors.sex}</p>}
          </>
        ) : isPwd ? (
          <>
            <div className="relative">
              <input
                ref={(el) => (fieldRefs.current[field.name] = el)}
                name={field.name}
                type={showPassword ? 'text' : 'password'}
                placeholder={field.placeholder}
                value={formData[field.name]}
                onChange={handleInputChange}
                onBlur={() => handleBlur(field.name)}
                maxLength={14}
                className={`${fieldInputClass(field.name, section)} pr-10`}
              />
              <button
                type="button"
                title={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a10.05 10.05 0 012.708-4.442M9.88 9.88a3 3 0 104.24 4.24M6.1 6.1l11.8 11.8" />
                  </svg>
                )}
              </button>
            </div>
            {errors[field.name] && <p className="text-red-600 text-xs whitespace-pre-line">{errors[field.name]}</p>}
            {field.name === 'password' && (
              <p className="text-[10px] leading-snug text-gray-500">8–14 characters. Include uppercase, lowercase, and a number or symbol.</p>
            )}
          </>
        ) : (
          <>
            <input
              ref={(el) => (fieldRefs.current[field.name] = el)}
              name={field.name}
              type={field.type || 'text'}
              placeholder={field.placeholder || `Enter ${field.label}`}
              value={formData[field.name]}
              onChange={handleInputChange}
              onBlur={() => handleBlur(field.name)}
              onKeyDown={(e) => {
                if (isEmail || isMobileish) {
                  if (e.key === ' ') e.preventDefault();
                }
                if (isMobileish) allowKey(e, 'digit');
              }}
              max={
                isDate
                  ? (field.name === 'dateOfBirth' ? maxDOB : field.name === 'dateOfJoining' ? maxDOJ : undefined)
                  : undefined
              }
              onClick={(e) => {
                if (isDate) {
                  try { e.target.showPicker?.(); } catch { /* noop */ }
                }
              }}
              onFocus={(e) => {
                if (isDate) {
                  try { e.target.showPicker?.(); } catch { /* noop */ }
                }
              }}
              inputMode={isMobileish ? 'numeric' : undefined}
              maxLength={
                isMobileish
                  ? 10
                  : (['employeeName', 'aliasName', 'department', 'designation'].includes(field.name) ? 50 : undefined)
              }
              className={fieldInputClass(field.name, section)}
            />
            {errors[field.name] && <p className="text-red-600 text-xs">{errors[field.name]}</p>}
          </>
        )}
      </div>
    );
  };

  const renderSalesFields = () =>
    formData.department === 'Sales' ? (
      <>
        <div className="space-y-2 md:col-span-1">
          <label className="block text-sm font-semibold text-gray-700 flex items-center">
            <span className="mr-2 text-base">🌐</span>
            Team Category <span className="text-red-500 ml-1">*</span>
          </label>
          <SearchableSelect
            ref={(el) => { fieldRefs.current.salesShiftTiming = el; }}
            value={formData.salesShiftTiming}
            onChange={(val) => handleInputChange({ target: { name: 'salesShiftTiming', value: val } })}
            options={SALES_SHIFT_SELECT_OPTIONS}
            placeholder="Select Team Category"
            hasError={!!errors.salesShiftTiming}
            className="w-full"
            surface="teal"
          />
          {errors.salesShiftTiming && <p className="text-red-600 text-xs">{errors.salesShiftTiming}</p>}
        </div>
        {formData.salesShiftTiming === 'night_shift' && (
          <div className="space-y-2 md:col-span-1">
            <label className="block text-sm font-semibold text-gray-700 flex items-center">
              <span className="mr-2 text-base">👥</span>
              Team name <span className="text-red-500 ml-1">*</span>
            </label>
            <SearchableSelect
              ref={(el) => { fieldRefs.current.salesTeam = el; }}
              value={formData.salesTeam}
              onChange={(val) => handleInputChange({ target: { name: 'salesTeam', value: val } })}
              options={SALES_TEAM_SELECT_OPTIONS}
              placeholder="Select Team name"
              hasError={!!errors.salesTeam}
              className="w-full"
              surface="teal"
            />
            {errors.salesTeam && <p className="text-red-600 text-xs">{errors.salesTeam}</p>}
          </div>
        )}
        {formData.salesShiftTiming === 'day_shift' && (
          <div className="space-y-2 md:col-span-1">
            <label className="block text-sm font-semibold text-gray-700 flex items-center">
              <span className="mr-2 text-base">📊</span>
              Sales Executive Tier <span className="text-red-500 ml-1">*</span>
            </label>
            <SearchableSelect
              ref={(el) => { fieldRefs.current.salesExecutiveTier = el; }}
              value={formData.salesExecutiveTier}
              onChange={(val) => handleInputChange({ target: { name: 'salesExecutiveTier', value: val } })}
              options={SALES_TIER_SELECT_OPTIONS}
              placeholder="Select Tier"
              hasError={!!errors.salesExecutiveTier}
              className="w-full"
              surface="teal"
            />
            {errors.salesExecutiveTier && <p className="text-red-600 text-xs">{errors.salesExecutiveTier}</p>}
          </div>
        )}
      </>
    ) : null;

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto hide-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — matches DeliveryOrder Add modal */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <PlusCircle className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Add New User</h2>
                <p className="text-blue-100">Create a new user account</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <form noValidate onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Account & login — orange tint matches heading */}
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
              <h3 className="text-lg font-semibold text-orange-800 mb-4">Account & login</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {initialFields.slice(0, 3).map((field) => renderOneField(field, 'orange'))}
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">Personal information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {initialFields.slice(3, 10).map((field) => renderOneField(field, 'blue'))}
                {initialFields.slice(12, 14).map((field) => renderOneField(field, 'blue'))}
              </div>
            </div>

            <div className="bg-teal-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-teal-800 mb-4">Department & organization</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {renderOneField(initialFields[10], 'teal')}
                {formData.department === 'Sales' && renderSalesFields()}
                {renderOneField(initialFields[11], 'teal')}
              </div>
            </div>

            {/* Identity Docs */}
            <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 via-green-50/40 to-white p-5 shadow-sm ring-1 ring-emerald-100/60">
              <div className="mb-4 flex flex-col gap-1 border-b border-emerald-100/90 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-emerald-900">Identity documents</h3>
                  <p className="mt-0.5 text-sm text-emerald-800/70">Govt. ID, education, and bank-related proofs</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {ID_DOCS.map((doc) => {
                  const sel = files[doc.key];
                  const hasSel = hasUploadSelection(sel);
                  return (
                  <div key={doc.key} className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 flex items-center">
                      <span className="mr-2">{doc.icon}</span>
                      {doc.label} {doc.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        id={doc.key}
                        name={doc.key}
                        multiple={!!doc.multiple}
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label
                        htmlFor={doc.key}
                        className="block w-full px-3 py-2.5 border border-dashed border-green-300/90 rounded-lg text-center cursor-pointer hover:bg-green-100/50 hover:border-green-400 transition-all duration-300 bg-green-100/30 text-sm"
                      >
                        {hasSel ? (
                          <div className="flex flex-col items-center gap-1 min-h-[4.5rem] justify-center">
                            <UploadSlotPreview
                              file={doc.multiple ? undefined : sel}
                              files={doc.multiple ? sel : undefined}
                              onClear={() => clearUploadField(doc.key, !!doc.multiple)}
                              clearDisabled={isSubmitting}
                            />
                            <span className="text-[10px] text-green-700 font-medium">
                              {doc.multiple ? 'Tap to add or change' : 'Tap to change'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <div className="w-7 h-7 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-1 shadow">
                              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                              </svg>
                            </div>
                            <span className="text-xs font-semibold text-green-800">Upload</span>
                            <span className="text-[11px] text-gray-500 mt-0.5">{doc.multiple ? 'Select files' : 'Browse'}</span>
                          </div>
                        )}
                      </label>
                      {fileNames[doc.key] && !hasSel && (
                        <p className="text-[11px] mt-1.5 text-gray-600 truncate">Selected: {fileNames[doc.key]}</p>
                      )}
                      {fileErrors[doc.key] && (
                        <p className="text-xs mt-1 text-red-600">{fileErrors[doc.key]}</p>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>


            {/* Previous Company Docs */}
            <div className="rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/90 via-violet-50/30 to-white p-5 shadow-sm ring-1 ring-indigo-100/60">
              <div className="mb-4 flex flex-col gap-1 border-b border-indigo-100/90 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-indigo-900">Previous company documents</h3>
                  <p className="mt-0.5 text-sm text-indigo-800/70">Employment letters and compensation proof</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  { key: 'releaseLetter', label: 'Release Letter', icon: '📄' },
                  { key: 'offerLetter', label: 'Offer Letter', icon: '📋' },
                  { key: 'experienceLetter', label: 'Experience Letter', icon: '📝' },
                  { key: 'bankStatementOrSalarySlip', label: 'Bank Statement/Salary Slip', icon: '💰' }
                ].map((doc) => {
                  const raw = files[doc.key];
                  const multi = doc.key === 'bankStatementOrSalarySlip';
                  const hasSel = hasUploadSelection(raw);
                  return (
                  <div key={doc.key} className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 flex items-center">
                      <span className="mr-2">{doc.icon}</span>
                      {doc.label}
                    </label>
                    {fileErrors[doc.key] && (
                      <p className="text-xs mt-1 text-red-600">{fileErrors[doc.key]}</p>
                    )}
                    <div className="relative">
                      <input
                        type="file"
                        id={doc.key}
                        name={doc.key}
                        multiple={multi}
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={isSubmitting}
                      />
                      <label
                        htmlFor={doc.key}
                        className={`block w-full px-3 py-2.5 border border-dashed rounded-lg text-center text-sm transition-all duration-300 bg-indigo-100/25 ${isSubmitting
                          ? 'border-gray-300 cursor-not-allowed opacity-50'
                          : 'border-purple-300/90 cursor-pointer hover:bg-indigo-100/40 hover:border-purple-400'
                          }`}
                      >
                        {hasSel ? (
                          <div className="flex flex-col items-center gap-1 min-h-[4.5rem] justify-center">
                            <UploadSlotPreview
                              file={multi ? undefined : raw}
                              files={multi ? raw : undefined}
                              onClear={() => clearUploadField(doc.key, multi)}
                              clearDisabled={isSubmitting}
                            />
                            <span className="text-[10px] text-purple-800 font-medium">
                              {multi ? 'Tap to add or change' : 'Tap to change'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <div className="w-7 h-7 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-1 shadow">
                              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                              </svg>
                            </div>
                            <span className="text-xs font-semibold text-purple-800">Upload</span>
                            <span className="text-[11px] text-gray-500 mt-0.5">Browse</span>
                          </div>
                        )}
                      </label>
                      {uploadStatus[doc.key] && !hasSel && (
                        <div className="mt-2 px-2 py-1.5 rounded-md border border-indigo-200/80 bg-indigo-50/60 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm">{getFileStatusIcon(uploadStatus[doc.key].status)}</span>
                            <span className={`text-xs font-medium truncate ${getFileStatusColor(uploadStatus[doc.key].status)}`}>
                              {uploadStatus[doc.key].fileName}
                            </span>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${uploadStatus[doc.key].status === 'success' ? 'bg-green-100 text-green-800' :
                            uploadStatus[doc.key].status === 'error' ? 'bg-red-100 text-red-800' :
                              uploadStatus[doc.key].status === 'uploading' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                            }`}>
                            {uploadStatus[doc.key].status}
                          </span>
                        </div>
                      )}
                      {fileNames[doc.key] && !hasSel && (
                        <p className="text-[11px] mt-1.5 text-gray-600 truncate">Selected: {fileNames[doc.key]}</p>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>


            {/* Banking & salary */}
            <div className="bg-amber-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-amber-900 mb-4">Banking & salary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {initialFields.slice(14).map((field) => {
                  const isNumeric = field.name === 'accountNumber' || field.name === 'basicSalary';
                  const isIFSC = field.name === 'ifscCode';
                  const isDate = field.type === 'date';


                  return (
                    <div key={field.name} className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700 flex items-center">
                        <span className="mr-2 text-base">{field.icon}</span>
                        {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <input
                        ref={(el) => (fieldRefs.current[field.name] = el)}
                        name={field.name}
                        type={field.type || 'text'}
                        placeholder={field.placeholder}
                        value={formData[field.name]}
                        onChange={handleInputChange}
                        onBlur={() => handleBlur(field.name)}
                        onClick={(e) => {
                          if (isDate) {
                            try { e.target.showPicker?.(); } catch { /* noop */ }
                          }
                        }}
                        onFocus={(e) => {
                          if (isDate) {
                            try { e.target.showPicker?.(); } catch { /* noop */ }
                          }
                        }}
                        onKeyDown={(e) => {
                          if (isNumeric) allowKey(e, 'digit');
                          if (isIFSC) allowKey(e, 'ifsc');
                        }}
                        max={isDate && field.name === 'dateOfJoining' ? maxDOJ : undefined}
                        inputMode={isNumeric ? 'numeric' : undefined}
                        pattern={isNumeric ? '\\d*' : isIFSC ? '[A-Za-z0-9]*' : undefined}
                        maxLength={field.name === 'accountNumber' ? 18 : field.name === 'ifscCode' ? 11 : undefined}
                        className={fieldInputClass(field.name, 'amber')}
                      />
                      {errors[field.name] && <p className="text-red-600 text-xs">{errors[field.name]}</p>}
                    </div>
                  );
                })}
              </div>
            </div>


            {/* Submit - same as DeliveryOrder form */}
            <div className="flex justify-end space-x-6 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className={`px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold transition-all duration-300 ${isSubmitting
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-gray-50 hover:border-gray-400'
                  }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold transition-all duration-300 ${isSubmitting
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:from-blue-600 hover:to-blue-700'
                  }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating User...</span>
                  </div>
                ) : ('Create User')}
              </button>
            </div>
          </form>
      </div>


      {/* Styled SUCCESS modal (no window popup) */}
      {showSuccess && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          onClick={() => setShowSuccess(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-[90%] max-w-md shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">✅</div>
            <h3 className="text-lg font-bold mb-1">{successTitle}</h3>
            <p className="text-sm text-gray-600 mb-5">{successSubtitle}</p>
            <button
              onClick={() => { setShowSuccess(false); onClose(); }}
              className="px-5 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
            >
              OK
            </button>
          </div>
        </div>
      )}


      {/* Intercepted window.alert → show as in-app notice */}
      {interceptedAlert && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center bg-black/40"
          onClick={() => setInterceptedAlert(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-[90%] max-w-md shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-2">Notice</h3>
            <p className="text-sm text-gray-700 mb-5">{interceptedAlert}</p>
            <button
              onClick={() => setInterceptedAlert('')}
              className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              OK
            </button>
          </div>
        </div>
      )}


      {/* Error modal (instead of alert) */}
      {errorModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50"
          onClick={() => setErrorModal(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-[90%] max-w-md shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">❌</div>
            <h3 className="text-lg font-bold mb-1">Error</h3>
            <p className="text-sm text-gray-700 mb-5">{errorModal}</p>
            <button
              onClick={() => setErrorModal(null)}
              className="px-5 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


export default AddUserModal;



