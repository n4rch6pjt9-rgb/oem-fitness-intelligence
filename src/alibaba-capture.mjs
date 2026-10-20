import {createHash} from 'node:crypto';
import {load} from 'cheerio';
import {classifyUsage} from './classify-usage.mjs';

const clean = value => String(value ?? '').replace(/\s+/g,' ').trim();
const hash = text => createHash('sha256').update(text).digest('hex');

// Parse a JSON literal, never execute the captured page's JavaScript.
export function assignedJson(text, name) {
  const startOfAssignment = text.search(new RegExp('(?:window\\.)?'+name+'\\s*='));
  if(startOfAssignment < 0) throw new Error('Captured detailData is missing.');
  const start = text.indexOf('{',startOfAssignment);
  let depth=0, quoted=false, escaped=false;
  for(let i=start;i<text.length;i++) {
    const c=text[i];
    if(quoted) {if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;}
    else if(c==='"')quoted=true;
    else if(c==='{')depth++;
    else if(c==='}' && --depth===0)return JSON.parse(text.slice(start,i+1));
  }
  throw new Error('Incomplete captured detailData.');
}

export function pairedWeights(raw, rule) {
  const match=raw.match(/G\.W\.\s*\/\s*N\.W\.\s*:\s*(\d+(?:\.\d+)?)\s*kgs?\s*\/\s*(\d+(?:\.\d+)?)\s*kgs?/i);
  if(!match || rule!=='larger_is_gross')return null;
  const values=match.slice(1).map(Number);
  if(values.some(n=>n<=0))return null;
  return {net_kg:Math.min(...values),gross_kg:Math.max(...values),method:'operator_rule_larger_is_gross',original:match[0]};
}

