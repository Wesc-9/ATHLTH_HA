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
  const names=["dashboard","week","today","next","last","plan","family","recovery","active","calendar","goals","strength","history","status"];
  for(const name of names)assert.ok(registry.has("athlth-"+name+"-card"),name);
  assert.equal(window.customCards.length,names.length);
});

test("dashboard uses brand logo and real sensor data",()=>{
  const html=card("athlth-dashboard-card",{}, {states:first});
  assert.match(html,/PROGRESS LIVES HERE/);
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
