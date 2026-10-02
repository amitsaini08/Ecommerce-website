import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { Product, Coupon, Order, StoreSettings } from '@/lib/db/models';
import { createOrderSchema } from '@/lib/validations';
import { routeHandler, AppError } from '@/app/api/routeHandler';
import { sameId } from '@/lib/reviews';

const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

let razorpay = null;
if (razorpayKeyId && razorpayKeySecret) {
  razorpay = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });
}

export const POST = routeHandler({
  auth: true,
  schema: createOrderSchema,
  rateLimit: { key: 'create-order', max: 3, windowSec: 10 * 60 },
  handler: async (request, { user, data }) => {
    const { items, addressId, paymentMethod = 'razorpay', couponCode } = data;

    const settings = await StoreSettings.findOne().lean();
    const codEnabled = settings ? settings.codEnabled : true;
    const defaultShippingFee = settings ? Number(settings.shippingFee) : 0;
    const minFreeShipping = settings ? Number(settings.minFreeShipping) : 50;

    if (paymentMethod === 'cod' && !codEnabled) {
      throw new AppError('Cash on Delivery (COD) is currently disabled by store settings', 400);
    }

    const productIds = items.map((i) => i.productId);
    const dbProducts = await Product.find({ _id: { $in: productIds } }).lean();

    if (paymentMethod === 'cod') {
      const nonCodProduct = dbProducts.find((p) => p.codAvailable === false);
      if (nonCodProduct) {
        throw new AppError(`Cash on Delivery is not available for: ${nonCodProduct.name}`, 400);
      }
    }

    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = dbProducts.find((p) => sameId(p._id, item.productId));
      if (!product) throw new AppError(`Product not found: ${item.productId}`, 400);
      if (!product.isActive) throw new AppError(`${product.name} is currently unavailable`, 400);
      if (product.stock < item.quantity) {
        throw new AppError(`Insufficient stock for ${product.name}. Only ${product.stock} left in stock.`, 400);
      }

      const unitPrice = product.discountPrice ? Number(product.discountPrice) : Number(product.price);
      subtotal += unitPrice * item.quantity;

      validatedItems.push({
        productId: String(product._id),
        quantity: item.quantity,
        priceAtPurchase: unitPrice,
        name: product.name,
      });
    }

    let discount = 0;
    let validCouponCode = null;
    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
      }).lean();

      if (coupon && (!coupon.expiresAt || new Date(coupon.expiresAt) > new Date())) {
        if (!coupon.minOrderAmount || subtotal >= Number(coupon.minOrderAmount)) {
          discount = coupon.type === 'percent'
            ? (subtotal * Number(coupon.value)) / 100
            : Math.min(Number(coupon.value), subtotal);
          validCouponCode = coupon.code;
        }
      }
    }

    const shippingCharge = subtotal >= minFreeShipping ? 0 : defaultShippingFee;
    const totalAmount = Math.max(0, subtotal - discount + shippingCharge);

    if (paymentMethod === 'cod') {
      for (const item of validatedItems) {
        await Product.updateOne(
          { _id: item.productId },
          { $inc: { stock: -item.quantity } }
        );
      }

      const newOrder = await Order.create({
        userId: String(user._id),
        status: 'confirmed',
        paymentStatus: 'pending',
        paymentMethod: 'cod',
        shippingCharge,
        totalAmount,
        addressId,
        couponCode: validCouponCode,
        discountAmount: discount,
        items: validatedItems,
        statusHistory: [
          { status: 'confirmed', note: 'COD order placed and confirmed.', changedAt: new Date() },
        ],
      });

      return NextResponse.json({
        orderId: String(newOrder._id),
        isCod: true,
        totalAmount,
        message: 'COD Order confirmed!',
      });
    }

    if (!razorpay) throw new AppError('Razorpay keys not configured on server', 500);

    const amountInPaise = Math.round(totalAmount * 100);
    const rzpOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `order_${Date.now().toString().slice(-10)}`,
    });

    for (const item of validatedItems) {
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { stock: -item.quantity } }
      );
    }

    const newOrder = await Order.create({
      userId: String(user._id),
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'razorpay',
      shippingCharge,
      totalAmount,
      addressId,
      couponCode: validCouponCode,
      discountAmount: discount,
      razorpayOrderId: rzpOrder.id,
      items: validatedItems,
      statusHistory: [
        { status: 'pending', note: 'Razorpay order initialized. Awaiting payment.', changedAt: new Date() },
      ],
    });

    return NextResponse.json({
      orderId: String(newOrder._id),
      razorpayOrderId: rzpOrder.id,
      amount: amountInPaise,
      totalAmount,
      subtotal,
      discount,
      shippingCharge,
      isCod: false,
    });
  },
});
