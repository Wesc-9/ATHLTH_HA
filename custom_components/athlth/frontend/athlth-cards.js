/* ATHLTH Home Assistant dashboard cards. No external dependencies or telemetry.
 * Real ATHLTH brand mark from Shared/ATHLTHBrandMark.swift (pulse-A).
 * Data is read only from the Home Assistant entities that the user configures.
 */
(() => {
  "use strict";
  if (window.__ATHLTH_CARDS_V1__) return;
  window.__ATHLTH_CARDS_V1__ = true;

  const GOLD = "#C7955F";
  const DESCRIPTIONS = {
    "athlth-dashboard-card": ["ATHLTH Dashboard", "Helhetlig ATHLTH-oversikt med valg av familiemedlem."],
    "athlth-week-card": ["ATHLTH Treningsuke", "Fremdrift, økter, tid og distanse."],
    "athlth-today-card": ["ATHLTH I dag", "Dagens planlagte trening."],
    "athlth-next-card": ["ATHLTH Neste økt", "Neste aktivitet fra treningsplanen."],
    "athlth-last-card": ["ATHLTH Siste økt", "Siste fullførte aktivitet med valgfritt rutekart."],
    "athlth-plan-card": ["ATHLTH Treningsplan", "Planoversikt basert på delte ATHLTH-data."],
    "athlth-family-card": ["ATHLTH Familie", "Frivillig sammenligning av ukens treningsaktivitet."],
    "athlth-recovery-card": ["ATHLTH Restitusjon", "Dagsform og valgfritt delte helseverdier."],
    "athlth-active-card": ["ATHLTH Live", "Status fra pågående treningsøkt."]
  };
  const SUFFIX = {
    weekly_progress: "weekly_progress",
    weekly_workout_count: "weekly_workout_count",
    weekly_training_minutes: "weekly_training_minutes",
    weekly_distance: "weekly_distance",
    next_workout: "next_workout",
    training_schedule: "training_schedule",
    next_workout_time: "next_workout_time",
    last_workout: "last_workout",
    recovery_score: "recovery_score",
    recovery_state: "recovery_state",
    sleep_duration: "sleep_duration",
    hrv: "hrv",
    resting_heart_rate: "resting_heart_rate",
    workout_active: "workout_active",
    workout_phase: "workout_phase",
    active_workout_elapsed_seconds: "workout_elapsed",
    active_workout_distance_meters: "workout_distance",
    active_workout_heart_rate_bpm: "workout_heart_rate",
    last_workout_route: "last_workout_route",
    last_sync: "last_sync",
    active_goal: "active_goal",
    goal_progress: "goal_progress",
    training_streak: "training_streak"
  };
  const DOMAINS = {workout_active:"binary_sensor",last_workout_route:"camera"};
  const esc = (value) => String(value === null || value === undefined ? "" : value)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const usable = (s) => s && !["unknown","unavailable","none",""].includes(String(s.state).toLowerCase());
  const valueOf = (s) => usable(s) ? s.state : null;
  const num = (s) => {
    const val=valueOf(s);
    if(val===null || val==="") return null;
    const n=Number(val);
    return Number.isFinite(n) ? n : null;
  };
  const fmt = (n, digits=0) => n===null || !Number.isFinite(n) ? "—" :
    new Intl.NumberFormat("nb-NO",{maximumFractionDigits:digits,minimumFractionDigits:digits}).format(n);
  const asDate = (raw) => typeof raw==="number" || (/^\d{10,13}$/.test(String(raw||""))) ? new Date(Number(raw)* (Number(raw)<1e12?1000:1)) : new Date(raw);
  const niceDate = (s) => {
    if(!s) return null;
    const d = asDate(s);
    return Number.isNaN(d.valueOf()) ? null : d.toLocaleString("nb-NO",{weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
  };
  const duration = (seconds) => {
    if(seconds===null) return "—";
    const m=Math.round(seconds/60);
    return m>=60 ? String(Math.floor(m/60))+" t "+String(m%60)+" min" : String(m)+" min";
  };
  const logo = () => '<span class="brand"><svg class="brandmark" viewBox="0 0 100 100" aria-hidden="true"><path d="M 8 67 L 28 67 C 34 67 43 20 50 8 C 57 11 64 55 72 58 L 84 58 M 49 49 L 59 88 L 69 65 L 92 65" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></svg><span>ATHLTH</span></span>';
  const el = (tag, cls, content) => '<'+tag+' class="'+cls+'">'+content+'</'+tag+'>';
  const statistic = (name,val,unit) => '<div class="stat"><div class="stat-value">'+esc(val)+(unit ? '<small>'+esc(unit)+'</small>':"")+'</div><div class="stat-label">'+esc(name)+'</div></div>';
  const bar = (percent) => '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+esc(Math.round(percent))+'"><span style="width:'+String(Math.min(100,Math.max(0,percent)))+'%"></span></div>';
  const card = (title,content,subtitle="") => '<ha-card><div class="body"><div class="card-head">'+logo()+'<span class="section-title">'+esc(title)+'</span></div>'+ (subtitle?'<p class="subtitle">'+esc(subtitle)+'</p>':"")+content+'</div></ha-card>';
  const empty = (message) => '<div class="empty"><span class="empty-dot"></span>'+esc(message)+'</div>';
  const memberKey = (member) => (member && member.entity) || "sensor.athlth_last_workout";
  function entity(hass, member, name) {
    if(!hass || !hass.states) return null;
    const explicit=member && member.entities && member.entities[name];
    if(explicit && typeof explicit === "string") return hass.states[explicit] || null;
    const anchor=memberKey(member);
    if(!/^sensor\.[a-z0-9_]+_last_workout$/.test(anchor)) return null;
    const suffix=SUFFIX[name];
    if(!suffix) return null;
    const tail=anchor.slice(0,-"last_workout".length);
    const domain=DOMAINS[name] || "sensor";
    const id=domain+"."+tail.split(".")[1]+suffix;
    return hass.states[id] || null;
  }
  function memberList(config) {
    if(Array.isArray(config.members) && config.members.length) {
      return config.members.filter(m=>m && typeof m==="object").slice(0,12);
    }
    return [{name:config.name || "Min trening",entity:config.entity || "sensor.athlth_last_workout",entities:config.entities || {}}];
  }
  function lastSync(hass,member) {
    const s=entity(hass,member,"last_sync");
    const time=valueOf(s);
    if(!time) return "";
    const d=new Date(time);
    if(!Number.isFinite(d.getTime())) return "";
    return '<div class="sync">Sist synkronisert '+esc(d.toLocaleString("nb-NO",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}))+'</div>';
  }
  function week(hass,member) {
    const percentage=num(entity(hass,member,"weekly_progress"));
    const count=num(entity(hass,member,"weekly_workout_count"));
    const minutes=num(entity(hass,member,"weekly_training_minutes"));
    const km=num(entity(hass,member,"weekly_distance"));
    if([percentage,count,minutes,km].every(v=>v===null)) return card("Treningsuken",empty("Koble til ATHLTH og aktiver deling av ukesfremdrift."));
    const pct=percentage===null ? 0 : Math.min(100,Math.max(0,percentage));
    const top='<div class="week-feature"><div><div class="eyebrow">DIN TRENINGSUKE</div><div class="huge">'+(percentage===null?"—":fmt(pct)+"%")+'</div><p class="muted">Fullført av planlagt trening</p></div><div class="ring" style="--pct:'+String(pct)+'"><span>'+ (percentage===null?"—":fmt(pct)+"%") +'</span></div></div>';
    const stats='<div class="stats cols-3">'+statistic("Økter",fmt(count),"")+statistic("Treningstid",fmt(minutes),"min")+statistic("Distanse",fmt(km,1),"km")+'</div>';
    return card("Treningsuken",top+(percentage===null?"":bar(pct))+stats+lastSync(hass,member));
  }
  function next(hass,member,todayOnly=false) {
    const s=entity(hass,member,"next_workout");
    const label=valueOf(s);
    const raw=valueOf(entity(hass,member,"next_workout_time")) || (s && s.attributes && s.attributes.scheduled_at);
    const d=raw?asDate(raw):null;
    const isToday = d && Number.isFinite(d.getTime()) && d.toDateString()===(new Date()).toDateString();
    const title=todayOnly?"I dag":"Neste økt";
    if(todayOnly && !isToday) return card(title,empty("Ingen bekreftet økt fra ATHLTH for i dag."));
    if(!label) return card(title,empty("Ingen planlagt økt mottatt fra ATHLTH."));
    const date=niceDate(raw);
    return card(title,'<div class="activity-hero"><span class="glyph" aria-hidden="true">↗</span><div><div class="activity-name">'+esc(label)+'</div>'+(date?'<div class="muted">'+esc(date)+'</div>':"")+'</div></div>'+lastSync(hass,member));
  }
  function last(hass,member) {
    const s=entity(hass,member,"last_workout");
    const name=valueOf(s);
    if(!name) return card("Siste økt",empty("Ingen fullført økt er delt med Home Assistant."));
    const a=s.attributes || {};
    const type=String(a.type||"").toLowerCase();
    const outdoor=/outdoor|run|running|walk|hike|cycling/.test(type) && !/treadmill|indoor/.test(type);
    const route=entity(hass,member,"last_workout_route");
    const routeEnd=route && route.attributes && route.attributes.ended_at;
    const hasMatch = route && usable(route) && a.ended_at && routeEnd && Math.abs(asDate(a.ended_at).getTime()-asDate(routeEnd).getTime())<180000;
    const image=outdoor && hasMatch ? '<div class="map"><img loading="lazy" alt="Kart over siste utendørs treningsøkt" src="/api/camera_proxy/'+encodeURIComponent(route.entity_id)+'"></div>' : "";
    const distance=Number.isFinite(Number(a.distance_meters))?fmt(Number(a.distance_meters)/1000,2)+" km":"—";
    const seconds=Number.isFinite(Number(a.duration_seconds))?duration(Number(a.duration_seconds)):"—";
    const heart=Number.isFinite(Number(a.average_heart_rate_bpm))?fmt(Number(a.average_heart_rate_bpm))+" bpm":"—";
    const source=a.device ? '<span class="chip">'+esc(String(a.device))+'</span>':"";
    return card("Siste økt",image+'<div class="activity-hero"><span class="glyph">'+(type.includes("strength")?"✦":type.includes("treadmill")?"▤":"↗")+'</span><div><div class="activity-name">'+esc(name)+'</div><div class="muted">'+(niceDate(a.ended_at)?esc(niceDate(a.ended_at)):"Fullført økt")+'</div></div></div><div class="stats cols-3">'+statistic("Distanse",distance,"")+statistic("Tid",seconds,"")+statistic("Snittpuls",heart,"")+'</div>'+source+lastSync(hass,member));
  }
  function plan(hass,member) {
    const goal=valueOf(entity(hass,member,"active_goal"));
    const progress=num(entity(hass,member,"goal_progress"));
    const s=entity(hass,member,"next_workout");
    const nextTitle=valueOf(s);
    const time=valueOf(entity(hass,member,"next_workout_time"));
    const heading=goal || "Min treningsplan";
    const schedule=entity(hass,member,"training_schedule");
    const rawEvents=schedule && schedule.attributes && schedule.attributes.events;
    const future=Array.isArray(rawEvents) ? rawEvents.filter(e=>e && e.start && Number.isFinite(asDate(e.start).getTime()) && asDate(e.start)>=new Date()).sort((a,b)=>asDate(a.start)-asDate(b.start)).slice(0,3) : [];
    const upcoming=future.length ? future.map(e=>'<div class="plan-row"><span>'+esc(niceDate(e.start)||"Planlagt")+'</span><strong>'+esc(e.title||"Treningsøkt")+'</strong></div>').join("") : '<div class="plan-row"><span>Neste planlagte økt</span><strong>'+esc(nextTitle||"Ikke tilgjengelig")+'</strong></div>'+(time?'<div class="muted">'+esc(niceDate(time)||"")+'</div>':"");
    const blocks='<div class="plan-title">'+esc(heading)+'</div>'+(progress===null?"":'<div class="muted">Målprogresjon '+fmt(progress)+'%</div>'+bar(progress))+upcoming+'<p class="note">Detaljert programstruktur vises når ATHLTH deler disse opplysningene.</p>';
    return card("Treningsplan",blocks);
  }
  function recovery(hass,member) {
    const score=num(entity(hass,member,"recovery_score"));
    const state=valueOf(entity(hass,member,"recovery_state"));
    const sleep=num(entity(hass,member,"sleep_duration"));
    const hrv=num(entity(hass,member,"hrv"));
    const rhr=num(entity(hass,member,"resting_heart_rate"));
    if([score,sleep,hrv,rhr].every(v=>v===null)&&!state) return card("Restitusjon",empty("Helsedeling er ikke aktivert, eller ingen data er mottatt."));
    const stateLabels={ready:"God dagsform",balanced:"Balansert",take_it_easy:"Ta det rolig",recover:"Restitusjon",building_baseline:"Bygger grunnlag"};
    return card("Restitusjon",'<div class="recovery"><div class="huge">'+fmt(score)+(score===null?"":"%")+'</div><div class="muted">'+esc(stateLabels[state]||state||"Dagsform")+'</div></div>'+(score===null?"":bar(score))+'<div class="stats cols-3">'+statistic("Søvn",sleep===null?"—":fmt(sleep/60,1),"t")+statistic("HRV",fmt(hrv),"ms")+statistic("Hvilepuls",fmt(rhr),"bpm")+'</div>');
  }
  function active(hass,member) {
    const s=entity(hass,member,"workout_active");
    if(!s || s.state!=="on") return card("Live trening",empty("Ingen aktiv treningsøkt registrert."));
    const phase=valueOf(entity(hass,member,"workout_phase"));
    const secs=num(entity(hass,member,"active_workout_elapsed_seconds"));
    const dist=num(entity(hass,member,"active_workout_distance_meters"));
    const bpm=num(entity(hass,member,"active_workout_heart_rate_bpm"));
    const name=s.attributes && (s.attributes.workout_name || s.attributes.name || s.attributes.workout);
    return card("Live trening",'<div class="live"><span class="live-dot"></span> AKTIV ØKT</div><div class="activity-name">'+esc(name||"Treningsøkt")+'</div>'+(phase?'<div class="muted">Fase: '+esc(phase)+'</div>':"")+'<div class="stats cols-3">'+statistic("Varighet",duration(secs),"")+statistic("Distanse",dist===null?"—":fmt(dist/1000,2),"km")+statistic("Puls",fmt(bpm),"bpm")+'</div>'+lastSync(hass,member));
  }
  function family(hass,members) {
    const items=members.map((m)=>{
      const p=num(entity(hass,m,"weekly_progress"));
      const count=num(entity(hass,m,"weekly_workout_count"));
      const nextName=valueOf(entity(hass,m,"next_workout"));
      return '<div class="family-row"><div class="avatar" aria-hidden="true">◉</div><div class="family-main"><strong>'+esc(m.name||"ATHLTH-bruker")+'</strong><div class="muted">'+(count===null?"Ingen ukedata":fmt(count)+" økter denne uken")+'</div>'+(nextName?'<div class="muted">Neste: '+esc(nextName)+'</div>':"")+(p===null?"":bar(p))+'</div><div class="family-percent">'+(p===null?"—":fmt(p)+"%")+'</div></div>';
    }).join("");
    return card("Familiens trening",items||empty("Ingen familiemedlemmer valgt."));
  }
  function dashboard(hass,members,selected) {
    const member=members[selected]||members[0];
    const chooser=members.length>1?'<div class="member-tabs" role="group" aria-label="Velg familiemedlem">'+members.map((m,i)=>'<button type="button" data-athlth-member="'+i+'" class="'+(i===selected?"selected":"")+'">'+esc(m.name||"Medlem "+(i+1))+'</button>').join("")+'</div>':"";
    return '<div class="dashboard"><div class="dashboard-head">'+logo()+'<div class="subbrand">PROGRESS LIVES HERE.</div></div>'+chooser+'<div class="dashboard-grid"><div class="wide">'+week(hass,member)+'</div><div>'+today(hass,member)+'</div><div>'+next(hass,member)+'</div><div class="wide">'+last(hass,member)+'</div><div>'+plan(hass,member)+'</div><div>'+recovery(hass,member)+'</div>'+(members.length>1?'<div class="wide">'+family(hass,members)+'</div>':"")+'<div class="wide">'+active(hass,member)+'</div></div></div>';
  }
  function today(hass,member){
    const schedule=entity(hass,member,"training_schedule");
    const raw=schedule && schedule.attributes && schedule.attributes.events;
    const todayDate=new Date().toDateString();
    const upcoming=Array.isArray(raw)?raw.filter(e=>e && e.start && asDate(e.start).toDateString()===todayDate && asDate(e.end||e.start)>=new Date()).sort((a,b)=>asDate(a.start)-asDate(b.start)): [];
    if(!upcoming.length) return next(hass,member,true);
    const rows=upcoming.slice(0,3).map(e=>'<div class="plan-row"><span>'+esc(niceDate(e.start)||"")+'</span><strong>'+esc(e.title||"Treningsøkt")+'</strong></div>').join("");
    return card("I dag",rows);
  }
  const CSS = [
    ':host{display:block;--ath-gold:',GOLD,';--ath-text:var(--primary-text-color,#151519);--ath-muted:var(--secondary-text-color,#7d7d84);color:var(--ath-text);font-family:inherit}',
    'ha-card{display:block;background:var(--card-background-color,#fff);border:1px solid var(--divider-color,rgba(0,0,0,.08));border-radius:22px;box-shadow:0 8px 26px rgba(0,0,0,.035);overflow:hidden;color:var(--ath-text)}',
    '.body{padding:20px;min-width:0}.card-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:18px;min-width:0}',
    '.brand{display:inline-flex;align-items:center;gap:5px;letter-spacing:2px;font-size:11px;font-weight:900;white-space:nowrap}.brandmark{width:27px;height:27px;color:var(--ath-text)}',
    '.section-title{color:var(--ath-muted);font-size:12px;letter-spacing:.3px;text-align:right;font-weight:650}',
    '.eyebrow{font-size:10px;font-weight:750;letter-spacing:1.35px;color:var(--ath-muted)}.huge{font-size:34px;font-weight:750;line-height:1.22;letter-spacing:-1.5px}',
    '.week-feature{display:flex;justify-content:space-between;align-items:center;gap:18px}.ring{flex-shrink:0;display:grid;place-items:center;width:96px;height:96px;border-radius:50%;background:conic-gradient(var(--ath-gold) calc(var(--pct)*1%),var(--secondary-background-color,#ece9e5) 0)}',
    '.ring span{background:var(--card-background-color,#fff);height:76px;width:76px;display:grid;place-items:center;border-radius:50%;font-weight:800;font-size:17px}',
    '.muted,.subtitle,.note,.sync{color:var(--ath-muted);font-size:12px;line-height:1.5}.muted{margin:3px 0}.subtitle{margin:0 0 12px}.note{font-size:11px;margin:12px 0 0}.sync{font-size:10px;margin-top:14px}',
    '.progress{height:6px;background:var(--secondary-background-color,#eee9e4);border-radius:100px;margin:15px 0 20px;overflow:hidden}.progress span{display:block;height:100%;background:linear-gradient(90deg,#ad7f4a,var(--ath-gold));border-radius:inherit}',
    '.stats{display:grid;gap:10px;padding-top:14px;border-top:1px solid var(--divider-color,rgba(0,0,0,.08));margin-top:16px}.cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}.stat{min-width:0}.stat-value{font-size:17px;letter-spacing:-.4px;font-weight:750;overflow-wrap:anywhere}.stat-value small{font-size:11px;font-weight:550;margin-left:3px}.stat-label{font-size:11px;color:var(--ath-muted);margin-top:4px}',
    '.activity-hero{display:flex;gap:14px;align-items:center}.activity-name,.plan-title{font-size:19px;font-weight:750;line-height:1.25;overflow-wrap:anywhere}.glyph{height:55px;width:55px;border-radius:16px;background:color-mix(in srgb,var(--ath-gold) 15%,transparent);color:var(--ath-gold);display:grid;place-items:center;font-size:27px;flex-shrink:0}',
    '.map{border-radius:16px;overflow:hidden;max-height:245px;margin-bottom:14px;background:var(--secondary-background-color,#eee)}.map img{width:100%;height:245px;object-fit:cover;display:block}',
    '.chip{display:inline-block;margin-top:14px;color:var(--ath-muted);font-size:10px;border:1px solid var(--divider-color,#ddd);padding:4px 9px;border-radius:99px}',
    '.plan-row{display:flex;flex-direction:column;gap:5px;margin-top:18px;padding-top:15px;border-top:1px solid var(--divider-color,#ddd)}.plan-row span{font-size:11px;color:var(--ath-muted)}.plan-row strong{font-size:15px}',
    '.empty{display:flex;align-items:center;gap:10px;color:var(--ath-muted);font-size:12px;min-height:56px;line-height:1.5}.empty-dot{width:9px;height:9px;background:var(--ath-gold);opacity:.8;border-radius:50%;flex-shrink:0}',
    '.recovery{display:flex;justify-content:space-between;align-items:end;gap:12px}.family-row{display:flex;align-items:flex-start;gap:12px;padding:12px 0}.family-row+.family-row{border-top:1px solid var(--divider-color,#eee)}.avatar{background:color-mix(in srgb,var(--ath-gold) 15%,transparent);border-radius:50%;height:40px;width:40px;display:grid;place-items:center;color:var(--ath-gold)}.family-main{flex:1;min-width:0}.family-main strong{font-size:14px}.family-main .progress{margin:8px 0 0}.family-percent{font-size:13px;font-weight:700;color:var(--ath-gold)}',
    '.live{display:flex;align-items:center;gap:7px;color:var(--ath-gold);font-size:11px;font-weight:800;letter-spacing:1px;margin-bottom:12px}.live-dot{width:8px;height:8px;border-radius:50%;background:var(--ath-gold)}',
    '.dashboard{display:block}.dashboard-head{display:flex;flex-direction:column;align-items:flex-start;gap:3px;margin-bottom:20px;padding:0 4px}.dashboard-head .brand{font-size:20px;letter-spacing:4px;gap:7px}.dashboard-head .brandmark{height:44px;width:44px}.subbrand{font-size:9px;letter-spacing:2px;color:var(--ath-muted);font-weight:700;padding-left:51px}',
    '.dashboard-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.dashboard-grid>.wide{grid-column:span 2}.dashboard-grid>div{min-width:0}.dashboard-grid ha-card{height:100%}',
    '.member-tabs{display:flex;gap:7px;overflow-x:auto;margin:0 0 18px;padding:3px 0 8px}.member-tabs button{border:1px solid var(--divider-color,#ddd);border-radius:100px;background:var(--card-background-color,#fff);color:var(--ath-text);font:600 12px inherit;padding:9px 17px;cursor:pointer;white-space:nowrap}.member-tabs button.selected{border-color:var(--ath-gold);background:color-mix(in srgb,var(--ath-gold) 13%,var(--card-background-color,#fff))}',
    '@media(max-width:600px){.dashboard-grid{grid-template-columns:minmax(0,1fr)}.dashboard-grid>.wide{grid-column:span 1}.body{padding:17px}.dashboard-head{margin-bottom:12px}}'
  ].join("");

  for(const kind of Object.keys(DESCRIPTIONS)){
    if(customElements.get(kind)) continue;
    class ATHLTHCard extends HTMLElement {
      constructor(){
        super();
        this._root=this.attachShadow({mode:"open"});
        this._config={type:"custom:"+kind};
        this._selected=0;
      }
      setConfig(config){
        if(!config || typeof config!=="object") throw new Error("ATHLTH-kort: ugyldig konfigurasjon.");
        this._config=config;
        this._selected=0;
        this.render();
      }
      set hass(hass){this._hass=hass;this.render();}
      getCardSize(){return kind==="athlth-dashboard-card"?12:kind==="athlth-family-card"?5:3;}
      static getStubConfig(){return {type:"custom:"+kind};}
      connectedCallback(){
        this._root.addEventListener("click",(event)=>{
          const btn=event.target && event.target.closest && event.target.closest("[data-athlth-member]");
          if(!btn) return;
          const n=Number(btn.getAttribute("data-athlth-member"));
          if(Number.isInteger(n)){this._selected=n;this.render();}
        });
        this.render();
      }
      render(){
        if(!this._root || !this._hass) return;
        const members=memberList(this._config);
        const member=members[0];
        const builders={
          "athlth-week-card":()=>week(this._hass,member),
          "athlth-today-card":()=>today(this._hass,member),
          "athlth-next-card":()=>next(this._hass,member),
          "athlth-last-card":()=>last(this._hass,member),
          "athlth-plan-card":()=>plan(this._hass,member),
          "athlth-family-card":()=>family(this._hass,members),
          "athlth-recovery-card":()=>recovery(this._hass,member),
          "athlth-active-card":()=>active(this._hass,member),
          "athlth-dashboard-card":()=>dashboard(this._hass,members,this._selected)
        };
        this._root.innerHTML="<style>"+CSS+"</style>"+builders[kind]();
      }
    }
    customElements.define(kind,ATHLTHCard);
  }
  window.customCards=window.customCards||[];
  for(const [type,data] of Object.entries(DESCRIPTIONS)){
    if(!window.customCards.some((c)=>c.type===type))window.customCards.push({
      type,name:data[0],description:data[1],preview:true,
      documentationURL:"https://github.com/Wesc-9/ATHLTH_HA"
    });
  }
  console.info("ATHLTH premium dashboard cards registered");
})();
