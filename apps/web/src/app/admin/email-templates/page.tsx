'use client';

import { useState } from 'react';

import { apiClient } from '@/lib/api/client';

const EMAIL_TEMPLATES = [
  { id: 'welcome', name: 'Welcome', category: 'Authentication' },
  { id: 'verify-email', name: 'Email Verification', category: 'Authentication' },
  { id: 'password-reset', name: 'Password Reset', category: 'Authentication' },
  { id: 'password-changed', name: 'Password Changed', category: 'Authentication' },
  { id: 'order-confirmation', name: 'Order Confirmation', category: 'Orders' },
  { id: 'order-shipped', name: 'Order Shipped', category: 'Orders' },
  { id: 'order-delivered', name: 'Order Delivered', category: 'Orders' },
  { id: 'order-cancelled', name: 'Order Cancelled', category: 'Orders' },
  { id: 'refund-processed', name: 'Refund Processed', category: 'Payments' },
] as const;

const SAMPLE_DATA: Record<string, Record<string, any>> = {
  welcome: { name: 'Rahim Ahmed', shopUrl: 'https://bdshop.com.bd' },
  'verify-email': { name: 'Rahim Ahmed', verifyUrl: '#', expiresIn: '24 hours' },
  'password-reset': { name: 'Rahim Ahmed', resetUrl: '#', expiresIn: '1 hour' },
  'order-confirmation': {
    customerName: 'Rahim Ahmed',
    orderNumber: 'BD-20260213-001',
    items: [
      { name: 'Premium Cotton Panjabi', quantity: 1, price: 2500 },
      { name: 'Leather Sandals', quantity: 2, price: 1200 },
    ],
    subtotal: 4900,
    shipping: 60,
    discount: 200,
    total: 4760,
    trackingUrl: '#',
  },
  'order-shipped': {
    customerName: 'Rahim Ahmed',
    orderNumber: 'BD-20260213-001',
    carrier: 'Pathao Courier',
    trackingNumber: 'PTH123456789',
    estimatedDelivery: '2026-02-16',
    trackingUrl: '#',
  },
};

export default function EmailTemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState('welcome');
  const [locale, setLocale] = useState<'en' | 'bn'>('en');
  const [previewHtml, setPreviewHtml] = useState('');
  const [loading, setLoading] = useState(false);

  const loadPreview = async (templateId: string, lang: 'en' | 'bn') => {
    setLoading(true);
    try {
      const { data } = await apiClient.post(`/admin/email-templates/${templateId}/preview`, {
        locale: lang,
        context: SAMPLE_DATA[templateId] || {},
      });
      const result = data?.data ?? data;
      setPreviewHtml(result?.html ?? '');
    } catch {
      setPreviewHtml('<p>Failed to load preview</p>');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedTemplate(id);
    loadPreview(id, locale);
  };

  const categories = [...new Set(EMAIL_TEMPLATES.map((t) => t.category))];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
          <p className="text-gray-500">Preview and test email templates</p>
        </div>
        <div className="flex gap-2">
          <select
            value={locale}
            onChange={(e) => {
              const lang = e.target.value as 'en' | 'bn';
              setLocale(lang);
              loadPreview(selectedTemplate, lang);
            }}
            className="rounded-lg border px-3 py-2"
          >
            <option value="en">English</option>
            <option value="bn">বাংলা</option>
          </select>
          <button
            onClick={() => loadPreview(selectedTemplate, locale)}
            className="rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700"
          >
            Refresh Preview
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Template List */}
        <div className="col-span-3">
          <div className="rounded-lg border bg-white">
            {categories.map((category) => (
              <div key={category}>
                <h3 className="border-b bg-gray-50 px-4 py-2 text-xs font-semibold uppercase text-gray-500">
                  {category}
                </h3>
                {EMAIL_TEMPLATES.filter((t) => t.category === category).map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelect(template.id)}
                    className={`w-full border-b px-4 py-3 text-left text-sm transition-colors ${
                      selectedTemplate === template.id
                        ? 'bg-teal-50 font-medium text-teal-700'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="col-span-9">
          <div className="rounded-lg border bg-white">
            <div className="border-b px-4 py-3">
              <span className="text-sm text-gray-500">Preview: </span>
              <span className="font-medium">
                {EMAIL_TEMPLATES.find((t) => t.id === selectedTemplate)?.name}
              </span>
              <span className="ml-2 text-xs text-gray-400">
                ({locale === 'bn' ? 'বাংলা' : 'English'})
              </span>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="flex h-96 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                </div>
              ) : previewHtml ? (
                <iframe
                  srcDoc={previewHtml}
                  className="h-[600px] w-full rounded border"
                  title="Email Preview"
                />
              ) : (
                <div className="flex h-96 items-center justify-center text-gray-400">
                  Select a template to preview
                </div>
              )}
            </div>
          </div>

          {/* Send Test Email */}
          <div className="mt-4 rounded-lg border bg-white p-4">
            <h3 className="mb-2 font-medium">Send Test Email</h3>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="test@example.com"
                className="flex-1 rounded-lg border px-3 py-2 text-sm"
              />
              <button className="rounded-lg border border-teal-600 px-4 py-2 text-sm text-teal-600 hover:bg-teal-50">
                Send Test
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
