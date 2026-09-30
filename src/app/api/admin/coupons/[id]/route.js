import { NextResponse } from 'next/server';
import { connectToDatabase, Coupon } from '@/lib/db/models';
import { requireAdmin } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();

    await connectToDatabase();
    const coupon = await Coupon.findById(id);
    if (!coupon) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (body.code) coupon.code = body.code.toUpperCase();
    if (body.type) coupon.type = body.type;
    if (body.value !== undefined) coupon.value = Number(body.value);
    if (body.minOrderAmount !== undefined) coupon.minOrderAmount = body.minOrderAmount ? Number(body.minOrderAmount) : 0;
    if (body.expiresAt !== undefined) coupon.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (body.isActive !== undefined) coupon.isActive = body.isActive;

    await coupon.save();
    return NextResponse.json({ coupon: { ...coupon.toObject(), id: coupon._id } });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    await connectToDatabase();
    await Coupon.deleteOne({ _id: id });

    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
