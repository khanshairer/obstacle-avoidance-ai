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

    this.obstacle = new RoundEntity({
      radius: 5,
    });
    this.addEntityToWorld(this.obstacle);

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

    let avoid = CollisionAvoidSteering.round(this.npc, this.obstacle, 2, 2, this.debug);
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