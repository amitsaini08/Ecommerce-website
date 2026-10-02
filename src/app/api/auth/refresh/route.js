import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { User } from '@/lib/db/models';
import { verifyRefreshToken, generateTokens, setAuthCookies } from '@/lib/auth';
import { routeHandler } from '../../routeHandler';

export const POST = routeHandler({
  auth: false,
  handler: async (request) => {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
    }

    const user = await User.findById(decoded.id).lean();

    if (!user || !user.isVerified) {
      return NextResponse.json({ error: 'User not found or not verified' }, { status: 401 });
    }

    const tokens = generateTokens({
      _id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const response = NextResponse.json({
      user: {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    return setAuthCookies(response, tokens);
  },
});