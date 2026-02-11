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
  }

  // Initialize objects in our world
  init() {
    this.map = new LevelMap();
    
    Setup.createLight(this.scene);
    Setup.showHelpers(this.scene, this.camera, this.renderer, this.map);

    
    this.npc = new DynamicEntity({ 
      position: new THREE.Vector3(this.map.minX, 0, 0),
      velocity: new THREE.Vector3(10, 0, 0),
      color: 'blue'
    });
    this.addEntityToWorld(this.npc);

    //this.obstacle = new RoundEntity({
      //radius: 2,
    //});

    
    
    this.createObstacle(15);

    //this.addEntityToWorld(this.obstacle);

  }
  // create obstacle
  createObstacle(n) {
  const margin = 1.0;          // minimum space from map border
  const MAX_TRIES = 200;

  for (let i = 0; i < n; i++) {

    const radius = Math.random() * 2 + 0.5;
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
          color: i % 2 === 0 ? 'red' : 'purple',
        });

        this.addEntityToWorld(obstacle);
        placed = true;
        break;
      }
    }

    
  }
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
    steer.add(avoid);
    
    this.npc.applyForce(steer);


    for (let e of this.entities) {
      if (e.update)
        e.update(dt, this.map);
    }
  }

  // Render our world
  render() {
    this.renderer.render(this.scene, this.camera);
  }

}