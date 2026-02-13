import * as THREE from "three";
import { DynamicEntity } from "./DynamicEntity.js";

export class BulletEntity extends DynamicEntity {
  constructor({
    position = new THREE.Vector3(),
    direction = new THREE.Vector3(1, 0, 0),
    speed = 35,
    radius = 0.15,
    ttl = 2.0,
    color = "yellow",
  } = {}) {

    const geom = new THREE.SphereGeometry(radius, 12, 12);
    const mat = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geom, mat);

    mesh.position.copy(position);

    super({
      mesh,
      position: mesh.position,
      velocity: direction.clone().normalize().multiplyScalar(speed),
      friction: 1.0,
      topSpeed: speed,
      maxForce: 0,
    });

    this.radius = radius;
    this.ttl = ttl;
    this.age = 0;
    this.isBullet = true;
  }

  applyForce(force) {
    // Do nothing — bullets don't steer
  }

  update(dt, map) {

    this.age += dt;
    if (this.age >= this.ttl) {
      this.dead = true;
      return;
    }

    // Move straight (no acceleration physics)
    this.position.addScaledVector(this.velocity, dt);

    this.mesh.position.copy(this.position);

    // Kill if outside map
    if (
      this.position.x < map.minX || this.position.x > map.maxX ||
      this.position.z < map.minZ || this.position.z > map.maxZ
    ) {
      this.dead = true;
    }
  }
}
