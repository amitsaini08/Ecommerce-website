import { NextResponse } from 'next/server';
import { Banner } from '@/lib/db/models';
import { bannerSchema } from '@/lib/validations';
import { routeHandler } from '@/app/api/routeHandler';

export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async () => {
    const allBanners = await Banner.find().sort({ sortOrder: 1, createdAt: -1 }).lean();
    return NextResponse.json({ banners: allBanners });
  },
});

export const POST = routeHandler({
  auth: true,
  roles: ['admin'],
  schema: bannerSchema,
  handler: async (request, { data }) => {
    const { title, subtitle, imageUrl, bgColor, linkUrl, isActive, sortOrder } = data;
    const newBanner = await Banner.create({
      title: title.trim(),
      subtitle: subtitle ? subtitle.trim() : null,
      imageUrl: imageUrl ? imageUrl.trim() : null,
      bgColor: bgColor ? bgColor.trim() : '#18181b',
      linkUrl: linkUrl ? linkUrl.trim() : null,
      isActive: isActive ?? true,
      sortOrder: Number(sortOrder || 0),
    });

    return NextResponse.json(
      { banner: newBanner.toObject(), message: 'Banner created successfully' },
      { status: 201 }
    );
  },
});