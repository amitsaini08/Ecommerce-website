import { User, Product } from '@/lib/db/models';
import { AppError } from '@/app/api/routeHandler';

export const wishlistService = {
  
  async getWishlist(user) {
    if (!user || !user.wishlist || user.wishlist.length === 0) {
      return { items: [] };
    }

    const productsList = await Product.find({ _id: { $in: user.wishlist } }).lean();
    const items = productsList.map((p) => {
      const { productLink, ...rest } = p;
      return { ...rest, id: String(p._id) };
    });

    return { items };
  },

 
  async addToWishlist({ user, productId, productIds }) {
    if (productId) {
      await User.updateOne(
        { _id: user._id },
        { $addToSet: { wishlist: String(productId) } }
      );
      return { success: true };
    }

    if (Array.isArray(productIds) && productIds.length > 0) {
      const cleanIds = productIds.filter(Boolean).map((id) => String(id));
      await User.updateOne(
        { _id: user._id },
        { $addToSet: { wishlist: { $each: cleanIds } } }
      );
      return { success: true, count: cleanIds.length };
    }

    throw new AppError('Missing productId or productIds', 400);
  },

  
  async removeFromWishlist({ user, productId }) {
    await User.updateOne(
      { _id: user._id },
      { $pull: { wishlist: String(productId) } }
    );
    return { success: true };
  },
};
