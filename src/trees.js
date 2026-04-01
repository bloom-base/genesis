/**
 * Instanced tree placement scattered across the terrain.
 *
 * Uses a seeded LCG for reproducible positions and noise-based density
 * so trees cluster naturally into forests rather than distributing uniformly.
 *
 * Export:
 *   createTrees(seed, getHeight, seaLevel) → THREE.InstancedMesh[]
 */

import * as THREE from 'three';
import { createNoise } from './noise.js';

const MAX_TREES  = 1200;
const SPREAD     = 270;  // trees placed within ±SPREAD units of origin

/**
 * Seeded LCG — returns a closure that produces [0, 1) values.
 */
function makeLCG(seed) {
    let s = (seed * 1664525 + 1013904223) >>> 0;
    return function rand() {
        s = (Math.imul(s, 1664525) + 1013904223) | 0;
        return (s >>> 0) / 0xffffffff;
    };
}

/**
 * Build a list of tree transforms that look natural.
 */
function samplePositions(seed, getHeight, seaLevel) {
    const rand    = makeLCG(seed);
    const density = createNoise(seed + 13); // controls forest clustering
    const results = [];

    for (let attempt = 0; attempt < MAX_TREES * 6 && results.length < MAX_TREES; attempt++) {
        const x = (rand() - 0.5) * SPREAD * 2;
        const z = (rand() - 0.5) * SPREAD * 2;
        const h = getHeight(x, z);

        // No trees in water or above the snowline.
        if (h < seaLevel + 0.8 || h > 10.5) continue;

        // Reject sparse areas — fBm drives forest vs open-meadow distribution.
        const d = density.fbm(x / 90, z / 90, 3);
        if (d < -0.05) continue;

        const scale    = 0.65 + rand() * 1.0;
        const rotation = rand() * Math.PI * 2;
        results.push({ x, y: h, z, scale, rotation });
    }

    return results;
}

/**
 * Returns an array of InstancedMesh objects (trunks + two foliage layers).
 * All are ready to add directly to the scene.
 *
 * @param {number} seed
 * @param {(x:number, z:number) => number} getHeight
 * @param {number} seaLevel
 * @returns {THREE.InstancedMesh[]}
 */
export function createTrees(seed, getHeight, seaLevel) {
    const positions = samplePositions(seed, getHeight, seaLevel);
    const count     = positions.length;
    if (count === 0) return [];

    // ── Geometries ──────────────────────────────────────────────────────────
    // Trunk — tapered cylinder, pivoted at base.
    const trunkGeo = new THREE.CylinderGeometry(0.07, 0.14, 2.0, 6, 1);
    trunkGeo.translate(0, 1.0, 0);

    // Lower foliage cone — wider, starts near the trunk top.
    const cone1Geo = new THREE.ConeGeometry(1.6, 3.2, 8, 1);
    cone1Geo.translate(0, 3.4, 0);

    // Upper foliage cone — narrower, gives the tree a classic fir shape.
    const cone2Geo = new THREE.ConeGeometry(1.1, 2.4, 8, 1);
    cone2Geo.translate(0, 5.0, 0);

    // ── Materials ───────────────────────────────────────────────────────────
    const trunkMat  = new THREE.MeshLambertMaterial({ color: 0x5a3820 });
    const foliage1  = new THREE.MeshLambertMaterial({ color: 0x2d5f25 });
    const foliage2  = new THREE.MeshLambertMaterial({ color: 0x3a7830 });

    // ── Instanced meshes ────────────────────────────────────────────────────
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    const cones1 = new THREE.InstancedMesh(cone1Geo, foliage1, count);
    const cones2 = new THREE.InstancedMesh(cone2Geo, foliage2, count);

    trunks.castShadow = true;
    cones1.castShadow = true;
    cones2.castShadow = true;
    trunks.receiveShadow = false;
    cones1.receiveShadow = false;
    cones2.receiveShadow = false;

    // ── Apply transforms ────────────────────────────────────────────────────
    const mat  = new THREE.Matrix4();
    const pos  = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl  = new THREE.Vector3();
    const yAxis = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < count; i++) {
        const { x, y, z, scale, rotation } = positions[i];
        pos.set(x, y, z);
        quat.setFromAxisAngle(yAxis, rotation);
        scl.setScalar(scale);
        mat.compose(pos, quat, scl);

        trunks.setMatrixAt(i, mat);
        cones1.setMatrixAt(i, mat);
        cones2.setMatrixAt(i, mat);
    }

    trunks.instanceMatrix.needsUpdate = true;
    cones1.instanceMatrix.needsUpdate = true;
    cones2.instanceMatrix.needsUpdate = true;

    trunks.name = 'tree-trunks';
    cones1.name = 'tree-foliage-lower';
    cones2.name = 'tree-foliage-upper';

    return [trunks, cones1, cones2];
}
