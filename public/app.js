const $=s=>document.querySelector(s);
const socket=io();
let state=null, selected=null, busy=false, replaced=false, clockOffset=0, shownWinner=null, toastTimer;
let saved;try{saved=JSON.parse(sessionStorage.getItem('mudang-session')||'null');}catch{saved=null;}
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const portraits=['cat-toxic','cat-punk','cat-ghost'];
const portrait=p=>`/assets/${p.zombie?'cat-toxic':portraits[p.seat%3]}.svg`;
const labels={attack:'โจมตี',defense:'ป้องกัน',heal:'รักษา',trick:'กลลวง',infection:'แพร่เชื้อ',utility:'เกราะชีวิต'};
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.remove('hidden');toastTimer=setTimeout(()=>$('#toast').classList.add('hidden'),3500);}
function persist(value){saved=value;try{if(value)sessionStorage.setItem('mudang-session',JSON.stringify(value));else sessionStorage.removeItem('mudang-session');}catch{toast('เบราว์เซอร์ไม่อนุญาตให้จำห้อง เมื่อรีเฟรชอาจต้องเข้าห้องใหม่');}}
function connection(){const active=socket.connected&&!replaced;$('#connection').textContent=active?'● ออนไลน์':replaced?'เปิดที่นั่งนี้ในหน้าต่างอื่นแล้ว':'○ กำลังเชื่อมต่อใหม่';$('#connection').classList.toggle('offline',!active);}
async function request(event,payload={}){
 if(!socket.connected||replaced)throw new Error('ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์');
 return new Promise((resolve,reject)=>socket.timeout(5000).emit(event,payload,(error,response)=>{if(error)return reject(new Error('เซิร์ฟเวอร์ไม่ตอบกลับ กรุณารอเชื่อมต่อใหม่'));if(!response?.ok)return reject(new Error(response?.error||'ทำรายการไม่สำเร็จ'));resolve(response);}));
}
async function act(event,extra={}){if(busy||!state)return;busy=true;render();try{await request(event,{code:state.room.code,turnNumber:state.room.turnNumber,...extra});}catch(e){toast(e.message);}finally{busy=false;selected=null;if($('#targets').open)$('#targets').close();render();}}
function enter(r){persist({code:r.code,token:r.token});$('#entryError').textContent='';}
$('#entryForm').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;$('#create').disabled=true;try{enter(await request('create-room',{name:$('#name').value}));}catch(e){$('#entryError').textContent=e.message;}finally{busy=false;$('#create').disabled=false;render();}};
$('#join').onclick=async()=>{if(!$('#name').reportValidity()||busy)return;busy=true;$('#join').disabled=true;try{enter(await request('join-room',{name:$('#name').value,code:$('#code').value.trim().toUpperCase()}));}catch(e){$('#entryError').textContent=e.message;}finally{busy=false;$('#join').disabled=false;render();}};
$('#code').oninput=e=>e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'');
async function copy(){const code=state?.room.code;if(!code)return;try{await navigator.clipboard.writeText(code);toast('คัดลอกรหัส '+code+' แล้ว');}catch{toast('รหัสห้อง: '+code);}}
$('#copy').onclick=copy;$('#copyGame').onclick=copy;
$('#ready').onclick=()=>act('ready');$('#start').onclick=()=>act('start-game');$('#deck').onclick=$('#draw').onclick=()=>act('draw');$('#restart').onclick=()=>act('restart');
$('#leave').onclick=async()=>{if(!state)return;if(state.room.phase==='playing'&&!confirm('ออกจากห้องและยอมแพ้เกมนี้?'))return;try{await request('leave-room',{code:state.room.code});persist(null);state=null;shownWinner=null;$('#winner').close();render();}catch(e){toast(e.message);}};
$('#rulesOpen').onclick=()=>$('#rules').showModal();$('#rulesClose').onclick=()=>$('#rules').close();$('#cancelTarget').onclick=()=>{selected=null;$('#targets').close();};$('#winnerClose').onclick=()=>$('#winner').close();
$('#chatForm').onsubmit=async e=>{e.preventDefault();const text=$('#chat').value.trim();if(!text||!state)return;try{await request('chat',{code:state.room.code,text});$('#chat').value='';}catch(e){toast(e.message);}};
function stats(p){return `<span class="stat-chip hp">♥ ${p.hp}/${p.maxHp}</span><span class="stat-chip">เกราะ ${p.guard}</span><span class="stat-chip infection">☣ ${p.infection}/3</span>${p.extraLife?`<span class="stat-chip">✦ ${p.extraLife}</span>`:''}`;}
function selectCard(card){if(!state||busy)return;if(card.target==='opponent'){selected={card,turn:state.room.turnNumber};$('#targetTitle').textContent=card.name+' · เลือกเป้าหมาย';$('#targetList').innerHTML=state.room.players.filter(p=>p.id!==state.me.id&&!p.eliminated).map(p=>`<button class="target-btn" data-target="${p.id}"><img src="${portrait(p)}" alt=""><span><b>${esc(p.name)}</b><small>HP ${p.hp} · เกราะ ${p.guard}</small></span></button>`).join('');$('#targetList').querySelectorAll('button').forEach(b=>b.onclick=()=>act('play-card',{cardId:card.id,targetId:b.dataset.target}));$('#targets').showModal();}else act('play-card',{cardId:card.id});}
function render(){
 connection();$('#landing').classList.toggle('hidden',!!state);$('#leave').classList.toggle('hidden',!state);
 $('#roomScreen').classList.toggle('hidden',!state||state.room.phase!=='lobby');$('#gameScreen').classList.toggle('hidden',!state||state.room.phase==='lobby');
 if(!state)return;
 const {room:r,me}=state,p=r.players.find(p=>p.id===me.id);if(!p)return;
 const myTurn=r.phase==='playing'&&r.currentPlayerId===me.id&&!p.eliminated;
 const enabled=socket.connected&&!replaced&&!busy;
 if(selected&&(selected.turn!==r.turnNumber||!myTurn)){selected=null;$('#targets').close();}
 if(r.phase==='lobby'){
   shownWinner=null;$('#winner').close();$('#roomCode').textContent=r.code;$('#seatCount').textContent=`${r.players.length} / 6`;
   $('#seats').innerHTML=r.players.map(x=>`<div class="seat ${x.ready?'ready':''}"><img src="${portrait(x)}" alt=""><div class="seat-copy"><strong>${esc(x.name)} ${x.id===me.id?'<em>คุณ</em>':''}</strong><small>${x.host?'เจ้าของห้อง · ':''}${x.connected?'ออนไลน์':'หลุดการเชื่อมต่อ'}</small></div><span class="ready-state">${!x.connected&&p.host?`<button class="quiet" data-remove="${x.id}">นำออก ×</button>`:x.ready?'✓ พร้อม':'รอพร้อม'}</span></div>`).join('')+Array.from({length:6-r.players.length},()=>'<div class="seat empty-seat"><span>＋</span><small>รอเพื่อนเข้าร่วม…</small></div>').join('');
   $('#seats').querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>act('remove-offline',{playerId:b.dataset.remove}));
   $('#ready').textContent=p.ready?'✓ พร้อมแล้ว · ยกเลิก':'พร้อมเล่น';$('#ready').disabled=!enabled;
   $('#start').classList.toggle('hidden',!p.host);$('#start').disabled=!enabled||r.players.length<2||!r.players.every(p=>p.ready&&p.connected);
   $('#lobbyHint').textContent=p.host?'ทุกคนกดพร้อม แล้วคุณเริ่มเกมได้เลย':'ส่งรหัสให้เพื่อน แล้วรอเจ้าของห้องเริ่มเกม';return;
 }
 $('#gameRoom').textContent='PRIVATE ROOM / '+r.code;$('#turnNumber').textContent=`TURN ${String(r.turnNumber).padStart(2,'0')}${r.turnNumber>100?' · ราตรีมรณะ':''}`;
 const current=r.players.find(p=>p.id===r.currentPlayerId);$('#turnLabel').textContent=r.phase==='finished'?'จบการล่ารอบนี้':myTurn?'ตาของคุณ!':`ตาของ ${current?.name??'—'}`;$('#turnDot').classList.toggle('mine',myTurn);
 $('#opponents').innerHTML=r.players.filter(x=>x.id!==me.id).map(x=>`<div class="opponent-card ${x.zombie?'zombie':''} ${x.eliminated?'eliminated':''} ${x.id===r.currentPlayerId&&r.phase==='playing'?'active-turn':''}"><img src="${portrait(x)}" alt=""><div class="opponent-copy"><b>${esc(x.name)}</b><small>${x.eliminated?'ถูกกำจัด':x.connected?(x.zombie?'ซอมบี้':'ผู้รอดชีวิต'):'ออฟไลน์'} · ${x.handCount} ใบ</small></div><div class="mini-bars">${stats(x)}</div></div>`).join('');
 $('#deckCount').textContent=r.deckCount;$('#deck').disabled=$('#draw').disabled=!enabled||!myTurn;
 $('#discard').innerHTML=r.topDiscard?`<img src="/assets/cards/${r.topDiscard.id}.svg" alt="${esc(r.topDiscard.name)}"><div class="discard-caption">${esc(r.topDiscard.name)}</div><span>${r.discardCount}</span>`:'<div class="discard-art">✦</div><small>กองทิ้ง</small>';
 $('#eventBanner').textContent=r.log[0]?.message??'';
 $('#log').innerHTML=r.log.slice(0,25).map(x=>`<div class="log-item log-${esc(x.type)}"><span></span><p>${esc(x.message)}</p></div>`).join('');
 $('#selfStats').innerHTML=`<img src="${portrait(p)}" alt=""><div><b>${esc(p.name)} <span class="you-tag">คุณ</span></b><small>${p.eliminated?'ถูกกำจัด · รับชมต่อได้':p.zombie?'ซอมบี้ · โจมตี +1 / จบเทิร์นเสีย HP':'ผู้รอดชีวิต'}</small></div>${stats(p)}`;
 $('#handHint').textContent=myTurn?(p.actionPoints?'เลือกไพ่ 1 ใบ หรือจั่วเพื่อผ่าน':'ใช้ Action แล้ว · จั่วเพื่อจบเทิร์น'):'รอเทิร์นของคุณ';
 $('#hand').innerHTML=me.hand.map((c,i)=>`<button class="game-card family-${c.family}" data-index="${i}" title="${esc(c.name+': '+c.text)}" style="--i:${i};--n:${me.hand.length}" ${!enabled||!myTurn||!p.actionPoints?'disabled':''}><div class="card-top"><small>${labels[c.family]}</small><span>1</span></div><div class="card-art"><img src="/assets/cards/${c.id}.svg" alt=""></div><div class="card-copy"><strong>${esc(c.name)}</strong><p>${esc(c.text)}</p></div></button>`).join('');$('#hand').querySelectorAll('button').forEach(b=>b.onclick=()=>selectCard(me.hand[Number(b.dataset.index)]));
 if(r.phase==='finished'){
   const winner=r.players.find(x=>x.id===r.winnerId);$('#winnerText').textContent=winner?`${winner.name} ชนะ!`:'ไม่มีผู้รอดชีวิต';$('#winnerHint').textContent=p.host?'รวมแก๊งแล้วเริ่มล่ารอบใหม่ได้เลย':'รอเจ้าของห้องเริ่มรอบใหม่';$('#restart').classList.toggle('hidden',!p.host);$('#restart').disabled=!enabled;
   const key=r.code+':'+r.turnNumber;if(shownWinner!==key){shownWinner=key;$('#winner').showModal();}
 }
 tick();
}
function tick(){if(!state)return;const r=state.room;$('#countdown').textContent=r.phase==='playing'?Math.max(0,Math.ceil((r.turnDeadline-Date.now()-clockOffset)/1000))+'s':'—';}
setInterval(tick,250);
socket.on('state',next=>{const previous=state;state=next;clockOffset=next.room.serverNow-Date.now();render();if(previous&&previous.room.phase==='playing'&&previous.room.log[0]?.id!==next.room.log[0]?.id){const type=next.room.log[0]?.type;const table=$('.table-shell');table.dataset.effect=type;setTimeout(()=>{delete table.dataset.effect;},650);}});
socket.on('connect',async()=>{connection();if(saved&&!replaced){try{enter(await request('reconnect-room',saved));}catch(e){persist(null);state=null;render();$('#entryError').textContent=e.message;}}else render();});
socket.on('disconnect',()=>{connection();render();});socket.on('connect_error',()=>connection());
socket.on('session-replaced',()=>{replaced=true;persist(null);state=null;render();$('#entryError').textContent='ที่นั่งนี้ถูกเปิดในหน้าต่างอื่นแล้ว กรุณาปิดหน้าต่างนี้';});
