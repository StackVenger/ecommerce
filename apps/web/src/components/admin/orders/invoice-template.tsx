'use client';

import React, { useRef } from 'react';

interface InvoiceItem {
  name: string;
  nameBn: string;
  sku: string;
  variant: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface InvoiceData {
  orderNumber: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  shippingAddress: {
    name: string;
    address: string;
    city: string;
    area: string;
    postalCode: string;
    phone: string;
  };
  billingAddress: {
    name: string;
    address: string;
    city: string;
    area: string;
    postalCode: string;
    phone: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  couponCode: string | null;
  totalAmount: number;
  store: {
    name: string;
    nameBn: string;
    address: string;
    addressBn: string;
    phone: string;
    email: string;
    website: string;
    logo: string;
    taxId: string;
  };
}

interface InvoiceTemplateProps {
  data: InvoiceData;
  showActions?: boolean;
}

function formatBDT(amount: number): string {
  return `৳ ${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function InvoiceTemplate({ data, showActions = true }: InvoiceTemplateProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Print Actions */}
      {showActions && (
        <div className="mx-auto mb-6 flex max-w-4xl items-center justify-between gap-3 print:hidden">
          <a href="/admin/orders" className="btn btn-soft btn-sm">
            &larr; Back to Orders
          </a>
          <div className="flex items-center gap-3">
            <button type="button" onClick={handlePrint} className="btn btn-primary">
              Print Invoice
            </button>
          </div>
        </div>
      )}

      {/* Invoice */}
      <div
        ref={printRef}
        className="theme-light mx-auto max-w-4xl overflow-x-auto rounded-[2rem] border border-foreground/[0.04] bg-card p-6 shadow-bento sm:p-10 print:overflow-visible print:rounded-none print:border-0 print:p-0 print:shadow-none"
        style={{ fontFamily: "'Noto Sans Bengali', 'Noto Sans', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-gray-800 pb-6">
          <div>
            {data.store.logo && (
              <img src={data.store.logo} alt={data.store.name} className="h-12 mb-2" />
            )}
            <h1 className="text-2xl font-black tracking-tight text-gray-900">{data.store.name}</h1>
            <p className="text-sm text-gray-600">{data.store.nameBn}</p>
            <p className="text-sm text-gray-600 mt-1">{data.store.address}</p>
            <p className="text-sm text-gray-600">{data.store.addressBn}</p>
            <p className="text-sm text-gray-600">Phone: {data.store.phone}</p>
            <p className="text-sm text-gray-600">Email: {data.store.email}</p>
            {data.store.taxId && (
              <p className="text-sm text-gray-600">TIN/BIN: {data.store.taxId}</p>
            )}
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-black tracking-tighter text-gray-900">INVOICE</h2>
            <p className="text-lg text-gray-600">চালান</p>
            <div className="mt-4 space-y-1">
              <p className="text-sm">
                <span className="text-gray-600">Invoice #:</span>{' '}
                <span className="font-medium">{data.invoiceNumber}</span>
              </p>
              <p className="text-sm">
                <span className="text-gray-600">Order #:</span>{' '}
                <span className="font-medium">{data.orderNumber}</span>
              </p>
              <p className="text-sm">
                <span className="text-gray-600">Date / তারিখ:</span>{' '}
                <span className="font-medium">
                  {new Date(data.invoiceDate).toLocaleDateString('en-BD', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </p>
              <p className="text-sm">
                <span className="text-gray-600">Payment / পেমেন্ট:</span>{' '}
                <span
                  className={`font-medium ${data.paymentStatus === 'paid' ? 'text-green-700' : 'text-red-700'}`}
                >
                  {data.paymentStatus === 'paid' ? 'Paid / পরিশোধিত' : 'Unpaid / অপরিশোধিত'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Billing / Shipping */}
        <div className="grid grid-cols-2 gap-8 mt-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">
              Bill To / বিল প্রাপক
            </h3>
            <p className="text-sm font-medium text-gray-900">{data.billingAddress.name}</p>
            <p className="text-sm text-gray-600">{data.billingAddress.address}</p>
            <p className="text-sm text-gray-600">
              {data.billingAddress.area}, {data.billingAddress.city}
            </p>
            <p className="text-sm text-gray-600">{data.billingAddress.postalCode}</p>
            <p className="text-sm text-gray-600">{data.billingAddress.phone}</p>
            <p className="text-sm text-gray-600">{data.customer.email}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">
              Ship To / প্রাপকের ঠিকানা
            </h3>
            <p className="text-sm font-medium text-gray-900">{data.shippingAddress.name}</p>
            <p className="text-sm text-gray-600">{data.shippingAddress.address}</p>
            <p className="text-sm text-gray-600">
              {data.shippingAddress.area}, {data.shippingAddress.city}
            </p>
            <p className="text-sm text-gray-600">{data.shippingAddress.postalCode}</p>
            <p className="text-sm text-gray-600">{data.shippingAddress.phone}</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mt-8">
          <table className="w-full">
            <thead>
              <tr className="bg-ink text-white">
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">#</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">Item / পণ্য</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase">SKU</th>
                <th className="px-4 py-2 text-center text-xs font-medium uppercase">
                  Qty / পরিমাণ
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase">
                  Price / মূল্য
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase">Total / মোট</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.items.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-card' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.nameBn}</div>
                    {item.variant && (
                      <div className="text-xs text-gray-400 mt-0.5">{item.variant}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{item.sku}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-center">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {formatBDT(item.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                    {formatBDT(item.totalPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-6 flex justify-end">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal / উপমোট:</span>
              <span className="text-gray-900">{formatBDT(data.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shipping / ডেলিভারি:</span>
              <span className="text-gray-900">{formatBDT(data.shippingCost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax / কর (VAT):</span>
              <span className="text-gray-900">{formatBDT(data.tax)}</span>
            </div>
            {data.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Discount / ছাড় {data.couponCode && `(${data.couponCode})`}:
                </span>
                <span className="text-green-700">-{formatBDT(data.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t-2 border-gray-800">
              <span className="text-gray-900">Total / সর্বমোট:</span>
              <span className="text-gray-900">{formatBDT(data.totalAmount)}</span>
            </div>
            <div className="text-xs text-gray-500 text-right">
              In words: Taka {Math.floor(data.totalAmount).toLocaleString()} only
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="mt-8 rounded-[1.25rem] bg-gray-50 p-4 print:rounded-none">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">
            Payment Method / পেমেন্ট পদ্ধতি
          </h3>
          <p className="text-sm text-gray-600 capitalize">{data.paymentMethod}</p>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Terms & Conditions / শর্তাবলী
              </h3>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Products can be returned within 7 days of delivery.</li>
                <li>• ৭ দিনের মধ্যে পণ্য ফেরত দেওয়া যাবে।</li>
                <li>• Damaged items must be reported within 24 hours.</li>
                <li>• ক্ষতিগ্রস্ত পণ্য ২৪ ঘন্টার মধ্যে জানাতে হবে।</li>
              </ul>
            </div>
            <div className="text-right">
              <div className="mt-12 pt-4 border-t border-gray-400 inline-block">
                <p className="text-sm font-medium text-gray-700">Authorized Signature</p>
                <p className="text-xs text-gray-500">অনুমোদিত স্বাক্ষর</p>
              </div>
            </div>
          </div>
          <div className="text-center mt-8 text-xs text-gray-400">
            <p>Thank you for your purchase! / আপনার ক্রয়ের জন্য ধন্যবাদ!</p>
            <p className="mt-1">{data.store.website}</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:shadow-none,
          .print\\:shadow-none * {
            visibility: visible;
          }
          .print\\:shadow-none {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            margin: 1cm;
            size: A4;
          }
        }
      `}</style>
    </div>
  );
}
