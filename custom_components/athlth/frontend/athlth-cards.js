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
    "athlth-active-card": ["ATHLTH Live", "Status fra pågående treningsøkt."],
    "athlth-calendar-card": ["ATHLTH Ukeplan", "Planlagte økter fra ATHLTH-kalenderen."],
    "athlth-goals-card": ["ATHLTH Mål", "Personlige treningsmål og fremdrift."],
    "athlth-strength-card": ["ATHLTH Styrke", "Pågående styrkeøvelse, sett og repetisjoner."],
    "athlth-history-card": ["ATHLTH Mottatte økter", "Inntil ti fullførte økter mottatt etter oppkobling."],
    "athlth-status-card": ["ATHLTH Status", "Online, trener nå eller offline for en ATHLTH-bruker."]
  };
  const SUFFIX = {
    presence: "presence",
    weekly_progress: "weekly_progress",
    weekly_workout_count: "weekly_workout_count",
    weekly_training_minutes: "weekly_training_minutes",
    weekly_distance: "weekly_distance_km",
    next_workout: "next_workout",
    training_schedule: "training_schedule",
    training_plan: "training_plan",
    next_workout_time: "next_workout_time",
    last_workout: "last_workout",
    recent_workouts: "recent_workouts",
    recovery_score: "recovery_score",
    recovery_state: "recovery_state",
    sleep_duration: "sleep_duration_minutes",
    hrv: "hrv_milliseconds",
    resting_heart_rate: "resting_heart_rate",
    workout_active: "workout_active",
    workout_phase: "workout_phase",
    active_workout_elapsed_seconds: "active_workout_elapsed_seconds",
    active_workout_distance_meters: "active_workout_distance_meters",
    active_workout_heart_rate_bpm: "active_workout_heart_rate_bpm",
    last_workout_route: "last_workout_route",
    last_sync: "last_sync",
    active_goal: "active_goal",
    goal_days_remaining: "goal_days_remaining",
    current_exercise: "current_exercise",
    current_set: "current_set",
    current_set_total: "current_set_total",
    current_reps: "current_reps",
    current_weight_kg: "current_weight_kg",
    current_rest_seconds: "current_rest_seconds",
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
  const logo = () => '<span class="brand"><svg class="brandmark" viewBox="0 0 100 100" aria-hidden="true"><path d="M 8 67 L 28 67 C 34 67 43 20 50 8 C 57 11 64 55 72 58 L 84 58 M 49 49 L 59 88 L 69 65 L 92 65" fill="none" stroke="currentColor" stroke-width="15.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>ATHLTH</span></span>';
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
      const seen=new Set();
      return config.members.filter(m=>{
        if(!m || typeof m!=="object" || !m.entity || seen.has(m.entity))return false;
        seen.add(m.entity);
        return true;
      }).slice(0,12);
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

  const STATUS = Object.freeze({
    training:{label:"Trener nå",className:"training",hint:"En aktiv treningsøkt er nylig rapportert."},
    online:{label:"Online",className:"online",hint:"ATHLTH er åpen og nylig synkronisert."},
    offline:{label:"Offline",className:"offline",hint:"ATHLTH er ikke åpen på telefonen."},
    unknown:{label:"Ukjent",className:"unknown",hint:"Ingen fersk status. Vises ikke som online."},
    not_shared:{label:"Ikke delt",className:"private",hint:"Online-deling er av eller status er ikke tilgjengelig."}
  });
  function presence(hass,member){
    const s=entity(hass,member,"presence");
    const raw=String(valueOf(s)||"unknown");
    return STATUS[raw]?raw:"unknown";
  }
  function statusPill(hass,member){
    const state=presence(hass,member);
    const def=STATUS[state];
    return '<span class="status-pill status-'+def.className+'" title="'+esc(def.hint)+'" aria-label="ATHLTH-status: '+esc(def.label)+'"><i class="status-dot" aria-hidden="true"></i>'+esc(def.label)+'</span>';
  }
  function memberInitial(name){
    return esc(String(name||"A").trim().charAt(0).toLocaleUpperCase("nb-NO")||"A");
  }
  function statusCard(hass,member){
    const state=presence(hass,member);
    const label=member&&member.name?member.name:"Min status";
    const desc=STATUS[state].hint;
    const active=entity(hass,member,"workout_active");
    const session=active&&active.attributes&&active.attributes.active_workout;
    const name=state==="training"&&session?'<div class="muted">'+esc(session)+'</div>':"";
    return card("Min status",'<div class="status-feature"><div class="avatar avatar-status status-'+esc(state)+'" aria-hidden="true">'+memberInitial(label)+'</div><div class="status-name"><div class="activity-name">'+esc(label)+'</div><div class="muted">'+esc(desc)+'</div>'+name+'</div>'+statusPill(hass,member)+'</div>'+lastSync(hass,member));
  }
  function weeklyPlanStats(hass,member){
    const state=entity(hass,member,"training_schedule");
    const entries=state&&state.attributes&&state.attributes.events;
    if(!Array.isArray(entries))return null;
    const now=new Date(),monday=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    monday.setDate(monday.getDate()-((monday.getDay()+6)%7));
    const end=new Date(monday);end.setDate(end.getDate()+7);
    const seen=new Set();
    const filtered=entries.filter(e=>{
      if(!e||!e.start||!["planned","completed","skipped"].includes(e.status))return false;
      const date=asDate(e.start);
      if(!Number.isFinite(date.getTime())||date<monday||date>=end)return false;
      const key=String(e.plan_id||"standalone")+":"+String(e.id||e.start+"-"+e.title);
      if(seen.has(key))return false;
      seen.add(key);return true;
    });
    const completed=filtered.filter(e=>e.status==="completed").length;
    const pending=filtered.filter(e=>e.status==="planned").length;
    const total=completed+pending;
    return total>0?{completed,total,percent:100*completed/total}:null;
  }
  function week(hass,member){
    const plan=weeklyPlanStats(hass,member);
    const percentage=plan?plan.percent:num(entity(hass,member,"weekly_progress"));
    const count=num(entity(hass,member,"weekly_workout_count"));
    const minutes=num(entity(hass,member,"weekly_training_minutes"));
    const km=num(entity(hass,member,"weekly_distance"));
    if([percentage,count,minutes,km].every(v=>v===null))return card("Treningsuken",empty("Koble til ATHLTH og aktiver deling av ukesfremdrift."));
    const pct=percentage===null?0:Math.min(100,Math.max(0,percentage));
    const detail=plan?fmt(plan.completed)+" av "+fmt(plan.total)+" planlagte økter fullført":"Fremdrift rapportert fra ATHLTH";
    const top='<div class="week-feature"><div><div class="eyebrow">DIN TRENINGSUKE</div><div class="huge">'+(percentage===null?"—":fmt(pct)+"%")+'</div><p class="muted">'+esc(detail)+'</p></div><div class="ring" style="--pct:'+String(pct)+'"><span>'+(percentage===null?"—":fmt(pct)+"%")+'</span></div></div>';
    const stats='<div class="stats cols-3">'+statistic("Økter totalt",fmt(count),"")+statistic("Treningstid",fmt(minutes),"min")+statistic("Distanse",fmt(km,1),"km")+'</div>';
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
    if(!name)return card("Siste økt",empty("Ingen fullført økt er delt med Home Assistant."));
    const a=s.attributes||{};
    const type=String(a.type||"").toLowerCase();
    const indoor=/treadmill|indoor/.test(type);
    const strengthMode=/strength|weight|functional|lifting/.test(type);
    const outdoor=!indoor&&!strengthMode&&/outdoor|run|walk|hike|cycling/.test(type);
    const route=entity(hass,member,"last_workout_route");
    const routeEnd=route&&route.attributes&&route.attributes.ended_at;
    const match=outdoor&&route&&usable(route)&&a.ended_at&&routeEnd&&
      Math.abs(asDate(a.ended_at).getTime()-asDate(routeEnd).getTime())<180000;
    const image=match?'<div class="map"><img loading="lazy" alt="Kart over siste utendørs treningsøkt" src="/api/camera_proxy/'+encodeURIComponent(route.entity_id)+'"></div>':"";
    const number=(key)=>a[key]!=null&&a[key]!==""&&Number.isFinite(Number(a[key]))?Number(a[key]):null;
    const meters=number("distance_meters");
    const seconds=number("duration_seconds");
    const pace=number("average_pace_seconds_per_km");
    const bpm=number("average_heart_rate_bpm");
    const energy=number("active_energy_kcal");
    const climb=number("elevation_gain_meters");
    const paceText=pace===null||pace<=0?"—":Math.floor(pace/60)+":"+String(Math.round(pace%60)).padStart(2,"0");
    const distance=meters===null?"—":fmt(meters/1000,2);
    const time=duration(seconds);
    const stats=strengthMode?[
      ["Varighet",time,""],
      ["Energi",fmt(energy),"kcal"],
      ["Snittpuls",fmt(bpm),"bpm"]
    ]:[
      ["Distanse",distance,"km"],
      ["Varighet",time,""],
      ["Tempo",paceText,"/km"],
      ["Snittpuls",fmt(bpm),"bpm"]
    ];
    if(outdoor&&climb!==null)stats.push(["Høydemeter",fmt(climb),"m"]);
    const metrics='<div class="stats cols-3">'+stats.map(v=>statistic(...v)).join("")+'</div>';
    const icon=strengthMode?"✦":indoor?"▤":"↗";
    const classification=strengthMode?"Styrke":indoor?"Løping innendørs":outdoor?"Utendørsaktivitet":"Fullført aktivitet";
    const source=a.device?'<span class="chip">'+esc(String(a.device))+'</span>':"";
    return card("Siste økt",image+
      '<div class="activity-hero"><span class="glyph">'+icon+'</span><div>'+
      '<div class="eyebrow">'+esc(classification)+'</div>'+
      '<div class="activity-name">'+esc(name)+'</div>'+
      '<div class="muted">'+esc(niceDate(a.ended_at)||"Fullført økt")+'</div>'+
      '</div></div>'+metrics+source+lastSync(hass,member));
  }
  function plan(hass,member) {
    const program=entity(hass,member,"training_plan");
    const title=valueOf(program);
    const info=program&&program.attributes||{};
    const week=Number(info.current_week);
    const weeks=Number(info.total_weeks);
    const validWeeks=title&&Number.isInteger(week)&&Number.isInteger(weeks)&&weeks>0&&week>=0&&week<=weeks;
    const header=title?'<div class="plan-title">'+esc(title)+'</div>'+(validWeeks?'<div class="muted">'+(week===0?"Starter snart":"Uke "+week+" av "+weeks)+'</div>':""):
      '<div class="plan-title">Kommende trening</div>';
    const s=entity(hass,member,"next_workout");
    const nextTitle=valueOf(s);
    const time=valueOf(entity(hass,member,"next_workout_time"));
    const schedule=entity(hass,member,"training_schedule");
    const rawEvents=schedule&&schedule.attributes&&schedule.attributes.events;
    const future=Array.isArray(rawEvents)?rawEvents.filter(e=>e && e.status!=="completed" && e.status!=="skipped" && e.start && Number.isFinite(asDate(e.start).getTime()) && asDate(e.start)>=new Date()).sort((a,b)=>asDate(a.start)-asDate(b.start)).slice(0,3):[];
    const upcoming=future.length?future.map(e=>'<div class="plan-row"><span>'+esc(niceDate(e.start)||"Planlagt")+'</span><strong>'+esc(e.title||"Treningsøkt")+'</strong></div>').join(""):
      '<div class="plan-row"><span>Neste planlagte økt</span><strong>'+esc(nextTitle||"Ikke tilgjengelig")+'</strong></div>'+(time?'<div class="muted">'+esc(niceDate(time)||"")+'</div>':"");
    const note=title?'Detaljert øktstruktur er ennå ikke delt med Home Assistant.':
      'Aktiv treningsplan er ikke delt. Koble til ATHLTH og aktiver deling av treningskalender.';
    return card("Treningsplan",header+upcoming+'<p class="note">'+esc(note)+'</p>');
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
    if(!liveFresh(hass,member)) return card("Live trening",empty("Tilkoblingen er ikke oppdatert nylig. Liveøkt kan ikke bekreftes.")+lastSync(hass,member));
    const phase=valueOf(entity(hass,member,"workout_phase"));
    const secs=num(entity(hass,member,"active_workout_elapsed_seconds"));
    const dist=num(entity(hass,member,"active_workout_distance_meters"));
    const bpm=num(entity(hass,member,"active_workout_heart_rate_bpm"));
    const name=s.attributes && (s.attributes.active_workout || s.attributes.workout_name || s.attributes.name || s.attributes.workout);
    return card("Live trening",'<div class="live"><span class="live-dot"></span> AKTIV ØKT</div><div class="activity-name">'+esc(name||"Treningsøkt")+'</div>'+(phase?'<div class="muted">Fase: '+esc(phase)+'</div>':"")+'<div class="stats cols-3">'+statistic("Varighet",duration(secs),"")+statistic("Distanse",dist===null?"—":fmt(dist/1000,2),"km")+statistic("Puls",fmt(bpm),"bpm")+'</div>'+lastSync(hass,member));
  }
  function calendar(hass,member) {
    const state=entity(hass,member,"training_schedule");
    const raw=state&&state.attributes&&state.attributes.events;
    const events=Array.isArray(raw)?raw.filter(e=>e&&e.start&&e.title&&Number.isFinite(asDate(e.start).getTime())).sort((a,b)=>asDate(a.start)-asDate(b.start)):[];
    if(!events.length) return card("Ukeplan",empty("Ingen planlagte økter er delt fra ATHLTH-kalenderen."));
    const now=new Date();
    const monday=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    monday.setDate(monday.getDate()-((monday.getDay()+6)%7));
    const names=["Man","Tir","Ons","Tor","Fre","Lør","Søn"];
    const cells=names.map((name,i)=>{
      const day=new Date(monday);day.setDate(day.getDate()+i);
      const tomorrow=new Date(day);tomorrow.setDate(tomorrow.getDate()+1);
      const sessions=events.filter(e=>asDate(e.start)>=day&&asDate(e.start)<tomorrow);
      return '<div class="calendar-day '+(day.toDateString()===now.toDateString()?"today":"")+'"><div class="calendar-date">'+name+' '+day.getDate()+'</div>'+(sessions.length?sessions.map(e=>{
        const status=e.status==="completed"?"completed":e.status==="skipped"?"skipped":"planned";
        const marker=status==="completed"?"✓ ":status==="skipped"?"– ":"";
        return '<div class="calendar-item status-'+status+'">'+marker+esc(e.title)+'</div>';
      }).join(""):'<span class="calendar-off">—</span>')+'</div>';
    }).join("");
    return card("Ukeplan",'<div class="calendar-grid">'+cells+'</div><p class="note">Statusene kommer fra ATHLTH. Eldre appversjoner deler bare planlagte økter.</p>');
  }
  function goals(hass,member) {
    const name=valueOf(entity(hass,member,"active_goal"));
    const percent=num(entity(hass,member,"goal_progress"));
    const days=num(entity(hass,member,"goal_days_remaining"));
    const streak=num(entity(hass,member,"training_streak"));
    if(!name&&percent===null&&days===null&&streak===null) return card("Mine mål",empty("Ingen treningsmål er delt fra ATHLTH."));
    const progress=percent===null?"":'<div class="huge">'+fmt(percent)+'%</div>'+bar(Math.min(100,Math.max(0,percent)));
    const statistics='<div class="stats cols-3">'+statistic("Dager igjen",fmt(days),"")+statistic("Treningsrekke",fmt(streak),"dager")+statistic("Fremdrift",fmt(percent),"%")+'</div>';
    return card("Mine mål",'<div class="activity-name">'+esc(name||"Personlig mål")+'</div>'+progress+statistics);
  }
  function strength(hass,member) {
    const status=entity(hass,member,"workout_active");
    const exercise=valueOf(entity(hass,member,"current_exercise"));
    if(!status||status.state!=="on"||!exercise) return card("Styrke",empty("Ingen aktiv styrkeøkt med delte settdetaljer."));
    if(!liveFresh(hass,member)) return card("Styrke",empty("Styrkeøkten kan ikke bekreftes. Venter på ny oppdatering.")+lastSync(hass,member));
    const set=num(entity(hass,member,"current_set"));
    const total=num(entity(hass,member,"current_set_total"));
    const repetitions=num(entity(hass,member,"current_reps"));
    const kg=num(entity(hass,member,"current_weight_kg"));
    const rest=num(entity(hass,member,"current_rest_seconds"));
    const setLabel=set===null?"—":fmt(set)+(total===null?"":" / "+fmt(total));
    return card("Styrke",'<div class="live"><span class="live-dot"></span> '+(rest!==null&&rest>0?"PAUSE":"PÅGÅENDE")+'</div><div class="activity-name">'+esc(exercise)+'</div><div class="stats cols-3">'+statistic("Sett",setLabel,"")+statistic("Reps",fmt(repetitions),"")+statistic("Vekt",fmt(kg,1),"kg")+'</div>'+(rest!==null&&rest>0?'<div class="muted">Pause '+fmt(rest)+' sekunder</div>':"")+lastSync(hass,member));
  }

  function history(hass,member) {
    const entityState=entity(hass,member,"recent_workouts");
    const records=entityState&&entityState.attributes&&entityState.attributes.workouts;
    if(!Array.isArray(records)||!records.length) {
      return card("Mottatte økter",empty("Ingen fullførte økter er mottatt siden tilkoblingen.")+
        '<p class="note">Dette er ikke hele treningshistorikken i ATHLTH-appen.</p>');
    }
    const rows=records.slice(0,8).map((workout)=>{
      const name=String(workout.name||"Treningsøkt");
      const kind=String(workout.type||"").toLowerCase();
      const icon=kind.includes("strength")?"✦":kind.includes("treadmill")?"▤":"↗";
      const date=niceDate(workout.ended_at)||"Registrert økt";
      const seconds=Number(workout.duration_seconds);
      const distance=Number(workout.distance_meters);
      const details=[];
      if(Number.isFinite(seconds)&&seconds>=0&&workout.duration_seconds!==undefined)details.push(duration(seconds));
      if(Number.isFinite(distance)&&distance>0)details.push(fmt(distance/1000,2)+" km");
      return '<div class="history-row"><span class="history-glyph">'+icon+'</span><div class="history-content"><strong>'+
        esc(name)+'</strong><div class="muted">'+esc(date)+(details.length?" · "+esc(details.join(" · ")):"")+
        '</div></div></div>';
    }).join("");
    return card("Mottatte økter",rows+'<p class="note">Viser opptil ti fullførte økter som Home Assistant har mottatt. Ingen eldre økter blir automatisk hentet.</p>');
  }

  function liveFresh(hass,member) {
    const last=valueOf(entity(hass,member,"last_sync"));
    if(!last) return false;
    const timestamp=asDate(last).getTime();
    const elapsed=Date.now()-timestamp;
    return Number.isFinite(elapsed)&&elapsed>=-60000&&elapsed<=240000;
  }
  function family(hass,members) {
    const statusValues=members.map(m=>presence(hass,m));
    const trainingCount=statusValues.filter(s=>s==="training").length;
    const onlineCount=statusValues.filter(s=>s==="online").length;
    const unknownCount=statusValues.filter(s=>s==="unknown"||s==="not_shared").length;
    const summary='<div class="family-status-summary">'+
      '<span class="family-count status-training"><i class="status-dot"></i>'+trainingCount+' trener nå</span>'+
      '<span class="family-count status-online"><i class="status-dot"></i>'+onlineCount+' online</span>'+
      (unknownCount?'<span class="family-count status-unknown">'+unknownCount+' uten fersk status</span>':"")+
      '</div>';
    const items=members.map((m)=>{
      const plan=weeklyPlanStats(hass,m);
      const p=plan?plan.percent:num(entity(hass,m,"weekly_progress"));
      const count=num(entity(hass,m,"weekly_workout_count"));
      const nextName=valueOf(entity(hass,m,"next_workout"));
      return '<div class="family-row"><div class="avatar avatar-status status-'+presence(hass,m)+'" aria-hidden="true">'+memberInitial(m.name)+'</div><div class="family-main"><div class="family-identity"><strong>'+esc(m.name||"ATHLTH-bruker")+'</strong>'+statusPill(hass,m)+'</div><div class="muted">'+(count===null?"Ingen ukedata":fmt(count)+" økter denne uken")+'</div>'+(nextName?'<div class="muted">Neste: '+esc(nextName)+'</div>':"")+(p===null?"":bar(p))+'</div><div class="family-percent">'+(p===null?"—":fmt(p)+"%")+'</div></div>';
    }).join("");
    return card("Familiens trening",summary+(items||empty("Ingen familiemedlemmer valgt.")));
  }
  function dashboard(hass,members,selected) {
    const member=members[selected]||members[0];
    const chooser=members.length>1?'<div class="member-tabs" role="group" aria-label="Velg familiemedlem">'+members.map((m,i)=>'<button type="button" data-athlth-member="'+i+'" class="'+(i===selected?"selected":"")+'">'+esc(m.name||"Medlem "+(i+1))+'</button>').join("")+'</div>':"";
    return '<div class="dashboard"><div class="dashboard-head"><div class="dashboard-brand">'+logo()+'<div class="subbrand">PROGRESS LIVES HERE.</div></div>'+statusPill(hass,member)+'</div>'+chooser+'<div class="dashboard-grid"><div class="wide">'+statusCard(hass,member)+'</div><div class="wide">'+week(hass,member)+'</div><div>'+today(hass,member)+'</div><div>'+next(hass,member)+'</div><div class="wide">'+last(hass,member)+'</div><div>'+plan(hass,member)+'</div><div>'+recovery(hass,member)+'</div><div class="wide">'+calendar(hass,member)+'</div><div class="wide">'+history(hass,member)+'</div>'+(members.length>1?'<div class="wide">'+family(hass,members)+'</div>':"")+'<div class="wide">'+active(hass,member)+'</div></div></div>';
  }
  function today(hass,member){
    const schedule=entity(hass,member,"training_schedule");
    const raw=schedule && schedule.attributes && schedule.attributes.events;
    const todayDate=new Date().toDateString();
    const upcoming=Array.isArray(raw)?raw.filter(e=>e && e.start && asDate(e.start).toDateString()===todayDate).sort((a,b)=>asDate(a.start)-asDate(b.start)): [];
    if(!upcoming.length) return next(hass,member,true);
    const rows=upcoming.slice(0,3).map(e=>{
      const label=e.status==="completed"?"Fullført":e.status==="skipped"?"Hoppet over":"Planlagt";
      return '<div class="plan-row"><span>'+esc(label)+' · '+esc(niceDate(e.start)||"")+'</span><strong>'+esc(e.title||"Treningsøkt")+'</strong></div>';
    }).join("");
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
    '.history-row{display:flex;gap:12px;align-items:center;padding:12px 0}.history-row+.history-row{border-top:1px solid var(--divider-color,#eee)}.history-glyph{display:grid;place-items:center;width:38px;height:38px;flex-shrink:0;border-radius:12px;color:var(--ath-gold);background:color-mix(in srgb,var(--ath-gold) 12%,transparent);font-size:18px}.history-content{flex:1;min-width:0}.history-content strong{font-size:13px;overflow-wrap:anywhere}',
    '.calendar-item.status-completed{background:color-mix(in srgb,#558878 15%,transparent);color:var(--ath-text)}.calendar-item.status-skipped{opacity:.54;text-decoration:line-through}',
    '.family-status-summary{display:flex;gap:8px;flex-wrap:wrap;padding:0 0 12px;border-bottom:1px solid var(--divider-color,#eee)}.family-count{display:inline-flex;gap:5px;align-items:center;border-radius:99px;background:var(--secondary-background-color,#f5f4f1);padding:5px 9px;font-size:11px;font-weight:650}.family-count.status-unknown{color:var(--ath-muted)}',
    '.calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}.calendar-day{border:1px solid var(--divider-color,#eee);border-radius:12px;padding:8px 5px;min-width:0;min-height:70px}.calendar-day.today{border-color:var(--ath-gold);background:color-mix(in srgb,var(--ath-gold) 10%,transparent)}.calendar-date{font-size:10px;color:var(--ath-muted);margin-bottom:5px}.calendar-item{font-size:10px;background:color-mix(in srgb,var(--ath-gold) 14%,transparent);border-radius:6px;padding:4px;overflow-wrap:anywhere;margin-top:4px}.calendar-off{font-size:12px;color:var(--ath-muted)}',
    '.live{display:flex;align-items:center;gap:7px;color:var(--ath-gold);font-size:11px;font-weight:800;letter-spacing:1px;margin-bottom:12px}.live-dot{width:8px;height:8px;border-radius:50%;background:var(--ath-gold)}',
    '.status-pill{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:750;white-space:nowrap;border-radius:100px;padding:6px 10px;border:1px solid var(--divider-color,#ddd);background:var(--secondary-background-color,#f3f3f3);color:var(--ath-muted)}.status-dot{width:8px;height:8px;border-radius:50%;display:inline-block;background:#969699;flex-shrink:0}.status-pill.status-online{background:color-mix(in srgb,#317960 11%,var(--card-background-color,#fff));border-color:color-mix(in srgb,#317960 28%,transparent);color:#317960}.status-online .status-dot{background:#317960}.status-pill.status-training{background:color-mix(in srgb,var(--ath-gold) 14%,var(--card-background-color,#fff));border-color:color-mix(in srgb,var(--ath-gold) 38%,transparent);color:#9d713d}.status-training .status-dot{background:var(--ath-gold)}.status-pill.status-offline{opacity:.78}.status-pill.status-unknown{opacity:.7}.status-feature{display:flex;gap:14px;align-items:center}.status-name{flex:1;min-width:0}.avatar-status{position:relative;background:color-mix(in srgb,var(--ath-gold) 9%,var(--secondary-background-color,#eee));font-size:13px;font-weight:800;color:var(--ath-text);border:2px solid var(--divider-color,#ddd)}.avatar-status.status-training{border-color:var(--ath-gold)}.avatar-status.status-online{border-color:#317960}.avatar-status.status-offline{border-color:#9c9ca3}.family-identity{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.family-identity .status-pill{padding:3px 7px;font-size:10px}.family-identity .status-dot{width:6px;height:6px}',
    '.dashboard{display:block}.dashboard-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;padding:0 4px;flex-wrap:wrap}.dashboard-head .brand{font-size:20px;letter-spacing:4px;gap:7px}.dashboard-head .brandmark{height:44px;width:44px}.subbrand{font-size:9px;letter-spacing:2px;color:var(--ath-muted);font-weight:700;padding-left:51px}',
    '.dashboard-brand{display:flex;flex-direction:column;align-items:flex-start;gap:3px}',
    '.dashboard-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.dashboard-grid>.wide{grid-column:span 2}.dashboard-grid>div{min-width:0}.dashboard-grid ha-card{height:100%}',
    '.member-tabs{display:flex;gap:7px;overflow-x:auto;margin:0 0 18px;padding:3px 0 8px}.member-tabs button{border:1px solid var(--divider-color,#ddd);border-radius:100px;background:var(--card-background-color,#fff);color:var(--ath-text);font:600 12px inherit;padding:9px 17px;cursor:pointer;white-space:nowrap}.member-tabs button.selected{border-color:var(--ath-gold);background:color-mix(in srgb,var(--ath-gold) 13%,var(--card-background-color,#fff))}',
    '@media(max-width:600px){.calendar-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.dashboard-grid{grid-template-columns:minmax(0,1fr)}.dashboard-grid>.wide{grid-column:span 1}.body{padding:17px}.dashboard-head{margin-bottom:12px}}'
  ].join("");


  // Visual editor for choosing paired ATHLTH installations. Data stays local.
  class ATHLTHConfigEditor extends HTMLElement {
    constructor(){
      super();
      this._root=this.attachShadow({mode:"open"});
      this._config={};
      this._hass=null;
      this._root.addEventListener("change",(event)=>{
        const target=event.target;
        if(!target||!target.dataset)return;
        const key=target.dataset.key;
        const idx=Number(target.dataset.index);
        if(key==="entity"){
          this._config={...this._config,entity:target.value};
        }else if((key==="name"||key==="member-entity")&&Number.isInteger(idx)){
          const members=this._members();
          if(!members[idx])return;
          if(key==="name")members[idx].name=target.value.slice(0,64);
          else {
            if(members.some((m,i)=>i!==idx&&m.entity===target.value))return;
            members[idx].entity=target.value;
          }
          this._config={...this._config,members};
        }else return;
        this._send();
      });
      this._root.addEventListener("click",(event)=>{
        const button=event.target&&event.target.closest&&event.target.closest("[data-action]");
        if(!button)return;
        const action=button.dataset.action;
        const members=this._members();
        if(action==="add"&&members.length<12){
          const anchors=this._anchors();
          const selected=new Set(members.map(m=>m.entity));
          const free=anchors.find(e=>!selected.has(e));
          if(!free)return;
          members.push({name:"Person "+(members.length+1),entity:free});
        }else if(action==="remove"&&members.length>1){
          const i=Number(button.dataset.index);
          if(!Number.isInteger(i)||i<0||i>=members.length)return;
          members.splice(i,1);
        }else return;
        this._config={...this._config,members};
        this._send();
      });
    }
    setConfig(config){this._config={...config};this.render();}
    set hass(hass){this._hass=hass;this.render();}
    _anchors(){
      const states=this._hass&&this._hass.states||{};
      const ids=Object.keys(states).filter(x=>/^sensor\.[a-z0-9_]+_last_workout$/.test(x)).sort();
      const extra=[];
      if(this._config.entity)extra.push(this._config.entity);
      if(Array.isArray(this._config.members))for(const m of this._config.members)if(m&&m.entity)extra.push(m.entity);
      return [...new Set([...ids,...extra])];
    }
    _members(){
      const raw=Array.isArray(this._config.members)&&this._config.members.length?this._config.members:[{name:this._config.name||"Min trening",entity:this._config.entity||"sensor.athlth_last_workout"}];
      return raw.filter(m=>m&&typeof m==="object").map(m=>({...m})).slice(0,12);
    }
    _select(entity,index,key){
      const choices=this._anchors();
      if(!choices.includes(entity))choices.unshift(entity);
      const options=choices.map(id=>'<option value="'+esc(id)+'"'+(id===entity?' selected':"")+'>'+esc(id)+'</option>').join("");
      return '<select data-key="'+key+'"'+(index===null?"":' data-index="'+index+'"')+' aria-label="ATHLTH-sensor">'+options+'</select>';
    }
    _send(){
      this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:{...this._config}},bubbles:true,composed:true}));
      this.render();
    }
    render(){
      if(!this._root||!this._config.type)return;
      const type=this._config.type;
      const isMulti=type==="custom:athlth-dashboard-card"||type==="custom:athlth-family-card";
      const css='<style>:host{display:block;color:var(--primary-text-color);font-family:inherit}.editor{display:grid;gap:12px;padding:16px;border:1px solid var(--divider-color,#ddd);border-radius:16px}.intro{font-weight:750;font-size:14px}.hint{color:var(--secondary-text-color);font-size:11px;line-height:1.5}.entry{display:grid;gap:6px;padding:12px;border-radius:12px;background:var(--secondary-background-color,#f5f4f2)}label{font-size:12px;font-weight:600}select,input{padding:11px;min-width:0;max-width:100%;width:100%;box-sizing:border-box;border-radius:10px;border:1px solid var(--divider-color,#ddd);background:var(--card-background-color,#fff);color:var(--primary-text-color);font:inherit;font-size:12px}button{background:transparent;border:1px solid var(--divider-color,#ddd);color:var(--primary-text-color);border-radius:10px;padding:10px 14px;cursor:pointer;font-weight:650}.add{border-color:#c7955f;color:#c7955f}.line{display:flex;align-items:center;justify-content:space-between;gap:8px}</style>';
      let body='';
      if(isMulti){
        const members=this._members();
        body=members.map((m,i)=>'<div class="entry"><div class="line"><label>Familiemedlem '+(i+1)+'</label>'+(members.length>1?'<button type="button" data-action="remove" data-index="'+i+'">Fjern</button>':"")+'</div><input type="text" maxlength="64" data-key="name" data-index="'+i+'" value="'+esc(m.name||"")+'" aria-label="Visningsnavn">'+this._select(m.entity||"sensor.athlth_last_workout",i,"member-entity")+'</div>').join("")+(members.length<12?'<button class="add" type="button" data-action="add">+ Legg til familiemedlem</button>':"");
      }else{
        body='<label>Velg ATHLTH-enhet</label>'+this._select(this._config.entity||"sensor.athlth_last_workout",null,"entity");
      }
      this._root.innerHTML=css+'<div class="editor"><div class="intro">ATHLTH · Kortinnstillinger</div><div class="hint">Velg den ekte «Siste treningsøkt»-sensoren for hver tilkoblet ATHLTH-app. Hvert familiemedlem styrer datadeling i sin egen app.</div>'+body+'</div>';
    }
  }
  if(!customElements.get("athlth-config-editor"))customElements.define("athlth-config-editor",ATHLTHConfigEditor);

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
      static getConfigElement(){return document.createElement("athlth-config-editor");}
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
          "athlth-calendar-card":()=>calendar(this._hass,member),
          "athlth-goals-card":()=>goals(this._hass,member),
          "athlth-strength-card":()=>strength(this._hass,member),
          "athlth-history-card":()=>history(this._hass,member),
          "athlth-status-card":()=>statusCard(this._hass,member),
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
