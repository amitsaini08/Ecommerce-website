import { NextResponse } from 'next/server';
import { pushSubscriptionSchema } from '@/lib/validations';
import { notificationService } from '@/lib/services/notificationService';
import { routeHandler } from '../../routeHandler';

export const POST = routeHandler({
  auth: true,
  schema: pushSubscriptionSchema,
  handler: async (request, { user, data }) =>
    NextResponse.json(
      await notificationService.subscribe({
        userId: user._id,
        subscription: data,
        userAgent: request.headers.get('user-agent') || '',
      })
    ),
});

export const DELETE = routeHandler({
  auth: true,
  schema: pushSubscriptionSchema.pick({ endpoint: true }),
  handler: async (_req, { user, data }) =>
    NextResponse.json(
      await notificationService.unsubscribe({ userId: user._id, endpoint: data.endpoint })
    ),
});