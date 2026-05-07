import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  Building,
  Edit,
  FileText,
  MapPin,
  Truck,
  PlusCircle,
  CheckCircle,
  Upload,
  Wallet,
  Eye,
  Clock,
} from 'lucide-react';
import { FaDownload } from 'react-icons/fa';
import API_CONFIG from '../../config/api.js';
import { US_STATES_CITIES } from './truckerGeoUS.js';

const fetchCountriesAPI = async () => [{ label: 'United States', value: 'United States' }];
const fetchStatesAPI = async (country) => {
  if (!country || country !== 'United States') return [];
  return Object.keys(US_STATES_CITIES).map((state) => ({ label: state, value: state }));
};
const fetchCitiesAPI = async (country, state) => {
  if (!country || !state || country !== 'United States' || !US_STATES_CITIES[state]) return [];
  return US_STATES_CITIES[state].map((city) => ({ label: city, value: city }));
};

function SelectWithSearch({
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  disabled = false,
  error = '',
  inputClass = '',
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const ref = React.useRef(null);
  React.useEffect(() => {
    function onDocClick(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);
  const filtered = options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((s) => !s)}
        className={`w-full text-left px-4 py-3 border rounded-lg bg-white focus:outline-none ${
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
        } ${
          error
            ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-200'
            : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
        } ${inputClass}`}
      >
        {value || <span className="text-gray-400">{placeholder}</span>}
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl">
          <div className="p-3 border-b">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${name.toLowerCase()}...`}
              className="w-full border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 px-3 py-2 rounded-lg"
            />
          </div>
          <div className="max-h-56 overflow-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-gray-500 text-sm">No results</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setQ('');
                  }}
                  className={`w-full text-left px-4 py-2 hover:bg-blue-50 ${
                    opt.value === value ? 'bg-blue-50' : ''
                  }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
          <div className="flex justify-end p-2 border-t">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setQ('');
              }}
              className="px-3 py-1 rounded-lg border text-sm hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>
      )}
      {error ? <p className="text-xs text-red-600 mt-1">{error}</p> : null}
    </div>
  );
}

const isValidEmail = (val = '') =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(val).trim());
const isValidZip = (val) => {
  const trimmed = String(val || '').trim();
  const usZipPattern = /^\d{5}(-\d{4})?$/;
  const indiaPinPattern = /^[1-9]\d{5}$/;
  return usZipPattern.test(trimmed) || indiaPinPattern.test(trimmed);
};
const editFieldClass = (hasError, extra = '') =>
  `w-full px-4 py-3 border rounded-lg focus:outline-none ${
    hasError ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
  } ${extra}`.trim();
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_ACTION_EXT = ['PNG', 'JPG', 'JPEG', 'WEBP', 'PDF', 'DOC', 'DOCX'];
const actionFileIsAllowed = (file) => {
  if (!file) return true;
  const ext = (file.name.split('.').pop() || '').toUpperCase();
  return ALLOWED_ACTION_EXT.includes(ext) && file.size <= MAX_FILE_BYTES;
};
const absUrl = (u) => (u?.startsWith('http') ? u : `${API_CONFIG.BASE_URL}/${u}`);

const documentFields = [
  { key: 'brokeragePacket', label: 'Brokerage Packet' },
  { key: 'carrierPartnerAgreement', label: 'Carrier Partner Agreement' },
  { key: 'w9Form', label: 'W9 Form' },
  { key: 'mcAuthority', label: 'MC Authority' },
  { key: 'safetyLetter', label: 'Safety Letter' },
  { key: 'bankingInfo', label: 'Banking Information' },
  { key: 'inspectionLetter', label: 'Inspection Letter' },
  { key: 'insurance', label: 'Insurance' },
];

function getAuthToken() {
  return (
    sessionStorage.getItem('authToken') ||
    localStorage.getItem('authToken') ||
    sessionStorage.getItem('token') ||
    localStorage.getItem('token')
  );
}

