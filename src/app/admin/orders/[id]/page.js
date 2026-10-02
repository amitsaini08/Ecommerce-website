'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/components/common/Toast';
import { Package, Phone } from 'lucide-react';
import { FiArrowLeft, FiSend, FiCheck, FiX, FiRefreshCw } from 'react-icons/fi';
import { formatCurrency } from '@/lib/utils';
import { invalidateOrder } from '@/lib/orderCache';

const statusOptions = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const paymentStatusOptions = ['pending', 'paid', 'failed', 'refunded'];
const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const paymentStatusColors = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  paid: 'bg-green-50 text-green-700 border-green-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  refunded: 'bg-purple-50 text-purple-700 border-purple-200',
};

import { ordersApi } from '@/lib/apiClient/orders';
import { useMutation } from '@/hooks/useMutation';

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [address, setAddress] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  const [newStatus, setNewStatus] = useState('');
  const [newPaymentStatus, setNewPaymentStatus] = useState('');
  const [actionReason, setActionReason] = useState('');

  const actionMutation = useMutation(({ actionType, extraData }) =>
    ordersApi.adminAction(id, {
      action: actionType,
      reason: actionReason,
      ...extraData,
    })
  );

  useEffect(() => {
    fetchOrder();
  }, [id]);

  async function fetchOrder() {
    try {
      const data = await ordersApi.getAdminById(id);
      if (data?.order) {
        setOrder(data.order);
        setItems(data.items || []);
        setHistory(data.history || []);
        setAddress(data.address);
        setCustomer(data.customer);
        setNewStatus(data.order.status);
        setNewPaymentStatus(data.order.paymentStatus || 'pending');
      }
    } catch {
      toast.error('Network error');
    }
    setLoading(false);
  }

  async function handleAdminAction(actionType, extraData = {}) {
    const data = await actionMutation.run({ actionType, extraData });
    if (data) {
      toast.success(data.message || 'Action executed successfully');
      setActionReason('');
      invalidateOrder(id);
      fetchOrder();
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 shimmer rounded-md" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-80 shimmer rounded-lg" />
          <div className="h-80 shimmer rounded-lg" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="w-12 h-12 text-warm-300 mb-3" />
        <p className="text-warm-500 text-[13px] font-medium">Order not found</p>
        <Link
          href="/admin/orders"
          className="mt-3 text-[11px] text-brand-600 font-bold hover:underline"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/orders"
            className="p-2 hover:bg-warm-100 rounded-lg transition-colors group"
          >
            <FiArrowLeft className="w-4 h-4 text-warm-600 group-hover:text-warm-900 transition-colors" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-warm-900">
                Order #{String(order._id || order.id).slice(0, 8)}
              </h1>
              <span
                className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full capitalize ${statusColors[order.status]}`}
              >
                {order.status}
              </span>
            </div>
            <p className="text-[10px] text-warm-400 mt-0.5">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 text-[10px] font-bold rounded-full border uppercase ${paymentStatusColors[order.paymentStatus] || paymentStatusColors.pending}`}
          >
            Payment: {order.paymentStatus}
          </span>
        </div>
      </div>

      {/* Return Request Banner */}
      {order.returnStatus === 'requested' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
              <FiRefreshCw className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-amber-900 text-[12px] mb-0.5">
                Return / Refund Requested by Customer
              </h3>
              <p className="text-[11px] text-amber-700 mb-3">
                Reason: {order.returnReason || 'No reason provided'}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleAdminAction('approve_return')}
                  disabled={actionMutation.loading}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-green-600 text-white text-[11px] font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 shadow-sm"
                >
                  <FiCheck className="w-3.5 h-3.5" /> Approve Return & Refund Stock
                </button>
                <button
                  onClick={() => handleAdminAction('reject_return')}
                  disabled={actionMutation.loading}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 text-white text-[11px] font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm"
                >
                  <FiX className="w-3.5 h-3.5" /> Reject Return
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Banner */}
      {order.status === 'cancelled' && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-[11px] mb-4 flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <FiX className="w-3.5 h-3.5 text-red-600" />
          </div>
          <div>
            <p className="font-bold text-[12px]">Order Cancelled</p>
            {order.cancelReason && (
              <p className="text-[10px] mt-0.5 text-red-600">
                Reason: {order.cancelReason}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column — Items + Summary */}
        <div className="lg:col-span-2 space-y-4">
          {/* Items Card */}
          <div className="bg-white rounded-lg border border-warm-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-warm-100 bg-warm-50/50">
              <h2 className="font-semibold text-warm-900 text-[13px] flex items-center gap-2">
                <Package className="w-4 h-4 text-warm-500" />
                Order Items
                <span className="ml-auto text-[10px] font-bold text-warm-500 bg-warm-100 px-2 py-0.5 rounded-full">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </h2>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item._id || item.id}
                    className="flex gap-3 p-2.5 rounded-lg hover:bg-warm-50/70 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-lg bg-warm-50 shrink-0 relative overflow-hidden border border-warm-100">
                      {item.productImage?.[0] ? (
                        <Image
                          src={item.productImage[0]}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-warm-400">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-warm-900 truncate">
                        {item.productName || 'Product'}
                      </p>
                      <p className="text-[10px] text-warm-500 mt-0.5">
                        Qty: {item.quantity} × {formatCurrency(item.priceAtPurchase)}
                      </p>
                      {item.productLink && (
                        <a
                          href={item.productLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-brand-600 font-bold hover:underline mt-1"
                        >
                          Supplier Link ↗
                        </a>
                      )}
                    </div>
                    <p className="text-[12px] font-semibold text-warm-900 whitespace-nowrap">
                      {formatCurrency(item.quantity * Number(item.priceAtPurchase))}
                    </p>
                  </div>
                ))}
              </div>

              {/* Price Summary */}
              <div className="border-t border-warm-100 mt-4 pt-3 space-y-2">
                <div className="flex justify-between text-[11px] text-warm-600">
                  <span>Payment Method</span>
                  <span className="font-bold uppercase text-warm-900">
                    {order.paymentMethod}
                  </span>
                </div>
                {Number(order.shippingCharge) > 0 && (
                  <div className="flex justify-between text-[11px] text-warm-600">
                    <span>Shipping Fee</span>
                    <span>{formatCurrency(order.shippingCharge)}</span>
                  </div>
                )}
                {Number(order.discountAmount) > 0 && (
                  <div className="flex justify-between text-[11px] text-green-600">
                    <span>Discount ({order.couponCode})</span>
                    <span>-{formatCurrency(order.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-warm-100">
                  <span className="text-[12px] font-bold text-warm-900">
                    Total Amount
                  </span>
                  <span className="text-[14px] font-bold text-warm-900">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline Card */}
          {history.length > 0 && (
            <div className="bg-white rounded-lg border border-warm-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-warm-100 bg-warm-50/50">
                <h2 className="font-semibold text-warm-900 text-[13px]">
                  Order Timeline
                </h2>
              </div>
              <div className="p-4">
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-[5px] top-2 bottom-2 w-px bg-warm-200" />
                  <div className="space-y-4">
                    {history.map((h, index) => (
                      <div key={h._id || h.id} className="flex gap-3 relative">
                        <div
                          className={`w-[11px] h-[11px] rounded-full shrink-0 mt-1 z-10 border-2 border-white ${index === 0 ? 'bg-brand-500' : 'bg-warm-300'
                            }`}
                        />
                        <div className="flex-1 pb-1">
                          <p className="text-[11px] font-medium text-warm-900 capitalize">
                            {h.status}
                          </p>
                          {h.note && (
                            <p className="text-[10px] text-warm-500 mt-0.5">
                              {h.note}
                            </p>
                          )}
                          <p className="text-[10px] text-warm-400 mt-0.5">
                            {new Date(h.changedAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column — Actions + Details */}
        <div className="space-y-4">
          {/* Manage Status Card */}
          <div className="bg-white rounded-lg border border-warm-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-warm-100 bg-warm-50/50">
              <h2 className="font-semibold text-warm-900 text-[13px]">
                Manage Order
              </h2>
            </div>
            <div className="p-4 space-y-4">
              {/* Order Status */}
              <div>
                <label className="block text-[10px] font-semibold text-warm-600 uppercase tracking-wide mb-1.5">
                  Order Status
                </label>
                <div className="flex gap-2">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="flex-1 px-3 py-2 border border-warm-200 rounded-lg text-[11px] outline-none bg-white capitalize focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() =>
                      handleAdminAction('update_status', { status: newStatus })
                    }
                    disabled={actionMutation.loading}
                    className="px-3.5 py-2 bg-brand-500 text-white text-[10px] font-bold rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors shadow-sm whitespace-nowrap"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Payment Status */}
              <div>
                <label className="block text-[10px] font-semibold text-warm-600 uppercase tracking-wide mb-1.5">
                  Payment Status
                </label>
                <div className="flex gap-2">
                  <select
                    value={newPaymentStatus}
                    onChange={(e) => setNewPaymentStatus(e.target.value)}
                    className="flex-1 px-3 py-2 border border-warm-200 rounded-lg text-[11px] outline-none bg-white capitalize focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all">
                    {paymentStatusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() =>
                      handleAdminAction('update_payment_status', {
                        paymentStatus: newPaymentStatus,
                      })
                    }
                    disabled={actionMutation.loading}
                    className="px-3.5 py-2 bg-warm-900 text-white text-[10px] font-bold rounded-lg hover:bg-warm-800 disabled:opacity-50 transition-colors shadow-sm whitespace-nowrap"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Action Note */}
              <div>
                <label className="block text-[10px] font-semibold text-warm-600 uppercase tracking-wide mb-1.5">
                  Action Note / Reason
                </label>
                <input
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Optional note sent in email"
                  className="w-full px-3 py-2 border border-warm-200 rounded-lg text-[11px] outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Customer Details Card */}
          {customer && (
            <div className="bg-white rounded-lg border border-warm-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-warm-100 bg-warm-50/50 flex items-center justify-between">
                <h2 className="font-semibold text-warm-900 text-[13px]">
                  Customer
                </h2>
                {customer.phone && (
                  <a
                    href={`tel:${customer.phone}`}
                    className="text-[10px] text-brand-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <Phone /> Call
                  </a>
                )}
              </div>
              <div className="p-4 space-y-2">
                <p className="text-[12px] font-bold text-warm-900">
                  {customer.name}
                </p>
                <p className="text-[11px] text-warm-600">
                  <a
                    href={`mailto:${customer.email}`}
                    className="text-brand-600 hover:underline"
                  >
                    {customer.email}
                  </a>
                </p>
                {customer.phone ? (
                  <p className="text-[11px] text-warm-700">
                    Phone:{' '}  <span className="font-mono font-semibold"> {customer.phone} </span>
                  </p>
                ) : (
                  <p className="text-[10px] text-warm-400">
                    Phone: Not provided in profile
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Delivery Address Card */}
          {address && (
            <div className="bg-white rounded-lg border border-warm-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-warm-100 bg-warm-50/50">
                <h2 className="font-semibold text-warm-900 text-[13px]">
                  Delivery Address
                </h2>
              </div>
              <div className="p-4 space-y-1">
                <p className="text-[11px] text-warm-700 leading-relaxed">
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ''}
                </p>
                <p className="text-[11px] text-warm-500">
                  {address.city}, {address.state} — {address.pincode}
                </p>
                {address.phone && (
                  <p className="text-[10px] text-warm-400 mt-1">
                    Phone: {address.phone}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}