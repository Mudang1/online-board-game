import {startEstate,actEstate,timeoutEstate,endEstate,releaseEstate} from './estate.js';
import {startCrystal,performCrystalAction,finishCrystalTurn} from './crystal.js';
import {startBoomGame,playBoomCard,drawBoomCard,clearPreviews} from './boom.js';
import { randomUUID, randomInt } from 'node:crypto';
import { buildDeck, CARD_DEFINITIONS } from './cards.js';

const MAX_PLAYERS = 6;
const STARTING_HAND = 5;
const MAX_HP = 5;
const TURN_MS = 60_000;
const MAX_HAND = 10;

function gameError(message) {
  const error = new Error(message);
  error.isGameError = true;
  return error;
}

function findPlayer(room, token) {
  const player = room.players.find(p => p.token === token);
  if (!player) throw gameError('ไม่พบผู้เล่น');
  return player;
}

function activePlayers(room) {
  return room.players.filter(p => !p.eliminated);
}

function currentPlayer(room) {
  return room.players[room.turnIndex];
}

function pushLog(room, message, type = 'info') {
  room.log.unshift({ id: `${Date.now()}-${Math.random()}`, message, type, at: Date.now() });
  room.log = room.log.slice(0, 40);
}

function applyDamage(room, target, amount, sourceName, bypassGuard = false) {
  let remaining = amount;
  const blocked = bypassGuard ? 0 : Math.min(target.guard, remaining);
  target.guard -= blocked;
  remaining -= blocked;
  if (remaining > 0) target.hp -= remaining;
  if (target.hp <= 0) {
    if (target.extraLife > 0) {
      target.extraLife -= 1;
      target.hp = 1;
      pushLog(room, `${target.name} ใช้ Nine Lives และรอดด้วย 1 HP`, 'heal');
    } else {
      target.hp = 0;
      target.eliminated = true;
      pushLog(room, `${target.name} ถูกกำจัดโดย ${sourceName}`, 'damage');
    }
  }
}

function checkWinner(room) {
  const alive = activePlayers(room);
  if (room.phase === 'playing' && alive.length <= 1) {
    room.phase = 'finished';
    room.turnDeadline = null;
    room.winnerToken = alive[0]?.token ?? null;
    if (alive[0]) pushLog(room, `${alive[0].name} เป็นผู้รอดชีวิตคนสุดท้าย!`, 'win');
  }
}

function advanceTurn(room) {
  clearPreviews(room);
  checkWinner(room);
  if (room.phase !== 'playing') return;
  const total = room.players.length;
  for (let offset = 1; offset <= total; offset++) {
    const idx = (room.turnIndex + offset) % total;
    if (!room.players[idx].eliminated) {
      room.turnIndex = idx;
      room.turnNumber += 1;
      room.turnDeadline = Date.now() + TURN_MS;
      const next = room.players[idx];
      next.actionPoints = room.mode === 'boom' ? 3 : 1;
      room.drawsRemaining = 1;
      pushLog(room, `ถึงตาของ ${next.name}`, 'turn');
      return;
    }
  }
}

function requirePlayingTurn(room, token) {
  if (room.phase !== 'playing') throw gameError('เกมยังไม่ได้เริ่ม');
  const player = findPlayer(room, token);
  if (player.eliminated) throw gameError('ผู้เล่นนี้ถูกกำจัดแล้ว');
  if (currentPlayer(room)?.token !== token) throw gameError('ไม่ใช่ตาของคุณ');
  return player;
}

function drawOne(room) {
  if (!room.deck.length) {
    const recyclable = room.discard.splice(0);
    if (!recyclable.length) return null;
    for (let i = recyclable.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [recyclable[i], recyclable[j]] = [recyclable[j], recyclable[i]];
    }
    room.deck.push(...recyclable);
  }
  return room.deck.pop() ?? null;
}

export function createRoom({ hostName, hostSocketId, hostToken, code, mode = 'zombie', listed = false }) {
  if (typeof listed !== 'boolean') throw gameError('รูปแบบการแสดงห้องไม่ถูกต้อง');
  if (!['zombie','boom','crystal','estate'].includes(mode)) throw gameError('โหมดเกมไม่ถูกต้อง');
  if (!hostToken) throw gameError('ต้องมี reconnect token');
  return {
    code,
    mode,
    listed,
    drawsRemaining: 1,
    phase: 'lobby',
    createdAt: Date.now(),
    players: [{
      id: randomUUID(),
      token: hostToken,
      socketId: hostSocketId,
      name: (hostName || 'Host').trim().slice(0, 20) || 'Host',
      host: true,
      ready: false,
      connected: true,
      hp: MAX_HP,
      maxHp: MAX_HP,
      infection: 0,
      zombie: false,
      eliminated: false,
      guard: 0,
      extraLife: 0,
      hand: [],
      actionPoints: 0
    }],
    deck: [],
    discard: [],
    turnIndex: 0,
    turnNumber: 0,
    turnDeadline: null,
    winnerToken: null,
    log: []
  };
}

