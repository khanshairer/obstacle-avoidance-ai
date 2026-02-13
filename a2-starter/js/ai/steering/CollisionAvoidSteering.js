import * as THREE from 'three';
import { SteeringBehaviours } from './SteeringBehaviours.js';


export class CollisionAvoidSteering {

  // Produces a steering behaviour to 
  // avoid a round obstacle
  static round(entity, obstacle, lookAhead, howFar, debug) {

    let steer = new THREE.Vector3();

    // First, get the future location of our character
    let predictedChange = entity.velocity.clone().multiplyScalar(lookAhead);
    let predictedLocation = entity.position.clone().add(predictedChange);

    // show via a line
    debug.showLine("predictedLocation", entity.position, predictedLocation);

    // Get the closest point on the line segment from 
    // our entity --> it's predicted location
    // to the center of the round obstacle 
    let closestPoint = CollisionAvoidSteering.getClosestPointOnSegment(
        entity.position,
        predictedLocation,
        obstacle.position
      );

    // show via a sphere
    debug.showSphere("closestPoint", closestPoint);


    // Check to see if there is a collision
    let isCollision =
      closestPoint.distanceTo(obstacle.position) <= obstacle.radius;

    let collisionPoint = new THREE.Vector3();
    let target = new THREE.Vector3();

    if (isCollision) {
      collisionPoint = CollisionAvoidSteering.getLineCircleCollisionPoint(
          entity.position, 
          predictedLocation, 
          obstacle.position, 
          obstacle.radius
        );

      // Get the avoid target
      target = CollisionAvoidSteering.getAvoidTarget(collisionPoint, obstacle, howFar);

      steer = SteeringBehaviours.seek(entity, target);

      // show via spheres
      debug.showSphere("collisionPoint", collisionPoint);
      debug.showSphere("target", target);

    }
    else {
      // hide unnecessary spheres
      debug.hideObjs(["collisionPoint", "target"]);
    }

    return steer;
  }

  // Get the avoid target
  static getAvoidTarget(collisionPoint, obstacle, howFar) {

    let normal = collisionPoint.clone().sub(obstacle.position);
    normal.setLength(howFar);

    let target = collisionPoint.clone().add(normal);

    return target;
  }
  
