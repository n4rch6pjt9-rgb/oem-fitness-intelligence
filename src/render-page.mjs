import { chromium } from 'playwright';
import { canonicalUrl } from './parser.mjs';

// This isolated browser does not reuse operator cookies or Supabase sessions.
export async function renderPage(url, _options, browserType=chromium) {
  url=canonicalUrl(url);
  const browser=await browserType.launch({headless:true});
  try {
    const context=await browser.newContext({locale:'en-US'});
    const page=await context.newPage();
    page.setDefaultTimeout(15000);
    await page.route('**/*',route=>{
      const request=route.request();
      if(request.isNavigationRequest()&&new URL(request.url()).origin!==new URL(url).origin)return route.abort();
      return route.continue();
    });
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
    if(!response)throw new Error('Fonte não retornou uma resposta HTTP.');
    // Preserve refusal statuses for the queue; do not parse an error page.
    if(!response.ok())return new Response(null,{status:response.status()});
    const blocked=/captcha|access denied|verify you are human|unusual traffic/i.test(await page.title());
    if(blocked)throw new Error('Coleta bloqueada por desafio ou controle de acesso.');
    if(new URL(url).pathname.startsWith('/product/')) {
      await page.locator('h1').waitFor();
      // Only expand the product attribute block; supplier profile is unrelated.
      const more=page.locator('.bsc-info').getByText('View More',{exact:true});
      for(const button of await more.all())if(await button.isVisible())await button.click();
      const description=page.locator('.detail-desc');
      if(await description.count())await description.scrollIntoViewIfNeeded();
      for(const image of await page.locator('.J-picImg-zoom-in').all())await image.scrollIntoViewIfNeeded();
    }
    const html=await page.content();
    if(html.length>8_000_000)throw new Error('HTML excede o limite de 8 MB.');
    return new Response(html,{status:response.status(),headers:{'content-type':'text/html; charset=utf-8'}});
  } finally {await browser.close();}
}
