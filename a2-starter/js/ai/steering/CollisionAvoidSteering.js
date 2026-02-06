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