import * as THREE from 'three';

console.log("--- TESTING DYNAMIC EXTENDING LASER BEAM MATH ---");
const origin = new THREE.Vector3(0.15, 1.45, 0.2);
const target = new THREE.Vector3(12.5, 0.9, -15.4);
const toTarget = new THREE.Vector3().subVectors(target, origin);
const beamLen = toTarget.length();
const beamDir = toTarget.clone().normalize();
const beamQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), beamDir);
const coreGeo = new THREE.CylinderGeometry(0.05, 0.07, beamLen, 16);
coreGeo.translate(0, beamLen / 2, 0);
const beamGroup = new THREE.Group();
beamGroup.position.copy(origin);
beamGroup.quaternion.copy(beamQuat);
const bodyGroup = new THREE.Group();
const mesh = new THREE.Mesh(coreGeo);
bodyGroup.add(mesh);
beamGroup.add(bodyGroup);
bodyGroup.scale.set(1, 0.2, 1);
beamGroup.updateMatrixWorld(true);
const tipLocal20 = new THREE.Vector3(0, beamLen, 0);
const tipWorld20 = tipLocal20.clone().applyMatrix4(mesh.matrixWorld);
const expected20 = new THREE.Vector3().copy(origin).addScaledVector(beamDir, beamLen * 0.2);
console.log("Distance difference at 20% surge:", tipWorld20.distanceTo(expected20));
if (tipWorld20.distanceTo(expected20) > 1e-3) {
  console.error("FAIL: 20% surge position incorrect");
  process.exit(1);
}
bodyGroup.scale.set(1, 1, 1);
beamGroup.updateMatrixWorld(true);
const tipWorld100 = tipLocal20.clone().applyMatrix4(mesh.matrixWorld);
console.log("Distance difference at 100% impact:", tipWorld100.distanceTo(target));
if (tipWorld100.distanceTo(target) > 1e-3) {
  console.error("FAIL: 100% impact position incorrect");
  process.exit(1);
}
console.log("PASS: Dynamic extending laser surge reaches target with 100% precision!");
