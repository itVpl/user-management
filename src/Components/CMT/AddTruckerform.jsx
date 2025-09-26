// Components/AddTruckerForm.jsx
import React, { useState } from "react";
import axios from "axios";
import alertify from "alertifyjs";
import "alertifyjs/build/css/alertify.css";
import {
  FileText,
  Upload,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
} from "lucide-react";

// ---------- Validators ----------
const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // simple + strict enough & no spaces
// const IN_PHONE_RE = /^[6-9]\d{9}$/; 
// 10 digits, starts 6-9, no spaces
// ZIP: US 5 or 5-4 OR India 6-digit
const ZIP_RE = /^(?:\d{5}(?:-\d{4})?|\d{6})$/;

const PASSWORD_RULES = (pwd) => ({
  lengthOk: typeof pwd === "string" && pwd.length >= 8 && pwd.length <= 14,
  lower: /[a-z]/.test(pwd),
  upper: /[A-Z]/.test(pwd),
  numOrSym: /[\d\W_]/.test(pwd),
});

const isAllowedDocType = (file) => {
  if (!file) return false;
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".pdf") || name.endsWith(".doc") || name.endsWith(".docx")
  );
};

const isUnder10MB = (file) => file && file.size <= 10 * 1024 * 1024;

// ---------- Component ----------
export default function AddTruckerForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    compName: "",
    compAdd: "",
    country: "",
    state: "",
    city: "",
    zipcode: "",
    phoneNo: "",
    mc_dot_no: "",
    carrierType: "",
    fleetsize: "",
    email: "",
    password: "",
    confirmPassword: "",
    // docs
    brokeragePacket: null,
    carrierPartnerAgreement: null,
    w9Form: null,
    mcAuthority: null,
    safetyLetter: null,
    bankingInfo: null,
    inspectionLetter: null,
    insurance: null,
  });

  const [errors, setErrors] = useState({});
  const [uploadStatus, setUploadStatus] = useState({
    brokeragePacket: false,
    carrierPartnerAgreement: false,
    w9Form: false,
    mcAuthority: false,
    safetyLetter: false,
    bankingInfo: false,
    inspectionLetter: false,
    insurance: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password visibility (default OPEN / visible)
  const [showPassword, setShowPassword] = useState(true);
  const [showConfirm, setShowConfirm] = useState(true);

  const documentFields = [
    { key: "brokeragePacket", label: "Brokerage Packet", required: true },
    { key: "carrierPartnerAgreement", label: "Carrier Partner Agreement" },
    { key: "w9Form", label: "W9 Form", required: true },
    { key: "mcAuthority", label: "MC Authority", required: true },
    { key: "safetyLetter", label: "Safety Letter", required: false },
    { key: "bankingInfo", label: "Banking Information", required: true },
    { key: "inspectionLetter", label: "Inspection Letter", required: false },
    { key: "insurance", label: "Insurance", required: true },
  ];

  // ---------- Field-level validation helpers ----------
  const validateField = (name, value) => {
    switch (name) {
      case "compName":
        if (!value?.trim()) return "Please enter the company name.";
        break;
      case "compAdd":
        if (!value?.trim()) return "Please enter the company address.";
        break;
      case "country":
        if (!value?.trim()) return "Please enter the county.";
        break;
      case "state":
        if (!value?.trim()) return "Please enter the state.";
        break;
      case "city":
        if (!value?.trim()) return "Please enter the city.";
        break;
      case "zipcode":
        if (!value?.trim()) return "Please enter the zip code.";
        if (!ZIP_RE.test(value.trim()))
          return "Please enter the valid zip code.";
        break;
      case "phoneNo": {
        if (!value?.trim()) return "Please enter the mobile number.";
        if (/\s/.test(value)) return "Please enter the valid mobile number.";
        // if (!IN_PHONE_RE.test(value))
        //   return "Please enter the valid mobile number.";
        break;
      }
      case "mc_dot_no":
        if (!value?.trim()) return "Please enter the mc/dot no.";
        break;
      case "carrierType":
        if (!value?.trim()) return "Please enter the Carrier Type.";
        break;
      case "fleetsize": {
        if (value === "" || value === null)
          return "Please enter the Fleet Size.";
        const n = Number(value);
        if (!Number.isInteger(n) || n < 0)
          return "Please enter the Fleet Size.";
        break;
      }
      case "email":
        if (!value?.trim()) return "Please enter the email id.";
        if (/\s/.test(value)) return "Please enter the valid email id.";
        if (!EMAIL_RE.test(value)) return "Please enter the valid email id.";
        break;
      case "password": {
        const rules = PASSWORD_RULES(value || "");
        if (!rules.lengthOk) return "Please enter the minimum 8 characters.";
        if (!(rules.lower && rules.upper && rules.numOrSym))
          return "Please enter all combinations of passwords like uppercase ,lowercase,number or symbol";
        break;
      }
      case "confirmPassword":
        if (!value?.length) return "Kindly ensure the  password and confirm password are the same";
        if (value !== formData.password)
          return "Kindly ensure the  password and confirm password are the same";
        break;
      default:
        return null;
    }
    return null;
  };

  const validateAll = () => {
    const newErrors = {};

    // Basic details
    [
      "compName",
      "compAdd",
      "country",
      "state",
      "city",
      "zipcode",
      "phoneNo",
    ].forEach((f) => {
      const msg = validateField(f, formData[f]);
      if (msg) newErrors[f] = msg;
    });

    // Fleet
    ["mc_dot_no", "carrierType", "fleetsize"].forEach((f) => {
      const msg = validateField(f, formData[f]);
      if (msg) newErrors[f] = msg;
    });

    // Account
    ["email", "password", "confirmPassword"].forEach((f) => {
      const msg = validateField(f, formData[f]);
      if (msg) newErrors[f] = msg;
    });

    // Documents
    documentFields.forEach((doc) => {
      const file = formData[doc.key];
      const key = doc.key;

      // Required missing
      if (doc.required && !file) {
        const msg = `Please choose the ${doc.label} file.`;
        newErrors[key] = msg;
        return;
      }

      if (file) {
        if (!isAllowedDocType(file)) {
          newErrors[key] =
            "Please select the .pdf , .doc and .docx file only.";
        } else if (!isUnder10MB(file)) {
          newErrors[key] = "Please choose the file less than 10 MB.";
        }
      }
    });

    setErrors(newErrors);
    return newErrors;
  };

  // ---------- Handlers ----------
  const handleChange = (e) => {
    const { name, value } = e.target;

    let newValue = value;

    if (name === "phoneNo") {
      // Only digits; no spaces
      newValue = value.replace(/\D+/g, "").slice(0, 10);
    }

    setFormData((prev) => ({ ...prev, [name]: newValue }));

    // live-validate this field
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, newValue) || undefined,
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const file = files?.[0] || null;

    setFormData((prev) => ({ ...prev, [name]: file }));
    setUploadStatus((prev) => ({ ...prev, [name]: !!file }));

    // validate the file
    let err;
    if (!file) {
      // If required, message will be set on submit; clear now.
      err = undefined;
    } else if (!isAllowedDocType(file)) {
      err = "Please select the .pdf , .doc and .docx file only.";
    } else if (!isUnder10MB(file)) {
      err = "Please choose the file less than 10 MB.";
    } else {
      err = undefined;
    }

    setErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errs = validateAll();
    if (Object.keys(errs).length > 0) {
      // Scroll to first error
      const firstErrField = Object.keys(errs)[0];
      const el = document.querySelector(`[name="${firstErrField}"]`);
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);

    const truckerData = new FormData();
    // Basic info
    truckerData.append("compName", formData.compName.trim());
    truckerData.append("mc_dot_no", formData.mc_dot_no.trim());
    truckerData.append("carrierType", formData.carrierType.trim());
    truckerData.append(
      "fleetsize",
      Number.isFinite(parseInt(formData.fleetsize, 10))
        ? parseInt(formData.fleetsize, 10)
        : 0
    );
    truckerData.append("compAdd", formData.compAdd.trim());
    truckerData.append("country", formData.country.trim());
    truckerData.append("state", formData.state.trim());
    truckerData.append("city", formData.city.trim());
    truckerData.append("zipcode", formData.zipcode.trim());
    truckerData.append("phoneNo", formData.phoneNo.trim());
    truckerData.append("email", formData.email.trim());
    truckerData.append("password", formData.password);

    // Documents
    documentFields.forEach((doc) => {
      const f = formData[doc.key];
      if (f) truckerData.append(doc.key, f);
    });

    try {
      const res = await axios.post(
        "https://vpl-liveproject-1.onrender.com/api/v1/shipper_driver/cmt/add-trucker",
        truckerData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        }
      );

      if (res.status === 200 || res.data?.success) {
        alertify.success("Trucker created successfully!.");
        // reset form
        setFormData({
          compName: "",
          compAdd: "",
          country: "",
          state: "",
          city: "",
          zipcode: "",
          phoneNo: "",
          mc_dot_no: "",
          carrierType: "",
          fleetsize: "",
          email: "",
          password: "",
          confirmPassword: "",
          brokeragePacket: null,
          carrierPartnerAgreement: null,
          w9Form: null,
          mcAuthority: null,
          safetyLetter: null,
          bankingInfo: null,
          inspectionLetter: null,
          insurance: null,
        });
        setUploadStatus({
          brokeragePacket: false,
          carrierPartnerAgreement: false,
          w9Form: false,
          mcAuthority: false,
          safetyLetter: false,
          bankingInfo: false,
          inspectionLetter: false,
          insurance: false,
        });
        setErrors({});
        onSuccess && onSuccess();
      } else {
        alertify.error("❌ Failed to add trucker.");
      }
    } catch (error) {
      console.error("❌ Submission error:", error.response?.data || error.message);
      alertify.error(`❌ Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUploadIcon = (fieldName) =>
    uploadStatus[fieldName] ? (
      <CheckCircle size={20} />
    ) : (
      <Upload size={20} />
    );

  const renderError = (name) =>
    errors[name] ? (
      <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
        <XCircle size={14} /> {errors[name]}
      </p>
    ) : null;

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-transparent py-8 px-2">
      <form onSubmit={handleSubmit} noValidate  className="w-full max-w-2xl flex flex-col gap-4">
        {/* Basic Details */}
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl mb-1 p-8">
          <h4 className="text-2xl font-bold mb-4 text-center">Basic Details</h4>
          <div className="w-full flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="compName"
                placeholder="Company Name"
                value={formData.compName}
                onChange={handleChange}
                className="w-full border border-gray-400 px-4 py-2 rounded-lg"
              />
              {renderError("compName")}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Company Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="compAdd"
                  placeholder="Company Address"
                  value={formData.compAdd}
                  onChange={handleChange}
                  className="border border-gray-400 px-4 py-2 rounded-lg w-full"
                />
                {renderError("compAdd")}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Country <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="country"
                  placeholder="Country"
                  value={formData.country}
                  onChange={handleChange}
                  className="border border-gray-400 px-4 py-2 rounded-lg w-full"
                />
                {renderError("country")}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="state"
                  placeholder="State"
                  value={formData.state}
                  onChange={handleChange}
                  className="border border-gray-400 px-4 py-2 rounded-lg w-full"
                />
                {renderError("state")}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={handleChange}
                  className="border border-gray-400 px-4 py-2 rounded-lg w-full"
                />
                {renderError("city")}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Zip Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="zipcode"
                  placeholder="Zip Code"
                  value={formData.zipcode}
                  onChange={handleChange}
                  className="border border-gray-400 px-4 py-2 rounded-lg w-full"
                />
                {renderError("zipcode")}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="phoneNo"
                  placeholder="Phone"
                  value={formData.phoneNo}
                  onChange={handleChange}
                  className="border border-gray-400 px-4 py-2 rounded-lg w-full"
                  inputMode="numeric"
                />
                {renderError("phoneNo")}
              </div>
            </div>
          </div>
        </div>

        {/* Fleet Details */}
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl mb-1 p-8">
          <h4 className="text-2xl font-bold mb-4 text-center">Fleet Details</h4>
          <div className="w-full grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                MC/DOT No <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="mc_dot_no"
                placeholder="MC/DOT No"
                value={formData.mc_dot_no}
                onChange={handleChange}
                className="border border-gray-400 px-4 py-2 rounded-lg w-full"
              />
              {renderError("mc_dot_no")}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Carrier Type <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="carrierType"
                placeholder="Carrier Type"
                value={formData.carrierType}
                onChange={handleChange}
                className="border border-gray-400 px-4 py-2 rounded-lg w-full"
              />
              {renderError("carrierType")}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Fleet Size <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                name="fleetsize"
                placeholder="Fleet Size"
                value={formData.fleetsize}
                onChange={handleChange}
                className="border border-gray-400 px-4 py-2 rounded-lg w-full"
              />
              {renderError("fleetsize")}
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl mb-1 p-8">
          <h4 className="text-2xl font-bold mb-4 text-center">Required Documents</h4>
          <div className="w-full grid grid-cols-2 gap-4">
            {documentFields.map((doc) => (
              <div key={doc.key} className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <FileText size={16} />
                  {doc.label} {doc.required && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type="file"
                    name={doc.key}
                    onChange={handleFileChange}
                    className="w-full border border-gray-400 px-4 py-2 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    accept=".pdf,.doc,.docx"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    {getUploadIcon(doc.key)}
                  </div>
                </div>
                {renderError(doc.key)}
              </div>
            ))}
          </div>
        </div>

        {/* Create Account */}
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl mb-1 p-8">
          <h4 className="text-2xl font-bold mb-4 text-center">Create Account</h4>

          <div className="w-full flex flex-col gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                placeholder="Enter E-mail"
                value={formData.email}
                onChange={handleChange}
                className="w-full border border-gray-400 px-4 py-2 rounded-lg"
              />
              {renderError("email")}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="text-sm font-medium text-gray-700">
                  Create Password <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Create Password"
                  value={formData.password}
                  onChange={handleChange}
                  className="border border-gray-400 px-4 py-2 rounded-lg w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 bottom-2.5"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                {renderError("password")}
              </div>

              <div className="relative">
                <label className="text-sm font-medium text-gray-700">
                  Re-enter Password <span className="text-red-500">*</span>
                </label>
                <input
                  type={showConfirm ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Re-enter Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="border border-gray-400 px-4 py-2 rounded-lg w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-3 bottom-2.5"
                  aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                {renderError("confirmPassword")}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 rounded-full text-lg font-bold transition flex items-center justify-center gap-2 ${
              isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-black text-white hover:opacity-90"
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Adding Trucker...
              </>
            ) : (
              "Add Trucker"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
