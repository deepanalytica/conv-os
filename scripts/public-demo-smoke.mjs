// Public-only demo smoke test: browser must never request a private API.
// Runs against the EXACT _site directory that GitHub Pages will publish.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('_site');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png',
 '.ico':'image/x-icon','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 const pathname=new URL(req.url||'/', 'http://localhost').pathname;
 const location=resolve(root,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));
 if(!(location===root||location.startsWith(root+sep))){res.writeHead(403);res.end();return}
 try{const file=await readFile(location);res.writeHead(200,{'Content-Type':mime[extname(location)]||'application/octet-stream',
 'Cache-Control':'no-store'});res.end(file)}
 catch{res.writeHead(404);res.end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',req=>{if(req.url().includes('/api/'))requests.push(req.url())});
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await page.locator('.prism-kpi').first().waitFor({timeout:18000});
 assert.equal(await page.locator('.prism-kpi').count(),4);
 assert.equal(await page.locator('html').getAttribute('data-public-demo'),'true');
 assert.match(await page.locator('.brand-context').innerText(),/demostración pública/i);
 assert.ok(await page.locator('.prism-kpi').first().innerText().then(s=>/9/.test(s)),
  'First demo has 9 WAL contacts');
 await page.locator('[data-theme-toggle]').click();
 assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 await page.locator('button[data-view="crm"]').click();
 await page.locator('#crm-workspace .crm-card').first().waitFor();
 assert.ok((await page.locator('#crm-workspace .crm-card').count())>=9);
 await page.locator('[data-crm-tab="quotes"]').click();
 await page.locator('#commercial-workspace .crm-title').first().waitFor();
 assert.ok((await page.locator('.crm-followup-row').count())>=2);
 await page.locator('button[data-view="orchestration"]').click();
 await page.locator('#prism-run-rules').click();
 await page.locator('.prism-reco').first().waitFor();
 await page.locator('#tenant-select').selectOption('demo-vaa');
 await page.locator('.prism-banner').first().waitFor();
 await page.locator('button[data-view="connections"]').click();
 await page.locator('.connect-card').first().waitFor();
 assert.equal(await page.locator('.connect-card').count(),3);
 assert.match(await page.locator('.connect-card').first().innerText(),/Sin conectar/);
 await page.locator('#demo-reset').click();
 await page.locator('.prism-kpi').first().waitFor();
 assert.equal(await page.locator('#tenant-select').inputValue(),'demo-wal');
 await page.setViewportSize({width:390,height:844});
 await page.locator('.prism-kpi').first().waitFor();
 const dim=await page.evaluate(()=>({document:document.documentElement.scrollWidth,screen:window.innerWidth}));
 assert.ok(dim.document<=dim.screen+3,'Mobile horizontal overflow '+JSON.stringify(dim));
 assert.deepEqual(requests,[],'Public demo attempted to call private API');
 assert.deepEqual(errors,[],'Browser JavaScript errors');
 console.log('PUBLIC DEMO SMOKE PASSED: fixtures, analytics, CRM, quotes, governance, themes, channels, reset, mobile, zero private API requests.');
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
