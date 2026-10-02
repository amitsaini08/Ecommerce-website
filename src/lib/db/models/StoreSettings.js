import mongoose from 'mongoose';

const StoreSettingsSchema = new mongoose.Schema(
  {
    storeName: { type: String, default: 'NovaHub', required: true },
    contactEmail: { type: String },
    contactPhone: { type: String },
    codEnabled: { type: Boolean, default: true },
    shippingFee: { type: Number, default: 0 },
    minFreeShipping: { type: Number, default: 50 },
    whatsappNumber: { type: String, default: '900000000000' },
    codAdvanceAmount: { type: Number, default: 99.0 },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);


export default mongoose.models.StoreSettings ||
  mongoose.model('StoreSettings', StoreSettingsSchema);
