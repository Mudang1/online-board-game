import {renderCrystal} from './crystal-ui.js';
const $=s=>document.querySelector(s);
const socket=io();
let chosenMode='zombie', publicRooms=[], roomsLoading=false, pendingVisibility=null;
let state=null, selected=null, busy=false, replaced=false, clockOffset=0, shownWinner=null, toastTimer;
let saved;try{saved=JSON.parse(sessionStorage.getItem('mudang-session')||'null');}catch{saved=null;}
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const portraits=['cat-toxic','cat-punk','cat-ghost'];
const portrait=p=>`/assets/${p.zombie?'cat-toxic':portraits[p.seat%3]}.svg`;
const labels={attack:'โจมตี',defense:'ป้องกัน',heal:'รักษา',trick:'กลลวง',infection:'แพร่เชื้อ',utility:'เกราะชีวิต',hazard:'ระเบิด',rescue:'กู้ภัย',escape:'หลบหนี',pressure:'กดดัน',vision:'ล่วงหน้า',shuffle:'สับไพ่',steal:'ขโมย'};
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.remove('hidden');toastTimer=setTimeout(()=>$('#toast').classList.add('hidden'),3500);}
function persist(value){saved=value;try{if(value)sessionStorage.setItem('mudang-session',JSON.stringify(value));else sessionStorage.removeItem('mudang-session');}catch{toast('เบราว์เซอร์ไม่อนุญาตให้จำห้อง เมื่อรีเฟรชอาจต้องเข้าห้องใหม่');}}
function connection(){const active=socket.connected&&!replaced;$('#connection').textContent=active?'● ออนไลน์':replaced?'เปิดที่นั่งนี้ในหน้าต่างอื่นแล้ว':'○ กำลังเชื่อมต่อใหม่';$('#connection').classList.toggle('offline',!active);}
async function request(event,payload={}){
 if(!socket.connected||replaced)throw new Error('ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์');
 return new Promise((resolve,reject)=>socket.timeout(5000).emit(event,payload,(error,response)=>{if(error)return reject(new Error('เซิร์ฟเวอร์ไม่ตอบกลับ กรุณารอเชื่อมต่อใหม่'));if(!response?.ok)return reject(new Error(response?.error||'ทำรายการไม่สำเร็จ'));resolve(response);}));
}
async function act(event,extra={}){if(busy||!state)return;busy=true;render();try{await request(event,{code:state.room.code,turnNumber:state.room.turnNumber,...extra});}catch(e){toast(e.message);}finally{busy=false;selected=null;if($('#targets').open)$('#targets').close();render();}}
function enter(r){persist({code:r.code,token:r.token});$('#entryError').textContent='';}
$('#entryForm').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;$('#create').disabled=true;try{enter(await request('create-room',{name:$('#name').value,mode:chosenMode,listed:$('#listed').checked}));}catch(e){$('#entryError').textContent=e.message;}finally{busy=false;$('#create').disabled=false;render();}};
$('#join').onclick=async()=>{if(!$('#name').reportValidity()||busy)return;busy=true;$('#join').disabled=true;try{enter(await request('join-room',{name:$('#name').value,code:$('#code').value.trim().toUpperCase()}));}catch(e){$('#entryError').textContent=e.message;}finally{busy=false;$('#join').disabled=false;render();}};
$('#code').oninput=e=>e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'');
async function copy(){const code=state?.room.code;if(!code)return;try{await navigator.clipboard.writeText(code);toast('คัดลอกรหัส '+code+' แล้ว');}catch{toast('รหัสห้อง: '+code);}}
$('#copy').onclick=copy;$('#copyGame').onclick=copy;
$('#ready').onclick=()=>act('ready');$('#start').onclick=()=>act('start-game');$('#deck').onclick=$('#draw').onclick=()=>act('draw');$('#restart').onclick=()=>act('restart');
$('#leave').onclick=async()=>{if(!state)return;if(state.room.phase==='playing'&&!confirm('ออกจากห้องและยอมแพ้เกมนี้?'))return;try{await request('leave-room',{code:state.room.code});persist(null);state=null;shownWinner=null;$('#winner').close();render();refreshRooms();}catch(e){toast(e.message);}};
$('#rulesOpen').onclick=()=>$('#rules').showModal();$('#rulesClose').onclick=()=>$('#rules').close();$('#cancelTarget').onclick=()=>{selected=null;$('#targets').close();};$('#winnerClose').onclick=()=>$('#winner').close();
$('#chatForm').onsubmit=async e=>{e.preventDefault();const text=$('#chat').value.trim();if(!text||!state)return;try{await request('chat',{code:state.room.code,text});$('#chat').value='';}catch(e){toast(e.message);}};
function stats(p){if(state?.room.mode==='boom')return `<span class="stat-chip">${p.eliminated?'ตกรอบ':'ยังรอด'}</span>`;return `<span class="stat-chip hp">♥ ${p.hp}/${p.maxHp}</span><span class="stat-chip">เกราะ ${p.guard}</span><span class="stat-chip infection">☣ ${p.infection}/3</span>${p.extraLife?`<span class="stat-chip">✦ ${p.extraLife}</span>`:''}`;}
function selectCard(card){if(!state||busy||card.target==='passive')return;if(card.target==='opponent'){selected={card,turn:state.room.turnNumber};$('#targetTitle').textContent=card.name+' · เลือกเป้าหมาย';$('#targetList').innerHTML=state.room.players.filter(p=>p.id!==state.me.id&&!p.eliminated).map(p=>`<button class="target-btn" data-target="${p.id}"><img src="${portrait(p)}" alt=""><span><b>${esc(p.name)}</b><small>${state.room.mode==='boom'?`ไพ่ ${p.handCount} ใบ`:`HP ${p.hp} · เกราะ ${p.guard}`}</small></span></button>`).join('');$('#targetList').querySelectorAll('button').forEach(b=>b.onclick=()=>act('play-card',{cardId:card.id,targetId:b.dataset.target}));$('#targets').showModal();}else act('play-card',{cardId:card.id});}
function render(){
 renderMode();
 connection();$('#browseRooms').classList.toggle('hidden',!!state);$('#landing').classList.toggle('hidden',!!state);$('#leave').classList.toggle('hidden',!state);
 $('#roomScreen').classList.toggle('hidden',!state||state.room.phase!=='lobby');$('#gameScreen').classList.toggle('hidden',!state||state.room.phase==='lobby');
 if(!state)return;
 const {room:r,me}=state,p=r.players.find(p=>p.id===me.id);if(!p)return;
 const boom=r.mode==='boom',crystal=r.mode==='crystal';
 $('#cgBoard').classList.toggle('hidden',!crystal);
 $('.table-shell').classList.toggle('hidden',crystal);
 $('.self-panel').classList.toggle('hidden',crystal);
 const myTurn=r.phase==='playing'&&r.currentPlayerId===me.id&&!p.eliminated;
 const enabled=socket.connected&&!replaced&&!busy;
 if(selected&&(selected.turn!==r.turnNumber||!myTurn)){selected=null;$('#targets').close();}
 if(r.phase==='lobby'){
   $('#roomListed').checked=pendingVisibility??r.listed;$('#roomListed').disabled=!p.host||!enabled;$('#roomKind').textContent=r.listed?'PUBLIC ROOM':'PRIVATE ROOM';$('#roomVisibilityText').textContent=r.listed?'ห้องสาธารณะ · แสดงในรายการให้คนอื่นกดเข้าร่วม':'ห้องส่วนตัว · เข้าด้วยรหัสเท่านั้น';
   shownWinner=null;$('#winner').close();$('#roomCode').textContent=r.code;$('#seatCount').textContent=`${r.players.length} / 6`;
   $('#seats').innerHTML=r.players.map(x=>`<div class="seat ${x.ready?'ready':''}"><img src="${portrait(x)}" alt=""><div class="seat-copy"><strong>${esc(x.name)} ${x.id===me.id?'<em>คุณ</em>':''}</strong><small>${x.host?'เจ้าของห้อง · ':''}${x.connected?'ออนไลน์':'หลุดการเชื่อมต่อ'}</small></div><span class="ready-state">${!x.connected&&p.host?`<button class="quiet" data-remove="${x.id}">นำออก ×</button>`:x.ready?'✓ พร้อม':'รอพร้อม'}</span></div>`).join('')+Array.from({length:6-r.players.length},()=>'<div class="seat empty-seat"><span>＋</span><small>รอเพื่อนเข้าร่วม…</small></div>').join('');
   $('#seats').querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>act('remove-offline',{playerId:b.dataset.remove}));
   $('#ready').textContent=p.ready?'✓ พร้อมแล้ว · ยกเลิก':'พร้อมเล่น';$('#ready').disabled=!enabled;
   $('#start').classList.toggle('hidden',!p.host);$('#start').disabled=!enabled||r.players.length<2||!r.players.every(p=>p.ready&&p.connected);
   $('#lobbyHint').textContent=p.host?'ทุกคนกดพร้อม แล้วคุณเริ่มเกมได้เลย':'ส่งรหัสให้เพื่อน แล้วรอเจ้าของห้องเริ่มเกม';return;
 }
 $('#gameRoom').textContent=(r.listed?'PUBLIC ROOM / ':'PRIVATE ROOM / ')+r.code;$('#turnNumber').textContent=`TURN ${String(r.turnNumber).padStart(2,'0')}${r.mode==='zombie'&&r.turnNumber>100?' · ราตรีมรณะ':''}`;
 const current=r.players.find(p=>p.id===r.currentPlayerId);$('#turnLabel').textContent=r.phase==='finished'?'จบเกมรอบนี้':myTurn?'ตาของคุณ!':`ตาของ ${current?.name??'—'}`;$('#turnDot').classList.toggle('mine',myTurn);
 if(crystal){$('#peekPanel').classList.add('hidden');renderCrystal(state,{canAct:enabled&&myTurn,send:payload=>act('crystal-action',payload),chat:async text=>{try{await request('chat',{code:r.code,text});}catch(e){toast(e.message);}},esc});showWinner(r,p,enabled);tick();return;}
 $('#opponents').innerHTML=r.players.filter(x=>x.id!==me.id).map(x=>`<div class="opponent-card ${x.zombie?'zombie':''} ${x.eliminated?'eliminated':''} ${x.id===r.currentPlayerId&&r.phase==='playing'?'active-turn':''}"><img src="${portrait(x)}" alt=""><div class="opponent-copy"><b>${esc(x.name)}</b><small>${x.eliminated?'ถูกกำจัด':x.connected?(x.zombie?'ซอมบี้':'ผู้รอดชีวิต'):'ออฟไลน์'} · ${x.handCount} ใบ</small></div><div class="mini-bars">${stats(x)}</div></div>`).join('');
 $('#deckCount').textContent=r.deckCount;$('#deck').disabled=$('#draw').disabled=!enabled||!myTurn;
 $('#discard').innerHTML=r.topDiscard?`<img src="/assets/cards/${r.topDiscard.id}.svg" alt="${esc(r.topDiscard.name)}"><div class="discard-caption">${esc(r.topDiscard.name)}</div><span>${r.discardCount}</span>`:'<div class="discard-art">✦</div><small>กองทิ้ง</small>';
 $('#eventBanner').textContent=r.log[0]?.message??'';
 $('#log').innerHTML=r.log.slice(0,25).map(x=>`<div class="log-item log-${esc(x.type)}"><span></span><p>${esc(x.message)}</p></div>`).join('');
 $('#selfStats').innerHTML=`<img src="${portrait(p)}" alt=""><div><b>${esc(p.name)} <span class="you-tag">คุณ</span></b><small>${p.eliminated?'ถูกกำจัด · รับชมต่อได้':boom?'Boom Cats · เก็บ Fuse Kit ไว้ให้ดี':p.zombie?'ซอมบี้ · โจมตี +1 / จบเทิร์นเสีย HP':'ผู้รอดชีวิต'}</small></div>${stats(p)}`;
 $('#handHint').textContent=myTurn?(boom?`เหลือ ${p.actionPoints} Action · ต้องจั่ว ${r.drawsRemaining} ใบ`:(p.actionPoints?'เลือกไพ่ 1 ใบ หรือจั่วเพื่อผ่าน':'ใช้ Action แล้ว · จั่วเพื่อจบเทิร์น')):'รอเทิร์นของคุณ';
 $('#draw').textContent=boom?`จั่วไพ่ · เหลือ ${r.drawsRemaining} ใบ →`:'จั่วไพ่ · จบเทิร์น →';
 $('#deck').setAttribute('aria-label',boom?'จั่วไพ่ 1 ใบ':'จั่วไพ่และจบเทิร์น');
 $('#peekPanel').classList.toggle('hidden',!boom||!me.peek?.length);
 $('#peekCards').innerHTML=(me.peek??[]).map((c,i)=>`<div class="peek-card"><small>${i===0?'จั่วใบนี้ก่อน':`ใบที่ ${i+1}`}</small><img src="/assets/cards/${c.id}.svg" alt=""><b>${esc(c.name)}</b></div>`).join('');
 $('#hand').innerHTML=me.hand.map((c,i)=>`<button class="game-card family-${c.family}" data-index="${i}" title="${esc(c.name+': '+c.text)}" style="--i:${i};--n:${me.hand.length}" ${!enabled||!myTurn||!p.actionPoints||c.target==='passive'?'disabled':''}><div class="card-top"><small>${labels[c.family]}</small><span>${c.target==='passive'?'AUTO':'1'}</span></div><div class="card-art"><img src="/assets/cards/${c.id}.svg" alt=""></div><div class="card-copy"><strong>${esc(c.name)}</strong><p>${esc(c.text)}</p></div></button>`).join('');$('#hand').querySelectorAll('button').forEach(b=>b.onclick=()=>selectCard(me.hand[Number(b.dataset.index)]));
 showWinner(r,p,enabled);
 tick();
}
function showWinner(r,p,enabled){
 if(r.phase==='finished'){
   const winner=r.players.find(x=>x.id===r.winnerId);$('#winnerText').textContent=r.mode==='crystal'&&r.crystal?.winnerIds.length?r.players.filter(x=>r.crystal.winnerIds.includes(x.id)).map(x=>x.name).join(' และ ')+' ชนะ!':winner?`${winner.name} ชนะ!`:'ไม่มีผู้รอดชีวิต';$('#winnerHint').textContent=p.host?'รวมแก๊งแล้วเริ่มรอบใหม่ได้เลย':'รอเจ้าของห้องเริ่มรอบใหม่';$('#restart').classList.toggle('hidden',!p.host);$('#restart').disabled=!enabled;
   const key=r.code+':'+r.turnNumber;if(shownWinner!==key){shownWinner=key;$('#winner').showModal();}
 }
}
function tick(){if(!state)return;const r=state.room;$('#countdown').textContent=r.phase==='playing'?Math.max(0,Math.ceil((r.turnDeadline-Date.now()-clockOffset)/1000))+'s':'—';}
setInterval(tick,250);
socket.on('state',next=>{const previous=state;state=next;clockOffset=next.room.serverNow-Date.now();render();if(previous&&previous.room.phase==='playing'&&previous.room.log[0]?.id!==next.room.log[0]?.id){const type=next.room.log[0]?.type;const table=$('.table-shell');table.dataset.effect=type;setTimeout(()=>{delete table.dataset.effect;},650);}});
socket.on('connect',async()=>{connection();if(!saved)refreshRooms();if(saved&&!replaced){try{enter(await request('reconnect-room',saved));}catch(e){persist(null);state=null;render();$('#entryError').textContent=e.message;}}else render();});
socket.on('disconnect',()=>{connection();render();});socket.on('connect_error',()=>connection());
socket.on('session-replaced',()=>{replaced=true;persist(null);state=null;render();$('#entryError').textContent='ที่นั่งนี้ถูกเปิดในหน้าต่างอื่นแล้ว กรุณาปิดหน้าต่างนี้';});

