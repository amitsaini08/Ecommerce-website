import mongoose from 'mongoose';

const AddressSchema = new mongoose.Schema(
  {
    label: { type: String },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    phone: { type: String },
    isDefault: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
);

const AccountSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true },
    providerAccountId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  
);

const UserSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String },
    passwordHash: { type: String },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    isVerified: { type: Boolean, default: true },
    avatarUrl: { type: String },
    accounts: { type: [AccountSchema], default: [] },
    addresses: { type: [AddressSchema], default: [] },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export default mongoose.models.User || mongoose.model('User', UserSchema);
