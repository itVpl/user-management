import React, { useCallback, useRef, useState } from 'react';
import { Building2, Mail, Phone, User, Link2, MapPin, Truck } from 'lucide-react';
import { toast } from 'react-toastify';
import { createAgentCustomerFromEvent } from '../../services/agentCustomerEventService.js';

const initialForm = {
  companyName: '',
  personName: '',
  linkedin: '',
  contactNumber: '',
  email: '',
  whatsappNumber: '',
  commodity: '',
  companyAddress: '',
  city: '',
  state: '',
  country: '',
  zipcode: '',
  shippingTo: '',
};

const emailRegex = /^[^\s@]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const phoneRegex = /^\+?\d{10,15}$/;
const zipRegex = /^[A-Za-z0-9]{5,8}$/;

function fieldClass(err) {
  return `w-full px-4 py-3 border rounded-xl text-base text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 transition-colors ${
    err ? 'border-red-300' : 'border-gray-200'
  }`;
}

export default function SalesDayAgentManualCustomerForm() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const fieldRefs = useRef({});

  const validate = useCallback((data) => {
    const e = {};
    if (data.personName && (data.personName.trim().length < 2 || data.personName.trim().length > 120)) {
      e.personName = 'Person name must be 2-120 characters.';
    }
    if (data.companyName && (data.companyName.trim().length < 2 || data.companyName.trim().length > 200)) {
      e.companyName = 'Company name must be 2-200 characters.';
    }
    if (data.contactNumber && !phoneRegex.test(data.contactNumber.trim())) {
      e.contactNumber = 'Contact number must be 10-15 digits, optional +.';
    }
    if (data.whatsappNumber && !phoneRegex.test(data.whatsappNumber.trim())) {
      e.whatsappNumber = 'WhatsApp number must be 10-15 digits, optional +.';
    }
    if (data.email && !emailRegex.test(data.email.trim())) e.email = 'Please enter a valid email.';
    if (data.companyAddress) {
      const t = data.companyAddress.trim();
      if (t.length < 5 || t.length > 300) e.companyAddress = 'Company address must be 5-300 characters.';
    }
    if (data.linkedin && data.linkedin.trim().length > 255) e.linkedin = 'LinkedIn must be at most 255 characters.';
    if (data.zipcode?.trim()) {
      const z = data.zipcode.replace(/[^a-zA-Z0-9]/g, '');
      if (!zipRegex.test(z)) e.zipcode = 'Invalid zip/postal code.';
    }
    return e;
  }, []);

  const onChange = (ev) => {
    const { name, value: raw } = ev.target;
    let v = raw;
    if (name === 'email') v = v.replace(/\s+/g, '');
    if (name === 'contactNumber' || name === 'whatsappNumber') {
      const keepPlus = v.startsWith('+');
      const digits = v.replace(/\D+/g, '').slice(0, 15);
      v = keepPlus ? `+${digits}` : digits;
    }
    if (name === 'zipcode') v = v.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    setForm((prev) => ({ ...prev, [name]: v }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const onBlur = (ev) => {
    const { name, value } = ev.target;
    const next = validate({ ...form, [name]: value });
    setErrors((er) => ({ ...er, [name]: next[name] || undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    const first = Object.keys(v).find((k) => v[k]);
    if (first) {
      fieldRefs.current[first]?.focus?.();
      toast.error('Please fix the highlighted fields.');
      return;
    }

    setLoading(true);
    try {
      const cleaned = {
        companyName: form.companyName.trim(),
        personName: form.personName.trim(),
        linkedin: form.linkedin.trim(),
        contactNumber: form.contactNumber.trim(),
        email: form.email.trim(),
        whatsappNumber: form.whatsappNumber.trim(),
        commodity: form.commodity.trim(),
        companyAddress: form.companyAddress.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country.trim(),
        zipcode: form.zipcode.trim(),
        shippingTo: form.shippingTo.trim(),
      };
      const payload = Object.fromEntries(
        Object.entries(cleaned).filter(([, val]) => val !== '' && val !== undefined),
      );

      const res = await createAgentCustomerFromEvent(payload);
      if (res?.success) {
        toast.success(res.message || 'Agent customer created.');
        setForm(initialForm);
        setErrors({});
      } else {
        const apiErrors = res?.errors || {};
        if (Object.keys(apiErrors).length) setErrors((prev) => ({ ...prev, ...apiErrors }));
        toast.error(res?.message || 'Create failed');
      }
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || 'Create failed';
      const apiErrors = err?.response?.data?.errors || {};
      if (Object.keys(apiErrors).length) {
        setErrors((prev) => ({ ...prev, ...apiErrors }));
        toast.error(msg);
      } else if (status === 401) {
        toast.error('Session expired. Please log in again.');
      } else if (status === 409) {
        setErrors((prev) => ({ ...prev, email: 'Email already exists.' }));
        fieldRefs.current.email?.focus();
        toast.error('Email already exists.');
      } else if (status === 400 || status === 422) {
        toast.error(msg);
      } else if (status >= 500) {
        toast.error('Server error. Please try again.');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-5 py-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">Add Agent Customer</h2>
        <p className="text-base text-blue-100/95 mt-1.5 leading-snug">Enter customer information below</p>
      </div>

      <div className="px-5 pb-5 space-y-5">
      <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-5 space-y-5">
        <h3 className="text-base font-semibold text-blue-900">Basic Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-700" htmlFor="sda-personName">
              Person name
            </label>
            <div className="relative mt-1.5">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                id="sda-personName"
                name="personName"
                value={form.personName}
                onChange={onChange}
                onBlur={onBlur}
                className={fieldClass(errors.personName) + ' pl-11'}
                placeholder="Optional"
                ref={(el) => {
                  fieldRefs.current.personName = el;
                }}
              />
            </div>
            {errors.personName && <p className="text-red-600 text-sm mt-1.5">{errors.personName}</p>}
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700" htmlFor="sda-companyName">
              Company name
            </label>
            <div className="relative mt-1.5">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                id="sda-companyName"
                name="companyName"
                value={form.companyName}
                onChange={onChange}
                onBlur={onBlur}
                className={fieldClass(errors.companyName) + ' pl-11'}
                placeholder="Optional"
              />
            </div>
            {errors.companyName && <p className="text-red-600 text-sm mt-1.5">{errors.companyName}</p>}
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700" htmlFor="sda-li">
              LinkedIn
            </label>
            <div className="relative mt-1.5">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                id="sda-li"
                name="linkedin"
                value={form.linkedin}
                onChange={onChange}
                onBlur={onBlur}
                className={fieldClass(errors.linkedin) + ' pl-11'}
                placeholder="Optional"
              />
            </div>
            {errors.linkedin && <p className="text-red-600 text-sm mt-1.5">{errors.linkedin}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-700" htmlFor="sda-contact">
              Contact number
            </label>
            <div className="relative mt-1.5">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                id="sda-contact"
                name="contactNumber"
                value={form.contactNumber}
                onChange={onChange}
                onBlur={onBlur}
                className={fieldClass(errors.contactNumber) + ' pl-11'}
                placeholder="+919058179713"
                maxLength={16}
              />
            </div>
            {errors.contactNumber && <p className="text-red-600 text-sm mt-1.5">{errors.contactNumber}</p>}
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700" htmlFor="sda-wa">
              WhatsApp
            </label>
            <div className="relative mt-1.5">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                id="sda-wa"
                name="whatsappNumber"
                value={form.whatsappNumber}
                onChange={onChange}
                onBlur={onBlur}
                className={fieldClass(errors.whatsappNumber) + ' pl-11'}
                placeholder="Optional"
                maxLength={16}
              />
            </div>
            {errors.whatsappNumber && <p className="text-red-600 text-sm mt-1.5">{errors.whatsappNumber}</p>}
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700" htmlFor="sda-email">
              Email
            </label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                id="sda-email"
                name="email"
                value={form.email}
                onChange={onChange}
                onBlur={onBlur}
                className={fieldClass(errors.email) + ' pl-11'}
                placeholder="Optional (server may generate if empty)"
                ref={(el) => {
                  fieldRefs.current.email = el;
                }}
              />
            </div>
            {errors.email && <p className="text-red-600 text-sm mt-1.5">{errors.email}</p>}
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700" htmlFor="sda-commodity">
              Commodity
            </label>
            <div className="relative mt-1.5">
              <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                id="sda-commodity"
                name="commodity"
                value={form.commodity}
                onChange={onChange}
                onBlur={onBlur}
                className={fieldClass(errors.commodity) + ' pl-11'}
                placeholder="Optional"
              />
            </div>
            {errors.commodity && <p className="text-red-600 text-sm mt-1.5">{errors.commodity}</p>}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-5 space-y-4">
        <h3 className="text-base font-semibold text-emerald-900">Address</h3>
        <div>
          <label className="text-sm font-semibold text-gray-700" htmlFor="sda-addr">
            Company address
          </label>
          <div className="relative mt-1.5">
            <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
            <textarea
              id="sda-addr"
              name="companyAddress"
              value={form.companyAddress}
              onChange={onChange}
              onBlur={onBlur}
              rows={3}
              className={fieldClass(errors.companyAddress) + ' pl-11 resize-y min-h-[5.5rem] leading-relaxed'}
              placeholder="Optional, 5-300 characters if provided"
            />
          </div>
          {errors.companyAddress && <p className="text-red-600 text-sm mt-1.5">{errors.companyAddress}</p>}
        </div>
      </div>

      <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-5">
        <h3 className="text-base font-semibold text-violet-900 mb-4">Location</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'country', label: 'Country', required: false },
            { name: 'state', label: 'State', required: false },
            { name: 'city', label: 'City', required: false },
            { name: 'zipcode', label: 'Zip / postal', required: false },
          ].map(({ name, label, required }) => (
            <div key={name}>
              <label className="text-sm font-semibold text-gray-700" htmlFor={`sda-${name}`}>
                {label}
                {required && <span className="text-red-500"> *</span>}
              </label>
              <input
                id={`sda-${name}`}
                name={name}
                value={form[name]}
                onChange={onChange}
                onBlur={onBlur}
                className={fieldClass(errors[name]) + ' mt-1.5'}
                ref={(el) => {
                  fieldRefs.current[name] = el;
                }}
              />
              {errors[name] && <p className="text-red-600 text-sm mt-1.5">{errors[name]}</p>}
            </div>
          ))}
          <div>
            <label className="text-sm font-semibold text-gray-700" htmlFor="sda-shippingTo">
              Shipping to
            </label>
            <input
              id="sda-shippingTo"
              name="shippingTo"
              value={form.shippingTo}
              onChange={onChange}
              onBlur={onBlur}
              className={fieldClass(errors.shippingTo) + ' mt-1.5'}
            />
            {errors.shippingTo && <p className="text-red-600 text-sm mt-1.5">{errors.shippingTo}</p>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={() => {
            setForm(initialForm);
            setErrors({});
          }}
          className="mt-3 px-5 py-3 rounded-xl border border-gray-300 bg-white text-base font-semibold text-gray-700 hover:bg-gray-50"
        >
          Clear
        </button>
        <button
          type="submit"
          disabled={loading}
          className="mt-3 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-base font-semibold hover:from-blue-700 hover:to-violet-700 disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Create AgentCustomer'}
        </button>
      </div>
      </div>
    </form>
  );
}
