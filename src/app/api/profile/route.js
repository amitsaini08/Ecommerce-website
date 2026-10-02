import { NextResponse } from 'next/server';
import { User } from '@/lib/db/models';
import { updateProfileSchema } from '@/lib/validations';
import { routeHandler, AppError } from '@/app/api/routeHandler';

export const GET = routeHandler({
  auth: true,
  roles: ['customer', 'admin'],
  handler: async (request, { user }) => {
    const { passwordHash, ...safeUser } = user;
    return NextResponse.json({
      user: safeUser,
      addresses: user.addresses || [],
    });
  },
});

export const PUT = routeHandler({
  auth: true,
  roles: ['customer', 'admin'],
  schema: updateProfileSchema,
  handler: async (request, { user, data }) => {
    const { name, phone, avatarUrl } = data;
    const dbUser = await User.findById(user._id);
    if (!dbUser) throw new AppError('User not found', 404);

    dbUser.name = name;
    dbUser.phone = phone || null;
    if (avatarUrl !== undefined) dbUser.avatarUrl = avatarUrl || null;

    await dbUser.save();

    return NextResponse.json({
      user: {
        _id: String(dbUser._id),
        name: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone,
        role: dbUser.role,
        avatarUrl: dbUser.avatarUrl,
      },
      message: 'Profile updated successfully!',
    });
  },
});
