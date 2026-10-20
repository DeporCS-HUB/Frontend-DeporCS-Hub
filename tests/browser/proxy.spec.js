import { test, expect } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fixtureServer } from '../../scripts/performance/fixture-server.mjs';

test('production API routing preserves first-party HttpOnly refresh across login, reload and logout',async({page,context})=>{
 const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));
 expect(config.rewrites[0]).toEqual({source:'/api/:path*',destination:'https://depor-cs-hub-api.vercel.app/api/:path*'});
 expect(config.buildCommand).toContain('VITE_API_URL=/api');
 expect(config.headers.find(h=>h.source==='/api/:path*').headers).toContainEqual({key:'Vercel-CDN-Cache-Control',value:'no-store'});
 const upstream=await fixtureServer({dist:path.resolve('dist'),delay:0,sessionCookies:true});
 const forwarded=[];
 // Production-build integration; the fixed external destination is substituted only in this test.
 const proxy=http.createServer((req,res)=>{
  const target=new URL(req.url,upstream.url);if(target.pathname.startsWith('/api/'))forwarded.push({path:target.pathname,origin:req.headers.origin,authorization:req.headers.authorization,cookie:req.headers.cookie});
  const request=http.request(target,{method:req.method,headers:{...req.headers,host:target.host}},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});
  request.on('error',()=>{res.writeHead(502);res.end();});req.pipe(request);
 });
 await new Promise(resolve=>proxy.listen(0,'127.0.0.1',resolve));const origin=`http://localhost:${proxy.address().port}`;
 try{
  const requests=[];page.on('request',r=>requests.push(new URL(r.url())));
  await page.goto(origin+'/login');await page.getByLabel('Email',{exact:true}).fill('fixture@example.invalid');await page.getByLabel('Password',{exact:true}).fill('fixture-password-only');await page.getByRole('button',{name:'Login',exact:true}).click();await expect(page.getByText('Selamat datang, Fixture BPH',{exact:true})).toBeVisible();
  const cookies=await context.cookies(origin+'/api/auth/refresh');expect(cookies.some(c=>c.name==='depor_refresh'&&c.httpOnly&&c.path==='/api/auth'&&c.domain==='localhost')).toBe(true);expect(await page.evaluate(()=>document.cookie)).not.toContain('depor_refresh');
  await page.reload();await expect(page.getByText('Selamat datang, Fixture BPH',{exact:true})).toBeVisible();
  expect(requests.filter(u=>u.pathname.startsWith('/api/')).every(u=>u.origin===origin)).toBe(true);
  expect(forwarded.filter(r=>r.path==='/api/auth/login'||r.path==='/api/auth/refresh').every(r=>r.origin===origin)).toBe(true);
  expect(forwarded.some(r=>r.path==='/api/dashboard/overview'&&r.authorization==='Bearer fixture-only-token'&&!r.cookie)).toBe(true);
  await page.getByRole('button',{name:'Logout',exact:true}).click();await expect(page).toHaveURL(/login/);await page.reload();await expect(page.getByRole('button',{name:'Login',exact:true})).toBeEnabled();expect((await context.cookies(origin+'/api/auth/refresh')).some(c=>c.name==='depor_refresh')).toBe(false);
  const robots=await page.request.get(origin+'/robots.txt');expect(robots.headers()['content-type']).toContain('text/plain');expect(await robots.text()).toBe('User-agent: *\nDisallow: /api/\n');
 }finally{await new Promise(resolve=>proxy.close(resolve));await upstream.close();}
});
