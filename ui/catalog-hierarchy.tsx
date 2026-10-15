import React from 'react';
import { Badge } from './components/ui/badge';

export interface Hierarchy {
  sku_id: string;
  model: string;
  family: string | null;
  family_basis: string | null;
  usages: {
    id: string;
    usage_class: 'commercial' | 'light_commercial';
    evidence: {ad_id: string; field: string; value: string; source_section: string}[];
    variants: {id: string; name: string; evidence_ad_id: string; source_section: string; source_value: string}[];
  }[];
}
export interface Measurements {
  dimensions_mm: number[] | null;
  packing_mm: number[] | null;
  method: string;
}
export function CatalogHierarchy({hierarchy, manufacturer, compact = false}: {hierarchy?: Hierarchy | null; manufacturer?: string; compact?: boolean}) {
  return <div className="flex flex-col gap-2" aria-label="Hierarquia do catálogo">
    <p>{manufacturer ? manufacturer + ' > ' : ''}{hierarchy?.family ?? 'Família não identificada'} {' > '} {hierarchy?.model ?? 'SKU não identificado'}</p>
    {!compact && hierarchy?.family_basis === 'model_prefix' && <p>Família agrupada pelo prefixo do código do modelo.</p>}
    {!hierarchy?.usages.length && <p>Categoria de uso não comprovada na fonte.</p>}
    {hierarchy?.usages.map(usage => <div key={usage.id} className="flex flex-col gap-2">
      <Badge variant="secondary">{usage.usage_class === 'commercial' ? 'Commercial · Comercial' : 'Light Commercial · Comercial leve'}</Badge>
      {usage.variants.map(variant => <p key={variant.id}>Variante: {variant.name} · {variant.source_section}</p>)}
      {!compact && <>
        {!usage.variants.length && <p>Nenhuma variante comprovada.</p>}
        <details><summary>Declarações do fornecedor ({usage.evidence.length})</summary>
          {usage.evidence.map((evidence,index) => <p key={index}>{evidence.value} · {evidence.source_section} · <a href={'/ficha.html?id='+encodeURIComponent(evidence.ad_id)}>Consultar ficha da fonte</a></p>)}
        </details>
      </>}
    </div>)}
  </div>;
}

export function measurementRows<T extends {field:string; value:string; source_section:string}>(rows:T[], measurements?:Measurements) {
  if (!measurements || measurements.method === 'requires_review') return rows;
  const result: {field:string; value:string; source_section:string}[] = rows.filter(row=>!['dimensions','packing_dimensions'].includes(row.field));
  for (const [field,mm] of [['dimensions',measurements.dimensions_mm],['packing_dimensions',measurements.packing_mm]] as const) {
    if (mm) result.push({field,value:mm.join(' × ')+' mm',source_section:measurements.method});
  }
  return result;
}
