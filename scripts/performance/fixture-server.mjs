import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
const uid = n => `00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
export const statuses = ['Backlog','To Do','In Progress','Review','Done'];
const profiles = Array.from({length:17},(_,n)=>({id:uid(n+1),name:n?'Fixture Staff '+n:'Fixture BPH',role:n?'member':'staff',departmentRole:n?'staff':'bph',active:true,avatar_path:null}));
const programs = Array.from({length:14},(_,n)=>({id:uid(101+n),name:'Fixture Program '+(n+1),kind:n<5?'Proker':'UKOR',status:'Ongoing',progress:50,pic:profiles[n+1].name,description:'Fixture description. '.repeat(90),progress_notes:'Fixture notes. '.repeat(60),assignee_ids:[profiles[n+1].id]}));
const tasks = Array.from({length:100},(_,n)=>({id:uid(201+n),title:'Fixture task '+(n+1),description:'Task detail. '.repeat(100),status:statuses[n%5],priority:'Medium',program_id:programs[n%14].id,assignee_id:profiles[n%17].id,created_by:uid(1),due_date:null}));
const summary={total:100,done:20,overdue:0,unassigned:0,statuses:Object.fromEntries(statuses.map(s=>[s,20])),workload:[]};
const dashboard={overview:{proker:5,ukor:9,openTasks:80,overdueTasks:0},summary:{totalPrograms:14,completedPrograms:0,recordedPrograms:14,completedTasks:20,pendingTasks:80},programFocus:programs.map(p=>{const item={...p};delete item.description;delete item.assignee_ids;return item;}),staffPerformance:profiles.slice(1).map(p=>({...p,programs:[],assignedTasks:5,completedTasks:1,updatesLast30Days:0})),programStatusCounts:[{kind:'Proker',status:'Ongoing',count:5},{kind:'UKOR',status:'Ongoing',count:9}]};
export async function fixtureServer({ dist, port=0, anonymous=false, delay=400, sessionCookies=false }={}) {
 const counts={};
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')){
   const resource=url.pathname.slice(5);counts[resource]=(counts[resource]||0)+1;
   await new Promise(resolve=>setTimeout(resolve,delay));
   let data,meta,status=200;
   if(resource==='auth/login'&&sessionCookies){res.setHeader('Set-Cookie','depor_refresh=fixture-refresh-only; Path=/api/auth; HttpOnly; SameSite=Lax');data={accessToken:'fixture-only-token',user:profiles[0],expiresIn:3600};}
   else if(resource==='auth/logout'&&sessionCookies){res.setHeader('Set-Cookie','depor_refresh=; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=0');data={loggedOut:true};}
   else if(resource==='auth/refresh'){if(anonymous||(sessionCookies&&!req.headers.cookie?.includes('depor_refresh=fixture-refresh-only'))){status=401;data=null;}else data={accessToken:'fixture-only-token',user:profiles[0],expiresIn:3600};}
   else if(resource==='dashboard')data=dashboard;
   else if(resource==='dashboard/overview')data={...dashboard,programFocus:programs.map(({id,name,kind,status,progress})=>({id,name,kind,status,progress}))};
   else if(resource==='directory')data={profiles,programs:programs.map(({id,name,assignee_ids})=>({id,name,assignee_ids}))};
   else if(resource==='tasks/summary')data=summary;
   else if(resource==='tasks/board'){
    const pages=(url.searchParams.get('pages')||'0,0,0,0,0').split(',').map(Number);
    data={summary,columns:Object.fromEntries(statuses.map((status,i)=>{const records=tasks.filter(t=>t.status===status);return[status,{items:records.slice(pages[i]*12,pages[i]*12+12).map(t=>{const row={...t};delete row.description;return row;}),hasMore:records.length>pages[i]*12+12}];}))};
   } else {
    let records=resource==='tasks'?tasks:resource==='profiles'?profiles:resource==='programs'?programs:[];
    if(url.searchParams.has('status'))records=records.filter(r=>r.status===url.searchParams.get('status'));
    const size=Number(url.searchParams.get('size')||20),offset=Number(url.searchParams.get('page')||0)*size;
    data=records.slice(offset,offset+size);meta={hasMore:records.length>offset+size};
   }
   const body=JSON.stringify(status===401?{error:{message:'Fixture signed out'}}:{data,meta});
   res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(body);return;
  }
  const relative=decodeURIComponent(url.pathname).replace(/^\/+/, '');
  let file=path.resolve(dist,relative);
  if(!file.startsWith(path.resolve(dist)+path.sep)&&file!==path.resolve(dist)) {res.writeHead(403);res.end();return;}
  if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(dist,'index.html');
  const type=file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.txt')?'text/plain':'text/html';
  const bytes=gzipSync(fs.readFileSync(file));res.writeHead(200,{'Content-Type':type,'Content-Encoding':'gzip','Cache-Control':file.endsWith('.html')?'no-cache':'public,max-age=31536000,immutable'});res.end(bytes);
 });
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
 return {server,counts,url:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(resolve=>server.close(resolve))};
}
