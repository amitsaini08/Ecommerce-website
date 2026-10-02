'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Modal from '@/components/common/Modal';
import { useToast } from '@/components/common/Toast';
import { Plus, Edit2, Trash2, Eye, EyeOff, Layers, ExternalLink } from 'lucide-react';
import BannerCreateEditForm from '@/components/admin/BannerCreateEditForm';

import { bannersApi } from '@/lib/apiClient/banners';
import { useMutation } from '@/hooks/useMutation';

export default function AdminBannersPage() {
  const toast = useToast();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);

  const saveMutation = useMutation((form) =>
    bannersApi.save(editingBanner?._id || editingBanner?.id, form)
  );
  const deleteMutation = useMutation((id) => bannersApi.remove(id));
  const toggleMutation = useMutation((b) =>
    bannersApi.save(b._id || b.id, { ...b, isActive: !b.isActive })
  );

  useEffect(() => {
    fetchBanners();
  }, []);

  async function fetchBanners() {
    setLoading(true);
    try {
      const data = await bannersApi.getAdmin();
      setBanners(data?.banners || []);
    } catch {
      toast.error('Failed to load banners');
    }
    setLoading(false);
  }

  function handleOpenCreate() {
    setEditingBanner(null);
    setModalOpen(true);
  }

  function handleOpenEdit(b) {
    setEditingBanner(b);
    setModalOpen(true);
  }

  async function handleSubmit(form) {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    const res = await saveMutation.run(form);
    if (res) {
      toast.success(editingBanner ? 'Banner updated!' : 'Banner created!');
      setModalOpen(false);
      fetchBanners();
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    const res = await deleteMutation.run(id);
    if (res) {
      toast.success('Banner deleted');
      fetchBanners();
    }
  }

  async function toggleActive(b) {
    const res = await toggleMutation.run(b);
    if (res) {
      toast.success(`Banner ${!b.isActive ? 'activated' : 'deactivated'}`);
      fetchBanners();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-warm-900 tracking-tight">Promotional Banners</h1>
          <p className="text-[11px] text-warm-500 mt-0.5">Manage real storefront carousel banners and promotional slides.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" /> Add New Banner
        </button>
      </div>

      <div className="bg-white rounded-md border border-warm-200 shadow-xs overflow-hidden">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-warm-50/70 border-b border-warm-200 text-warm-600 text-[10px] uppercase tracking-wider font-semibold">
              <th className="px-3 py-2.5 text-left">Banner Preview</th>
              <th className="px-3 py-2.5 text-left">Title & Subtitle</th>
              <th className="px-3 py-2.5 text-left">Link</th>
              <th className="px-3 py-2.5 text-center">Order</th>
              <th className="px-3 py-2.5 text-center">Status</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-100">
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-warm-400 text-[11px]">Loading banners...</td></tr>
            ) : banners.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-warm-400">
                  <Layers className="w-8 h-8 mx-auto text-warm-300 mb-1.5" />
                  <p className="text-[11px] font-semibold text-warm-900">No promotional banners created yet.</p>
                  <p className="text-[10px] text-warm-500 mt-0.5">Click &quot;Add New Banner&quot; above to publish your first banner.</p>
                </td>
              </tr>
            ) : banners.map((b) => {
              const bannerId = b._id || b.id;
              return (
                <tr key={bannerId} className="hover:bg-warm-50/50 transition-colors">
                  <td className="px-3 py-2.5">
                    <div
                      className="w-24 h-11 rounded-md overflow-hidden relative flex items-center justify-center border border-warm-200 p-1.5 text-white text-[9px] font-bold text-center"
                      style={{ backgroundColor: b.bgColor || '#18181b' }}
                    >
                      {b.imageUrl ? (
                        <Image src={b.imageUrl} alt="" fill className="object-cover opacity-80" sizes="96px" />
                      ) : (
                        <span className="line-clamp-2 leading-tight">{b.title}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div>
                      <p className="font-semibold text-warm-900 text-[11px]">{b.title}</p>
                      {b.subtitle && <p className="text-warm-500 text-[10px] line-clamp-1 mt-0.5">{b.subtitle}</p>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-warm-600 font-mono">
                    {b.linkUrl ? (
                      <a href={b.linkUrl} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                        {b.linkUrl} <ExternalLink className="w-2.5 h-2.5 text-warm-400" />
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center font-bold text-warm-900 text-[11px]">{b.sortOrder}</td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      onClick={() => toggleActive(b)}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-full capitalize inline-flex items-center gap-1 ${b.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-warm-100 text-warm-500'
                        }`}
                    >
                      {b.isActive ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                      {b.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(b)}
                        className="p-1 text-warm-600 hover:text-warm-900 hover:bg-warm-100 rounded-md transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(bannerId)}
                        className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>


      <BannerCreateEditForm
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        key={editingBanner?._id || editingBanner?.id || 'new'}
        banner={editingBanner}
        nextSortOrder={banners.length}
        saving={saveMutation.loading}
        onSubmit={handleSubmit}
        onCancel={() => setModalOpen(false)}
      />

    </div>
  );
}