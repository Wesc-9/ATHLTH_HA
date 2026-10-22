/* ATHLTH card runtime regression tests, no browser or external packages needed. */
const test = require("node:test");
const assert = require("node:assert/strict");

class MockElement {
  attachShadow() {
    const root = {innerHTML:"",addEventListener() {}};
    this._shadow = root;
    return root;
  }
}
const registry = new Map();
globalThis.window={customCards:[]};
globalThis.HTMLElement=MockElement;
globalThis.customElements={
  get(name){return registry.get(name);},
  define(name,element){registry.set(name,element);}
};
require("../custom_components/athlth/frontend/athlth-cards.js");
const card=(name,config,hass)=>{
  const CustomCard=registry.get(name);
  assert.ok(CustomCard,"Card should be registered: "+name);
  const component=new CustomCard();
  component.setConfig({type:"custom:"+name,...config});
  component.hass=hass;
  return component._shadow.innerHTML;
};
function state(state,attributes={}) {return {state,attributes};}
const first={
  "sensor.athlth_last_workout":state("Outdoor run",{type:"outdoor_run",duration_seconds:2700,distance_meters:7500,average_heart_rate_bpm:142,ended_at:"2026-10-20T15:20:00+02:00"}),
  "sensor.athlth_weekly_progress":state("75"),
  "sensor.athlth_weekly_workout_count":state("3"),
  "sensor.athlth_weekly_training_minutes":state("172"),
  "sensor.athlth_weekly_distance":state("18.9"),
  "sensor.athlth_next_workout":state("Intervals"),
  "sensor.athlth_active_goal":state("Run 10K"),
  "sensor.athlth_goal_progress":state("45"),
  "sensor.athlth_goal_days_remaining":state("14"),
  "sensor.athlth_training_streak":state("8"),
  "sensor.athlth_recovery_score":state("84"),
  "sensor.athlth_workout_active":state("off"),
  "sensor.athlth_training_schedule":state("1",{events:[{id:"1",title:"Threshold run",start:"2026-10-21T18:00:00+02:00",end:"2026-10-21T19:00:00+02:00",type:"run"}]})
};
const second={
  ...first,
  "sensor.partner_last_workout":state("Strength",{type:"strength",duration_seconds:1800,ended_at:"2026-10-20T17:00:00+02:00"}),
  "sensor.partner_weekly_progress":state("20"),
  "sensor.partner_weekly_workout_count":state("1"),
  "sensor.partner_next_workout":state("Strength session")
};

test("all premium ATHLTH cards register once",()=>{
  const names=["dashboard","week","today","next","last","plan","family","recovery","active","calendar","goals","strength","history","status","tomorrow","trend","mix","rhythm","insight","feed","records","data","long-trend"];
  for(const name of names)assert.ok(registry.has("athlth-"+name+"-card"),name);
  assert.equal(window.customCards.length,names.length);
});

test("dashboard uses brand logo and real sensor data",()=>{
  const html=card("athlth-dashboard-card",{}, {states:first});
  assert.match(html,/PERFORMANCE \/ PERSONAL/);
  assert.match(html,/class="brandmark"/);
  assert.match(html,/75%/);
  assert.match(html,/Outdoor run/);
  assert.match(html,/Threshold run/);
  assert.doesNotMatch(html,/>82%/);
});

test("multiple independently configured family devices stay isolated",()=>{
  const members=[{name:"Person A",entity:"sensor.athlth_last_workout"},{name:"Person B",entity:"sensor.partner_last_workout"}];
  const html=card("athlth-family-card",{members},{states:second});
  assert.match(html,/Person A/);
  assert.match(html,/Person B/);
  assert.match(html,/75%/);
  assert.match(html,/20%/);
});

