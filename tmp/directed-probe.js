// Directed-delegation probe. Two phases so the ORCHESTRATOR is genuinely in the
// loop: phase 1 runs cold and dumps code+failure for a human-grade reader to
// diagnose; phase 2 feeds that diagnosis back. A pre-written diagnosis would be
// cheating - the whole claim under test is that Opus adds value by converting a
// symptom into a named cause, which cannot be scripted in advance.
const fs=require('fs'),path=require('path'),http=require('node:http');
const {execFileSync}=require('child_process');
const REPO='/Users/dpuglielli/.herdr/worktrees/claude-domestique/chore-explore-local-model-integration';
const SRC='comitatus/skills/herdr/scripts/up.js', TST='comitatus/__tests__/up.test.js';
const PHASE=process.argv[2], NAME=process.argv[3];
const SB=`/tmp/directed-${NAME}`;
const STUB=`function ${NAME}(/* SIGNATURE AND BODY REMOVED - YOU WRITE THIS */) {\n  throw new Error('not implemented');\n}`;

function build(){fs.rmSync(SB,{recursive:true,force:true});
 fs.mkdirSync(path.join(SB,'comitatus/skills/herdr/scripts'),{recursive:true});
 fs.mkdirSync(path.join(SB,'comitatus/__tests__'),{recursive:true});
 fs.cpSync(path.join(REPO,'comitatus/skills/herdr/scripts'),path.join(SB,'comitatus/skills/herdr/scripts'),{recursive:true});
 fs.copyFileSync(path.join(REPO,TST),path.join(SB,TST));}
function strip(){const o=fs.readFileSync(path.join(REPO,SRC),'utf8');
 const st=o.indexOf(`function ${NAME}(`);let d=0,i=o.indexOf('{',st),e=-1;
 for(;i<o.length;i++){if(o[i]==='{')d++;else if(o[i]==='}'&&--d===0){e=i+1;break;}}
 return o.slice(0,st)+STUB+o.slice(e);}
function chat(msgs){const body=JSON.stringify({model:'qwen3-coder:30b',stream:false,truncate:false,shift:false,options:{num_ctx:32768,num_predict:4096},messages:msgs});
 return new Promise((res,rej)=>{const r=http.request({hostname:'127.0.0.1',port:11434,path:'/api/chat',method:'POST',headers:{'content-type':'application/json','content-length':Buffer.byteLength(body)}},x=>{let o='';x.setEncoding('utf8');x.on('data',c=>o+=c);x.on('end',()=>{const j=JSON.parse(o);res(j.message?j.message.content:'');});});r.setTimeout(0);r.on('error',rej);r.end(body);});}
function ext(t){const f=[...t.matchAll(/```(?:js|javascript)?\n([\s\S]*?)```/g)].map(m=>m[1]);
 for(const b of f)if(b.includes(`function ${NAME}(`))return b.trim();
 return t.includes(`function ${NAME}(`)?t.trim():null;}
function test(){try{execFileSync('npx',['jest','--rootDir',SB,'--testMatch','**/up.test.js','--silent'],{cwd:REPO,encoding:'utf8',stdio:'pipe'});return{ok:true,out:''};}
 catch(e){return{ok:false,out:`${e.stdout||''}\n${e.stderr||''}`.trim()};}}
const stripped=strip();
const base=[`Write the JavaScript function \`${NAME}\` for the CommonJS module below.`,
 'The Jest test file is the specification. Error strings are asserted exactly.',
 'Reply with ONLY a fenced ```js block containing the complete function.','',
 '=== MODULE ===',stripped,'','=== TEST ===',fs.readFileSync(path.join(REPO,TST),'utf8')].join('\n');

(async()=>{
 if(PHASE==='cold'){
  build();
  const t0=Date.now();
  const ans=await chat([{role:'user',content:base}]);
  const code=ext(ans);
  fs.writeFileSync(path.join(SB,SRC),stripped.replace(STUB,code));
  const r=test();
  fs.writeFileSync(`/tmp/directed-${NAME}.state.json`,JSON.stringify({base,ans,code,secs:(Date.now()-t0)/1000}));
  console.log(`${NAME} COLD: ${r.ok?'GREEN':'RED'} ${((Date.now()-t0)/1000).toFixed(1)}s`);
  if(!r.ok){fs.writeFileSync(`/tmp/directed-${NAME}.fail.txt`,r.out);
   console.log('--- CODE ---');console.log(code);
   console.log('--- FAILURES ---');
   console.log(r.out.split('\n').filter(l=>/●|Expected|Received|at Object/.test(l)).slice(0,14).join('\n'));}
 } else {
  const s=JSON.parse(fs.readFileSync(`/tmp/directed-${NAME}.state.json`,'utf8'));
  const diag=fs.readFileSync(process.argv[4],'utf8');
  const t0=Date.now();
  const ans=await chat([{role:'user',content:s.base},{role:'assistant',content:s.ans},{role:'user',content:diag}]);
  fs.writeFileSync(path.join(SB,SRC),stripped.replace(STUB,ext(ans)));
  const r=test();
  console.log(`${NAME} DIRECTED: ${r.ok?'GREEN':'RED'} ${((Date.now()-t0)/1000).toFixed(1)}s`);
  if(!r.ok)console.log(r.out.split('\n').filter(l=>/●|Expected|Received/.test(l)).slice(0,10).join('\n'));
 }
})();
