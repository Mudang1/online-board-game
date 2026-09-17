import test from 'node:test';
import assert from 'node:assert/strict';
import {io as connect} from 'socket.io-client';
import {createGameServer} from '../server.js';
const request=(s,event,p={})=>new Promise((resolve,reject)=>s.timeout(2000).emit(event,p,(err,res)=>err?reject(err):resolve(res)));
const waitState=(s,check)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{s.off('state',fn);reject(new Error('state timeout'));},2500);function fn(v){if(check(v)){clearTimeout(timer);s.off('state',fn);resolve(v);}}s.on('state',fn);});
test('six actual clients: lobby, hidden hands, turns, spoof rejection, reconnect, leave and rematch',async t=>{
 const game=createGameServer();await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${game.server.address().port}`;
 const clients=[];t.after(async()=>{clients.forEach(s=>s.disconnect());await game.close();});
 async function client(){const s=connect(url,{forceNew:true,reconnection:false});clients.push(s);await new Promise(r=>s.on('connect',r));return s;}
 const a=await client(),host=await request(a,'create-room',{name:'Host'});assert.equal(host.ok,true);const code=host.code;
 const joins=[host];for(let i=1;i<6;i++){const s=await client();joins.push(await request(s,'join-room',{code,name:`P${i}`}));}
 const seventh=await client();assert.equal((await request(seventh,'join-room',{code,name:'Full'})).ok,false);
 for(const s of clients.slice(0,6))assert.equal((await request(s,'ready',{code,ready:true})).ok,true);
 const first=waitState(a,s=>s.room.phase==='playing');assert.equal((await request(a,'start-game',{code})).ok,true);const state=await first;
 assert.equal(state.me.hand.length,5);assert.equal(state.room.players.length,6);const wire=JSON.stringify(state);for(const j of joins)assert.equal(wire.includes(j.token),false);
 assert.equal((await request(clients[1],'draw',{code,turnNumber:1})).ok,false);
 assert.equal((await request(seventh,'reconnect-room',{code,token:state.room.players[0].id})).ok,false);
 const live=game.rooms.get(code);live.players[0].hand=['scratch-frenzy'];const damage=waitState(clients[1],s=>s.room.players[1].hp===3);assert.equal((await request(a,'play-card',{code,turnNumber:1,cardId:'scratch-frenzy',targetId:state.room.players[1].id})).ok,true);await damage;
 assert.equal((await request(a,'draw',{code,turnNumber:1})).ok,true);assert.equal((await request(a,'draw',{code,turnNumber:1})).ok,false);
 const originalPlayer=game.rooms.get(code).players[0];const hand=[...originalPlayer.hand];
 const replacement=await client();const resumed=waitState(replacement,s=>s.me.id===state.me.id);assert.equal((await request(replacement,'reconnect-room',{code,token:host.token})).ok,true);await resumed;assert.deepEqual(originalPlayer.hand,hand);
 assert.equal((await request(a,'chat',{code,text:'stale socket'})).ok,false);
 assert.equal((await request(replacement,'restart',{code})).ok,false);
 for(const s of clients.slice(1,6))assert.equal((await request(s,'leave-room',{code})).ok,true);
 assert.equal(game.rooms.get(code).phase,'finished');assert.equal((await request(replacement,'restart',{code})).ok,true);assert.equal(game.rooms.get(code).players.length,1);
 assert.equal((await request(replacement,'ready',null)).ok,false);
});
