'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/ui/Pagination';
import CustomSelect from '@/components/ui/CustomSelect';
import { Search, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

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

let cachedOrders = {};
let cachedPagination = { page: 1, totalPages: 1 };
let cachedFilters = { status: '', search: '', paymentStatus: '', paymentMethod: '', dateFrom: '', dateTo: '' };

export function invalidateOrder(orderId) {
  for (const page of Object.keys(cachedOrders)) {
    const data = cachedOrders[page]?.data || [];
    if (data.some((o) => String(o._id || o.id) === String(orderId))) {
      delete cachedOrders[page];
    }
  }
}

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
    cachedFilters = { status: statusFilter, search, paymentStatus: paymentStatusFilter, paymentMethod: paymentMethodFilter, dateFrom, dateTo };
  }, [statusFilter, search, paymentStatusFilter, paymentMethodFilter, dateFrom, dateTo]);

  // debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // reset cache + go to page 1 whenever any filter changes
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
  }, [pagination.page, orders, statusFilter, search, paymentStatusFilter, paymentMethodFilter, dateFrom, dateTo]);

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

      const res = await fetch(`/api/admin/orders?${params}`);
      const data = await res.json();
      setOrders((prevOrders) => ({
        ...prevOrders, [page]: { data: data.orders || [] }
      }));
      setPagination((prev) => ({ ...prev, ...(data.pagination || {}) }));
    } catch { } setLoading(false);
  }

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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-base font-bold text-warm-900 tracking-tight">Orders</h1>
      </div>

      {/* Search + Filters panel */}
      <div className="bg-white border border-warm-200 rounded-lg p-4 mb-4">
        {/* Top row: label + Clear Filters */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-warm-700">Filters</span>
          <button
            onClick={clearFilters}
            className={`px-3 py-1 text-[11px] font-semibold rounded-md border transition-all whitespace-nowrap ${hasActiveFilters
              ? 'text-brand-600 border-brand-200 bg-brand-50 hover:bg-brand-100 opacity-100'
              : 'invisible opacity-0 pointer-events-none border-transparent'
              }`}
          >
            Clear Filters
          </button>
        </div>

        {/* Row 1: Search — always full width, its own row */}
        <div className="mb-3">
          <label className="block text-[10px] font-semibold text-warm-500 uppercase tracking-wide mb-1">
            Search
          </label>
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Order ID, name, email or phone..."
              className="w-full pl-8 pr-8 py-1.5 border border-warm-200 rounded-md text-[11px] outline-none focus:border-brand-400"
            />
            {searchInput && (
              <X
                onClick={() => { setSearchInput(''); setSearch(''); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-400 cursor-pointer hover:text-warm-700"
              />
            )}
          </div>
        </div>

        {/* Row 2: Filters — 5 equal columns, always balanced */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-warm-500 uppercase tracking-wide mb-1">
              Status
            </label>
            <CustomSelect
              options={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="All Statuses"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-warm-500 uppercase tracking-wide mb-1">
              Payment Status
            </label>
            <CustomSelect
              options={paymentStatusOptions}
              value={paymentStatusFilter}
              onChange={setPaymentStatusFilter}
              placeholder="All Payment Status"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-warm-500 uppercase tracking-wide mb-1">
              Method
            </label>
            <CustomSelect
              options={paymentMethodOptions}
              value={paymentMethodFilter}
              onChange={setPaymentMethodFilter}
              placeholder="All Methods"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-warm-500 uppercase tracking-wide mb-1">
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] outline-none focus:border-brand-400"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-warm-500 uppercase tracking-wide mb-1">
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] outline-none focus:border-brand-400"
            />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-md border border-warm-200 shadow-xs overflow-hidden">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-warm-50/70 border-b border-warm-200 text-warm-600 text-[10px] uppercase tracking-wider font-semibold">
              <th className="px-3 py-2.5 text-left">Order ID</th>
              <th className="px-3 py-2.5 text-left">Customer</th>
              <th className="px-3 py-2.5 text-left">Amount</th>
              <th className="px-3 py-2.5 text-left">Status</th>
              <th className="px-3 py-2.5 text-left">Date</th>
              <th className="px-3 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-100">
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-warm-400 text-[11px]">Loading orders...</td></tr>
            ) : currentOrders.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-warm-400 text-[11px]">No orders found.</td></tr>
            ) : currentOrders.map((o) => {
              const orderId = o._id || o.id;
              return (
                <tr
                  key={orderId}
                  onClick={() => router.push(`/admin/orders/${orderId}`)}
                  className="hover:bg-warm-50/50 transition-colors cursor-pointer"
                >
                  <td className="px-3 py-2.5 font-mono text-[10px] text-warm-900 font-medium">{String(orderId).slice(0, 8)}</td>
                  <td className="px-3 py-2.5">
                    <div>
                      <p className="text-warm-900 font-medium text-[11px]">{o.userName || '—'}</p>
                      <p className="text-warm-400 text-[10px]">{o.userEmail}</p>
                      {o.userPhone && <p className="text-warm-500 text-[10px] font-mono">📞 {o.userPhone}</p>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-bold text-warm-900">{formatCurrency(o.totalAmount)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full capitalize ${statusColors[o.status] || 'bg-warm-100 text-warm-600'}`}>
                        {o.status}
                      </span>
                      {o.paymentStatus === 'pending' && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-100 text-amber-900 uppercase border border-amber-300">
                          Payment Pending
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-warm-500 text-[10px]">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-warm-900 font-semibold text-[10px]">
                      View Details →
                    </span>
                  </td>
                </tr>
              )})}
          </tbody>
        </table>
      </div>
      {pagination.totalPages > 1 && (
        <div className="mt-4">
          <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={(p) => setPagination({ ...pagination, page: p })} />
        </div>
      )}
    </div>
  );
}