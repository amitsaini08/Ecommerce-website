'use client';

import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  selectCartItems,
  selectCartSubtotal,
  selectCartCoupon,
  updateQuantity,
  clearCart,
} from '@/lib/store/cartSlice';
import { selectUser, selectAuthLoading } from '@/lib/store/authSlice';
import { useToast } from '@/components/common/Toast';
import { settingsApi } from '@/lib/apiClient/settings';
import { profileApi } from '@/lib/apiClient/profile';
import { ordersApi } from '@/lib/apiClient/orders';
import Breadcrumbs from '@/components/common/Breadcrumbs';
import Modal from '@/components/common/Modal';
import Script from 'next/script';
import { formatCurrency } from '@/lib/utils';
import { FiPlus, FiMinus, FiMapPin, FiCreditCard, FiTruck, FiCheck, FiAlertCircle, FiLogIn } from 'react-icons/fi';
import {
  handleNumericKeyDown,
  validatePhoneFormat,
  validatePincodeFormat,
} from '@/lib/inputHelpers';
import AddressForm from '@/components/address/AddressForm';
import Button from '@/components/ui/Button';

export default function CheckoutPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const toast = useToast();
  const items = useSelector(selectCartItems);
  const subtotal = useSelector(selectCartSubtotal);
  const coupon = useSelector(selectCartCoupon);
  const user = useSelector(selectUser);
  const authLoading = useSelector(selectAuthLoading);

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addrForm, setAddrForm] = useState({
    label: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
  });
  const [addrErrors, setAddrErrors] = useState({});
  const [addrBlockedMsg, setAddrBlockedMsg] = useState({});
  const [addrLoading, setAddrLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  const [storeSettings, setStoreSettings] = useState({
    codEnabled: true,
    shippingFee: 0,
    minFreeShipping: 50,
  });

  const orderPlacedRef = useRef(false);

  const nonCodItems = items.filter((item) => item.codAvailable === false);
  const isCodAvailable = storeSettings.codEnabled && nonCodItems.length === 0;

  const discount = coupon
    ? coupon.type === 'percent'
      ? (subtotal * coupon.value) / 100
      : Math.min(coupon.value, subtotal)
    : 0;

  const shippingFee =
    subtotal >= storeSettings.minFreeShipping ? 0 : storeSettings.shippingFee;
  const total = Math.max(0, subtotal - discount + shippingFee);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      queueMicrotask(() => setRazorpayLoaded(true));
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;


    if (user && items.length > 0) {
      fetchAddresses();
      fetchStoreSettings();
    }
    if (user && items.length === 0 && !orderPlacedRef.current) {
      router.push('/cart');
    }
  }, [user, authLoading, items.length]);

  useEffect(() => {
    if (!isCodAvailable && paymentMethod === 'cod') {
      queueMicrotask(() => setPaymentMethod('razorpay'));
    }
  }, [isCodAvailable, paymentMethod]);

  async function fetchStoreSettings() {
    try {
      const data = await settingsApi.get();
      if (data?.settings) {
        setStoreSettings({
          codEnabled: data.settings.codEnabled ?? true,
          shippingFee: Number(data.settings.shippingFee || 0),
          minFreeShipping: Number(data.settings.minFreeShipping || 50),
        });
      }
    } catch { }
  }

  async function fetchAddresses() {
    try {
      const data = await profileApi.getAddresses();
      if (data) {
        setAddresses(data.addresses || []);
        const def = data.addresses?.find((a) => a.isDefault);
        if (def) setSelectedAddress(def._id || def.id);
        else if (data.addresses?.length > 0) setSelectedAddress(data.addresses[0]._id || data.addresses[0].id);
      }
    } catch { }
  }

  const handleAddrFieldChange = (field, value) => {
    let cleanVal = value;
    if (field === 'pincode') cleanVal = value.replace(/\D/g, '').slice(0, 6);
    if (field === 'phone') cleanVal = value.replace(/\D/g, '').slice(0, 10);

    setAddrForm((prev) => ({ ...prev, [field]: cleanVal }));

    const newErrs = { ...addrErrors };
    if (field === 'line1') newErrs.line1 = cleanVal.trim() ? '' : 'Address line 1 is required';
    if (field === 'city') newErrs.city = cleanVal.trim() ? '' : 'City is required';
    if (field === 'state') newErrs.state = cleanVal.trim() ? '' : 'State is required';
    if (field === 'pincode') newErrs.pincode = validatePincodeFormat(cleanVal);
    if (field === 'phone') newErrs.phone = cleanVal ? validatePhoneFormat(cleanVal) : '';

    setAddrErrors(newErrs);
  };

  const isAddrValid =
    addrForm.line1.trim() &&
    addrForm.city.trim() &&
    addrForm.state.trim() &&
    addrForm.pincode.length === 6 &&
    (!addrForm.phone || addrForm.phone.length === 10);

  async function handleAddAddress(payload) {
    setAddrLoading(true);
    try {
      const data = await profileApi.addAddress(payload);
      if (data) {
        toast.success('Address added!');
        setShowAddForm(false);
        fetchAddresses();
        setSelectedAddress(data.address._id || data.address.id);
        return null;
      }
    } catch (err) {
      if (err.errors) {
        return Object.fromEntries(err.errors.map((e) => [e.field, e.message]));
      }
      toast.error(err.message || 'Failed to add address');
    } finally {
      setAddrLoading(false);
    }
    return null;
  }

  async function handleCheckout() {
    if (!selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    setPaying(true);
    try {
      const cartItems = items.map((i) => ({ productId: i.productId, quantity: i.quantity }));

      const createData = await ordersApi.createOrder({
        items: cartItems,
        couponCode: coupon?.code || null,
        addressId: selectedAddress,
        paymentMethod,
      });

      console.log("Created order:", createData);

      if (createData.isCod) {
        orderPlacedRef.current = true;
        dispatch(clearCart());
        toast.success('Order placed successfully via Cash on Delivery!');
        router.push(`/orders/${createData.orderId}`);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: createData.amount,
        currency: 'INR',
        name: 'NovaHub',
        description: 'Order Payment',
        order_id: createData.razorpayOrderId,
        handler: async function (response) {
          try {
            const verifyData = await ordersApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: createData.orderId,
            });
            orderPlacedRef.current = true;
            dispatch(clearCart());
            toast.success('Payment successful! Order placed.');
            router.push(`/orders/${verifyData.orderId}`);
          } catch (err) {
            toast.error(err.message || 'Payment verification failed');
          }
          setPaying(false);
        },
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#18181b' },
        modal: {
          ondismiss: () => {
            toast.warning('Payment window closed. Order is pending.');
            setPaying(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please try again or choose COD.');
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      toast.error(err.message || 'Checkout error. Please try again.');
      setPaying(false);
    }
  }

  if (authLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
        <div className="w-6 h-6 border-2 border-warm-900/20 border-t-warm-900 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-warm-500 text-[11px] font-medium">Loading checkout details...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Modal isOpen={true} onClose={() => router.push('/cart')} title="You Are Not Logged In">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <FiLogIn className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-[12px] text-amber-900 font-medium leading-relaxed">
              You are not logged in. Please log in or sign up to proceed to checkout, or click cancel to return to your cart.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-warm-100">
            <Button variant="outline" size="sm" onClick={() => router.push('/cart')}>Cancel</Button>
            <Button variant="dark" size="sm" href="/login?redirect=/checkout">
              <FiLogIn className="h-3.5 w-3.5" /> Go to Login / Signup
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  if (items.length === 0) return null;

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setRazorpayLoaded(true)} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Cart', href: '/cart' }, { label: 'Checkout' }]} />

        <h1 className="text-md font-bold text-warm-900 tracking-tight mb-4">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Left: Address & Payment Selection */}
          <div className="lg:col-span-2 space-y-4">
            {/* Delivery Address Section */}
            <div className="p-4 bg-white rounded-lg border border-warm-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-bold text-warm-900 flex items-center gap-1.5">
                  <FiMapPin className="w-3.5 h-3.5 text-warm-900" /> Delivery Address
                </h2>
                <Button variant="outline" size="sm" onClick={() => setShowAddForm((s) => !s)}>
                  <FiPlus className="h-3 w-3" /> Add New Address
                </Button>
              </div>

              {/* Add Address Form */}
              {showAddForm && (
                <AddressForm
                  saving={addrLoading}
                  onSubmit={handleAddAddress}
                  onCancel={() => setShowAddForm(false)}
                />
              )}

              {/* Address List */}
              <div className="space-y-2">
                {addresses.length === 0 ? (
                  <p className="text-warm-400 text-[11px] py-3 text-center border border-dashed border-warm-200 rounded-md">
                    No saved addresses. Click above to add one.
                  </p>
                ) : (
                  addresses.map((addr) => {
                    const addrId = addr._id || addr.id;
                    return (
                      <label
                        key={addrId}
                        className={`flex items-start gap-2 p-3 rounded-md border cursor-pointer transition-all ${selectedAddress === addrId
                          ? 'border-warm-900 bg-warm-50/50 shadow-xs'
                          : 'border-warm-200 hover:border-warm-300'
                          }`}
                      >
                        <input
                          type="radio"
                          name="address"
                          checked={selectedAddress === addrId}
                          onChange={() => setSelectedAddress(addrId)}
                          className="mt-1 accent-warm-900 w-3.5 h-3.5"
                        />
                        <div>
                          {addr.label && (
                            <span className="text-[10px] font-bold text-warm-900 uppercase tracking-wider block mb-0.5">
                              {addr.label}
                            </span>
                          )}
                          <p className="text-[11px] text-warm-900 font-medium">
                            {addr.line1}
                            {addr.line2 ? `, ${addr.line2}` : ''}
                          </p>
                          <p className="text-[10px] text-warm-500 mt-0.5">
                            {addr.city}, {addr.state} — {addr.pincode}
                          </p>
                          {addr.phone && <p className="text-[10px] text-warm-400 mt-0.5">Phone: {addr.phone}</p>}
                        </div>
                      </label>
                    )
                  })
                )}
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="p-4 bg-white rounded-lg border border-warm-200 shadow-xs">
              <h2 className="text-[13px] font-bold text-warm-900 flex items-center gap-1.5 mb-3">
                <FiCreditCard className="w-3.5 h-3.5 text-warm-900" /> Payment Method
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label
                  className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-all ${paymentMethod === 'razorpay'
                    ? 'border-warm-900 bg-warm-50/50 shadow-xs'
                    : 'border-warm-200 hover:border-warm-300'
                    }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="razorpay"
                    checked={paymentMethod === 'razorpay'}
                    onChange={() => setPaymentMethod('razorpay')}
                    className="accent-warm-900 w-3.5 h-3.5"
                  />
                  <div>
                    <p className="text-[11px] font-bold text-warm-900 flex items-center gap-1">
                      <FiCreditCard className="w-3 h-3 text-warm-700" /> Online Payment
                    </p>
                    <p className="text-[10px] text-warm-500 mt-0.5">UPI, Cards, NetBanking via Razorpay</p>
                  </div>
                </label>

                {isCodAvailable && (
                  <label
                    className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-all ${paymentMethod === 'cod'
                      ? 'border-warm-900 bg-warm-50/50 shadow-xs'
                      : 'border-warm-200 hover:border-warm-300'
                      }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="accent-warm-900 w-3.5 h-3.5"
                    />
                    <div>
                      <p className="text-[11px] font-bold text-warm-900 flex items-center gap-1">
                        <FiTruck className="w-3 h-3 text-warm-700" /> Cash on Delivery
                      </p>
                      <p className="text-[10px] text-warm-500 mt-0.5">Pay in cash upon package delivery</p>
                    </div>
                  </label>
                )}
              </div>

              {nonCodItems.length > 0 && (
                <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200/80 rounded-md flex items-start gap-2 text-amber-800 text-[10px] leading-relaxed">
                  <FiAlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-900">Cash on Delivery unavailable</span>
                    <p className="mt-0.5 text-amber-700">
                      Cash on Delivery isn&apos;t available for: <span className="font-semibold">{nonCodItems.map((i) => i.name).join(', ')}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Order Summary */}
          <div>
            <div className="sticky top-20 p-4 bg-white rounded-lg border border-warm-200 shadow-xs">
              <h2 className="text-[13px] font-bold text-warm-900 mb-3 pb-2 border-b border-warm-100">Order Summary</h2>

              <div className="space-y-2.5 mb-3 max-h-48 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between text-[11px] pb-2 border-b border-warm-100/70 last:border-0">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-warm-900 font-medium truncate">{item.name}</p>
                      <p className="text-[10px] text-warm-400 mt-0.5">
                        {formatCurrency(item.discountPrice || item.price)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center border border-warm-200 rounded-md overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => dispatch(updateQuantity({ productId: item.productId, quantity: item.quantity - 1 }))}
                          disabled={item.quantity <= 1}
                          title={item.quantity <= 1 ? 'Minimum quantity is 1' : 'Decrease quantity'}
                          className="p-1 text-warm-600 hover:bg-warm-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <FiMinus className="w-2.5 h-2.5" />
                        </button>
                        <span className="px-2 py-0.5 text-[10px] font-bold text-warm-900 min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => dispatch(updateQuantity({ productId: item.productId, quantity: item.quantity + 1 }))}
                          className="p-1 text-warm-600 hover:bg-warm-50 transition-colors"
                        >
                          <FiPlus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      <span className="font-semibold text-warm-900 min-w-[45px] text-right">
                        {formatCurrency((item.discountPrice || item.price) * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-[11px] border-t border-warm-200 pt-3">
                <div className="flex justify-between text-warm-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-warm-900">{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount ({coupon?.code})</span>
                    <span className="font-medium">-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-warm-600">
                  <span>Shipping</span>
                  <span className="font-medium">
                    {shippingFee === 0 ? (
                      <span className="text-emerald-700 font-semibold">Free</span>
                    ) : (
                      formatCurrency(shippingFee)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-warm-900 font-bold text-[13px] border-t border-warm-200 pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              <Button
                variant="dark"
                className="mt-4 w-full"
                loading={paying}
                disabled={(paymentMethod === 'razorpay' && !razorpayLoaded) || !selectedAddress}
                onClick={handleCheckout}
              >
                {paymentMethod === 'cod'
                  ? <><FiCheck className="h-3 w-3" /> Confirm Order (COD)</>
                  : <><FiCreditCard className="h-3 w-3" /> Pay {formatCurrency(total)}</>}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}