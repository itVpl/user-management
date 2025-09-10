import React, { useMemo, useRef, useState } from 'react';
import axios from 'axios';

const AddUserModal = ({ onClose }) => {
  // === Regex & helpers ===
  const EMPID_ALNUM = /^[A-Za-z0-9]+$/;
  const EMPID_PATTERN = /^VPL\d{3,}$/;                     // e.g., VPL001
  const NAME_ALPHA = /^[A-Za-z ]+$/;                    // alphabets + space
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;   // supports .com.in
  const MOBILE_PATTERN = /^[6-9]\d{9}$/;                    // 10 digits, start 6–9
  const PASSWORD_COMBO = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W]).{8,14}$/; // 8–14
  const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/; // SBIN0XXXXXX
  // 10 MB in BYTES
  const MAX_FILE_BYTES = 10 * 1024 * 1024;


  const ID_DOCS = [
    { key: 'pancard', label: 'PAN Card', required: false, icon: '🆔' },
    { key: 'aadharcard', label: 'Aadhaar Card', required: false, icon: '🆔' }, // spelling fixed
    { key: 'educationalDocs', label: 'Educational Documents', required: false, multiple: true, icon: '📚' },
  ];

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
    { name: 'sex', placeholder: 'Sex', required: true, label: 'Gender', icon: '⚧' },
    { name: 'email', placeholder: 'Enter E-mail', required: true, label: 'Email Address', type: 'email', icon: '📧' },
    { name: 'mobileNo', placeholder: 'Mobile no.', required: true, label: 'Mobile Number', icon: '📱' },
    { name: 'alternateNo', placeholder: 'Alternate mobile no.', /* optional */ label: 'Alternate Number', icon: '📞' },
    { name: 'emergencyNo', placeholder: 'Emergency no.', required: true, label: 'Emergency Contact', icon: '🚨' },
    // { name: 'sex', placeholder: 'Sex', required: true, label: 'Gender', icon: '⚧', type: 'select' },
    { name: 'department', placeholder: 'Department', required: true, label: 'Department', icon: '🏢' },
    { name: 'designation', placeholder: 'Enter Designation', required: true, label: 'Designation', icon: '💼' },
    { name: 'dateOfBirth', placeholder: 'Date of Birth', type: 'date', required: true, label: 'Date of Birth', icon: '🎂' },
    { name: 'dateOfJoining', placeholder: 'Date of Joining', type: 'date', required: true, label: 'Date of Joining', icon: '📅' },
    { name: 'accountHolderName', placeholder: 'Account Holder Name', label: 'Account Holder Name', icon: '👤' },
    { name: 'accountNumber', placeholder: 'Account Number', label: 'Account Number', icon: '🏦' },
    { name: 'ifscCode', placeholder: 'IFSC Code', label: 'IFSC Code', icon: '🏛️' },
    { name: 'basicSalary', placeholder: 'Basic Salary', label: 'Basic Salary', icon: '💰' }
  ];

  const [formData, setFormData] = useState(
    initialFields.reduce((acc, field) => ({ ...acc, [field.name]: '' }), { role: 'superadmin' })
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
  // inline errors + eye icon
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(true); // password visible by default (eye open)
  const [fileErrors, setFileErrors] = useState({}); // { pancard: 'msg', ... }
  const [fileNames, setFileNames] = useState({});   // { pancard: 'a.pdf, b.pdf', ... }
  const [showSuccess, setShowSuccess] = useState(false); // success modal

  const setErr = (k, m) => setErrors(p => ({ ...p, [k]: m }));
  const clearErr = (k) => setErrors(p => { const n = { ...p }; delete n[k]; return n; });

  const handleInputChange = (e) => {
    const { name } = e.target;
    let { value } = e.target;

    // Name: only letters + single spaces
    if (name === 'employeeName') {
      // sirf letters + single spaces, aur max 50 chars
      value = value
        .replace(/[^A-Za-z\s]/g, '')   // non-letters hatao
        .replace(/\s{2,}/g, ' ')       // multiple spaces -> single
        .slice(0, 50);                 // hard cap 50
    }

    // Email: no spaces
    if (name === 'email') {
      value = value.replace(/\s+/g, '');
    }

    // Mobiles: only digits, max 10
    if (['mobileNo', 'alternateNo', 'emergencyNo'].includes(name)) {
      value = value.replace(/\D+/g, '').slice(0, 10);
    }

    // EmpId: no spaces
    if (name === 'empId') {
      value = value.replace(/\s+/g, '');
    }
    // Department: sirf letters + single spaces, max 50
    if (name === 'department') {
      value = value
        .replace(/[^A-Za-z\s]/g, '')   // non-letters hatao
        .replace(/\s{2,}/g, ' ')       // multiple spaces -> single
        .slice(0, 50);                 // hard cap 50
    }
    // Designation: sirf letters + single spaces, max 50
    if (name === 'designation') {
      value = value
        .replace(/[^A-Za-z\s]/g, '')   // non-letters hatao
        .replace(/\s{2,}/g, ' ')       // multiple spaces -> single
        .slice(0, 50);                 // hard cap 50
    }
    // Banking sanitization (yeh pehle karo, phir setFormData ek hi baar)
    if (name === 'accountHolderName') {
      value = value.replace(/[^A-Za-z\s]/g, '').replace(/\s{2,}/g, ' ').slice(0, 50);
    }
    if (name === 'accountNumber') {
      value = value.replace(/\D/g, '').slice(0, 18);
    }
    if (name === 'ifscCode') {
      value = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
    }
    if (name === 'basicSalary') {
      value = value.replace(/\D/g, '');
    }
    // Password fields: hard cap 14
    if (name === 'password' || name === 'confirmPassword') {
      value = value.slice(0, 14);
    }
    // 🔑 finally set once
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
      return {
        valid: false,
        error: 'Please upload PDF ,DOC,DOCX or image files only.'
      };
    }

    // > (strictly greater) => 10MB exactly allowed, >10MB blocked
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `Please upload a file less than ${(maxSizeBytes / (1024 * 1024)).toFixed(0)} mb.`
      };
    }

    return { valid: true };
  };



  // REPLACE your existing handleFileChange with this:
  const handleFileChange = (e) => {
    const { name, files: selected } = e.target;
    if (!selected || selected.length === 0) return;

    const list = Array.from(selected);

    // Validate each file (type + size) using validateFile + MAX_FILE_BYTES
    const firstBad = list
      .map((f) => validateFile(f, MAX_FILE_BYTES))
      .find((r) => !r.valid);

    if (firstBad) {
      // show error below field, clear selection
      setFileErrors((prev) => ({ ...prev, [name]: firstBad.error }));
      setFiles((prev) => ({ ...prev, [name]: null }));
      setUploadStatus((prev) => ({ ...prev, [name]: { status: 'error', fileName: '' } }));
      setFileNames((prev) => ({ ...prev, [name]: '' }));
      return;
    }

    // Multiple files allow only for these fields
    const isMulti = name === 'educationalDocs' || name === 'bankStatementOrSalarySlip';
    const value = isMulti ? list : list[0];

    // save files
    setFiles((prev) => ({ ...prev, [name]: value }));

    // show selected names
    const displayNames = isMulti ? list.map((f) => f.name).join(', ') : list[0].name;
    setFileNames((prev) => ({ ...prev, [name]: displayNames }));

    // status badge
    setUploadStatus((prev) => ({
      ...prev,
      [name]: { status: 'selected', fileName: displayNames },
    }));

    // clear any previous error
    setFileErrors((prev) => {
      const n = { ...prev };
      delete n[name];
      return n;
    });
  };



  // === Field validators (exact messages preserved) ===
  const validateEmpId = () => {
    const v = formData.empId;
    if (!v) return setErr('empId', 'Please enter the employee id.'), false;
    if (!EMPID_ALNUM.test(v)) return setErr('empId', 'Please enter the valid employee id.'), false;
    if (!EMPID_PATTERN.test(v)) return setErr('empId', 'Please enter the valid  employee id.'), false; // note double space
    clearErr('empId'); return true;
  };

  const validatePassword = () => {
    const v = formData.password;
    if (v.length < 8) return setErr('password', 'Please enter the minimum 8 characters.'), false;
    if (v.length > 14)
      return setErr('password', 'Maximum 14 characters allowed.'), false;
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
    if (v.length > 50 || !NAME_ALPHA.test(v))
      return setErr('employeeName', 'Please enter the valid full name.'), false;
    clearErr('employeeName'); return true;
  };

  const validateGender = () => {
    if (!formData.sex) return setErr('sex', 'Please select the gender.'), false;
    clearErr('sex'); return true;
  };

  const validateEmail = () => {
    const v = formData.email;
    if (!v) return setErr('email', 'Please enter the email id.'), false;
    if (/\s/.test(v) || !EMAIL_PATTERN.test(v))
      return setErr('email', 'Please enter the valid email id.'), false;
    clearErr('email'); return true;
  };

  const validateMobile = () => {
    const v = formData.mobileNo;
    if (!v) return setErr('mobileNo', 'Please enter the mobile number.'), false;
    if (!MOBILE_PATTERN.test(v))
      return setErr('mobileNo', 'Please enter the valid mobile number.'), false;
    clearErr('mobileNo'); return true;
  };

  const validateAlternate = () => {
    const v = formData.alternateNo;
    if (!v) { clearErr('alternateNo'); return true; } // optional
    if (!MOBILE_PATTERN.test(v))
      return setErr('alternateNo', 'Please enter the valid mobile number.'), false;
    if (v === formData.mobileNo)
      return setErr('alternateNo', 'Alternate Mobile Number should not be the same as Mobile Number. !'), false;
    clearErr('alternateNo'); return true;
  };

  const validateEmergency = () => {
    const v = formData.emergencyNo;
    if (!v) return setErr('emergencyNo', 'Please enter the mobile number.'), false;
    if (!MOBILE_PATTERN.test(v))
      return setErr('emergencyNo', 'Please enter the valid mobile number.'), false;
    clearErr('emergencyNo'); return true;
  };

  const validateDept = () => {
    const v = formData.department.trim();
    if (!v) return setErr('department', 'Pleas enter the department name.'), false;
    if (v.length < 2 || v.length > 50 || !NAME_ALPHA.test(v))
      return setErr('department', 'Please enter the valid department name.'), false;
    clearErr('department'); return true;
  };

  const validateDesignation = () => {
    const v = formData.designation.trim();
    if (!v) return setErr('designation', 'Pleas enter the designation  name.'), false; // double space
    if (v.length < 2 || v.length > 50 || !NAME_ALPHA.test(v))
      return setErr('designation', 'Please enter the valid designation name.'), false;
    clearErr('designation'); return true;
  };
  const validateAccountHolderName = () => {
    const v = (formData.accountHolderName || '').trim();
    if (!v) { clearErr('accountHolderName'); return true; } // optional
    if (!/^[A-Za-z ]+$/.test(v)) return setErr('accountHolderName', 'Please enter the valid account holder name.'), false;
    clearErr('accountHolderName'); return true;
  };

  const validateAccountNumber = () => {
    const v = (formData.accountNumber || '').trim();
    if (!v) { clearErr('accountNumber'); return true; } // optional
    if (v.length < 9 || v.length > 18) return setErr('accountNumber', 'Please enter the valid account number.'), false;
    clearErr('accountNumber'); return true;
  };

  const validateIfsc = () => {
    const v = (formData.ifscCode || '').trim();
    if (!v) { clearErr('ifscCode'); return true; } // optional
    if (v.length !== 11 || !IFSC_PATTERN.test(v)) return setErr('ifscCode', 'Please enter the valid IFSC Code.'), false;
    clearErr('ifscCode'); return true;
  };

  const validateBasicSalary = () => {
    const v = (formData.basicSalary || '').trim();
    if (!v) { clearErr('basicSalary'); return true; } // optional
    if (+v <= 0) return setErr('basicSalary', 'Please enter basic salary more than 0.'), false;
    clearErr('basicSalary'); return true;
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
      dateOfBirth: validateDob,
      dateOfJoining: validateDoj,
      accountHolderName: validateAccountHolderName,
      accountNumber: validateAccountNumber,
      ifscCode: validateIfsc,
      basicSalary: validateBasicSalary,
    };
    map[field]?.();
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ Run validators in a fixed order; scroll to the first invalid field
    let firstInvalid = null;
    for (const name of fieldOrder) {
      const fn = validatorsMap[name];          // <-- make sure step-2 me validatorsMap + fieldOrder defined hain
      if (fn && !fn()) {                       // validator false return kare to yahi pe rok do
        firstInvalid = name;
        break;
      }
    }
    if (firstInvalid) {
      scrollToField(firstInvalid);             // <-- step-2 ka helper
      return;                                  // stop submit on validation errors
    }

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

      // (Optional) Debug
      console.log('FormData contents:');
      for (let [k, v] of submitData.entries()) {
        if (v instanceof File) console.log(`${k}:`, v.name, v.size, v.type);
        else console.log(`${k}:`, v);
      }

      // API call
      const response = await axios.post(
        'https://vpl-liveproject-1.onrender.com/api/v1/inhouseUser',
        submitData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: true,
          timeout: 60000,
          onUploadProgress: (pe) => {
            const pct = Math.round((pe.loaded * 100) / pe.total);
            console.log('Upload progress:', pct + '%');
          },
        }
      );

      console.log('API Response:', response.data);

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

      let errorMessage = 'Failed to add user';
      if (err.response) {
        console.error('Response error:', err.response.data);
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        console.error('Request error:', err.request);
        errorMessage = 'Network error. Please check your connection.';
      } else {
        console.error('Other error:', err.message);
        errorMessage = err.message;
      }

      alert(`Error: ${errorMessage}`);
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
  // === Scroll-to-first-invalid setup ===
  const fieldRefs = useRef({});

  const fieldOrder = useMemo(() => [
    'empId',
    'password',
    'confirmPassword',
    'employeeName',
    'sex',
    'email',
    'mobileNo',
    'alternateNo',   // optional — filled ho to hi check hoga
    'emergencyNo',
    'department',
    'designation',
    'dateOfBirth',
    'dateOfJoining',
    'accountHolderName',
    'accountNumber',
    'ifscCode',
    'basicSalary',

  ], []);

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
    dateOfBirth: validateDob,
    dateOfJoining: validateDoj,
    accountHolderName: validateAccountHolderName,
    accountNumber: validateAccountNumber,
    ifscCode: validateIfsc,
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm overflow-hidden">
      <div className="bg-white rounded-3xl shadow-2xl w-[98%] max-w-7xl h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white p-8 rounded-t-3xl flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold mb-2">Add New User</h2>
              <p className="text-blue-100 text-lg">Fill in the details to create a new user account</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-red-200 text-4xl font-bold transition-all duration-300 hover:scale-110"
            >
              ×
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <form noValidate onSubmit={handleSubmit} className="p-8 space-y-10">
            {/* Employee Details */}
            <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-8 shadow-xl border border-blue-200">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mr-4 shadow-lg">
                  <span className="text-white font-bold text-lg">1</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">👥 Employee Details</h3>
                  <p className="text-gray-600">Basic information about the employee</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {initialFields.slice(0, 13).map((field) => {
                  const isPwd = field.name === 'password' || field.name === 'confirmPassword';
                  const isGender = field.name === 'sex';
                  const isDate = field.type === 'date';
                  const isEmail = field.name === 'email';
                  const isMobileish = ['mobileNo', 'alternateNo', 'emergencyNo'].includes(field.name);

                  return (
                    <div key={field.name} className="space-y-3">
                      <label className="block text-sm font-bold text-gray-700 flex items-center">
                        <span className="mr-2 text-lg">{field.icon}</span>
                        {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>

                      {/* GENDER DROPDOWN */}
                      {isGender ? (
                        <>
                          <select
                            ref={(el) => (fieldRefs.current['sex'] = el)}
                            name="sex"
                            value={formData.sex}
                            onChange={handleInputChange}
                            onBlur={() => handleBlur('sex')}
                            className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl bg-white focus:ring-4 focus:ring-blue-200 focus:border-blue-500"
                          >
                            <option value="">Select Gender</option>
                            <option>Male</option>
                            <option>Female</option>
                            <option>Other</option>
                          </select>

                          {errors.sex && <p className="text-red-600 text-xs">{errors.sex}</p>}
                        </>
                      ) : isPwd ? (
                        // PASSWORD + CONFIRM (eye open by default)
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
                              className="w-full px-4 py-4 pr-10 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500"
                            />

                            <button
                              type="button"
                              title={showPassword ? 'Hide password' : 'Show password'}
                              onClick={() => setShowPassword(s => !s)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800"
                            >
                              {showPassword ? (
                                // open eye
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              ) : (
                                // eye slash
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a10.05 10.05 0 012.708-4.442M9.88 9.88a3 3 0 104.24 4.24M6.1 6.1l11.8 11.8" />
                                </svg>
                              )}
                            </button>
                          </div>
                          {errors[field.name] && <p className="text-red-600 text-xs whitespace-pre-line">{errors[field.name]}</p>}
                          {field.name === 'password' && (
                            <p className="text-xs text-gray-500">8–14 characters. Include uppercase, lowercase, and a number or symbol.</p>
                          )}
                        </>
                      ) : (
                        // NORMAL INPUTS (dates, email, mobile, etc.)
                        <>
                          <input
                            ref={(el) => (fieldRefs.current[field.name] = el)}
                            name={field.name}
                            type={field.type || 'text'}
                            placeholder={field.placeholder}
                            value={formData[field.name]}
                            onChange={handleInputChange}
                            onBlur={() => handleBlur(field.name)}
                            onKeyDown={(e) => {
                              if (e.key === ' ' && (isEmail || isMobileish)) e.preventDefault();
                            }}
                            max={
                              isDate
                                ? (field.name === 'dateOfBirth' ? maxDOB : field.name === 'dateOfJoining' ? maxDOJ : undefined)
                                : undefined
                            }
                            onClick={(e) => {
                              if (isDate) e.target.showPicker?.();
                            }}
                            inputMode={isMobileish ? 'numeric' : undefined}
                            maxLength={isMobileish ? 10 : (field.name === 'employeeName' ? 50 : undefined)}
                            className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all duration-300 bg-white shadow-sm hover:shadow-md"
                          />

                          {errors[field.name] && <p className="text-red-600 text-xs">{errors[field.name]}</p>}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Identity Docs */}
            <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl p-8 shadow-xl border border-green-200">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center mr-4 shadow-lg">
                  <span className="text-white font-bold text-lg">2</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">🆔 Identity Documents</h3>
                  <p className="text-gray-600">Upload required identity verification documents</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {ID_DOCS.map((doc) => (
                  <div key={doc.key} className="space-y-3">
                    <label className="block text-sm font-bold text-gray-700 flex items-center">
                      <span className="mr-2 text-lg">{doc.icon}</span>
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
                        className="block w-full px-6 py-6 border-2 border-dashed border-green-300 rounded-xl text-center cursor-pointer hover:bg-green-50 hover:border-green-400 hover:shadow-lg transition-all duration-300 bg-white shadow-sm"
                      >
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-3 shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                            </svg>
                          </div>
                          <span className="text-sm font-bold text-green-700">Upload {doc.label}</span>
                          <span className="text-xs text-gray-500 mt-1">
                            {doc.multiple ? 'Click to select files' : 'Click to browse a file'}
                          </span>
                        </div>
                      </label>

                      {fileNames[doc.key] && (
                        <p className="text-xs mt-2 text-gray-600 truncate">Selected: {fileNames[doc.key]}</p>
                      )}
                      {fileErrors[doc.key] && (
                        <p className="text-xs mt-1 text-red-600">{fileErrors[doc.key]}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* Previous Company Docs */}
            <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 rounded-2xl p-8 shadow-xl border border-purple-200">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mr-4 shadow-lg">
                  <span className="text-white font-bold text-lg">3</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">🏢 Previous Company Documents</h3>
                  <p className="text-gray-600">Documents from previous employment</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                {[
                  { key: 'releaseLetter', label: 'Release Letter', icon: '📄' },
                  { key: 'offerLetter', label: 'Offer Letter', icon: '📋' },
                  { key: 'experienceLetter', label: 'Experience Letter', icon: '📝' },
                  { key: 'bankStatementOrSalarySlip', label: 'Bank Statement/Salary Slip', icon: '💰' }
                ].map((doc) => (
                  <div key={doc.key} className="space-y-3">
                    <label className="block text-sm font-bold text-gray-700 flex items-center">
                      <span className="mr-2 text-lg">{doc.icon}</span>
                      {doc.label}
                    </label>
                    {fileNames[doc.key] && (
                      <p className="text-xs mt-2 text-gray-600 truncate">Selected: {fileNames[doc.key]}</p>
                    )}
                    {fileErrors[doc.key] && (
                      <p className="text-xs mt-1 text-red-600">{fileErrors[doc.key]}</p>
                    )}

                    <div className="relative">
                      <input
                        type="file"
                        id={doc.key}
                        name={doc.key}
                        multiple={doc.key === 'bankStatementOrSalarySlip'}
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={isSubmitting}
                      />
                      <label
                        htmlFor={doc.key}
                        className={`block w-full px-6 py-6 border-2 border-dashed rounded-xl text-center transition-all duration-300 bg-white shadow-sm ${isSubmitting
                          ? 'border-gray-300 cursor-not-allowed opacity-50'
                          : 'border-purple-300 cursor-pointer hover:bg-purple-50 hover:border-purple-400 hover:shadow-lg'
                          }`}
                      >
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-3 shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                            </svg>
                          </div>
                          <span className="text-sm font-bold text-purple-700">Upload {doc.label}</span>
                          <span className="text-xs text-gray-500 mt-1">Click to browse files</span>
                        </div>
                      </label>

                      {/* File Status Display */}
                      {uploadStatus[doc.key] && (
                        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{getFileStatusIcon(uploadStatus[doc.key].status)}</span>
                              <span className={`text-sm font-medium ${getFileStatusColor(uploadStatus[doc.key].status)}`}>
                                {uploadStatus[doc.key].fileName}
                              </span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${uploadStatus[doc.key].status === 'success' ? 'bg-green-100 text-green-800' :
                              uploadStatus[doc.key].status === 'error' ? 'bg-red-100 text-red-800' :
                                uploadStatus[doc.key].status === 'uploading' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'
                              }`}>
                              {uploadStatus[doc.key].status}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Banking Details */}
            <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 rounded-2xl p-8 shadow-xl border border-orange-200">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-full flex items-center justify-center mr-4 shadow-lg">
                  <span className="text-white font-bold text-lg">4</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">🏦 Banking Details</h3>
                  <p className="text-gray-600">Bank account information for salary processing</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {initialFields.slice(13).map((field) => (
                  <div key={field.name} className="space-y-3">
                    <label className="block text-sm font-bold text-gray-700 flex items-center">
                      <span className="mr-2 text-lg">{field.icon}</span>
                      {field.label}
                    </label>
                    <div className="relative">
                      <input
                        name={field.name}
                        type={field.type || 'text'}
                        placeholder={field.placeholder}
                        value={formData[field.name]}
                        onChange={handleInputChange}
                        required={field.required}
                        className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-500 transition-all duration-300 bg-white shadow-sm hover:shadow-md"
                      />
                      {errors[field.name] && <p className="text-red-600 text-xs">{errors[field.name]}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Debug Section - Show selected files */}
            <div className="bg-gradient-to-br from-gray-50 via-slate-50 to-zinc-50 rounded-2xl p-6 shadow-xl border border-gray-200">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-gray-600 to-slate-600 rounded-full flex items-center justify-center mr-3 shadow-lg">
                  <span className="text-white font-bold text-sm">🔍</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">File Upload Status</h3>
                  <p className="text-gray-600 text-sm">Check which files are ready for upload</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {Object.entries(files).map(([key, file]) => {
                  if (!file || (Array.isArray(file) && file.length === 0)) return null;

                  const fileName = Array.isArray(file) ? file[0]?.name : file.name;
                  const fileSize = Array.isArray(file) ? file[0]?.size : file.size;
                  const fileType = Array.isArray(file) ? file[0]?.type : file.type;

                  return (
                    <div key={key} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-gray-800 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                          <div className="text-xs text-gray-600 truncate">{fileName}</div>
                          <div className="text-xs text-gray-500">
                            {(fileSize / 1024 / 1024).toFixed(2)} MB • {fileType}
                          </div>
                        </div>
                        <div className="ml-2">
                          {uploadStatus[key] && (
                            <span className={`text-xs px-2 py-1 rounded-full ${uploadStatus[key].status === 'success' ? 'bg-green-100 text-green-800' :
                              uploadStatus[key].status === 'error' ? 'bg-red-100 text-red-800' :
                                uploadStatus[key].status === 'uploading' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'
                              }`}>
                              {uploadStatus[key].status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {Object.values(files).every(file => !file || (Array.isArray(file) && file.length === 0)) && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No files selected for upload
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-6 pt-8 border-t-2 border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className={`px-10 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl ${isSubmitting
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-gray-50 hover:border-gray-400'
                  }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-10 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 text-white rounded-xl font-bold transition-all duration-300 shadow-xl hover:shadow-2xl ${isSubmitting
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:from-blue-700 hover:via-purple-700 hover:to-blue-800 transform hover:scale-105'
                  }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating User...</span>
                  </div>
                ) : (
                  'Create User'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      {showSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-[90%] max-w-md shadow-2xl text-center">
            <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">✅</div>
            <h3 className="text-lg font-bold mb-1">User Created Successfully!</h3>
            <p className="text-sm text-gray-600 mb-5">The user has been added to the system.</p>
            <button
              onClick={() => { setShowSuccess(false); onClose(); }}
              className="px-5 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default AddUserModal;
