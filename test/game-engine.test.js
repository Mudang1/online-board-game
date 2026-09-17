import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRoom,
  joinRoom,
  setReady,
  startGame,
  playCard,
  drawCard,
  reconnectPlayer
} from '../src/game/engine.js';
import { serializePublicRoom, serializePrivatePlayer } from '../src/game/views.js';

function setupTwoPlayerGame() {
  const room = createRoom({ hostName: 'Host', hostSocketId: 's1', hostToken: 't1', code: 'ABCDE' });
  joinRoom(room, { name: 'Guest', socketId: 's2', token: 't2' });
  setReady(room, 't1', true);
  setReady(room, 't2', true);
  startGame(room, 't1', () => 0.25);
  return room;
}

test('room supports six players and rejects a seventh', () => {
  const room = createRoom({ hostName: 'P1', hostSocketId: 's1', hostToken: 't1', code: 'ABCDE' });
  for (let i = 2; i <= 6; i++) joinRoom(room, { name: `P${i}`, socketId: `s${i}`, token: `t${i}` });
  assert.equal(room.players.length, 6);
  assert.throws(() => joinRoom(room, { name: 'P7', socketId: 's7', token: 't7' }), /ห้องเต็ม/);
});

test('game cannot start until at least two players are ready', () => {
  const room = createRoom({ hostName: 'Host', hostSocketId: 's1', hostToken: 't1', code: 'ABCDE' });
  joinRoom(room, { name: 'Guest', socketId: 's2', token: 't2' });
  assert.throws(() => startGame(room, 't1'), /พร้อม/);
});

test('public serialization never exposes card ids in player hands', () => {
  const room = setupTwoPlayerGame();
  const publicState = serializePublicRoom(room);
  const privateState = serializePrivatePlayer(room, 't1');
  assert.equal(publicState.players.some(p => 'hand' in p), false);
  assert.ok(Array.isArray(privateState.hand));
  assert.ok(privateState.hand.length > 0);
});

test('out of turn player cannot play a card', () => {
  const room = setupTwoPlayerGame();
  const active = room.players[room.turnIndex];
  const other = room.players.find(p => p.token !== active.token);
  const cardId = other.hand[0];
  assert.throws(() => playCard(room, other.token, cardId, active.token), /ไม่ใช่ตาของคุณ/);
});

test('attack damage consumes guard before hp', () => {
  const room = setupTwoPlayerGame();
  const attacker = room.players[room.turnIndex];
  const target = room.players.find(p => p.token !== attacker.token);
  target.guard = 1;
  attacker.hand = ['scratch-frenzy'];
  const hpBefore = target.hp;
  playCard(room, attacker.token, 'scratch-frenzy', target.token);
  assert.equal(target.guard, 0);
  assert.equal(target.hp, hpBefore - 1);
});

test('infection threshold transforms player into zombie state', () => {
  const room = setupTwoPlayerGame();
  const attacker = room.players[room.turnIndex];
  const target = room.players.find(p => p.token !== attacker.token);
  target.infection = 2;
  attacker.hand = ['viral-bite'];
  playCard(room, attacker.token, 'viral-bite', target.token);
  assert.equal(target.infection, 3);
  assert.equal(target.zombie, true);
});

test('draw ends turn and advances to next active player', () => {
  const room = setupTwoPlayerGame();
  const current = room.players[room.turnIndex];
  const before = room.turnIndex;
  drawCard(room, current.token);
  assert.notEqual(room.turnIndex, before);
});

test('reconnect preserves identity and hand while rebinding socket', () => {
  const room = setupTwoPlayerGame();
  const player = room.players[0];
  const handBefore = [...player.hand];
  reconnectPlayer(room, { token: player.token, socketId: 'replacement-socket' });
  assert.equal(player.socketId, 'replacement-socket');
  assert.deepEqual(player.hand, handBefore);
});


