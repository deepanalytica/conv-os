// CI-only browser smoke and design review. Installs Playwright only in the GitHub
// workflow runner; does NOT ship Playwright in the customer Windows package.
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {passwordHash} from '../src/security.js';
import {chromium} from 'playwright';
process.env.DEMO_MODE='true';
process.env.DB_PATH=':memory:';
const disposablePassword='CI-demo-only-private-passphrase-4937';
process.env.CONVOS_AUTH_HASH=passwordHash(disposablePassword);
const {createServer}=await import('../src/server.js');
const server=createServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const address=server.address();
const url='http://127.0.0.1:'+address.port;
mkdirSync('ui-artifacts',{recursive:true});
let browser;
try{
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,
  locale:'es-CL'});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url+'/',{waitUntil:'domcontentloaded'});
 assert.match(await page.title(),/Acceso privado/);
 await page.locator('#password').fill(disposablePassword);
 await page.locator('#login-form button[type="submit"]').click();
 await page.locator('#insights-workspace .prism-banner').waitFor({timeout:20000});
 assert.equal(await page.locator('#tenant-select').inputValue(),'demo-wal');
 assert.equal(await page.locator('.prism-kpi').count(),4);
 assert.match(await page.locator('.prism-panel').first().innerText(),/Flujo de contactos/);
 await page.screenshot({path:'ui-artifacts/01-prism-dark-wal.png',fullPage:true});
 await page.locator('[data-theme-toggle]').click();
 await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
 await page.screenshot({path:'ui-artifacts/02-prism-light-wal.png',fullPage:true});
 await page.locator('[data-theme-toggle]').click();
 await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
 await page.locator('#tenant-select').selectOption('demo-vaa');
 await page.locator('.brand-context').getByText(/Visual Art AI/).waitFor();
 await page.screenshot({path:'ui-artifacts/03-prism-vaa.png',fullPage:true});
 await page.locator('button[data-view="crm"]').click();
 await page.waitForTimeout(600);
 console.log('CRM diagnostic',{workspace:await page.locator('#crm-workspace').count(),
  view:await page.locator('.layout').getAttribute('data-view'),
  snippet:(await page.locator('#crm-workspace').allTextContents()).join(' ').slice(0,300),
  errors});
 await page.locator('#crm-workspace .crm-title').first().waitFor({timeout:7000});
 await page.locator('[data-crm-tab="quotes"]').click();
 await page.locator('#commercial-workspace .crm-title').waitFor();
 assert.equal(await page.locator('[data-crm-tab="quotes"]').getAttribute('aria-selected'),'true');
 await page.screenshot({path:'ui-artifacts/06-cotizaciones-desktop.png',fullPage:true});
 await page.locator('[data-crm-tab="privacy"]').click();
 await page.locator('#consent-workspace .crm-title').waitFor();
 await page.screenshot({path:'ui-artifacts/07-privacidad-desktop.png',fullPage:true});
 await page.locator('button[data-view="orchestration"]').click();
 await page.locator('#prism-run-rules').waitFor();
 await page.locator('#prism-run-rules').click();
 await page.locator('.prism-reco').first().waitFor();
 await page.screenshot({path:'ui-artifacts/08-orchestration-dark.png',fullPage:true});
 await page.locator('[data-review="acknowledged"]').first().click();
 assert.match(await page.locator('.prism-run-list').innerText(),/decisiones pendientes/i);
 await page.locator('button[data-view="connections"]').click();
 await page.locator('.connect-grid .connect-card').first().waitFor();
 assert.equal(await page.locator('.connect-grid .connect-card').count(),3);
 assert.match(await page.locator('.connect-head').innerText(),/Autorización por empresa/);
 assert.match(await page.locator('.connect-card').first().innerText(),/Sin conectar/);
 await page.screenshot({path:'ui-artifacts/03-integraciones-desktop.png',fullPage:true});
 await page.locator('[data-open-details="whatsapp"]').click();
 assert.match(await page.locator('#integration-detail').innerText(),/coexistencia/i);
 await page.locator('#close-integration-detail').click();
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'ui-artifacts/04-integraciones-movil.png',fullPage:true});
 await page.locator('[data-view="crm"]').click();
 await page.locator('#crm-workspace .crm-title').first().waitFor();
 await page.screenshot({path:'ui-artifacts/05-crm-movil.png',fullPage:true});
 const horiz=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:window.innerWidth}));
 assert.ok(horiz.scroll<=horiz.width+3,'Unintended global horizontal scroll: '+JSON.stringify(horiz));
 assert.equal(errors.length,0,'Unhandled browser exceptions: '+errors.join('; '));
 console.log('UI smoke passed: login, WAL/Visual Art AI, CRM, Meta integrations, mobile at 390 px.');
 console.log('Screenshots captured: 11; synthetic data; themes and owner review tested.');
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
