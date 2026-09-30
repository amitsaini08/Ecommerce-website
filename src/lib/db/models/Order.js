import mongoose from 'mongoose';

const OrderItemAddonSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    addonId: { type: String },
    name: { type: String, required: true },
    priceAtPurchase: { type: Number, required: true },
    imageUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OrderItemSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    productId: { type: String, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    priceAtPurchase: { type: Number, required: true },
    addons: { type: [OrderItemAddonSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ShipmentTrackingEventSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    status: { type: String, required: true },
    location: { type: String },
    remark: { type: String },
    eventTimestamp: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OrderStatusHistorySchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    status: { type: String, required: true },
    note: { type: String },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, ref: 'User', default: null },
    guestName: { type: String },
    guestEmail: { type: String },
    guestPhone: { type: String },
    shippingAddress: { type: mongoose.Schema.Types.Mixed },
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
    addressId: { type: String },
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
    courierProvider: { type: String, default: 'delhivery' },
    awbNumber: { type: String },
    courierStatus: { type: String },
    courierStatusUpdatedAt: { type: Date },
    items: { type: [OrderItemSchema], default: [] },
    shipmentTrackingEvents: { type: [ShipmentTrackingEventSchema], default: [] },
    statusHistory: { type: [OrderStatusHistorySchema], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false, _id: false }
);

OrderSchema.virtual('id').get(function () {
  return this._id;
});
OrderSchema.set('toJSON', { virtuals: true });
OrderSchema.set('toObject', { virtuals: true });

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
