'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { ShoppingBag, Package, Trash2, Tag, ArrowRight, LogIn } from 'lucide-react';
import { selectUser } from '@/lib/store/authSlice';
import {
  selectCartItems,
  selectCartSubtotal,
  selectCartCoupon,
  updateQuantity,
  removeItem,
  applyCoupon,
  removeCoupon,
} from '@/lib/store/cartSlice';
import { formatCurrency, getEffectivePrice } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import Section from '@/components/ui/Section';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import IconButton from '@/components/ui/IconButton';
import QuantityStepper from '@/components/ui/QuantityStepper';

export default function CartPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const toast = useToast();
  const user = useSelector(selectUser);
  const items = useSelector(selectCartItems);
  const subtotal = useSelector(selectCartSubtotal);
  const coupon = useSelector(selectCartCoupon);

  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const discount = coupon
    ? coupon.type === 'percent'
      ? (subtotal * coupon.value) / 100
      : Math.min(coupon.value, subtotal)
    : 0;
  const total = Math.max(0, subtotal - discount);

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), subtotal }),
      });
      const data = await res.json();

      if (res.ok) {
        dispatch(
          applyCoupon({
            code: data.coupon.code,
            type: data.coupon.type,
            value: Number(data.coupon.value),
            discount: data.discount,
          })
        );
        toast.success('Coupon code applied!');
        setCouponCode('');
      } else {
        setCouponError(data.error || 'Invalid coupon');
      }
    } catch {
      setCouponError('Failed to validate coupon');
    } finally {
      setCouponLoading(false);
    }
  }

  function handleCheckout() {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    router.push('/checkout');
  }

  if (items.length === 0) {
    return (
      <Section>
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Looks like you haven't added any products to your cart yet."
          action={
            <Button href="/products" variant="dark">
              <span>Browse products</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          }
        />
      </Section>
    );
  }

  return (
    <Section>
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Cart' }]} />

        <PageHeader
          title="Shopping cart"
          subtitle={`Review your selected items (${itemCount} total)`}
        />

        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
          {/* Items */}
          <div className="space-y-3 lg:col-span-2">
            {items.map((item) => (
              <CartItem
                key={item.productId}
                item={item}
                onQuantityChange={(quantity) =>
                  dispatch(updateQuantity({ productId: item.productId, quantity }))
                }
                onRemove={() => {
                  dispatch(removeItem(item.productId));
                  toast.info('Item removed from cart');
                }}
              />
            ))}
          </div>

          {/* Summary */}
          <aside className="lg:col-span-1">
            <div className="sticky top-20 space-y-4 rounded-xl border border-warm-200 bg-white p-5 shadow-sm">
              <h2 className="border-b border-warm-100 pb-3 text-base font-bold text-warm-900">
                Order summary
              </h2>

              {/* Coupon */}
              {coupon ? (
                <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
                  <span className="flex items-center gap-2 font-semibold text-emerald-800">
                    <Tag className="h-4 w-4 text-emerald-600" />
                    {coupon.code} applied
                  </span>
                  <button
                    type="button"
                    onClick={() => dispatch(removeCoupon())}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleApplyCoupon();
                  }}
                  className="space-y-1.5"
                >
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        setCouponError('');
                      }}
                      error={couponError}
                      placeholder="Coupon code"
                      aria-label="Coupon code"
                      className="uppercase"
                    />
                    <Button type="submit" variant="dark" loading={couponLoading}>
                      Apply
                    </Button>
                  </div>
                  {couponError && <p className="text-xs text-red-600">{couponError}</p>}
                </form>
              )}

              {/* Totals */}
              <div className="space-y-3 border-t border-warm-100 pt-4 text-sm text-warm-700">
                <div className="flex justify-between">
                  <span>Subtotal ({itemCount} items)</span>
                  <span className="font-semibold text-warm-900">{formatCurrency(subtotal)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between font-semibold text-emerald-700">
                    <span>Discount ({coupon?.code})</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-warm-500">Calculated at checkout</span>
                </div>

                <div className="flex justify-between border-t border-warm-200 pt-3 text-base font-bold text-warm-900">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              <Button variant="dark" size="lg" className="w-full" onClick={handleCheckout}>
                <span>Proceed to checkout</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </aside>
        </div>
      </div>

      <Modal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="You are not logged in"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <LogIn className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm font-medium leading-relaxed text-amber-900">
              Please log in or sign up to proceed to checkout, or cancel to stay on your cart.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-warm-100 pt-4">
            <Button variant="outline" onClick={() => setShowAuthModal(false)}>
              Cancel
            </Button>
            <Button href="/login?redirect=/checkout" variant="dark">
              <LogIn className="h-4 w-4" />
              <span>Login / Signup</span>
            </Button>
          </div>
        </div>
      </Modal>
    </Section>
  );
}

function CartItem({ item, onQuantityChange, onRemove }) {
  const toast = useToast();

  const unitPrice = getEffectivePrice(item);
  const hasDiscount = unitPrice < Number(item.price);
  const maxQty = item.stock ?? 99;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-warm-200 bg-white p-3">
      <Link
        href={`/products/${item.slug}`}
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-warm-100 bg-warm-50 sm:h-24 sm:w-24"
      >
        {item.image ? (
          <Image src={item.image} alt={item.name} fill sizes="96px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-warm-300">
            <Package className="h-8 w-8" />
          </div>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/products/${item.slug}`}
            className="line-clamp-2 text-sm font-semibold text-warm-900 transition-colors hover:text-brand-600"
          >
            {item.name}
          </Link>
          <IconButton
            label="Remove item"
            onClick={onRemove}
            className="-mr-1 -mt-1 h-8 w-8 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-sm font-bold text-warm-900">{formatCurrency(unitPrice)}</span>
          {hasDiscount && (
            <span className="text-xs text-warm-400 line-through">{formatCurrency(item.price)}</span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <QuantityStepper
            size="sm"
            value={item.quantity}
            max={maxQty}
            onChange={onQuantityChange}
            onLimit={() => toast.warning(`Only ${maxQty} ${item.name} available in stock.`)}
          />
          <span className="text-sm font-bold text-warm-900">
            {formatCurrency(unitPrice * item.quantity)}
          </span>
        </div>
      </div>
    </div>
  );
}