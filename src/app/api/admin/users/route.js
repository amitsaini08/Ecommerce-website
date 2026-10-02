import { NextResponse } from 'next/server';
import { User } from '@/lib/db/models';
import { routeHandler, AppError } from '@/app/api/routeHandler';
import { z } from 'zod';

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
    const offset = (page - 1) * limit;

    const users = await User.find().select('_id name email role isVerified createdAt').sort({ createdAt: -1 }).skip(offset).limit(limit).lean();
    const count = await User.countDocuments();
    return NextResponse.json({ users, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  },
});

export const PATCH = routeHandler({
  auth: true,
  roles: ['admin'],
  schema: updateUserRoleSchema,
  handler: async (request, { data }) => {
    const user = await User.findById(data.userId);
    if (!user) throw new AppError('User not found', 404);

    user.role = data.role;
    await user.save();
    return NextResponse.json({ user });
  },
});
