import test from 'node:test';
import assert from 'node:assert/strict';
import {listPublicRooms} from '../src/game/room-browser.js';
const make=(code,count=1,extra={})=>({code,listed:true,phase:'lobby',mode:'boom',createdAt:1,players:Array.from({length:count},(_,i)=>({name:'P'+i,host:i===0,connected:true,token:'private-secret',hand:['fuse-kit']})),...extra});
test('full rooms are visible but not joinable; empty and private rooms are omitted',()=>{const r=listPublicRooms(new Map([['FULL',make('FULL',6)],['OFF',make('OFF',1,{players:[{connected:false}]})],['HIDE',make('HIDE',1,{listed:false})]]));assert.equal(r.length,1);assert.equal(r[0].joinable,false);assert.equal(r[0].playerCount,6);assert.equal(JSON.stringify(r).includes('private-secret'),false);assert.equal(JSON.stringify(r).includes('fuse-kit'),false);});
test('listing is bounded and places open lobbies before active games',()=>{const rooms=new Map(Array.from({length:120},(_,i)=>['R'+i,make('R'+i,1,{createdAt:i,phase:i===119?'playing':'lobby'})]));const r=listPublicRooms(rooms);assert.equal(r.length,100);assert.equal(r[0].code,'R118');});
