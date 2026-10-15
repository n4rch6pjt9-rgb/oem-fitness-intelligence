import { classifyUsage } from './classify-usage.mjs';

// Whitespace/case are presentation differences. Punctuation and leading zeroes
// remain significant; a missing model must never become a synthetic SKU.
export function modelKey(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, '').toUpperCase() || null : null;
}

export function familyCode(model) {
  return modelKey(model)?.match(/^([A-Z]+)[0-9][A-Z0-9-]*$/)?.[1] ?? null;
}

export function usageDeclarations(ad) {
  const extraction = ad.attributes?.extraction;
  return classifyUsage(extraction?.product?.title ?? ad.title, extraction?.specifications ?? []);
}

export async function catalogHierarchy(db, ad) {
  if (!ad.sku_id) return null;
  const result = await db.rpc('oem_sku_hierarchy', {target: ad.sku_id});
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
