import * as THREE from 'three';
import * as Setup from './setup.js';
import { Entity } from './entities/Entity.js';
import { DynamicEntity } from './entities/DynamicEntity.js';
import { RoundEntity } from './entities/RoundEntity.js';
import { LevelMap } from './maps/LevelMap.js';
import { InputHandler } from './input/InputHandler.js';
import { SteeringBehaviours } from './ai/steering/SteeringBehaviours.js';
import { DebugVisuals } from './debug/DebugVisuals.js';
import { CollisionAvoidSteering } from './ai/steering/CollisionAvoidSteering.js';
import { BulletEntity } from './entities/BulletEntity.js';


/**
 * World class holds all information about our game's world
 */
export class World {

  // Creates a world instance
  constructor() {
    this.scene = Setup.createScene();
    this.camera = Setup.createCamera();
    this.renderer = Setup.createRenderer();
    
    this.debug = new DebugVisuals(this.scene);

    this.clock = new THREE.Clock();

    this.inputHandler = new InputHandler(this.camera);

    this.entities = [];
    
    this.fireCooldown = 0.35; // seconds between shots
    this.fireTimer = 0;

  }

  // Initialize objects in our world
  init() {
    this.map = new LevelMap();
    
    Setup.createLight(this.scene);
    Setup.showHelpers(this.scene, this.camera, this.renderer, this.map);

    
    this.npc = new DynamicEntity({ 
      position: new THREE.Vector3(this.map.minX, 0, 0),
      velocity: new THREE.Vector3(10, 0, 0),
      color: 'darkorange',
    });
    this.addEntityToWorld(this.npc);

    //this.obstacle = new RoundEntity({
      //radius: 2,
    //});

    
    
    this.createObstacle(15);

    //this.addEntityToWorld(this.obstacle);

  }
  // create n round obstacles at random positions on the map, ensuring they don't overlap with each other or spawn too close to the edges of the map
  createObstacle(n) {
  const margin = 1.0;          // minimum space from map border
                              // so that no object goes out of the map 
  const MAX_TRIES = 200;

  for (let i = 0; i < n; i++) {

    const radius = Math.random() * 1.5 + 0.9;
    let placed = false;

    for (let tries = 0; tries < MAX_TRIES; tries++) {

      const x = Math.random() * (
        (this.map.maxX - this.map.minX) - 2 * (radius + margin)
      ) + this.map.minX + radius + margin;

      const z = Math.random() * (
        (this.map.maxZ - this.map.minZ) - 2 * (radius + margin)
      ) + this.map.minZ + radius + margin;

      const position = new THREE.Vector3(x, 0, z);

      //prevent overlap with existing round obstacles
      let overlap = false;
      for (let e of this.entities) {
        if (e instanceof RoundEntity) {
          const d = position.distanceTo(e.position);
          if (d < radius + e.radius + 0.5) {
            overlap = true;
            break;
          }
        }
      }

      if (!overlap) {
        const obstacle = new RoundEntity({
          radius,
          position,
          color: i % 2 === 0 ? 'red' : 'white',
        });

        this.addEntityToWorld(obstacle);
        placed = true;
        break;
      }
    }

    
  }
}



 
// DynamicEntity subclass that represents a simple NPC that wanders around and avoids obstacles using the whisker method
getNpcForward() {
  const v = this.npc.velocity.clone();
  if (v.lengthSq() < 1e-6) return new THREE.Vector3(1, 0, 0); 
  v.y = 0;
  return v.normalize();
}

// npc shoots a bullet in the direction it's currently moving, with a cooldown between shots
npcFire() {
  const dir = this.getNpcForward();

  // spawn slightly in front of npc so it doesn’t collide immediately
  const spawnPos = this.npc.position.clone().add(dir.clone().multiplyScalar(1.2));
  spawnPos.y = 0.3;

  const bullet = new BulletEntity({
    position: spawnPos,
    direction: dir,
    speed: 40,
    ttl: 2.0,
  });
   
  this.addEntityToWorld(bullet);
}


    
  // Add an entity to the world
  addEntityToWorld(entity) {
    this.scene.add(entity.mesh);
    this.entities.push(entity);
  }

  // Update our world
  update() {
    let dt = this.clock.getDelta();

    let steer = new THREE.Vector3();

    let wander = SteeringBehaviours.wander(this.npc, 5, 2, 0.3);
    steer.add(wander);

    let avoid = CollisionAvoidSteering.whiskerAvoid(this.npc, this.entities, 2, 2, this.debug);
    steer.add(avoid.steer);
    
    this.npc.applyForce(steer);
    
    //firing 
    this.fireTimer += dt;

    // Example: fire continuously
    if (this.fireTimer >= this.fireCooldown && avoid.collided === true) {
    this.fireTimer = 0;
    this.npcFire();
    }

    

    for (let e of this.entities) {
      if (e.update)
        e.update(dt, this.map);
    }

    // Remove dead entities
    for (let i = this.entities.length - 1; i >= 0; i--) {
  const e = this.entities[i];
  if (e.dead) {
    this.scene.remove(e.mesh);
    this.entities.splice(i, 1);
  }
}

  }

  // Render our world
  render() {
    this.renderer.render(this.scene, this.camera);
  }

}