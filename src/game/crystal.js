// Original MuDang economic card game. No third-party card text or artwork.
export const GEMS=['ember','tide','leaf','moon'];
export const GEM_NAMES={ember:'อำพันไฟ',tide:'มุกน้ำ',leaf:'หยกใบไม้',moon:'แก้วจันทร์',prism:'ผลึกสายรุ้ง'};
export const GUILDS={ember:{name:'มูแดง ช่างผลึก',art:'crystal-smith'},tide:{name:'มูคราม นักสำรวจ',art:'crystal-scout'},leaf:{name:'มูไผ่ ผู้พิทักษ์',art:'crystal-keeper'},moon:{name:'มูจันทร์ นักประดิษฐ์',art:'crystal-mage'}};
const zeros=()=>Object.fromEntries(GEMS.map(g=>[g,0]));
const sum=o=>Object.values(o).reduce((a,b)=>a+b,0);
function shuffle(a,random){for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export const CRYSTAL_CARDS={};
const patterns=[[[0,1,2,0],[1,1,1,1],[0,0,2,2],[0,3,0,1],[1,0,3,1],[0,2,1,2]],[[2,3,2,0],[0,4,2,1],[3,0,3,2],[1,2,1,4]],[[3,3,4,2],[0,5,4,3],[4,1,3,5]]];
const titles=[['เตาหลอม','ท่าเรือ','สวนผลึก','หอทดลอง'],['โรงงานแสง','เส้นทางมุก','ป่าพลังงาน','คลังดารา'],['นครประกาย','มหาสมุทรแก้ว','วิหารพฤกษา','ปราสาทจันทรา']];
for(let tier=1;tier<=3;tier++)for(let color=0;color<4;color++)for(let v=0;v<patterns[tier-1].length;v++){
 const id=`cg-${tier}-${color}-${v}`,gem=GEMS[color],cost=zeros();patterns[tier-1][v].forEach((n,i)=>cost[GEMS[(color+i)%4]]=n);
 CRYSTAL_CARDS[id]={id,tier,gem,name:`${titles[tier-1][color]} ${v+1}`,character:GUILDS[gem].name,art:`/assets/${GUILDS[gem].art}.svg`,points:tier===1?(v>=4?1:0):tier===2?2+(v%2):5+v,cost};
}
export const CRYSTAL_MISSIONS=[
 {id:'sun-foundry',name:'พันธสัญญาแสงอรุณ',art:'/assets/crystal-smith.svg',points:3,requires:{ember:4,tide:2,leaf:2,moon:0}},
 {id:'tide-library',name:'บันทึกมหาสมุทร',art:'/assets/crystal-scout.svg',points:3,requires:{ember:0,tide:4,leaf:2,moon:2}},
 {id:'moon-garden',name:'สวนใต้แสงจันทร์',art:'/assets/crystal-keeper.svg',points:3,requires:{ember:2,tide:0,leaf:3,moon:3}}
];
export function startCrystal(room,random,api){
 const decks=[1,2,3].map(t=>shuffle(Object.values(CRYSTAL_CARDS).filter(c=>c.tier===t).map(c=>c.id),random));
 const bank=Object.fromEntries(GEMS.map(g=>[g,room.players.length+3]));bank.prism=room.players.length+1;
 Object.assign(room,{phase:'playing',turnIndex:0,turnNumber:1,turnDeadline:Date.now()+60_000,winnerToken:null,deck:[],discard:[],log:[],drawsRemaining:0});
 room.crystal={bank,decks,market:decks.map(d=>[d.pop(),d.pop(),d.pop()]),missions:CRYSTAL_MISSIONS.map(m=>({...m,requires:{...m.requires}})),round:1,target:18,finalRound:false,winnerIds:[]};
 for(const p of room.players){Object.assign(p,{hp:1,maxHp:1,infection:0,zombie:false,guard:0,extraLife:0,eliminated:false,hand:[],peek:[],actionPoints:1});p.crystal={tokens:{...zeros(),prism:0},bonuses:zeros(),owned:[],reserved:[],missions:[],score:0};}
 api.pushLog(room,'Crystal Guild เริ่มแล้ว — เก็บอัญมณี พัฒนาสำนัก และแข่งถึง 18 แต้ม','start');return room;
}
function resolveScore(room,api){
 const ranked=room.players.filter(p=>!p.eliminated).sort((a,b)=>b.crystal.score-a.crystal.score||a.crystal.owned.length-b.crystal.owned.length||sum(a.crystal.tokens)-sum(b.crystal.tokens));
 const first=ranked[0];const winners=first?ranked.filter(p=>p.crystal.score===first.crystal.score&&p.crystal.owned.length===first.crystal.owned.length&&sum(p.crystal.tokens)===sum(first.crystal.tokens)):[];
 room.phase='finished';room.turnDeadline=null;room.winnerToken=first?.token??null;room.crystal.winnerIds=winners.map(p=>p.id);
 api.pushLog(room,`${winners.map(p=>p.name).join(' และ ')} ชนะ Crystal Guild ด้วย ${first?.crystal.score??0} แต้ม`,'win');
}
export function finishCrystalTurn(room,player,api){
 if(room.players.filter(p=>!p.eliminated).length<=1){resolveScore(room,api);return;}
 const s=room.crystal;
 if(!s.finalRound&&room.players.some(p=>!p.eliminated&&p.crystal.score>=s.target)){s.finalRound=true;api.pushLog(room,'เข้าสู่รอบสุดท้าย — เล่นให้ครบถึงที่นั่งสุดท้ายก่อนตัดสิน','turn');}
 let next=room.turnIndex;do{next=(next+1)%room.players.length;}while(room.players[next].eliminated);
 const wrapped=next<=room.turnIndex;
 if(wrapped&&(s.finalRound||s.round>=30)){resolveScore(room,api);return;}
 if(wrapped)s.round++;
 room.turnIndex=next;room.turnNumber++;room.turnDeadline=Date.now()+60_000;room.players[next].actionPoints=1;
 api.pushLog(room,`ถึงตาของ ${room.players[next].name}`,'turn');
}
function findMarket(room,id){if(typeof id!=='string'||!Object.hasOwn(CRYSTAL_CARDS,id))return null;for(let tier=0;tier<3;tier++){const slot=room.crystal.market[tier].indexOf(id);if(slot>=0)return {tier,slot};}return null;}
function removeMarket(room,position){const s=room.crystal;s.market[position.tier][position.slot]=s.decks[position.tier].pop()??null;}
function price(player,card){const paid={...zeros(),prism:0};for(const g of GEMS){const need=Math.max(0,card.cost[g]-player.crystal.bonuses[g]);paid[g]=Math.min(need,player.crystal.tokens[g]);paid.prism+=need-paid[g];}return paid;}
export function performCrystalAction(room,player,payload,api){
 const s=room.crystal,p=player.crystal,fail=api.gameError;
 if(!payload||typeof payload!=='object')throw fail('คำสั่งไม่ถูกต้อง');
 if(payload.action==='take'){
  const gems=payload.gems;if(!Array.isArray(gems)||gems.length<1||gems.length>3||gems.some(g=>!GEMS.includes(g)))throw fail('เลือกอัญมณีปกติ 1–3 สี หรือสีเดียว 2 เม็ด');
  const distinct=new Set(gems);if(distinct.size!==gems.length&&!(gems.length===2&&distinct.size===1))throw fail('เลือกได้ต่างสีกัน หรือสีเดียว 2 เม็ดเท่านั้น');
  const counts=zeros();for(const g of gems)counts[g]++;
  if(gems.length===2&&distinct.size===1&&s.bank[gems[0]]<4)throw fail('หยิบสีเดียว 2 เม็ดได้เมื่อกองมีอย่างน้อย 4');
  if(GEMS.some(g=>counts[g]>s.bank[g]))throw fail('อัญมณีในกองไม่พอ');
  if(sum(p.tokens)+gems.length>10)throw fail('ถืออัญมณีได้สูงสุด 10 เม็ด เลือกให้น้อยลงหรือซื้อการ์ด');
  for(const g of GEMS){s.bank[g]-=counts[g];p.tokens[g]+=counts[g];}
  api.pushLog(room,`${player.name} เก็บ ${gems.map(g=>GEM_NAMES[g]).join(' + ')}`,'draw');
 }else if(payload.action==='reserve'){
  const position=findMarket(room,payload.cardId);if(!position)throw fail('การ์ดนี้ไม่อยู่ในตลาดแล้ว');
  if(p.reserved.length>=3)throw fail('จองได้สูงสุด 3 ใบ');
  p.reserved.push(payload.cardId);removeMarket(room,position);
  if(s.bank.prism>0&&sum(p.tokens)<10){s.bank.prism--;p.tokens.prism++;}
  api.pushLog(room,`${player.name} จองการ์ด 1 ใบ`,'trick');
 }else if(payload.action==='buy'){
  const card=CRYSTAL_CARDS[payload.cardId],position=findMarket(room,payload.cardId),reserved=p.reserved.indexOf(payload.cardId);
  if(!card||(!position&&reserved<0))throw fail('เลือกการ์ดในตลาดหรือใบที่คุณจองไว้');
  const paid=price(player,card);if(paid.prism>p.tokens.prism)throw fail('อัญมณียังไม่พอซื้อการ์ดนี้');
  for(const g of [...GEMS,'prism']){p.tokens[g]-=paid[g];s.bank[g]+=paid[g];}
  if(position)removeMarket(room,position);else p.reserved.splice(reserved,1);
  p.owned.push(card.id);p.bonuses[card.gem]++;p.score+=card.points;
  api.pushLog(room,`${player.name} สร้าง ${card.name} (+${card.points} แต้ม)`,'heal');
  const mission=s.missions.find(m=>GEMS.every(g=>p.bonuses[g]>=m.requires[g]));
  if(mission){s.missions=s.missions.filter(m=>m.id!==mission.id);p.missions.push(mission.id);p.score+=mission.points;api.pushLog(room,`${player.name} ทำภารกิจ ${mission.name} (+${mission.points} แต้ม)`,'heal');}
 }else if(payload.action==='pass')api.pushLog(room,`${player.name} ผ่านเทิร์น`,'turn');
 else throw fail('ไม่รู้จักคำสั่งกระดาน');
 finishCrystalTurn(room,player,api);return room;
}
export function publicCrystal(room){const s=room.crystal;if(!s)return null;return {bank:{...s.bank},market:s.market.map(row=>row.map(id=>CRYSTAL_CARDS[id]??null)),deckCounts:s.decks.map(d=>d.length),missions:s.missions,round:s.round,target:s.target,finalRound:s.finalRound,winnerIds:s.winnerIds};}
export function publicCrystalPlayer(player){const p=player.crystal;if(!p)return null;return {tokens:{...p.tokens},bonuses:{...p.bonuses},score:p.score,owned:p.owned.map(id=>CRYSTAL_CARDS[id]),reservedCount:p.reserved.length,missions:p.missions.map(id=>CRYSTAL_MISSIONS.find(m=>m.id===id))};}
export function privateCrystal(player){if(!player.crystal)return null;return {reserved:player.crystal.reserved.map(id=>CRYSTAL_CARDS[id])};}
