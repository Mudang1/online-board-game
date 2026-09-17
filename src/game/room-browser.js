// Whitelisted public room summaries only: no credentials, hands or private rooms.
export function listPublicRooms(rooms) {
 return [...rooms.values()]
  .filter(room=>room.listed===true && room.players.some(p=>p.connected))
  .sort((a,b)=>Number(b.phase==='lobby')-Number(a.phase==='lobby') || b.createdAt-a.createdAt)
  .slice(0,100)
  .map(room=>({
   code:room.code,mode:room.mode,phase:room.phase,
   hostName:room.players.find(p=>p.host)?.name??'MuCat',
   playerCount:room.players.length,connectedCount:room.players.filter(p=>p.connected).length,
   maxPlayers:6,joinable:room.phase==='lobby'&&room.players.length<6,
   createdAt:room.createdAt
  }));
}
