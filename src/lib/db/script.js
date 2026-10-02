import mongoose from 'mongoose';

const { ObjectId } = mongoose.mongo;

const URI = process.env.MONGODB_URI; // apne .env ka naam yahan rakho
const ARGS = process.argv.slice(2);
const MODE = ARGS.includes('--restore') ? 'restore' : ARGS.includes('--run') ? 'run' : 'dry';

const BATCH = 500;
const BAK = '__bak_uuid';
// Mongoose ke pluralized names. Confirm: db.getCollectionNames()
const COLLECTIONS = [
  'users', 'products', 'categories', 'orders', 'reviews',
  'coupons', 'banners', 'storesettings', 'pageviews',
];

/* ---------- helpers ---------- */

const isStr = (v) => typeof v === 'string';
const HEX24 = /^[0-9a-fA-F]{24}$/;

const orphans = {}; // scalar ref ka target nahi mila
const dropped = {}; // array ref ka target nahi mila, hata diya
const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };
const orphanIds = new Map();

// createdAt ka timestamp + random tail, to sorting purani wali rehti hai
function makeId(createdAt) {
  const d = createdAt ? new Date(createdAt) : new Date();
  const ms = Number.isNaN(d.getTime()) ? Date.now() : d.getTime();
  const head = Math.floor(ms / 1000).toString(16).padStart(8, '0');
  const tail = new ObjectId().toHexString().slice(8);
  return new ObjectId(head + tail);
}

// scalar reference: users.wishlist jaise arrays ke liye refs() use hota hai
function ref(map, v, label) {
  if (v === '') return null;
  if (typeof v !== 'string') return v; // null, ObjectId ya object, jaisa hai waisa
  if (map.has(v)) return map.get(v);
  if (HEX24.test(v)) return new ObjectId(v);
  // target delete ho chuka hai (jaise purane order ka product). Order history na tootey,
  // isliye stable placeholder ObjectId do aur report karo
  bump(orphans, label);
  if (!orphanIds.has(v)) orphanIds.set(v, new ObjectId());
  return orphanIds.get(v);
}

function refs(map, arr, label) {
  const list = Array.isArray(arr) ? arr : arr == null ? [] : [arr];
  return list.flatMap((v) => {
    if (typeof v !== 'string') return [v];
    if (map.has(v)) return [map.get(v)];
    if (HEX24.test(v)) return [new ObjectId(v)];
    bump(dropped, label); // wishlist/category mein dead id rakhne ka fayda nahi
    return [];
  });
}

// subdocument array: sirf string _id badlo
function subs(arr, map) {
  if (!Array.isArray(arr)) return arr;
  return arr.map((s) =>
    isStr(s?._id)
      ? { ...s, _id: map?.get(s._id) ?? makeId(s.createdAt ?? s.changedAt) }
      : s
  );
}

const opt = (d, key, fn) => (d[key] !== undefined ? { [key]: fn(d[key]) } : {});
const idOf = (map, d) => (isStr(d._id) ? map.get(d._id) : d._id);
const own = (d) => (isStr(d._id) ? makeId(d.createdAt) : d._id);

/* ---------- phase 1: old -> new id maps ---------- */

let maps;

async function buildMaps(db, has) {
  const m = {
    users: new Map(), products: new Map(), categories: new Map(),
    addresses: new Map(), addons: new Map(),
  };

  const scan = async (name, fn) => {
    if (!has.has(name)) return;
    for await (const d of db.collection(name).find()) fn(d);
  };

  await scan('users', (d) => {
    if (isStr(d._id)) m.users.set(d._id, makeId(d.createdAt));
    for (const a of d.addresses || []) {
      if (isStr(a._id)) m.addresses.set(a._id, makeId(a.createdAt));
    }
  });

  await scan('products', (d) => {
    if (isStr(d._id)) m.products.set(d._id, makeId(d.createdAt));
    for (const a of d.addons || []) {
      if (isStr(a._id)) m.addons.set(a._id, makeId(a.createdAt));
    }
  });

  await scan('categories', (d) => {
    if (isStr(d._id)) m.categories.set(d._id, makeId(d.createdAt));
  });

  return m;
}

/* ---------- phase 2: per-collection transforms ---------- */

