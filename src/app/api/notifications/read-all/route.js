import { NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notificationService';
import { AppError, routeHandler } from '../../routeHandler';

export const POST = routeHandler({
  auth: true,
  handler: async (request, { user }) => {
    const forRole = new URL(request.url).searchParams.get('forRole') === 'admin' ? 'admin' : 'customer';
    if (forRole === 'admin' && user.role !== 'admin') throw new AppError('Forbidden', 403);
    return NextResponse.json(await notificationService.markAllRead({ userId: user._id, forRole }));
  }
});