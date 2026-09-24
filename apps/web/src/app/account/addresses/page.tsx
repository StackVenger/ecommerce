'use client';

import { MapPin, Plus, Edit2, Trash2, Star, Phone, Home, Briefcase } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

import { AddressForm } from '@/components/account/address-form';
import { useConfirm } from '@/components/admin/ui/confirm-dialog';
import { EmptyState, PageHeader, SkeletonBlock } from '@/components/ui/bento';
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
    <div className="space-y-4 sm:space-y-6">
      {confirmDialog}
      <PageHeader
        title="My Addresses"
        description="Manage your delivery addresses"
        className="mb-0 sm:mb-0"
        actions={
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Add Address
          </button>
        }
      />

      {/* Addresses Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <SkeletonBlock key={i} className="h-56 rounded-[2rem] bg-card" />
          ))}
        </div>
      ) : addresses.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No addresses saved"
          description="Add a delivery address to get started."
          action={
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Add Your First Address
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          {addresses.map((address) => {
            const LabelIcon = labelIcons[address.label] || MapPin;

            return (
              <div
                key={address.id}
                className={`bento-card bento-card-hover group flex flex-col p-6 ${
                  address.isDefault ? 'ring-2 ring-primary/20' : ''
                }`}
              >
                {/* Label and Badge */}
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-transform duration-500 group-hover:scale-110 ${
                        address.isDefault
                          ? 'bg-brand-50 text-brand-600'
                          : 'bg-blue-50 text-blue-500'
                      }`}
                    >
                      <LabelIcon className="h-5 w-5" strokeWidth={2.25} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-base font-black tracking-tight text-gray-900">
                        {address.label}
                      </span>
                      {address.isDefault && (
                        <span className="pill pill-brand w-fit">
                          <Star className="h-3 w-3" strokeWidth={2.5} />
                          Default
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingAddress(address)}
                      className="btn-icon h-9 w-9 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                      title="Edit"
                      aria-label={`Edit ${address.label} address`}
                    >
                      <Edit2 className="h-4 w-4" strokeWidth={2.25} />
                    </button>
                    <button
                      onClick={() => handleDelete(address.id)}
                      className="btn-icon h-9 w-9 rounded-xl text-gray-400 hover:bg-rose-50 hover:text-rose-500"
                      title="Delete"
                      aria-label={`Delete ${address.label} address`}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2.25} />
                    </button>
                  </div>
                </div>

                {/* Address Details */}
                <div className="flex-1 space-y-1 rounded-[1.5rem] bg-gray-50 p-4 text-sm font-medium text-gray-600">
                  <p className="font-black text-gray-900">{address.fullName}</p>
                  <p>{address.addressLine1}</p>
                  {address.addressLine2 && <p>{address.addressLine2}</p>}
                  <p>
                    {address.city}, {address.district}
                    {address.division ? `, ${address.division}` : ''}
                    {address.postalCode ? ` - ${address.postalCode}` : ''}
                  </p>
                  {address.landmark && (
                    <p className="text-xs text-gray-400">Landmark: {address.landmark}</p>
                  )}
                  <p className="flex items-center gap-1.5 pt-1 font-bold text-gray-700">
                    <Phone className="h-3.5 w-3.5" strokeWidth={2.5} />
                    {address.phone}
                  </p>
                </div>

                {/* Set Default Button */}
                {!address.isDefault && (
                  <button
                    onClick={() => handleSetDefault(address.id)}
                    className="btn btn-soft btn-sm mt-4 w-fit"
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
