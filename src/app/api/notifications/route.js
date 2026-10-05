import { NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notificationService';
import { routeHandler } from '../routeHandler';
import Notification from '@/lib/db/models/Notification';

export const dynamic = 'force-dynamic';

export const GET = routeHandler({
  auth: true,
  handler: async (request, { user }) => {
    const sp = new URL(request.url).searchParams;
    const page = Math.max(1, parseInt(sp.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(sp.get('limit') || '15')));
    const unreadOnly = sp.get('unread') === 'true';
    const forRole = sp.get('forRole') === 'admin' ? 'admin' : 'customer';


    return NextResponse.json(
      await notificationService.list({ userId: user._id, forRole, page, limit, unreadOnly })
    );
  },
});