  // Produces a steering behaviour to avoid all the round obstacles in the  scene using the whisker method (three rays: forward, left, right) and averages the resulting steering forces for smoother avoidance
  // One Steering Behaviour that checks all obstacles and returns a single steer vector that combines the avoidance forces from all colliding whiskers (if any)
  static whiskerAvoid(npc, entityList, lookAhead, howFar, debug) {
    // increase the lookahead of the side whisker based on npc speed, so that they can detect obstacles sooner when moving faster (prevents slipping inside)
    //otherwise for full speed npc, the side whiskers are too short to detect obstacles in time, causing it to collide and get stuck inside
    const speed = npc.velocity.length();
    

    for(let entity of entityList) {
      if (entity === npc) continue;
      const effectiveLookAhead = Math.max(lookAhead, 0.6 + speed * 0.35);
      let steer = CollisionAvoidSteering.round3(npc, entity,lookAhead, effectiveLookAhead, howFar, debug);
      if (steer.length() > 0) return {steer:steer, collided: true};
    }
      return {steer:new THREE.Vector3(), collided: false};

}

// A version of round avoidance that uses three whiskers (forward, left, right) to check for collisions and averages the resulting steering forces for smoother avoidance
// it keeps the frontLookAhead constant and increase the side lookahead based on the npc speeed 
// takes in the npc, the obstacle, the lookahead distance for the front whisker, the lookahead distance for the side whiskers, how far to steer away, and the debug object for visualization
// return a steer vector that combines the avoidance forces from all colliding whiskers (if any)
static round3(entity, obstacle,frontlookAhead, lookAhead, howFar, debug) {

  let steer = new THREE.Vector3();

  // check if obstacle is circle
  if (!obstacle || typeof obstacle.radius !== "number" || !obstacle.position) {
    return steer;
  }

  const npcRadius = (typeof entity.radius === "number") ? entity.radius : 0;
  const combinedR = obstacle.radius + npcRadius;

  const distNow = entity.position.distanceTo(obstacle.position);
  const buffer = 0.3;
  if (distNow <= combinedR + buffer) {
    const away = entity.position.clone().sub(obstacle.position);
    if (away.lengthSq() < 1e-8) away.set(1, 0, 0);
    away.setLength(entity.maxForce);
    return away;
  }

  const angle = Math.PI / 6; // 30 degrees
  const axis = new THREE.Vector3(0, 1, 0);

  // forward
  const predictedLocation = entity.position.clone().add(
    entity.velocity.clone().multiplyScalar(frontlookAhead)
  );

  // LEFT (30°) whisker is created by rotating velocity vector by +30 degrees around Y axis
  const predictedLocation2 = entity.position.clone().add(
    entity.velocity.clone().setLength(lookAhead).applyAxisAngle(axis, angle)
  );

  // RIGHT (30°) whisker is created by rotating velocity vector by -30 degrees around Y axis
  const predictedLocation3 = entity.position.clone().add(
    entity.velocity.clone().setLength(lookAhead).applyAxisAngle(axis, -angle)
  );

  // closest points on each whisker segment
  const cp1 = CollisionAvoidSteering.getClosestPointOnSegment(entity.position, predictedLocation,  obstacle.position);
  const cp2 = CollisionAvoidSteering.getClosestPointOnSegment(entity.position, predictedLocation2, obstacle.position);
  const cp3 = CollisionAvoidSteering.getClosestPointOnSegment(entity.position, predictedLocation3, obstacle.position);

  // collision checks for each whisker (compares closest point to obstacle center against combined radius)
  const isCollision  = cp1.distanceTo(obstacle.position) <= combinedR;
  const isCollision2 = cp2.distanceTo(obstacle.position) <= combinedR;
  const isCollision3 = cp3.distanceTo(obstacle.position) <= combinedR;

  // whisker colors turns yellow on collision, red otherwise
  debug.showLine("predictedLocation",  entity.position, predictedLocation,  isCollision  ? "red" : "yellow");
  debug.showLine("predictedLocation2", entity.position, predictedLocation2, isCollision2 ? "red" : "yellow");
  debug.showLine("predictedLocation3", entity.position, predictedLocation3, isCollision3 ? "red" : "yellow");

  // If nothing collides, no steer ...go towards target as normal
  if (!isCollision && !isCollision2 && !isCollision3) {
    return steer;
  }

  // Build steering from all colliding whiskers (average)
  let sum = new THREE.Vector3();
  let count = 0;

  const addAvoid = (endPoint, collided) => {
    if (!collided) return;

    const col = CollisionAvoidSteering.getLineCircleCollisionPoint(
      entity.position,
      endPoint,
      obstacle.position,
      combinedR
    );

    // If collision point calculation fails, skip (prevents NaNs)
    if (!col || !Number.isFinite(col.x) || !Number.isFinite(col.z)) return;

    const target = CollisionAvoidSteering.getAvoidTarget(col, obstacle, howFar);
    const s = SteeringBehaviours.seek(entity, target);

    sum.add(s);
    count++;
  };

  addAvoid(predictedLocation,  isCollision);
  addAvoid(predictedLocation2, isCollision2);
  addAvoid(predictedLocation3, isCollision3);

  if (count === 0) return new THREE.Vector3();

  steer.copy(sum.divideScalar(count));

  // --- extra strength when close (prevents slipping inside) ---
  // the closer you are to obstacle, the stronger the avoidance
  const distToCenter = entity.position.distanceTo(obstacle.position);
  const danger = THREE.MathUtils.clamp((combinedR * 2 - distToCenter) / (combinedR * 2), 0, 1);
  const boost = 1 + danger * 3; // up to 4x near collision

  steer.multiplyScalar(boost);

  // Clamp the magnitude of steer to npc.maxForce
  if (steer.length() > entity.maxForce) {
    steer.setLength(entity.maxForce);
  }

  return steer;
}



