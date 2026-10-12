import { load } from 'cheerio';
import { classifyUsage } from './classify-usage.mjs';
const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const aliases = new Map(Object.entries({
  'model no.':'model','model no':'model','item number':'model',name:'name','product name':'name',trademark:'brand',
  specification:'dimensions',size:'dimensions','product size':'dimensions','steel tube size':'tube_size',
  'weight stack':'weight_stack',moq:'moq','min. order':'moq',delivery:'delivery_time','delivery time':'delivery_time',
  'package size':'packing_dimensions',packing:'packing_type','net weight':'net_weight','gross weight':'gross_weight',
  'steel thickness':'tube_thickness','max user weight':'max_user_weight','max user':'max_user_weight',payment:'payment_terms',
  'range of application':'application',certification:'declared_certifications','production capacity':'production_capacity','hs code':'hs_code','payment term':'payment_terms','use class':'use_class','usage class':'use_class','intended use':'intended_use'
}));
export function extractProduct(html, sourceUrl) {
  const $ = load(html);
  const blocks=[];
  $('script[type="application/ld+json"]').each((_,e)=>{try{blocks.push(JSON.parse($(e).text()));}catch{}});
  const flatten = x => Array.isArray(x)?x.flatMap(flatten):x&&typeof x==='object'?[x,...flatten(x['@graph'])]:[];
  const ld=blocks.flatMap(flatten).find(x=>[].concat(x['@type']??[]).includes('Product'))??{};
  $('script,style,noscript').remove();
  const result={source_url:sourceUrl,product:{title:clean($('h1').first().text())||clean(ld.name)||null,name:null,brand:null,model:null},specifications:[],commercial_terms:[],supplier:{name:null,company_type:null,origin:null},images:[],conflicts:[],limitations:[]};
  const records=[];
  const commercial = /moq|price|currency|payment|delivery|warranty|after.?sale|after.?service|order|lead.?time/i;
  function put(label,value,section) {
    label=clean(label).replace(/:$/,'');value=clean(value);if(!label||!value)return;
    const field=aliases.get(label.toLowerCase())??label.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/_$/,'');
    const record={field,value,source_section:section};
    if(records.some(x=>x.field===field&&x.value===value&&x.source_section===section))return;
    records.push(record);result[commercial.test(field)?'commercial_terms':'specifications'].push(record);
  }
  $('.bsc-item').each((_,e)=>put($(e).find('.bac-item-label').text(),$(e).find('.bac-item-value').text(),'Basic Info.'));
  const header=clean($('.sr-proMainInfo-baseInfo-propertyPrice').text());
  if(header){const price=header.match(/(?:US\$|\$)[\d,.]+(?:\s*[-–]\s*(?:US\$|\$)?[\d,.]+)?/);if(price)put('price',price[0],'Overview');const moq=header.match(/\d+\s*(?:Pieces?|Sets?)\s*\(MOQ\)/i);if(moq)put('MOQ',moq[0],'Overview');}
  $('.detail-desc tr').each((_,e)=>{const cells=$(e).children('td,th');if(cells.length===2)put(cells.eq(0).text(),cells.eq(1).text(),'Product Description / table');});
  const description=$('.detail-desc').clone();description.find('br').replaceWith('\n');description.find('p,div,tr').append('\n');
  const desc=description.text();
  const tube=desc.match(/Steel\s+tube\s+size\s*[:：]?\s*(\d+\s*[x×*]\s*\d+\s*[x×*]\s*\d+\s*mm)/i);
  if(tube)put('Steel Tube Size',tube[1],'Product Description / Features');
  const faqs=[...desc.matchAll(/Q\s*(\d+)\s*[:.：]([\s\S]*?)(?=Q\s*\d+\s*[:.：]|$)/gi)];
  for(const faq of faqs){const text=clean(faq[2]);const split=text.match(/^(.*?)A\s*\d*\s*[:.：]\s*([\s\S]*)$/i);if(!split)continue;const q=clean(split[1]),answer=split[2];let field=`faq_q${faq[1]}`;if(/delivery/i.test(q))field='delivery_time';else if(/minimum|moq/i.test(q))field='moq';else if(/payment/i.test(q))field='payment_terms';else if(/after.?sale|after.?service/i.test(q))field='after_sales';put(field,answer,`Product Description / FAQ Q${faq[1]}: ${q}`);}
  const highlighted=$('[class*="highlight"]').filter((_,e)=>/Product Highlights/i.test($(e).text())).first();
  if(highlighted.length)put('characteristics',highlighted.text(),'Product Highlights');
  for(const field of ['name','brand','model']){const values=[...new Set(records.filter(x=>x.field===field).map(x=>x.value))];result.product[field]=values.length===1?values[0]:null;}
  // Supplier identity is read from the shop identity, never from recommendation cards.
  result.supplier.name=clean($('a[href]').filter((_,e)=>{try{return new URL($(e).attr('href'),sourceUrl).origin===new URL(sourceUrl).origin&&/CO\.|LTD|COMPANY/i.test($(e).text());}catch{return false;}}).first().text())||null;
  const body=clean($('body').text());
  result.supplier.company_type=body.match(/Manufacturer\/Factory\s*&\s*Trading Company/)?.[0]??null;
  result.supplier.origin=records.find(x=>x.field==='origin')?.value??null;
  const images=[].concat(ld.image??[]).map(x=>typeof x==='string'?x:x?.url);
  $('.J-picImg-zoom-in').each((_,e)=>{for(const attr of ['data-original','data-src','src'])if($(e).attr(attr))images.push($(e).attr(attr));});
  const seen=new Set();
  for(const value of images){if(!value)continue;let url;try{url=new URL(value,sourceUrl);}catch{continue;}if(url.protocol!=='https:'||/mp4|video|logo|banner/i.test(url.pathname))continue;
    const identity=url.pathname.match(/\d+f\d+j00([a-zA-Z0-9]+)/)?.[1]??url.href;
    if(seen.has(identity))continue;seen.add(identity);result.images.push({url:url.href,alt:null,source_section:'Product gallery / Product JSON-LD'});if(result.images.length===2)break;
  }
  if(result.images.length<2)result.limitations.push('Menos de duas fotos distintas identificadas na galeria.');
  for(const field of new Set(records.map(x=>x.field))){const values=records.filter(x=>x.field===field).map(({value,source_section})=>({value,source_section}));if(new Set(values.map(x=>x.value)).size>1)result.conflicts.push({field,values});}
  if(!highlighted.length)result.limitations.push('Product Highlights não identificado nesta captura.');
  result.limitations.push('Certificações e demais alegações são declarações do fornecedor, sem verificação independente.');
  result.usage_classification=classifyUsage(result.product.title,result.specifications);
  // Conflicting technical claims remain conflicts with their source blocks.
  // A conflict is evidence of disagreement, not proof of a formal variant.
  result.contextual_variants=[];
  return result;
}
