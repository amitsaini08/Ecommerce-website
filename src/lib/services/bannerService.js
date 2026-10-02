import { Banner } from '@/lib/db/models';
import { AppError } from '@/app/api/routeHandler';

export const bannerService = {
 
  async getActiveBanners() {
    const activeBanners = await Banner.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 }).lean();
    return { banners: activeBanners };
  },

  
  async getAdminBanners() {
    const allBanners = await Banner.find().sort({ sortOrder: 1, createdAt: -1 }).lean();
    return { banners: allBanners };
  },

  
  async createBanner(data) {
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

    return { banner: newBanner.toObject(), message: 'Banner created successfully' };
  },

  
  async updateBanner({ id, data }) {
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

    return { banner: banner.toObject(), message: 'Banner updated successfully' };
  },


  async deleteBanner(id) {
    const res = await Banner.deleteOne({ _id: id });
    if (res.deletedCount === 0) {
      throw new AppError('Banner not found', 404);
    }
    return { message: 'Banner deleted successfully' };
  },
};