  // Produces a steering behaviour to 
  // avoid a round obstacle
  //another version that uses three "whiskers" (forward, left, right) to check for collisions and averages the resulting steering forces for smoother avoidance
  // first_version
  static round2(entity, obstacle, lookAhead, howFar, debug) {

    let steer = new THREE.Vector3();

    // First, get the future location of our character
    const angle = Math.PI / 6; // 30 degrees
const axis = new THREE.Vector3(0, 1, 0);

// forward
let predictedLocation = entity.position.clone().add(
  entity.velocity.clone().multiplyScalar(lookAhead)
);

// LEFT (30°)
let leftVelocity = entity.velocity
  .clone()
  .setLength(lookAhead)
  .applyAxisAngle(axis, angle);

let predictedLocation2 = entity.position.clone().add(leftVelocity);

// RIGHT (30°)
let rightVelocity = entity.velocity
  .clone()
  .setLength(lookAhead)
  .applyAxisAngle(axis, -angle);

let predictedLocation3 = entity.position.clone().add(rightVelocity);


    // Get the closest point on the line segment from 
    // our entity --> it's predicted location
    // to the center of the round obstacle 
    let closestPoint = CollisionAvoidSteering.getClosestPointOnSegment(
        entity.position,
        predictedLocation,
        obstacle.position
      );

    let closestPoint2 = CollisionAvoidSteering.getClosestPointOnSegment(
        entity.position,
        predictedLocation2,
        obstacle.position
      );

    let closestPoint3 = CollisionAvoidSteering.getClosestPointOnSegment(
        entity.position,
        predictedLocation3,
        obstacle.position
      );

    // show via a sphere
    //debug.showSphere("closestPoint", closestPoint);


    // Check to see if there is a collision
    let isCollision =
      closestPoint.distanceTo(obstacle.position) <= obstacle.radius;

    let isCollision2 =
      closestPoint2.distanceTo(obstacle.position) <= obstacle.radius;

    let isCollision3 =
      closestPoint3.distanceTo(obstacle.position) <= obstacle.radius;

    
    // debug lines
    debug.showLine("predictedLocation",  entity.position, predictedLocation,  isCollision  ? "yellow" : "red");
    debug.showLine("predictedLocation2", entity.position, predictedLocation2, isCollision2 ? "yellow" : "red");
    debug.showLine("predictedLocation3", entity.position, predictedLocation3, isCollision3 ? "yellow" : "red");


    
    let collisionPoint = new THREE.Vector3();
    let target = new THREE.Vector3();
    let collisionPoint1 = new THREE.Vector3();
    let target1 = new THREE.Vector3();
    let steer1 = new THREE.Vector3();
    let collisionPoint2 = new THREE.Vector3();
    let target2 = new THREE.Vector3();
    let steer2 = new THREE.Vector3();
    let target3 = new THREE.Vector3();
    let steer3 = new THREE.Vector3();

    if (isCollision && isCollision2 && isCollision3) {
      collisionPoint = CollisionAvoidSteering.getLineCircleCollisionPoint(
          entity.position, 
          predictedLocation, 
          obstacle.position, 
          obstacle.radius
        );

      // Get the avoid target
      target1 = CollisionAvoidSteering.getAvoidTarget(collisionPoint, obstacle, howFar);

      steer1 = SteeringBehaviours.seek(entity, target1);

      collisionPoint1 = CollisionAvoidSteering.getLineCircleCollisionPoint(
          entity.position, 
          predictedLocation2, 
          obstacle.position, 
          obstacle.radius
        );

      // Get the avoid target
      target2 = CollisionAvoidSteering.getAvoidTarget(collisionPoint1, obstacle, howFar);

      steer2 = SteeringBehaviours.seek(entity, target2);
      
      collisionPoint2 = CollisionAvoidSteering.getLineCircleCollisionPoint(
          entity.position, 
          predictedLocation3, 
          obstacle.position, 
          obstacle.radius
        );
        
      // Get the avoid target
      target3 = CollisionAvoidSteering.getAvoidTarget(collisionPoint2, obstacle, howFar);
      steer3 = SteeringBehaviours.seek(entity, target3);

      // Average the three steering forces
      steer = steer1.add(steer2).add(steer3).divideScalar(3);
      
      
      return steer;
      
    }
    else if (isCollision && isCollision2) {
      collisionPoint = CollisionAvoidSteering.getLineCircleCollisionPoint(
          entity.position, 
          predictedLocation, 
          obstacle.position, 
          obstacle.radius
        );

      // Get the avoid target
      target1 = CollisionAvoidSteering.getAvoidTarget(collisionPoint, obstacle, howFar);

      steer1 = SteeringBehaviours.seek(entity, target1);

      collisionPoint1 = CollisionAvoidSteering.getLineCircleCollisionPoint(
          entity.position, 
          predictedLocation2, 
          obstacle.position, 
          obstacle.radius
        );

      // Get the avoid target
      target2 = CollisionAvoidSteering.getAvoidTarget(collisionPoint1, obstacle, howFar);

      steer2 = SteeringBehaviours.seek(entity, target2);
      
      
      // Average the three steering forces
      steer = steer1.add(steer2).divideScalar(2);
      
      
      return steer;
      
    }

    // one and 3
    else if (isCollision && isCollision3) {
      collisionPoint = CollisionAvoidSteering.getLineCircleCollisionPoint(
          entity.position, 
          predictedLocation, 
          obstacle.position, 
          obstacle.radius
        );

      // Get the avoid target
      target1 = CollisionAvoidSteering.getAvoidTarget(collisionPoint, obstacle, howFar);

      steer1 = SteeringBehaviours.seek(entity, target1);

      
      collisionPoint2 = CollisionAvoidSteering.getLineCircleCollisionPoint(
          entity.position, 
          predictedLocation3, 
          obstacle.position, 
          obstacle.radius
        );
        
      // Get the avoid target
      target3 = CollisionAvoidSteering.getAvoidTarget(collisionPoint2, obstacle, howFar);
      steer3 = SteeringBehaviours.seek(entity, target3);

      // Average the three steering forces
      steer = steer1.add(steer3).divideScalar(2);
      
      
      return steer;
      
    }
    
    // two and three
    
    else if (isCollision2 && isCollision3) {
      
      collisionPoint1 = CollisionAvoidSteering.getLineCircleCollisionPoint(
          entity.position, 
          predictedLocation2, 
          obstacle.position, 
          obstacle.radius
        );

      // Get the avoid target
      target2 = CollisionAvoidSteering.getAvoidTarget(collisionPoint1, obstacle, howFar);

      steer2 = SteeringBehaviours.seek(entity, target2);
      
      collisionPoint2 = CollisionAvoidSteering.getLineCircleCollisionPoint(
          entity.position, 
          predictedLocation3, 
          obstacle.position, 
          obstacle.radius
        );
        
      // Get the avoid target
      target3 = CollisionAvoidSteering.getAvoidTarget(collisionPoint2, obstacle, howFar);
      steer3 = SteeringBehaviours.seek(entity, target3);

      // Average the three steering forces
      steer = steer2.add(steer3).divideScalar(2);
      
      
      return steer;
          
    }
    else if (isCollision) {
      collisionPoint = CollisionAvoidSteering.getLineCircleCollisionPoint(
          entity.position, 
          predictedLocation, 
          obstacle.position, 
          obstacle.radius
        );

      // Get the avoid target
      target = CollisionAvoidSteering.getAvoidTarget(collisionPoint, obstacle, howFar);

      steer = SteeringBehaviours.seek(entity, target);
      
      
    }
    else if (isCollision2) {
      collisionPoint = CollisionAvoidSteering.getLineCircleCollisionPoint(
          entity.position, 
          predictedLocation2, 
          obstacle.position, 
          obstacle.radius
        );
        // Get the avoid target
      target = CollisionAvoidSteering.getAvoidTarget(collisionPoint, obstacle, howFar);

      steer = SteeringBehaviours.seek(entity, target);

      
      }
    else if (isCollision3) {
      collisionPoint = CollisionAvoidSteering.getLineCircleCollisionPoint(
          entity.position, 
          predictedLocation3, 
          obstacle.position, 
          obstacle.radius
        );
        // Get the avoid target
      target = CollisionAvoidSteering.getAvoidTarget(collisionPoint, obstacle, howFar);

      steer = SteeringBehaviours.seek(entity, target);

      

      
    }
    

    return steer;
  }

  // Get the closest point on the line
  // to the center of the obstacle
  static getClosestPointOnSegment(start, end, point) {
    let segment = end.clone().sub(start);
    let toPoint = point.clone().sub(start);

    let sp = toPoint.dot(segment)/segment.length();

    let clampedSP = THREE.MathUtils.clamp(sp, 0, segment.length());

    let closest = segment.clone().setLength(clampedSP);
    closest.add(start);

    return closest;
  }

  // Get the collision point between
  // a line and a circle
  static getLineCircleCollisionPoint(start, end, circlePos, radius) {

    let line = end.clone().sub(start);

    let toCircle = circlePos.clone().sub(start);
    let sp = toCircle.dot(line)/line.length();

    // Point on line closest to center
    let projectionPoint = line.clone().setLength(sp);
    projectionPoint.add(start);

    let opposite = projectionPoint.clone().sub(circlePos);
    let adjacent = Math.sqrt(radius * radius - opposite.length() ** 2);

    let collisionLength = sp - adjacent;

    let collisionPoint = line.clone().setLength(collisionLength);
    collisionPoint.add(start);

    return collisionPoint;
  }


}