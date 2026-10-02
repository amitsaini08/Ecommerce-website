import { NextResponse } from 'next/server';
import { reviewSchema } from '@/lib/validations';
import { broadcast } from '@/lib/broadcast';
import { routeHandler } from '@/app/api/routeHandler';
import { reviewService } from '@/lib/services/reviewService';

export const PUT = routeHandler({
  auth: true,
  roles: ['customer', 'admin'],
  schema: reviewSchema,
  handler: async (request, { user, data, params }) => {
    const { id } = await params;
    const { review, summary, productId, message } = await reviewService.updateReview({ id, user, data });

    broadcast(productId, 'review:updated', { review, summary }, request.headers.get('x-socket-id'));
    return NextResponse.json({ review, summary, message });
  },
});

export const DELETE = routeHandler({
  auth: true,
  roles: ['customer', 'admin'],
  handler: async (request, { user, params }) => {
    const { id } = await params;
    const { ok, summary, productId, message } = await reviewService.deleteReview({ id, user });

    broadcast(productId, 'review:deleted', { reviewId: String(id), summary }, request.headers.get('x-socket-id'));

    return NextResponse.json({ ok, summary, message });
  },
});