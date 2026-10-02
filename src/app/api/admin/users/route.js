import { NextResponse } from 'next/server';
import { routeHandler } from '@/app/api/routeHandler';
import { z } from 'zod';
import { userService } from '@/lib/services/userService';

const updateUserRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['customer', 'admin']),
});

export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request) => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await userService.getAdminUsers({ page, limit });
    return NextResponse.json(result);
  },
});

export const PATCH = routeHandler({
  auth: true,
  roles: ['admin'],
  schema: updateUserRoleSchema,
  handler: async (request, { data }) => {
    const result = await userService.updateUserRole(data);
    return NextResponse.json(result);
  },
});
