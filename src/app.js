/**
 * Genesis — first-person world entry point.
 *
 * Sets up Three.js renderer, sky, lighting, terrain, trees,
 * PointerLock first-person controls, and the game loop.
 */

import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { createTerrain, createWater } from './terrain.js';
import { createTrees } from './trees.js';

// ── Visitor counter ──────────────────────────────────────────────────────────
(function initVisitCounter() {
    const KEY   = 'genesis_visit_count';
    const count = (parseInt(localStorage.getItem(KEY) || '0', 10) || 0) + 1;
    localStorage.setItem(KEY, String(count));
    const el = document.getElementById('visit-counter');
    if (el) el.textContent = `Visits: ${count}`;
})();

// ── Renderer ─────────────────────────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.45;
renderer.outputColorSpace  = THREE.SRGBColorSpace;

// ── Scene ─────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
// Exponential fog gives a natural distance fade that matches the sky.
scene.fog = new THREE.FogExp2(0x9bbdd6, 0.003);

// ── Camera ────────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(
    72,                                          // fov
    window.innerWidth / window.innerHeight,      // aspect
    0.15,                                        // near
    1200                                         // far
);
scene.add(camera);

// ── Procedural Sky ────────────────────────────────────────────────────────────
const sky = new Sky();
sky.scale.setScalar(10000);
scene.add(sky);

// Sun position — early-afternoon angle for nice directional shadows.
const SUN_ELEVATION_DEG = 28;   // degrees above horizon
const SUN_AZIMUTH_DEG   = 195;  // compass bearing

const sunDir = new THREE.Vector3();
sunDir.setFromSphericalCoords(
    1,
    THREE.MathUtils.degToRad(90 - SUN_ELEVATION_DEG),
    THREE.MathUtils.degToRad(SUN_AZIMUTH_DEG)
);

const skyU = sky.material.uniforms;
skyU['turbidity'].value        = 7;
skyU['rayleigh'].value         = 1.8;
skyU['mieCoefficient'].value   = 0.004;
skyU['mieDirectionalG'].value  = 0.82;
skyU['sunPosition'].value.copy(sunDir);

// ── Lighting ──────────────────────────────────────────────────────────────────
// Directional sunlight with shadows.
const sunLight = new THREE.DirectionalLight(0xfff3d6, 2.2);
sunLight.position.copy(sunDir).multiplyScalar(400);
sunLight.castShadow = true;

const sc = sunLight.shadow.camera;
sc.near   = 1;
sc.far    = 800;
sc.left   = -220;
sc.right  =  220;
sc.top    =  220;
sc.bottom = -220;

sunLight.shadow.mapSize.width  = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.bias           = -0.0008;
scene.add(sunLight);

// Hemisphere light — sky colour from above, earth bounce from below.
const hemiLight = new THREE.HemisphereLight(0x9bbdd6, 0x4a7a30, 0.9);
scene.add(hemiLight);

// Soft fill ambient so shadowed areas aren't pitch black.
const ambientLight = new THREE.AmbientLight(0x405870, 0.55);
scene.add(ambientLight);

// ── World ─────────────────────────────────────────────────────────────────────
const SEED = 42;  // Change to get a different world — all generation is deterministic.

const { mesh: terrainMesh, getHeight, seaLevel } = createTerrain(SEED);
scene.add(terrainMesh);

const water = createWater(seaLevel);
scene.add(water);

const treeMeshes = createTrees(SEED, getHeight, seaLevel);
treeMeshes.forEach(m => scene.add(m));

// ── Player / Controls ─────────────────────────────────────────────────────────
const PLAYER_EYE_HEIGHT = 1.72; // metres above ground
const WALK_SPEED        = 9;    // units/second
const SPRINT_SPEED      = 22;   // units/second (Shift held)
const WORLD_BOUNDARY    = 275;  // stay within ±275 units

const controls = new PointerLockControls(camera, document.body);

// Find a pleasant starting position — search a small grid for a spot above sea level.
const startPos = findStartPosition(getHeight, seaLevel);
camera.position.set(startPos.x, startPos.y, startPos.z);

