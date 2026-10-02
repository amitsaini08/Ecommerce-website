import { NextResponse } from 'next/server';
import { updateProfileSchema } from '@/lib/validations';
import { routeHandler } from '@/app/api/routeHandler';
import { userService } from '@/lib/services/userService';

export const GET = routeHandler({
  auth: true,
  roles: ['customer', 'admin'],
  handler: async (request, { user }) => {
    const result = await userService.getProfile(user);
    return NextResponse.json(result);
  },
});

export const PUT = routeHandler({
  auth: true,
  roles: ['customer', 'admin'],
  schema: updateProfileSchema,
  handler: async (request, { user, data }) => {
    const result = await userService.updateProfile({ userId: user._id, data });
    return NextResponse.json(result);
  },
});
