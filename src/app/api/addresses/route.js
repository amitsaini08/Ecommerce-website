import { NextResponse } from 'next/server';
import { addressSchema } from '@/lib/validations';
import { routeHandler } from '../routeHandler';
import { userService } from '@/lib/services/userService';

export const GET = routeHandler({
  auth: true,
  handler: async (request, { user }) => {
    const result = await userService.getUserAddresses(user._id);
    return NextResponse.json(result);
  },
});

export const POST = routeHandler({
  auth: true,
  schema: addressSchema,
  handler: async (request, { user, data }) => {
    const result = await userService.addAddress({ userId: user._id, data });
    return NextResponse.json(result, { status: 201 });
  },
});