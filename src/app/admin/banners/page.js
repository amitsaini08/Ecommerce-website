'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useToast } from '@/components/common/Toast';
import { Plus, ExternalLink, Eye, EyeOff } from 'lucide-react';
import BannerCreateEditForm from '@/components/admin/BannerCreateEditForm';

import { bannersApi } from '@/lib/apiClient/banners';
import { useMutation } from '@/hooks/useMutation';
import DataTable from '@/components/ui/DataTable';
import { useAdminList } from '@/hooks/useAdminList';
import Button from '@/components/ui/Button';
import { FiEdit, FiTrash2 } from 'react-icons/fi';

export default function AdminBannersPage() {
  const toast = useToast();
  const [banners, setBanners] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const { items, loading, reload: refetchBanners } = useAdminList('/api/admin/banners', 'banners');

  const saveMutation = useMutation((form) =>
    bannersApi.save(editingBanner?._id || editingBanner?.id, form)
  );
  const deleteMutation = useMutation((id) => bannersApi.remove(id));
  const toggleMutation = useMutation((b) =>
    bannersApi.save(b._id || b.id, { ...b, isActive: !b.isActive })
  );

  // useEffect(() => {
  //   fetchBanners();
  // }, []);

  // async function fetchBanners() {
  //   // setLoading(true);
  //   try {
  //     const data = await bannersApi.getAdmin();
  //     setBanners(data?.banners || []);
  //   } catch {
  //     toast.error('Failed to load banners');
  //   }
  //   // setLoading(false);
  // }

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
      refetchBanners();
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    const res = await deleteMutation.run(id);
    if (res) {
      toast.success('Banner deleted');
      refetchBanners();
    }
  }

  async function toggleActive(b) {
    const res = await toggleMutation.run(b);
    if (res) {
      toast.success(`Banner ${!b.isActive ? 'activated' : 'deactivated'}`);
      refetchBanners();
    }
  }

  const columns = [
    {
      key: 'banner_preview',
      header: 'Banner Preview',
      render: (b) => (
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
      ),
    },
    {
      key: 'title_subtitle',
      header: 'Title & Subtitle',
      render: (b) => (
        <div>
          <p className="font-semibold text-warm-900 text-[11px]">{b.title}</p>
          {b.subtitle && <p className="text-warm-500 text-[10px] line-clamp-1 mt-0.5">{b.subtitle}</p>}
        </div>
      ),
    },

    {
      key: 'link', header: 'Link',
      render: (b) => {
        return (
          <>
            {b.linkUrl ? (
              <a href={b.linkUrl} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                {b.linkUrl} <ExternalLink className="w-2.5 h-2.5 text-warm-400" />
              </a>) : ('—')
            }
          </>
        );
      },
    },
    {
      key: 'order',
      header: 'Order',
      render: (b) => <span className="text-warm-500 text-[11px]">{b.sortOrder}</span>
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (b) => (
        <button
          onClick={() => toggleActive(b)}
          className={`px-2.5 hover:scale-105 transition duration-300 py-1 text-[12px] font-semibold cursor-pointer rounded-md capitalize inline-flex items-center gap-1 ${b.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-warm-100 text-warm-500'}`} >
          {b.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {b.isActive ? 'Active' : 'Inactive'}
        </button>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (b) => (
        <div className="flex items-center justify-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => handleOpenEdit(b)} aria-label="Edit Banner">
            <FiEdit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDelete(b._id)}
            aria-label="Delete Banner"
            className="text-red-600 hover:bg-red-50"
          >
            <FiTrash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    },
  ]

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

        <DataTable
          columns={columns}
          rows={items}
          loading={loading}
          emptyText='Click "Add New Banner" above to publish your first banner.'
        />
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