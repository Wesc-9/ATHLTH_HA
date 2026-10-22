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
    "athlth-status-card": ["ATHLTH Status", "Online, trener nå eller offline for en ATHLTH-bruker."],
    "athlth-tomorrow-card": ["ATHLTH I morgen", "Morgendagens planlagte økter fra ATHLTH."],
    "athlth-trend-card": ["ATHLTH Aktivitetstrend", "Syv dagers mottatt treningsvarighet."],
    "athlth-mix-card": ["ATHLTH Treningsmiks", "Fordeling av øktkategorier i mottatt historikk."],
    "athlth-rhythm-card": ["ATHLTH Ukerytme", "Visuell ukerytme fra treningskalenderen."],
    "athlth-insight-card": ["ATHLTH Treningsinnsikt", "Forklarende innsikt fra faktisk delte verdier."],
    "athlth-feed-card": ["ATHLTH Øktlogg", "De siste fullførte øktene som Home Assistant har mottatt."],
    "athlth-records-card": ["ATHLTH Prestasjoner", "Delte personlige rekorder fra ATHLTH."],
    "athlth-data-card": ["ATHLTH Datagrunnlag", "Hva er tilgjengelig for analyser og hva mangler."]
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
    training_streak: "training_streak",
    athlete_profile: "athlete_profile",
    performance_records: "performance_records"
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
    const outdoor=!indoor&&!strengthMode&&/outdoor|run|walk|hik|cycl|bike|ride|trail/.test(type);
    const route=entity(hass,member,"last_workout_route");
    const routeEnd=route&&route.attributes&&route.attributes.ended_at;
    const activityEnd=a.ended_at?asDate(a.ended_at).getTime():NaN;
    const mapEnd=routeEnd?asDate(routeEnd).getTime():NaN;
    // Never display an old or indoor route as the latest outdoor workout.
    const match=outdoor&&usable(route)&&Number.isFinite(activityEnd)&&
      Number.isFinite(mapEnd)&&Math.abs(activityEnd-mapEnd)<180000;
    const routeAttributes=route&&route.attributes||{};
    const picture=routeAttributes.entity_picture;
    const token=routeAttributes.access_token;
    const safePicture=typeof picture==="string"&&
      /^\/api\/camera_proxy\/[a-z0-9_.-]+(?:\?|$)/i.test(picture);
    // HA camera images commonly require a short-lived access token. Prefer
    // Home Assistant's signed entity_picture when one is provided.
    const routeId=route&&route.entity_id || memberKey(member).replace(/^sensor\./,"camera.").replace(/last_workout$/,"last_workout_route");
    const mapUrl=match?(safePicture?picture:
      "/api/camera_proxy/"+encodeURIComponent(routeId)+
      (typeof token==="string"&&token?"?token="+encodeURIComponent(token):"")):"";
    const visual=match?
      '<div class="route-visual route-map">'+
        '<img class="athlth-route-image" loading="lazy" alt="Kart fra siste utendørsøkt" src="'+esc(mapUrl)+'">'+
        '<div class="route-overlay"><span class="route-label">DIN RUTE</span><span class="route-label">UTENDØRS</span></div>'+
      '</div>':
      '<div class="route-visual route-empty '+(strengthMode?'route-strength':'')+'">'+
        '<div class="route-art" aria-hidden="true"><span class="orbit orbit-one"></span><span class="orbit orbit-two"></span><span class="route-symbol">'+
        (strengthMode?'✦':indoor?'▥':'↗')+'</span></div>'+
        '<div class="route-placeholder-copy"><span class="route-label">'+(strengthMode?'STYRKE':indoor?'INNENDØRS':'AKTIVITET')+'</span>'+
        '<p>'+(outdoor?'GPS-kart vises når ruten fra denne økten er delt.':
          strengthMode?'Din styrkeøkt, samlet på ett sted.':
          indoor?'Trening uten GPS-rute.':'Øktdata fra ATHLTH.')+'</p></div>'+
      '</div>';
    const number=(key)=>a[key]!=null&&a[key]!==""&&Number.isFinite(Number(a[key]))?Number(a[key]):null;
    const meters=number("distance_meters");
    const seconds=number("duration_seconds");
    const pace=number("average_pace_seconds_per_km");
    const bpm=number("average_heart_rate_bpm");
    const energy=number("active_energy_kcal");
    const climb=number("elevation_gain_meters");
    const matchPercent=number("route_match_percent");
    const paceMinutes=pace!==null&&pace>0?Math.floor(Math.round(pace)/60):null;
    const paceSeconds=pace!==null&&pace>0?Math.round(pace)%60:null;
    const paceText=paceMinutes===null?"—":paceMinutes+":"+String(paceSeconds).padStart(2,"0");
    const stats=strengthMode?[
      ["Varighet",duration(seconds),""],
      ["Energi",fmt(energy),"kcal"],
      ["Snittpuls",fmt(bpm),"bpm"]
    ]:[
      ["Distanse",meters===null?"—":fmt(meters/1000,2),"km"],
      ["Varighet",duration(seconds),""],
      ["Tempo",paceText,"/km"],
      ["Snittpuls",fmt(bpm),"bpm"]
    ];
    if(outdoor&&climb!==null)stats.push(["Høydemeter",fmt(climb),"m"]);
    if(outdoor&&matchPercent!==null)stats.push(["Rutefølge",fmt(matchPercent),"%"]);
    const classification=strengthMode?"Styrke":indoor?"Løping innendørs":
      outdoor?"Utendørsaktivitet":"Fullført aktivitet";
    const source=a.device?'<span class="chip">'+esc(String(a.device))+'</span>':"";
    return card("Siste økt",
      '<div class="last-workout-layout">'+visual+
      '<div class="last-summary">'+
        '<div class="eyebrow">'+esc(classification)+'</div>'+
        '<div class="activity-name">'+esc(name)+'</div>'+
        '<div class="muted">'+esc(niceDate(a.ended_at)||"Fullført økt")+'</div>'+
        '<div class="stats cols-3">'+stats.map(v=>statistic(...v)).join("")+'</div>'+
        '<div class="last-foot">'+source+lastSync(hass,member)+'</div>'+
      '</div></div>');
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

  function safeAthleteImage(raw){
    if(typeof raw!=="string"||raw.length>512)return null;
    // Reject alternate schemes, credentials, localhost and arbitrary hosts
    // without depending on global URL availability in older HA webviews.
    return /^https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.supabase\.co\/storage\/v1\/object\/public\/profile-avatars\/[a-z0-9_./%-]+(?:\?[a-z0-9_=%&.-]+)?$/i.test(raw)
      ? raw : null;
  }
  function athleteIdentity(hass,member){
    const profile=entity(hass,member,"athlete_profile");
    const display=valueOf(profile);
    const photo=profile&&profile.attributes&&profile.attributes.avatar_url;
    return {name:typeof display==="string"&&display.trim()?display.trim():
        (member.name&&member.name!=="Min trening"?member.name:"Din trening"),
      avatar:safeAthleteImage(photo)};
  }
  function activityFeed(hass,member){
    const recent=receivedWorkouts(hass,member)
      .filter(x=>Number.isFinite(asDate(x.ended_at).getTime()))
      .sort((a,b)=>asDate(b.ended_at)-asDate(a.ended_at));
    if(!recent.length)return card("Siste økter",empty("Ingen fullførte økter er mottatt fra ATHLTH ennå.")+
      '<p class="note">Aktiver deling av fullførte økter i ATHLTH. Eldre historikk tilbakefylles ikke automatisk.</p>');
    const limit=8;
    const entries=recent.slice(0,limit).map((workout,index)=>{
      const kind=String(workout.type||"").toLowerCase();
      const isStrength=/strength|weight|lifting|functional/.test(kind);
      const isIndoor=!isStrength&&/indoor|treadmill/.test(kind);
      const label=isStrength?"Styrke":isIndoor?"Innendørs":/run|outdoor|walk|hik|cycling/.test(kind)?"Utendørs":"Aktivitet";
      const symbol=isStrength?"✦":isIndoor?"▥":"↗";
      const seconds=workout.duration_seconds;
      const meters=workout.distance_meters;
      const bpm=workout.average_heart_rate_bpm;
      const bits=[];
      const nsec=seconds==null?NaN:Number(seconds);
      const ndist=meters==null?NaN:Number(meters);
      const nhr=bpm==null?NaN:Number(bpm);
      if(Number.isFinite(nsec)&&nsec>=0)bits.push(duration(nsec));
      if(!isStrength&&Number.isFinite(ndist)&&ndist>0)bits.push(fmt(ndist/1000,2)+" km");
      if(Number.isFinite(nhr)&&nhr>0)bits.push(fmt(nhr)+" bpm");
      const at=niceDate(workout.ended_at)||"Registrert";
      const source=typeof workout.device==="string"&&workout.device?workout.device:null;
      return '<div class="feed-entry"><div class="feed-icon '+(isStrength?"strength":"run")+'" aria-hidden="true">'+symbol+'</div>'+
        '<div class="feed-main"><div class="feed-name">'+esc(workout.name||"Treningsøkt")+'</div>'+
        '<div class="feed-meta">'+esc(at)+' · '+esc(label)+'</div>'+
        (bits.length?'<div class="feed-metrics">'+bits.map(b=>'<span>'+esc(b)+'</span>').join("")+'</div>':"")+
        '</div><div class="feed-right">'+(index===0?'<span class="feed-new">NYESTE</span>':"")+
        (source?'<span class="feed-source">'+esc(source)+'</span>':"")+'</div></div>';
    }).join("");
    return card("Siste økter",'<div class="feed-header"><div class="feed-count">'+fmt(recent.length)+' <span>mottatte økter</span></div>'+
      '<span class="feed-range">Siste fullførte først</span></div>'+
      '<div class="feed-list">'+entries+'</div>'+
      '<p class="note">Viser opptil '+fmt(limit)+' av maks ti mottatte økter. Dette er ikke hele treningsarkivet.</p>');
  }
  function performance(hass,member){
    const sensor=entity(hass,member,"performance_records");
    const raw=sensor&&sensor.attributes&&sensor.attributes.records;
    const records=Array.isArray(raw)?raw.filter(x=>x&&x.title&&x.value&&Number.isFinite(asDate(x.date).getTime())).slice(0,12):[];
    if(!records.length)return card("Prestasjoner",empty("Ingen personlige rekorder er delt med Home Assistant.")+
      '<p class="note">Aktiver «PR-er og milepæler» i ATHLTH for å dele opptil 12 løpe- og styrkerekorder.</p>');
    const first=[...records].sort((a,b)=>asDate(b.date)-asDate(a.date)).slice(0,6);
    const tiles=first.map(rec=>{
      const kind=rec.category==="strength"?"STYRKE":rec.category==="running"?"LØPING":"PERSONLIG REKORD";
      return '<div class="record-tile"><span class="record-category">'+esc(kind)+'</span>'+
        '<div class="record-value">'+esc(rec.value)+'</div>'+
        '<strong>'+esc(rec.title)+'</strong>'+
        '<span class="record-date">'+esc(niceDate(rec.date)||"")+'</span></div>';
    }).join("");
    const source=sensor&&sensor.attributes&&sensor.attributes.source;
    const label=source==="ATHLTH snapshot"?"Delte rekorder fra ATHLTH":
      "Nye PR-hendelser mottatt i Home Assistant";
    return card("Prestasjoner",
      '<div class="record-head"><div class="record-badge">PERSONLIGE REKORDER</div>'+
      '<span class="record-context">'+esc(label)+'</span></div>'+
      '<div class="record-grid">'+tiles+'</div>'+
      '<p class="note">Ingen plasseringer eller prestasjoner beregnes uten faktiske rekorddata.</p>');
  }
  function dataFoundation(hass,member){
    const available=[
      ["Treningsuke",num(entity(hass,member,"weekly_training_minutes"))!==null],
      ["Treningsplan",!!valueOf(entity(hass,member,"training_plan"))],
      ["Restitusjon",num(entity(hass,member,"recovery_score"))!==null],
      ["Økthistorikk",receivedWorkouts(hass,member).length>0],
      ["Prestasjoner",!!(entity(hass,member,"performance_records")&&
         Number(valueOf(entity(hass,member,"performance_records")))>0)],
      ["Rutekart",!!(entity(hass,member,"last_workout_route")&&
         usable(entity(hass,member,"last_workout_route")))]
    ];
    const received=available.filter(([_,ok])=>ok).length;
    const list=available.map(([name,ok])=>'<div class="data-line"><span class="data-dot '+(ok?"on":"off")+'"></span>'+
      '<span>'+esc(name)+'</span><strong>'+(ok?"Tilgjengelig":"Ikke delt")+'</strong></div>').join("");
    return card("Datagrunnlaget",
      '<div class="data-coverage"><strong>'+fmt(received)+' / '+fmt(available.length)+'</strong>'+
      '<span>datakategorier tilgjengelige</span></div>'+list+
      '<p class="note">Viser delte kategorier, ikke datakvalitet eller helsetilstand. Sist synkronisert angir når appen sist kontaktet Home Assistant.</p>'+
      lastSync(hass,member));
  }

  function dashboard(hass,members,selected,kiosk=false) {
    const member=members[selected]||members[0];
    const now=new Date();
    const dateline=now.toLocaleDateString("nb-NO",{weekday:"long",day:"numeric",month:"long"});
    const chooser=members.length>1?'<div class="member-tabs" role="group" aria-label="Velg familiemedlem">'+members.map((m,i)=>'<button type="button" data-athlth-member="'+i+'" class="'+(i===selected?"selected":"")+'">'+esc(m.name||"Medlem "+(i+1))+'</button>').join("")+'</div>':"";
    const count=num(entity(hass,member,"weekly_workout_count"));
    const minutes=num(entity(hass,member,"weekly_training_minutes"));
    const recoveryScore=num(entity(hass,member,"recovery_score"));
    const planStats=weeklyPlanStats(hass,member);
    const progress=planStats?planStats.percent:num(entity(hass,member,"weekly_progress"));
    const nextName=valueOf(entity(hass,member,"next_workout"));
    const identity=athleteIdentity(hass,member);
    const mainTitle=identity.name;
    const signal=(k,v,u)=>'<div class="overview-signal"><span>'+esc(k)+'</span><strong>'+esc(v)+'</strong><small>'+esc(u)+'</small></div>';
    const hero='<section class="ath-hero" aria-label="Treningsoversikt">'+
      '<div class="hero-noise" aria-hidden="true"><span></span><span></span><span></span></div>'+
      '<div class="ath-hero-main"><div class="hero-overline">ATHLTH / TRAINING INTELLIGENCE · '+esc(dateline)+'</div>'+
      '<div class="hero-person">'+
      (identity.avatar?'<img class="hero-avatar" loading="lazy" alt="Profilbilde for '+esc(mainTitle)+'" src="'+esc(identity.avatar)+'">':
      '<span class="hero-avatar hero-avatar-empty" aria-hidden="true">'+esc(mainTitle.charAt(0).toLocaleUpperCase("nb-NO"))+'</span>')+
      '<div><h1>'+esc(mainTitle)+'<span>.</span></h1>'+
      '<div class="hero-subtitle">DIN PERSONLIGE TRENINGSPROFIL</div></div></div>'+
      '<p>Et tydeligere bilde av innsatsen, rytmen og veien videre.</p>'+
      '<div class="hero-next"><span class="hero-next-dot"></span><span>NESTE PLANLAGTE ØKT</span><strong>'+esc(nextName||"Ikke delt ennå")+'</strong></div></div>'+
      '<div class="hero-signals">'+signal("ØKTER DENNE UKEN",fmt(count),"registrert")+
      signal("TRENINGSTID",fmt(minutes),"minutter")+
      signal("UKENS FREMDRIFT",progress===null?"—":fmt(progress)+"%","rapportert")+
      signal("DAGSFORM",recoveryScore===null?"—":fmt(recoveryScore)+"%","sist delt")+'</div>'+
      '</section>';
    const section=(index,name,description)=>'<div class="studio-section-title span-3"><div><span class="studio-index">'+index+'</span>'+
      '<h2>'+name+'</h2></div><p>'+description+'</p></div>';
    const training=entity(hass,member,"workout_active");
    const live=training&&training.state==="on"&&liveFresh(hass,member);
    const grid='<div class="dashboard-grid">'+
      section("01","Nå og neste","Siste gjennomførte økt og morgendagens plan.")+
      '<div class="feature-card span-2">'+last(hass,member)+'</div>'+
      '<div class="tomorrow-card">'+tomorrow(hass,member)+'</div>'+
      section("02","Treningsgrunnlaget","Aktivitet, struktur og progresjon.")+
      '<div class="span-2 trend-area">'+trend(hass,member)+'</div>'+
      '<div class="week-card">'+week(hass,member)+'</div>'+
      '<div>'+plan(hass,member)+'</div>'+
      '<div class="span-2">'+calendar(hass,member)+'</div>'+
      section("03","Se mønstrene","Oversikt over treningsfordeling og dagsform.")+
      '<div>'+rhythm(hass,member)+'</div>'+
      '<div>'+workoutMix(hass,member)+'</div>'+
      '<div>'+recovery(hass,member)+'</div>'+
      section("04","Resultater og prestasjoner","Øktene du har gjort og rekordene du har satt.")+
      '<div class="span-2 feed-area">'+activityFeed(hass,member)+'</div>'+
      '<div class="records-area">'+performance(hass,member)+'</div>'+
      section("05","Forstå fremgangen","Hva som er kjent, og hva vi fortsatt trenger data for.")+
      '<div class="span-2 insight-area">'+insights(hass,member)+'</div>'+
      '<div>'+goals(hass,member)+'</div>'+
      '<div class="span-2">'+dataFoundation(hass,member)+'</div>'+
      '<div>'+(live?active(hass,member):statusCard(hass,member))+'</div>'+
      (members.length>1?'<div class="span-3">'+family(hass,members)+'</div>':"")+
      '</div>';
    return '<div class="dashboard studio-dashboard'+(kiosk?' kiosk-layout':'')+'">'+
      '<header class="dashboard-head"><div class="dashboard-brand">'+logo()+
      '<div class="subbrand">PERFORMANCE / PERSONAL</div></div>'+statusPill(hass,member)+'</header>'+
      '<div class="layout-width-tip">For å få flere kort i bredden på iPad: Åpne denne visningen i redigering og velg <strong>Panel (ett kort)</strong>, eller plasser ATHLTH-kortet i en fullbredde Sections-seksjon.</div>'+
      chooser+hero+grid+
      '<footer class="studio-footer"><span>ATHLTH / TRAINING INTELLIGENCE</span>'+
      '<span>Data fra din tilkoblede ATHLTH-installasjon. Ingen beregnede økter eller GPS-ruter.</span></footer>'+
      '</div>';
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

  // The Home Assistant browser supplies calendar dates in local time.
  // None of these visualizations synthesize missing ATHLTH records.
  const dayStart = (d) => new Date(d.getFullYear(),d.getMonth(),d.getDate());
  const addDays = (d,n) => {const copy=new Date(d);copy.setDate(copy.getDate()+n);return copy;};
  const sameDay = (a,b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
  function sharedSchedule(hass,member) {
    const state=entity(hass,member,"training_schedule");
    const raw=state&&state.attributes&&state.attributes.events;
    return Array.isArray(raw)?raw.filter(item=>item&&typeof item==="object"&&item.start&&item.title&&Number.isFinite(asDate(item.start).getTime())):[];
  }
  function receivedWorkouts(hass,member) {
    const s=entity(hass,member,"recent_workouts");
    const raw=s&&s.attributes&&s.attributes.workouts;
    if(!Array.isArray(raw))return [];
    const ids=new Set();
    return raw.slice(0,10).filter(item=>{
      if(!item||typeof item!=="object")return false;
      const id=String(item.id||[item.ended_at,item.name,item.type].join("|"));
      if(ids.has(id))return false;
      ids.add(id);return true;
    });
  }
  function tomorrow(hass,member){
    const now=dayStart(new Date()),tomorrowDate=addDays(now,1);
    const label=tomorrowDate.toLocaleDateString("nb-NO",{weekday:"long",day:"numeric",month:"long"});
    const schedule=sharedSchedule(hass,member)
      .filter(item=>sameDay(asDate(item.start),tomorrowDate)&&item.status!=="skipped"&&item.status!=="completed")
      .sort((a,b)=>asDate(a.start)-asDate(b.start));
    const nextState=entity(hass,member,"next_workout");
    const nextLabel=valueOf(nextState);
    const nextTime=valueOf(entity(hass,member,"next_workout_time")) ||
      (nextState&&nextState.attributes&&nextState.attributes.scheduled_at);
    if(!schedule.length && nextLabel && nextTime && Number.isFinite(asDate(nextTime).getTime()) &&
       sameDay(asDate(nextTime),tomorrowDate)) {
      schedule.push({title:String(nextLabel),start:nextTime,type:""});
    }
    const rows=schedule.slice(0,4).map(item=>{
      const at=asDate(item.start).toLocaleTimeString("nb-NO",{hour:"2-digit",minute:"2-digit"});
      const type=String(item.type||"").toLowerCase();
      const kind=/strength|weight|lifting/.test(type)?"Styrke":/walk|hik/.test(type)?"Tur":/run|treadmill/.test(type)?"Løping":"Treningsøkt";
      return '<div class="tomorrow-row"><span class="tomorrow-time">'+esc(at)+'</span><span class="tomorrow-info"><strong>'+esc(item.title)+'</strong><small>'+esc(kind)+'</small></span><span aria-hidden="true" class="tomorrow-arrow">↗</span></div>';
    }).join("");
    return card("I morgen",'<div class="tomorrow-feature"><div class="eyebrow">PLANLAGT TRENING</div><div class="tomorrow-date">'+esc(label)+'</div>'+
      (rows||'<div class="tomorrow-empty">Ingen morgendagsøkt er delt fra ATHLTH ennå.</div>')+
      '<div class="tomorrow-footer">'+(schedule.length?fmt(schedule.length)+" planlagt"+(schedule.length===1?" økt":"e økter"):
      "Se treningsplanen i ATHLTH")+'</div></div>');
  }
  function trend(hass,member){
    const records=receivedWorkouts(hass,member);
    const end=dayStart(new Date()),start=addDays(end,-6),future=addDays(end,1);
    const days=Array.from({length:7},(_,i)=>addDays(start,i));
    const sums=days.map(()=>0),counts=days.map(()=>0);
    let measured=0,missing=0;
    for(const workout of records){
      const date=asDate(workout.ended_at);
      if(!Number.isFinite(date.getTime())||date<start||date>=future)continue;
      const idx=days.findIndex(d=>sameDay(d,date));
      if(idx<0)continue;
      counts[idx]++;
      const seconds=Number(workout.duration_seconds);
      if(workout.duration_seconds!==null&&workout.duration_seconds!==undefined&&
        Number.isFinite(seconds)&&seconds>=0){
        sums[idx]+=seconds/60;measured++;
      }else missing++;
    }
    const total=counts.reduce((a,b)=>a+b,0);
    if(!total || !measured)return card("Aktivitet · 7 dager",
      empty(total?"Mottatte økter mangler varighet.":"Ingen fullførte økter fra de siste syv dagene er mottatt.")+
      '<p class="note">Grafen bruker kun økter mottatt av Home Assistant (maks ti lagret).</p>');
    const max=Math.max(...sums,1);
    const graph=days.map((d,i)=>{
      const h=Math.max(0,Math.min(100,sums[i]/max*100));
      const label=d.toLocaleDateString("nb-NO",{weekday:"short"}).replace(".","");
      const title=label+": "+fmt(sums[i])+" min fra "+fmt(counts[i])+" mottatte økter";
      return '<div class="trend-col" title="'+esc(title)+'"><div class="trend-track">'+
        (sums[i]>0?'<div class="trend-bar" style="height:'+h.toFixed(2)+'%"></div>':'')+
        '</div><span>'+esc(label)+'</span></div>';
    }).join("");
    const totalMinutes=sums.reduce((a,b)=>a+b,0);
    return card("Aktivitet · 7 dager",
      '<div class="trend-header"><div><div class="trend-total">'+fmt(totalMinutes)+'<small> min</small></div><div class="muted">Registrert varighet i mottatte økter</div></div>'+
      '<div class="trend-count">'+fmt(total)+' økter</div></div>'+
      '<div class="trend-chart" role="img" aria-label="'+esc("Mottatt varighet siste syv dager: "+days.map((d,i)=>d.toLocaleDateString("nb-NO",{weekday:"short"})+" "+fmt(sums[i])+" minutter").join(", "))+'">'+graph+'</div>'+
      '<p class="note">'+(missing?"Varighet mangler for "+fmt(missing)+" økt(er). ":"")+
      'Utvalg: maks ti mottatte økter, ikke komplett ATHLTH-historikk.</p>');
  }
  function workoutMix(hass,member){
    const records=receivedWorkouts(hass,member);
    if(!records.length)return card("Treningsmiks",empty("Fordelingen vises når fullførte økter er mottatt."));
    const types=[
      {label:"Løping / ute",color:"#c7955f",count:0},
      {label:"Styrke",color:"#577b78",count:0},
      {label:"Innendørs",color:"#aaa29a",count:0},
      {label:"Annet",color:"#d7d9d8",count:0}
    ];
    for(const item of records){
      const kind=String(item.type||"").toLowerCase();
      const index=/strength|weight|lifting|functional/.test(kind)?1:
        /treadmill|indoor/.test(kind)?2:
        /run|walk|hik|trail|cycl|bike|outdoor/.test(kind)?0:3;
      types[index].count++;
    }
    const total=records.length;
    const a=100*types[0].count/total,b=a+100*types[1].count/total,c=b+100*types[2].count/total;
    const ring='<div class="mix-ring" role="img" aria-label="'+esc(types.map(x=>x.label+": "+x.count+" økter").join(", "))+
      '" style="--mix-a:'+a.toFixed(2)+'%;--mix-b:'+b.toFixed(2)+'%;--mix-c:'+c.toFixed(2)+'%">'+
      '<div class="mix-core"><strong>'+fmt(total)+'</strong><span>mottatt</span></div></div>';
    const legend=types.filter(t=>t.count>0).map(t=>'<div class="mix-row"><i style="background:'+t.color+'"></i><span>'+esc(t.label)+'</span><strong>'+fmt(100*t.count/total)+'%</strong></div>').join("");
    return card("Treningsmiks",'<div class="mix-layout">'+ring+'<div class="mix-legend">'+legend+'</div></div>'+
      '<p class="note">Basert på de siste '+fmt(total)+' mottatte øktene, ikke all trening.</p>');
  }
  function rhythm(hass,member){
    const schedule=sharedSchedule(hass,member);
    if(!schedule.length)return card("Ukerytme",empty("Del treningskalenderen for å se fordelingen gjennom uken."));
    const monday=dayStart(new Date());monday.setDate(monday.getDate()-((monday.getDay()+6)%7));
    const weekdays=["M","T","O","T","F","L","S"];
    let total=0,done=0;
    const blocks=weekdays.map((label,i)=>{
      const date=addDays(monday,i);
      const activities=schedule.filter(s=>sameDay(asDate(s.start),date));
      const completed=activities.filter(e=>e.status==="completed").length;
      const skipped=activities.filter(e=>e.status==="skipped").length;
      const planned=activities.filter(e=>e.status!=="completed"&&e.status!=="skipped").length;
      total+=activities.length;done+=completed;
      const type=completed?"completed":planned?"planned":skipped?"skipped":"rest";
      const count=activities.length?activities.length:"·";
      return '<div class="rhythm-day"><span class="rhythm-dayletter">'+label+'</span>'+
        '<div class="rhythm-cell '+type+(sameDay(date,new Date())?" is-today":"")+'" title="'+esc(date.toLocaleDateString("nb-NO")+
        ": "+completed+" fullført, "+planned+" planlagt, "+skipped+" hoppet over")+'">'+
        esc(count)+'</div></div>';
    }).join("");
    return card("Ukerytme",'<div class="rhythm-header"><div class="rhythm-big">'+fmt(done)+' <span>/ '+fmt(total)+'</span></div>'+
      '<div class="muted">fullførte av kalenderførte økter</div></div>'+
      '<div class="rhythm-grid" role="group" aria-label="Treningskalenderens daglige status">'+blocks+'</div>'+
      '<div class="rhythm-key"><span><i class="key-completed"></i> Fullført</span><span><i class="key-planned"></i> Planlagt</span><span><i class="key-skipped"></i> Hoppet over</span></div>'+
      '<p class="note">Kun mottatte kalenderoppføringer. Uregistrerte økter er ikke med.</p>');
  }
  function insights(hass,member){
    const stats=weeklyPlanStats(hass,member);
    const recovery=num(entity(hass,member,"recovery_score"));
    const load=num(entity(hass,member,"training_load"));
    const recent=receivedWorkouts(hass,member);
    const lines=[];
    if(stats) lines.push(["01","Planen denne uken",fmt(stats.completed)+" av "+fmt(stats.total)+" planlagte økter er merket fullført."]);
    else lines.push(["01","Ukefremdrift","Del treningskalenderen for å se fullført mot planlagt, uten å telle ekstraøkter som planlagte."]);
    if(recovery!==null)lines.push(["02","Dagens restitusjon","Siste delte dagsform er "+fmt(recovery)+" %. Én måling viser ikke en langsiktig trend."]);
    else if(load!==null)lines.push(["02","Treningsbelastning","Siste rapporterte treningsbelastning er "+fmt(load,1)+". Sammenlign med dagsform når den er delt."]);
    else lines.push(["02","Restitusjon og belastning","Aktiver ønsket helsedeling i ATHLTH for å få verdier i oversikten."]);
    lines.push(["03","Datagrunnlag",recent.length?
      "Grafer for historiske økter bygger på "+fmt(recent.length)+" nylig mottatte økter, og er ikke en komplett historikk.":
      "Ingen fullførte økter er mottatt i historikken ennå. Trendtolkning er derfor begrenset."]);
    return card("Treningsinnsikt",'<div class="insight-intro">Forstå tallene, ikke bare se dem.</div>'+
      lines.map(row=>'<div class="insight-row"><span>'+row[0]+'</span><div><strong>'+esc(row[1])+'</strong><p>'+esc(row[2])+'</p></div></div>').join(""));
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
    '.dashboard-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;align-items:stretch}.dashboard-grid>div{min-width:0}.dashboard-grid ha-card{height:100%}.dashboard-grid .card-head .brand{display:none}.dashboard-grid .card-head{margin-bottom:20px}.dashboard-grid .section-title{text-align:left;text-transform:uppercase;font-size:10px;letter-spacing:1.4px;font-weight:800}.dashboard-grid .body{padding:22px}.dashboard-grid .feature-card ha-card{border-color:color-mix(in srgb,var(--ath-gold) 24%,var(--divider-color,#eee))}',

    '.dashboard{container-type:inline-size;max-width:1640px;margin:0 auto;padding:4px 3px 22px}.dashboard-intro{display:flex;justify-content:space-between;align-items:center;gap:20px;overflow:hidden;position:relative;margin:0 0 18px;padding:22px 26px;border:1px solid color-mix(in srgb,var(--ath-gold) 20%,var(--divider-color,#ddd));border-radius:23px;background:linear-gradient(115deg,color-mix(in srgb,var(--ath-gold) 12%,var(--card-background-color,#fff)),var(--card-background-color,#fff) 68%)}.dashboard-intro h2{font-size:clamp(23px,2.3vw,34px);letter-spacing:-.8px;line-height:1.15;margin:8px 0}.dashboard-intro p{font-size:12px;line-height:1.5;color:var(--ath-muted);margin:0}.dashboard-intro-mark{color:color-mix(in srgb,var(--ath-gold) 47%,transparent);font-size:80px;font-weight:900;line-height:1;letter-spacing:-8px;transform:rotate(-9deg);user-select:none}.dashboard-intro-mark span{font-size:20px;vertical-align:top;letter-spacing:0}',
    '.dashboard-grid ha-card{transition:border-color .2s ease,box-shadow .2s ease}.dashboard-grid .week-card ha-card{background:linear-gradient(145deg,color-mix(in srgb,var(--ath-gold) 9%,var(--card-background-color,#fff)),var(--card-background-color,#fff) 70%)}.dashboard-grid .week-card .week-feature{gap:10px;flex-wrap:wrap}.dashboard-grid .week-card .ring{width:88px;height:88px}.dashboard-grid .week-card .ring span{height:70px;width:70px}.dashboard-grid .week-card .stats{gap:7px}.dashboard-grid .week-card .stat-value{font-size:15px}',
    '.last-workout-layout{display:grid;grid-template-columns:minmax(0,1fr);align-items:stretch;gap:20px;min-width:0}.last-summary{display:flex;flex-direction:column;min-width:0;justify-content:center}.last-summary .activity-name{font-size:clamp(21px,2vw,28px);line-height:1.18;letter-spacing:-.7px;margin:8px 0 7px}.last-summary .stats{grid-template-columns:repeat(2,minmax(0,1fr));margin-top:20px;gap:18px 13px}.last-summary .stat-value{font-size:20px}.last-summary .stat-label{font-size:10px}.last-foot{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:15px}.last-foot .chip,.last-foot .sync{margin:0}',
    '.route-visual{position:relative;overflow:hidden;min-height:250px;border-radius:18px;background:color-mix(in srgb,var(--ath-gold) 8%,var(--secondary-background-color,#f2f0ed))}.route-map img{display:block;width:100%;height:100%;min-height:250px;object-fit:cover;position:absolute;inset:0}.route-overlay{position:absolute;inset:0;display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:12px;pointer-events:none;background:linear-gradient(to bottom,rgba(17,20,22,.23),transparent 40%)}.route-label{display:inline-flex;align-items:center;background:rgba(255,255,255,.92);color:#242322;border-radius:100px;padding:7px 10px;font-size:9px;font-weight:850;letter-spacing:1px}.route-empty{display:flex;align-items:flex-end;isolation:isolate;background:radial-gradient(circle at 85% 10%,color-mix(in srgb,var(--ath-gold) 22%,transparent),transparent 47%),linear-gradient(140deg,#252b30,#10181f);color:#fff}.route-strength{background:radial-gradient(circle at 85% 15%,#8c684b,transparent 56%),linear-gradient(140deg,#2c3034,#151719)}.route-art{position:absolute;inset:0;overflow:hidden;display:grid;place-items:center;opacity:.8}.orbit{position:absolute;width:62%;aspect-ratio:1;border:1px solid rgba(255,255,255,.12);border-radius:50%;transform:rotate(-22deg) scaleX(1.4)}.orbit-two{width:90%;transform:rotate(34deg) scaleX(1.2);border-color:rgba(255,255,255,.08)}.route-symbol{font-size:76px;color:color-mix(in srgb,var(--ath-gold) 64%,#fff);font-weight:300;line-height:1;transform:translateY(-9px)}.route-placeholder-copy{z-index:1;padding:20px;max-width:290px}.route-placeholder-copy p{color:rgba(255,255,255,.87);font-size:12px;line-height:1.45;margin:10px 0 0}.route-placeholder-copy .route-label{background:rgba(255,255,255,.12);color:#fff}',
    '.member-tabs{display:flex;gap:7px;overflow-x:auto;margin:0 0 18px;padding:3px 0 8px}.member-tabs button{border:1px solid var(--divider-color,#ddd);border-radius:100px;background:var(--card-background-color,#fff);color:var(--ath-text);font:600 12px inherit;padding:9px 17px;cursor:pointer;white-space:nowrap}.member-tabs button.selected{border-color:var(--ath-gold);background:color-mix(in srgb,var(--ath-gold) 13%,var(--card-background-color,#fff))}',
    '@container (min-width:620px){.dashboard-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dashboard-grid>.span-2,.dashboard-grid>.span-3{grid-column:span 2}.last-workout-layout{grid-template-columns:1.05fr 1fr}.route-visual{min-height:274px}}',
    '@container (min-width:940px){.dashboard-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.dashboard-grid>.span-3{grid-column:span 3}.dashboard-grid>.span-2{grid-column:span 2}.last-workout-layout{grid-template-columns:1.05fr 1fr}.dashboard-intro{padding:26px 32px}}',
    '@container (max-width:619px){.dashboard-grid>.span-2,.dashboard-grid>.span-3{grid-column:auto}.last-workout-layout{grid-template-columns:1fr}.route-visual{min-height:220px}.dashboard-grid .body{padding:18px}.dashboard-intro{padding:20px}.dashboard-intro-mark{display:none}.dashboard-intro h2{font-size:23px}.calendar-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}',

    /* ATHLTH Training Intelligence visual system: graphic hierarchy, not repeated logos. */
    '.studio-dashboard{--ath-text:#202527;--ath-muted:#7c807e;--ath-gold:#b88958;color:#202527;max-width:1660px;isolation:isolate}.studio-dashboard .dashboard-head{padding:8px 8px 12px;margin-bottom:12px}.studio-dashboard .dashboard-head .brand{letter-spacing:2.6px;font-size:17px}.studio-dashboard .dashboard-head .brandmark{height:35px;width:35px;color:#b88958}.studio-dashboard .subbrand{font-size:9px;letter-spacing:1.7px;padding-left:42px;color:var(--ath-muted)}',
    '.studio-dashboard .ath-hero{position:relative;min-width:0;overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr);gap:30px;padding:32px;background:#1b2224;border-radius:27px;border:1px solid #343b3b;color:#fff;margin:0 0 14px;box-shadow:0 24px 60px rgba(22,33,31,.14)}.studio-dashboard .ath-hero:after{content:"";pointer-events:none;position:absolute;width:52%;aspect-ratio:1;right:-13%;top:-80%;border-radius:50%;border:1px solid rgba(236,199,156,.16);box-shadow:0 0 0 60px rgba(236,199,156,.025),0 0 0 130px rgba(236,199,156,.025)}.studio-dashboard .ath-hero-main{position:relative;z-index:1}.studio-dashboard .hero-overline{font-size:9px;letter-spacing:2px;font-weight:800;color:#d7b893;text-transform:uppercase}.studio-dashboard .ath-hero h1{font-size:clamp(32px,4vw,56px);margin:19px 0 14px;line-height:1.02;letter-spacing:-2.1px;font-weight:750}.studio-dashboard .ath-hero h1 span{color:#d7ab79}.studio-dashboard .ath-hero-main>p{font-size:13px;line-height:1.6;color:#b8c1bd;max-width:400px;margin:0}.studio-dashboard .hero-next{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:28px}.studio-dashboard .hero-next-dot{height:7px;width:7px;border-radius:50%;background:#c7955f;box-shadow:0 0 0 4px rgba(199,149,95,.12)}.studio-dashboard .hero-next>span:nth-child(2){color:#b8c1bd;font-size:9px;font-weight:850;letter-spacing:1px}.studio-dashboard .hero-next strong{font-size:12px;font-weight:650;color:#f5ece0;max-width:260px;overflow-wrap:anywhere}',
    '.studio-dashboard .hero-signals{position:relative;z-index:1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;border:1px solid rgba(255,255,255,.09);border-radius:17px;overflow:hidden;background:rgba(255,255,255,.075)}.studio-dashboard .overview-signal{min-width:0;display:flex;flex-direction:column;justify-content:center;padding:17px 19px;background:rgba(19,26,27,.96)}.studio-dashboard .overview-signal span{font-size:9px;font-weight:800;letter-spacing:1px;line-height:1.5;color:#adb9b6}.studio-dashboard .overview-signal strong{font-size:29px;letter-spacing:-.9px;font-weight:680;line-height:1.22;color:#fff;margin:7px 0}.studio-dashboard .overview-signal small{font-size:10px;color:#a7ada9}.studio-dashboard .overview-signal:nth-child(3) strong{color:#d6ab7a}',
    '.studio-dashboard .dashboard-grid{gap:17px}.studio-dashboard .studio-section-title{min-width:0;display:flex;align-items:flex-end;justify-content:space-between;gap:15px;margin-top:21px;margin-bottom:-1px;padding:0 3px 4px;border-bottom:1px solid rgba(32,37,39,.12)}.studio-dashboard .studio-section-title>div{display:flex;align-items:center;gap:14px;min-width:0}.studio-dashboard .studio-index{font-size:12px;letter-spacing:1px;font-weight:750;color:#b88958}.studio-dashboard .studio-section-title h2{font-size:20px;letter-spacing:-.65px;margin:0;font-weight:720}.studio-dashboard .studio-section-title p{font-size:11px;line-height:1.4;color:var(--ath-muted);margin:0 0 2px;text-align:right}',
    '.studio-dashboard .dashboard-grid ha-card{background:#fff;border:1px solid #eae7e2;box-shadow:0 7px 25px rgba(32,37,39,.045);border-radius:21px}.studio-dashboard .dashboard-grid .body{padding:23px 25px}.studio-dashboard .dashboard-grid .card-head{margin-bottom:17px}.studio-dashboard .dashboard-grid .section-title{color:#848680;font-size:10px;letter-spacing:1.3px}.studio-dashboard .dashboard-grid .eyebrow{color:#aa8158}.studio-dashboard .dashboard-grid .muted,.studio-dashboard .dashboard-grid .note{color:#7e827e}.studio-dashboard .dashboard-grid .empty{line-height:1.6}.studio-dashboard .dashboard-grid .activity-name{letter-spacing:-.35px}',
    '.studio-dashboard .feature-card ha-card{border:1px solid #dfd5c8}.studio-dashboard .feature-card .last-workout-layout{gap:23px}.studio-dashboard .feature-card .route-visual{border-radius:16px}.studio-dashboard .feature-card .last-summary .activity-name{font-size:clamp(23px,2.3vw,35px);font-weight:760;letter-spacing:-1.1px}.studio-dashboard .last-summary .stats{margin-top:24px;padding-top:20px}.studio-dashboard .last-summary .stat-value{font-size:clamp(17px,2vw,24px)}.studio-dashboard .feature-card .route-visual .route-label{box-shadow:0 4px 12px rgba(0,0,0,.12)}',
    '.studio-dashboard .tomorrow-card ha-card{background:linear-gradient(155deg,#f9f5ef,#fff 64%);border-color:#e8dfd5}.studio-dashboard .tomorrow-feature{display:flex;flex-direction:column;min-height:230px}.studio-dashboard .tomorrow-date{font-size:clamp(18px,1.7vw,26px);letter-spacing:-.5px;font-weight:750;margin:10px 0 17px;text-transform:capitalize}.studio-dashboard .tomorrow-row{display:flex;align-items:center;gap:12px;padding:14px 0;border-top:1px solid #e8e4df}.studio-dashboard .tomorrow-time{font-size:13px;color:#a2784f;font-weight:800;font-variant-numeric:tabular-nums}.studio-dashboard .tomorrow-info{display:flex;flex:1;min-width:0;flex-direction:column;gap:4px}.studio-dashboard .tomorrow-info strong{font-size:14px;line-height:1.3;overflow-wrap:anywhere}.studio-dashboard .tomorrow-info small{font-size:11px;color:#888783}.studio-dashboard .tomorrow-arrow{font-size:20px;color:#b88958}.studio-dashboard .tomorrow-empty{font-size:13px;line-height:1.6;color:#77746f;padding:18px 0}.studio-dashboard .tomorrow-footer{border-top:1px solid #e8e4df;margin-top:auto;padding-top:14px;font-size:10px;font-weight:800;letter-spacing:.7px;color:#ad875d}',
    '.studio-dashboard .trend-area ha-card{background:#fff}.studio-dashboard .trend-header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.studio-dashboard .trend-total{font-size:39px;line-height:1.1;letter-spacing:-1.7px;font-weight:760;color:#21292b}.studio-dashboard .trend-total small{font-size:13px;font-weight:650;letter-spacing:0;color:#858982}.studio-dashboard .trend-count{border-radius:100px;padding:8px 11px;background:#f5f1eb;color:#a88057;font-weight:760;font-size:11px;white-space:nowrap}.studio-dashboard .trend-chart{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:15px;height:188px;margin:27px 0 7px;min-width:0}.studio-dashboard .trend-col{display:flex;flex-direction:column;align-items:center;gap:10px;min-width:0}.studio-dashboard .trend-track{height:155px;display:flex;align-items:flex-end;justify-content:center;width:100%;max-width:48px;background:repeating-linear-gradient(to top,transparent 0,transparent calc(25% - 1px),#f0eeea calc(25% - 1px),#f0eeea 25%);border-bottom:1px solid #d7d8d4;position:relative}.studio-dashboard .trend-bar{min-height:2px;width:72%;max-width:33px;border-radius:7px 7px 2px 2px;background:linear-gradient(to top,#a97b4f,#dfb889);box-shadow:inset 0 1px 0 rgba(255,255,255,.16)}.studio-dashboard .trend-col:last-child .trend-bar{background:linear-gradient(to top,#426966,#79a59c)}.studio-dashboard .trend-col>span{font-size:11px;font-weight:700;color:#818580}.studio-dashboard .trend-area .note{margin-top:16px;padding-top:13px;border-top:1px solid #eeece9}',
    '.studio-dashboard .week-card ha-card{background:linear-gradient(145deg,#f8f7f3,#fff 72%)}.studio-dashboard .week-card .huge{font-size:40px;letter-spacing:-1.5px}.studio-dashboard .week-card .ring{width:91px;height:91px}.studio-dashboard .week-card .ring span{height:72px;width:72px;background:#fff}.studio-dashboard .week-card .stat-value{font-size:18px}.studio-dashboard .week-card .week-feature{align-items:center}',
    '.studio-dashboard .rhythm-header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.studio-dashboard .rhythm-big{font-size:32px;letter-spacing:-1px;font-weight:760}.studio-dashboard .rhythm-big span{font-size:17px;color:#8b8f89}.studio-dashboard .rhythm-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin-top:25px}.studio-dashboard .rhythm-day{min-width:0;text-align:center}.studio-dashboard .rhythm-dayletter{font-size:10px;color:#828680}.studio-dashboard .rhythm-cell{display:grid;place-items:center;margin-top:8px;aspect-ratio:1;border-radius:11px;background:#f3f1ee;color:#a3a5a0;font-size:13px;font-weight:750;border:1px solid transparent}.studio-dashboard .rhythm-cell.completed{background:#64817a;color:#fff}.studio-dashboard .rhythm-cell.planned{background:#f0ddc7;color:#8d6541}.studio-dashboard .rhythm-cell.skipped{background:#e8e6e3;color:#777}.studio-dashboard .rhythm-cell.is-today{outline:2px solid #bb8c5d;outline-offset:2px}.studio-dashboard .rhythm-key{display:flex;flex-wrap:wrap;gap:9px;margin-top:18px}.studio-dashboard .rhythm-key span{display:flex;align-items:center;gap:5px;font-size:9px;color:#858884}.studio-dashboard .rhythm-key i{width:7px;height:7px;border-radius:50%;background:#eceae7}.studio-dashboard .rhythm-key .key-completed{background:#64817a}.studio-dashboard .rhythm-key .key-planned{background:#e2bd90}.studio-dashboard .rhythm-key .key-skipped{background:#a5a5a2}',
    '.studio-dashboard .mix-layout{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:12px;min-height:180px}.studio-dashboard .mix-ring{width:min(52%,162px);aspect-ratio:1;flex-shrink:0;display:grid;place-items:center;border-radius:50%;background:conic-gradient(#c7955f 0 var(--mix-a),#577b78 var(--mix-a) var(--mix-b),#aaa29a var(--mix-b) var(--mix-c),#d7d9d8 var(--mix-c) 100%)}.studio-dashboard .mix-core{width:73%;aspect-ratio:1;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1px}.studio-dashboard .mix-core strong{font-size:26px;font-weight:750;letter-spacing:-.8px}.studio-dashboard .mix-core span{font-size:9px;color:#848984}.studio-dashboard .mix-legend{flex:1;min-width:0}.studio-dashboard .mix-row{display:flex;align-items:center;gap:7px;padding:5px 0;font-size:10px}.studio-dashboard .mix-row i{height:8px;width:8px;border-radius:3px;flex-shrink:0}.studio-dashboard .mix-row span{flex:1;min-width:0;overflow-wrap:anywhere;color:#646c69}.studio-dashboard .mix-row strong{font-size:11px;color:#202728}',
    '.studio-dashboard .insight-area ha-card{background:linear-gradient(150deg,#f9f9f6,#fff 55%)}.studio-dashboard .insight-intro{font-size:clamp(18px,1.8vw,25px);letter-spacing:-.6px;font-weight:750;padding-bottom:13px}.studio-dashboard .insight-row{display:flex;align-items:flex-start;gap:14px;padding:14px 0;border-top:1px solid #eceae5}.studio-dashboard .insight-row>span{font-size:11px;font-weight:850;color:#b88958;line-height:1.6}.studio-dashboard .insight-row>div{flex:1;min-width:0}.studio-dashboard .insight-row strong{font-size:13px;letter-spacing:-.1px}.studio-dashboard .insight-row p{font-size:12px;line-height:1.55;color:#797f7a;margin:6px 0 0}.studio-dashboard .studio-footer{display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;padding:22px 5px 6px;color:#93938e;font-size:10px;line-height:1.5;border-top:1px solid #e3e1dd;margin-top:30px}.studio-dashboard .studio-footer span:first-child{font-weight:800;letter-spacing:1px}',
    '@container (min-width:940px){.studio-dashboard .ath-hero{grid-template-columns:1.17fr 1fr;gap:25px;padding:39px 42px}.studio-dashboard .hero-signals{align-self:center;min-height:205px}.studio-dashboard .studio-section-title{margin-top:29px}}',
    '@container (min-width:620px) and (max-width:939px){.studio-dashboard .ath-hero{grid-template-columns:1fr 1fr;gap:16px;padding:28px}.studio-dashboard .overview-signal{padding:12px}.studio-dashboard .ath-hero h1{font-size:34px}.studio-dashboard .studio-section-title p{max-width:230px}.studio-dashboard .mix-layout{flex-direction:column}.studio-dashboard .mix-ring{width:145px}}',
    '@container (max-width:619px){.studio-dashboard .ath-hero{padding:24px;gap:22px;border-radius:22px}.studio-dashboard .hero-signals{min-height:190px}.studio-dashboard .overview-signal{padding:12px}.studio-dashboard .overview-signal strong{font-size:22px}.studio-dashboard .hero-overline{letter-spacing:1.2px}.studio-dashboard .ath-hero h1{font-size:36px}.studio-dashboard .studio-section-title{align-items:flex-start;flex-direction:column;gap:4px;margin-top:19px}.studio-dashboard .studio-section-title h2{font-size:19px}.studio-dashboard .studio-section-title p{text-align:left;margin-left:30px}.studio-dashboard .dashboard-grid .body{padding:20px}.studio-dashboard .trend-chart{gap:8px}.studio-dashboard .trend-total{font-size:31px}.studio-dashboard .mix-layout{gap:14px}.studio-dashboard .mix-ring{width:min(48%,150px)}.studio-dashboard .feature-card .route-visual{min-height:230px}.studio-dashboard .rhythm-grid{gap:5px}}',

    '.studio-dashboard .hero-person{display:flex;align-items:center;gap:18px;min-width:0;margin-top:17px}.studio-dashboard .hero-person h1{margin:0 0 5px;font-size:clamp(28px,3.1vw,49px);overflow-wrap:anywhere}.studio-dashboard .hero-person>div{min-width:0}.studio-dashboard .hero-avatar{display:grid;place-items:center;height:76px;width:76px;flex-shrink:0;object-fit:cover;border-radius:23px;background:#35413f;border:2px solid rgba(226,186,139,.55);box-shadow:0 9px 24px rgba(0,0,0,.22)}.studio-dashboard .hero-avatar-empty{color:#f1d4aa;font-size:30px;font-weight:750;background:linear-gradient(130deg,#333c3f,#25302e);text-transform:uppercase}.studio-dashboard .hero-subtitle{font-size:9px;color:#d5b38c;letter-spacing:1.3px;font-weight:800;margin-bottom:4px}.studio-dashboard .hero-overline{margin-bottom:0}',
    '.studio-dashboard .feed-area ha-card{border-color:#e2dfda}.studio-dashboard .feed-header{display:flex;align-items:center;justify-content:space-between;gap:14px;padding-bottom:17px;border-bottom:1px solid #eeece8}.studio-dashboard .feed-count{font-size:26px;font-weight:760;letter-spacing:-1px;color:#25292a}.studio-dashboard .feed-count span{font-size:11px;font-weight:550;color:#8a8c88;letter-spacing:0}.studio-dashboard .feed-range{font-size:10px;white-space:nowrap;color:#aa845b;font-weight:750}.studio-dashboard .feed-entry{display:flex;gap:13px;align-items:center;padding:15px 0;border-bottom:1px solid #eeece8;min-width:0}.studio-dashboard .feed-icon{height:41px;width:41px;border-radius:12px;flex-shrink:0;display:grid;place-items:center;font-size:20px;background:#f6eee4;color:#b28250}.studio-dashboard .feed-icon.strength{background:#e8efec;color:#4e746c}.studio-dashboard .feed-main{flex:1;min-width:0}.studio-dashboard .feed-name{font-size:14px;font-weight:770;color:#272f2e;overflow-wrap:anywhere}.studio-dashboard .feed-meta{font-size:10px;color:#999994;margin-top:5px}.studio-dashboard .feed-metrics{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}.studio-dashboard .feed-metrics span{display:inline-flex;background:#f7f6f3;border-radius:7px;padding:5px 8px;font-size:10px;font-weight:670;color:#565c59}.studio-dashboard .feed-right{display:flex;gap:7px;align-items:flex-end;flex-direction:column;max-width:100px}.studio-dashboard .feed-new{display:block;border-radius:99px;background:#ead7c0;color:#805c38;font-size:9px;font-weight:790;letter-spacing:.7px;padding:4px 7px}.studio-dashboard .feed-source{font-size:9px;line-height:1.3;color:#a0a09a;text-align:right;overflow-wrap:anywhere}.studio-dashboard .feed-area .note{margin-top:15px}',
    '.studio-dashboard .records-area ha-card{background:linear-gradient(157deg,#f8f6f1,#fff 64%)}.studio-dashboard .record-head{display:flex;align-items:flex-start;flex-direction:column;gap:7px;padding-bottom:15px}.studio-dashboard .record-badge{font-size:9px;font-weight:850;letter-spacing:1.3px;color:#b38454}.studio-dashboard .record-context{font-size:11px;color:#8e8d88}.studio-dashboard .record-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.studio-dashboard .record-tile{border:1px solid #eae5dc;border-radius:13px;padding:13px 12px;display:flex;flex-direction:column;align-items:flex-start;min-width:0;min-height:125px;background:#fff;box-shadow:0 4px 12px rgba(10,20,20,.025)}.studio-dashboard .record-category{font-size:8px;font-weight:850;letter-spacing:1px;color:#9d886f}.studio-dashboard .record-value{font-size:clamp(18px,1.55vw,23px);font-weight:790;line-height:1.16;letter-spacing:-.65px;color:#272d2e;overflow-wrap:anywhere;margin:10px 0 8px}.studio-dashboard .record-tile strong{font-size:10px;line-height:1.35;font-weight:730;overflow-wrap:anywhere;color:#61635f}.studio-dashboard .record-date{font-size:9px;color:#a3a49f;margin-top:auto;padding-top:9px}',
    '.studio-dashboard .data-coverage{display:flex;align-items:baseline;gap:12px;border-bottom:1px solid #ecebe7;padding-bottom:17px;margin-bottom:5px}.studio-dashboard .data-coverage strong{font-size:31px;font-weight:770;letter-spacing:-1px;color:#b18558}.studio-dashboard .data-coverage>span{font-size:11px;color:#888b85}.studio-dashboard .data-line{display:flex;gap:9px;align-items:center;border-bottom:1px solid #f0eee9;padding:10px 0;font-size:12px}.studio-dashboard .data-line>span:nth-child(2){flex:1}.studio-dashboard .data-line strong{font-size:10px;font-weight:730;color:#8c908a}.studio-dashboard .data-dot{height:8px;width:8px;flex-shrink:0;border-radius:50%;background:#d5d6d1}.studio-dashboard .data-dot.on{background:#628379}.studio-dashboard .data-line .on~strong{color:#628379}.studio-dashboard .data-line .off~strong{color:#aaaba6}',
    '@container (max-width:619px){.studio-dashboard .hero-avatar{height:60px;width:60px;border-radius:18px}.studio-dashboard .hero-person{gap:12px}.studio-dashboard .hero-person h1{font-size:30px}.studio-dashboard .feed-entry{gap:10px}.studio-dashboard .feed-icon{width:35px;height:35px}.studio-dashboard .feed-right{max-width:58px}.studio-dashboard .record-grid{gap:8px}.studio-dashboard .record-tile{padding:12px 10px}.studio-dashboard .record-value{font-size:18px}}',
    ':host{display:block;width:100%;min-width:0;box-sizing:border-box}.studio-dashboard{width:100%;min-width:0;box-sizing:border-box}.studio-dashboard .dashboard-grid{min-width:0}',
    '.studio-dashboard .layout-width-tip{display:none}',
    '@media (min-width:768px){@container (max-width:619px){.studio-dashboard .layout-width-tip{display:block;margin:-6px 0 14px;padding:11px 13px;background:#fcf6ec;color:#765533;border:1px solid #ead7c3;border-radius:12px;font-size:11px;line-height:1.5}}}',
    /* A wide iPad panel keeps three clearly differentiated cards per row. */
    '@container (min-width:790px){.studio-dashboard .dashboard-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.studio-dashboard .dashboard-grid>.span-3{grid-column:span 3}.studio-dashboard .dashboard-grid>.span-2{grid-column:span 2}.studio-dashboard .ath-hero{grid-template-columns:1.08fr 1fr;gap:20px}.studio-dashboard .hero-signals{min-height:205px}}',
    '@container (min-width:620px) and (max-width:789px){.studio-dashboard .dashboard-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.studio-dashboard .dashboard-grid>.span-3,.studio-dashboard .dashboard-grid>.span-2{grid-column:span 2}}',
    /* Opt-in ATHLTH iPad kiosk composition. Does not attempt to hack HA shell outside shadow DOM. */
    '.studio-dashboard.kiosk-layout{max-width:none;width:100%;margin:0;box-sizing:border-box;padding:8px 12px 28px}.studio-dashboard.kiosk-layout .dashboard-head{padding:2px 6px 10px}.studio-dashboard.kiosk-layout .ath-hero{margin-bottom:9px}.studio-dashboard.kiosk-layout .dashboard-grid{gap:14px}.studio-dashboard.kiosk-layout .studio-section-title{margin-top:16px}.studio-dashboard.kiosk-layout .studio-footer{margin-top:18px}.studio-dashboard.kiosk-layout .member-tabs button{min-height:44px;touch-action:manipulation}.studio-dashboard.kiosk-layout .feed-entry{min-height:56px}.studio-dashboard.kiosk-layout .dashboard-grid>div{min-width:0}',
    '@container (min-width:790px){.studio-dashboard.kiosk-layout .dashboard-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}',
    '@container (max-width:619px){.studio-dashboard.kiosk-layout{padding:3px 2px 18px}.studio-dashboard.kiosk-layout .dashboard-grid{gap:12px}.studio-dashboard.kiosk-layout .ath-hero{margin-bottom:10px}}',
    '@media(prefers-reduced-motion:reduce){.studio-dashboard .dashboard-grid ha-card{transition:none}}',
    '@media(max-width:600px){.calendar-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.body{padding:17px}.dashboard-head{margin-bottom:12px}}'
  ].join("");



  // Home Assistant updates "hass" on unrelated sensor changes. Replacing
  // shadowRoot.innerHTML for each update destroyed the iPad's scroll position.
  // Reconcile changed elements in place to preserve the scroll tree, map
  // images, controls and the user's current reading position.
  function updateCardMarkup(root,markup) {
    if (root.__athlthMarkup===markup) return;
    if (root.__athlthMarkup===undefined ||
        !root.childNodes || typeof document==="undefined" ||
        !document.createElement) {
      root.innerHTML=markup;
    } else {
      const template=document.createElement("template");
      if (!template || !("content" in template)) {
        root.innerHTML=markup;
      } else {
        template.innerHTML=markup;
        syncCardChildren(root,template.content);
      }
    }
    root.__athlthMarkup=markup;
  }
  function syncCardChildren(parent,desired) {
    let i=0;
    while(i<desired.childNodes.length || i<parent.childNodes.length) {
      const incoming=desired.childNodes[i];
      const current=parent.childNodes[i];
      if(!incoming) {parent.removeChild(current);continue;}
      if(!current) {parent.appendChild(incoming.cloneNode(true));i++;continue;}
      if(current.nodeType!==incoming.nodeType ||
        (current.nodeType===1 && current.tagName!==incoming.tagName)) {
        parent.replaceChild(incoming.cloneNode(true),current);
        i++;
        continue;
      }
      if(current.nodeType===3 || current.nodeType===8) {
        if(current.nodeValue!==incoming.nodeValue)current.nodeValue=incoming.nodeValue;
      } else if(current.nodeType===1) {
        if(!current.isEqualNode(incoming)) {
          for(const attr of Array.from(current.attributes)) {
            if(!incoming.hasAttribute(attr.name))current.removeAttribute(attr.name);
          }
          for(const attr of Array.from(incoming.attributes)) {
            if(current.getAttribute(attr.name)!==attr.value)current.setAttribute(attr.name,attr.value);
          }
          syncCardChildren(current,incoming);
        }
      }
      i++;
    }
  }

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
      // Home Assistant Sections layout: use full width for the dashboard.
      getGridOptions(){
        return kind==="athlth-dashboard-card"
          ? {columns:12,rows:"auto"}
          : {columns:6,rows:"auto"};
      }
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
          "athlth-tomorrow-card":()=>tomorrow(this._hass,member),
          "athlth-trend-card":()=>trend(this._hass,member),
          "athlth-mix-card":()=>workoutMix(this._hass,member),
          "athlth-rhythm-card":()=>rhythm(this._hass,member),
          "athlth-insight-card":()=>insights(this._hass,member),
          "athlth-feed-card":()=>activityFeed(this._hass,member),
          "athlth-records-card":()=>performance(this._hass,member),
          "athlth-data-card":()=>dataFoundation(this._hass,member),
          "athlth-dashboard-card":()=>dashboard(this._hass,members,this._selected,this._config.kiosk===true)
        };
        updateCardMarkup(this._root,"<style>"+CSS+"</style>"+builders[kind]());
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
