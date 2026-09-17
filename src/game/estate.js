import {randomInt,randomUUID} from 'node:crypto';
const names=['ประตูเมือง','ตรอกปลาทู','คาเฟ่อุ้งเท้า','ข่าวเมือง','ตลาดไหมพรม','ค่าดูแลเมือง','สวนแมว','ร้านขนมนุ่ม','โรงแรมหนวด','ข่าวเมือง','ท่าเรือมุก','ตลาดปะการัง','เทศกาลแมว','สวนจันทรา','หอชมดาว','ข่าวเมือง','ร้านผลึก','ถนนประกาย','พักเหนื่อย','สวนเมฆ','คฤหาสน์สายลม','ข่าวเมือง','นครทอง','หอเก้าชีวิต'];
const groups={1:0,2:0,4:0,7:1,8:1,10:2,11:2,13:3,14:3,16:4,17:4,19:5,20:5,22:6,23:6};
export const ESTATE_COLORS=['#eaa878','#f3cb71','#67cddd','#a99bf0','#83d8a7','#e697c5','#f0a25d'];
const log=(r,m)=>{r.log.unshift({id:randomUUID(),at:Date.now(),type:'info',message:m});r.log=r.log.slice(0,40);};
const fail=m=>{throw new Error(m);};
export function startEstate(r){r.crystal=null;Object.assign(r,{phase:'playing',turnIndex:0,turnNumber:1,turnDeadline:Date.now()+60000,winnerToken:null,deck:[],discard:[],log:[]});r.estate={round:1,stage:'roll',dice:[],debt:null,message:'ทอยลูกเต๋าเพื่อเริ่มเดินทาง',winnerIds:[],tiles:names.map((name,id)=>{const group=groups[id];return {id,name,type:group!==undefined?'land':[3,9,15,21].includes(id)?'event':id===5?'tax':id===0?'start':id===12?'bonus':'rest',group:group??null,price:group===undefined?0:120+group*60,buildCost:80+(group??0)*20,baseRent:25+(group??0)*12,ownerId:null,level:0};})};for(const p of r.players){Object.assign(p,{hp:1,maxHp:1,hand:[],peek:[],eliminated:false,crystal:null});p.estate={cash:1500,position:0};}log(r,'เมืองแมวเศรษฐีเริ่มแล้ว — เงินเริ่มต้นคนละ 1,500 เหรียญ');return r;}
const owned=(r,p)=>r.estate.tiles.filter(t=>t.ownerId===p.id);
export const estateWorth=(r,p)=>p.estate.cash+owned(r,p).reduce((n,t)=>n+t.price+t.level*t.buildCost,0);
const liquid=(r,p)=>p.estate.cash+owned(r,p).reduce((n,t)=>n+Math.floor((t.price+t.level*t.buildCost)/2),0);
const complete=(r,t)=>t.ownerId&&r.estate.tiles.filter(x=>x.type==='land'&&x.group===t.group).every(x=>x.ownerId===t.ownerId);
export const estateRent=(r,t)=>t.baseRent*(1+t.level*2)*(complete(r,t)?2:1)*(1+Math.floor((r.estate.round-1)/10));
export function finishEstate(r){const alive=r.players.filter(p=>!p.eliminated);const max=Math.max(...alive.map(p=>estateWorth(r,p)));const winners=alive.filter(p=>estateWorth(r,p)===max);r.phase='finished';r.turnDeadline=null;r.estate.winnerIds=winners.map(p=>p.id);r.winnerToken=winners[0]?.token??null;log(r,`${winners.map(p=>p.name).join(' และ ')} ชนะเมืองแมวเศรษฐี`);}
export function endEstate(r){if(r.phase!=='playing')return;if(r.players.filter(p=>!p.eliminated).length<=1){finishEstate(r);return;}let next=r.turnIndex;do{next=(next+1)%r.players.length;}while(r.players[next].eliminated);if(next<=r.turnIndex){if(r.estate.round>=30){finishEstate(r);return;}r.estate.round++;}r.turnIndex=next;r.turnNumber++;r.turnDeadline=Date.now()+60000;r.estate.stage='roll';r.estate.debt=null;r.estate.dice=[];r.estate.message=`ถึงตาของ ${r.players[next].name}`;log(r,r.estate.message);}
export function releaseEstate(r,p){if(!r.estate)return;for(const t of owned(r,p)){t.ownerId=null;t.level=0;}if(r.estate.debt?.creditorId===p.id)r.estate.debt.creditorId=null;}
function bankrupt(r,p){const d=r.estate.debt;const creditor=r.players.find(x=>x.id===d?.creditorId&&!x.eliminated);if(creditor)creditor.estate.cash+=p.estate.cash;p.estate.cash=0;p.eliminated=true;p.hp=0;releaseEstate(r,p);r.estate.debt=null;log(r,`${p.name} ล้มละลาย ที่ดินคืนให้เมือง`);endEstate(r);}
function settle(r,p){const d=r.estate.debt;if(!d)return;if(p.estate.cash>=d.amount){p.estate.cash-=d.amount;const q=r.players.find(x=>x.id===d.creditorId&&!x.eliminated);if(q)q.estate.cash+=d.amount;log(r,`${p.name} จ่าย ${d.amount} เหรียญ${q?' ให้ '+q.name:''}`);r.estate.debt=null;}else if(liquid(r,p)<d.amount){for(const t of [...owned(r,p)]){p.estate.cash+=Math.floor((t.price+t.level*t.buildCost)/2);t.ownerId=null;t.level=0;}bankrupt(r,p);}}
function charge(r,p,amount,creditorId=null){r.estate.debt={amount,creditorId};settle(r,p);}
export function actEstate(r,p,a,random=()=>randomInt(1_000_000)/1_000_000){
 const s=r.estate;if(!a||typeof a.action!=='string')fail('คำสั่งไม่ถูกต้อง');
 if(a.action==='sell'){const t=s.tiles.find(x=>x.id===a.tileId&&x.ownerId===p.id);if(!t)fail('ขายได้เฉพาะที่ดินของคุณ');const value=Math.floor((t.price+t.level*t.buildCost)/2);p.estate.cash+=value;t.ownerId=null;t.level=0;log(r,`${p.name} ขาย ${t.name} คืนเมือง ${value} เหรียญ`);settle(r,p);return r;}
 if(a.action==='surrender'){bankrupt(r,p);return r;}
 if(s.debt)fail('ขายที่ดินให้พอชำระหนี้ หรือยอมแพ้');
 if(a.action==='roll'){
 if(s.stage!=='roll')fail('ทอยไปแล้ว');s.dice=[1+Math.floor(random()*6),1+Math.floor(random()*6)];const steps=s.dice[0]+s.dice[1],pos=p.estate.position+steps;if(pos>=24){p.estate.cash+=250;log(r,`${p.name} ผ่านประตูเมือง รับ 250 เหรียญ`);}p.estate.position=pos%24;s.stage='manage';const t=s.tiles[p.estate.position];s.message=`${p.name} ทอย ${s.dice.join(' + ')} → ${t.name}`;log(r,s.message);
 if(t.type==='land'&&t.ownerId&&t.ownerId!==p.id)charge(r,p,estateRent(r,t),t.ownerId);
 else if(t.type==='tax')charge(r,p,150);
 else if(t.type==='bonus'){p.estate.cash+=100;log(r,'เทศกาลแมว รับ 100 เหรียญ');}
 else if(t.type==='event'){const events=[['ขายงานฝีมือ',180],['ซ่อมหลังคา',-120],['รางวัลเมืองน่าอยู่',100],['ค่าจัดส่งสินค้า',-80],['ลูกค้าเหมาร้าน',220],['ค่าทำความสะอาด',-160]];const [label,value]=events[Math.floor(random()*events.length)];s.message=`ข่าวเมือง: ${label} ${value>0?'รับ':'จ่าย'} ${Math.abs(value)} เหรียญ`;log(r,s.message);if(value>0)p.estate.cash+=value;else charge(r,p,-value);}
 }else if(a.action==='buy'){const t=s.tiles[p.estate.position];if(s.stage!=='manage'||t.type!=='land'||t.ownerId)fail('ซื้อได้เฉพาะที่ดินว่างที่ยืนอยู่หลังทอย');if(p.estate.cash<t.price)fail('เงินไม่พอ');p.estate.cash-=t.price;t.ownerId=p.id;log(r,`${p.name} ซื้อ ${t.name} ราคา ${t.price}`);
 }else if(a.action==='build'){const t=s.tiles.find(x=>x.id===a.tileId);if(!t||t.ownerId!==p.id||!complete(r,t)||t.level>=3)fail('ต้องเป็นเจ้าของครบย่าน และสร้างได้สูงสุด 3 ระดับ');if(p.estate.cash<t.buildCost)fail('เงินไม่พอสร้างร้าน');p.estate.cash-=t.buildCost;t.level++;log(r,`${p.name} สร้างร้านที่ ${t.name} ระดับ ${t.level}`);
 }else if(a.action==='end'){if(s.stage!=='manage')fail('ต้องทอยก่อนจบเทิร์น');endEstate(r);
 }else fail('ไม่รู้จักคำสั่ง');return r;
}
export function timeoutEstate(r){const p=r.players[r.turnIndex],turn=r.turnNumber;if(r.estate.stage==='roll')actEstate(r,p,{action:'roll'});if(r.phase!=='playing'||r.turnNumber!==turn)return;if(r.estate.debt){for(const t of [...owned(r,p)].sort((a,b)=>a.price+a.level*a.buildCost-b.price-b.level*b.buildCost)){actEstate(r,p,{action:'sell',tileId:t.id});if(!r.estate.debt||r.phase!=='playing'||r.turnNumber!==turn)break;}}if(r.phase==='playing'&&r.turnNumber===turn)endEstate(r);}
export function publicEstate(r){if(!r.estate)return null;return {...r.estate,tiles:r.estate.tiles.map(t=>({...t,color:ESTATE_COLORS[t.group]??'#697b88',rent:t.type==='land'?estateRent(r,t):0,canBuild:!!complete(r,t)&&t.level<3}))};}