const orderItem = (i) => ({
  ...i,
  ...(isStr(i._id) && { _id: makeId(i.createdAt) }),
  ...opt(i, 'productId', (v) => ref(maps.products, v, 'orders.items.productId')),
  ...opt(i, 'addons', (list) =>
    list.map((a) => ({
      ...a,
      ...(isStr(a._id) && { _id: makeId(a.createdAt) }),
      ...opt(a, 'addonId', (v) => ref(maps.addons, v, 'orders.items.addons.addonId')),
    }))
  ),
});

const T = {
  users: (d) => ({
    ...d,
    _id: idOf(maps.users, d),
    ...opt(d, 'addresses', (v) => subs(v, maps.addresses)),
    ...opt(d, 'accounts', (v) => subs(v)),
    ...opt(d, 'wishlist', (v) => refs(maps.products, v, 'users.wishlist')),
  }),

  products: (d) => ({
    ...d,
    _id: idOf(maps.products, d),
    ...opt(d, 'categoryIds', (v) => refs(maps.categories, v, 'products.categoryIds')),
    ...opt(d, 'addons', (v) => subs(v, maps.addons)),
  }),

  categories: (d) => ({
    ...d,
    _id: idOf(maps.categories, d),
    ...opt(d, 'parentIds', (v) => refs(maps.categories, v, 'categories.parentIds')),
    ...opt(d, 'parentId', (v) => ref(maps.categories, v, 'categories.parentId')), // legacy field ho to
  }),

  orders: (d) => ({
    ...d,
    _id: own(d),
    ...opt(d, 'userId', (v) => ref(maps.users, v, 'orders.userId')),
    ...opt(d, 'addressId', (v) => ref(maps.addresses, v, 'orders.addressId')),
    ...opt(d, 'shippingAddress', (v) => ref(maps.addresses, v, 'orders.shippingAddress')),
    ...opt(d, 'items', (v) => v.map(orderItem)),
    ...opt(d, 'statusHistory', (v) => subs(v)),
  }),

  reviews: (d) => ({
    ...d,
    _id: own(d),
    ...opt(d, 'productId', (v) => ref(maps.products, v, 'reviews.productId')),
    ...opt(d, 'userId', (v) => ref(maps.users, v, 'reviews.userId')),
  }),

  coupons: (d) => ({ ...d, _id: own(d) }),
  banners: (d) => ({ ...d, _id: own(d) }),
  storesettings: (d) => ({ ...d, _id: own(d) }),
  pageviews: (d) => ({ ...d, _id: own(d) }),
};

/* ---------- io ---------- */

async function copy(from, to) {
  let batch = [];
  for await (const d of from.find()) {
    batch.push(d);
    if (batch.length >= BATCH) {
      await to.insertMany(batch);
      batch = [];
    }
  }
  if (batch.length) await to.insertMany(batch);
}

/* ---------- verify (migration ke baad) ---------- */

async function verify(db, has) {
  console.log('\nVerifying relations...');

  const idSet = async (name) =>
    has.has(name)
      ? new Set((await db.collection(name).find({}, { projection: { _id: 1 } }).toArray()).map((d) => String(d._id)))
      : new Set();

  const sets = {
    users: await idSet('users'),
    products: await idSet('products'),
    categories: await idSet('categories'),
  };

  const bad = {};
  const miss = (label, v, set) => {
    if (v != null && !set.has(String(v))) bump(bad, label);
  };

  if (has.has('reviews')) {
    for await (const r of db.collection('reviews').find()) {
      miss('reviews.productId', r.productId, sets.products);
      miss('reviews.userId', r.userId, sets.users);
    }
  }
  if (has.has('orders')) {
    for await (const o of db.collection('orders').find()) {
      miss('orders.userId', o.userId, sets.users);
      for (const i of o.items || []) miss('orders.items.productId', i.productId, sets.products);
    }
  }
  if (has.has('users')) {
    for await (const u of db.collection('users').find()) {
      for (const p of u.wishlist || []) miss('users.wishlist', p, sets.products);
    }
  }
  if (has.has('products')) {
    for await (const p of db.collection('products').find()) {
      for (const c of [].concat(p.categoryIds || [])) miss('products.categoryIds', c, sets.categories);
    }
  }
  if (has.has('categories')) {
    for await (const c of db.collection('categories').find()) {
      for (const p of [].concat(c.parentIds || [])) miss('categories.parentIds', p, sets.categories);
    }
  }

  // koi string id bachi?
  const leftovers = [];
  for (const name of COLLECTIONS.filter((n) => has.has(n))) {
    const n = await db.collection(name).countDocuments({ _id: { $type: 'string' } });
    if (n) leftovers.push(`${name}._id: ${n}`);
  }
  const strRefs = [
    ['reviews', { $or: [{ productId: { $type: 'string' } }, { userId: { $type: 'string' } }] }],
    ['orders', { $or: [{ userId: { $type: 'string' } }, { 'items.productId': { $type: 'string' } }, { addressId: { $type: 'string' } }] }],
    ['users', { wishlist: { $type: 'string' } }],
  ];
  for (const [name, filter] of strRefs) {
    if (!has.has(name)) continue;
    const n = await db.collection(name).countDocuments(filter);
    if (n) leftovers.push(`${name} (string refs): ${n}`);
  }

  console.log('Broken refs   :', Object.keys(bad).length ? bad : 'none');
  console.log('String ids    :', leftovers.length ? leftovers : 'none');
}

