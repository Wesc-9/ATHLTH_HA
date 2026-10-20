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
  const names=["dashboard","week","today","next","last","plan","family","recovery","active","calendar","goals","strength"];
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
  states["sensor.athlth_current_set"]=state("3");
  states["sensor.athlth_current_reps"]=state("8");
  assert.match(card("athlth-strength-card",{}, {states}),/Squat/);
});

test("missing and disabled data remain unavailable, never fake training values",()=>{
  const html=card("athlth-week-card",{}, {states:{}});
  assert.match(html,/Koble til ATHLTH/);
  assert.doesNotMatch(html,/154 min/);
});
