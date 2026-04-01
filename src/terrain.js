/**
 * Procedurally generated terrain using layered Perlin noise (fBm).
 *
 * Exports:
 *   createTerrain(seed) → { mesh, getHeight, seaLevel }
 *   createWater(seaLevel) → THREE.Mesh
 */

import * as THREE from 'three';
import { createNoise } from './noise.js';

// World dimensions — large enough to feel infinite at walking speed.
const WORLD_SIZE = 600;   // units across
const SEGMENTS   = 200;   // vertex grid resolution (200×200)
const HEIGHT_SCALE = 20;  // max terrain amplitude in world units
export const SEA_LEVEL = -2.5;

/**
 * Build the height function that both the geometry and the camera use.
 * Domain-warped fBm produces natural, non-repetitive shapes.
 */
function makeHeightFn(noise) {
    return function getHeight(x, z) {
        // Normalise world coords to a ~2-unit noise space.
        const nx = x / WORLD_SIZE * 2.2;
        const nz = z / WORLD_SIZE * 2.2;

        // Domain warp — shift the sampling point by a second noise layer.
        // This breaks the grid-aligned look of plain fBm.
        const warpAmt = 0.28;
        const wx = noise.fbm(nx + 3.91, nz + 1.73, 4);
        const wz = noise.fbm(nx + 8.21, nz + 5.07, 4);

        // Primary terrain shape.
        const h = noise.fbm(nx + wx * warpAmt, nz + wz * warpAmt, 7, 0.52, 2.1);

        // Flatten near sea level so coastlines feel gentle.
        const raw = h * HEIGHT_SCALE;
        if (raw < 0) return raw * 0.4; // compress below sea → shallower water
        return raw;
    };
}

/**
 * Vertex colour based on height — reads as biome.
 */
function heightToColor(h, detailNoise) {
    const d = detailNoise * 0.06; // subtle per-vertex variation

    if (h < SEA_LEVEL + 0.6) {
        // Sandy beach / shore
        return [0.74 + d, 0.68 + d, 0.48 + d];
    } else if (h < 2.5) {
        // Lowland grass
        return [0.26 + d, 0.54 + d * 2, 0.17 + d];
    } else if (h < 7) {
        // Mid-elevation — slightly drier grass / scrub
        return [0.34 + d, 0.50 + d, 0.22 + d];
    } else if (h < 12) {
        // Rocky hillside
        return [0.48 + d, 0.43 + d, 0.34 + d];
    } else {
        // Snow cap
        return [0.87 + d, 0.90 + d, 0.93 + d];
    }
}

/**
 * Creates the terrain mesh.
 * @param {number} [seed=42]
 * @returns {{ mesh: THREE.Mesh, getHeight: (x:number, z:number)=>number, seaLevel: number }}
 */
export function createTerrain(seed = 42) {
    const noise     = createNoise(seed);
    const detNoise  = createNoise(seed + 31); // separate seed for detail colour
    const getHeight = makeHeightFn(noise);

    // Build PlaneGeometry and rotate it flat (XZ plane).
    const geometry = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, SEGMENTS, SEGMENTS);
    geometry.rotateX(-Math.PI / 2);

    const pos    = geometry.attributes.position;
    const colorData = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const h = getHeight(x, z);
        pos.setY(i, h);

        // Per-vertex colour
        const dn = detNoise.noise2d(x / 20, z / 20);
        const [r, g, b] = heightToColor(h, dn);
        colorData[i * 3]     = Math.max(0, Math.min(1, r));
        colorData[i * 3 + 1] = Math.max(0, Math.min(1, g));
        colorData[i * 3 + 2] = Math.max(0, Math.min(1, b));
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colorData, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshLambertMaterial({ vertexColors: true });
    const mesh     = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.name = 'terrain';

    return { mesh, getHeight, seaLevel: SEA_LEVEL };
}

/**
 * Flat water plane sitting at sea level.
 * @param {number} [level=SEA_LEVEL]
 * @returns {THREE.Mesh}
 */
export function createWater(level = SEA_LEVEL) {
    const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 1, 1);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshLambertMaterial({
        color:       0x2277bb,
        transparent: true,
        opacity:     0.78,
    });

    const mesh    = new THREE.Mesh(geo, mat);
    mesh.position.y = level;
    mesh.name = 'water';
    return mesh;
}
