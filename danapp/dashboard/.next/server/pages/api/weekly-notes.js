"use strict";(()=>{var e={};e.id=577,e.ids=[577],e.modules={145:e=>{e.exports=require("next/dist/compiled/next-server/pages-api.runtime.prod.js")},5900:e=>{e.exports=require("pg")},7147:e=>{e.exports=require("fs")},1017:e=>{e.exports=require("path")},3149:(e,t,r)=>{r.r(t),r.d(t,{config:()=>k,default:()=>p,routeModule:()=>w});var a={};r.r(a),r.d(a,{default:()=>handler});var o=r(1802),n=r(7153),s=r(6249);let l=r(7147),i=r(1017),{Pool:c}=r(5900),d=process.env.DATABASE_URL?new c({connectionString:process.env.DATABASE_URL}):null,u=process.env.VAULT_PATH;async function handler(e,t){let r=e.headers["x-secret"];if(r!==process.env.DASHBOARD_SECRET)return t.status(401).json({error:"Unauthorized"});if("GET"===e.method)try{let e="";if(u){let t=i.join(u,"Templates/Weekly Tracker.md");l.existsSync(t)&&(e=l.readFileSync(t,"utf8"))}if(!e&&d){let{rows:t}=await d.query("SELECT content FROM weekly_tracker ORDER BY week_start_date DESC LIMIT 1");t.length>0&&(e=t[0].content)}e||(e=function(){let e=new Date,t=new Date(e);t.setDate(e.getDate()-(0===e.getDay()?6:e.getDay()-1));let r=t.getFullYear(),a=String(t.getMonth()+1).padStart(2,"0"),o=String(t.getDate()).padStart(2,"0"),n=`${r}-${a}-${o}`;return`# Weekly Tracker - ${n}

## 🎯 Goals This Week
- [ ] Goal1: 
- [ ] Goal2: 
- [ ] Goal3: 

## ✅ Completed Tasks
- 

## 🚧 Blockers
- 

## 📝 Reflections
- 

## 📊 Accountability Check
**Did I meet my goals?**
- 

**What slowed me down?**
- 

**What will I improve next week?**
- `}()),t.json({content:e})}catch(e){console.error(e),t.status(500).json({error:"Failed to read weekly tracker"})}else if("POST"===e.method){let{content:r}=e.body;if(!r)return t.status(400).json({error:"No content provided"});try{if(u){let e=i.join(u,"Templates/Weekly Tracker.md");l.writeFileSync(e,r,"utf8")}if(d){let e=r.match(/# Weekly Tracker - (\d{4}-\d{2}-\d{2})/),t=e?e[1]:new Date().toISOString().split("T")[0];await d.query("INSERT INTO weekly_tracker (week_start_date, content) VALUES ($1, $2)",[t,r])}t.json({success:!0})}catch(e){console.error(e),t.status(500).json({error:"Failed to save weekly tracker"})}}else t.status(405).json({error:"Method not allowed"})}let p=(0,s.l)(a,"default"),k=(0,s.l)(a,"config"),w=new o.PagesAPIRouteModule({definition:{kind:n.x.PAGES_API,page:"/api/weekly-notes",pathname:"/api/weekly-notes",bundlePath:"",filename:""},userland:a})}};var t=require("../../webpack-api-runtime.js");t.C(e);var __webpack_exec__=e=>t(t.s=e),r=t.X(0,[222],()=>__webpack_exec__(3149));module.exports=r})();