test("do not treat a treadmill workout as a GPS route",()=>{
  const states={...first,
    "sensor.athlth_last_workout":state("Indoor treadmill",{type:"treadmill",ended_at:"2026-10-20T15:20:00+02:00"}),
    "camera.athlth_last_workout_route":state("idle",{ended_at:"2026-10-20T15:20:00+02:00"})
  };
  const html=card("athlth-last-card",{}, {states});
  assert.match(html,/Indoor treadmill/);
  assert.doesNotMatch(html,/\/api\/camera_proxy\//);
});

test("escape untrusted workout names, titles and member names",()=>{
  const states={...first,"sensor.athlth_last_workout":state('<img src=x onerror=alert(1)>')};
  const html=card("athlth-dashboard-card",{members:[{name:"<script>alert(1)</script>",entity:"sensor.athlth_last_workout"},{name:"Other",entity:"sensor.partner_last_workout"}]},{states});
  assert.doesNotMatch(html,/<script>/);
  assert.doesNotMatch(html,/<img src=x/);
  assert.match(html,/&lt;script&gt;/);
});

test("strength card shows stale-free empty state when no workout is active",()=>{
  const states={...first,"sensor.athlth_current_exercise":state("Squat")};
  assert.match(card("athlth-strength-card",{}, {states}),/Ingen aktiv styrkeøkt/);
  states["binary_sensor.athlth_workout_active"]=state("on");
  states["sensor.athlth_last_sync"]=state(new Date().toISOString());
  states["sensor.athlth_current_set"]=state("3");
  states["sensor.athlth_current_reps"]=state("8");
  assert.match(card("athlth-strength-card",{}, {states}),/Squat/);
});

test("missing and disabled data remain unavailable, never fake training values",()=>{
  const html=card("athlth-week-card",{}, {states:{}});
  assert.match(html,/Koble til ATHLTH/);
  assert.doesNotMatch(html,/154 min/);
});


test("show only bounded received workout history, with no invention",()=>{
  const records=[{id:"1",name:"4x4 Intervals",type:"run",ended_at:"2026-10-20T16:00:00Z",
    duration_seconds:2400,distance_meters:6500}];
  const states={...first,"sensor.athlth_recent_workouts":state("1",{workouts:records})};
  const html=card("athlth-history-card",{}, {states});
  assert.match(html,/4x4 Intervals/);
  assert.match(html,/6,50 km/);
  assert.match(html,/Ikke hele treningshistorikken|Ingen eldre økter/);
  assert.doesNotMatch(html,/<img src/);
});

test("dashboard does not represent a goal title as the active training plan",()=>{
  const html=card("athlth-plan-card",{}, {states:first});
  assert.match(html,/Kommende trening/);
  assert.doesNotMatch(html,/Run 10K/);
});

test("live card does not show stale heart rate as current",()=>{
  const states={...first,
    "binary_sensor.athlth_workout_active":state("on"),
    "sensor.athlth_workout_heart_rate":state("185"),
    "sensor.athlth_last_sync":state("2026-10-19T06:00:00Z")};
  const html=card("athlth-active-card",{}, {states});
  assert.match(html,/Liveøkt kan ikke bekreftes/);
  assert.doesNotMatch(html,/185 bpm/);
});

test("visual editor has one unambiguous custom element",()=>{
  const definition=registry.get("athlth-dashboard-card");
  const document={createElement(name){return name;}};
  globalThis.document=document;
  assert.equal(definition.getConfigElement(),"athlth-config-editor");
  assert.ok(registry.has("athlth-config-editor"));
});

test("same device cannot be counted twice in family overview",()=>{
  const members=[
    {name:"Person 1",entity:"sensor.athlth_last_workout"},
    {name:"Duplicate",entity:"sensor.athlth_last_workout"}];
  const html=card("athlth-family-card",{members},{states:first});
  assert.match(html,/Person 1/);
  assert.doesNotMatch(html,/Duplicate/);
});


test("real active ATHLTH plan title and week come from shared metadata",()=>{
  const states={...first,
    "sensor.athlth_training_plan":state("8 week 4x4",{current_week:3,total_weeks:8,id:"plan-1"}),
    "sensor.athlth_training_schedule":state("2",{events:[
      {id:"past",title:"Done intervals",start:"2026-10-19T18:00:00Z",status:"completed"},
      {id:"future",title:"Upcoming run",start:"2099-10-20T18:00:00Z",status:"planned"}
    ]})
  };
  const html=card("athlth-plan-card",{}, {states});
  assert.match(html,/8 week 4x4/);
  assert.match(html,/Uke 3 av 8/);
  assert.match(html,/Upcoming run/);
  assert.doesNotMatch(html,/Done intervals/);
});

test("week calendar distinguishes completed and skipped from planned sessions",()=>{
  const now=new Date();
  const today=now.toISOString();
  const states={...first,
    "sensor.athlth_training_schedule":state("2",{events:[
      {id:"complete",title:"Run completed",start:today,status:"completed"},
      {id:"skipped",title:"Walk skipped",start:today,status:"skipped"}
    ]})
  };
  const html=card("athlth-calendar-card",{}, {states});
  assert.match(html,/status-completed/);
  assert.match(html,/status-skipped/);
});


test("real Home Assistant metric suffixes feed week, recovery and strength cards",()=>{
  const states={...first,
    "sensor.athlth_weekly_distance_km":state("12.7"),
    "sensor.athlth_sleep_duration_minutes":state("450"),
    "sensor.athlth_hrv_milliseconds":state("68"),
    "binary_sensor.athlth_workout_active":state("on"),
    "sensor.athlth_current_exercise":state("Squat"),
    "sensor.athlth_current_set":state("2"),
    "sensor.athlth_current_set_total":state("4"),
    "sensor.athlth_current_weight_kg":state("82.5"),
    "sensor.athlth_current_reps":state("8"),
    "sensor.athlth_current_rest_seconds":state("90")
  };
  states["sensor.athlth_last_sync"]=state(new Date().toISOString());
  assert.match(card("athlth-week-card",{}, {states}),/12,7/);
  const recovery=card("athlth-recovery-card",{}, {states});
  assert.match(recovery,/7,5/);
  assert.match(recovery,/68/);
  const strength=card("athlth-strength-card",{}, {states});
  assert.match(strength,/Squat/);
  assert.match(strength,/82,5/);
  assert.match(strength,/90 sekunder/);
});

test("planned completion is not inflated by extra workouts",()=>{
  const d=new Date().toISOString();
  const states={...first,"sensor.athlth_weekly_progress":state("100"),
    "sensor.athlth_weekly_workout_count":state("4"),
    "sensor.athlth_training_schedule":state("3",{events:[
      {id:"one",title:"Run",start:d,status:"completed"},
      {id:"two",title:"Strength",start:d,status:"planned"},
      {id:"three",title:"Skipped",start:d,status:"skipped"}
    ]})};
  const html=card("athlth-week-card",{}, {states});
  assert.match(html,/50%/);
  assert.match(html,/1 av 2 planlagte økter fullført/);
  assert.match(html,/Økter totalt/);
});

test("missing completed-workout metrics display dash instead of fake zero",()=>{
  const states={...first,"sensor.athlth_last_workout":state("Walk",{type:"walking",distance_meters:null,duration_seconds:null,average_heart_rate_bpm:null})};
  const html=card("athlth-last-card",{}, {states});
  assert.doesNotMatch(html,/0,00 km/);
  assert.doesNotMatch(html,/0 bpm/);
});


test("strength completion shows energy and time, not running distance",()=>{
  const states={...first,"sensor.athlth_last_workout":state("Full body strength",{
    type:"strength",duration_seconds:3600,distance_meters:null,
    active_energy_kcal:340,average_heart_rate_bpm:129
  })};
  const html=card("athlth-last-card",{}, {states});
  assert.match(html,/Full body strength/);
  assert.match(html,/340/);
  assert.match(html,/Energi/);
  assert.doesNotMatch(html,/Distanse<\/div>/);
  assert.doesNotMatch(html,/\/api\/camera_proxy\//);
});

test("treadmill workout shows pace without a GPS map",()=>{
  const states={...first,
    "sensor.athlth_last_workout":state("Treadmill intervals",{
      type:"indoor_running",duration_seconds:2400,distance_meters:6000,
      average_pace_seconds_per_km:360,ended_at:"2026-10-20T15:20:00Z"
    }),
    "camera.athlth_last_workout_route":state("idle",{ended_at:"2026-10-20T15:20:00Z"})
  };
  const html=card("athlth-last-card",{}, {states});
  assert.match(html,/Treadmill intervals/);
  assert.match(html,/6:00/);
  assert.match(html,/Løping innendørs/);
  assert.doesNotMatch(html,/\/api\/camera_proxy\//);
});


test("online, training, offline, private and unknown statuses render separately",()=>{
  const states={
    ...first,
    "sensor.athlth_presence":state("online")
  };
  const member={entity:"sensor.athlth_last_workout",name:"Person A"};
  const cardOnline=card("athlth-status-card",{members:[member]},{states});
  assert.match(cardOnline,/Online/);
  assert.match(cardOnline,/status-online/);

  states["sensor.athlth_presence"]=state("training");
  const cardTraining=card("athlth-family-card",{members:[member]},{states});
  assert.match(cardTraining,/Trener nå/);
  assert.match(cardTraining,/status-training/);

  states["sensor.athlth_presence"]=state("offline");
  assert.match(card("athlth-status-card",{members:[member]},{states}),/>Offline</);

  states["sensor.athlth_presence"]=state("not_shared");
  assert.match(card("athlth-status-card",{members:[member]},{states}),/Ikke delt/);

  delete states["sensor.athlth_presence"];
  assert.match(card("athlth-status-card",{members:[member]},{states}),/Ukjent/);
});

test("separate family installation states show green and amber without leakage",()=>{
  const states={...first,
    "sensor.athlth_presence":state("online"),
    "sensor.partner_last_workout":state("Workout"),
    "sensor.partner_presence":state("training")
  };
  const html=card("athlth-family-card",{members:[
    {name:"Athlete A",entity:"sensor.athlth_last_workout"},
    {name:"Athlete B",entity:"sensor.partner_last_workout"}
  ]},{states});
  assert.match(html,/Athlete A/);
  assert.match(html,/Athlete B/);
  assert.match(html,/status-online/);
  assert.match(html,/status-training/);
});


test("stale strength data is never shown as a live recording",()=>{
  const states={...first,
    "binary_sensor.athlth_workout_active":state("on"),
    "sensor.athlth_current_exercise":state("Deadlift"),
    "sensor.athlth_last_sync":state("2026-09-01T00:00:00Z")};
  const html=card("athlth-strength-card",{}, {states});
  assert.match(html,/kan ikke bekreftes/);
  assert.doesNotMatch(html,/PÅGÅENDE/);
});

test("status avatar uses the actual person initial",()=>{
  const states={...first,"sensor.athlth_presence":state("online")};
  const html=card("athlth-status-card",{name:"Siri"},{states});
  assert.match(html,/aria-hidden="true">S<\/div>/);
});


test("family summary counts current online and training separately, not paired devices",()=>{
  const states={...first,
    "sensor.athlth_presence":state("online"),
    "sensor.partner_last_workout":state("Strength"),
    "sensor.partner_presence":state("training"),
    "sensor.private_last_workout":state("Run"),
    "sensor.private_presence":state("not_shared")
  };
  const html=card("athlth-family-card",{members:[
    {name:"One",entity:"sensor.athlth_last_workout"},
    {name:"Two",entity:"sensor.partner_last_workout"},
    {name:"Three",entity:"sensor.private_last_workout"}
  ]},{states});
  assert.match(html,/1 trener nå/);
  assert.match(html,/1 online/);
  assert.match(html,/1 uten fersk status/);
  assert.match(html,/Ikke delt/);
});

test("desktop dashboard has a three-column layout and a featured latest workout",()=>{
  const html=card("athlth-dashboard-card",{}, {states:first});
  assert.match(html,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(html,/class="feature-card span-2"/);
  assert.match(html,/class="last-workout-layout"/);
  assert.match(html,/TRAINING INTELLIGENCE/);
  assert.match(html,/class="week-card"/);
});

test("outdoor latest workout displays its actual Home Assistant route camera picture",()=>{
  const states={...first,
    "camera.athlth_last_workout_route":state("idle",{
      ended_at:"2026-10-20T15:20:00+02:00",
      entity_picture:"/api/camera_proxy/camera.athlth_last_workout_route?token=signed123"
    })
  };
  const html=card("athlth-last-card",{}, {states});
  assert.match(html,/class="route-visual route-map"/);
  assert.match(html,/src="\/api\/camera_proxy\/camera\.athlth_last_workout_route\?token=signed123"/);
  assert.match(html,/Outdoor run/);
  assert.match(html,/7,50/);
});

test("route image accepts Home Assistant camera access token fallback",()=>{
  const states={...first,
    "camera.athlth_last_workout_route":state("idle",{
      ended_at:"2026-10-20T15:20:00+02:00",access_token:"temporary.token"
    })
  };
  const html=card("athlth-last-card",{}, {states});
  assert.match(html,/src="\/api\/camera_proxy\/camera\.athlth_last_workout_route\?token=temporary.token"/);
});

test("an old route never appears for a more recent workout",()=>{
  const states={...first,
    "camera.athlth_last_workout_route":state("idle",{
      ended_at:"2026-10-19T15:20:00+02:00",
      entity_picture:"/api/camera_proxy/camera.athlth_last_workout_route?token=old"
    })
  };
  const html=card("athlth-last-card",{}, {states});
  assert.doesNotMatch(html,/src="\/api\/camera_proxy\//);
  assert.match(html,/GPS-kart vises når ruten fra denne økten er delt/);
});


test("Training Intelligence creates four sections, visual charts and a three-column canvas",()=>{
  const states={...first,"sensor.athlth_recent_workouts":state("2",{workouts:[
    {id:"recent-1",name:"Recent strength",type:"strength",
      ended_at:new Date().toISOString(),duration_seconds:3600},
    {id:"recent-2",name:"Recent run",type:"outdoor_run",
      ended_at:new Date(Date.now()-86400000).toISOString(),duration_seconds:1800}
  ]})};
  const html=card("athlth-dashboard-card",{}, {states});
  for(const name of ["Nå og neste","Treningsgrunnlaget","Se mønstrene","Forstå fremgangen"]){
    assert.match(html,new RegExp(name));
  }
  assert.match(html,/TRAINING INTELLIGENCE/);
  assert.match(html,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(html,/class="feature-card span-2"/);
  assert.match(html,/class="trend-chart"/);
  assert.match(html,/class="mix-ring"/);
  assert.match(html,/class="rhythm-grid"/);
});

test("tomorrow card shows only tomorrow planned workouts and does not invent sessions",()=>{
  const now=new Date();
  const tomorrow=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,18,30);
  const yesterday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1,18,30);
  const states={...first,
    "sensor.athlth_training_schedule":state("3",{events:[
      {id:"tomorrow",title:"Tempo tomorrow",start:tomorrow.toISOString(),type:"run",status:"planned"},
      {id:"past",title:"Yesterday workout",start:yesterday.toISOString(),type:"run",status:"completed"},
      {id:"skipped",title:"Cancelled tomorrow",start:tomorrow.toISOString(),type:"run",status:"skipped"}
    ]})};
  const html=card("athlth-tomorrow-card",{}, {states});
  assert.match(html,/Tempo tomorrow/);
  assert.doesNotMatch(html,/Yesterday workout/);
  assert.doesNotMatch(html,/Cancelled tomorrow/);
  assert.match(html,/1 planlagt økt/);
  const none=card("athlth-tomorrow-card",{}, {states:{...first,
    "sensor.athlth_training_schedule":state("0",{events:[]}),
    "sensor.athlth_next_workout":state("Training at an unknown time"),
    "sensor.athlth_next_workout_time":state("unavailable")
  }});
  assert.match(none,/Ingen morgendagsøkt er delt/);
  assert.doesNotMatch(none,/Training at an unknown time/);
});

test("tomorrow fallback uses next-workout only if date is confirmed tomorrow",()=>{
  const d=new Date(),tomorrow=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1,7,15);
  const html=card("athlth-tomorrow-card",{}, {states:{
    "sensor.athlth_last_workout":state("Run"),
    "sensor.athlth_next_workout":state("Morning hike"),
    "sensor.athlth_next_workout_time":state(tomorrow.toISOString())
  }});
  assert.match(html,/Morning hike/);
});

test("training trends use real received duration, ignore invalid and duplicate records",()=>{
  const now=new Date().toISOString();
  const records=[
    {id:"same",name:"Run",type:"outdoor_run",ended_at:now,duration_seconds:1800},
    {id:"same",name:"Duplicate",type:"outdoor_run",ended_at:now,duration_seconds:1800},
    {id:"two",name:"Strength",type:"strength",ended_at:now,duration_seconds:3600},
    {id:"missing",name:"Unknown",type:"strength",ended_at:now}
  ];
  const states={...first,"sensor.athlth_recent_workouts":state("4",{workouts:records})};
  const html=card("athlth-trend-card",{}, {states});
  assert.match(html,/90<small> min/);
  assert.match(html,/3 økter/);
  assert.match(html,/Varighet mangler for 1 økt/);
  assert.match(html,/Utvalg: maks ti mottatte økter/);
  const mix=card("athlth-mix-card",{}, {states});
  assert.match(mix,/>3<\/strong><span>mottatt/);
  assert.doesNotMatch(mix,/Duplicate/);
});

test("dashboard does not show fictional trends for missing shared history",()=>{
  const html=card("athlth-dashboard-card",{}, {states:{}});
  assert.match(html,/Ingen morgendagsøkt er delt/);
  assert.match(html,/Ingen fullførte økter fra de siste syv dagene er mottatt/);
  assert.match(html,/Fordelingen vises når fullførte økter er mottatt/);
  assert.doesNotMatch(html,/class="trend-bar"/);
  assert.doesNotMatch(html,/class="mix-ring"/);
});

test("training intelligence escapes untrusted names and members",()=>{
  const states={...first,
    "sensor.athlth_next_workout":state("<img src=x onerror=alert(1)>"),
    "sensor.athlth_training_schedule":state("1",{events:[{
      id:"1",title:"<script>evil()</script>",
      start:new Date(Date.now()+86400000).toISOString(),status:"planned"
    }]}),
    "sensor.athlth_recent_workouts":state("1",{workouts:[{
      id:"1",name:"Run",type:"<script>x</script>",ended_at:new Date().toISOString(),duration_seconds:600
    }]})
  };
  const html=card("athlth-dashboard-card",{name:"<img src=x onerror=alert(1)>"},{states});
  assert.doesNotMatch(html,/<script>evil/);
  assert.doesNotMatch(html,/<img src=x/);
  assert.match(html,/&lt;script&gt;evil/);
});


test("dashboard shows real athlete profile photo only when expressly shared",()=>{
  const name="Sindre";
  const avatar="https://demo.supabase.co/storage/v1/object/public/profile-avatars/abc/avatar.jpg?v=1";
  const states={...first,
    "sensor.athlth_athlete_profile":state(name,{avatar_url:avatar}),
    "sensor.athlth_performance_records":state("0",{records:[]}),
  };
  const html=card("athlth-dashboard-card",{}, {states});
  assert.match(html,/Sindre/);
  assert.match(html,/class="hero-avatar"/);
  assert.match(html,/https:\/\/demo.supabase.co\/storage\/v1\/object\/public\/profile-avatars\/abc\/avatar.jpg\?v=1/);
  assert.doesNotMatch(card("athlth-dashboard-card",{}, {states:first}),/<img class="hero-avatar"/);
});

test("never render an arbitrary attacker avatar URL",()=>{
  const states={...first,
    "sensor.athlth_athlete_profile":state("Athlete",{avatar_url:"http://127.0.0.1:8123/api/secrets"}),
  };
  const html=card("athlth-dashboard-card",{}, {states});
  assert.doesNotMatch(html,/src="http:\/\/127.0.0.1/);
  assert.match(html,/hero-avatar-empty/);
});

test("recent workout feed sorts by completion, preserves device and never shows fake values",()=>{
  const records=[
    {id:"old",name:"Strength",type:"strength",ended_at:"2026-10-20T13:00:00Z",duration_seconds:1800,device:"Apple Watch"},
    {id:"new",name:"Morning run",type:"outdoor_run",ended_at:"2026-10-21T13:00:00Z",duration_seconds:2400,distance_meters:8000,device:"iPhone"},
    {id:"old",name:"Duplicate",type:"strength",ended_at:"2026-10-20T13:00:00Z"}
  ];
  const html=card("athlth-feed-card",{}, {states:{...first,
    "sensor.athlth_recent_workouts":state("3",{workouts:records})
  }});
  assert.ok(html.indexOf("Morning run") < html.indexOf("Strength"));
  assert.match(html,/8,00 km/);
  assert.match(html,/Apple Watch/);
  assert.doesNotMatch(html,/Duplicate/);
  assert.match(html,/NYESTE/);
});

test("performance card displays only supplied PR values in a finite list",()=>{
  const records=[
    {id:"a",title:"Fastest 5K",value:"22:01",category:"running",date:"2026-10-20T12:00:00Z"},
    {id:"b",title:"Bench press",value:"85 kg × 5",category:"strength",date:"2026-10-21T12:00:00Z"}
  ];
  const html=card("athlth-records-card",{}, {states:{...first,
    "sensor.athlth_performance_records":state("2",{records,source:"ATHLTH snapshot"})
  }});
  assert.match(html,/22:01/);
  assert.match(html,/85 kg × 5/);
  assert.match(html,/Delte rekorder fra ATHLTH/);
  assert.ok(html.indexOf("Bench press") < html.indexOf("Fastest 5K"));
  const empty=card("athlth-records-card",{}, {states:{}});
  assert.match(empty,/Ingen personlige rekorder er delt/);
  assert.doesNotMatch(empty,/22:01/);
});

test("Athlete data from another paired installation does not cross profiles",()=>{
  const states={...first,
    "sensor.athlth_athlete_profile":state("Athlete A",{avatar_url:"https://one.supabase.co/storage/v1/object/public/profile-avatars/a/avatar.jpg"}),
    "sensor.partner_last_workout":state("Workout"),
    "sensor.partner_athlete_profile":state("Athlete B",{avatar_url:"https://two.supabase.co/storage/v1/object/public/profile-avatars/b/avatar.jpg"}),
    "sensor.athlth_performance_records":state("1",{records:[{id:"a",title:"5 km",value:"20:01",category:"running",date:"2026-10-20T10:00:00Z"}]}),
    "sensor.partner_performance_records":state("1",{records:[{id:"b",title:"5 km",value:"21:22",category:"running",date:"2026-10-20T10:00:00Z"}]})
  };
  const members=[{name:"A",entity:"sensor.athlth_last_workout"},{name:"B",entity:"sensor.partner_last_workout"}];
  const html=card("athlth-dashboard-card",{members},{states});
  assert.match(html,/Athlete A/);
  assert.match(html,/20:01/);
  assert.doesNotMatch(html,/Athlete B/);
  assert.doesNotMatch(html,/21:22/);
});

test("bad workout and performance titles cannot inject HTML",()=>{
  const now=new Date().toISOString();
  const states={...first,
    "sensor.athlth_recent_workouts":state("1",{workouts:[{name:"<script>steal()</script>",type:"strength",ended_at:now}]}),
    "sensor.athlth_performance_records":state("1",{records:[{id:"x",title:"<img src=x onerror=1>",value:"<svg onload=1>",category:"strength",date:now}]})
  };
  const html=card("athlth-dashboard-card",{}, {states});
  assert.doesNotMatch(html,/<script>steal/);
  assert.doesNotMatch(html,/<img src=x/);
  assert.doesNotMatch(html,/<svg onload/);
  assert.match(html,/&lt;script&gt;/);
  assert.match(html,/&lt;svg/);
});


test("the iPad dashboard declares full-width Home Assistant Sections placement",()=>{
  const Card=registry.get("athlth-dashboard-card");
  const component=new Card();
  assert.deepEqual(component.getGridOptions(),{columns:12,rows:"auto"});
  assert.match(card("athlth-dashboard-card",{}, {states:first}),/@container \(min-width:790px\)/);
  assert.match(card("athlth-dashboard-card",{}, {states:first}),/repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(card("athlth-dashboard-card",{}, {states:first}),/@container \(min-width:620px\) and \(max-width:789px\)/);
});

test("unrelated Home Assistant sensor updates do not overwrite scroll DOM",()=>{
  const Card=registry.get("athlth-dashboard-card");
  const component=new Card();
  component.setConfig({type:"custom:athlth-dashboard-card"});
  let writes=0;
  const mockRoot={
    _html:"",
    addEventListener(){},
    set innerHTML(value){writes++;this._html=value;},
    get innerHTML(){return this._html;}
  };
  component._root=mockRoot;
  component.hass={states:first};
  assert.equal(writes,1);
  component.hass={states:{...first,"sensor.weather_outdoor":state("Rain")}};
  assert.equal(writes,1,"Unrelated updates should not reset the entire dashboard DOM");
});

test("updated ATHLTH sensors patch in place without replacing existing scroll nodes",()=>{
  const Card=registry.get("athlth-dashboard-card");
  const component=new Card();
  component.setConfig({type:"custom:athlth-dashboard-card"});
  const realDocument=globalThis.document;
  let fullRootWrites=0;
  const preservedText={nodeType:3,nodeValue:""};
  const root={
    childNodes:[preservedText],
    addEventListener(){},
    set innerHTML(value){fullRootWrites++;preservedText.nodeValue=value;},
    get innerHTML(){return this.childNodes.map(n=>n.nodeValue).join("");}
  };
  globalThis.document={
    createElement(tag){
      assert.equal(tag,"template");
      return {
        content:{childNodes:[{nodeType:3,nodeValue:""}]},
        set innerHTML(value){this.content.childNodes[0].nodeValue=value;}
      };
    }
  };
  try{
    component._root=root;
    component.hass={states:first};
    assert.equal(fullRootWrites,1);
    const oldText=preservedText.nodeValue;
    component.hass={states:{...first,"sensor.athlth_weekly_progress":state("90")}};
    assert.equal(fullRootWrites,1,"An ATHLTH change should patch, not replace, the scroll tree");
    assert.strictEqual(root.childNodes[0],preservedText);
    assert.notEqual(preservedText.nodeValue,oldText);
    assert.match(preservedText.nodeValue,/90%/);
  }finally{
    globalThis.document=realDocument;
  }
});


test("iPad kiosk uses the full ATHLTH grid and keeps HA navigation outside the card",()=>{
  const html=card("athlth-dashboard-card",{kiosk:true},{states:first});
  assert.match(html,/class="dashboard studio-dashboard kiosk-layout"/);
  assert.match(html,/kiosk-jump-nav/);
  assert.match(html,/data-athlth-section="04"/);
  assert.match(html,/id="athlth-section-04"/);
  assert.match(html,/@container \(min-width:720px\) and \(max-width:789px\)/);
  assert.doesNotMatch(html,/hide_sidebar: true/);
  const normal=card("athlth-dashboard-card",{}, {states:first});
  assert.doesNotMatch(normal,/<nav class="kiosk-jump-nav"/);
  assert.doesNotMatch(normal,/class="dashboard studio-dashboard kiosk-layout"/);
});

test("kiosk jump controls can reach performance section without replacing dashboard DOM",()=>{
  const Card=registry.get("athlth-dashboard-card");
  const c=new Card();
  let callback;
  const target={scrollIntoView(options){this.lastOptions=options;}};
  c._root={
    innerHTML:"",
    addEventListener(type,fn){if(type==="click")callback=fn;},
    getElementById(id){return id==="athlth-section-04"?target:null;}
  };
  c.hass={states:first};
  c.setConfig({type:"custom:athlth-dashboard-card",kiosk:true});
  c.connectedCallback();
  assert.equal(typeof callback,"function");
  callback({target:{closest(selector){
    return selector==="[data-athlth-section]"?
      {getAttribute(){return "04";}}:null;
  }}});
  assert.deepEqual(target.lastOptions,{block:"start",behavior:"smooth"});
});


test("30/90-day chart uses ONLY Apple Health summary days and shows provenance",()=>{
  const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const prev=new Date(today.getTime()-2*86400000);
  const old=new Date(today.getTime()-62*86400000);
  const days=[
    {date:prev.toISOString().slice(0,10),sessions:2,minutes:50,distance_km:9},
    {date:old.toISOString().slice(0,10),sessions:1,minutes:25,distance_km:5},
  ];
  const states={...first,"sensor.athlth_workout_history":state("3",{days})};
  const normal=card("athlth-long-trend-card",{}, {states});
  assert.match(normal,/30 dager/);
  assert.match(normal,/90 dager/);
  assert.match(normal,/3[0-9]*<\/strong>/);
  assert.match(normal,/Kilde: Apple Health/);
  assert.match(normal,/manuelt registrert/);
  assert.doesNotMatch(normal,/22:01/);
});

test("90-day range switch is local to the card and never alters home assistant state",()=>{
  const Custom=registry.get("athlth-long-trend-card");
  const cardInstance=new Custom();
  const old=new Date(Date.now()-58*86400000).toISOString().slice(0,10);
  cardInstance.setConfig({type:"custom:athlth-long-trend-card"});
  cardInstance.hass={states:{...first,"sensor.athlth_workout_history":state("1",{
    days:[{date:old,sessions:1,minutes:30,distance_km:5}]
  })}};
  let callback=null;
  cardInstance._root.addEventListener=(type,fn)=>{if(type==="click")callback=fn;};
  cardInstance.connectedCallback();
  const before=cardInstance._root.innerHTML;
  callback({target:{closest(q){return q==="[data-athlth-range]"?{
    getAttribute(){return "90";}
  }:null;}}});
  assert.equal(cardInstance._historyRange,90);
  assert.match(cardInstance._root.innerHTML,/30<\/strong>/);
  assert.notEqual(cardInstance._root.innerHTML,before);
});

test("history chart does not invent a trend when opt-in sync is absent",()=>{
  const html=card("athlth-long-trend-card",{}, {states:first});
  assert.match(html,/Historiske øktsammendrag er ikke delt/);
  assert.doesNotMatch(html,/100 økter/);
});
