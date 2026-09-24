'use client';

import { useParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';

import InvoiceTemplate from '@/components/admin/orders/invoice-template';
import { EmptyState, LoadingState } from '@/components/ui/bento';
import { apiClient } from '@/lib/api/client';

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
    return <LoadingState label="Loading invoice" className="min-h-[60vh]" />;
  }

  if (error || !invoiceData) {
    return (
      <EmptyState
        title="Unable to load invoice"
        description={error ?? 'Invoice data not found.'}
        action={
          <a href="/admin/orders" className="btn btn-soft">
            &larr; Back to Orders
          </a>
        }
      />
    );
  }

  return (
    <div className="min-h-screen py-2 sm:py-4 print:min-h-0 print:py-0">
      <InvoiceTemplate data={invoiceData} showActions={true} />
    </div>
  );
}
