import {randomInt} from 'node:crypto';

export const BOOM_CARDS = {
 'live-wire':{id:'live-wire',name:'Live Wire',family:'hazard',target:'passive',actionCost:0,text:'จั่วเจอแล้วตกรอบ ถ้าไม่มี Fuse Kit ช่วยไว้'},
 'fuse-kit':{id:'fuse-kit',name:'Fuse Kit',family:'rescue',target:'passive',actionCost:0,text:'ใช้ช่วยชีวิตอัตโนมัติเมื่อจั่วเจอระเบิด 1 ครั้ง'},
 'rooftop-hop':{id:'rooftop-hop',name:'Rooftop Hop',family:'escape',target:'self',actionCost:1,text:'ข้ามการจั่ว 1 ใบ ถ้ายังติดภาระจั่วต้องเล่นต่อ'},
 'double-dare':{id:'double-dare',name:'Double Dare',family:'pressure',target:'self',actionCost:1,text:'จบเทิร์น ส่งภาระจั่วที่เหลือ +1 ให้คนถัดไป (สูงสุด 6)'},
 'night-vision':{id:'night-vision',name:'Night Vision',family:'vision',target:'self',actionCost:1,text:'ดูไพ่บนสุด 3 ใบคนเดียว ผลดูหมดอายุเมื่อสำรับเปลี่ยน'},
 'alley-mix':{id:'alley-mix',name:'Alley Mix',family:'shuffle',target:'self',actionCost:1,text:'สับไพ่ทั้งหมดที่เหลือในสำรับใหม่'},
 'sticky-paws':{id:'sticky-paws',name:'Sticky Paws',family:'steal',target:'opponent',actionCost:1,text:'ขโมยไพ่สุ่ม 1 ใบจากผู้เล่นเป้าหมาย'}
};
function shuffle(deck,random=()=>randomInt(0x1000000)/0x1000000){for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}return deck;}
export function clearPreviews(room){for(const p of room.players)p.peek=[];}
export function startBoomGame(room,random,api){
 const safe=shuffle(['rooftop-hop','double-dare','night-vision','alley-mix','sticky-paws'].flatMap(id=>Array(8).fill(id)),random);
 Object.assign(room,{phase:'playing',deck:[],discard:[],turnIndex:0,turnNumber:1,turnDeadline:Date.now()+60_000,winnerToken:null,log:[],drawsRemaining:1});
 for(const p of room.players)Object.assign(p,{hp:1,maxHp:1,infection:0,zombie:false,eliminated:false,guard:0,extraLife:0,actionPoints:3,peek:[],hand:['fuse-kit',...safe.splice(-4)]});
 room.deck=shuffle([...safe,'fuse-kit','fuse-kit',...Array(room.players.length-1).fill('live-wire')],random);
 api.pushLog(room,`Boom Cats เริ่มแล้ว — ${room.players[0].name} จั่วก่อน ระวังสายไฟระเบิด!`,'start');return room;
}
function finishDraw(room,api){room.drawsRemaining-=1;if(room.drawsRemaining<=0)api.advanceTurn(room);}
export function playBoomCard(room,player,cardId,targetToken,api){
 const card=BOOM_CARDS[cardId];
 if(!card||card.target==='passive')throw api.gameError('ไพ่ใบนี้ใช้เมื่อจั่วเจอเหตุการณ์เท่านั้น');
 const index=player.hand.indexOf(cardId);if(index<0)throw api.gameError('คุณไม่มีการ์ดใบนี้');
 if(player.actionPoints<1)throw api.gameError('ใช้ครบ 3 Action แล้ว ต้องจั่วไพ่');
 let target;
 if(card.target==='opponent'){target=room.players.find(p=>p.token===targetToken);if(!target||target===player||target.eliminated||!target.hand.length)throw api.gameError('เลือกผู้เล่นอื่นที่ยังมีไพ่และยังไม่ตกรอบ');}
 player.hand.splice(index,1);player.actionPoints--;room.discard.push(cardId);
 api.pushLog(room,`${player.name} ใช้ ${card.name}`,'trick');
 if(cardId==='night-vision')player.peek=room.deck.slice(-3).reverse();
 if(cardId==='alley-mix'){shuffle(room.deck);clearPreviews(room);}
 if(cardId==='sticky-paws')player.hand.push(target.hand.splice(randomInt(target.hand.length),1)[0]);
 if(cardId==='rooftop-hop')finishDraw(room,api);
 if(cardId==='double-dare'){const debt=Math.min(6,room.drawsRemaining+1);api.advanceTurn(room);if(room.phase==='playing'){room.drawsRemaining=debt;api.pushLog(room,`${room.players[room.turnIndex].name} ต้องจั่ว ${debt} ใบ`,'turn');}}
 return room;
}
export function drawBoomCard(room,player,api){
 const card=room.deck.pop();clearPreviews(room);
 if(card==='live-wire'){
   const kit=player.hand.indexOf('fuse-kit');
   if(kit>=0){player.hand.splice(kit,1);room.discard.push('fuse-kit');room.deck.splice(randomInt(room.deck.length+1),0,'live-wire');api.pushLog(room,`${player.name} เจอระเบิด! ใช้ Fuse Kit รอด และซ่อนระเบิดกลับในสำรับ`,'rescue');}
   else{room.discard.push(card);player.eliminated=true;player.hp=0;api.pushLog(room,`${player.name} จั่วเจอระเบิดและตกรอบ!`,'damage');}
 }else if(card){player.hand.push(card);api.pushLog(room,`${player.name} จั่วไพ่ปลอดภัย`,'draw');}
 else{player.eliminated=true;player.hp=0;api.pushLog(room,`${player.name} ไม่มีไพ่ให้จั่ว — ตกรอบจากแรงดันสุดท้าย`,'damage');}
 api.checkWinner(room);
 if(room.phase==='playing'){if(player.eliminated)api.advanceTurn(room);else finishDraw(room,api);}
 return card;
}
