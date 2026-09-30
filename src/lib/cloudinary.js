import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});


const REVIEW_FOLDER = process.env.CLOUDINARY_REVIEW_FOLDER 


export function parseCloudinaryUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname !== 'res.cloudinary.com') return null;

    const [cloud, resourceType, type, ...rest] = u.pathname.split('/').filter(Boolean);
    if (cloud !== process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) return null;
    if (type !== 'upload' || !['image', 'video'].includes(resourceType)) return null;

    const vIdx = rest.findIndex((s) => /^v\d+$/.test(s));
    const idParts = vIdx >= 0 ? rest.slice(vIdx + 1) : rest;
    if (idParts.length === 0) return null;

    idParts[idParts.length - 1] = idParts[idParts.length - 1].replace(/\.[^.]+$/, '');
    return { publicId: decodeURIComponent(idParts.join('/')), resourceType };
  } catch {
    return null;
  }
}


export function sanitizeMediaUrls(urls, max = 4) {
  if (!Array.isArray(urls)) return [];
  const clean = urls.filter((u) => {
    const parsed = typeof u === 'string' ? parseCloudinaryUrl(u) : null;
    return parsed && parsed.publicId.startsWith(REVIEW_FOLDER);
  });
  return [...new Set(clean)].slice(0, max);
}

/** Best-effort delete. Never throws. */
export async function deleteCloudinaryMedia(urls = []) {
  const targets = urls
    .map(parseCloudinaryUrl)
    .filter((t) => t && t.publicId.startsWith(REVIEW_FOLDER));
  if (targets.length === 0) return;

  const results = await Promise.allSettled(
    targets.map((t) =>
      cloudinary.uploader.destroy(t.publicId, {
        resource_type: t.resourceType,
        invalidate: true,
      })
    )
  );

  results.forEach((r, i) => {
    if (r.status === 'rejected') { console.error('Cloudinary delete failed:', targets[i].publicId, r.reason); }
  });
}