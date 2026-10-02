import { canonicalUrl, parsePage } from './parser.mjs';
import { renderPage } from './render-page.mjs';

export function unwrap(result) { if(result.error) throw new Error(result.error.message); return result.data; }
export function createCrawler(db, fetchPage=renderPage) {
  let busy=false;
  async function enqueue(factoryId, url, kind='listing', lineIds=[]) {
    url=canonicalUrl(url);
    const existing=unwrap(await db.from('oem_pages').select('id').eq('url',url).maybeSingle());
    const page=existing??unwrap(await db.from('oem_pages').upsert({factory_id:factoryId,url,kind,priority:kind==='product'?10:100},{onConflict:'url',ignoreDuplicates:true}).select('id').single());
    for(const line_id of lineIds) unwrap(await db.from('oem_page_lines').upsert({page_id:page.id,line_id},{onConflict:'page_id,line_id'}));
    const ad=unwrap(await db.from('oem_ads').select('id').eq('source_url',url).maybeSingle());
    if(ad) for(const line_id of lineIds) unwrap(await db.from('oem_ad_lines').upsert({ad_id:ad.id,line_id},{onConflict:'ad_id,line_id'}));
    return page;
  }
  async function step() {
    if(busy) return null; busy=true; let page;
    try {
      page=unwrap(await db.rpc('oem_claim_page'))?.[0];
      if(!page) return null;
      const target=canonicalUrl(page.url);
      const factory=unwrap(await db.from('oem_factories').select('domain').eq('id',page.factory_id).single());
      if(new URL(target).hostname!==factory.domain) throw new Error('URL não pertence à fábrica da fila.');
      const r=await fetchPage(target,{redirect:'manual',signal:AbortSignal.timeout(30000),headers:{'User-Agent':'OEMCatalogPilot/0.1','Accept':'text/html','Accept-Language':'en-US,en;q=0.9'}});
      unwrap(await db.from('oem_pages').update({http_status:r.status}).eq('id',page.id));
      if(!r.ok) throw new Error(`Fonte retornou HTTP ${r.status}.`);
      if(!r.headers.get('content-type')?.includes('text/html')) throw new Error('Fonte não retornou HTML.');
      const html=await r.text();if(html.length>8_000_000)throw new Error('HTML excede o limite de 8 MB.');
      const parsed=parsePage(html,target);
      const lineIds=unwrap(await db.from('oem_page_lines').select('line_id').eq('page_id',page.id)).map(x=>x.line_id);
      if(parsed.kind==='product') {
        const ad=unwrap(await db.from('oem_ads').upsert({...parsed.ad,factory_id:page.factory_id},{onConflict:'source_url'}).select('id').single());
        for(const line_id of lineIds) unwrap(await db.from('oem_ad_lines').upsert({ad_id:ad.id,line_id},{onConflict:'ad_id,line_id'}));
      }else {
        const ownLine=unwrap(await db.from('oem_lines').select('id').eq('source_url',target).maybeSingle());
        if(ownLine&&!lineIds.includes(ownLine.id))lineIds.push(ownLine.id);
        const groups=new Map();
        for(const group of parsed.groups) {
          const line=unwrap(await db.from('oem_lines').upsert({...group,factory_id:page.factory_id},{onConflict:'source_url'}).select('id').single());groups.set(group.source_url,line.id);
        }
        for(const link of parsed.links) {
          const targetGroup=new URL(target).searchParams.get('productGroupOrCatId');
          const isSameGroup=targetGroup?new URL(link.url).searchParams.get('productGroupOrCatId')===targetGroup:/\/product-group\//.test(target)&&new URL(link.url).pathname.replace(/-\d+\.html$/,'')===new URL(target).pathname.replace(/-\d+\.html$/,'');
          const ids=groups.has(link.url)?[groups.get(link.url)]:(link.kind==='product'||isSameGroup?lineIds:[]);
          await enqueue(page.factory_id,link.url,link.kind,ids);
        }
        if(parsed.expectedAds!==null) unwrap(await db.from('oem_factories').update({expected_ads:parsed.expectedAds,checked_at:new Date().toISOString(),...(parsed.factoryName?{name:parsed.factoryName}:{})}).eq('id',page.factory_id));
      }
      unwrap(await db.from('oem_pages').update({state:'done',completed_at:new Date().toISOString(),error:null}).eq('id',page.id));
      return {id:page.id,state:'done'};
    }catch(error) {
      if(!page)throw error;
      unwrap(await db.from('oem_pages').update({state:'error',error:error.message,available_at:new Date(Date.now()+60000*page.attempts).toISOString()}).eq('id',page.id));
      return {id:page.id,state:'error',error:error.message};
    }finally {busy=false;}
  }
  return {enqueue,step};
}
