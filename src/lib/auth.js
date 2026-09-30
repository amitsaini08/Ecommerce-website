import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { connectToDatabase, User } from '@/lib/db/models';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export function generateTokens(user) {
  const payload = { id: user._id || user.id, email: user.email, role: user.role, name: user.name };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    return null;
  }
}

export function setAuthCookies(response, { accessToken, refreshToken }) {
  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60, // 15 minutes
  });

  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return response;
}

export function clearAuthCookies(response) {
  response.cookies.set('access_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}


export async function getAuthUser(request) {
  const cookieStore = await cookies();
  let decoded = null;
  const accessToken = cookieStore.get("access_token")?.value;

  if (accessToken) decoded = verifyAccessToken(accessToken);

  if (!decoded) {
    const refreshToken = cookieStore.get("refresh_token")?.value;
    if (refreshToken) decoded = verifyRefreshToken(refreshToken);
  }

  if (!decoded) return null;

  try {
    await connectToDatabase();
    const user = await User.findById(decoded.id).lean();
    if (!user) return null;
    return {
      ...user,
      id: String(user._id),
      _id: String(user._id),
    };
  } catch (error) {
    console.error("getAuthUser error:", error);
    return null;
  }
}


export async function requireAuth(request) {
  const user = await getAuthUser(request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireAdmin(request) {
  const user = await requireAuth(request);
  if (user.role !== 'admin') {
    throw new Error('Forbidden');
  }
  return user;
}

export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
