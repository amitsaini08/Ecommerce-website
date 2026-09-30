'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { FiMail, FiUser, FiSend, FiPhone, FiMapPin } from 'react-icons/fi';
import { validateEmailFormat } from '@/lib/inputHelpers';

export default function ContactPage() {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    const newErrs = { ...fieldErrors };
    if (field === 'name') {
      if (!value.trim()) newErrs.name = 'Name is required';
      else if (value.trim().length < 2) newErrs.name = 'Name must be at least 2 characters';
      else newErrs.name = '';
    }
    if (field === 'email') {
      newErrs.email = validateEmailFormat(value);
    }
    if (field === 'subject') {
      if (!value.trim()) newErrs.subject = 'Subject is required';
      else if (value.trim().length < 2) newErrs.subject = 'Subject must be at least 2 characters';
      else newErrs.subject = '';
    }
    if (field === 'message') {
      if (!value.trim()) newErrs.message = 'Message is required';
      else if (value.trim().length < 5) newErrs.message = 'Message must be at least 5 characters';
      else newErrs.message = '';
    }

    setFieldErrors(newErrs);
  };

  const isFormValid =
    form.name.trim().length >= 2 &&
    form.email.trim() &&
    !validateEmailFormat(form.email) &&
    form.subject.trim().length >= 2 &&
    form.message.trim().length >= 5;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          subject: form.subject.trim(),
          message: form.message.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Message sent successfully!');
        setForm({ name: '', email: '', subject: '', message: '' });
        setFieldErrors({});
      } else {
        if (data.errors) {
          const map = {};
          data.errors.forEach((err) => { map[err.field] = err.message; });
          setFieldErrors(map);
        } else {
          toast.error(data.error || 'Failed to send message');
        }
      }
    } catch {
      toast.error('Network error. Please try again.');
    }
    setLoading(false);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <Breadcrumbs items={[{ label: 'Contact Us' }]} />

      <div className="max-w-3xl mx-auto text-center py-4">
        <h1 className="text-2xl font-bold text-warm-900 tracking-tight">Contact NovaHub</h1>
        <p className="text-xs text-warm-500 mt-2">
          Have questions about your order or our products? We&apos;re here to help!
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {/* Info Box */}
        <div className="lg:col-span-1 p-6 bg-warm-900 text-white rounded-2xl space-y-6">
          <div>
            <h2 className="text-base font-bold">Get in Touch</h2>
            <p className="text-[11px] text-warm-400 mt-1">Our support team usually responds within 24 hours.</p>
          </div>

          <div className="space-y-4 text-[11px] text-warm-300">
            <div className="flex items-start gap-3">
              <FiMail className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Email Us</p>
                <p className="text-[11px] text-warm-400">support@novahub.com</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FiPhone className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Call Us</p>
                <p className="text-[11px] text-warm-400">+1 (555) 000-0000</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FiMapPin className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Location</p>
                <p className="text-[11px] text-warm-400">NovaHub Store Operations</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2 p-6 sm:p-8 bg-white rounded-2xl border border-warm-200 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-warm-700 uppercase mb-1">Your Name *</label>
                <div className="relative">
                  <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400 w-4 h-4" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-warm-200 rounded-lg text-[11px] outline-none focus:border-warm-900 transition-colors"
                    placeholder="Jane Doe"
                    required
                  />
                </div>
                {fieldErrors.name && <p className="text-red-600 text-[10px] mt-1">{fieldErrors.name}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-warm-700 uppercase mb-1">Your Email *</label>
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400 w-4 h-4" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-warm-200 rounded-lg text-[11px] outline-none focus:border-warm-900 transition-colors"
                    placeholder="jane@example.com"
                    required
                  />
                </div>
                {fieldErrors.email && <p className="text-red-600 text-[10px] mt-1">{fieldErrors.email}</p>}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-warm-700 uppercase mb-1">Subject *</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => handleFieldChange('subject', e.target.value)}
                className="w-full px-4 py-2.5 border border-warm-200 rounded-lg text-[11px] outline-none focus:border-warm-900 transition-colors"
                placeholder="Order Inquiry, Product Info..."
                required
              />
              {fieldErrors.subject && <p className="text-red-600 text-[10px] mt-1">{fieldErrors.subject}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-warm-700 uppercase mb-1">Message *</label>
              <textarea
                value={form.message}
                onChange={(e) => handleFieldChange('message', e.target.value)}
                rows={4}
                className="w-full px-4 py-2.5 border border-warm-200 rounded-lg text-[11px] outline-none focus:border-warm-900 transition-colors resize-none"
                placeholder="How can we help you?"
                required
              />
              {fieldErrors.message && <p className="text-red-600 text-[10px] mt-1">{fieldErrors.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="inline-flex items-center justify-center gap-2 px-6 py-1.5 bg-warm-900 text-white font-bold text-[11px] rounded-lg hover:bg-warm-800 disabled:opacity-50 transition-all shadow-xs"
            >
              <FiSend className="w-3 h-3" />
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
