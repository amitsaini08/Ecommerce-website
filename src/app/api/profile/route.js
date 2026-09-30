import { NextResponse } from 'next/server';
import { connectToDatabase, User } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';
import { updateProfileSchema } from '@/lib/validations';
import { parseAndValidate } from '@/lib/sanitization';

export async function GET(request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(authUser.id).lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { passwordHash, otp, resetOtp, ...safeUser } = user;
    const addresses = (user.addresses || []).map((a) => ({ ...a, id: a._id }));

    return NextResponse.json({
      user: { ...safeUser, id: user._id },
      addresses,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawBody = await request.json().catch(() => ({}));
    const validation = parseAndValidate(updateProfileSchema, rawBody);

    if (!validation.success) {
      const firstError = validation.errors[0];
      return NextResponse.json(
        {
          error: firstError?.message || 'Validation failed',
          field: firstError?.field,
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const { name, phone, avatarUrl } = validation.sanitizedData;

    await connectToDatabase();
    const user = await User.findById(authUser.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    user.name = name;
    user.phone = phone || null;
    if (avatarUrl !== undefined) {
      user.avatarUrl = avatarUrl || null;
    }

    await user.save();

    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      message: 'Profile updated successfully!',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
