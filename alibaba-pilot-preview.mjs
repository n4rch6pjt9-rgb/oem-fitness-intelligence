import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {extractAlibabaCapture} from './src/alibaba-capture.mjs';
import {alibabaPilotSql} from './src/alibaba-pilot-sql.mjs';

// Local capture reader only. No request headers, cookies, buyer objects or tokens
// are copied to the normalized output, and no captured request is replayed.
const [htmlPath,shopHarPath,productHarPath,outPath,sqlPath]=process.argv.slice(2);
if(!outPath)throw new Error('Usage: preview.mjs HTML SHOP_HAR PRODUCT_HAR OUTPUT_JSON');
const [html,shopRaw,productRaw]=await Promise.all([htmlPath,shopHarPath,productHarPath].map(p=>fs.readFile(p,'utf8')));
const shopEntries=JSON.parse(shopRaw).log.entries,productEntries=JSON.parse(productRaw).log.entries;
const read=entry=>{if(!entry?.response?.content?.text || entry.response.status!==200)throw new Error('Successful captured response missing.');return entry.response.content.encoding==='base64'?Buffer.from(entry.response.content.text,'base64').toString('utf8'):entry.response.content.text;};
const productEntry=productEntries.find(e=>{const u=new URL(e.request.url);return u.hostname==='www.alibaba.com'&&/^\/product-detail\/[^/]+_\d+\.html$/.test(u.pathname)&&e.response.content?.mimeType==='text/html';});
const shopEntry=shopEntries.find(e=>{const u=new URL(e.request.url);return /^[a-z0-9-]+\.(?:m\.)?en\.alibaba\.com$/.test(u.hostname)&&u.pathname==='/productlist.html'&&e.response.content?.mimeType==='text/html';});
const desc=productEntries.find(e=>{const u=new URL(e.request.url);return u.hostname==='www.alibaba.com'&&u.pathname==='/event/app/mainAction/desc.htm';});
const description=desc?JSON.parse(read(desc)).data?.productHtmlDescription??'':'';
// The supplied rendered HTML and its original product response must agree.
const base={sourceUrl:productEntry?.request.url,shopHtml:read(shopEntry),descriptionHtml:description,weightRule:'larger_is_gross'};
const original=extractAlibabaCapture({...base,html:read(productEntry)});
const result=extractAlibabaCapture({...base,html});
if(original.ad.model!==result.ad.model||original.factory.domain!==result.factory.domain)throw new Error('HTML and HAR product/supplier identity mismatch.');
const shopSlug=new URL(shopEntry.request.url).hostname.replace('.m.en.alibaba.com','.en.alibaba.com');
if(shopSlug!==result.factory.domain)throw new Error('Captured shop hostname and supplier disagree.');
result.ad.attributes.source_capture.shop_har_sha256=createHash('sha256').update(shopRaw).digest('hex');
result.ad.attributes.source_capture.product_har_sha256=createHash('sha256').update(productRaw).digest('hex');
await fs.writeFile(outPath,JSON.stringify(result,null,2));
if(sqlPath)await fs.writeFile(sqlPath,alibabaPilotSql(result));
console.log(JSON.stringify({factory:result.factory,model:result.ad.model,external_product_id:result.ad.attributes.external_product_id,price:[result.ad.price_min,result.ad.price_max],moq:result.ad.moq,dimensions_mm:result.ad.dimensions_mm,boxes:result.ad.attributes.packaging.boxes,weight_resolution:result.ad.attributes.weight_resolution,photos:result.ad.images.length},null,2));