/* ---------- main ---------- */

async function main() {
  if (!URI) throw new Error('MONGODB_URI env variable missing');

  await mongoose.connect(URI);
  const db = mongoose.connection.db;
  const has = new Set((await db.listCollections().toArray()).map((c) => c.name));
  const targets = COLLECTIONS.filter((n) => has.has(n));

  console.log(`Mode: ${MODE.toUpperCase()}\nCollections: ${targets.join(', ')}\n`);

  /* restore */
  if (MODE === 'restore') {
    for (const name of targets) {
      if (!has.has(name + BAK)) {
        console.log(`- ${name}: backup nahi mila, skip`);
        continue;
      }
      await db.collection(name).deleteMany({});
      await copy(db.collection(name + BAK), db.collection(name));
      console.log(`- ${name}: restored`);
    }
    return;
  }

  if (MODE === 'run') {
    const existing = targets.filter((n) => has.has(n + BAK));
    if (existing.length) {
      throw new Error(
        `Backup pehle se hai (${existing.join(', ')}). Ya to --restore karo, ya in __bak_uuid collections ko manually drop karo.`
      );
    }
  }

  maps = await buildMaps(db, has);
  console.log(
    `Id maps -> users:${maps.users.size} products:${maps.products.size} categories:${maps.categories.size} ` +
    `addresses:${maps.addresses.size} addons:${maps.addons.size}\n`
  );

  try {
    for (const name of targets) {
      const col = db.collection(name);
      const total = await col.countDocuments();
      const stringIds = await col.countDocuments({ _id: { $type: 'string' } });

      let source = col;
      if (MODE === 'run') {
        const bak = db.collection(name + BAK);
        await copy(col, bak);
        if ((await bak.countDocuments()) !== total) throw new Error(`${name}: backup count mismatch`);
        await col.deleteMany({});
        source = bak;
      }

      let done = 0;
      let batch = [];
      const flush = async () => {
        if (MODE === 'run' && batch.length) await col.insertMany(batch, { ordered: true });
        done += batch.length;
        batch = [];
      };

      for await (const doc of source.find()) {
        batch.push(T[name](doc));
        if (batch.length >= BATCH) await flush();
      }
      await flush();

      if (MODE === 'run' && (await col.countDocuments()) !== total) {
        throw new Error(`${name}: count mismatch after migration`);
      }

      console.log(`${name.padEnd(14)} total:${total}  string _id:${stringIds}  processed:${done}`);
    }
  } catch (err) {
    console.error('\nFAILED:', err.message);
    if (MODE === 'run') console.error('Data safe hai. Restore ke liye: node ... --restore');
    process.exitCode = 1;
    return;
  }

  console.log('\nOrphan scalar refs (placeholder id diya):', Object.keys(orphans).length ? orphans : 'none');
  console.log('Dropped array refs (target nahi tha)    :', Object.keys(dropped).length ? dropped : 'none');

  if (MODE === 'run') await verify(db, has);
  else console.log('\nDRY RUN: kuch write nahi hua. Sahi lage to --run se chalao.');
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());