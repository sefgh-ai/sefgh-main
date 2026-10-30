import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import React from 'react';
import {transform,loadBindings} from 'next/dist/build/swc/index.js';
const source=await readFile(new URL('../../src/components/trending/TrendingDeveloperCard.jsx',import.meta.url),'utf8');
let helpers={};try{helpers=await import('../../src/lib/utils/trending/feedback.js');}catch{}
await loadBindings();
const compiled=await transform(source,{filename:'TrendingDeveloperCard.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'classic'}}},module:{type:'commonjs'}});
const exports={};vm.runInNewContext(compiled.code,{exports,require:name=>name==='react'?React:name.endsWith('/feedback')?helpers:name==='lucide-react'?{Flame:()=>null,Code:()=>null}:new Proxy({},{get:(_,key)=>props=>React.createElement('div',props)}),});
const Card=exports.TrendingDeveloperCard.type;
const find=(node,text)=>{if(!node||typeof node!=='object')return null;if(node.props?.children===text)return node;for(const c of React.Children.toArray(node.props?.children)){const result=find(c,text);if(result)return result;}return null;};
for(const label of ['No repositories','Repository unavailable'])test('placeholder '+label+' has no navigation handler',()=>{const calls=[];const tree=Card({dev:{username:'octocat',name:'Octo',popularRepo:{name:label,description:'none'}},onNavigate:path=>calls.push(path)});const item=find(tree,label);assert.ok(item);assert.equal(item.props.onClick,undefined);assert.notEqual(item.type,'button');assert.deepEqual(calls,[]);});
test('a real repository is keyboard accessible and navigates to its own path',()=>{const calls=[];const item=find(Card({dev:{username:'octocat',name:'Octo',popularRepo:{name:'hello-world',description:'demo'}},onNavigate:path=>calls.push(path)}),'hello-world');assert.equal(item.type,'button');item.props.onClick();assert.deepEqual(calls,['/repo/octocat/hello-world']);});
