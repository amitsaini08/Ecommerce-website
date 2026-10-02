import { connectToDatabase, Category, Product } from '@/lib/db/models';
import { validateNoCycle, getAllDescendantIds } from '@/lib/categoryHelpers';
import { AppError } from '@/app/api/routeHandler';
import mongoose from 'mongoose';

const { ObjectId } = mongoose.Types;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 200;

export const categoryService = {
 
  async getPublicCategoriesTree() {
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

    return { categories: categoriesWithChildren };
  },

 
  async getCategoryBySlug(slug) {
    const category = await Category.findOne({ slug }).lean();

    if (!category) {
      return { error: 'Category not found', status: 404 };
    }

    const subcategories = await Category.find({ parentIds: category._id }).lean();
    const descendantIds = await getAllDescendantIds(category._id);
    const relevantCategoryIds = [category._id, ...Array.from(descendantIds)];

    const categoryProducts = await Product.find({ categoryIds: { $in: relevantCategoryIds }, isActive: true })
      .sort({ createdAt: -1 }).limit(20).lean();

    const sanitizedProducts = categoryProducts.map((p) => {
      const { productLink, ...rest } = p;
      return rest;
    });

    return { category, subcategories, products: sanitizedProducts };
  },


  async getAdminCategories({ q, limit: reqLimit, rawParent, cursor }) {
    const limit = Math.min(parseInt(reqLimit || `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT, MAX_LIMIT);

    if (q) {
      return this._searchCategories(q, limit);
    }

    if (rawParent && !ObjectId.isValid(rawParent)) {
      return { error: 'Invalid parentId', status: 400 };
    }

    const parentId = rawParent ? new ObjectId(rawParent) : null;
    return this._fetchChildren(parentId, cursor, limit);
  },

  async _fetchChildren(parentId, cursor, limit) {
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
  },

  async _searchCategories(q, limit) {
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

    const buildBreadcrumb = (cat, ancestors) => {
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
    };

    const categories = matches.map((cat) => ({
      ...cat,
      breadcrumb: buildBreadcrumb(cat, cat.ancestors),
    }));

    return { categories };
  },

 
  async createCategory(data) {
    const isAlreadyExists = await Category.exists({ slug: data.slug });
    if (isAlreadyExists) {
      return { error: 'Category with this slug already exists', status: 400 };
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

    return { category: newCategory.toObject() };
  },


  async getCategoryById(id) {
    const cat = await Category.findById(id).lean();
    if (!cat) throw new AppError('Category not found', 404);
    return { category: cat };
  },


  async updateCategory({ id, data }) {
    const cat = await Category.findById(id);
    if (!cat) throw new AppError('Category not found', 404);

    if (data.parentId !== undefined || data.parentIds !== undefined) {
      const parentIds = data.parentIds || (data.parentId ? [data.parentId] : []);
      await validateNoCycle(id, parentIds);
      cat.parentIds = parentIds;
      cat.isRoot = cat.parentIds.length === 0;
    }
    if (data.name) cat.name = data.name;
    if (data.slug) cat.slug = data.slug.toLowerCase().replace(/\s+/g, '-');
    if (data.imageUrl !== undefined) cat.imageUrl = data.imageUrl || null;

    await cat.save();
    return { category: cat.toObject() };
  },


  async deleteCategory(id) {
    const res = await Category.deleteOne({ _id: id });
    if (res.deletedCount === 0) throw new AppError('Category not found', 404);
    return { message: 'Deleted' };
  },

  async getCategoryByIds(ids) {
    if (!ids || ids.length === 0) return { categories: [] };
    const rows = await Category.find({ _id: { $in: ids } }).select('name slug').lean();
    return { categories: rows };
  },

 
  async getCategoryDescendantIds(id) {
    const [result] = await Category.aggregate([
      { $match: { _id: id } },
      {
        $graphLookup: {
          from: 'categories',
          startWith: '$_id',
          connectFromField: '_id',
          connectToField: 'parentIds',
          as: 'descendants',
          maxDepth: 20,
        },
      },
      { $project: { descendantIds: '$descendants._id' } },
    ]);

    return { descendantIds: result?.descendantIds || [] };
  },
};
