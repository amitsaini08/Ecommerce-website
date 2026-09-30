import { Category } from '@/lib/db/models';

// Category ke saare descendants (bachhe, pote, etc.) dhoondo
export async function getAllDescendantIds(categoryId) {
  const descendants = new Set();
  let queue = [categoryId.toString()];

  while (queue.length > 0) {
    const children = await Category.find({ parentIds: { $in: queue } }, '_id');
    const childIds = children.map(c => c._id.toString());
    const newOnes = childIds.filter(id => !descendants.has(id));
    newOnes.forEach(id => descendants.add(id));
    queue = newOnes;
  }
  return descendants;
}


export async function validateNoCycle(categoryId, newParentIds) {
  // Khud ko apna parent nahi bana sakte
  if (newParentIds.some(id => id.toString() === categoryId?.toString())) {
    throw new Error("A category cannot be its own parent");
  }

  if (!categoryId) return; // naya category, descendants exist hi nahi karte abhi

  const descendants = await getAllDescendantIds(categoryId);
  const invalid = newParentIds.filter(id => descendants.has(id.toString()));

  if (invalid.length > 0) {
    throw new Error("Cannot set a descendant category as a parent — this would create a cycle");
  }
}