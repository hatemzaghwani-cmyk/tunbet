// ─────────────────────────────────────────────────────────────────────
// AMATIC INDUSTRIES — Full catalog (real names, real RTPs from Amatic)
// Each game maps to a "theme template" in our native slot engine.
// All gameplay runs locally with REAL TND wallet (Supabase atomic).
// ─────────────────────────────────────────────────────────────────────

export type AmaticTheme = "egyptian" | "fruits" | "joker" | "diamond" | "fire" | "billy" | "dragon" | "wild";

export interface AmaticGame {
  id: string;
  name: string;
  arName?: string;
  thumb: string;             // public Amatic thumbnail (no auth needed)
  thumbFallback?: string;    // fallback if main 404s
  theme: AmaticTheme;
  rtp: number;               // official RTP (from Amatic spec)
  reels: 3 | 5;
  paylines: number;
  volatility: "low" | "medium" | "high";
  maxWin: number;            // x stake (per spec)
  hasGamble: boolean;
  hasBonus: boolean;
  releaseYear: number;
}

// Thumbnails use shared.vibdbymfua.net (open CDN with all Amatic poster art)
const cdn = (slug: string, fmt: "webp" | "avif" = "webp") =>
  `https://shared.vibdbymfua.net/amatic/thumbs/${slug}.${fmt}`;

