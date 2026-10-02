import { NextResponse } from 'next/server';
import { routeHandler } from '@/app/api/routeHandler';
import { reviewSchema } from '@/lib/validations';
import { reviewService } from '@/lib/services/reviewService';

export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request) => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await reviewService.getAdminReviews({ page, limit });
    return NextResponse.json(result);
  },
});

export const POST = routeHandler({
  auth: true,
  roles: ['admin'],
  schema: reviewSchema,
  handler: async (request, { data }) => {
    const result = await reviewService.createAdminReview(data);
    return NextResponse.json(result, { status: 201 });
  },
});
