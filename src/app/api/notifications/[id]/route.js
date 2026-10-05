import { NextResponse } from 'next/server';
import { notificationService } from '@/lib/services/notificationService';
import { routeHandler } from '../../routeHandler';

export const PATCH = routeHandler({
  auth: true,
  handler: async (_req, { user, params }) => {
    const { id } = await params;
    return NextResponse.json(await notificationService.markRead({ userId: user._id, id }));
  },
});

export const DELETE = routeHandler({
  auth: true,
  handler: async (_req, { user, params }) => {
    const { id } = await params;
    return NextResponse.json(await notificationService.remove({ userId: user._id, id }));
  },
});