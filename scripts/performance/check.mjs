import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import process from 'node:process';
import { chromium } from '@playwright/test';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { fixtureServer } from './fixture-server.mjs';
const dist=path.resolve(process.env.PERF_DIST || 'dist');
assert.ok(!process.env.VITE_API_URL || process.env.VITE_API_URL==='/api','Build the fixture benchmark with VITE_API_URL=/api');
const reportPath=process.env.PERF_REPORT || 'test-results/performance.json';
const chromePath=process.env.PLAYWRIGHT_CHROME_PATH || chromium.executablePath();
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
const report={fixture:{profiles:17,programs:14,tasks:100,apiDelayMs:400,cpuSlowdown:4,latencyMs:150,downloadMbps:1.6,runs:3},navigation:[],lighthouse:[]};
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
const initialFiles=[...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"?]+\.js)"/g)].map(m=>m[1]))];
const initialCode=initialFiles.map(file=>fs.readFileSync(path.join(dist,file),'utf8')).join('\n');
assert.ok(!/https?:\/\/[^"'\s]+\/api\/?["']/.test(initialCode),'Production API URL detected; rebuild with VITE_API_URL=/api before fixture tests');
report.initialJsGzipBytes=initialFiles.reduce((bytes,file)=>bytes+gzipSync(fs.readFileSync(path.join(dist,file))).length,0);
const browser=await chromium.launch({executablePath:chromePath,headless:true,args:['--no-sandbox']});
const app=await fixtureServer({dist});
try{
 for(const route of ['/','/programs','/tasks'])for(let run=1;run<=3;run++){
  const context=await browser.newContext({viewport:{width:375,height:812},isMobile:true});
  try{
   const page=await context.newPage(),cdp=await context.newCDPSession(page);const api=[];
   await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Network.enable');
   await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8});
   page.on('request',r=>{if(r.url().includes('/api/'))api.push(new URL(r.url()).pathname);});
   const begin=Date.now();await page.goto(app.url+route);
   if(route==='/tasks')await page.waitForFunction(()=>document.querySelectorAll('.work-task').length===60);
   else if(route==='/programs')await page.waitForFunction(()=>document.querySelectorAll('.program-table tbody tr').length===10);
   else await page.getByRole('figure',{name:'Grafik persentase progres kegiatan'}).waitFor();
   const readyMs=Date.now()-begin;await page.waitForTimeout(100);const coldApiRequests=api.length;
   let warmReturnMs;
   if(route==='/tasks'){
    await page.locator('nav a[href="/programs"]').evaluate(e=>e.click());await page.waitForFunction(()=>document.querySelectorAll('.program-table tbody tr').length===10);
    const start=Date.now();await page.locator('nav a[href="/tasks"]').evaluate(e=>e.click());await page.waitForFunction(()=>document.querySelectorAll('.work-task').length===60);warmReturnMs=Date.now()-start;
   }
   report.navigation.push({route,run,readyMs,coldApiRequests,...(warmReturnMs==null?{}:{warmReturnMs})});
  }finally{await context.close();}
 }
}finally{await browser.close();await app.close();}
for(const route of ['/login','/','/tasks']){
 const app=await fixtureServer({dist,anonymous:route==='/login'});
 try{for(let run=1;run<=3;run++){
  const chrome=await launch({chromePath,chromeFlags:['--no-sandbox','--headless','--disable-dev-shm-usage']});
  try{
   const {lhr}=await lighthouse(app.url+route,{port:chrome.port,output:'json',onlyCategories:['performance','accessibility','best-practices','seo'],logLevel:'error'});
   report.lighthouse.push({route,run,score:Math.round(lhr.categories.performance.score*100),accessibility:Math.round(lhr.categories.accessibility.score*100),bestPractices:Math.round(lhr.categories['best-practices'].score*100),seo:Math.round(lhr.categories.seo.score*100),headingOrder:lhr.audits['heading-order'].score,robots:lhr.audits['robots-txt'].score,lcpMs:lhr.audits['largest-contentful-paint'].numericValue,tbtMs:lhr.audits['total-blocking-time'].numericValue,cls:lhr.audits['cumulative-layout-shift'].numericValue});
  }finally{await chrome.kill();}
 }}finally{await app.close();}
}
fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
// The environment is controlled and fixture-only: these do not assert live Auth/API latency.
if(process.env.PERF_RECORD_ONLY!=='1'){
 assert.ok(report.initialJsGzipBytes<=86*1024,'Initial JS exceeds 86 KiB gzip');
 for(const route of ['/','/programs','/tasks']){
  const rows=report.navigation.filter(r=>r.route===route);
  assert.ok(median(rows.map(r=>r.readyMs))<=2500,`${route} median data-ready exceeds 2.5s`);
  assert.ok(rows.every(r=>r.coldApiRequests<=(route==='/'?2:3)),`${route} request count exceeded`);
 }
 assert.ok(median(report.navigation.filter(r=>r.route==='/tasks').map(r=>r.warmReturnMs))<=250,'Warm board return exceeds 250ms');
 for(const route of ['/login','/','/tasks']){
  const rows=report.lighthouse.filter(r=>r.route===route);
  assert.ok(rows.every(r=>r.headingOrder===1),`${route} heading order fails accessibility audit`);
  assert.ok(rows.every(r=>r.robots===1),`${route} robots.txt is invalid`);
  assert.ok(median(rows.map(r=>r.accessibility))===100,`${route} accessibility below 100`);
  assert.ok(median(rows.map(r=>r.bestPractices))>=95,`${route} Best Practices below 95`);
  assert.ok(median(rows.map(r=>r.seo))===100,`${route} SEO below 100`);
  assert.ok(median(rows.map(r=>r.score))>=90,`${route} Lighthouse below 90`);
  assert.ok(median(rows.map(r=>r.lcpMs))<=2500,`${route} LCP exceeds 2.5s`);
  assert.ok(median(rows.map(r=>r.tbtMs))<=200,`${route} TBT exceeds 200ms`);
  assert.ok(median(rows.map(r=>r.cls))<=0.1,`${route} CLS exceeds 0.1`);
 }
 console.log('PASS performance budgets');
}
