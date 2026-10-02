import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { routeHandler, AppError } from '@/app/api/routeHandler';

export const POST = routeHandler({
  auth: true,
  roles: ['customer', 'admin'],
  handler: async (request, { user }) => {
    const { uploadType } = await request.json().catch(() => ({}));

    let folder = 'reviews';
    if (uploadType === 'product-image') {
      if (user.role !== 'admin') throw new AppError('Forbidden: Admin access required', 403);
      folder = 'products';
    } else if (uploadType === 'category-image') {
      if (user.role !== 'admin') throw new AppError('Forbidden: Admin access required', 403);
      folder = 'categories';
    } else if (uploadType === 'review-media') {
      folder = 'reviews';
    } else {
      throw new AppError('Invalid upload type', 400);
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new AppError('Cloudinary configuration missing on server', 500);
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

    return NextResponse.json({
      signature,
      timestamp,
      folder,
      apiKey,
      cloudName,
    });
  },
});