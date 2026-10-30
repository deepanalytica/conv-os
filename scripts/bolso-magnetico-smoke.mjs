import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('_site');
const mime={'.html':'text/html; charset=utf-8','.svg':'image/svg+xml','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer(async(req,res)=>{
 const pathname=new URL(req.url||'/','http://localhost').pathname;
 const filePath=resolve(root,'.'+decodeURIComponent(pathname.endsWith('/')?pathname+'index.html':pathname));
 if(!filePath.startsWith(root+sep)){res.writeHead(403);res.end();return;}
 try{res.writeHead(200,{'Content-Type':mime[extname(filePath)]||'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(filePath));}catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true});
 for(const w of [1440,390]){
  const page=await browser.newPage({viewport:{width:w,height:w===390?844:900}});
  const errors=[],backend=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('/api/'))backend.push(r.url());});
  const response=await page.goto(base+'/bolso-magnetico/',{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200);
  await page.locator('.hero-bag').waitFor();
  assert.match(await page.title(),/PISO CERO/);
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex,nofollow');
  assert.ok(await page.locator('.hero-bag').evaluate(el=>el.complete&&el.naturalWidth>0),'Product concept image missing');
  await page.locator('[data-view="detalle"]').click();
  assert.equal(await page.locator('.hero-visual').getAttribute('data-view'),'detalle');
  await page.locator('#qty-plus').click();
  assert.equal((await page.locator('#qty').innerText()).trim(),'2');
  await page.locator('#buy-button').click();
  assert.equal(await page.locator('#order-dialog').getAttribute('aria-hidden'),'false');
  assert.equal((await page.locator('#sum-total').innerText()).replace(/\s/g,''),'$45.980');
  assert.equal(await page.locator('#whatsapp-link').isHidden(),true);
  await page.locator('#shipping-region').selectOption('Maule');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#order-dialog').getAttribute('aria-hidden'),'true');
  const sizes=await page.evaluate(()=>({document:document.documentElement.scrollWidth,screen:window.innerWidth}));
  assert.ok(sizes.document<=sizes.screen+3,'Horizontal overflow: '+JSON.stringify(sizes));
  assert.deepEqual(backend,[]);
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('BOLSO MAGNETICO SMOKE PASSED: image, views, quantity, modal, no fictitious WhatsApp, responsive, zero API requests.');
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}