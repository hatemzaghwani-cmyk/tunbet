// No backend needed — ESPN public API is called directly, bets go straight to Supabase
const BACKENDS: string[] = [];
const ESPN = "https://site.api.espn.com/apis/site/v2/sports";
const LEAGUES = [
  {s:"soccer",id:"eng.1",n:"⚽ Premier League"},{s:"soccer",id:"esp.1",n:"⚽ La Liga"},
  {s:"soccer",id:"ger.1",n:"⚽ Bundesliga"},{s:"soccer",id:"ita.1",n:"⚽ Serie A"},
  {s:"soccer",id:"fra.1",n:"⚽ Ligue 1"},{s:"soccer",id:"uefa.champions",n:"⚽ Champions League"},
  {s:"soccer",id:"usa.1",n:"⚽ MLS"},{s:"soccer",id:"bra.1",n:"⚽ Brasileirão"},
  {s:"soccer",id:"tur.1",n:"⚽ Süper Lig"},{s:"soccer",id:"por.1",n:"⚽ Liga Portugal"},
  {s:"soccer",id:"fifa.worldq.conmebol",n:"⚽ WCQ CONMEBOL"},
  {s:"soccer",id:"fifa.worldq.uefa",n:"⚽ WCQ UEFA"},
  {s:"basketball",id:"nba",n:"🏀 NBA"},{s:"basketball",id:"wnba",n:"🏀 WNBA"},
  {s:"football",id:"nfl",n:"🏈 NFL"},{s:"baseball",id:"mlb",n:"⚾ MLB"},
  {s:"hockey",id:"nhl",n:"🏒 NHL"},{s:"mma",id:"ufc",n:"🥊 UFC"},
  {s:"tennis",id:"atp",n:"🎾 ATP"},{s:"tennis",id:"wta",n:"🎾 WTA"},
];

export interface Match {
  id:string;league:string;sport:string;home:string;away:string;homeLogo:string;awayLogo:string;
  date:string;status:"live"|"upcoming"|"finished";clock:string;period:string;
  homeScore:number;awayScore:number;minute:number;suspended:boolean;hasRealOdds:boolean;
  markets:Record<string,Record<string,number>>|null;
}

const v=(o:number,s:number)=>Math.round(Math.max(1.01,o*(1+Math.sin(s+Date.now()/30000)*.02))*100)/100;
const a2d=(am:number)=>!am?0:am>0?Math.round((am/100+1)*100)/100:Math.round((100/Math.abs(am)+1)*100)/100;

