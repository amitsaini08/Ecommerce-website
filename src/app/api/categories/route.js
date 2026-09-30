import { NextResponse } from 'next/server';
import { connectToDatabase, Category } from '@/lib/db/models';

export async function GET() {
  try {
    await connectToDatabase();
    const allCategories = await Category.find().sort({ name: 1 }).lean();

    const rootCategories = allCategories.filter((c) => !c.parentIds || c.parentIds.length === 0);
    const childMap = {};
    allCategories.forEach((c) => {
      (c.parentIds || []).forEach((pid) => {
        if (!childMap[pid]) childMap[pid] = [];
        childMap[pid].push({ ...c, id: c._id });
      });
    });

    const categoriesWithChildren = rootCategories.map((cat) => ({
      ...cat,
      id: cat._id,
      children: childMap[cat._id] || [],
    }));

    return NextResponse.json({ categories: categoriesWithChildren });
  } catch (error) {
    console.error('Categories API error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' },{ status: 500 });
  }
}
