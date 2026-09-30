import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { connectToDatabase, Product, Coupon, Order, StoreSettings } from '@/lib/db/models';
import { requireAuth } from '@/lib/auth';
import { createOrderSchema } from '@/lib/validations';
import { sendOrderConfirmationEmail, sendAdminNewOrderEmail } from '@/lib/email';

const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

let razorpay = null;
if (razorpayKeyId && razorpayKeySecret) {
  razorpay = new Razorpay({
    key_id: razorpayKeyId,
    key_secret: razorpayKeySecret,
  });
}

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    const result = createOrderSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || 'Invalid input data' },
        { status: 400 }
      );
    }

    const { items, addressId, paymentMethod = 'razorpay', couponCode } = result.data;

    await connectToDatabase();

    const settings = await StoreSettings.findOne().lean();
    const codEnabled = settings ? settings.codEnabled : true;
    const defaultShippingFee = settings ? Number(settings.shippingFee) : 0;
    const minFreeShipping = settings ? Number(settings.minFreeShipping) : 50;

    if (paymentMethod === 'cod' && !codEnabled) {
      return NextResponse.json(
        { error: 'Cash on Delivery (COD) is currently disabled by store settings' },
        { status: 400 }
      );
    }

    const productIds = items.map((i) => i.productId);
    const dbProducts = await Product.find({ _id: { $in: productIds } }).lean();

    if (paymentMethod === 'cod') {
      const nonCodProduct = dbProducts.find((p) => p.codAvailable === false);
      if (nonCodProduct) {
        return NextResponse.json(
          { error: `Cash on Delivery is not available for: ${nonCodProduct.name}` },
          { status: 400 }
        );
      }
    }

    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = dbProducts.find((p) => p._id === item.productId);
      if (!product) {
        return NextResponse.json({ error: `Product not found: ${item.productId}` }, { status: 400 });
      }
      if (!product.isActive) {
        return NextResponse.json({ error: `${product.name} is currently unavailable` }, { status: 400 });
      }
      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}. Only ${product.stock} left in stock.` },
          { status: 400 }
        );
      }

      const unitPrice = product.discountPrice ? Number(product.discountPrice) : Number(product.price);
      subtotal += unitPrice * item.quantity;

      validatedItems.push({
        _id: crypto.randomUUID(),
        productId: item.productId,
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
          discount =
            coupon.type === 'percent'
              ? (subtotal * Number(coupon.value)) / 100
              : Math.min(Number(coupon.value), subtotal);
          validCouponCode = coupon.code;
        }
      }
    }

    const shippingCharge = subtotal >= minFreeShipping ? 0 : defaultShippingFee;
    const totalAmount = Math.max(0, subtotal - discount + shippingCharge);

    // COD Flow
    if (paymentMethod === 'cod') {
      for (const item of validatedItems) {
        await Product.updateOne(
          { _id: item.productId },
          { $inc: { stock: -item.quantity } }
        );
      }

      const orderId = crypto.randomUUID();
      const newOrder = await Order.create({
        _id: orderId,
        userId: user.id,
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
          {
            _id: crypto.randomUUID(),
            status: 'confirmed',
            note: 'COD order placed and confirmed.',
            changedAt: new Date(),
          },
        ],
      });

      sendOrderConfirmationEmail(user.email, newOrder.toObject(), validatedItems);
      if (settings?.contactEmail) {
        sendAdminNewOrderEmail(settings.contactEmail, newOrder.toObject(), validatedItems);
      }

      return NextResponse.json({
        orderId: newOrder._id,
        isCod: true,
        totalAmount,
        message: 'COD Order confirmed!',
      });
    }

    // Razorpay Flow
    if (!razorpay) {
      return NextResponse.json(
        { error: 'Razorpay keys not configured on server' },
        { status: 500 }
      );
    }

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

    const orderId = crypto.randomUUID();
    const newOrder = await Order.create({
      _id: orderId,
      userId: user.id,
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
        {
          _id: crypto.randomUUID(),
          status: 'pending',
          note: 'Razorpay order initialized. Awaiting payment.',
          changedAt: new Date(),
        },
      ],
    });

    return NextResponse.json({
      orderId: newOrder._id,
      razorpayOrderId: rzpOrder.id,
      amount: amountInPaise,
      totalAmount,
      subtotal,
      discount,
      shippingCharge,
      isCod: false,
    });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Please login to checkout' }, { status: 401 });
    }
    console.error('Create order error:', error);

    let errorMessage =
      error?.error?.description ||
      error?.description ||
      error?.message ||
      (typeof error === 'string' ? error : 'Failed to create order');

    if (error?.statusCode === 401 || errorMessage === 'Authentication failed') {
      errorMessage =
        'Razorpay Authentication Failed: Invalid NEXT_PUBLIC_RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in .env.local. Please provide valid Razorpay API keys.';
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
