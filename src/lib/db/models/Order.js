import mongoose from 'mongoose';

const OrderItemAddonSchema = new mongoose.Schema(
  {
    addonId: { type: String },
    name: { type: String, required: true },
    priceAtPurchase: { type: Number, required: true },
    imageUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
  },

);

const OrderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    priceAtPurchase: { type: Number, required: true },
    addonId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductAddon' },
    createdAt: { type: Date, default: Date.now },
  },
);

const OrderStatusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: { type: String },
    changedAt: { type: Date, default: Date.now },
  },
);

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    guestName: { type: String },
    guestEmail: { type: String },
    guestPhone: { type: String },
    shippingAddress: { type: mongoose.Schema.Types.ObjectId },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'cod'],
      default: 'razorpay',
    },
    shippingCharge: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    addressId: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },
    couponCode: { type: String },
    discountAmount: { type: Number, default: 0 },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    codAdvanceAmount: { type: Number, default: 0 },
    codAdvancePaymentId: { type: String },
    codAdvancePaidAt: { type: Date },
    cancelReason: { type: String },
    returnReason: { type: String },
    returnStatus: {
      type: String,
      enum: ['none', 'requested', 'approved', 'rejected'],
      default: 'none',
    },
  
    courierStatus: { type: String },
    courierStatusUpdatedAt: { type: Date },
    items: { type: [OrderItemSchema], default: [] },
    statusHistory: { type: [OrderStatusHistorySchema], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);


export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
