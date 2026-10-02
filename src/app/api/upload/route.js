import { NextResponse } from 'next/server';
import { routeHandler, AppError } from '@/app/api/routeHandler';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const POST = routeHandler({
  auth: true,
  roles: ['customer', 'admin'],
  handler: async (request, { user }) => {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      throw new AppError('No image file provided', 400);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      throw new AppError('Invalid file type. Only JPG, PNG, WEBP, and GIF images are allowed.', 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new AppError('File size exceeds maximum limit of 5MB.', 400);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataURI = `data:${file.type};base64,${base64}`;

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new AppError('Cloudinary configuration missing on server', 500);
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const crypto = await import('crypto');
    const signature = crypto
      .createHash('sha1')
      .update(`timestamp=${timestamp}${apiSecret}`)
      .digest('hex');

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: dataURI,
        api_key: apiKey,
        timestamp,
        signature,
      }),
    });

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok) {
      throw new AppError(uploadData.error?.message || 'Upload failed', 500);
    }

    return NextResponse.json({ url: uploadData.secure_url, publicId: uploadData.public_id });
  },
});