export function extractAlibabaCapture({html,sourceUrl,shopHtml,descriptionHtml='',weightRule,capturedAt}) {
  const url=new URL(sourceUrl);
  const id=url.pathname.match(/^\/product-detail\/[^/]+_(\d+)\.html$/)?.[1];
  if(url.protocol!=='https:' || url.hostname!=='www.alibaba.com' || !id || url.username || url.password || url.port)throw new Error('Invalid Alibaba product URL.');
  url.search='';url.hash='';
  const $=load(html);
  const state=assignedJson($('script').map((_,e)=>$(e).text()).get().join('\n'),'detailData');
  const product=state.globalData?.product, seller=state.globalData?.seller;
  if(String(product?.productId)!==id)throw new Error('Product URL and captured product ID disagree.');
  const shop=new URL(seller?.companyProfileUrl);
  if(shop.protocol!=='https:' || !/^[a-z0-9-]+\.en\.alibaba\.com$/i.test(shop.hostname) || shop.username || shop.password || shop.port)throw new Error('Unverified supplier storefront.');
  const shop$=load(shopHtml);
  if(!shop$('title').text().includes(seller.companyName))throw new Error('Shop and product supplier disagree.');
  const basic=[...(product.productBasicProperties??[]),...(product.productOtherProperties??[])];
  const models=[...new Set(basic.filter(p=>p.attrName==='Model Number').map(p=>clean(p.attrValue).toUpperCase().replace(/\s/g,'')))];
  if(models.length!==1 || !models[0])throw new Error('Missing or conflicting manufacturer model.');
  const model=models[0], specs=[],terms=[];
  const add=(field,value,section,label=field,target=specs)=>{value=clean(value);if(value&&!target.some(r=>r.field===field&&r.value===value&&r.source_section===section))target.push({field,value,source_section:section,source_label:label});};
  const aliases={'Place of Origin':'origin','Brand':'brand','Model Number':'model','Type':'type','Motor':'motor','Console':'console','Peak Value':'peak_power','Folding':'folding','Speed Range':'speed_range','Incline Range':'incline_range'};
  for(const record of basic)add(aliases[record.attrName]??record.attrName.toLowerCase().replace(/\W+/g,'_'),record.attrValue,'Alibaba / product attributes',record.attrName);
  const options=(product.sku?.skuAttrs??[]).map(a=>({name:a.name,values:(a.values??[]).map(v=>({id:v.id,name:clean(v.name)}))}));
  const sizes=options.filter(a=>a.name==='Size').flatMap(a=>a.values).map(v=>v.name);
  const mounted=sizes.length===1?sizes[0].match(/^(\d+)x(\d+)x(\d+)mm\s*\(unfolded\)$/i):null;
  const dimensions=mounted?mounted.slice(1).map(Number):null;
  if(dimensions)add('dimensions',dimensions.join(' × ')+' mm','Alibaba / selected size','Size (unfolded)');
  const logistics=state.globalData.trade?.logisticInfo??{};
  const packaging=clean(load(logistics.packagingDesc??'').text());
  const boxes=[...packaging.matchAll(/box\s*(\d+)\s*:\s*(\d+)x(\d+)x(\d+)mm/gi)].map(m=>({label:'box'+m[1],dimensions_mm:m.slice(2).map(Number)}));
  for(const box of boxes)add('packing_box_'+box.label.slice(3),box.dimensions_mm.join(' × ')+' mm','Alibaba / packaging details',box.label);
  const weights=pairedWeights(packaging,weightRule);
  if(weights){add('net_weight',weights.net_kg+' kg','Alibaba / packaging details / operator weight rule');add('gross_weight',weights.gross_kg+' kg','Alibaba / packaging details / operator weight rule');}
  const prices=product.price?.productRangePrices;
  const low=Number(prices?.dollarPriceRangeLow),high=Number(prices?.dollarPriceRangeHigh);
  if(!Number.isFinite(low)||!Number.isFinite(high)||low<0||high<low)throw new Error('Unsupported or missing USD price range.');
  add('price',`US$ ${low}–${high}`,'Alibaba / product price','Price',terms);
  const moq=product.moq;
  if(!Number.isInteger(moq)||moq<=0)throw new Error('Unsupported minimum order.');
  const unit=state.globalData.trade?.tradeInfo?.quantityUnitStr;
  if(!['sets','set'].includes(unit))throw new Error('Unsupported minimum-order unit.');
  add('moq',moq+' sets','Alibaba / minimum order','Minimum order quantity',terms);
  const jsonld=[];
  $('script[type="application/ld+json"]').each((_,e)=>{try{jsonld.push(JSON.parse($(e).text()));}catch{}});
  const images=[];
  for(const media of product.mediaItems??[]){if(media.group!=='photos'||media.type!=='image')continue;try{const image=new URL(media.imageUrl?.big);if(image.protocol==='https:'&&/(^|\.)alicdn\.com$/.test(image.hostname)&&!images.some(r=>r.url===image.href))images.push({url:image.href,alt:null,source_section:'Alibaba / main product gallery'});}catch{}}
  const title=clean(product.subject);
  if(!title)throw new Error('Missing product title.');
  const extraction={source_url:url.href,product:{title,name:null,model,brand:basic.find(p=>p.attrName==='Brand')?.attrValue??null},supplier:{name:clean(seller.companyName),company_type:clean(seller.companyBusinessType),origin:specs.find(r=>r.field==='origin')?.value??null},specifications:specs,commercial_terms:terms,images,conflicts:[],contextual_variants:[],usage_classification:classifyUsage(title,specs),limitations:['Supplier declarations; not independently verified.','No proven family; Alibaba option IDs are not manufacturer model IDs.','Two packaging boxes are preserved separately; packing_mm is not a combined dimension.']};
  const attributes={extraction,source_provider:'alibaba',external_product_id:id,supplier_source:{domain:shop.hostname,company_id:String(seller.companyId)},product_options:options,packaging:{original:packaging,boxes},weight_resolution:weights,source_capture:{html_sha256:hash(html),shop_html_sha256:hash(shopHtml),description_html_sha256:hash(descriptionHtml),description_included:!!descriptionHtml}};
  return {factory:{domain:shop.hostname,name:extraction.supplier.name,source_url:shop.origin+'/index.html',crawl_enabled:false},ad:{source_url:url.href,title,model,currency:'USD',price_min:low,price_max:high,moq:moq+' sets',dimensions_mm:dimensions,packing_mm:null,images:images.map(r=>r.url),attributes,raw_jsonld:jsonld,content_hash:hash([html,shopHtml,descriptionHtml,weightRule??''].join('\n')),collected_at:capturedAt??new Date().toISOString()}};
}
