import mongoose from 'mongoose';

const AddressSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
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
  { _id: false }
);

const AccountSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    provider: { type: String, required: true },
    providerAccountId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String },
    passwordHash: { type: String },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    isVerified: { type: Boolean, default: true },
    avatarUrl: { type: String },
    accounts: { type: [AccountSchema], default: [] },
    addresses: { type: [AddressSchema], default: [] },
    wishlist: [{ type: String, ref: 'Product' }],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false, _id: false }
);

UserSchema.virtual('id').get(function () {
  return this._id;
});
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
