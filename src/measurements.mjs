// Only compare declarations within one advertisement/configuration. Never pool
// measurements from alternative advertisements or turn a discrepancy into a variant.
export function resolveMeasurements(extraction, parseDimensions) {
  const rows = (extraction.specifications ?? []).filter(x => ['dimensions', 'packing_dimensions'].includes(x.field));
  const parsed = rows.map(row => ({...row, mm: parseDimensions(row.value)}));
  const usage = extraction.usage_classification;
  const configurations = new Set((extraction.specifications ?? []).filter(x => ['variant','configuration','model_version'].includes(x.field)).map(x => x.value));
  const ambiguous = configurations.size > 1 || (extraction.contextual_variants?.length ?? 0) > 0 ||
    (usage?.declared_class_versions?.length ?? 0) > 1 || extraction.conflicts?.some(x => x.field === 'model');
  const unique = [...new Map(parsed.filter(x => x.mm).map(x => [JSON.stringify(x.mm), x.mm])).values()];
  const volume = value => value.reduce((a, b) => a * b, 1);
  if (extraction.product?.model && !ambiguous && parsed.length && parsed.every(x => x.mm) && unique.length === 2 && volume(unique[0]) !== volume(unique[1])) {
    unique.sort((a,b) => volume(a) - volume(b));
    return { dimensions_mm: unique[1], packing_mm: unique[0], method: 'same_configuration_volume', evidence: parsed };
  }
  const single = field => {
    const candidates = parsed.filter(x => x.field === field);
    return !ambiguous && candidates.length && candidates.every(x => x.mm) && new Set(candidates.map(x => JSON.stringify(x.mm))).size === 1 ? candidates[0].mm : null;
  };
  return { dimensions_mm: single('dimensions'), packing_mm: single('packing_dimensions'), method: ambiguous || unique.length > 1 ? 'requires_review' : 'source_label', evidence: parsed };
}