function buildEditFormFromTrucker(trucker) {
  const companyAddress =
    trucker.compAdd || trucker.address || trucker.companyAddress || trucker.compAddress || '';
  const zipCodeValue =
    trucker.zipcode ||
    trucker.zipCode ||
    trucker.pinCode ||
    trucker.pincode ||
    trucker.postalCode ||
    trucker.zip ||
    '';
  const workingAddr = trucker.workingAddress || [];

  return {
    _id: trucker._id || trucker.userId,
    compName: trucker.compName || '',
    email: trucker.email || trucker.emailId || trucker.contactEmail || '',
    phoneNo: trucker.phoneNo || '',
    secondaryPhoneNo: trucker.secondaryPhoneNo || '',
    onboardCompany: trucker.assignedCompany || trucker.onboardCompany || trucker.companyName || '',
    loadRef: trucker.loadRef || trucker.loadReference || '',
    mc_dot_no: trucker.mc_dot_no || '',
    carrierType: trucker.carrierType || '',
    fleetsize: trucker.fleetsize || '',
    insuranceAmount: trucker.insuranceAmount ?? trucker.insurance_amount ?? '',
    paymentType: trucker.paymentType || trucker.bankingDetails?.paymentType || '',
    factoringName: trucker.factoringName || trucker.bankingDetails?.factoringName || '',
    bankName:
      trucker.bankName ||
      trucker.bankingDetails?.bankName ||
      trucker.bankDetails?.bankName ||
      '',
    accountNumber:
      trucker.accountNumber ||
      trucker.bankingDetails?.accountNumber ||
      trucker.bankDetails?.accountNumber ||
      '',
    routingNumber:
      trucker.routingNumber ||
      trucker.bankingDetails?.routingNumber ||
      trucker.bankDetails?.routingNumber ||
      '',
    accountHolderName:
      trucker.accountHolderName ||
      trucker.bankingDetails?.accountHolderName ||
      trucker.bankDetails?.accountHolderName ||
      '',
    accountType:
      trucker.accountType ||
      trucker.bankingDetails?.accountType ||
      trucker.bankDetails?.accountType ||
      '',
    bankAddress:
      trucker.bankAddress || trucker.bankingDetails?.address || trucker.bankDetails?.address || '',
    bankCity: trucker.bankCity || trucker.bankingDetails?.city || trucker.bankDetails?.city || '',
    bankState:
      trucker.bankState || trucker.bankingDetails?.state || trucker.bankDetails?.state || '',
    bankZipcode:
      trucker.bankZipcode ||
      trucker.bankingDetails?.zipcode ||
      trucker.bankDetails?.zipcode ||
      '',
    city: trucker.city || '',
    state: trucker.state || '',
    country: trucker.country || '',
    address: companyAddress,
    zipCode: zipCodeValue,
    workingAddress: Array.isArray(workingAddr)
      ? workingAddr.map((addr) => ({
          state: addr.state || '',
          city: addr.city || '',
          attachment: null,
          attachmentUrl: addr.attachment || '',
        }))
      : [],
    status: trucker.status || 'pending',
    brokeragePacketUrl:
      trucker.brokeragePacketUrl || trucker.brokeragePacket || trucker.documents?.brokeragePacket
        ? absUrl(trucker.brokeragePacketUrl || trucker.brokeragePacket || trucker.documents?.brokeragePacket)
        : null,
    brokeragePacketFileName: trucker.brokeragePacketFileName || trucker.brokeragePacketName || null,
    carrierPartnerAgreementUrl:
      trucker.carrierPartnerAgreementUrl ||
      trucker.carrierPartnerAgreement ||
      trucker.documents?.carrierPartnerAgreement
        ? absUrl(
            trucker.carrierPartnerAgreementUrl ||
              trucker.carrierPartnerAgreement ||
              trucker.documents?.carrierPartnerAgreement
          )
        : null,
    carrierPartnerAgreementFileName:
      trucker.carrierPartnerAgreementFileName || trucker.carrierPartnerAgreementName || null,
    w9FormUrl:
      trucker.w9FormUrl || trucker.w9Form || trucker.documents?.w9Form
        ? absUrl(trucker.w9FormUrl || trucker.w9Form || trucker.documents?.w9Form)
        : null,
    w9FormFileName: trucker.w9FormFileName || trucker.w9FormName || null,
    mcAuthorityUrl:
      trucker.mcAuthorityUrl || trucker.mcAuthority || trucker.documents?.mcAuthority
        ? absUrl(trucker.mcAuthorityUrl || trucker.mcAuthority || trucker.documents?.mcAuthority)
        : null,
    mcAuthorityFileName: trucker.mcAuthorityFileName || trucker.mcAuthorityName || null,
    safetyLetterUrl:
      trucker.safetyLetterUrl || trucker.safetyLetter || trucker.documents?.safetyLetter
        ? absUrl(trucker.safetyLetterUrl || trucker.safetyLetter || trucker.documents?.safetyLetter)
        : null,
    safetyLetterFileName: trucker.safetyLetterFileName || trucker.safetyLetterName || null,
    bankingInfoUrl:
      trucker.bankingInfoUrl || trucker.bankingInfo || trucker.documents?.bankingInfo
        ? absUrl(trucker.bankingInfoUrl || trucker.bankingInfo || trucker.documents?.bankingInfo)
        : null,
    bankingInfoFileName: trucker.bankingInfoFileName || trucker.bankingInfoName || null,
    inspectionLetterUrl:
      trucker.inspectionLetterUrl ||
      trucker.inspectionLetter ||
      trucker.documents?.inspectionLetter
        ? absUrl(
            trucker.inspectionLetterUrl ||
              trucker.inspectionLetter ||
              trucker.documents?.inspectionLetter
          )
        : null,
    inspectionLetterFileName:
      trucker.inspectionLetterFileName || trucker.inspectionLetterName || null,
    insuranceUrl:
      trucker.insuranceUrl || trucker.insurance || trucker.documents?.insurance
        ? absUrl(trucker.insuranceUrl || trucker.insurance || trucker.documents?.insurance)
        : null,
    insuranceFileName: trucker.insuranceFileName || trucker.insuranceName || null,
    brokeragePacket: null,
    carrierPartnerAgreement: null,
    w9Form: null,
    mcAuthority: null,
    safetyLetter: null,
    bankingInfo: null,
    inspectionLetter: null,
    insurance: null,
  };
}

const initialUploadStatus = () => ({
  brokeragePacket: false,
  carrierPartnerAgreement: false,
  w9Form: false,
  mcAuthority: false,
  safetyLetter: false,
  bankingInfo: false,
  inspectionLetter: false,
  insurance: false,
});

