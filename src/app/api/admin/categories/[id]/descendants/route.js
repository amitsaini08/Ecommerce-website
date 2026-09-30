// src/app/api/admin/categories/[id]/descendants/route.js
import { NextResponse } from 'next/server';
import { connectToDatabase, Category } from '@/lib/db/models';
import { requireAdmin } from '@/lib/auth';

// Returns every descendant id of `id` in a SINGLE query, instead of loading
// the whole collection and recursing over it in JS (the old
// getDescendantIds()). Used by the edit-category form to grey out invalid
// parent choices: you can't set a category's own descendant as its parent,
// that's a cycle.
//
// Direction matters: to walk DOWN the tree we start from this category's
// _id and look for documents that list it inside their parentIds array,
// then repeat using each newly-found doc's own _id.
export async function GET(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    await connectToDatabase();

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
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}