export function joinRoom(room, { name, socketId, token }) {
  if (room.phase !== 'lobby') throw gameError('เกมเริ่มไปแล้ว');
  if (room.players.length >= MAX_PLAYERS) throw gameError('ห้องเต็มแล้ว');
  if (!token) throw gameError('ต้องมี reconnect token');
  if (room.players.some(p => p.token === token)) throw gameError('ผู้เล่นนี้อยู่ในห้องแล้ว');
  const player = {
    id: randomUUID(),
    token,
    socketId,
    name: (name || `Player ${room.players.length + 1}`).trim().slice(0, 20) || `Player ${room.players.length + 1}`,
    host: false,
    ready: false,
    connected: true,
    hp: MAX_HP,
    maxHp: MAX_HP,
    infection: 0,
    zombie: false,
    eliminated: false,
    guard: 0,
    extraLife: 0,
    hand: [],
    actionPoints: 0
  };
  room.players.push(player);
  pushLog(room, `${player.name} เข้าร่วมห้อง`, 'join');
  return player;
}

export function setReady(room, token, ready) {
  if (room.phase !== 'lobby') throw gameError('เปลี่ยน Ready ได้เฉพาะใน Lobby');
  const player = findPlayer(room, token);
  player.ready = Boolean(ready);
  return player;
}

export function startGame(room, hostToken, random = Math.random) {
  const host = findPlayer(room, hostToken);
  if (!host.host) throw gameError('เฉพาะ Host ที่เริ่มเกมได้');
  if (room.phase !== 'lobby') throw gameError('เกมเริ่มไปแล้ว');
  if (room.players.length < 2) throw gameError('ต้องมีผู้เล่นอย่างน้อย 2 คน');
  if (!room.players.every(p => p.connected)) throw gameError('ผู้เล่นทุกคนต้องออนไลน์ก่อนเริ่ม');
  if (!room.players.every(p => p.ready)) throw gameError('ผู้เล่นทุกคนต้องกดพร้อมก่อน');

  if (room.mode === 'estate') return startEstate(room);
  room.estate = null; for (const p of room.players) p.estate = null;
  if (room.mode === 'crystal') return startCrystal(room, random, boomApi);
  room.crystal = null;
  for (const p of room.players) p.crystal = null;
  if (room.mode === 'boom') return startBoomGame(room, random, boomApi);
  clearPreviews(room);
  room.drawsRemaining = 1;
  room.deck = buildDeck(random);
  room.discard = [];
  room.turnIndex = 0;
  room.turnNumber = 1;
  room.turnDeadline = Date.now() + TURN_MS;
  room.winnerToken = null;
  room.phase = 'playing';
  room.log = [];

  for (const player of room.players) {
    Object.assign(player, {
      hp: MAX_HP,
      maxHp: MAX_HP,
      infection: 0,
      zombie: false,
      eliminated: false,
      guard: 0,
      extraLife: 0,
      hand: [],
      actionPoints: 1
    });
    for (let i = 0; i < STARTING_HAND; i++) {
      const card = drawOne(room);
      if (card) player.hand.push(card);
    }
  }
  pushLog(room, `เกมเริ่มแล้ว — ${room.players[0].name} เล่นก่อน`, 'start');
  return room;
}