/** Same edit experience as TruckerDocuments; used from TruckerReport row actions. */
export default function TruckerCmtEditModal({ open, trucker, onClose, onSaved }) {
  const [editFormData, setEditFormData] = useState({});
  const [editUploadStatus, setEditUploadStatus] = useState(initialUploadStatus);
  const [editErrors, setEditErrors] = useState({});
  const [countryOptions, setCountryOptions] = useState([]);
  const [stateOptions, setStateOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);
  const [geoLoading, setGeoLoading] = useState({ countries: false, states: false, cities: false });
  const citiesCacheRef = useRef({});
  const [actionType, setActionType] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionErrors, setActionErrors] = useState({});
  const [actionForm, setActionForm] = useState({ reason: '', remarks: '', attachment: null });

  const handleCloseModal = () => {
    setEditFormData({});
    setEditErrors({});
    setEditUploadStatus(initialUploadStatus());
    setCountryOptions([]);
    setStateOptions([]);
    setCityOptions([]);
    setActionType('');
    setActionForm({ reason: '', remarks: '', attachment: null });
    setActionErrors({});
    onClose();
  };

  useEffect(() => {
    if (!open || !trucker) return;
    const form = buildEditFormFromTrucker(trucker);
    setEditFormData(form);
    setEditUploadStatus(initialUploadStatus());
    setEditErrors({});
    setActionType('');
    setActionForm({ reason: '', remarks: '', attachment: null });
    setActionErrors({});

    let mounted = true;
    (async () => {
      try {
        setGeoLoading({ countries: true, states: true, cities: true });
        const countries = await fetchCountriesAPI();
        if (!mounted) return;
        setCountryOptions(countries);
        const ctry = (form.country || '').trim();
        if (ctry) {
          const states = await fetchStatesAPI(ctry);
          if (!mounted) return;
          setStateOptions(states);
          const st = (form.state || '').trim();
          if (st) {
            const cities = await fetchCitiesAPI(ctry, st);
            if (!mounted) return;
            setCityOptions(cities);
          } else setCityOptions([]);
        } else {
          setStateOptions([]);
          setCityOptions([]);
        }
        if (form.workingAddress?.length && form.country) {
          for (const addr of form.workingAddress) {
            if (addr.state) {
              const key = `${form.country}|${addr.state}`;
              if (!citiesCacheRef.current[key]) {
                try {
                  const cities = await fetchCitiesAPI(form.country, addr.state);
                  if (mounted) citiesCacheRef.current[key] = cities;
                } catch (e) {
                  console.error('preload cities WA', e);
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('geo preload', e);
        if (mounted) setCountryOptions([{ label: 'United States', value: 'United States' }]);
      } finally {
        if (mounted) setGeoLoading({ countries: false, states: false, cities: false });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open, trucker]);

  const handleCountrySelect = async (country) => {
    setEditFormData((p) => ({ ...p, country, state: '', city: '' }));
    setStateOptions([]);
    setCityOptions([]);
    if (!country) return;
    try {
      setGeoLoading((p) => ({ ...p, states: true }));
      const states = await fetchStatesAPI(country);
      setStateOptions(states);
    } finally {
      setGeoLoading((p) => ({ ...p, states: false }));
    }
  };

  const handleStateSelect = async (state) => {
    const country = editFormData.country || '';
    setEditFormData((p) => ({ ...p, state, city: '' }));
    setCityOptions([]);
    if (!country || !state) return;
    try {
      setGeoLoading((p) => ({ ...p, cities: true }));
      const cities = await fetchCitiesAPI(country, state);
      setCityOptions(cities);
    } finally {
      setGeoLoading((p) => ({ ...p, cities: false }));
    }
  };

  const handleCitySelect = (city) => {
    setEditFormData((p) => ({ ...p, city }));
  };

  const handleAddWorkingAddress = () => {
    setEditFormData((prev) => ({
      ...prev,
      workingAddress: [...(prev.workingAddress || []), { state: '', city: '', attachment: null, attachmentUrl: '' }],
    }));
  };

  const handleRemoveWorkingAddress = (idx) => {
    setEditFormData((prev) => ({
      ...prev,
      workingAddress: prev.workingAddress.filter((_, i) => i !== idx),
    }));
  };

  const handleWorkingAddressStateChange = async (idx, state) => {
    const updated = [...editFormData.workingAddress];
    updated[idx] = { ...updated[idx], state, city: '' };
    setEditFormData((prev) => ({ ...prev, workingAddress: updated }));
    if (state && editFormData.country) {
      try {
        const key = `${editFormData.country}|${state}`;
        if (!citiesCacheRef.current[key]) {
          const cities = await fetchCitiesAPI(editFormData.country, state);
          citiesCacheRef.current[key] = cities;
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleWorkingAddressCityChange = (idx, city) => {
    const updated = [...editFormData.workingAddress];
    updated[idx] = { ...updated[idx], city };
    setEditFormData((prev) => ({ ...prev, workingAddress: updated }));
  };

  const handleWorkingAddressFileChange = (idx, file) => {
    const updated = [...editFormData.workingAddress];
    updated[idx] = { ...updated[idx], attachment: file };
    setEditFormData((prev) => ({ ...prev, workingAddress: updated }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!editFormData.compName?.trim()) errs.compName = true;
    if (!editFormData.email?.trim()) errs.email = 'required';
    else if (!isValidEmail(editFormData.email)) errs.email = 'invalid';
    if (!editFormData.address?.trim()) errs.address = true;
    if (!editFormData.country?.trim()) errs.country = true;
    if (!editFormData.state?.trim()) errs.state = true;
    if (!editFormData.city?.trim()) errs.city = true;
    if (!editFormData.zipCode?.trim()) errs.zipCode = true;
    else if (!isValidZip(editFormData.zipCode)) errs.zipCode = true;
    if (!editFormData.mc_dot_no?.trim()) errs.mc_dot_no = true;
    if (!editFormData.carrierType?.trim()) errs.carrierType = true;
    if (editFormData.fleetsize === '' || editFormData.fleetsize === null || Number(editFormData.fleetsize) <= 0) {
      errs.fleetsize = true;
    }
    setEditErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      const documentsFormData = new FormData();
      documentFields.forEach((doc) => {
        if (editFormData[doc.key]) documentsFormData.append(doc.key, editFormData[doc.key]);
      });

      if (editFormData.workingAddress && editFormData.workingAddress.length > 0) {
        const validAddresses = editFormData.workingAddress.filter(
          (addr) =>
            addr.state?.trim() ||
            addr.city?.trim() ||
            (addr.attachment && addr.attachment instanceof File)
        );
        if (validAddresses.length > 0) {
          const addressesWithLocation = validAddresses.filter((addr) => addr.state?.trim() || addr.city?.trim());
          const workingAddressJson = addressesWithLocation.map((addr) => ({
            state: addr.state?.trim() || '',
            city: addr.city?.trim() || '',
          }));
          if (workingAddressJson.length > 0) {
            documentsFormData.append('workingAddress', JSON.stringify(workingAddressJson));
          }
          addressesWithLocation.forEach((addr) => {
            if (addr.attachment && addr.attachment instanceof File) {
              documentsFormData.append('workingAddressAttachments', addr.attachment);
            }
          });
        }
      }

      const jsonData = {
        compName: editFormData.compName,
        email: editFormData.email,
        phoneNo: editFormData.phoneNo,
        secondaryPhoneNo: editFormData.secondaryPhoneNo || '',
        assignedCompany: editFormData.onboardCompany || '',
        loadRef: editFormData.loadRef || '',
        mc_dot_no: editFormData.mc_dot_no,
        ...(editFormData.paymentType
          ? {
              paymentType: editFormData.paymentType,
              ...(editFormData.paymentType === 'Factoring' && editFormData.factoringName
                ? { factoringName: editFormData.factoringName }
                : {}),
              ...(editFormData.bankName || editFormData.accountNumber
                ? {
                    bankDetails: {
                      bankName: editFormData.bankName || '',
                      accountNumber: editFormData.accountNumber || '',
                      routingNumber: editFormData.routingNumber || '',
                      accountHolderName: editFormData.accountHolderName || '',
                      accountType: editFormData.accountType || '',
                      address: editFormData.bankAddress || '',
                      city: editFormData.bankCity || '',
                      state: editFormData.bankState || '',
                      zipcode: editFormData.bankZipcode || '',
                    },
                  }
                : {}),
            }
          : {}),
        carrierType: editFormData.carrierType,
        fleetsize: editFormData.fleetsize,
        ...(editFormData.insuranceAmount !== '' &&
        editFormData.insuranceAmount != null &&
        String(editFormData.insuranceAmount).trim() !== ''
          ? { insuranceAmount: Number(editFormData.insuranceAmount) }
          : {}),
        city: editFormData.city,
        state: editFormData.state,
        country: editFormData.country,
        address: editFormData.address,
        zipCode: editFormData.zipCode,
        ...(editFormData.workingAddress && editFormData.workingAddress.length > 0
          ? {
              workingAddress: editFormData.workingAddress
                .filter((addr) => addr.state?.trim() || addr.city?.trim())
                .map((addr) => ({
                  state: addr.state?.trim() || '',
                  city: addr.city?.trim() || '',
                })),
            }
          : {}),
      };

      const token = getAuthToken();
      const axiosInstance = axios.create({
        baseURL: `${API_CONFIG.BASE_URL}`,
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      const hasFileUploads = documentFields.some((doc) => editFormData[doc.key]);
      const hasWorkingAddressAttachments = editFormData.workingAddress?.some(
        (addr) => addr.attachment && addr.attachment instanceof File
      );

      if (hasFileUploads || hasWorkingAddressAttachments) {
        await axiosInstance.put(`/api/v1/shipper_driver/update/${editFormData._id}/documents`, documentsFormData);
      }

      await axiosInstance.put(`/api/v1/shipper_driver/update/${editFormData._id}`, jsonData, {
        headers: { 'Content-Type': 'application/json' },
      });

      handleCloseModal();
      if (typeof onSaved === 'function') onSaved();
      alert('Trucker Update successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to update trucker. Please try again.');
    }
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditFileChange = (e) => {
    const { name, files } = e.target;
    if (!(files && files[0])) {
      setEditFormData((prev) => ({ ...prev, [name]: null }));
      setEditUploadStatus((prev) => ({ ...prev, [name]: false }));
      return;
    }
    const file = files[0];
    setEditFormData((prev) => ({ ...prev, [name]: file }));
    setEditUploadStatus((prev) => ({ ...prev, [name]: true }));
  };

  const handleActionInput = (e) => {
    const { name, value, files } = e.target;
    if (name === 'attachment') {
      const f = files?.[0] || null;
      if (f && !actionFileIsAllowed(f)) {
        setActionErrors((prev) => ({ ...prev, attachment: 'Only images/pdf/doc (≤10 MB) allowed.' }));
        setActionForm((prev) => ({ ...prev, attachment: null }));
      } else {
        setActionErrors((prev) => {
          const c = { ...prev };
          delete c.attachment;
          return c;
        });
        setActionForm((prev) => ({ ...prev, attachment: f }));
      }
      return;
    }
    setActionForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAccountAction = async (e) => {
    e.preventDefault();
    if (!actionType) return;
    const errs = {};
    if (!actionForm.reason?.trim()) errs.reason = true;
    if (!actionFileIsAllowed(actionForm.attachment)) errs.attachment = 'Invalid file.';
    setActionErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      setActionLoading(true);
      const token = getAuthToken();
      const axiosInstance = axios.create({
        baseURL: API_CONFIG.BASE_URL,
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      const userId = editFormData._id;

      const fd = new FormData();
      if (actionType === 'blacklist') {
        fd.append('blacklistReason', actionForm.reason);
        if (actionForm.remarks) fd.append('blacklistRemarks', actionForm.remarks);
        if (actionForm.attachment) fd.append('attachments', actionForm.attachment);
        fd.append('userid', userId);
        await axiosInstance.put(`/api/v1/shipper_driver/blacklist/${userId}`, fd);
        alert('User blacklisted successfully.');
      } else {
        fd.append('removalReason', actionForm.reason);
        if (actionForm.remarks) fd.append('removalRemarks', actionForm.remarks);
        if (actionForm.attachment) fd.append('attachments', actionForm.attachment);
        await axiosInstance.put(`/api/v1/shipper_driver/blacklist/${userId}/remove`, fd);
        alert('User removed from blacklist successfully.');
      }
      setActionType('');
      setActionForm({ reason: '', remarks: '', attachment: null });
      handleCloseModal();
      if (typeof onSaved === 'function') onSaved();
    } catch (err) {
      console.error(err);
      alert('Failed to complete account action. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const getEditUploadIcon = (fieldName) => {
    if (editUploadStatus[fieldName]) return <CheckCircle className="text-green-500" size={20} />;
    return <Upload className="text-gray-400" size={20} />;
  };

  if (!open || !trucker) return null;

  return (
      <div
        className="fixed inset-0 backdrop-blur-sm bg-transparent bg-black/30 z-50 flex justify-center items-center p-4"
        onClick={() => handleCloseModal()}
      >
        <style>{`
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        `}</style>
        <div
          className="bg-white rounded-3xl max-w-6xl w-full max-h-[95vh] overflow-y-auto hide-scrollbar shadow-2xl"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-3xl">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Edit className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Edit Trucker</h2>
                  <p className="text-blue-100">Update profile, banking, and documents</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCloseModal()}
                className="text-white hover:text-gray-200 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>
          </div>
            <form noValidate onSubmit={handleEditSubmit} className="p-6 space-y-6">
              {/* Company */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Building className="text-blue-600 shrink-0" size={20} />
                  Company
                </h3>
                <div className="w-full flex flex-col gap-4">
                  <label className="text-sm font-medium text-gray-700">Company Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="compName"
                    placeholder="Company Name"
                    value={editFormData.compName}
                    onChange={handleEditInputChange}
                    className={editFieldClass(!!editErrors.compName)}
                  />
                  {editErrors.compName && <p className="text-xs text-red-600 mt-1">Please enter the company name.</p>}

                  <label className="text-sm font-medium text-gray-700 mt-3">Company Address <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="address"
                    placeholder="Company Address"
                    value={editFormData.address}
                    onChange={handleEditInputChange}
                    className={editFieldClass(!!editErrors.address)}
                  />
                  {editErrors.address && <p className="text-xs text-red-600 mt-1">Please enter the company address.</p>}

                  <label className="text-sm font-medium text-gray-700 mt-3">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    value={editFormData.email}
                    onChange={handleEditInputChange}
                    className={editFieldClass(!!editErrors.email)}
                    aria-invalid={!!editErrors.email}
                    aria-describedby={editErrors.email ? 'email-err' : undefined}
                  />
                  {editErrors.email && (
                    <p id="email-err" className="text-xs text-red-600 mt-1">
                      {editErrors.email === 'invalid'
                        ? 'Please enter a valid email address.'
                        : 'Please enter the email address.'}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Phone <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="phoneNo"
                        placeholder="10-digit Mobile (starts 6-9)"
                        value={editFormData.phoneNo}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setEditFormData(prev => ({ ...prev, phoneNo: v }));
                        }}
                        onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
                        inputMode="numeric"
                        className={editFieldClass(!!editErrors.phoneNo)}
                      />
                      {editErrors.phoneNo && <p className="text-xs text-red-600 mt-1">Please enter the valid mobile number.</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">MC/DOT No <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="mc_dot_no"
                        placeholder="MC/DOT Number"
                        value={editFormData.mc_dot_no}
                        onChange={handleEditInputChange}
                        className={editFieldClass(!!editErrors.mc_dot_no)}
                      />
                      {editErrors.mc_dot_no && <p className="text-xs text-red-600 mt-1">Please enter the mc/dot no.</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Secondary Phone Number</label>
                      <input
                        type="text"
                        name="secondaryPhoneNo"
                        placeholder="Secondary Phone Number (Optional)"
                        value={editFormData.secondaryPhoneNo || ''}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setEditFormData(prev => ({ ...prev, secondaryPhoneNo: v }));
                        }}
                        onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
                        inputMode="numeric"
                        className={editFieldClass(false)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Onboard Company</label>
                      <SelectWithSearch
                        name="onboardCompany"
                        value={editFormData.onboardCompany || ''}
                        onChange={(value) => setEditFormData(prev => ({ ...prev, onboardCompany: value }))}
                        options={[
                          { label: 'V Power Logistics', value: 'V Power Logistics' },
                          { label: 'Quick Logistics', value: 'Quick Logistics' }
                        ]}
                        placeholder="Select Company..."
                        disabled={false}
                        error=""
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="text-sm font-medium text-gray-700">Load Reference</label>
                    <input
                      type="text"
                      name="loadRef"
                      placeholder="Load Reference"
                      value={editFormData.loadRef || ''}
                      onChange={handleEditInputChange}
                      className={editFieldClass(false)}
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <MapPin className="text-purple-600 shrink-0" size={20} />
                  Address
                </h3>
                <div className="w-full flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Country <span className="text-red-500">*</span>
                      </label>
                      <SelectWithSearch
                        name="Country"
                        value={editFormData.country}
                        onChange={handleCountrySelect}
                        options={countryOptions}
                        placeholder={geoLoading.countries ? "Loading..." : "Select..."}
                        disabled={geoLoading.countries}
                        error={editErrors.country ? "Please enter the county." : ""}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        State <span className="text-red-500">*</span>
                      </label>
                      <SelectWithSearch
                        name="State"
                        value={editFormData.state}
                        onChange={handleStateSelect}
                        options={stateOptions}
                        placeholder={geoLoading.states ? "Loading..." : "Select..."}
                        disabled={!editFormData.country || geoLoading.states}
                        error={editErrors.state ? "Please enter the state." : ""}
                        inputClass=""
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        City <span className="text-red-500">*</span>
                      </label>
                      <SelectWithSearch
                        name="City"
                        value={editFormData.city}
                        onChange={handleCitySelect}
                        options={cityOptions}
                        placeholder={geoLoading.cities ? "Loading..." : "Select..."}
                        disabled={!editFormData.state || geoLoading.cities}
                        error={editErrors.city ? "Please enter the city." : ""}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Zip Code <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="zipCode"
                        placeholder="Zip Code"
                        value={editFormData.zipCode}
                        onChange={(e) => {
                          const v = e.target.value.toUpperCase().replace(/[^0-9-]/g, '').slice(0, 10);
                          setEditFormData(prev => ({ ...prev, zipCode: v }));
                        }}
                        className={editFieldClass(!!editErrors.zipCode)}
                      />
                      {editErrors.zipCode && (
                        <p className="text-xs text-red-600 mt-1">
                          {editFormData.zipCode?.trim() ? 'Please enter the valid zip code.' : 'Please enter the zip code.'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Working Address Card (Optional) */}
              <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6 border border-amber-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <MapPin className="text-orange-600 shrink-0" size={20} />
                    Working Address (Optional)
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddWorkingAddress}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <PlusCircle size={18} /> Add More
                  </button>
                </div>
                <div className="w-full flex flex-col gap-4">
                  {editFormData.workingAddress && editFormData.workingAddress.length > 0 ? (
                    editFormData.workingAddress.map((addr, idx) => {
                      // Get cities for this address's state
                      const addrStateCities = addr.state ? (citiesCacheRef.current[`${editFormData.country}|${addr.state}`] || []) : [];
                      
                      return (
                        <div key={idx} className="bg-white rounded-xl p-4 border border-orange-200 shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-lg font-semibold text-gray-700">Working Address #{idx + 1}</h5>
                            <button
                              type="button"
                              onClick={() => handleRemoveWorkingAddress(idx)}
                              className="text-red-600 hover:text-red-700 font-semibold"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-700">State</label>
                              <SelectWithSearch
                                name={`workingAddress_${idx}_state`}
                                value={addr.state || ''}
                                onChange={(val) => handleWorkingAddressStateChange(idx, val)}
                                options={stateOptions}
                                placeholder="Search state…"
                                loading={geoLoading.states}
                                error=""
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700">City</label>
                              <SelectWithSearch
                                name={`workingAddress_${idx}_city`}
                                value={addr.city || ''}
                                onChange={(val) => handleWorkingAddressCityChange(idx, val)}
                                options={addrStateCities}
                                placeholder={addr.state ? "Search city…" : "Select state first"}
                                allowCustom
                                disabled={!addr.state}
                                loading={geoLoading.cities}
                                error=""
                              />
                            </div>
                          </div>
                          <div className="mt-4">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <FileText size={16} />
                              Attachment (Optional)
                            </label>
                            <div className="relative mt-2">
                              <input
                                type="file"
                                onChange={(e) => {
                                  const file = e.target.files?.[0] || null;
                                  handleWorkingAddressFileChange(idx, file);
                                }}
                                className={editFieldClass(false, 'file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100')}
                              />
                              {addr.attachment && (
                                <div className="mt-2 text-sm text-green-600 flex items-center gap-2">
                                  <CheckCircle size={16} />
                                  {addr.attachment.name}
                                </div>
                              )}
                              {addr.attachmentUrl && !addr.attachment && (
                                <div className="mt-2 text-sm text-blue-600 flex items-center gap-2">
                                  <FileText size={16} />
                                  <a href={addr.attachmentUrl.startsWith('http') ? addr.attachmentUrl : `${API_CONFIG.BASE_URL}/${addr.attachmentUrl}`} target="_blank" rel="noreferrer" className="hover:underline">
                                    Current Attachment
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No working addresses added. Click "Add More" to add one.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Fleet Details Card */}
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-6 border border-violet-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Truck className="text-violet-600 shrink-0" size={20} />
                  Fleet Details
                </h3>
                <div className="w-full grid grid-cols-2 gap-4">
                  {/* Carrier Type */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Carrier Type <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="carrierType"
                      placeholder="Carrier Type"
                      value={editFormData.carrierType}
                      onChange={handleEditInputChange}
                      className={editFieldClass(!!editErrors.carrierType)}
                    />
                    {editErrors.carrierType && <p className="text-xs text-red-600 mt-1">Please enter the Carrier Type.</p>}
                  </div>
                  {/* Fleet Size */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Fleet Size <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      name="fleetsize"
                      placeholder="Fleet Size"
                      value={editFormData.fleetsize}
                      onChange={handleEditInputChange}
                      className={editFieldClass(!!editErrors.fleetsize)}
                    />
                    {editErrors.fleetsize && <p className="text-xs text-red-600 mt-1">Please enter the Fleet Size.</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Insurance amount (USD)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="insuranceAmount"
                      placeholder="e.g. 1000000"
                      value={editFormData.insuranceAmount ?? ''}
                      onChange={handleEditInputChange}
                      className={editFieldClass(false)}
                    />
                  </div>
                </div>
              </div>

              {/* Banking Details Card */}
              <div className="bg-gradient-to-br from-cyan-50 to-sky-50 rounded-2xl p-6 border border-cyan-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Wallet className="text-cyan-700 shrink-0" size={20} />
                  Banking Details
                </h3>
                <div className="w-full flex flex-col gap-4">
                  {/* Payment Type */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Payment Type</label>
                    <select
                      name="paymentType"
                      value={editFormData.paymentType || ''}
                      onChange={handleEditInputChange}
                      className={editFieldClass(false)}
                    >
                      <option value="">Select Payment Type...</option>
                      <option value="ACH">ACH</option>
                      <option value="Factoring">Factoring</option>
                    </select>
                  </div>

                  {/* Conditional Fields for Factoring */}
                  {editFormData.paymentType === 'Factoring' && (
                    <>
                      {/* Factoring Name */}
                      <div>
                        <label className="text-sm font-medium text-gray-700">Factoring Name</label>
                        <input
                          type="text"
                          name="factoringName"
                          placeholder="Factoring Name"
                          value={editFormData.factoringName || ''}
                          onChange={handleEditInputChange}
                          className={editFieldClass(false)}
                        />
                      </div>

                      {/* Bank Details Grid */}
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        {/* Bank Name */}
                        <div>
                          <label className="text-sm font-medium text-gray-700">Bank Name</label>
                          <input
                            type="text"
                            name="bankName"
                            placeholder="Bank Name"
                            value={editFormData.bankName || ''}
                            onChange={handleEditInputChange}
                            className={editFieldClass(false)}
                          />
                        </div>

                        {/* Account Number */}
                        <div>
                          <label className="text-sm font-medium text-gray-700">Account Number</label>
                          <input
                            type="text"
                            name="accountNumber"
                            placeholder="Account Number"
                            value={editFormData.accountNumber || ''}
                            onChange={handleEditInputChange}
                            className={editFieldClass(false)}
                          />
                        </div>

                        {/* Routing Number */}
                        <div>
                          <label className="text-sm font-medium text-gray-700">Routing Number</label>
                          <input
                            type="text"
                            name="routingNumber"
                            placeholder="Routing Number"
                            value={editFormData.routingNumber || ''}
                            onChange={handleEditInputChange}
                            className={editFieldClass(false)}
                          />
                        </div>

                        {/* Account Holder Name */}
                        <div>
                          <label className="text-sm font-medium text-gray-700">Account Holder Name</label>
                          <input
                            type="text"
                            name="accountHolderName"
                            placeholder="Account Holder Name"
                            value={editFormData.accountHolderName || ''}
                            onChange={handleEditInputChange}
                            className={editFieldClass(false)}
                          />
                        </div>

                        {/* Account Type */}
                        <div>
                          <label className="text-sm font-medium text-gray-700">Account Type</label>
                          <select
                            name="accountType"
                            value={editFormData.accountType || ''}
                            onChange={handleEditInputChange}
                            className={editFieldClass(false)}
                          >
                            <option value="">Select Account Type...</option>
                            <option value="Checking">Checking</option>
                            <option value="Savings">Savings</option>
                          </select>
                        </div>

                        {/* Bank Address */}
                        <div>
                          <label className="text-sm font-medium text-gray-700">Address</label>
                          <input
                            type="text"
                            name="bankAddress"
                            placeholder="Bank Address"
                            value={editFormData.bankAddress || ''}
                            onChange={handleEditInputChange}
                            className={editFieldClass(false)}
                          />
                        </div>

                        {/* Bank City */}
                        <div>
                          <label className="text-sm font-medium text-gray-700">City</label>
                          <input
                            type="text"
                            name="bankCity"
                            placeholder="City"
                            value={editFormData.bankCity || ''}
                            onChange={handleEditInputChange}
                            className={editFieldClass(false)}
                          />
                        </div>

                        {/* Bank State */}
                        <div>
                          <label className="text-sm font-medium text-gray-700">State</label>
                          <input
                            type="text"
                            name="bankState"
                            placeholder="State"
                            value={editFormData.bankState || ''}
                            onChange={handleEditInputChange}
                            className={editFieldClass(false)}
                          />
                        </div>

                        {/* Bank Zipcode */}
                        <div>
                          <label className="text-sm font-medium text-gray-700">Zipcode</label>
                          <input
                            type="text"
                            name="bankZipcode"
                            placeholder="Zipcode"
                            value={editFormData.bankZipcode || ''}
                            onChange={(e) => {
                              const v = e.target.value.toUpperCase().replace(/[^0-9-]/g, '').slice(0, 10);
                              setEditFormData(prev => ({ ...prev, bankZipcode: v }));
                            }}
                            className={editFieldClass(false)}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Current Documents Display Card */}
              {/* Only show Current Documents section if there are existing documents */}
              {Object.keys(editFormData).some(key => key.endsWith('Url') && editFormData[key]) && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FileText className="text-green-600 shrink-0" size={20} />
                    Current Documents
                  </h3>
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documentFields.map((doc) => {
                      const docUrl = editFormData[`${doc.key}Url`];
                      const docFileName = editFormData[`${doc.key}FileName`];

                      if (!docUrl) return null;

                      return (
                        <div key={doc.key} className="bg-white rounded-xl p-4 shadow-sm border border-green-100 hover:shadow-md transition">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <FileText className="text-green-600" size={16} />
                              <span className="font-medium text-sm text-gray-800">
                                {doc.label}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 bg-green-100 px-2 py-1 rounded">
                              Current
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div className="text-xs text-gray-600 truncate">
                              {docFileName || 'Document uploaded'}
                            </div>

                            <div className="flex gap-2 items-center">
                              <button
                                type="button"
                                onClick={() => handleDocumentPreview(absUrl(docUrl), doc.label)}
                                title="Preview"
                                className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                              >
                                <Eye size={18} />
                              </button>
                              <a
                                href={absUrl(docUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Download"
                                className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition"
                              >
                                <FaDownload size={18} />
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Documents upload (optional replacements) */}
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-6 border border-teal-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Upload className="text-teal-600 shrink-0" size={20} />
                  Upload New Documents
                </h3>
                <div className="w-full grid grid-cols-2 gap-4">
                  {documentFields.map((doc) => (
                    <div key={doc.key} className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FileText size={16} />
                        {doc.label}
                      </label>

                      <div className="relative">
                        <input
                          type="file"
                          name={doc.key}
                          onChange={handleEditFileChange}
                          className={editFieldClass(false, 'file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100')}
                        />
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                          {getEditUploadIcon(doc.key)}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        {editFormData[`${doc.key}Url`] ? 'Upload new file to replace current document' : 'Upload document'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              {/* NEW: Account Action Block (OK / Blacklist) */}
              {/* Account Action (OK / Blacklist) */}
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border border-amber-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Clock className="text-orange-600 shrink-0" size={20} />
                  Account Action
                </h3>

                {/* Dropdown */}
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Select Action</label>
                    <select
                      value={actionType}
                      onChange={(e) => {
                        setActionType(e.target.value);
                        setActionForm({ reason: '', remarks: '', attachment: null });
                        setActionErrors({});
                      }}
                      className={editFieldClass(false)}
                    >
                      <option value="">— Select —</option>
                      <option value="ok">OK (Remove from Blacklist)</option>
                      <option value="blacklist">Blacklist</option>
                    </select>
                  </div>
                </div>

                {/* NOTE: yahan koi <form> NAHI hoga */}
                {actionType && (
                  <div
                    className="w-full mt-4 space-y-4"
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} // Enter dabne se outer form submit na ho
                  >
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        {actionType === 'blacklist' ? 'Blacklist Reason' : 'Removal Reason'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="reason"
                        value={actionForm.reason}
                        onChange={handleActionInput}
                        placeholder={actionType === 'blacklist' ? 'Payment Issues' : 'Payment Issues Resolved'}
                        className={editFieldClass(!!actionErrors.reason)}
                      />
                      {actionErrors.reason && <p className="text-xs text-red-600 mt-1">Please enter the reason.</p>}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Remarks</label>
                      <textarea
                        name="remarks"
                        rows={3}
                        value={actionForm.remarks}
                        onChange={handleActionInput}
                        className={editFieldClass(false)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Attachment (optional)</label>
                      <input
                        type="file"
                        name="attachment"
                        onChange={handleActionInput}
                        accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx"
                        className={editFieldClass(!!actionErrors.attachment, 'file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100')}
                      />
                      {actionErrors.attachment && <p className="text-xs text-red-600 mt-1">{actionErrors.attachment}</p>}
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"               // IMPORTANT
                        onClick={handleAccountAction}
                        disabled={actionLoading}
                        className="flex-1 py-3 rounded-full text-lg font-bold bg-black text-white hover:opacity-90 transition disabled:opacity-60"
                      >
                        {actionLoading ? 'Submitting…' : (actionType === 'blacklist' ? 'Blacklist User' : 'Remove From Blacklist')}
                      </button>
                      <button
                        type="button"               // IMPORTANT
                        onClick={() => { setActionType(''); setActionForm({ reason: '', remarks: '', attachment: null }); setActionErrors({}); }}
                        className="flex-1 py-3 rounded-full text-lg font-bold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}
              </div>


              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => handleCloseModal()}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
        </div>
      </div>
  );
}
