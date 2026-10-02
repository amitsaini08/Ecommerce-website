import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { User } from '@/lib/db/models';
import { changePasswordSchema } from '@/lib/validations';
import { routeHandler, AppError } from '@/app/api/routeHandler';

export const POST = routeHandler({
  auth: true,
  roles: ['customer', 'admin'],
  rateLimit: { key: 'change-password', max: 5, windowSec: 15 * 60 },
  schema: changePasswordSchema,
  handler: async (request, { user, data }) => {
    const { currentPassword, newPassword } = data || {};

    const dbUser = await User.findById(user._id);
    if (!dbUser || !dbUser.passwordHash) {
      throw new AppError('Current password is incorrect', 400);
    }

    const isMatch = await bcrypt.compare(currentPassword, dbUser.passwordHash);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 400);
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    dbUser.passwordHash = newPasswordHash;
    await dbUser.save();

    return NextResponse.json({ message: 'Password updated successfully' });
  },
});