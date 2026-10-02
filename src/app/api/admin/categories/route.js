import { NextResponse } from 'next/server';
import { Category } from '@/lib/db/models';
import { validateNoCycle } from '@/lib/categoryHelpers';
import { categorySchema } from '@/lib/validations';
import { routeHandler } from '../../routeHandler';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 200;

export const GET = routeHandler({
  auth: true,
  roles: ['admin'],
  handler: async (request) => {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT, MAX_LIMIT);

    if (q) {
      return NextResponse.json(await searchCategories(q, limit));
    }

    const parentId = searchParams.get('parentId') || null;
    const cursor = searchParams.get('cursor') || null;
    return NextResponse.json(await fetchChildren(parentId, cursor, limit));
  }
});

async function fetchChildren(parentId, cursor, limit) {
  const base = parentId ? { parentIds: parentId } : { isRoot: true };
  let match = base;
  if (cursor) {
    const [ts, lastId] = cursor.split('|');
    const cursorDate = new Date(ts);
    if (isNaN(cursorDate) || !lastId) return { categories: [], nextCursor: null };
    match = {
      $and: [base,
        { $or: [{ createdAt: { $lt: cursorDate } }, { createdAt: cursorDate, _id: { $lt: lastId } }] },
      ],
    };
  }

  const rows = await Category.aggregate([
    { $match: match },
    { $sort: { createdAt: -1, _id: -1 } },
    { $limit: limit + 1 },
    {
      $lookup: {
        from: 'categories',
        let: { catId: '$_id' },
        pipeline: [
          { $match: { $expr: { $in: ['$$catId', '$parentIds'] } } },
          { $limit: 1 },
          { $project: { _id: 1 } },
        ],
        as: '_childProbe',
      },
    },
    {
      $addFields: {
        hasChildren: { $gt: [{ $size: '$_childProbe' }, 0] },
      },
    },
    { $project: { _childProbe: 0 } },
  ]);

  const hasMore = rows.length > limit;
  const categories = rows.slice(0, limit);
  const last = categories[categories.length - 1];

  return {
    categories,
    nextCursor: hasMore ? `${new Date(last.createdAt).toISOString()}|${last._id}` : null,
  };
}

async function searchCategories(q, limit) {
  const matches = await Category.aggregate([
    {
      $match: {
        name: { $regex: q, $options: 'i' },
      }
    },
    { $limit: limit },
    {
      $graphLookup: {
        from: 'categories',
        startWith: '$parentIds',
        connectFromField: 'parentIds',
        connectToField: '_id',
        as: 'ancestors',
        maxDepth: 15,
      },
    },
    {
      $project: {
        name: 1,
        slug: 1,
        _id: 1,
        parentIds: 1,
        ancestors: { _id: 1, name: 1, parentIds: 1 },
      },
    },
  ]);

  const categories = matches.map((cat) => ({
    ...cat,
    breadcrumb: buildBreadcrumb(cat, cat.ancestors),
  }));

  return { categories };
}

function buildBreadcrumb(cat, ancestors) {
  const byId = Object.fromEntries(ancestors.map((a) => [String(a._id), a]));
  const path = [cat.name];
  let current = cat;
  let depth = 0;
  while (current.parentIds?.length > 0 && depth < 15) {
    const parent = byId[String(current.parentIds[0])];
    if (!parent) break;
    path.unshift(parent.name);
    current = parent;
    depth++;
  }
  return path.join(' › ');
}

export const POST = routeHandler({
  auth: true,
  roles: ['admin'],
  schema: categorySchema,
  handler: async (request, { data }) => {
    const isAlreadyExists = await Category.exists({ slug: data.slug });
    if (isAlreadyExists) {
      return NextResponse.json({ error: 'Category with this slug already exists' }, { status: 400 });
    }

    const { name, slug, imageUrl } = data;
    const parentIds = Array.isArray(data.parentIds) ? data.parentIds : [];

    await validateNoCycle(null, parentIds);

    const newCategory = await Category.create({
      name,
      slug: slug.toLowerCase().replace(/\s+/g, '-'),
      imageUrl: imageUrl || null,
      parentIds,
      isRoot: parentIds.length === 0,
    });

    return NextResponse.json(
      { category: newCategory.toObject() },
      { status: 201 }
    );
  }
});