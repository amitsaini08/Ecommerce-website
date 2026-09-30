import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase, User } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';
import { changePasswordSchema } from '@/lib/validations';
import { parseAndValidate } from '@/lib/sanitization';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

export async function POST(request) {
  try {
    const userSession = await getAuthUser(request);
    if (!userSession) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to change your password.' },
        { status: 401 }
      );
    }

    const ip = getClientIP(request);
    const rateCheck = await checkRateLimit(`change-password:${userSession.id}:${ip}`, 5, 15 * 60);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Too many password change attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { currentPassword, newPassword } = body || {};

    if (!currentPassword) {
      return NextResponse.json(
        { field: 'currentPassword', message: 'Current password is required', error: 'Current password is required' },
        { status: 400 }
      );
    }

    if (!newPassword) {
      return NextResponse.json(
        { field: 'newPassword', message: 'New password is required', error: 'New password is required' },
        { status: 400 }
      );
    }

    const validation = parseAndValidate(changePasswordSchema, { currentPassword, newPassword });
    if (!validation.success) {
      const firstFieldErr = validation.errors[0];
      return NextResponse.json(
        {
          field: firstFieldErr?.field || 'newPassword',
          message: firstFieldErr?.message || 'Validation failed',
          error: firstFieldErr?.message || 'Validation failed',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const dbUser = await User.findById(userSession.id);
    if (!dbUser || !dbUser.passwordHash) {
      return NextResponse.json(
        { field: 'currentPassword', message: 'Current password is incorrect', error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    const isMatch = await bcrypt.compare(currentPassword, dbUser.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { field: 'currentPassword', message: 'Current password is incorrect', error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { field: 'newPassword', message: 'New password must NOT be the same as Current Password', error: 'New password must NOT be the same as Current Password' },
        { status: 400 }
      );
    }

    // Hash new password and save
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    dbUser.passwordHash = newPasswordHash;
    await dbUser.save();

    return NextResponse.json({
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Change password error:', error?.message);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating your password.' },
      { status: 500 }
    );
  }
}
