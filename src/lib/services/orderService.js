import Razorpay from 'razorpay';
import { Product, Coupon, Order, StoreSettings, User } from '@/lib/db/models';
import { AppError } from '@/app/api/routeHandler';
import { sameId } from '@/lib/reviews';

const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

let razorpay = null;
if (razorpayKeyId && razorpayKeySecret) {
  razorpay = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });
}

export const orderService = {

  async createOrder({ user, data }) {
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

      return {
        orderId: String(newOrder._id),
        isCod: true,
        totalAmount,
        message: 'COD Order confirmed!',
      };
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

    return {
      orderId: String(newOrder._id),
      razorpayOrderId: rzpOrder.id,
      amount: amountInPaise,
      totalAmount,
      subtotal,
      discount,
      shippingCharge,
      isCod: false,
    };
  },

 
  async cancelOrder({ user, orderId, reason }) {
    const order = await Order.findById(orderId);

    if (!order || (order.userId && !sameId(order.userId, user._id) && user.role !== 'admin')) {
      throw new AppError('Order not found', 404);
    }

    if (order.status !== 'pending' && order.status !== 'confirmed') {
      throw new AppError(`Cannot cancel order in '${order.status}' status.`, 400);
    }

    order.status = 'cancelled';
    order.cancelReason = reason;
    order.statusHistory.push({
      status: 'cancelled',
      note: `Cancelled by customer. Reason: ${reason}`,
      changedAt: new Date(),
    });

    await order.save();

    for (const item of order.items || []) {
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { stock: item.quantity } }
      );
    }

    return {
      message: 'Order cancelled successfully! Stock has been restored.',
    };
  },


  async returnOrder({ user, orderId, reason }) {
    const order = await Order.findById(orderId);

    if (!order || (order.userId && !sameId(order.userId, user._id) && user.role !== 'admin')) {
      throw new AppError('Order not found', 404);
    }

    if (order.status !== 'delivered') {
      throw new AppError('Return request can only be submitted for delivered orders', 400);
    }

    if (order.returnStatus !== 'none') {
      throw new AppError(`Return request already submitted (Current status: ${order.returnStatus})`, 400);
    }

    order.returnStatus = 'requested';
    order.returnReason = reason;

    order.statusHistory.push({
      status: order.status,
      note: `Return/Refund requested by customer. Reason: ${reason}`,
      changedAt: new Date(),
    });

    await order.save();

    return {
      message: 'Return request submitted successfully! Admin will review your request.',
    };
  },


  async adminOrderAction({ orderId, action, status, paymentStatus, reason }) {
    const order = await Order.findById(orderId);
    if (!order) throw new AppError('Order not found', 404);

    async function restoreOrderStock() {
      for (const item of order.items || []) {
        await Product.updateOne(
          { _id: item.productId },
          { $inc: { stock: item.quantity } }
        );
      }
    }

    if (action === 'approve_cancel') {
      order.status = 'cancelled';
      order.statusHistory.push({
        status: 'cancelled',
        note: `Cancellation approved by admin. ${reason ? `Note: ${reason}` : ''}`,
        changedAt: new Date(),
      });
      await order.save();
      await restoreOrderStock();
      return { message: 'Cancellation approved. Stock restored!' };
    }

    if (action === 'reject_cancel') {
      order.statusHistory.push({
        status: order.status,
        note: `Cancellation request rejected by admin. ${reason ? `Reason: ${reason}` : ''}`,
        changedAt: new Date(),
      });
      await order.save();
      return { message: 'Cancellation request rejected.' };
    }

    if (action === 'approve_return') {
      order.returnStatus = 'approved';
      order.paymentStatus = 'refunded';
      order.statusHistory.push({
        status: order.status,
        note: `Return/Refund approved by admin. ${reason ? `Note: ${reason}` : ''}`,
        changedAt: new Date(),
      });
      await order.save();
      await restoreOrderStock();
      return { message: 'Return approved! Payment marked as refunded and stock restored.' };
    }

    if (action === 'reject_return') {
      order.returnStatus = 'rejected';
      order.statusHistory.push({
        status: order.status,
        note: `Return request rejected by admin. ${reason ? `Reason: ${reason}` : ''}`,
        changedAt: new Date(),
      });
      await order.save();
      return { message: 'Return request rejected.' };
    }

    if (action === 'update_status' && status) {
      order.status = status;
      order.statusHistory.push({
        status,
        note: `Status updated to ${status} by admin. ${reason ? `Note: ${reason}` : ''}`,
        changedAt: new Date(),
      });
      await order.save();

      if (status === 'cancelled') {
        await restoreOrderStock();
      }
      return { message: `Order status updated to ${status}` };
    }

    if (action === 'update_payment_status' && paymentStatus) {
      order.paymentStatus = paymentStatus;
      order.statusHistory.push({
        status: order.status,
        note: `Payment status updated to ${paymentStatus} by admin.`,
        changedAt: new Date(),
      });
      await order.save();
      return { message: `Payment status updated to ${paymentStatus}` };
    }

    throw new AppError('Invalid action configuration', 400);
  },


  async getOrderById({ user, orderId }) {
    const order = await Order.findById(orderId).lean();

    if (!order) throw new AppError('Order not found', 404);

    if (order.userId && !sameId(user._id, order.userId) && user.role !== 'admin') {
      throw new AppError('Order not found', 404);
    }

    const productIds = (order.items || []).map((i) => i.productId);
    const productsList = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(productsList.map((p) => [String(p._id), p]));

    const items = (order.items || []).map((item) => {
      const prod = productMap.get(String(item.productId));
      return {
        _id: String(item._id),
        productId: String(item.productId),
        quantity: item.quantity,
        priceAtPurchase: item.priceAtPurchase,
        addons: item.addons || [],
        productName: prod?.name || 'Product',
        productSlug: prod?.slug || '',
        productImage: prod?.images || [],
      };
    });

    let address = order.shippingAddress || null;
    if (!address && order.addressId && order.userId) {
      const dbUser = await User.findById(order.userId).lean();
      if (dbUser && dbUser.addresses) {
        address = dbUser.addresses.find((a) => sameId(a._id, order.addressId)) || null;
      }
    }

    return {
      order: { ...order, id: String(order._id) },
      items,
      history: order.statusHistory || [],
      trackingEvents: order.shipmentTrackingEvents || [],
      address,
    };
  },

  /**
   * Admin paginated order list with search & filters
   */
  async getAdminOrders({ page = 1, limit = 20, status, paymentStatus, paymentMethod, search = '', dateFrom, dateTo, minAmount, maxAmount }) {
    const offset = (page - 1) * limit;

    const baseMatch = {};

    if (status === 'payment_pending') { baseMatch.paymentStatus = 'pending'; }
    else if (status) { baseMatch.status = status; }
    if (paymentStatus) { baseMatch.paymentStatus = paymentStatus; }
    if (paymentMethod) { baseMatch.paymentMethod = paymentMethod; }

    if (dateFrom || dateTo) {
      baseMatch.createdAt = {};
      if (dateFrom) baseMatch.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        baseMatch.createdAt.$lte = end;
      }
    }

    if (minAmount || maxAmount) {
      baseMatch.totalAmount = {};
      if (minAmount) baseMatch.totalAmount.$gte = parseFloat(minAmount);
      if (maxAmount) baseMatch.totalAmount.$lte = parseFloat(maxAmount);
    }

    const pipeline = [
      { $match: baseMatch },
      {
        $lookup: {
          from: User.collection.name,
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          effectiveName: { $ifNull: ['$user.name', '$guestName'] },
          effectiveEmail: { $ifNull: ['$user.email', '$guestEmail'] },
          effectivePhone: { $ifNull: ['$user.phone', '$guestPhone'] },
          idString: { $toString: '$_id' },
        },
      },
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { idString: { $regex: search, $options: 'i' } },
            { effectiveName: { $regex: search, $options: 'i' } },
            { effectiveEmail: { $regex: search, $options: 'i' } },
            { effectivePhone: { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    pipeline.push({
      $facet: {
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: offset },
          { $limit: limit },
        ],
        totalCount: [{ $count: 'count' }],
      },
    });

    const [result] = await Order.aggregate(pipeline);
    const list = result?.data || [];
    const count = result?.totalCount?.[0]?.count || 0;

    const ordersFormatted = list.map((o) => ({
      _id: o._id,
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt,
      couponCode: o.couponCode,
      userName: o.effectiveName || 'Guest Customer',
      userEmail: o.effectiveEmail || '',
      userPhone: o.effectivePhone || '',
    }));

    return {
      orders: ordersFormatted,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    };
  },

  /**
   * Customer user order list with pagination
   */
  async getUserOrders({ user, page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const query = { $or: [{ userId: String(user._id) }, { userId: user._id }] };
    const orderList = await Order.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean();
    const count = await Order.countDocuments(query);

    return {
      orders: orderList,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    };
  },


  async getAdminOrderById(id) {
    const order = await Order.findById(id).lean();
    if (!order) throw new AppError('Order not found', 404);

    const productIds = (order.items || []).map((i) => i.productId);
    const productsList = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(productsList.map((p) => [String(p._id), p]));

    const items = (order.items || []).map((item) => {
      const p = productMap.get(String(item.productId));
      return {
        _id: String(item._id),
        quantity: item.quantity,
        priceAtPurchase: item.priceAtPurchase,
        productName: p?.name || 'Product',
        productSlug: p?.slug || '',
        productImage: p?.images || [],
        productLink: p?.productLink || null,
      };
    });

    const history = order.statusHistory || [];
    let address = order.shippingAddress || null;
    let customer = null;

    if (order.userId) {
      const u = await User.findById(order.userId).lean();
      if (u) {
        customer = { name: u.name, email: u.email, phone: u.phone };
        if (!address && u.addresses) {
          address = u.addresses.find((a) => sameId(a._id, order.addressId)) || null;
        }
      }
    } else {
      customer = { name: order.guestName, email: order.guestEmail, phone: order.guestPhone };
    }

    return {
      order,
      items,
      history,
      address,
      customer,
    };
  },

 
  async updateAdminOrder({ id, data }) {
    const { status, reason, paymentStatus, action } = data;

    const order = await Order.findById(id);
    if (!order) throw new AppError('Order not found', 404);

    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    order.statusHistory.push({
      status: order.status,
      note: reason || `Updated via admin panel (${action})`,
      changedAt: new Date(),
    });

    await order.save();
    return { order: order.toObject() };
  },
};
