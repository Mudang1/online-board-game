export const CARD_DEFINITIONS = {
  'scratch-frenzy': { id:'scratch-frenzy', name:'Scratch Frenzy', family:'attack', target:'opponent', actionCost:1, text:'ทำความเสียหาย 2 หน่วยใส่ผู้เล่นเป้าหมาย' },
  'trash-shield': { id:'trash-shield', name:'Trash-Can Shield', family:'defense', target:'self', actionCost:1, text:'รับ Guard 2 หน่วยจนกว่าจะถูกใช้' },
  'tuna-patch': { id:'tuna-patch', name:'Tuna Patch', family:'heal', target:'self', actionCost:1, text:'ฟื้น HP 2 หน่วย' },
  'alley-swap': { id:'alley-swap', name:'Alley Swap', family:'trick', target:'opponent', actionCost:1, text:'สลับไพ่สุ่ม 1 ใบกับเป้าหมาย' },
  'viral-bite': { id:'viral-bite', name:'Viral Bite', family:'infection', target:'opponent', actionCost:1, text:'เพิ่ม Infection 1; ครบ 3 กลายเป็น Zombie' },
  'nine-lives': { id:'nine-lives', name:'Nine Lives', family:'utility', target:'self', actionCost:1, text:'มอบเกราะชีวิต 1 ครั้ง ป้องกันความเสียหายถึงตาย' },
  'midnight-yowl': { id:'midnight-yowl', name:'Midnight Yowl', family:'attack', target:'all-opponents', actionCost:1, text:'ทำความเสียหาย 1 หน่วยใส่คู่ต่อสู้ทุกคน' },
  'antidote-sardine': { id:'antidote-sardine', name:'Antidote Sardine', family:'heal', target:'self', actionCost:1, text:'ลด Infection 1 หรือฟื้น HP 1 ถ้าไม่มี Infection' }
};

const BASE_COUNTS = {
  'scratch-frenzy': 12,
  'trash-shield': 10,
  'tuna-patch': 9,
  'alley-swap': 6,
  'viral-bite': 9,
  'nine-lives': 4,
  'midnight-yowl': 5,
  'antidote-sardine': 9
};

export function buildDeck(random = Math.random) {
  const deck = [];
  for (const [id, count] of Object.entries(BASE_COUNTS)) {
    for (let i = 0; i < count; i++) deck.push(id);
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}


