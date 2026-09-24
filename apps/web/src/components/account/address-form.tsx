'use client';

import { X, MapPin, Save } from 'lucide-react';
import { useState } from 'react';

import type { Address, CreateAddressData } from '@/lib/api/addresses';

interface AddressFormProps {
  address?: Address | null;
  onSubmit: (data: CreateAddressData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const bdDivisions = [
  'Barisal',
  'Chattogram',
  'Dhaka',
  'Khulna',
  'Mymensingh',
  'Rajshahi',
  'Rangpur',
  'Sylhet',
];

const addressLabels = ['Home', 'Work', 'Office', 'Other'];

export function AddressForm({ address, onSubmit, onCancel, isLoading = false }: AddressFormProps) {
  const [formData, setFormData] = useState<CreateAddressData>({
    fullName: address?.fullName || '',
    phone: address?.phone || '',
    addressLine1: address?.addressLine1 || '',
    addressLine2: address?.addressLine2 || '',
    city: address?.city || '',
    district: address?.district || '',
    division: address?.division || '',
    postalCode: address?.postalCode || '',
    landmark: address?.landmark || '',
    label: address?.label || 'Home',
    isDefault: address?.isDefault || false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    if (!formData.addressLine1.trim()) {
      newErrors.addressLine1 = 'Address is required';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!formData.district.trim()) {
      newErrors.district = 'District is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }
    await onSubmit(formData);
  };

  const updateField = (field: keyof CreateAddressData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <div className="bento-card">
      <div className="flex items-center justify-between gap-4 border-b border-foreground/[0.04] px-6 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <MapPin className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <div>
            <h3 className="section-title">{address ? 'Edit Address' : 'Add New Address'}</h3>
            <p className="eyebrow mt-0.5">Delivery details</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="btn-icon h-10 w-10 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-900"
          aria-label="Close address form"
        >
          <X className="h-5 w-5" strokeWidth={2.25} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 p-6 sm:p-8">
        {/* Label Selection */}
        <div>
          <label className="field-label mb-2">Address Label</label>
          <div className="flex flex-wrap gap-2">
            {addressLabels.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => updateField('label', label)}
                className={`chip ${formData.label === label ? 'chip-active' : 'bg-gray-50'}`}
                aria-pressed={formData.label === label}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Name and Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label">Full Name *</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
              placeholder="e.g. Rizwan Ahmed"
              className={`field-input ${
                errors.fullName
                  ? 'border-rose-300 focus:border-rose-300 focus:ring-rose-500/10'
                  : ''
              }`}
            />
            {errors.fullName && <p className="field-error">{errors.fullName}</p>}
          </div>

          <div>
            <label className="field-label">Phone Number *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="+8801XXXXXXXXX"
              className={`field-input ${
                errors.phone ? 'border-rose-300 focus:border-rose-300 focus:ring-rose-500/10' : ''
              }`}
            />
            {errors.phone && <p className="field-error">{errors.phone}</p>}
          </div>
        </div>

        {/* Address Lines */}
        <div>
          <label className="field-label">Address Line 1 *</label>
          <input
            type="text"
            value={formData.addressLine1}
            onChange={(e) => updateField('addressLine1', e.target.value)}
            placeholder="House/Flat No., Road, Area"
            className={`field-input ${
              errors.addressLine1
                ? 'border-rose-300 focus:border-rose-300 focus:ring-rose-500/10'
                : ''
            }`}
          />
          {errors.addressLine1 && <p className="field-error">{errors.addressLine1}</p>}
        </div>

        <div>
          <label className="field-label">Address Line 2</label>
          <input
            type="text"
            value={formData.addressLine2}
            onChange={(e) => updateField('addressLine2', e.target.value)}
            placeholder="Apartment, Suite, Floor (optional)"
            className="field-input"
          />
        </div>

        {/* City, District, Division */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="field-label">City *</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => updateField('city', e.target.value)}
              placeholder="e.g. Dhaka"
              className={`field-input ${
                errors.city ? 'border-rose-300 focus:border-rose-300 focus:ring-rose-500/10' : ''
              }`}
            />
            {errors.city && <p className="field-error">{errors.city}</p>}
          </div>

          <div>
            <label className="field-label">District *</label>
            <input
              type="text"
              value={formData.district}
              onChange={(e) => updateField('district', e.target.value)}
              placeholder="e.g. Dhaka"
              className={`field-input ${
                errors.district
                  ? 'border-rose-300 focus:border-rose-300 focus:ring-rose-500/10'
                  : ''
              }`}
            />
            {errors.district && <p className="field-error">{errors.district}</p>}
          </div>

          <div>
            <label className="field-label">Division</label>
            <select
              value={formData.division}
              onChange={(e) => updateField('division', e.target.value)}
              className="field-input"
            >
              <option value="">Select Division</option>
              {bdDivisions.map((div) => (
                <option key={div} value={div}>
                  {div}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Postal Code and Landmark */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label">Postal Code</label>
            <input
              type="text"
              value={formData.postalCode}
              onChange={(e) => updateField('postalCode', e.target.value)}
              placeholder="e.g. 1205"
              className="field-input"
            />
          </div>

          <div>
            <label className="field-label">Landmark</label>
            <input
              type="text"
              value={formData.landmark}
              onChange={(e) => updateField('landmark', e.target.value)}
              placeholder="Near mosque, school, etc."
              className="field-input"
            />
          </div>
        </div>

        {/* Default Address */}
        <label className="flex w-fit cursor-pointer items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3">
          <input
            type="checkbox"
            checked={formData.isDefault}
            onChange={(e) => updateField('isDefault', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm font-bold text-gray-700">Set as default address</span>
        </label>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse gap-2 border-t border-foreground/[0.04] pt-6 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="btn btn-soft">
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className="btn btn-primary">
            <Save className="w-4 h-4" />
            {isLoading ? 'Saving...' : address ? 'Update Address' : 'Save Address'}
          </button>
        </div>
      </form>
    </div>
  );
}
