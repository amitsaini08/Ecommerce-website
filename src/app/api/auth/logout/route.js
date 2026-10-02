import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth';
import { routeHandler } from '@/app/api/routeHandler';

export const POST = routeHandler({
  handler: () => {
    const response = NextResponse.json({ message: 'Logged out successfully' });
    return clearAuthCookies(response);
  },
});