export function playCard(room, token, cardId, targetToken) {
  const player = requirePlayingTurn(room, token);
  if (room.mode === 'estate') throw gameError('โหมดนี้ใช้ทอยลูกเต๋าบนกระดาน');
  if (room.mode === 'crystal') throw gameError('โหมดนี้ใช้คำสั่งบนกระดานอัญมณี');
  if (room.mode === 'boom') return playBoomCard(room, player, cardId, targetToken, boomApi);
  const card = CARD_DEFINITIONS[cardId];
  if (!card) throw gameError('ไม่รู้จักการ์ดใบนี้');
  const handIndex = player.hand.indexOf(cardId);
  if (handIndex < 0) throw gameError('คุณไม่มีการ์ดใบนี้');
  if (player.actionPoints < (card.actionCost ?? 1)) throw gameError('คุณใช้ Action ไปแล้ว ต้องจั่วเพื่อจบเทิร์น');

  let target = null;
  if (card.target === 'opponent') {
    target = findPlayer(room, targetToken);
    if (target.token === player.token || target.eliminated) throw gameError('เป้าหมายไม่ถูกต้อง');
  }

  if (cardId === 'alley-swap' && (player.hand.length < 2 || !target.hand.length)) throw gameError('ต้องมีไพ่อื่นในมือและเป้าหมายต้องมีไพ่เพื่อสลับ');

  player.hand.splice(handIndex, 1);
  room.discard.push(cardId);
  player.actionPoints -= card.actionCost ?? 1;

  switch (cardId) {
    case 'scratch-frenzy':
      applyDamage(room, target, player.zombie ? 3 : 2, player.name);
      pushLog(room, `${player.name} ใช้ Scratch Frenzy ใส่ ${target.name}`, 'damage');
      break;
    case 'trash-shield':
      player.guard += 2;
      pushLog(room, `${player.name} ได้ Guard 2`, 'defense');
      break;
    case 'tuna-patch':
      player.hp = Math.min(player.maxHp, player.hp + (player.zombie ? 1 : 2));
      pushLog(room, `${player.name} ฟื้น HP`, 'heal');
      break;
    case 'alley-swap': {
      const ownIndex = randomInt(player.hand.length);
      const otherIndex = randomInt(target.hand.length);
      [player.hand[ownIndex], target.hand[otherIndex]] = [target.hand[otherIndex], player.hand[ownIndex]];
      pushLog(room, `${player.name} สลับไพ่กับ ${target.name}`, 'trick');
      break;
    }
    case 'viral-bite':
      target.infection = Math.min(3, target.infection + 1);
      if (target.infection >= 3 && !target.zombie) {
        target.zombie = true;
        pushLog(room, `${target.name} กลายเป็น Zombie Cat!`, 'infection');
      } else {
        pushLog(room, `${target.name} ติด Infection +1`, 'infection');
      }
      break;
    case 'nine-lives':
      player.extraLife += 1;
      pushLog(room, `${player.name} เตรียม Nine Lives ไว้กันตาย`, 'defense');
      break;
    case 'midnight-yowl':
      for (const opponent of room.players.filter(p => p.token !== player.token && !p.eliminated)) {
        applyDamage(room, opponent, player.zombie ? 2 : 1, player.name);
      }
      pushLog(room, `${player.name} ปล่อย Midnight Yowl ใส่ทุกคน`, 'damage');
      break;
    case 'antidote-sardine':
      if (player.infection > 0) player.infection -= 1;
      else player.hp = Math.min(player.maxHp, player.hp + 1);
      if (player.infection < 3) player.zombie = false;
      pushLog(room, `${player.name} ใช้ Antidote Sardine`, 'heal');
      break;
  }

  checkWinner(room);
  return room;
}

export function drawCard(room, token) {
  const player = requirePlayingTurn(room, token);
  if (room.mode === 'estate') throw gameError('โหมดนี้ใช้ทอยลูกเต๋าบนกระดาน');
  if (room.mode === 'crystal') throw gameError('โหมดนี้ไม่มีการจั่ว ใช้เก็บ ซื้อ จอง หรือผ่าน');
  if (room.mode === 'boom') return drawBoomCard(room, player, boomApi);
  const card = drawOne(room);
  if (card) {
    if (player.hand.length >= MAX_HAND) {
      room.discard.push(player.hand.shift());
      pushLog(room, `${player.name} ทิ้งไพ่เก่าสุดเพราะมือเต็ม 10 ใบ`, 'draw');
    }
    player.hand.push(card);
  }
  if (player.zombie || room.turnNumber > 100) {
    applyDamage(room, player, (player.zombie ? 1 : 0) + (room.turnNumber > 100 ? 1 : 0), 'การสลายตัว / ราตรีมรณะ', true);
    pushLog(room, `${player.name} เสีย HP เมื่อจบเทิร์น`, 'damage');
  }
  pushLog(room, `${player.name} จั่วไพ่และจบเทิร์น`, 'draw');
  advanceTurn(room);
  return card;
}

export function disconnectPlayer(room, socketId) {
  const player = room.players.find(p => p.socketId === socketId);
  if (!player) return null;
  player.connected = false;
  if (room.phase === 'lobby') player.ready = false;
  player.socketId = null;
  pushLog(room, `${player.name} หลุดการเชื่อมต่อ`, 'offline');
  return player;
}

export function reconnectPlayer(room, { token, socketId }) {
  const player = findPlayer(room, token);
  player.socketId = socketId;
  player.connected = true;
  pushLog(room, `${player.name} กลับเข้าสู่เกม`, 'online');
  return player;
}

