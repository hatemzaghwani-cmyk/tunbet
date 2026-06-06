export interface InhouseGame {
  id: string;
  name: string;
  path: string;
  thumb: string;
  tag: string;
}

export const INHOUSE_GAMES: InhouseGame[] = [
  { id: "treasuresofaztec", name: "Treasures of Aztec", path: "/games/treasuresofaztec/index.html", thumb: "/games/treasuresofaztec/icons/icon-512.png", tag: "HOT" },
  { id: "jackfrost", name: "Jack Frost", path: "/games/jackfrost/index.html", thumb: "/games/jackfrost/icons/icon-512.png", tag: "NEW" },
  { id: "hoodvswoolf", name: "Hood vs Wolf", path: "/games/hoodvswoolf/index.html", thumb: "/games/hoodvswoolf/icons/icon-512.png", tag: "🔥" },
];
