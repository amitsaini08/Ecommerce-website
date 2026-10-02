import { NextResponse } from 'next/server';
import { routeHandler } from '@/app/api/routeHandler';
import { reviewService } from '@/lib/services/reviewService';

export const PATCH = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request, { params }) => {
    const { id } = await params;
    const result = await reviewService.toggleHideReview(id);
    return NextResponse.json(result);
  },
});

export const DELETE = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request, { params }) => {
    const { id } = await params;
    const result = await reviewService.deleteAdminReview(id);
    return NextResponse.json(result);
  },
});
