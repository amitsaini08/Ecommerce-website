'use client';

import { useDispatch, useSelector } from 'react-redux';
import { addItem, selectCartItems } from '@/lib/store/cartSlice';
import { useToast } from '@/components/common/Toast';

export default function useAddToCart() {
  const dispatch = useDispatch();
  const items = useSelector(selectCartItems);
  const toast = useToast();

  const addProductToCart = (product, quantity = 1) => {
    const stock = Number(product.stock) || 0;
    const selectedQuantity = Number(quantity) || 1;

    const existingItem = items.find(
      (item) => item.productId === product._id
    );

    const currentQuantity = Number(existingItem?.quantity) || 0;

    const requestedQuantity =  currentQuantity + selectedQuantity;

    if (requestedQuantity > stock) {
      toast.warning(
        `Only ${stock} ${product.name} available in stock.`
      );

      return false;
    }

    dispatch(
      addItem({
        productId: product._id,
        name: product.name,
        slug: product.slug,
        image: product.images?.[0] || '',
        price: Number(product.price) || 0,
        discountPrice:
          product.discountPrice != null
            ? Number(product.discountPrice)
            : null,
        codAvailable: product.codAvailable !== false,
        quantity: selectedQuantity,
        stock,
      })
    );

    toast.success(`${product.name} added to cart!`);

    return true;
  };

  return { addProductToCart };
}