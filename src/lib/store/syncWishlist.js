import { setWishlist, clearWishlist } from './wishlistSlice';
import { wishlistApi } from '@/lib/apiClient/wishlist';

/**
 * Merges guest wishlist items with server DB wishlist and loads user DB wishlist
 * @param {Function} dispatch Redux dispatch
 * @param {Array} guestWishlistItems Current items in Redux before sync
 */
export async function syncWishlistOnAuth(dispatch, guestWishlistItems = []) {
  try {
    if (Array.isArray(guestWishlistItems) && guestWishlistItems.length > 0) {
      const productIds = guestWishlistItems.map((item) => String(item._id || item.id || '')).filter(Boolean);
      if (productIds.length > 0) {
        await wishlistApi.sync(productIds);
      }
    }
  } catch (err) {
    console.error('Failed to merge guest wishlist:', err);
  } finally {
    dispatch(clearWishlist());
  }

  try {
    const wishlistData = await wishlistApi.get();
    if (wishlistData?.items) {
      dispatch(setWishlist(wishlistData.items || []));
    }
  } catch (err) {
    console.error('Failed to fetch DB wishlist:', err);
  }
}
