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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Email Templates</h1>
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
            className="field-input sm:w-auto"
          >
            <option value="en">English</option>
            <option value="bn">বাংলা</option>
          </select>
          <button onClick={() => loadPreview(selectedTemplate, locale)} className="btn btn-primary">
            Refresh Preview
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Template List */}
        <div className="lg:col-span-3">
          <div className="bento-card overflow-hidden p-2">
            {categories.map((category) => (
              <div key={category}>
                <h3 className="eyebrow px-4 pb-2 pt-4">{category}</h3>
                {EMAIL_TEMPLATES.filter((t) => t.category === category).map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelect(template.id)}
                    className={`w-full rounded-2xl px-4 py-2.5 text-left text-sm font-bold transition-colors ${
                      selectedTemplate === template.id
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
        <div className="min-w-0 lg:col-span-9">
          <div className="bento-card">
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
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
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
          <div className="bento-card mt-4 p-4">
            <h3 className="mb-2 font-medium">Send Test Email</h3>
            <div className="flex gap-2">
              <input type="email" placeholder="test@example.com" className="field-input flex-1" />
              <button className="btn btn-sm border-brand-200 bg-card border text-brand-600 hover:bg-brand-50">
                Send Test
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
