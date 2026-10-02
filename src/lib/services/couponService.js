import { connectToDatabase, Coupon } from '@/lib/db/models';
import { AppError } from '@/app/api/routeHandler';

export const couponService = {

  async validateCoupon({ code, subtotal }) {
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
    }).lean();

    if (!coupon) throw new AppError('Invalid coupon code', 404);

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      throw new AppError('This coupon has expired', 400);
    }

    if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
      throw new AppError(`Minimum order amount is ₹${coupon.minOrderAmount}`, 400);
    }

    const discountValue = coupon.type === 'percent'
      ? (subtotal * Number(coupon.value)) / 100
      : Math.min(Number(coupon.value), subtotal);

    return { coupon, discount: discountValue };
  },

 
  async getCoupons({ page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const list = await Coupon.find().sort({ createdAt: -1 }).skip(offset).limit(limit).lean();
    const count = await Coupon.countDocuments();
    return {
      coupons: list,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    };
  },


  async createCoupon(data) {
    const { code, type, value, minOrderAmount, expiresAt, isActive } = data;
    await connectToDatabase();
    const newCoupon = await Coupon.create({
      code: code.toUpperCase(),
      type,
      value: Number(value),
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: isActive !== false,
    });
    return { coupon: newCoupon.toObject() };
  },


  async updateCoupon({ id, data }) {
    const coupon = await Coupon.findById(id);
    if (!coupon) throw new AppError('Coupon not found', 404);

    if (data.code) coupon.code = data.code.toUpperCase();
    if (data.type) coupon.type = data.type;
    if (data.value !== undefined) coupon.value = Number(data.value);
    if (data.minOrderAmount !== undefined) coupon.minOrderAmount = Number(data.minOrderAmount || 0);
    if (data.expiresAt !== undefined) coupon.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    if (data.isActive !== undefined) coupon.isActive = data.isActive;

    await coupon.save();
    return { coupon: coupon.toObject() };
  },


  async deleteCoupon(id) {
    const res = await Coupon.deleteOne({ _id: id });
    if (res.deletedCount === 0) throw new AppError('Coupon not found', 404);
    return { message: 'Deleted' };
  },
};
