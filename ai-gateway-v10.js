// JLG Project Lab 360 — V10 secure AI gateway contract
// Deploy server-side only. Never put AI_API_KEY in the browser.
// Environment variables expected: AI_API_URL, AI_API_KEY (optional if provider uses another auth scheme).
// Client POST body: { mode: 'analysis'|'visual'|'pitch', prompt: string, project: object }
// Gateway response expected by the PWA: { text?: string, image_url?: string }

const ALLOWED_ORIGINS=new Set(['https://jumerca.github.io','http://localhost:8080','http://127.0.0.1:8080']);
function headers(req){const o=req.headers.get('Origin')||'',allow=ALLOWED_ORIGINS.has(o)?o:'https://jumerca.github.io';return{'Access-Control-Allow-Origin':allow,'Vary':'Origin','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store'}}
function out(req,data,status=200){return new Response(JSON.stringify(data),{status,headers:headers(req)})}
export default{
  async fetch(request,env){
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:headers(request)});
    if(request.method!=='POST')return out(request,{error:'method_not_allowed'},405);
    let body;try{body=await request.json()}catch{return out(request,{error:'invalid_json'},400)}
    const mode=String(body?.mode||'analysis'),prompt=String(body?.prompt||'').trim();if(!['analysis','visual','pitch'].includes(mode)||prompt.length<20)return out(request,{error:'invalid_request'},400);if(prompt.length>50000)return out(request,{error:'prompt_too_large'},413);
    if(!env.AI_API_URL)return out(request,{error:'AI_API_URL_not_configured'},503);
    const payload={mode,prompt,project:body.project||{}};
    const h={'Content-Type':'application/json'};if(env.AI_API_KEY)h.Authorization=`Bearer ${env.AI_API_KEY}`;
    try{
      const r=await fetch(env.AI_API_URL,{method:'POST',headers:h,body:JSON.stringify(payload)});const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{data={text:raw}}
      if(!r.ok)return out(request,{error:'provider_error',status:r.status,detail:String(data?.error||data?.message||'').slice(0,500)},502);
      const text=String(data.text||data.output||data.message||data.result||''),image_url=data.image_url||data.imageUrl||data.url||'';return out(request,{text,image_url,mode,generated_at:new Date().toISOString()});
    }catch(e){return out(request,{error:'provider_unreachable',detail:e.message},502)}
  }
};
