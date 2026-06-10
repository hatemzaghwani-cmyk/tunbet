import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const NAMES = ["Ahmed","Youssef","Sami","Nour","Khalil","Mehdi","Amine","Rania","Fatma","Omar","Ali","Bilel","Rami","Mounir","Salma","Hichem","Karim","Leila","Zied","Ines","Mohamed","Hamza","Wassim","Firas","Saber","Nabil","Hatem","Sana","Imen","Houssem"];
const GAMES = ["Sweet Bonanza","Gates of Olympus","Big Bass","Sugar Rush","Starlight Princess","Dog House","Wolf Gold","Aztec Gems","Fruit Party","Wild West Gold","Madame Destiny","Book of Fallen","Floating Dragon","Hot Pepper","Cash Bonanza","5 Lions Megaways","Starlight Christmas","Buffalo King","John Hunter","Release the Kraken"];

function randomWin() {
  return {
    name: NAMES[Math.floor(Math.random() * NAMES.length)],
    game: GAMES[Math.floor(Math.random() * GAMES.length)],
    amount: (Math.random() * 800 + 5).toFixed(2),
    id: Date.now() + Math.random(),
  };
}

export function WinnerFeed() {
  const [winner, setWinner] = useState(randomWin());
  const [show, setShow] = useState(false);

  useEffect(() => {
    const fire = () => { setWinner(randomWin()); setShow(true); setTimeout(() => setShow(false), 4500); };
    setTimeout(fire, 4000);
    const iv = setInterval(fire, 12000);
    return () => clearInterval(iv);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ type: "spring", damping: 25 }}
          className="fixed top-16 right-3 z-50 rounded-xl p-3 flex items-center gap-2.5 max-w-[280px]"
          style={{ background: "rgba(0,0,0,0.92)", border: "1px solid rgba(255,215,0,0.25)", backdropFilter: "blur(20px)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #FFD700, #FF8C00)" }}>
            <span className="text-xs font-black" style={{ color: "#020408" }}>WIN</span>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-white/40">فاز للتو!</p>
            <p className="text-xs font-bold text-white truncate">{winner.name}</p>
            <p className="text-[10px] text-white/50 truncate">{winner.game}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-black font-mono" style={{ color: "#FFD700" }}>+{winner.amount}</p>
            <p className="text-[8px] text-white/30">TND</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
