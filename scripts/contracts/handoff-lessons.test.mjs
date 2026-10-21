import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const script=fileURLToPath(new URL('../agent-handoff.mjs',import.meta.url));
function fixture() {
 const root=resolve(tmpdir()),dir=mkdtempSync(join(root,'sefgh-handoff-lessons-'));
 const bin=join(dir,'Programs','Go','bin');mkdirSync(bin,{recursive:true});
 for(const path of ['backend','learn-go','docs'])mkdirSync(join(dir,path));
 writeFileSync(join(dir,'.gitignore'),'.agent-signal.json\n.calls.jsonl\n');
 writeFileSync(join(dir,'docs','coordination.md'),'## Current state\n\n- **Active writer:** none\n\n## Handoff: fixture\n\nStatus: complete\n');
 const helper=join(dir,'command.cjs');
 writeFileSync(helper,`const fs=require('node:fs');const role=process.argv[2];const cwd=process.cwd();fs.appendFileSync(${JSON.stringify(join(dir,'.calls.jsonl'))},JSON.stringify({role,cwd,args:process.argv.slice(3)})+'\\n');if(role==='go'&&cwd.endsWith('learn-go')&&process.env.FIXTURE_LESSON_FAIL==='1'){process.stderr.write('Synthetic lesson failure');process.exitCode=23;}`);
 const quote=value=>"'"+value.replaceAll("'","'\\''")+"'";
 for(const role of ['go','npm','gofmt']){
  const path=join(bin,role+(process.platform==='win32'?'.cmd':''));
  writeFileSync(path,process.platform==='win32'?`@echo off\r\n"${process.execPath}" "${helper}" ${role} %*\r\n`:`#!/bin/sh\nexec ${quote(process.execPath)} ${quote(helper)} ${quote(role)} "$@"\n`,{mode:0o700});
 }
 const git=(...args)=>execFileSync('git',args,{cwd:dir,stdio:'pipe',windowsHide:true});
 git('init','--quiet');git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','-c','core.hooksPath='+join(dir,'no-hooks'),'commit','--quiet','-m','fixture');
 writeFileSync(join(dir,'pending.txt'),'synthetic change');
 const env={...process.env,LOCALAPPDATA:dir,PATH:bin+delimiter+process.env.PATH};
 return {dir,run:(args=[],fail=false)=>spawnSync(process.execPath,[script,...args],{cwd:dir,env:{...env,FIXTURE_LESSON_FAIL:fail?'1':'0'},encoding:'utf8',timeout:15000,windowsHide:true}),signal:()=>JSON.parse(readFileSync(join(dir,'.agent-signal.json'),'utf8')),calls:()=>readFileSync(join(dir,'.calls.jsonl'),'utf8').trim().split('\n').map(JSON.parse),close:()=>{assert.ok(resolve(dir).startsWith(root+sep));rmSync(dir,{recursive:true,force:true});}};
}

test('default handoff skips lesson execution honestly and status accepts owner policy',()=>{
 const f=fixture();try{const r=f.run([],true);assert.equal(r.status,0,r.stdout+r.stderr);const signal=f.signal();assert.equal(signal.learnGoPassed,null);assert.equal(signal.learnGoSkipped,true);assert.equal(signal.learnGoCheck,'skipped-owner-policy');assert.equal(f.calls().some(c=>c.cwd.endsWith('learn-go')),false);assert.equal(f.calls().filter(c=>c.role==='go').length,2);assert.equal(f.calls().filter(c=>c.role==='gofmt').length,1);const status=f.run(['--status']);assert.equal(JSON.parse(status.stdout).state,'READY_VERIFIED');}finally{f.close();}
});
test('explicit lesson verification fails closed and never emits a success signal',()=>{
 const f=fixture();try{const r=f.run(['--lessons'],true);assert.equal(r.status,1);assert.match(r.stdout+r.stderr,/Synthetic lesson failure/);assert.equal(existsSync(join(f.dir,'.agent-signal.json')),false);}finally{f.close();}
});
test('explicit successful lesson verification records a real pass',()=>{
 const f=fixture();try{const r=f.run(['--lessons']);assert.equal(r.status,0,r.stdout+r.stderr);const signal=f.signal();assert.equal(signal.learnGoPassed,true);assert.equal(signal.learnGoSkipped,false);assert.equal(signal.learnGoCheck,'passed');}finally{f.close();}
});

test('a later failed explicit check invalidates an earlier success proof',()=>{
 const f=fixture();try{
  assert.equal(f.run().status,0);
  assert.equal(JSON.parse(f.run(['--status']).stdout).state,'READY_VERIFIED');
  assert.equal(f.run(['--lessons'],true).status,1);
  assert.equal(existsSync(join(f.dir,'.agent-signal.json')),false,'failed check retained an old success');
  const status=JSON.parse(f.run(['--status']).stdout);
  assert.equal(status.state,'READY_NEEDS_VERIFY');assert.equal(status.signalMatchesTree,false);
 }finally{f.close();}
});