function findStartPosition(getHeight, seaLevel) {
    // Try offsets from origin until we land above water.
    const candidates = [
        [0, 0], [20, 10], [-15, 25], [30, -10], [10, 40],
    ];
    for (const [x, z] of candidates) {
        const h = getHeight(x, z);
        if (h > seaLevel + 1) {
            return { x, y: h + PLAYER_EYE_HEIGHT, z };
        }
    }
    return { x: 0, y: 5 + PLAYER_EYE_HEIGHT, z: 0 };
}

// ── UI state ──────────────────────────────────────────────────────────────────
const overlay     = document.getElementById('overlay');
const titleScreen = document.getElementById('title-screen');
const pausedLabel = document.getElementById('paused-label');
const hud         = document.getElementById('hud');
const enterBtn    = document.getElementById('enter-btn');

let inWorld = false; // true once the player has entered for the first time

function enterWorld() {
    controls.lock();
}

enterBtn.addEventListener('click', enterWorld);
// Also clicking directly on a paused overlay resumes.
overlay.addEventListener('click', (e) => {
    if (e.target === overlay && inWorld) enterWorld();
});

controls.addEventListener('lock', () => {
    inWorld = true;
    overlay.style.display = 'none';
    hud.style.display = 'block';
});

controls.addEventListener('unlock', () => {
    overlay.style.display = 'flex';
    hud.style.display = 'none';

    if (inWorld) {
        // Show "paused" rather than the full title screen.
        titleScreen.style.display = 'none';
        pausedLabel.style.display = 'block';
        overlay.classList.add('paused');
    }
});

// ── Keyboard input ────────────────────────────────────────────────────────────
const keys = new Set();
document.addEventListener('keydown', (e) => {
    keys.add(e.code);
    // Prevent browser scroll / default on game keys while playing.
    if (controls.isLocked && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.key)) {
        e.preventDefault();
    }
});
document.addEventListener('keyup', (e) => keys.delete(e.code));

// ── Movement helpers ──────────────────────────────────────────────────────────
const moveDir = new THREE.Vector3();

function applyMovement(delta) {
    const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const speed  = sprint ? SPRINT_SPEED : WALK_SPEED;

    moveDir.set(0, 0, 0);
    if (keys.has('KeyW') || keys.has('ArrowUp'))    moveDir.z -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown'))  moveDir.z += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft'))  moveDir.x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) moveDir.x += 1;

    if (moveDir.lengthSq() > 0) {
        moveDir.normalize();
        controls.moveForward(-moveDir.z * speed * delta);
        controls.moveRight(moveDir.x * speed * delta);
    }

    // Clamp to world boundary — keeps the player from walking off terrain edge.
    const p = camera.position;
    p.x = THREE.MathUtils.clamp(p.x, -WORLD_BOUNDARY, WORLD_BOUNDARY);
    p.z = THREE.MathUtils.clamp(p.z, -WORLD_BOUNDARY, WORLD_BOUNDARY);

    // Smoothly follow terrain height — camera glides over hills.
    const groundY  = Math.max(getHeight(p.x, p.z), seaLevel);
    const targetY  = groundY + PLAYER_EYE_HEIGHT;
    p.y += (targetY - p.y) * Math.min(1, 12 * delta); // spring constant
}

// ── Resize ────────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Water animation ───────────────────────────────────────────────────────────
const waterMat = water.material;

// ── Game loop ─────────────────────────────────────────────────────────────────
let prevTime = performance.now();

(function animate() {
    requestAnimationFrame(animate);

    const now   = performance.now();
    const delta = Math.min((now - prevTime) / 1000, 0.1); // cap at 100 ms
    prevTime = now;

    if (controls.isLocked) {
        applyMovement(delta);
    }

    // Gentle water shimmer — oscillate opacity to mimic light on water.
    waterMat.opacity = 0.72 + Math.sin(now * 0.0009) * 0.04;

    renderer.render(scene, camera);
}());
