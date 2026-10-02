'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Check, X, Shield, User } from 'lucide-react';
import { selectUser } from '@/lib/store/authSlice';
import { useAdminList } from '@/hooks/useAdminList';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import Pagination from '@/components/ui/Pagination';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';

export default function AdminUsersPage() {
  const toast = useToast();
  const me = useSelector(selectUser);
  const { items, pagination, setPage, loading, error, reload } = useAdminList(
    '/api/admin/users',
    'users'
  );
  const [busyId, setBusyId] = useState(null);

  async function toggleRole(user) {
    const userId = user._id || user.id;
    const newRole = user.role === 'admin' ? 'customer' : 'admin';
    if (!confirm(`Change ${user.name || user.email} to ${newRole}?`)) return;

    setBusyId(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || 'Could not update role');
      toast.success('Role updated successfully');
      reload();
    } catch (err) {
      toast.error(err.message || 'Error updating user role');
    }
    setBusyId(null);
  }

  const columns = [
    {
      key: 'user',
      header: 'User',
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar user={u} size="md" />
          <span className="font-semibold text-warm-900">{u.name || '—'}</span>
        </div>
      ),
    },
    { key: 'email', header: 'Email', render: (u) => <span className="text-warm-600">{u.email}</span> },
    {
      key: 'role',
      header: 'Role',
      render: (u) => (
        <Badge className={u.role === 'admin' ? 'bg-warm-900 text-white' : 'bg-warm-100 text-warm-600'}>
          <span className="capitalize">{u.role}</span>
        </Badge>
      ),
    },
    {
      key: 'verified',
      header: 'Verified',
      render: (u) =>
        u.isVerified ? (
          <Badge tone="success" className="gap-1">
            <Check className="h-3 w-3" /> Verified
          </Badge>
        ) : (
          <Badge className="gap-1 bg-warm-100 text-warm-500">
            <X className="h-3 w-3" /> No
          </Badge>
        ),
    },
    { key: 'joined', header: 'Joined', render: (u) => <span className="text-warm-500">{formatDate(u.createdAt)}</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (u) => {
        const userId = u._id || u.id;
        const isSelf = String(userId) === String(me?._id);
        const Icon = u.role === 'admin' ? User : Shield;

        return (
          <Button
            variant="outline"
            size="sm"
            loading={busyId === userId}
            disabled={isSelf}
            title={isSelf ? "You can't change your own role" : undefined}
            onClick={() => toggleRole(u)}
          >
            <Icon className="h-3.5 w-3.5" />
            {u.role === 'admin' ? 'Make customer' : 'Make admin'}
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Users" subtitle="Manage customer accounts and admin access." />

      {error && <Alert>{error}</Alert>}

      <DataTable columns={columns} rows={items} loading={loading} emptyText="No users found." />

      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}