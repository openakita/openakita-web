import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
const source=readFileSync(new URL('../assets/js/chat-provider.js',import.meta.url),'utf8');
let checks=0;
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
function transport(fetch,hostname='openakita.ai') {
  const window={};runInNewContext(source,{window,location:{hostname},fetch,AbortSignal,TextEncoder,TextDecoder,Uint8Array});return window.OpenAkitaChatProvider;
}
const event=(data,eol='\n')=>'data: '+(typeof data==='string'?data:JSON.stringify(data))+eol+eol;
function sse(text,size=7) {
  const bytes=new TextEncoder().encode(text);let offset=0;
  return new Response(new ReadableStream({pull(controller){if(offset===bytes.length){controller.close();return;}controller.enqueue(bytes.slice(offset,offset+=Math.min(size,bytes.length-offset)));}}),{headers:{'Content-Type':'text/event-stream; charset=utf-8'}});
}
const input=(provider)=>({provider,key:'test-key',model:'test-model',messages:[{role:'user',content:'你好'}]});
const fresh=()=>new AbortController().signal;
for(const provider of ['openai','xai','anthropic','deepseek']) {
  let captured,output='';
  const stream=provider==='anthropic'
    ? ': keepalive\r\n\r\n'+event({type:'content_block_start',content_block:{type:'text',text:'你'}},'\r\n')+event({type:'content_block_delta',delta:{type:'thinking_delta',thinking:'hidden'}},'\r\n')+event({type:'content_block_delta',delta:{type:'text_delta',text:'好🙂'}},'\r\n')+event({type:'message_delta',delta:{stop_reason:'end_turn'}},'\r\n')+event({type:'message_stop'},'\r\n')
    : event({choices:[{index:0,delta:{role:'assistant',content:''}}]})+event({choices:[{index:0,delta:{content:'你好🙂'},finish_reason:null}]})+event({choices:[{index:0,delta:{},finish_reason:'stop'}]})+event('[DONE]');
  const client=transport(async(url,options)=>{captured={url,options};return sse(stream,1);});
  await client.streamCompletion(input(provider),text=>output+=text,fresh());
  assert.equal(output,'你好🙂','split UTF-8 and SSE boundaries must preserve text');
  const {url,options}=captured;const body=JSON.parse(options.body);
  assert.equal(url,client.providers[provider].url+(provider==='anthropic'?'/messages':'/chat/completions'));
  assert.equal(options.mode,'cors');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');
  assert.equal(body.stream,true);assert.equal(body.model,'test-model');assert.deepEqual(body.messages,input(provider).messages);
  assert.equal(body.tools,undefined);assert.equal(body.api_key,undefined);
  if(provider==='anthropic'){assert.equal(options.headers['x-api-key'],'test-key');assert.equal(options.headers['anthropic-dangerous-direct-browser-access'],'true');assert.equal(body.max_tokens,4096);}
  else {assert.equal(options.headers.Authorization,'Bearer test-key');if(provider==='openai'){assert.equal(body.store,false);assert.equal(body.max_completion_tokens,4096);}}
  if(provider==='deepseek') {
    assert.equal(url,'https://api.deepseek.com/chat/completions');
    assert.equal(body.max_tokens,4096);assert.equal(body.max_completion_tokens,undefined);assert.equal(body.store,undefined);
    assert.equal(client.providers.deepseek.keys,'https://platform.deepseek.com/api_keys');
  }
  let modelRequest;
  const modelsClient=transport(async(url,options)=>{modelRequest={url,options};return json({data:[{id:'z-model'},{id:'a-model'},{id:'a-model'},{id:''},{id:42}]});});
  assert.deepEqual(Array.from(await modelsClient.listModels(provider,'test-key',fresh())),['a-model','z-model']);
  assert.equal(modelRequest.options.method,undefined,'model listing uses GET');assert.ok(modelRequest.url.includes('/models'));checks+=2;
  if(provider==='deepseek') assert.equal(modelRequest.url,'https://api.deepseek.com/models');
}
{
  let output='';
  const client=transport(async()=>sse(': keep-alive\n\n'+event({choices:[{index:0,delta:{reasoning_content:'internal reasoning',content:null}}]})+event({choices:[{index:0,delta:{content:'Final answer'}}]})+event('[DONE]'),1));
  await client.streamCompletion(input('deepseek'),part=>output+=part,fresh());
  assert.equal(output,'Final answer','DeepSeek reasoning frames do not replace or pollute the final answer');checks++;
  await assert.rejects(transport(async()=>json({},401)).listModels('deepseek','invalid-key',fresh()),/provider_auth_failed/);checks++;
}
let pages=0;
const paged=transport(async url=>{pages++;if(pages===1)return json({data:[{id:'a'}],has_more:true,last_id:'a'});assert.ok(url.endsWith('&after_id=a'));return json({data:[{id:'b'}],has_more:false});});
assert.deepEqual(Array.from(await paged.listModels('anthropic','key',fresh())),['a','b']);assert.equal(pages,2);checks++;
for(const host of ['openakita.cn','www.openakita.cn','unknown.example','openakita.ai.evil.example']){
  let called=0;const client=transport(async()=>{called++;},host);
  await assert.rejects(client.listModels('xai','key',fresh()),/chat_unavailable/);
  await assert.rejects(client.streamCompletion(input('openai'),()=>{},fresh()),/chat_unavailable/);assert.equal(called,0);checks++;
}
for(const [status,body,code] of [[401,{},'provider_auth_failed'],[403,{},'provider_auth_failed'],[429,{},'provider_rate_limited'],[503,{},'provider_unavailable'],[404,{},'provider_request_rejected'],[400,{error:'Incorrect API key provided. SECRET'},'provider_auth_failed'],[400,{error:{code:'invalid_api_key',message:'SECRET'}},'provider_auth_failed']]){
  const client=transport(async()=>json(body,status));await assert.rejects(client.listModels('xai','key',fresh()),error=>error.message===code&&!error.message.includes('SECRET'));checks++;
}
for(const [error,code] of [[new TypeError('Failed to fetch'),'browser_connection_failed'],[new DOMException('Timed out','TimeoutError'),'provider_timeout']]){
  const client=transport(async()=>{throw error;});await assert.rejects(client.listModels('xai','key',fresh()),error=>error.message===code);checks++;
}
const aborted=new AbortController();aborted.abort();let abortedFetch=0;
await assert.rejects(transport(async()=>{abortedFetch++;}).listModels('openai','key',aborted.signal),error=>error.name==='AbortError');assert.equal(abortedFetch,0);checks++;
for(const [provider,text,code] of [
  ['openai',event({choices:[{index:0,delta:{content:'partial'}}]}),'stream_interrupted'],
  ['openai',event('{broken')+event('[DONE]'),'invalid_provider_response'],
  ['openai',event('[DONE]'),'empty_response'],
  ['openai',event({choices:[{index:0,delta:{content:'partial'},finish_reason:'length'}]})+event('[DONE]'),'response_truncated'],
  ['anthropic',event({type:'error',error:{type:'authentication_error',message:'SECRET'}}),'provider_auth_failed'],
  ['anthropic',event({type:'content_block_delta',delta:{type:'text_delta',text:'partial'}})+event({type:'message_delta',delta:{stop_reason:'max_tokens'}})+event({type:'message_stop'}),'response_truncated'],
]){let output='';await assert.rejects(transport(async()=>sse(text)).streamCompletion(input(provider),part=>output+=part,fresh()),error=>error.message===code);if(code==='stream_interrupted'||code==='response_truncated')assert.equal(output,'partial');checks++;}
await assert.rejects(transport(async()=>json({data:'bad'})).listModels('openai','key',fresh()),/invalid_provider_response/);checks++;
await assert.rejects(transport(async()=>json({})).streamCompletion(input('xai'),()=>{},fresh()),/invalid_provider_response/);checks++;
await assert.rejects(transport(()=>{throw Error('must not fetch');}).streamCompletion({...input('openai'),messages:[{role:'user',content:'x'.repeat(524288)}]},()=>{},fresh()),/conversation_too_large/);checks++;
console.log(`[verify-chat-provider] OK: ${checks} checks for native provider protocols, split Unicode/SSE, models, domain gates, cancellation, errors and partial responses`);
