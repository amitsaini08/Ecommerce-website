import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['order_placed', 'order_status', 'payment', 'review', 'low_stock', 'system'],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String },
    link: { type: String },                      
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    forRole: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  },
  { timestamps: false }
);
NotificationSchema.index({ userId: 1, forRole: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);