function buildMarkets(sport:string,h:string,a:string,odds:any,hR:number,aR:number):Record<string,Record<string,number>>{
  const M=1.05,sd=(h.length*31+a.length*17)%9999;
  let hO=a2d(odds?.homeTeamOdds?.moneyLine)||0,aO=a2d(odds?.awayTeamOdds?.moneyLine)||0,dO=a2d(odds?.drawOdds?.moneyLine)||0;
  if(!hO||hO<=1){const hS=Math.max(.3,1.3-hR*.04),aS=Math.max(.3,1.3-aR*.04),t=hS+aS+.7;hO=v(M/(hS/t),sd+1);dO=v(M/(.7/t),sd+2);aO=v(M/(aS/t),sd+3)}
  if(!dO||dO<=1)dO=v(3.3,sd+5);
  hO=v(hO,sd+10);aO=v(aO,sd+12);dO=v(dO,sd+11);
  const hp=1/hO,dp=1/dO,ap=1/aO,o25p=.42+Math.min(hp,ap)*.4,ggP=.3+Math.min(hp,ap)/Math.max(hp,ap)*.25;

  if(sport==='soccer')return{"1X2":{"1":hO,"X":dO,"2":aO},"O/U 2.5":{"Over":v(M/o25p,sd+20),"Under":v(M/(1-o25p),sd+21)},"O/U 1.5":{"Over":v(M/Math.min(.9,o25p+.25),sd+22),"Under":v(M/Math.max(.1,1-o25p-.25),sd+23)},"Double Chance":{"1X":v(M/(hp+dp),sd+30),"12":v(M/(hp+ap),sd+31),"X2":v(M/(dp+ap),sd+32)},"BTTS":{"GG":v(M/ggP,sd+40),"NG":v(M/(1-ggP),sd+41)},"Correct Score":{"1-0":v(6.5/hp,sd+50),"0-0":v(7.8,sd+51),"0-1":v(6.5/ap,sd+52),"2-1":v(9/hp,sd+53),"1-1":v(5.5,sd+54)},"Half-Time":{"1":v(hO*1.35,sd+60),"X":v(dO*.7,sd+61),"2":v(aO*1.35,sd+62)}};
  if(sport==='basketball'){const sp=odds?.spread||((hp>ap)?-3.5:3.5),tot=odds?.overUnder||215;return{"Moneyline":{[h]:hO,[a]:aO},"Spread":{[`${h} ${sp}`]:v(1.91,sd+30),[`${a} ${-sp}`]:v(1.91,sd+31)},"Total":{[`Over ${tot}`]:v(1.91,sd+40),[`Under ${tot}`]:v(1.91,sd+41)}};}
  if(sport==='football'){const sp=odds?.spread||-3.5,tot=odds?.overUnder||44;return{"Moneyline":{[h]:hO,[a]:aO},"Spread":{[`${h} ${sp}`]:v(1.91,sd+30),[`${a} ${-sp}`]:v(1.91,sd+31)},"Total":{[`Over ${tot}`]:v(1.91,sd+40),[`Under ${tot}`]:v(1.91,sd+41)}};}
  if(sport==='baseball'){const tot=odds?.overUnder||8.5;return{"Moneyline":{[h]:hO,[a]:aO},"Run Line":{[`${h} -1.5`]:v(M/(hp*.45),sd+30),[`${a} +1.5`]:v(M/(ap+dp*.4),sd+31)},"Total":{[`Over ${tot}`]:v(1.91,sd+40),[`Under ${tot}`]:v(1.91,sd+41)}};}
  if(sport==='hockey')return{"Moneyline":{[h]:hO,"Draw":dO,[a]:aO},"Puck Line":{[`${h} -1.5`]:v(M/(hp*.4),sd+30),[`${a} +1.5`]:v(M/(ap+dp*.45),sd+31)},"Total":{[`Over 5.5`]:v(1.91,sd+40),[`Under 5.5`]:v(1.91,sd+41)}};
  if(sport==='mma')return{"Winner":{[h]:hO,[a]:aO},"Method":{"KO/TKO":v(M/(hp*.4),sd+30),"Submission":v(M/(hp*.25),sd+31),"Decision":v(M/.35,sd+32)},"Rounds":{"Over 2.5":v(1.85,sd+40),"Under 2.5":v(1.95,sd+41)}};
  if(sport==='tennis')return{"Winner":{[h]:hO,[a]:aO},"Sets":{"Over 2.5":v(2.1,sd+30),"Under 2.5":v(1.75,sd+31)}};
  return{"Winner":{[h]:hO,[a]:aO}};
}

// (No backend — ESPN direct only)
async function fetchFromBackend():Promise<Match[]|null>{ return null; }

async function fetchFromESPN():Promise<Match[]>{
  const all:Match[]=[];
  const results=await Promise.allSettled(LEAGUES.map(async lg=>{
    try{const r=await fetch(`${ESPN}/${lg.s}/${lg.id}/scoreboard`);const d=await r.json();
    for(const ev of(d.events||[])){
      const c=ev.competitions?.[0];if(!c)continue;
      const ts=c.competitors||[];const h=ts.find((t:any)=>t.homeAway==='home')||ts[0];const a=ts.find((t:any)=>t.homeAway==='away')||ts[1];
      if(!h?.team||!a?.team)continue;
      const st=ev.status?.type?.name||'';const live=st.includes('PROGRESS')||st.includes('HALFTIME');const final=st.includes('FINAL')||st.includes('FULL_TIME');
      if(final)continue;
      const odds=(c.odds||[])[0]||null;
      all.push({id:ev.id,league:lg.n,sport:lg.s,home:h.team.displayName||'TBD',away:a.team.displayName||'TBD',
        homeLogo:h.team.logo||'',awayLogo:a.team.logo||'',date:ev.date||'',
        status:live?'live':'upcoming',clock:ev.status?.displayClock||'',period:ev.status?.type?.shortDetail||'',
        homeScore:parseInt(h.score||'0'),awayScore:parseInt(a.score||'0'),minute:0,suspended:false,hasRealOdds:!!odds,
        markets:buildMarkets(lg.s,h.team.shortDisplayName||h.team.displayName,a.team.shortDisplayName||a.team.displayName,odds,parseInt(h.order||'5'),parseInt(a.order||'5'))});
    }}catch{}}));
  all.sort((a,b)=>{if(a.status==='live'&&b.status!=='live')return-1;if(a.status!=='live'&&b.status==='live')return 1;return new Date(a.date).getTime()-new Date(b.date).getTime()});
  return all;
}

