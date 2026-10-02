import { NextResponse } from 'next/server';
import { User } from '@/lib/db/models';
import { addressSchema } from '@/lib/validations';
import { routeHandler, AppError } from '../routeHandler';

export const GET = routeHandler({
  auth: true,
  handler: async (request, { user }) => {
    const dbUser = await User.findById(user._id).lean();
    const list = dbUser?.addresses || [];
    return NextResponse.json({ addresses: list });
  },
});

export const POST = routeHandler({
  auth: true,
  schema: addressSchema,
  handler: async (request, { user, data }) => {
    const { label, line1, line2, city, state, pincode, phone } = data;
    const dbUser = await User.findById(user._id);

    if (!dbUser) {
      throw new AppError('User not found', 404);
    }

    const newAddress = {
      label: label || null,
      line1,
      line2: line2 || null,
      city,
      state,
      pincode,
      phone: phone || null,
      createdAt: new Date(),
    };

    dbUser.addresses.push(newAddress);
    await dbUser.save();

    const addedAddress = dbUser.addresses[dbUser.addresses.length - 1];
    return NextResponse.json({ address: addedAddress }, { status: 201 });
  },
});