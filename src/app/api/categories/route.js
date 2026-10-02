import { NextResponse } from 'next/server';
import { connectToDatabase, Category } from '@/lib/db/models';
import { routeHandler } from '../routeHandler';


export const GET = routeHandler({
  handler: async () => {
      
    const allCategories = await Category.find().sort({ name: 1 }).lean();

    const rootCategories = allCategories.filter((c) => !c.parentIds || c.parentIds.length === 0);
    const childMap = {};
    allCategories.forEach((c) => {
      (c.parentIds || []).forEach((pid) => {
        if (!childMap[pid]) childMap[pid] = [];
        childMap[pid].push(c);
      });
    });

    const categoriesWithChildren = rootCategories.map((cat) => ({
      ...cat,
      _id: cat._id,
      children: childMap[cat._id] || [],
    }));

    return NextResponse.json({ categories: categoriesWithChildren });
  }
})
