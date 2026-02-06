import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export class DebugVisuals {

  constructor(scene) {
    this.scene = scene;
    this.enabled = true;

    this.colors = [ 'red', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink' ];
    this.debugObjects =  new Map();
  }

  // Create a debug sphere
  createSphere(key, pos, color, size = 1) {
    let geometry = new THREE.SphereGeometry(size/2);
    let material = new THREE.MeshStandardMaterial({ color: color });
    let mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(pos);
    mesh.position.y = 0.5;
    mesh.visible = true;
    this.debugObjects.set(key, mesh);
    this.scene.add(mesh);
  }

  // Create a debug line
  createLine(key, start, end, color) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      start.clone(),
      end.clone()
    ]);

    const material = new THREE.LineBasicMaterial({ color: color });
    let mesh = new THREE.Line(geometry, material);
    this.debugObjects.set(key, mesh);
    this.scene.add(mesh);
  }

  // Show a line with reference key at given start and end
  showLine(key, start, end, color = 0x00000) {
    // if does not exist, create it
    // update its position
    let obj = this.debugObjects.get(key);
    if (!obj) {
      this.createLine(key, start, end, color);
      return;
    }
    let positions = obj.geometry.attributes.position.array;

    // start point
    positions[0] = start.x;
    positions[1] = 0.5;
    positions[2] = start.z;

    // end point
    positions[3] = end.x;
    positions[4] = 0.5;
    positions[5] = end.z;

    obj.material.color.set(color);
    obj.geometry.attributes.position.needsUpdate = true;
    obj.visible = true;
  }

  // Show a sphere with reference key at given position
  showSphere(key, pos) {
    // if does not exist, create it
    // update its position
    let obj = this.debugObjects.get(key);
    if (!obj) {
      let color = this.colors[this.debugObjects.size%this.colors.length];
      this.createSphere(key, pos, color);
      return;
    }
    obj.position.copy(pos);
    obj.position.y = 0.5;
    obj.visible = true;
  }
  
  // Hide object with key
  hide(key) {
    let obj = this.debugObjects.get(key);
    if (obj) obj.visible = false;
  }

  // Hide multiple objects (list of keys)
  hideObjs(keys) {
    for (let key of keys) {
      this.hide(key);
    }
  }

}