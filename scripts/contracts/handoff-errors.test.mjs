import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, delimiter, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

test('failed handoff retains contract failure stdout together with stderr',()=>{
 const root=resolve(tmpdir());const dir=mkdtempSync(join(root,'sefgh-handoff-errors-'));
 try{
  const windows=process.platform==='win32';
  writeFileSync(join(dir,windows?'npm.cmd':'npm'),windows?'@echo off\r\necho SYNTHETIC CONTRACT FAILURE\r\necho SYNTHETIC STDERR 1>&2\r\nexit /b 1\r\n':'#!/bin/sh\nprintf "SYNTHETIC CONTRACT FAILURE\\n"\nprintf "SYNTHETIC STDERR\\n" >&2\nexit 1\n',{mode:0o700});
  writeFileSync(join(dir,'.gitignore'),'.agent-signal.json\n.agent-verification.lock\n');
  const git=(...args)=>execFileSync('git',args,{cwd:dir,stdio:'pipe',windowsHide:true});
  git('init','--quiet');git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','-c','core.hooksPath='+join(dir,'no-hooks'),'commit','--quiet','-m','fixture');
  const script=fileURLToPath(new URL('../agent-handoff.mjs',import.meta.url));
  const result=spawnSync(process.execPath,[script],{cwd:dir,env:{...process.env,PATH:dir+delimiter+process.env.PATH},encoding:'utf8',timeout:10000,windowsHide:true});
  assert.equal(result.status,1);const output=result.stdout+result.stderr;
  assert.match(output,/SYNTHETIC CONTRACT FAILURE/);assert.match(output,/SYNTHETIC STDERR/);
  assert.equal(existsSync(join(dir,'.agent-verification.lock')),false);
 }finally{assert.ok(resolve(dir).startsWith(root+sep));rmSync(dir,{recursive:true,force:true});}
});
