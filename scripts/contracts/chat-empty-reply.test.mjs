import assert from 'node:assert/strict';
import {register} from 'node:module';
import {test} from 'node:test';
register('./route-loader.mjs',import.meta.url);register('./chat-stub-loader.mjs',import.meta.url);
const {useChatMessages}=await import('../../src/hooks/chat/useChatMessages.js');
for(const action of ['send','edit','regenerate'])for(const [name,payload,valid]of [['null',{response:null},false],['object',{response:{a:1}},false],['missing',{},false],['blank',{response:'   '},false],['text',{response:'Hello'},true]])test(action+' handles '+name,async()=>{
 const saved=[],updated=[],toasts=[],deleted=[];const originalError=console.error;console.error=()=>{};
 const messages=action==='regenerate'?[{id:'u1',role:'user',content:'Hi'},{id:'a1',role:'assistant',content:'Old answer'}]:action==='edit'?[{id:'u1',role:'user',content:'Hi'}]:[];
 globalThis.__chat={hook:{next:0,values:{0:messages,1:'Hi',4:'Edited'}},toast:(text)=>toasts.push(text),createMessage:(role,content)=>({id:role+'-new',role,content}),addMessage:async(id,user,msg)=>saved.push({id,msg}),updateMessage:async(id,user,messageId,content)=>updated.push({id,messageId,content}),deleteMessage:async(...args)=>deleted.push(args),updateConversationTitle:async()=>{},postChat:async(body)=>Response.json(body.action?{title:'Chat'}:payload)};
 try{const chat=useChatMessages({id:'user'},{id:'c1'},async()=>{});if(action==='send')await chat.handleSend('SEFGH V1',{id:'c1'},()=>{},()=>{},[]);else if(action==='edit')await chat.handleEditMessage('u1');else await chat.handleRegenerateResponse('a1');
 if(valid){assert.ok(!toasts.includes('The assistant sent an empty answer'));if(action==='regenerate')assert.equal(updated.at(-1).content,'Hello');else assert.equal(saved.at(-1).msg.content,'Hello');}
 else{assert.ok(toasts.includes('The assistant sent an empty answer'),JSON.stringify(toasts));assert.ok(saved.every(x=>x.msg.role==='user'));assert.ok(updated.every(x=>x.messageId!=='a1'));assert.deepEqual(deleted,[]);if(action==='send')assert.equal(saved[0].msg.role,'user');if(action==='regenerate')assert.equal(messages[1].content,'Old answer');}
 }finally{console.error=originalError;delete globalThis.__chat;}
});
