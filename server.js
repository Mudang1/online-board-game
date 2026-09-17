import {listPublicRooms} from './src/game/room-browser.js';
import express from 'express';
import http from 'node:http';
import {randomBytes, randomInt} from 'node:crypto';
import {Server} from 'socket.io';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRoom,joinRoom,setReady,startGame,playCard,drawCard,disconnectPlayer,reconnectPlayer,restartRoom,expireTurn,leaveRoom,removeOfflinePlayer,setMode,setVisibility,crystalAction,estateAction} from './src/game/engine.js';
import {serializePublicRoom,serializePrivatePlayer} from './src/game/views.js';
const root=path.dirname(fileURLToPath(import.meta.url));
const fail=message=>{throw new Error(message);};
const object=p=>p && typeof p==='object' && !Array.isArray(p);
const token=()=>randomBytes(32).toString('hex');
const name=p=>typeof p.name==='string' && p.name.trim() ? p.name.trim().slice(0,20) : 'MuCat';
export function createGameServer(){
 const app=express(), server=http.createServer(app), io=new Server(server,{maxHttpBufferSize:16_384});
 const rooms=new Map();
 app.disable('x-powered-by');
 app.use((_req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');next();});
 app.get('/health',(_req,res)=>res.json({ok:true}));
 app.use(express.static(path.join(root,'public')));
 function roomFor(code){if(typeof code!=='string')fail('รหัสห้องไม่ถูกต้อง');const r=rooms.get(code.trim().toUpperCase());if(!r)fail('ไม่พบห้อง หรือห้องหมดอายุแล้ว');return r;}
 function emitRoom(r){const room=serializePublicRoom(r);for(const p of r.players)if(p.connected&&p.socketId)io.to(p.socketId).emit('state',{room,me:serializePrivatePlayer(r,p.token)});}
 function requireMember(socket,payload){const r=roomFor(payload.code);const p=r.players.find(p=>p.socketId===socket.id&&p.connected);if(!p)fail('คุณไม่ได้อยู่ในห้องนี้ กรุณาเชื่อมต่อใหม่');return [r,p];}
 function attach(socket,r,p){socket.data.code=r.code;socket.data.playerId=p.id;r.emptySince=null;}
 function newCode(){const alphabet='ABCDEFGHJKMNPQRSTUVWXYZ23456789';let code;do{code=Array.from({length:5},()=>alphabet[randomInt(alphabet.length)]).join('');}while(rooms.has(code));return code;}
 function vacant(socket){if(socket.data.code)fail('กรุณาออกจากห้องเดิมก่อน');}
 io.on('connection',socket=>{
   let windowStart=Date.now(),requests=0,lastChat=0;
   function on(event,fn){socket.on(event,(payload,callback)=>{
     const reply=value=>{if(typeof callback==='function')callback(value);};
     try{
       const now=Date.now();if(now-windowStart>5000){windowStart=now;requests=0;}if(++requests>50)fail('ส่งคำสั่งเร็วเกินไป กรุณารอสักครู่');
       if(!object(payload))fail('รูปแบบคำสั่งไม่ถูกต้อง');
       reply({ok:true,...fn(payload)});
     }catch(error){reply({ok:false,error:error.message||'เกิดข้อผิดพลาด'});}
   });}
   on('list-rooms',()=>({rooms:listPublicRooms(rooms)}));
   on('set-visibility',payload=>{const[r,p]=requireMember(socket,payload);setVisibility(r,p.token,payload.listed);emitRoom(r);});
   on('create-room',payload=>{
     vacant(socket);if(rooms.size>=1000)fail('เซิร์ฟเวอร์มีห้องเต็มแล้ว');
     const code=newCode(),secret=token(),r=createRoom({hostName:name(payload),hostSocketId:socket.id,hostToken:secret,code,mode:payload.mode??'zombie',listed:payload.listed??false});
     rooms.set(code,r);attach(socket,r,r.players[0]);emitRoom(r);return {code,token:secret};
   });
   on('join-room',payload=>{
     vacant(socket);const r=roomFor(payload.code),p=joinRoom(r,{name:name(payload),socketId:socket.id,token:token()});
     attach(socket,r,p);emitRoom(r);return {code:r.code,token:p.token};
   });
   on('reconnect-room',payload=>{
     const r=roomFor(payload.code);if(typeof payload.token!=='string')fail('ไม่พบสิทธิ์กลับเข้าห้อง');
     const p=r.players.find(p=>p.token===payload.token);if(!p)fail('สิทธิ์กลับเข้าห้องไม่ถูกต้อง');
     if(socket.data.code && (socket.data.code!==r.code||socket.data.playerId!==p.id))fail('กรุณาออกจากห้องเดิมก่อน');
     const old=io.sockets.sockets.get(p.socketId);
     if(old && old!==socket){old.data.code=null;old.data.playerId=null;old.emit('session-replaced');}
     reconnectPlayer(r,{token:p.token,socketId:socket.id});if(!r.players.some(x=>x.host&&x.connected)){r.players.forEach(x=>x.host=false);p.host=true;}
     attach(socket,r,p);emitRoom(r);return {code:r.code,token:p.token};
   });
   on('set-mode',payload=>{const[r,p]=requireMember(socket,payload);setMode(r,p.token,payload.mode);emitRoom(r);});
   on('ready',payload=>{const[r,p]=requireMember(socket,payload);if(payload.ready!==undefined&&typeof payload.ready!=='boolean')fail('สถานะพร้อมไม่ถูกต้อง');setReady(r,p.token,payload.ready??!p.ready);emitRoom(r);});
   on('remove-offline',payload=>{const[r,p]=requireMember(socket,payload);removeOfflinePlayer(r,p.token,payload.playerId);emitRoom(r);});
   on('start-game',payload=>{const[r,p]=requireMember(socket,payload);startGame(r,p.token);emitRoom(r);});
   for(const event of ['play-card','draw'])on(event,payload=>{
     const[r,p]=requireMember(socket,payload);if(payload.turnNumber!==r.turnNumber)fail('เทิร์นเปลี่ยนแล้ว กรุณาเลือกใหม่');
     if(Date.now()>=r.turnDeadline){if(expireTurn(r))emitRoom(r);fail('หมดเวลาเทิร์นแล้ว');}
     if(event==='draw')drawCard(r,p.token);
     else {if(typeof payload.cardId!=='string')fail('การ์ดไม่ถูกต้อง');const target=r.players.find(x=>x.id===payload.targetId);playCard(r,p.token,payload.cardId,target?.token);}
     emitRoom(r);
   });
   on('crystal-action',payload=>{const[r,p]=requireMember(socket,payload);if(payload.turnNumber!==r.turnNumber)fail('เทิร์นเปลี่ยนแล้ว กรุณาเลือกใหม่');if(Date.now()>=r.turnDeadline){if(expireTurn(r))emitRoom(r);fail('หมดเวลาเทิร์นแล้ว');}crystalAction(r,p.token,payload);emitRoom(r);});
   on('estate-action',payload=>{const[r,p]=requireMember(socket,payload);if(payload.turnNumber!==r.turnNumber)fail('เทิร์นเปลี่ยนแล้ว กรุณาเลือกใหม่');if(Date.now()>=r.turnDeadline){if(expireTurn(r))emitRoom(r);fail('หมดเวลาเทิร์นแล้ว');}estateAction(r,p.token,payload);emitRoom(r);});
   on('restart',payload=>{const[r,p]=requireMember(socket,payload);if(!p.host)fail('เฉพาะเจ้าของห้อง');if(r.phase!=='finished')fail('ต้องจบเกมก่อนเริ่มรอบใหม่');r.players=r.players.filter(x=>x.connected);restartRoom(r,p.token);emitRoom(r);});
   on('leave-room',payload=>{const[r,p]=requireMember(socket,payload);leaveRoom(r,p.token);socket.data.code=null;socket.data.playerId=null;emitRoom(r);if(!r.players.some(x=>x.connected))r.emptySince=Date.now();});
   on('chat',payload=>{const[r,p]=requireMember(socket,payload);if(typeof payload.text!=='string')fail('ข้อความไม่ถูกต้อง');const text=payload.text.trim().slice(0,200);if(!text)return;if(Date.now()-lastChat<700)fail('กรุณารอสักครู่ก่อนส่งข้อความ');lastChat=Date.now();r.log.unshift({id:randomBytes(8).toString('hex'),message:`${p.name}: ${text}`,type:'chat',at:Date.now()});r.log=r.log.slice(0,40);emitRoom(r);});
   socket.on('disconnect',()=>{
     const r=rooms.get(socket.data.code);if(!r)return;const p=disconnectPlayer(r,socket.id);if(!p)return;
     if(p.host){const next=r.players.find(x=>x.connected);if(next){p.host=false;next.host=true;}}
     if(!r.players.some(x=>x.connected))r.emptySince=Date.now();emitRoom(r);
   });
 });
 const timer=setInterval(()=>{for(const[code,r]of rooms){if(r.emptySince&&Date.now()-r.emptySince>30*60_000){rooms.delete(code);continue;}if(r.players.some(p=>p.connected)&&expireTurn(r))emitRoom(r);}},500);timer.unref();
 return {app,server,io,rooms,close:()=>new Promise(resolve=>{clearInterval(timer);io.close(()=>server.close(()=>resolve()));})};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const{server}=createGameServer();const port=Number(process.env.PORT)||3000;
 server.listen(port,'0.0.0.0',()=>console.log(`MuDang: Zombie Cats Online — http://localhost:${port}`));
}
