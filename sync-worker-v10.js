// JLG Project Lab 360 — V10 encrypted sync backend template for Cloudflare Workers + KV
// Required KV binding: PROJECTS
// The browser encrypts/decrypts the project. This worker stores ciphertext only.
// Route example: https://your-worker.workers.dev/sync/<64-char-channel-hash>

const ALLOWED_ORIGINS = new Set([
  'https://jumerca.github.io',
  'http://localhost:8080',
  'http://127.0.0.1:8080'
]);
function cors(req){const origin=req.headers.get('Origin')||'';const allow=ALLOWED_ORIGINS.has(origin)?origin:'https://jumerca.github.io';return{'Access-Control-Allow-Origin':allow,'Vary':'Origin','Access-Control-Allow-Methods':'GET,PUT,OPTIONS','Access-Control-Allow-Headers':'Content-Type,If-Match','Access-Control-Expose-Headers':'ETag','Cache-Control':'no-store'}}
function json(req,data,status=200,extra={}){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json;charset=utf-8',...cors(req),...extra}})}
export default {
  async fetch(request,env){
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(request)});
    const url=new URL(request.url),m=url.pathname.match(/^\/sync\/([a-f0-9]{64})$/i);
    if(!m)return json(request,{error:'not_found'},404);
    if(!env.PROJECTS)return json(request,{error:'PROJECTS KV binding missing'},500);
    const channel=m[1].toLowerCase(),key='project:'+channel;
    if(request.method==='GET'){
      const current=await env.PROJECTS.get(key,'json');if(!current)return json(request,{error:'not_found'},404);
      return json(request,current,200,{'ETag':`"${current.revision||''}"`});
    }
    if(request.method==='PUT'){
      const length=Number(request.headers.get('Content-Length')||0);if(length>4_500_000)return json(request,{error:'payload_too_large'},413);
      let body;try{body=await request.json()}catch{return json(request,{error:'invalid_json'},400)}
      if(!body||body.alg!=='AES-GCM/PBKDF2-SHA256'||typeof body.iv!=='string'||typeof body.ciphertext!=='string')return json(request,{error:'encrypted_payload_required'},400);
      if(body.ciphertext.length>6_000_000)return json(request,{error:'payload_too_large'},413);
      const current=await env.PROJECTS.get(key,'json'),expected=(request.headers.get('If-Match')||'').replace(/"/g,'');
      if(current){if(!expected||expected!==current.revision)return json(request,{error:'conflict',revision:current.revision,updatedAt:current.updatedAt},409,{'ETag':`"${current.revision}"`})}
      const revision=crypto.randomUUID(),stored={...body,revision,storedAt:new Date().toISOString()};
      await env.PROJECTS.put(key,JSON.stringify(stored));
      return json(request,{ok:true,revision,updatedAt:stored.updatedAt||stored.storedAt},200,{'ETag':`"${revision}"`});
    }
    return json(request,{error:'method_not_allowed'},405);
  }
};
