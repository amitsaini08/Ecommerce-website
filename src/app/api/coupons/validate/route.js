import { NextResponse } from 'next/server';
import { connectToDatabase, Coupon } from '@/lib/db/models';

export async function POST(request) {
  try {
    const { code, subtotal } = await request.json();

    if (!code) return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });

    await connectToDatabase();
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
    }).lean();

    if (!coupon) return NextResponse.json({ error: 'Invalid coupon code' }, { status: 404 });

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'This coupon has expired' }, { status: 400 });
    }

    if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
      return NextResponse.json({
        error: `Minimum order amount is ₹${coupon.minOrderAmount}`
      }, { status: 400 });
    }

    const discountValue = coupon.type === 'percent'
      ? (subtotal * Number(coupon.value)) / 100
      : Math.min(Number(coupon.value), subtotal);

    return NextResponse.json({ coupon: { ...coupon, id: coupon._id }, discount: discountValue });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 });
  }
}
