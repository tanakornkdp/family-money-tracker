import test from "node:test";
import assert from "node:assert/strict";

import { parseHomeCardPreferences, serializeHomeCardPreferences } from "../lib/utils/mobileHomeCards.mjs";

const defaults = ["categories", "bills", "trips"];

test("missing preference cookie uses defaults while an explicit empty cookie keeps every card hidden", () => {
  assert.deepEqual(parseHomeCardPreferences("theme=dark", defaults), defaults);
  assert.deepEqual(parseHomeCardPreferences("mobile_home_cards=; theme=dark", defaults), []);
});

test("preferences round-trip selected card ids and malformed values fail safely", () => {
  const cookie = serializeHomeCardPreferences(["categories", "trips"]);
  assert.equal(cookie, "mobile_home_cards=categories%2Ctrips;path=/;max-age=31536000;samesite=lax");
  assert.deepEqual(parseHomeCardPreferences(`${cookie}; theme=dark`, defaults), ["categories", "trips"]);
  assert.deepEqual(parseHomeCardPreferences("mobile_home_cards=%E0%A4%A", defaults), defaults);
});
