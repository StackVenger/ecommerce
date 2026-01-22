'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

import { apiClient } from '@/lib/api/client';
import InvoiceTemplate from '@/components/admin/orders/invoice-template';

const STORE_INFO = {
  name: 'BDShop',
  nameBn: 'বিডিশপ',
  address: '123 Gulshan Avenue, Dhaka-1212',
  addressBn: '১২৩ গুলশান এভিনিউ, ঢাকা-১২১২',
  phone: '+880-1700-000000',
  email: 'info@bdshop.com',
  website: 'www.bdshop.com',
  logo: '',
  taxId: '',
};

export default function InvoicePage() {
  const params = useParams();
  const orderId = params.id as string;
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvoiceData() {
      try {
        const { data } = await apiClient.get(`/admin/orders/${orderId}/invoice-data`);
        const raw = data.data ?? data;
        setInvoiceData({
          ...raw,
          invoiceDate: raw.invoiceDate ?? new Date().toISOString(),
          dueDate: raw.dueDate ?? '',
          status: raw.paymentStatus ?? 'pending',
          store: STORE_INFO,
        });
      } catch (err: any) {
        console.error('Error fetching invoice data:', err);
        setError('Failed to load invoice data.');
      } finally {
        setLoading(false);
      }
    }
    fetchInvoiceData();
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (error || !invoiceData) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Unable to load invoice</h2>
        <p className="text-gray-500 mt-2">{error ?? 'Invoice data not found.'}</p>
        <a href="/admin/orders" className="inline-flex items-center mt-4 text-teal-600 hover:text-teal-800">
          &larr; Back to Orders
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <InvoiceTemplate data={invoiceData} showActions={true} />
    </div>
  );
}
