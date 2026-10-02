'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/common/Pagination';
import CustomSelect from '@/components/ui/CustomSelect';
import DataTable from '@/components/ui/DataTable';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Search, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  cachedOrders as _cachedOrders,
  cachedPagination as _cachedPagination,
  cachedFilters as _cachedFilters,
} from '@/lib/orderCache';

const COMPACT = 'h-8 text-[11px]';

const statusColors = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-rose-100 text-rose-800',
};

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'payment_pending', label: 'Payment Pending' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const paymentStatusOptions = [
  { value: '', label: 'All Payment Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

const paymentMethodOptions = [
  { value: '', label: 'All Methods' },
  { value: 'cod', label: 'COD' },
  { value: 'online', label: 'Online' },
];

import { ordersApi } from '@/lib/apiClient/orders';

let cachedOrders = _cachedOrders;
let cachedPagination = _cachedPagination;
let cachedFilters = _cachedFilters;

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState(cachedOrders);
  const [pagination, setPagination] = useState(cachedPagination);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState(cachedFilters.status);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(cachedFilters.paymentStatus);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState(cachedFilters.paymentMethod);
  const [dateFrom, setDateFrom] = useState(cachedFilters.dateFrom);
  const [dateTo, setDateTo] = useState(cachedFilters.dateTo);
  const [searchInput, setSearchInput] = useState(cachedFilters.search);
  const [search, setSearch] = useState(cachedFilters.search);

  useEffect(() => { cachedOrders = orders; }, [orders]);
  useEffect(() => { cachedPagination = pagination; }, [pagination]);
  useEffect(() => {
    cachedFilters = {
      status: statusFilter, search, paymentStatus: paymentStatusFilter,
      paymentMethod: paymentMethodFilter, dateFrom, dateTo,
    };
  }, [statusFilter, search, paymentStatusFilter, paymentMethodFilter, dateFrom, dateTo]);

  // debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  async function fetchOrders(page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      if (paymentStatusFilter) params.set('paymentStatus', paymentStatusFilter);
      if (paymentMethodFilter) params.set('paymentMethod', paymentMethodFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const data = await ordersApi.getAdmin(params.toString());
      setOrders((prev) => ({ ...prev, [page]: { data: data.orders || [] } }));
      setPagination((prev) => ({ ...prev, ...(data.pagination || {}) }));
    } catch { }
    setLoading(false);
  }


  useEffect(() => {
      setOrders({});
      setPagination((prev) => ({ ...prev, page: 1 }));

  }, [statusFilter, search, paymentStatusFilter, paymentMethodFilter, dateFrom, dateTo]);


  useEffect(() => {
  if (orders[pagination.page]?.data) {
    setLoading(false);
    return;
  }

  fetchOrders(pagination.page);
}, [ pagination.page, orders, statusFilter, search, paymentStatusFilter, paymentMethodFilter, dateFrom, dateTo ]);

  function clearFilters() {
    setStatusFilter('');
    setPaymentStatusFilter('');
    setPaymentMethodFilter('');
    setDateFrom('');
    setDateTo('');
    setSearchInput('');
    setSearch('');
  }

  const hasActiveFilters = Boolean(
    statusFilter || paymentStatusFilter || paymentMethodFilter || dateFrom || dateTo || search
  );

  const currentOrders = orders[pagination.page]?.data || [];

  const columns = [
    {
      key: 'id',
      header: 'Order ID',
      render: (o) => (
        <span className="font-mono text-xs font-medium text-warm-900">
          {String(o._id || o.id).slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (o) => (
        <>
          <p className="font-medium text-warm-900">{o.userName || '—'}</p>
          <p className="text-xs text-warm-400">{o.userEmail}</p>
          {o.userPhone && <p className="font-mono text-xs text-warm-500">📞 {o.userPhone}</p>}
        </>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (o) => <span className="font-bold text-warm-900">{formatCurrency(o.totalAmount)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (o) => (
        <div className="flex flex-col items-start gap-1">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
              statusColors[o.status] || 'bg-warm-100 text-warm-600'
            }`}
          >
            {o.status}
          </span>
          {o.paymentStatus === 'pending' && (
            <span className="rounded border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-900">
              Payment Pending
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (o) => (
        <span className="text-xs text-warm-500">{new Date(o.createdAt).toLocaleDateString()}</span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      render: (o) => (
        <Button
          variant="outline"
          size="sm"
          href={`/admin/orders/${o._id || o.id}`}
          onClick={(e) => e.stopPropagation()} // row click would navigate twice otherwise
        >
          View Details →
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-base font-bold tracking-tight text-warm-900">Orders</h1>

      {/* Filters */}
      <div className="space-y-3 rounded-lg border border-warm-200 bg-white p-4">
        <div className="flex h-7 items-center justify-between">
          <span className="text-[11px] font-bold text-warm-700">Filters</span>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>

        <Field label="Search" htmlFor="order-search">
          <div className="relative max-w-md">
            <Input
              id="order-search"
              icon={Search}
              className={`${COMPACT} pr-8`}
              placeholder="Order ID, name, email or phone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => { setSearchInput(''); setSearch(''); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Field label="Status">
            <CustomSelect options={statusOptions} value={statusFilter} onChange={setStatusFilter} placeholder="All Statuses" />
          </Field>
          <Field label="Payment Status">
            <CustomSelect options={paymentStatusOptions} value={paymentStatusFilter} onChange={setPaymentStatusFilter} placeholder="All Payment Status" />
          </Field>
          <Field label="Method">
            <CustomSelect options={paymentMethodOptions} value={paymentMethodFilter} onChange={setPaymentMethodFilter} placeholder="All Methods" />
          </Field>
          <Field label="From" htmlFor="date-from">
            <Input id="date-from" type="date" className={COMPACT} value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} />
          </Field>
          <Field label="To" htmlFor="date-to">
            <Input id="date-to" type="date" className={COMPACT} value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} />
          </Field>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={currentOrders}
        loading={loading}
        emptyText="No orders found."
        onRowClick={(o) => router.push(`/admin/orders/${o._id || o.id}`)}
      />

      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        />
      )}
    </div>
  );
}