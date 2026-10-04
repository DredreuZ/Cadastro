import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const URL=Deno.env.get("SUPABASE_URL")!,KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,RESEND=Deno.env.get("RESEND_API_KEY")!;
const admin=createClient(URL,KEY);
const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const makeCode=()=>Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join("");
async function hash(s){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
Deno.serve(async req=>{
 try{
  const b=await req.json();
  if(b.action==="signup"){
   const username = String(b.username || "").trim();

if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) {
  throw new Error("Usuário inválido.");
}

const existing = await admin
  .from("profiles")
  .select("id")
  .eq("username", username)
  .maybeSingle();

if (existing.data) {
  throw new Error("Nome de usuário já está em uso.");
} 
   const u=await admin.auth.admin.createUser({email:b.email,password:b.password,email_confirm:false,user_metadata:{username:b.username}});
   if(u.error)throw u.error;
   const code=makeCode();
   await admin.from("profiles").insert({id:u.data.user.id,username:b.username,email:b.email,status:"blocked",role:"user"});
   await admin.from("verification_codes").insert({user_id:u.data.user.id,username:b.username,email:b.email,code_hash:await hash(code),expires_at:new Date(Date.now()+15*60000).toISOString()});
   const mail=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":`Bearer ${RESEND}`,"Content-Type":"application/json"},
    body:JSON.stringify({from:"Catálogo <onboarding@resend.dev>",to:[b.email],subject:"Código de verificação — Catálogo",html:`<h2>Seu código</h2><h1>${code}</h1><p>Expira em 15 minutos.</p>`})});
   if(!mail.ok)throw new Error("Falha ao enviar e-mail.");
   return new Response(JSON.stringify({ok:true}),{headers:{"Content-Type":"application/json"}});
  }
  if(b.action==="verify"){
   const r=await admin.from("verification_codes").select("*").eq("username",b.username).eq("email",b.email).eq("used",false).gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(1).single();
   if(r.error||!r.data||r.data.code_hash!==await hash(String(b.code).toUpperCase()))throw new Error("Código inválido ou expirado.");
   const u=await admin.auth.admin.updateUserById(r.data.user_id,{email_confirm:true});if(u.error)throw u.error;
   await admin.from("profiles").update({status:"active"}).eq("id",r.data.user_id);
   await admin.from("verification_codes").update({used:true}).eq("id",r.data.id);
   return new Response(JSON.stringify({ok:true}),{headers:{"Content-Type":"application/json"}});
  }
  throw new Error("Ação inválida.");
 }catch(e){return new Response(JSON.stringify({error:e.message}),{status:400,headers:{"Content-Type":"application/json"}})}
});
