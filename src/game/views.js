import {publicCrystal,publicCrystalPlayer,privateCrystal} from './crystal.js';
import { CARD_DEFINITIONS } from './cards.js';
export function serializePublicRoom(room) {
  return {
    code: room.code, listed: room.listed === true, mode: room.mode ?? 'zombie', drawsRemaining: room.drawsRemaining ?? 1, phase: room.phase, turnNumber: room.turnNumber,
    turnDeadline: room.turnDeadline, serverNow: Date.now(),
    currentPlayerId: room.players[room.turnIndex]?.id ?? null,
    crystal: room.mode === 'crystal' ? publicCrystal(room) : null,
    deckCount: room.deck.length, discardCount: room.discard.length,
    topDiscard: CARD_DEFINITIONS[room.discard.at(-1)] ?? null,
    winnerId: room.players.find(p => p.token === room.winnerToken)?.id ?? null,
    players: room.players.map((p, seat) => ({
      crystal: room.mode === 'crystal' ? publicCrystalPlayer(p) : null,
      id: p.id, name: p.name, seat, host: p.host, ready: p.ready,
      connected: p.connected, hp: p.hp, maxHp: p.maxHp,
      infection: p.infection, zombie: p.zombie, eliminated: p.eliminated,
      guard: p.guard, extraLife: p.extraLife, handCount: p.hand.length,
      actionPoints: p.actionPoints
    })),
    log: room.log
  };
}
export function serializePrivatePlayer(room, token) {
  const p = room.players.find(p => p.token === token);
  if (!p) return null;
  return { id: p.id, crystal: room.mode === 'crystal' ? privateCrystal(p) : null, peek: (p.peek ?? []).map(id => ({...CARD_DEFINITIONS[id]})), hand: p.hand.map((id, index) => ({ instanceId: `${index}-${id}`, ...CARD_DEFINITIONS[id] })) };
}