function renderMode(){
 const mode=state?.room.mode??chosenMode,boom=mode==='boom',crystal=mode==='crystal';
 document.body.dataset.mode=mode;
 const mine=state?.room.players.find(p=>p.id===state.me.id);
 document.querySelectorAll('[data-mode]').forEach(b=>{
   if(b===document.body)return;
   const selected=b.dataset.mode===mode;
   b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));
   b.disabled=!!state&&(!mine?.host||state.room.phase!=='lobby'||busy||!socket.connected);
 });
 $('#modeName').textContent=boom?'Boom Cats · ระวังแมวระเบิด':'Zombie Cats · แมวซอมบี้';
 $('#modeHint').textContent=mine?.host?'เจ้าของห้องเลือกเกมได้ · เปลี่ยนแล้วทุกคนต้องกดพร้อมใหม่':'เจ้าของห้องเป็นคนเลือกโหมด · คุณเข้าร่วมตามกติกาของห้อง';
 $('#tableTitle').textContent=boom?'โต๊ะเสี่ยงระเบิด':'โต๊ะล่าราตรี';
 $('#heroTitle').innerHTML=boom?'แค่จั่วอีกใบ.<br>คงจะ<span>ไม่ระเบิด?</span>':'แมวน่ารัก.<br>แผนการ<span>ไม่น่ารัก.</span>';
 $('#heroDescription').innerHTML=boom?'วัดใจทุกครั้งที่จั่ว หลบระเบิดให้ทัน<br>ป่วนเพื่อนด้วยไพ่ แล้วรอดเป็นแมวตัวสุดท้าย':'รวมแก๊งแมว เปิดไพ่ป่วน แล้วเอาชีวิตรอด<br>ปาร์ตี้คืนนี้… มีผู้ชนะได้เพียงหนึ่งเดียว';
 $('#heroCat').src=boom?'/assets/boom-cat-model.svg':'/assets/zombie-cat-model.svg';
 $('#heroCat').alt=boom?'แมวระเบิด Boom Cats':'แมวซอมบี้ Zombie Cats';
 $('#heroCard').src=boom?'/assets/cards/live-wire.svg':'/assets/cards/viral-bite.svg';
 $('#heroCard').alt=boom?'Live Wire การ์ดระเบิด':'Viral Bite การ์ดแพร่เชื้อ';
 $('#lobbyRuleTitle').innerHTML=boom?'จั่วหนึ่งใบ.<br>ลุ้นทั้งโต๊ะ.':'หนึ่งเทิร์น.<br>หลายทางป่วน.';
 $('#lobbyRuleText').innerHTML=boom?'เล่นไพ่ได้สูงสุด 3 ใบต่อเทิร์น แล้วจั่ว<br>ข้ามจั่ว ดูไพ่ล่วงหน้า หรือส่งภาระให้เพื่อน<br>เหลือแมวตัวสุดท้ายคือผู้ชนะ':'เล่นไพ่ได้ 1 ใบ แล้วจั่วเพื่อจบเทิร์น<br>โจมตี ป้องกัน รักษา หรือแพร่เชื้อ<br>เหลือรอดเป็นตัวสุดท้ายก็ชนะ!';
 $('#lobbyRuleNote').innerHTML=boom?'จั่วระเบิด + ไม่มี Fuse Kit → ตกรอบ<br>Fuse Kit ช่วยชีวิตอัตโนมัติ 1 ครั้ง':'ติดเชื้อครบ 3 → กลายเป็นซอมบี้<br>โจมตี +1 แต่เสีย 1 HP เมื่อจบเทิร์น';
 $('#rulesTitle').textContent=boom?'วิธีเล่น Boom Cats':'วิธีเล่น Zombie Cats';
 $('#boomRules').classList.toggle('hidden',!boom);$('#zombieRules').classList.toggle('hidden',boom||crystal);$('#crystalRules').classList.toggle('hidden',!crystal);
 if(crystal){
 $('#modeName').textContent='Crystal Guild · สำนักผลึก';$('#tableTitle').textContent='กระดานสำนักผลึก';
 $('#heroTitle').innerHTML='อัญมณีหนึ่งเม็ด.<br>สร้างได้<span>ทั้งอาณาจักร.</span>';$('#heroDescription').innerHTML='ร่วมสำนักของแมว MuDang สะสมอัญมณี<br>พัฒนาการ์ด แล้วแข่งสร้างชื่อให้สำนักของคุณ';
 $('#heroCat').src='/assets/crystal-mage.svg';$('#heroCat').alt='มูจันทร์ นักประดิษฐ์';$('#heroCard').src='/assets/crystal-smith.svg';$('#heroCard').alt='มูแดง ช่างผลึก';
 $('#lobbyRuleTitle').innerHTML='เก็บผลึก.<br>สร้างความยิ่งใหญ่.';$('#lobbyRuleText').innerHTML='เก็บอัญมณี ซื้อการ์ดเพิ่มส่วนลดถาวร<br>จองไพ่ที่ต้องการ และทำภารกิจของสำนัก<br>ใครสะสมชื่อเสียงสูงสุดเป็นผู้ชนะ';
 $('#lobbyRuleNote').innerHTML='เป้าหมาย 18 แต้ม · เล่นให้ครบก่อนตัดสิน<br>1 Action ต่อเทิร์น · ถืออัญมณีได้ 10 เม็ด';$('#rulesTitle').textContent='วิธีเล่น Crystal Guild';
 }
}
document.querySelectorAll('.mode-choice').forEach(b=>b.onclick=()=>{
 if(state){if(b.dataset.mode!==state.room.mode)act('set-mode',{mode:b.dataset.mode});}
 else{chosenMode=b.dataset.mode;renderMode();}
});
renderMode();