export async function fetchAllMatches():Promise<Match[]>{
  try{const c=sessionStorage.getItem("tb10");if(c){const{d,t}=JSON.parse(c);if(Date.now()-t<25000)return d}}catch{}
  let m=await fetchFromBackend();
  if(!m||!m.length)m=await fetchFromESPN();
  try{sessionStorage.setItem("tb10",JSON.stringify({d:m,t:Date.now()}))}catch{}
  return m;
}

// Place a bet directly against Supabase (atomic via update_balance RPC)
// No backend needed. Bets are stored in sports_bets table for admin settlement.
export async function placeBetServer(userId:number,eventId:string,market:string,selection:string,odds:number,stake:number){
  const SU = "https://cjzjrnagpsdmolvbkhnu.supabase.co";
  const SK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqempybmFncHNkbW9sdmJraG51Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM0ODY4NCwiZXhwIjoyMDk1OTI0Njg0fQ.TmowEatc4g2xpD-GT0r-jofX1zCtXjTD-s4LF7JSs6o";
  const H = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };

  // 1) Validate stake
  if (stake < 0.5) return { error: "الحد الأدنى 0.50 TND" };
  if (stake > 5000) return { error: "الحد الأقصى 5000 TND" };

  // 2) Get current balance + match info
  const ur = await fetch(`${SU}/rest/v1/users?id=eq.${userId}&select=balance`, { headers: H });
  const users = await ur.json();
  if (!Array.isArray(users) || !users.length) return { error: "المستخدم غير موجود" };
  const bal = parseFloat(users[0].balance || 0);
  if (bal < stake) return { error: `رصيدك ${bal.toFixed(2)} TND غير كافٍ` };

  // Find match from cache
  let cached: Match | undefined;
  try {
    const c = sessionStorage.getItem("tb10");
    if (c) {
      const { d } = JSON.parse(c);
      cached = (d as Match[]).find(m => m.id === eventId);
    }
  } catch {}
  if (!cached) {
    const all = await fetchAllMatches();
    cached = all.find(m => m.id === eventId);
  }
  if (!cached) return { error: "المباراة غير موجودة" };
  if (cached.status === "finished") return { error: "المباراة انتهت" };
  if (cached.suspended) return { error: "الأسواق معلقة" };
  const mkt = cached.markets?.[market];
  if (!mkt || !mkt[selection]) return { error: "السوق غير متاح" };
  const serverOdds = mkt[selection];
  if (Math.abs(serverOdds - odds) / odds > 0.02) return { error: "تغيرت الكوتة", newOdds: serverOdds };

  // 3) Withdraw stake atomically
  const wr = await fetch(`${SU}/rest/v1/rpc/update_balance`, {
    method: "POST", headers: H,
    body: JSON.stringify({ p_user_id: userId, p_action: "withdraw", p_amount: stake }),
  });
  if (!wr.ok) return { error: "فشل خصم الرهان" };

  // 4) Record bet
  const potWin = +(stake * serverOdds).toFixed(2);
  await fetch(`${SU}/rest/v1/sports_bets`, {
    method: "POST", headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({
      user_id: userId, event_id: eventId,
      event_name: `${cached.home} vs ${cached.away}`,
      sport: market, league: cached.league,
      selection, selection_name: `${market}: ${selection}`,
      odds: serverOdds, stake, potential_win: potWin, status: "pending",
    }),
  });

  // 5) Log transaction
  await fetch(`${SU}/rest/v1/transactions`, {
    method: "POST", headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({
      user_id: userId, type: "bet", amount: -stake,
      balance_before: bal, balance_after: bal - stake,
      description: `Bet: ${cached.home} vs ${cached.away} | ${market}: ${selection} @ ${serverOdds}`,
    }),
  });

  return { success: true, odds: serverOdds, potentialWin: potWin, newBalance: +(bal - stake).toFixed(2) };
}

export const MARKET_NAMES:Record<string,string>={"1X2":"Winner","O/U 2.5":"O/U 2.5","O/U 1.5":"O/U 1.5","Double Chance":"DC","BTTS":"BTTS","Correct Score":"Score","Half-Time":"HT","Moneyline":"ML","Spread":"Spread","Total":"Total","Run Line":"RL","Puck Line":"PL","Total Goals":"Goals","Winner":"Winner","Method":"Method","Rounds":"Rounds","Sets":"Sets","1st Half ML":"1H ML"};
