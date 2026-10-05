import { Product } from '@/lib/db/models';
import { notificationService } from './notificationService';

const LOW_STOCK = 5;

export async function decrementStock(items) {
  for (const item of items) {
    const p = await Product.findOneAndUpdate(
      { _id: item.productId },
      { $inc: { stock: -item.quantity } },
      { new: true }
    );
    if (!p) continue;

    const before = p.stock + item.quantity;
    const soldOut = p.stock <= 0 && before > 0;
    const low = p.stock <= LOW_STOCK && before > LOW_STOCK;

    if (soldOut || low) {
      notificationService.notifyAdminsSafe({
        type: 'low_stock',
        title: soldOut ? 'Out of stock' : 'Low stock',
        body: soldOut ? `${p.name} is out of stock.` : `${p.name} has only ${p.stock} left.`,
        link: `/admin/products/${p._id}/edit`,
      });
    }
  }
}

export async function restoreStock(items = []) {
  for (const item of items) {
    await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } });
  }
}