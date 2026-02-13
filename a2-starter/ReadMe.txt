# Three.js NPC Steering, Obstacle Avoidance, and Bullet Firing

## Overview
This project extends the provided Three.js starter code by adding:
- Randomized **RoundEntity** obstacle generation (non-overlapping, within map bounds)
- An **NPC** (DynamicEntity) that **wanders** and **avoids obstacles** using whisker-based collision avoidance
- A **BulletEntity** that the NPC can spawn and fire (with cooldown), currently triggered when avoidance reports a collision
- Additional collision-avoidance implementations in `CollisionAvoidSteering.js` (`round2`, `round3`, and `whiskerAvoid`)

Target audience: TA / instructor (focus on what changed + how to run, not re-explaining starter code).

---

## How to Run
- Run the project the same way as the original starter project (no changes to the overall build/run pipeline).
- Main logic changes are in `World.js`, `CollisionAvoidSteering.js`, and the new `BulletEntity.js`.

---

## File Changes / Additions

### `entities/BulletEntity.js` (NEW)
- Added a new `BulletEntity` under the `entities/` folder.
- Bullet behavior:
  - Initialized with a direction + speed, travels forward, and expires after a TTL.
  - Marked as `dead` when TTL is exceeded (handled by cleanup logic in `World.update()`).


---

### `World.js` (UPDATED)
#### NPC Setup
- Spawns a `DynamicEntity` NPC at the left edge of the map:
  - `position: (map.minX, 0, 0)`
  - `velocity: (10, 0, 0)`
  - `color: blue`

### "Setupa.js(Updated)
 -- in create light function created ambient light
 --- in axishelper function add roadTexture.jpg by texture loader


#### Random Round Obstacles
- Added `createObstacle(n)` to spawn `n` round obstacles:
  - Random radius: `Math.random() * 1.5 + 0.9`
  - Random position within map bounds with `margin`
  - Prevents overlap using distance checks against existing `RoundEntity` objects

#### NPC Forward Direction
- Added `getNpcForward()`:
  - Uses NPC velocity direction as forward
  - Includes a fallback direction if velocity magnitude is ~0

#### NPC Firing
- Added firing support:
  - `fireCooldown` and `fireTimer`
  - `npcFire()` spawns a `BulletEntity` slightly in front of the NPC (to avoid immediate self-collision)
  - Bullets are fired when avoidance reports a collision:
    - `if (fireTimer >= fireCooldown && avoid.collided === true)`

#### Cleanup
- Added entity cleanup in `update()`:
  - Removes entities marked as `dead` from both the scene and `this.entities`

---

### `ai/steering/CollisionAvoidSteering.js` (UPDATED)
#### Added / Updated Methods
- `whiskerAvoid(npc, entityList, lookAhead, howFar, debug)`
  - Iterates through entities and calls `round3`
  - Returns an object:
    - `{ steer: <Vector3>, collided: true/false }`
  - Uses npc speed to compute an `effectiveLookAhead`:
    - `effectiveLookAhead = Math.max(lookAhead, 0.6 + speed * 0.35)`

- `round3(entity, obstacle, lookAhead, howFar, debug)`
  - Whisker-based obstacle avoidance using:
    - Forward whisker
    - Left whisker (+30°)
    - Right whisker (-30°)
  - Computes collisions via closest point checks on each whisker segment
  - If collision occurs:
    - Computes collision point
    - Computes avoid target via normal push-out
    - Uses `SteeringBehaviours.seek()` to generate steering
    - Averages steering when multiple whiskers collide
  - Includes a strong “push away” when very close to an obstacle

- `round2(entity, obstacle, lookAhead, howFar, debug)`
  - Alternative whisker implementation (another version kept for comparison/testing)

---

## Behavior Summary
- NPC wanders using `SteeringBehaviours.wander(...)`
- NPC avoids obstacles using `CollisionAvoidSteering.whiskerAvoid(...)`
- NPC fires bullets when the avoidance system reports a collision (cooldown-limited)
- Bullets expire automatically after TTL and are removed from the scene

---

## Notes for Grading
- New file added: `entities/BulletEntity.js`
- Core modifications:
  - `World.js`: obstacle generation, npc forward/fire, bullet spawn + cleanup
  - `CollisionAvoidSteering.js`: added `whiskerAvoid`, `round3`, `round2` implementations
