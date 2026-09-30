import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase, Category } from '@/lib/db/models';
import { requireAdmin } from '@/lib/auth';
import { validateNoCycle } from '@/lib/categoryHelpers';
import { categorySchema } from '@/lib/validations';
import { parseAndValidate } from '@/lib/sanitization';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 200;

export async function GET(request) {
  try {
    await requireAdmin(request);
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT, MAX_LIMIT);

    if (q) {
      return NextResponse.json(await searchCategories(q, limit));
    }

    const parentId = searchParams.get('parentId') || null;
    const cursor = searchParams.get('cursor') || null;
    return NextResponse.json(await fetchChildren(parentId, cursor, limit));
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

async function fetchChildren(parentId, cursor, limit) {

  const base = parentId ? { parentIds: parentId } : { isRoot: true };
  let match = base;
  if (cursor) {
    const [ts, lastId] = cursor.split('|');
    const cursorDate = new Date(ts);
    if (isNaN(cursorDate) || !lastId) return { categories: [], nextCursor: null }; // kharab cursor
    match = {
      $and: [base,
        { $or: [{ createdAt: { $lt: cursorDate } }, { createdAt: cursorDate, _id: { $lt: lastId } },], },
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
        id: '$_id',
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
      $addFields: { id: '$_id' },
    },
    {
      $project: {
        name: 1,
        slug: 1,
        id: 1,
        parentIds: 1,
        ancestors: { _id: 1, name: 1, parentIds: 1 },
      },
    },
  ]);


  // The chain-walk happens here, in memory, against the small `ancestors`
  // array we already have - not against the whole collection.
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
  // Same simplification the old client code made: only the first parent
  // chain is shown in the breadcrumb, even for multi-parent categories.
  while (current.parentIds?.length > 0 && depth < 15) {
    const parent = byId[String(current.parentIds[0])];
    if (!parent) break;
    path.unshift(parent.name);
    current = parent;
    depth++;
  }
  return path.join(' › ');
}

export async function POST(request) {
  try {
    await requireAdmin(request);
    const rawBody = await request.json().catch(() => ({}));
    const validation = parseAndValidate(categorySchema, rawBody);

    const isAlreadyExists = await Category.exists({ slug: validation.sanitizedData.slug });
    if (isAlreadyExists) {
      return NextResponse.json({ error: 'Category with this slug already exists' }, { status: 400 });
    }

    if (!validation.success) {
      const firstError = validation.errors[0];
      return NextResponse.json(
        {
          error: firstError?.message || 'Validation failed',
          field: firstError?.field,
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const { name, slug, imageUrl } = validation.sanitizedData;
    const parentIds = Array.isArray(rawBody.parentIds) ? rawBody.parentIds : [];

    await connectToDatabase();
    await validateNoCycle(null, parentIds);

    const newCategory = await Category.create({
      _id: crypto.randomUUID(),
      name,
      slug: slug.toLowerCase().replace(/\s+/g, '-'),
      imageUrl: imageUrl || null,
      parentIds,
      isRoot: parentIds.length === 0,
    });

    return NextResponse.json(
      { category: { ...newCategory.toObject(), id: newCategory._id } },
      { status: 201 }
    );
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    if (error.message?.includes('parent') || error.message?.includes('cycle'))
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: error.message || 'Failed to create' }, { status: 500 });
  }
}