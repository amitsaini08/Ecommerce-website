'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useAdminList } from '@/hooks/useAdminList';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useToast } from '@/components/common/Toast';
import PageHeader from '@/components/common/PageHeader';
import Pagination from '@/components/common/Pagination';
import DataTable from '@/components/ui/DataTable';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import Alert from '@/components/ui/Alert';
import CouponCreateEditForm from '@/components/admin/CouponCreateEditForm';

import { couponsApi } from '@/lib/apiClient/coupons';
import { useMutation } from '@/hooks/useMutation';

export default function AdminCouponsPage() {
  const toast = useToast();
  const { items, pagination, page, setPage, loading, error, reload } = useAdminList(
    '/api/admin/coupons',
    'coupons'
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);

  const saveMutation = useMutation((form) =>
    couponsApi.save(editingCoupon?._id || editingCoupon?.id, form)
  );
  const deleteMutation = useMutation((id) => couponsApi.remove(id));

  const closeModal = () => setModalOpen(false);

  function openCreate() {
    setEditingCoupon(null);
    setModalOpen(true);
  }

  function openEdit(coupon) {
    setEditingCoupon(coupon);
    setModalOpen(true);
  }

  async function handleSubmit(form) {
    if (!form.code || !form.value) {
      toast.error('Coupon code and discount value are required');
      return;
    }

    const editingId = editingCoupon?._id || editingCoupon?.id;
    const res = await saveMutation.run(form);
    if (res) {
      toast.success(editingId ? 'Coupon updated!' : 'Coupon created!');
      closeModal();
      reload();
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this coupon?')) return;

    const res = await deleteMutation.run(id);
    if (res) {
      toast.success('Coupon deleted');

      // page ka last item gaya to pichle page par jao
      if (items.length === 1 && page > 1) setPage(page - 1);
      else reload();
    }
  }

  const columns = [
    {
      key: 'code',
      header: 'Code',
      render: (c) => <span className="font-mono font-bold text-warm-900">{c.code}</span>,
    },
    {
      key: 'type',
      header: 'Discount type',
      render: (c) => <span className="capitalize text-warm-600">{c.type}</span>,
    },
    {
      key: 'value',
      header: 'Value',
      render: (c) => (
        <span className="font-semibold text-warm-900">
          {c.type === 'percent' ? `${c.value}%` : formatCurrency(c.value)}
        </span>
      ),
    },
    {
      key: 'min',
      header: 'Min. order',
      render: (c) => (
        <span className="text-warm-500">
          {c.minOrderAmount ? formatCurrency(c.minOrderAmount) : '—'}
        </span>
      ),
    },
    {
      key: 'expiry',
      header: 'Expiration',
      render: (c) => (
        <span className="text-warm-500">{c.expiresAt ? formatDate(c.expiresAt) : 'Never'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) =>
        c.isActive ? (
          <Badge tone="success">Active</Badge>
        ) : (
          <Badge className="bg-warm-100 text-warm-500">Inactive</Badge>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            label="Edit coupon"
            title="Edit coupon"
            onClick={() => openEdit(c)}
            className="hover:bg-brand-50 hover:text-brand-600"
          >
            <Edit2 className="h-4 w-4" />
          </IconButton>
          <IconButton
            label="Delete coupon"
            title="Delete coupon"
            onClick={() => handleDelete(c._id || c.id)}
            className="hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discount coupons"
        subtitle="Create and manage promotional discount codes."
        actions={
          <Button variant="dark" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add coupon
          </Button>
        }
      />

      {error && <Alert>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={items}
        loading={loading}
        emptyText='No coupons found. Click "Add coupon" to create one.'
      />

      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}

      <CouponCreateEditForm
        isOpen={modalOpen}
        onClose={closeModal}
        coupon={editingCoupon}
        saving={saveMutation.loading}
        onSubmit={handleSubmit}
      />
    </div>
  );
}