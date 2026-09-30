import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase, User } from '@/lib/db/models';
import { verifyRefreshToken, generateTokens, setAuthCookies } from '@/lib/auth';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token' }, { status: 401 }
      );
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const user = await User.findById(decoded.id).lean();

    if (!user || !user.isVerified) {
      return NextResponse.json(
        { error: 'User not found or not verified' },
        { status: 401 }
      );
    }

    const tokens = generateTokens({
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const response = NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    return setAuthCookies(response, tokens);
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