$('#roomListed').onchange=async()=>{pendingVisibility=$('#roomListed').checked;await act('set-visibility',{listed:pendingVisibility});pendingVisibility=null;render();};
function renderRooms(){
 const query=$('#roomSearch').value.trim().toLowerCase(),mode=$('#roomModeFilter').value,only=$('#joinableOnly').checked;
 const matches=publicRooms.filter(r=>(mode==='all'||r.mode===mode)&&(!only||r.joinable)&&(!query||(r.hostName+' '+r.code).toLowerCase().includes(query)));
 $('#roomTotal').textContent=matches.length;
 $('#roomList').innerHTML=matches.length?matches.map(r=>`<article class="room-tile ${r.mode==='crystal'?'crystal-room':r.mode==='boom'?'boom-room':''}"><div class="room-tile-top"><img src="/assets/${r.mode==='crystal'?'crystal-mage':r.mode==='boom'?'cards/live-wire':'cat-toxic'}.svg" alt=""><div><strong>${esc(r.hostName)}</strong><small>${r.mode==='crystal'?'Crystal Guild':r.mode==='boom'?'Boom Cats':'Zombie Cats'}</small></div><span class="room-phase ${r.joinable?'can-join':''}">${r.phase==='playing'?'กำลังเล่น':r.phase==='finished'?'จบเกมแล้ว':r.playerCount>=r.maxPlayers?'ห้องเต็ม':'รอผู้เล่น'}</span></div><div class="room-tile-meta"><span>รหัส <b>${esc(r.code)}</b></span><span>${r.playerCount}/${r.maxPlayers} คน · ออนไลน์ ${r.connectedCount}</span></div><button class="${r.joinable?'primary':'secondary'} room-join" data-room="${esc(r.code)}" ${!r.joinable||!socket.connected||busy?'disabled':''}>${r.joinable?'เข้าร่วมเล่น →':r.phase==='playing'?'รอรอบถัดไป':r.phase==='finished'?'รอเจ้าของห้องเปิดรอบใหม่':'ห้องเต็ม'}</button></article>`).join(''):`<div class="rooms-empty">${publicRooms.length?'ไม่พบห้องตามเงื่อนไข ลองเปลี่ยนตัวกรอง':'ยังไม่มีห้องสาธารณะ — สร้างห้องแล้วชวนเพื่อนมาเล่นได้เลย'}</div>`;
 $('#roomList').querySelectorAll('[data-room]').forEach(b=>b.onclick=()=>joinFromList(b.dataset.room));
}
async function refreshRooms(){
 if(state||roomsLoading||!socket.connected||replaced)return;
 roomsLoading=true;$('#refreshRooms').disabled=true;
 try{const result=await request('list-rooms',{});publicRooms=result.rooms;renderRooms();$('#roomListStatus').textContent='รายการล่าสุด · '+new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit',second:'2-digit'});}
 catch(e){$('#roomListStatus').textContent='โหลดรายการไม่สำเร็จ: '+e.message;}
 finally{roomsLoading=false;$('#refreshRooms').disabled=false;}
}
async function joinFromList(code){
 if(busy)return;
 if(!$('#name').value.trim()){$('#name').focus();$('#name').reportValidity();toast('ใส่ชื่อแมวของคุณก่อนเข้าร่วม');return;}
 busy=true;renderRooms();
 try{enter(await request('join-room',{code,name:$('#name').value}));}
 catch(e){toast(e.message);$('#entryError').textContent=e.message;}
 finally{busy=false;render();if(!state)refreshRooms();}
}
$('#refreshRooms').onclick=refreshRooms;
$('#roomSearch').oninput=renderRooms;$('#roomModeFilter').onchange=renderRooms;$('#joinableOnly').onchange=renderRooms;
setInterval(()=>{if(!document.hidden&&!state)refreshRooms();},5000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!state)refreshRooms();});

$('#browseRooms').onclick=()=>{$('#roomBrowser').scrollIntoView({behavior:'smooth',block:'start'});refreshRooms();};
