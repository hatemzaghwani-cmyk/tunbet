const BACKENDS = [
  "https://highest-cir-tours-became.trycloudflare.com",
  "https://compaq-rescue-parties-admissions.trycloudflare.com",
];
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

// Try backend first, fallback to direct ESPN
async function fetchFromBackend():Promise<Match[]|null>{
  for(const url of BACKENDS){
    try{const r=await fetch(url+"/api/matches",{signal:AbortSignal.timeout(4000)});const d=await r.json();if(d.matches?.length)return d.matches}catch{}
  }
  return null;
}

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

export async function placeBetServer(userId:number,eventId:string,market:string,selection:string,odds:number,stake:number){
  for(const url of BACKENDS){
    try{const r=await fetch(url+"/api/bet",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,eventId,market,selection,odds,stake}),signal:AbortSignal.timeout(5000)});return await r.json()}catch{}
  }
  return{error:"Server unavailable"};
}

export const MARKET_NAMES:Record<string,string>={"1X2":"Winner","O/U 2.5":"O/U 2.5","O/U 1.5":"O/U 1.5","Double Chance":"DC","BTTS":"BTTS","Correct Score":"Score","Half-Time":"HT","Moneyline":"ML","Spread":"Spread","Total":"Total","Run Line":"RL","Puck Line":"PL","Total Goals":"Goals","Winner":"Winner","Method":"Method","Rounds":"Rounds","Sets":"Sets","1st Half ML":"1H ML"};
