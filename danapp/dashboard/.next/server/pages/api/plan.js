"use strict";(()=>{var e={};e.id=749,e.ids=[749],e.modules={145:e=>{e.exports=require("next/dist/compiled/next-server/pages-api.runtime.prod.js")},9648:e=>{e.exports=import("axios")},7147:e=>{e.exports=require("fs")},3685:e=>{e.exports=require("http")},5687:e=>{e.exports=require("https")},1017:e=>{e.exports=require("path")},3315:(e,t,r)=>{r.a(e,async(e,o)=>{try{r.r(t),r.d(t,{config:()=>d,default:()=>c,routeModule:()=>u});var a=r(1802),s=r(7153),n=r(6249),i=r(7809),l=e([i]);i=(l.then?(await l)():l)[0];let c=(0,n.l)(i,"default"),d=(0,n.l)(i,"config"),u=new a.PagesAPIRouteModule({definition:{kind:s.x.PAGES_API,page:"/api/plan",pathname:"/api/plan",bundlePath:"",filename:""},userland:i});o()}catch(e){o(e)}})},7809:(e,t,r)=>{r.a(e,async(e,o)=>{try{r.r(t),r.d(t,{default:()=>handler});var a=r(9648),s=r(3685),n=r.n(s),i=r(5687),l=r.n(i),c=e([a]);a=(c.then?(await c)():c)[0];let d=new(n()).Agent({family:4}),u=new(l()).Agent({family:4}),p=["mistralai/mistral-small-3.1-24b-instruct:free","qwen/qwen3-coder:free","nvidia/nemotron-nano-12b-v2-vl:free"];async function handler(e,t){if(e.headers["x-secret"]!==process.env.DASHBOARD_SECRET)return t.status(401).json({error:"unauthorized"});if("POST"!==e.method)return t.setHeader("Allow",["POST"]),t.status(405).end(`Method ${e.method} Not Allowed`);let{prompt:o,model:s}=e.body;if(!o)return t.status(400).json({error:"prompt required"});let n=process.env.OPENROUTER_API_KEY;if(!n)return t.status(500).json({error:"OpenRouter API key missing"});let i="";try{let e=r(7147).promises,t=r(1017),o=process.env.VAULT_PATH||"/home/danhomelab/Documents/danGene",a=t.join(o,"Templates","Daily Tracker.md"),s=await e.readFile(a,"utf-8"),n=t.join(o,"Templates","Weekly Tracker.md"),l=await e.readFile(n,"utf-8");i=`DAILY TRACKER:
${s}

WEEKLY TRACKER:
${l}`}catch(e){console.log("Could not load trackers:",e.message)}let l=o.toLowerCase().includes("analy")||o.toLowerCase().includes("tip")||o.toLowerCase().includes("improve")||o.toLowerCase().includes("guidance")||o.toLowerCase().includes("help me"),c=l?`You are a productivity coach analyzing the user's Daily and Weekly Trackers. 
     Provide SPECIFIC, ACTIONABLE tips and guidance based on their actual tracker content.
     Focus on:
     - Goal progress and completion rates
     - Patterns in blockers or reflections
     - Specific improvements for next week
     - Accountability insights
     Format your response with clear sections and bullet points.`:"You are a helpful AI assistant.",m=i?`${c}

TRACKER DATA:
${i}

User Question: ${o}`:o,A=null;for(let e of s?[s]:p){let r={model:e,messages:l?[{role:"system",content:c},{role:"user",content:`TRACKER DATA:
${i}

User Question: ${o}`}]:[{role:"user",content:m}],temperature:.2,max_tokens:2048};try{console.log("Trying model:",e);let s=await a.default.post("https://openrouter.ai/api/v1/chat/completions",r,{headers:{Authorization:`Bearer ${n}`,"Content-Type":"application/json"},timeout:3e4,httpAgent:d,httpsAgent:u}),i=s.data?.choices?.[0]?.message?.content||"";return await saveAIInteractionToObsidian(o,i,e),t.status(200).json({answer:i,model:e})}catch(t){if(console.error(`Model ${e} failed:`,t.response?.data||t.message),A=t,s)break;continue}}if(console.error("All models failed:",A?.response?.data||A?.message),A?.response)return t.status(A.response.status).json({error:A.response.data?.error?.message||"All free models failed",details:A.response.data});t.status(500).json({error:`Network error: ${A?.message}`})}async function saveAIInteractionToObsidian(e,t,o){try{let a=r(7147).promises,s=r(1017),n=process.env.VAULT_PATH||"/home/danhomelab/Documents/danGene",i=s.join(n,"AI Conversations.md"),l=new Date().toLocaleString(),c=`

---
### AI Interaction: ${l}
**Model:** ${o}
**Prompt:**
${e}
**Response:**
${t}
---
`;await a.appendFile(i,c,"utf-8"),console.log("Saved AI interaction to Obsidian")}catch(e){console.error("Failed to save AI interaction:",e.message)}}o()}catch(e){o(e)}})}};var t=require("../../webpack-api-runtime.js");t.C(e);var __webpack_exec__=e=>t(t.s=e),r=t.X(0,[222],()=>__webpack_exec__(3315));module.exports=r})();