'use client';

import { MapPin, Plus, Edit2, Trash2, Star, Phone, Home, Briefcase } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

import { AddressForm } from '@/components/account/address-form';
import { useConfirm } from '@/components/admin/ui/confirm-dialog';
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  type Address,
  type CreateAddressData,
} from '@/lib/api/addresses';
import { getApiErrorMessage } from '@/lib/api/errors';

const labelIcons: Record<string, typeof Home> = {
  Home: Home,
  Work: Briefcase,
  Office: Briefcase,
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const fetchAddresses = useCallback(async () => {
    try {
      const data = await getAddresses();
      setAddresses(data);
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const handleCreate = async (data: CreateAddressData) => {
    setIsSaving(true);
    try {
      await createAddress(data);
      await fetchAddresses();
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create address:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: CreateAddressData) => {
    if (!editingAddress) {
      return;
    }
    setIsSaving(true);
    try {
      await updateAddress(editingAddress.id, data);
      await fetchAddresses();
      setEditingAddress(null);
    } catch (error) {
      console.error('Failed to update address:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete this address?',
      description:
        'You can always add it again later. Past orders that used this address will keep their delivery details.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) {
      return;
    }

    try {
      await deleteAddress(id);
      await fetchAddresses();
      toast.success('Address deleted');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to delete address'));
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultAddress(id);
      await fetchAddresses();
    } catch (error) {
      console.error('Failed to set default address:', error);
    }
  };

  if (showForm || editingAddress) {
    return (
      <AddressForm
        address={editingAddress}
        onSubmit={editingAddress ? handleUpdate : handleCreate}
        onCancel={() => {
          setShowForm(false);
          setEditingAddress(null);
        }}
        isLoading={isSaving}
      />
    );
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Addresses</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your delivery addresses</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Address
        </button>
      </div>

      {/* Addresses Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-5 w-24 bg-gray-200 rounded mb-3" />
              <div className="space-y-2">
                <div className="h-4 w-48 bg-gray-200 rounded" />
                <div className="h-4 w-36 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : addresses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No addresses saved</h3>
          <p className="text-sm text-gray-500 mb-4">Add a delivery address to get started.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Your First Address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => {
            const LabelIcon = labelIcons[address.label] || MapPin;

            return (
              <div
                key={address.id}
                className={`bg-white rounded-xl border shadow-sm p-5 ${
                  address.isDefault ? 'border-teal-300 ring-1 ring-primary/20' : 'border-gray-200'
                }`}
              >
                {/* Label and Badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <LabelIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-900">{address.label}</span>
                    {address.isDefault && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-primary text-xs font-medium rounded-full">
                        <Star className="w-3 h-3" />
                        Default
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingAddress(address)}
                      className="p-1.5 text-gray-400 hover:text-primary rounded"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(address.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Address Details */}
                <div className="space-y-1 text-sm text-gray-600">
                  <p className="font-medium text-gray-900">{address.fullName}</p>
                  <p>{address.addressLine1}</p>
                  {address.addressLine2 && <p>{address.addressLine2}</p>}
                  <p>
                    {address.city}, {address.district}
                    {address.division ? `, ${address.division}` : ''}
                    {address.postalCode ? ` - ${address.postalCode}` : ''}
                  </p>
                  {address.landmark && (
                    <p className="text-gray-400 text-xs">Landmark: {address.landmark}</p>
                  )}
                  <p className="flex items-center gap-1 pt-1">
                    <Phone className="w-3.5 h-3.5" />
                    {address.phone}
                  </p>
                </div>

                {/* Set Default Button */}
                {!address.isDefault && (
                  <button
                    onClick={() => handleSetDefault(address.id)}
                    className="mt-3 text-xs text-primary hover:text-primary font-medium"
                  >
                    Set as default
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
