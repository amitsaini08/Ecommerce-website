import { NextResponse } from 'next/server';
import { Banner } from '@/lib/db/models';
import { routeHandler, AppError } from '@/app/api/routeHandler';
import { bannerSchema } from '@/lib/validations';

export const PUT = routeHandler({
  auth: true,
  roles: ['admin'],
  schema: bannerSchema,
  handler: async (request, { params, data }) => {
    const { id } = await params;
    const { title, subtitle, imageUrl, bgColor, linkUrl, isActive, sortOrder } = data;

    const banner = await Banner.findById(id);
    if (!banner) {
      throw new AppError('Banner not found', 404);
    }

    banner.title = title.trim();
    banner.subtitle = subtitle ? subtitle.trim() : null;
    banner.imageUrl = imageUrl ? imageUrl.trim() : null;
    banner.bgColor = bgColor ? bgColor.trim() : '#18181b';
    banner.linkUrl = linkUrl ? linkUrl.trim() : null;
    banner.isActive = isActive ?? true;
    banner.sortOrder = Number(sortOrder || 0);

    await banner.save();

    return NextResponse.json({ banner: banner.toObject(), message: 'Banner updated successfully' });
  },
});

export const DELETE = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request, { params }) => {
    const { id } = await params;
    const res = await Banner.deleteOne({ _id: id });
    if (res.deletedCount === 0) {
      throw new AppError('Banner not found', 404);
    }
    return NextResponse.json({ message: 'Banner deleted successfully' });
  },
});