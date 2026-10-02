import { NextResponse } from 'next/server';
import { reviewSchema } from '@/lib/validations';
import { broadcast } from '@/lib/broadcast';
import { routeHandler } from '@/app/api/routeHandler';
import { reviewService } from '@/lib/services/reviewService';

export const GET = routeHandler({
  auth: 'optional',
  handler: async (request, { user, params }) => {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')));

    const result = await reviewService.getProductReviews({ slug, user, page, limit });
    return NextResponse.json(result);
  },
});

export const POST = routeHandler({
  auth: true,
  rateLimit: { key: 'submit-review', max: 3, windowSec: 10 * 60 },
  schema: reviewSchema,
  handler: async (request, { user, data, params }) => {
    const { slug } = await params;
    const { review, summary, productId } = await reviewService.createReview({ slug, user, data });

    broadcast(
      productId,
      'review:created',
      { review, summary },
      request.headers.get('x-socket-id')
    );

    return NextResponse.json({ review, summary }, { status: 201 });
  },
});