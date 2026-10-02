import { NextResponse } from 'next/server';
import { changePasswordSchema } from '@/lib/validations';
import { routeHandler } from '@/app/api/routeHandler';
import { userService } from '@/lib/services/userService';

export const POST = routeHandler({
  auth: true,
  roles: ['customer', 'admin'],
  rateLimit: { key: 'change-password', max: 5, windowSec: 15 * 60 },
  schema: changePasswordSchema,
  handler: async (request, { user, data }) => {
    const result = await userService.changePassword({ userId: user._id, data });
    return NextResponse.json(result);
  },
});