export function restartRoom(room, token) {
  const host = findPlayer(room, token);
  if (!host.host) throw gameError('เฉพาะ Host ที่เริ่มห้องใหม่ได้');
  clearPreviews(room);
  room.estate = null; for (const p of room.players) p.estate = null;
  room.crystal = null;
  for (const p of room.players) p.crystal = null;
  room.drawsRemaining = 1;
  room.phase = 'lobby';
  room.deck = [];
  room.discard = [];
  room.turnIndex = 0;
  room.turnNumber = 0;
  room.turnDeadline = null;
  room.winnerToken = null;
  room.log = [];
  for (const player of room.players) {
    Object.assign(player, {
      ready: false,
      hp: MAX_HP,
      maxHp: MAX_HP,
      infection: 0,
      zombie: false,
      eliminated: false,
      guard: 0,
      extraLife: 0,
      hand: [],
      actionPoints: 0
    });
  }
  pushLog(room, 'ห้องถูกรีเซ็ตกลับ Lobby', 'restart');
  return room;
}

export { gameError };



export function expireTurn(room, now = Date.now()) {
  if (room.phase !== 'playing' || now < room.turnDeadline) return false;
  if (room.mode === 'estate') { timeoutEstate(room); return true; }
  if (room.mode === 'crystal') {
    pushLog(room, 'หมดเวลา — ผ่านเทิร์นอัตโนมัติ', 'turn');
    finishCrystalTurn(room, currentPlayer(room), boomApi);
    return true;
  }
  pushLog(room, 'หมดเวลา — จั่วและจบเทิร์นอัตโนมัติ', 'turn');
  const turn = room.turnNumber;
  do { drawCard(room, currentPlayer(room).token); }
  while (room.mode === 'boom' && room.phase === 'playing' && room.turnNumber === turn);
  return true;
}

export function leaveRoom(room, token) {
  const player = findPlayer(room, token);
  if (room.phase === 'lobby') room.players = room.players.filter(p => p !== player);
  else {
    player.connected = false;
    player.socketId = null;
    player.eliminated = true;
    player.hp = 0;
    if (room.mode === 'estate') releaseEstate(room, player);
    checkWinner(room);
    if (room.phase === 'playing' && currentPlayer(room) === player) {
      if (room.mode === 'estate') endEstate(room); else if (room.mode === 'crystal') finishCrystalTurn(room, player, boomApi); else advanceTurn(room);
    }
  }
  if (player.host) {
    player.host = false;
    const nextHost = room.players.find(p => p !== player && p.connected);
    if (nextHost) nextHost.host = true;
  }
  pushLog(room, `${player.name} ออกจากห้อง`, 'offline');
}

export function removeOfflinePlayer(room, hostToken, playerId) {
  const host = findPlayer(room, hostToken);
  if (!host.host || room.phase !== 'lobby') throw gameError('เฉพาะเจ้าของห้องใน Lobby');
  const target = room.players.find(p => p.id === playerId);
  if (!target || target.connected || target === host) throw gameError('นำออกได้เฉพาะที่นั่งออฟไลน์');
  room.players = room.players.filter(p => p !== target);
  pushLog(room, `${target.name} ถูกนำออกจากที่นั่งออฟไลน์`, 'offline');
}

const boomApi = {advanceTurn,pushLog,checkWinner,gameError};
export function setMode(room, token, mode) {
  const host = findPlayer(room,token);
  if (!host.host || room.phase !== 'lobby') throw gameError('เฉพาะเจ้าของห้องเปลี่ยนโหมดได้ใน Lobby');
  if (!['zombie','boom','crystal','estate'].includes(mode)) throw gameError('โหมดเกมไม่ถูกต้อง');
  if (room.mode === mode) return room;
  room.mode = mode;
  for (const p of room.players) p.ready = false;
  pushLog(room, `เปลี่ยนเป็น ${mode === 'estate' ? 'เมืองแมวเศรษฐี' : mode === 'crystal' ? 'Crystal Guild' : mode === 'boom' ? 'Boom Cats' : 'Zombie Cats'} — ทุกคนกดพร้อมใหม่`, 'info');
  return room;
}

export function setVisibility(room, token, listed) {
  const host = findPlayer(room,token);
  if (!host.host || room.phase !== 'lobby') throw gameError('เฉพาะเจ้าของห้องเปลี่ยนการแสดงห้องได้ใน Lobby');
  if (typeof listed !== 'boolean') throw gameError('รูปแบบการแสดงห้องไม่ถูกต้อง');
  room.listed = listed;
  return room;
}

export function crystalAction(room, token, payload) {
  const player = requirePlayingTurn(room, token);
  if (room.mode !== 'crystal') throw gameError('ห้องนี้ไม่ใช่ Crystal Guild');
  return performCrystalAction(room, player, payload, boomApi);
}

export function estateAction(room, token, payload) { const player=requirePlayingTurn(room,token); if(room.mode!=='estate')throw gameError('ห้องนี้ไม่ใช่เมืองแมวเศรษฐี'); return actEstate(room,player,payload); }