export const AMATIC_GAMES: AmaticGame[] = [
  // ═══ Books / Egyptian theme ═══
  { id: "bookoffortune",    name: "Book of Fortune",     arName: "كتاب الحظ",       thumb: cdn("bookoffortune"),    theme: "egyptian", rtp: 96.0, reels: 5, paylines: 10, volatility: "high",   maxWin: 5000, hasGamble: true, hasBonus: true,  releaseYear: 2012 },
  { id: "bookofaztec",      name: "Book of Aztec",       arName: "كتاب الأزتيك",    thumb: cdn("bookofaztec"),       thumbFallback: cdn("bookofaztec", "avif"), theme: "egyptian", rtp: 96.1, reels: 5, paylines: 10, volatility: "high", maxWin: 5000, hasGamble: true, hasBonus: true, releaseYear: 2018 },
  { id: "bookoflords",      name: "Book of Lords",       arName: "كتاب الملوك",     thumb: cdn("bookoflords"),       theme: "egyptian", rtp: 96.0, reels: 5, paylines: 10, volatility: "high",   maxWin: 5000, hasGamble: true, hasBonus: true,  releaseYear: 2016 },
  { id: "bookofmontezuma",  name: "Book of Montezuma",   arName: "كتاب مونتزوما",   thumb: cdn("bookofmontezuma"),   theme: "egyptian", rtp: 97.1, reels: 5, paylines: 10, volatility: "high",   maxWin: 5000, hasGamble: true, hasBonus: true,  releaseYear: 2017 },
  { id: "bookofpharao",     name: "Book of Pharao",      arName: "كتاب الفرعون",    thumb: cdn("bookofpharao"),      theme: "egyptian", rtp: 96.0, reels: 5, paylines: 10, volatility: "high",   maxWin: 5000, hasGamble: true, hasBonus: true,  releaseYear: 2014 },

  // ═══ Hot Fruits (classics) ═══
  { id: "hotfruits40",      name: "Hot Fruits 40",       arName: "فواكه حارة 40",   thumb: cdn("hotfruits40", "avif"), theme: "fruits",    rtp: 95.8, reels: 5, paylines: 40, volatility: "medium", maxWin: 1000, hasGamble: true, hasBonus: false, releaseYear: 2019 },
  { id: "hotfruits100",     name: "Hot Fruits 100",      arName: "فواكه حارة 100",  thumb: cdn("hotfruits100"),      theme: "fruits",    rtp: 96.0, reels: 5, paylines: 100, volatility: "medium", maxWin: 1000, hasGamble: true, hasBonus: false, releaseYear: 2020 },
  { id: "hotfruits20",      name: "Hot Fruits 20",       arName: "فواكه حارة 20",   thumb: cdn("hotfruits20"),       thumbFallback: cdn("hotfruits40"), theme: "fruits", rtp: 95.79, reels: 5, paylines: 20, volatility: "low", maxWin: 1000, hasGamble: true, hasBonus: false, releaseYear: 2018 },
  { id: "hotchoice",        name: "Hot Choice",          arName: "الخيار الحار",    thumb: cdn("hotchoice"),         theme: "fruits",    rtp: 95.5, reels: 5, paylines: 10, volatility: "medium", maxWin: 1000, hasGamble: true, hasBonus: false, releaseYear: 2014 },
  { id: "hotneon",          name: "Hot Neon",            arName: "نيون حار",        thumb: cdn("hotneon"),           theme: "fruits",    rtp: 95.6, reels: 5, paylines: 20, volatility: "medium", maxWin: 1000, hasGamble: true, hasBonus: false, releaseYear: 2017 },
  { id: "hotseven",         name: "Hot Seven",           arName: "سبعة حارة",       thumb: cdn("hotseven"),          thumbFallback: cdn("hotsevendeluxe"), theme: "fruits", rtp: 96.0, reels: 3, paylines: 5, volatility: "low", maxWin: 500, hasGamble: true, hasBonus: false, releaseYear: 2014 },
  { id: "allwayshottestfruits", name: "Allways Hottest Fruits", arName: "كل الطرق فواكه", thumb: cdn("allwayshottestfruits"), theme: "fruits", rtp: 96.0, reels: 5, paylines: 243, volatility: "medium", maxWin: 1000, hasGamble: true, hasBonus: false, releaseYear: 2017 },
  { id: "fortunegirl",      name: "Fortune Girl",        arName: "فتاة الحظ",       thumb: cdn("fortunegirl"),       thumbFallback: cdn("ladyfruits20"), theme: "fruits", rtp: 96.0, reels: 5, paylines: 5, volatility: "medium", maxWin: 1000, hasGamble: true, hasBonus: false, releaseYear: 2020 },
  { id: "ladyfruits20",     name: "Lady Fruits 20",      arName: "فواكه السيدة 20", thumb: cdn("ladyfruits20"),      thumbFallback: cdn("hotfruits40"), theme: "fruits", rtp: 96.0, reels: 5, paylines: 20, volatility: "medium", maxWin: 3000, hasGamble: true, hasBonus: false, releaseYear: 2020 },

  // ═══ Joker (Lucky Joker series) ═══
  { id: "luckyjoker5",      name: "Lucky Joker 5",       arName: "جوكر الحظ 5",     thumb: cdn("luckyjoker5"),       theme: "joker",     rtp: 95.5, reels: 3, paylines: 5, volatility: "low", maxWin: 500, hasGamble: true, hasBonus: false, releaseYear: 2019 },
  { id: "luckyjoker10",     name: "Lucky Joker 10",      arName: "جوكر الحظ 10",    thumb: cdn("luckyjoker10"),      thumbFallback: cdn("luckyjoker5"), theme: "joker", rtp: 95.5, reels: 5, paylines: 10, volatility: "low", maxWin: 1000, hasGamble: true, hasBonus: false, releaseYear: 2020 },
  { id: "luckyjoker20",     name: "Lucky Joker 20",      arName: "جوكر الحظ 20",    thumb: cdn("luckyjoker20"),      theme: "joker",     rtp: 95.5, reels: 5, paylines: 20, volatility: "medium", maxWin: 1000, hasGamble: true, hasBonus: false, releaseYear: 2020 },
  { id: "luckyjoker40",     name: "Lucky Joker 40",      arName: "جوكر الحظ 40",    thumb: cdn("luckyjoker40"),      theme: "joker",     rtp: 95.5, reels: 5, paylines: 40, volatility: "medium", maxWin: 1000, hasGamble: true, hasBonus: false, releaseYear: 2021 },
  { id: "luckyjoker100",    name: "Lucky Joker 100",     arName: "جوكر الحظ 100",   thumb: cdn("luckyjoker100"),     theme: "joker",     rtp: 95.5, reels: 5, paylines: 100, volatility: "high", maxWin: 1000, hasGamble: true, hasBonus: false, releaseYear: 2021 },
  { id: "luckyjokertwins",  name: "Lucky Joker Twins",   arName: "توأم الجوكر",     thumb: cdn("luckyjokertwins"),   thumbFallback: cdn("luckyjoker20"), theme: "joker", rtp: 96.0, reels: 5, paylines: 20, volatility: "high", maxWin: 1000, hasGamble: true, hasBonus: false, releaseYear: 2022 },
  { id: "luckygoldenseven", name: "Lucky Golden Seven",  arName: "السبعة الذهبية",  thumb: cdn("luckygoldenseven"),  theme: "joker",     rtp: 96.5, reels: 3, paylines: 5, volatility: "medium", maxWin: 500, hasGamble: true, hasBonus: false, releaseYear: 2018 },
  { id: "billyonaire",      name: "Billyonaire",         arName: "المليونير",       thumb: cdn("billyonaire"),       thumbFallback: cdn("billygame"), theme: "billy", rtp: 95.0, reels: 5, paylines: 40, volatility: "medium-low", maxWin: 1000, hasGamble: true, hasBonus: true, releaseYear: 2015 },
  { id: "billysgame",       name: "Billy's Game",        arName: "لعبة بيلي",       thumb: cdn("billysgame"),        thumbFallback: cdn("billyonaire"), theme: "billy", rtp: 95.0, reels: 5, paylines: 10, volatility: "high", maxWin: 1000, hasGamble: true, hasBonus: true, releaseYear: 2014 },

  // ═══ Diamond / Premium ═══
  { id: "diamondstaxx",     name: "Diamond Staxx",       arName: "ألماس مكدّس",     thumb: cdn("diamondstaxx"),      theme: "diamond",   rtp: 96.2, reels: 5, paylines: 25, volatility: "medium", maxWin: 1000, hasGamble: true, hasBonus: true,  releaseYear: 2019 },
  { id: "diamondmonkey",    name: "Diamond Monkey",      arName: "قرد الألماس",     thumb: cdn("diamondmonkey"),     theme: "diamond",   rtp: 97.49, reels: 5, paylines: 10, volatility: "high", maxWin: 1000, hasGamble: true, hasBonus: false, releaseYear: 2014 },
  { id: "diamondcats",      name: "Diamond Cats",        arName: "قطط الألماس",     thumb: cdn("diamondcats"),       theme: "diamond",   rtp: 96.0, reels: 5, paylines: 10, volatility: "high", maxWin: 5000, hasGamble: true, hasBonus: false, releaseYear: 2010 },

  // ═══ Bells & Fire ═══
  { id: "bellsonfire",      name: "Bells on Fire",       arName: "أجراس النار",     thumb: cdn("bellsonfire"),       theme: "fire",      rtp: 96.0, reels: 5, paylines: 5, volatility: "medium", maxWin: 1000, hasGamble: true, hasBonus: false, releaseYear: 2014 },
  { id: "bellsonfireboost", name: "Bells on Fire Boost", arName: "أجراس النار Boost", thumb: cdn("bellsonfireboost"), theme: "fire", rtp: 96.5, reels: 5, paylines: 40, volatility: "high", maxWin: 1000, hasGamble: true, hasBonus: false, releaseYear: 2022 },
  { id: "burningbells10",   name: "Burning Bells 10",    arName: "أجراس مشتعلة 10", thumb: cdn("burningbells10"),    theme: "fire",      rtp: 95.8, reels: 5, paylines: 10, volatility: "medium", maxWin: 1000, hasGamble: true, hasBonus: false, releaseYear: 2021 },
  { id: "burningbells40",   name: "Burning Bells 40",    arName: "أجراس مشتعلة 40", thumb: cdn("burningbells40"),    theme: "fire",      rtp: 96.0, reels: 5, paylines: 40, volatility: "medium", maxWin: 1000, hasGamble: true, hasBonus: false, releaseYear: 2021 },
  { id: "arisingphoenix",   name: "Arising Phoenix",     arName: "نهضة العنقاء",    thumb: cdn("arisingphoenix"),    theme: "fire",      rtp: 95.0, reels: 5, paylines: 10, volatility: "high", maxWin: 10000, hasGamble: true, hasBonus: true, releaseYear: 2017 },
  { id: "wolfmoon",         name: "Wolf Moon",           arName: "ذئب القمر",       thumb: cdn("wolfmoon"),          theme: "wild",      rtp: 95.0, reels: 5, paylines: 25, volatility: "high", maxWin: 1000, hasGamble: true, hasBonus: true, releaseYear: 2015 },
  { id: "casanova",         name: "Grand Casanova",      arName: "كازانوفا",        thumb: cdn("casanova"),          theme: "wild",      rtp: 97.45, reels: 5, paylines: 20, volatility: "medium", maxWin: 1000, hasGamble: true, hasBonus: true, releaseYear: 2019 },
  { id: "bigpanda",         name: "Big Panda",           arName: "الباندا الكبير",  thumb: cdn("bigpanda"),          theme: "wild",      rtp: 96.0, reels: 5, paylines: 25, volatility: "medium", maxWin: 1000, hasGamble: true, hasBonus: false, releaseYear: 2017 },

  // ═══ Dragons ═══
  { id: "dragonsmystery",   name: "Dragon's Mystery",    arName: "لغز التنين",      thumb: cdn("dragonsmystery"),    thumbFallback: cdn("wolfmoon"), theme: "dragon", rtp: 97.17, reels: 5, paylines: 10, volatility: "medium", maxWin: 1000, hasGamble: true, hasBonus: true, releaseYear: 2017 },
  { id: "dragonskingdom",   name: "Dragon's Kingdom",    arName: "مملكة التنين",    thumb: cdn("dragonskingdom"),    thumbFallback: cdn("wolfmoon"), theme: "dragon", rtp: 96.0, reels: 5, paylines: 20, volatility: "high", maxWin: 1000, hasGamble: true, hasBonus: true, releaseYear: 2016 },
];
