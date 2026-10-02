import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
};

const getItemId = (item) => (item ? String(item._id || item.id || '') : '');

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    addToWishlist: (state, action) => {
      const product = action.payload;
      const pid = getItemId(product);
      if (!pid) return;
      const exists = state.items.some((item) => getItemId(item) === pid);
      if (!exists) {
        state.items.push(product);
      }
    },
    removeFromWishlist: (state, action) => {
      const productId = action.payload ? String(action.payload) : '';
      if (!productId) return;
      state.items = state.items.filter((item) => getItemId(item) !== productId);
    },
    toggleWishlist: (state, action) => {
      const product = action.payload;
      const pid = getItemId(product);
      if (!pid) return;
      const index = state.items.findIndex((item) => getItemId(item) === pid);
      if (index >= 0) {
        state.items.splice(index, 1);
      } else {
        state.items.push(product);
      }
    },
    setWishlist: (state, action) => {
      state.items = action.payload || [];
    },
    clearWishlist: (state) => {
      state.items = [];
    },
  },
});

export const {
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
  setWishlist,
  clearWishlist,
} = wishlistSlice.actions;

export const selectWishlistItems = (state) => state.wishlist.items;
export const selectWishlistItemCount = (state) => state.wishlist.items.length;
export const selectIsWishlisted = (productId) => (state) =>
  productId ? state.wishlist.items.some((item) => getItemId(item) === String(productId)) : false;

export default wishlistSlice.reducer;
