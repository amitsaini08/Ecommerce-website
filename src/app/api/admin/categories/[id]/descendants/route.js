// src/app/api/admin/categories/[id]/descendants/route.js
import { NextResponse } from 'next/server';
import { connectToDatabase, Category } from '@/lib/db/models';
import { routeHandler } from '@/app/api/routeHandler';


export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request, { params }) => {
    const { id } = await params;

    const [result] = await Category.aggregate([
      { $match: { _id: id } },
      {
        $graphLookup: {
          from: 'categories',
          startWith: '$_id',
          connectFromField: '_id',
          connectToField: 'parentIds', // matches if _id is inside a doc's parentIds array
          as: 'descendants',
          maxDepth: 20,
        },
      },
      { $project: { descendantIds: '$descendants._id' } },
    ]);

    return NextResponse.json({ descendantIds: result?.descendantIds || [] });
  },
});