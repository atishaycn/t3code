import { readdir, readFile, access } from 'node:fs/promises';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const repositoryRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const root=resolve(repositoryRoot,'.agents/skills'); const errors=[]; const names=new Set();
const dirs=(await readdir(root,{withFileTypes:true})).filter(x=>x.isDirectory());
for(const d of dirs){const dir=join(root,d.name), p=join(dir,'SKILL.md'); let s; try{s=await readFile(p,'utf8')}catch{errors.push(`${d.name}: missing SKILL.md`);continue}
 const m=s.match(/^---\n([\s\S]*?)\n---/); if(!m) {errors.push(`${d.name}: missing frontmatter`);continue}
 const n=m[1].match(/^name:\s*(\S+)/m)?.[1], desc=m[1].match(/^description:\s*(.+)/m)?.[1];
 if(!n||n!==d.name) errors.push(`${d.name}: invalid name`); if(names.has(n)) errors.push(`${d.name}: duplicate name`); names.add(n);
 if(!desc||desc.length<20) errors.push(`${d.name}: weak description`);
 for(const l of s.matchAll(/\]\(([^)]+)\)/g)){const target=l[1]; if(target.startsWith('http'))continue; const resolved=resolve(dir,target); if(relative(dir,resolved).startsWith('..')) errors.push(`${d.name}: link escapes skill folder ${target}`); else try{await access(resolved)}catch{errors.push(`${d.name}: broken link ${target}`)}}
 if(!/Completion gate/i.test(s)) errors.push(`${d.name}: missing completion gate`);
 if(!/fail closed/i.test(s)||!/(stop immediately|stop when)/i.test(s)) errors.push(`${d.name}: missing explicit fail-closed stop rule`);
 for(const f of ['template.json']) {try{JSON.parse(await readFile(join(dir,f),'utf8'))}catch{if(await access(join(dir,f)).then(()=>true).catch(()=>false)) errors.push(`${d.name}: invalid ${f}`)}}
}
const router=await readFile(join(root,'pi-orchestrate','SKILL.md'),'utf8');
if(!/disable-model-invocation:\s*true/.test(router)||!/\/skill:pi-orchestrate/.test(router)) errors.push('pi-orchestrate: must be explicitly user-invoked');
if(!/contract.*context.*execution.*review/is.test(router)) errors.push('pi-orchestrate: missing router chain contract -> context -> execution -> review');
for(const f of ['pi-contract/template.json','pi-context-packet/template.json']) {try{JSON.parse(await readFile(join(root,f),'utf8'))}catch{errors.push(`${f}: invalid template`)}}
if(errors.length){console.error(errors.join('\n'));process.exit(1)} console.log(`skills valid: ${dirs.length} skills; portability, stop rules, templates, and router chain checked`);
