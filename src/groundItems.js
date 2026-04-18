/**
 * Genesis — Ground Items system.
 *
 * Spawns collectible items in the 3D world as glowing, hovering pickups.
 * When the player walks close enough, items are auto-collected into
 * inventory with visual (particle flash) and audio (whoosh) feedback.
 */

import * as THREE from 'three';
import { ITEMS, getItem } from './items.js';

// ── Config ──────────────────────────────────────────────────────────────────
const PICKUP_RADIUS      = 2.8;   // units — how close player must be
const HOVER_HEIGHT       = 0.55;  // units above ground
const HOVER_AMPLITUDE    = 0.15;  // bobbing amplitude
const HOVER_SPEED        = 2.2;   // bobbing frequency
const SPIN_SPEED         = 1.4;   // radians/sec
const GLOW_RADIUS        = 3.5;   // point light radius
const GLOW_INTENSITY     = 0.8;

// Particle / flash config
const PARTICLE_COUNT     = 12;
const PARTICLE_SPEED     = 3.5;
const PARTICLE_LIFETIME  = 0.45;  // seconds
const FLASH_DURATION     = 0.25;  // seconds

// Respawn config
const RESPAWN_INTERVAL   = 30;    // seconds between respawn checks
const MAX_GROUND_ITEMS   = 20;    // cap on simultaneous ground items

// ── Rarity colours ──────────────────────────────────────────────────────────
const RARITY_COLORS = {
    common:    0xbbbbbb,
    uncommon:  0x1eff00,
    rare:      0x0070dd,
    epic:      0xa335ee,
    legendary: 0xff8000,
};

// Items that can spawn in the world — subset of the catalog weighted by rarity
const SPAWN_TABLE = [
    { id: 'wood',          weight: 20, count: [2, 6] },
    { id: 'stone',         weight: 18, count: [1, 4] },
    { id: 'iron_ore',      weight: 12, count: [1, 3] },
    { id: 'mushroom',      weight: 14, count: [1, 3] },
    { id: 'bread',         weight: 8,  count: [1, 2] },
    { id: 'health_potion', weight: 8,  count: [1, 2] },
    { id: 'mana_potion',   weight: 6,  count: [1, 2] },
    { id: 'torch',         weight: 6,  count: [1, 3] },
    { id: 'crystal',       weight: 3,  count: [1, 1] },
    { id: 'moonstone',     weight: 1,  count: [1, 1] },
    { id: 'stardust',      weight: 0.5, count: [1, 1] },
    { id: 'map_fragment',  weight: 2,  count: [1, 1] },
];

const totalWeight = SPAWN_TABLE.reduce((s, e) => s + e.weight, 0);

function pickRandomSpawn() {
    let r = Math.random() * totalWeight;
    for (const entry of SPAWN_TABLE) {
        r -= entry.weight;
        if (r <= 0) {
            const [lo, hi] = entry.count;
            const count = lo + Math.floor(Math.random() * (hi - lo + 1));
            return { id: entry.id, count };
        }
    }
    return { id: 'wood', count: 1 };
}

// ── Helper: create text sprite for item icon ─────────────────────────────────
function createIconSprite(icon, rarity) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const cx = canvas.getContext('2d');
    cx.font = '42px serif';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(icon, 32, 34);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthTest: true,
        depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.8, 0.8, 1);
    return sprite;
}

// ── Create the ground-items system ──────────────────────────────────────────

/**
 * @param {THREE.Scene} scene
 * @param {Function} getHeight  (x,z) → terrain height
 * @param {number} seaLevel
 * @param {object} invSystem    inventory system (addItem)
 * @param {object} callbacks    { playPickupSound, showPickupToast }
 */
export function createGroundItemSystem(scene, getHeight, seaLevel, invSystem, callbacks) {
    /** @type {Array<{ group: THREE.Group, itemId: string, count: number, groundY: number, age: number, collected: boolean }>} */
    const items = [];

    /** Active collection effects (particles + flash) */
    const effects = [];

    let respawnTimer = 5; // start spawning after 5 seconds

    // ── Spawn a single ground item at a position ────────────────────────────
    function spawnItem(x, z) {
        const groundY = getHeight(x, z);
        // Don't spawn underwater or on very steep/high terrain
        if (groundY < seaLevel + 0.5 || groundY > 14) return null;

        const { id, count } = pickRandomSpawn();
        const def = getItem(id);
        if (!def) return null;

        const color = RARITY_COLORS[def.rarity] || 0xbbbbbb;

        // Group: holds the sprite + glow light
        const group = new THREE.Group();
        group.position.set(x, groundY + HOVER_HEIGHT, z);

        // Icon sprite
        const sprite = createIconSprite(def.icon, def.rarity);
        group.add(sprite);

        // Glow light
        const light = new THREE.PointLight(color, GLOW_INTENSITY, GLOW_RADIUS);
        light.position.set(0, 0.2, 0);
        group.add(light);

        // Small glowing ring on the ground as a visual indicator
        const ringGeo = new THREE.RingGeometry(0.25, 0.4, 16);
        const ringMat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -(HOVER_HEIGHT - 0.02); // sit on ground
        group.add(ring);

        scene.add(group);

        const entry = {
            group,
            itemId: id,
            count,
            groundY,
            age: 0,
            collected: false,
            light,
            ring,
            ringMat,
        };
        items.push(entry);
        return entry;
    }

    // ── Initial spawning ────────────────────────────────────────────────────
    function spawnInitialItems() {
        const count = 12 + Math.floor(Math.random() * 6); // 12–17 items
        let spawned = 0;
        let attempts = 0;
        while (spawned < count && attempts < 200) {
            attempts++;
            const x = (Math.random() - 0.5) * 500;
            const z = (Math.random() - 0.5) * 500;
            if (spawnItem(x, z)) spawned++;
        }
    }

    // ── Collection particle effect ──────────────────────────────────────────
    function spawnCollectionEffect(position, color) {
        const particles = [];
        const geo = new THREE.SphereGeometry(0.04, 4, 4);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const mat = new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 1,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(position);

            // Random direction
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 0.6 + Math.PI * 0.2; // mostly upward
            const speed = PARTICLE_SPEED * (0.6 + Math.random() * 0.8);
            const vel = new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta) * speed,
                Math.cos(phi) * speed * 1.2, // bias upward
                Math.sin(phi) * Math.sin(theta) * speed,
            );

            scene.add(mesh);
            particles.push({ mesh, mat, vel });
        }

        // Flash light
        const flash = new THREE.PointLight(color, 3, 6);
        flash.position.copy(position);
        scene.add(flash);

        effects.push({
            particles,
            flash,
            age: 0,
            lifetime: PARTICLE_LIFETIME,
        });
    }

    // ── Update (called every frame) ─────────────────────────────────────────
    function update(delta, playerPosition) {
        // Update hovering items
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            if (item.collected) continue;

            item.age += delta;

            // Bobbing & spinning
            const bob = Math.sin(item.age * HOVER_SPEED) * HOVER_AMPLITUDE;
            item.group.position.y = item.groundY + HOVER_HEIGHT + bob;
            item.group.children[0].material.rotation += SPIN_SPEED * delta;

            // Pulsate glow
            const pulse = 0.6 + Math.sin(item.age * 3) * 0.4;
            item.light.intensity = GLOW_INTENSITY * pulse;
            item.ringMat.opacity = 0.25 + pulse * 0.2;

            // ── Proximity pickup check ──────────────────────────────────────
            const dx = playerPosition.x - item.group.position.x;
            const dz = playerPosition.z - item.group.position.z;
            const distSq = dx * dx + dz * dz;

            if (distSq < PICKUP_RADIUS * PICKUP_RADIUS) {
                collectItem(item);
            }
        }

        // Update effects (particles + flashes)
        for (let i = effects.length - 1; i >= 0; i--) {
            const effect = effects[i];
            effect.age += delta;

            const t = effect.age / effect.lifetime; // 0→1

            if (t >= 1) {
                // Cleanup
                for (const p of effect.particles) {
                    scene.remove(p.mesh);
                    p.mesh.geometry.dispose();
                    p.mat.dispose();
                }
                scene.remove(effect.flash);
                effects.splice(i, 1);
                continue;
            }

            // Animate particles
            for (const p of effect.particles) {
                p.mesh.position.addScaledVector(p.vel, delta);
                p.vel.y -= 6 * delta; // gravity
                p.mat.opacity = 1 - t;
                const s = 1 - t * 0.6;
                p.mesh.scale.setScalar(s);
            }

            // Fade flash
            effect.flash.intensity = 3 * (1 - t);
        }

        // Respawn timer
        respawnTimer -= delta;
        if (respawnTimer <= 0) {
            respawnTimer = RESPAWN_INTERVAL;
            // Respawn items if below max
            const active = items.filter(i => !i.collected).length;
            if (active < MAX_GROUND_ITEMS) {
                const toSpawn = Math.min(3, MAX_GROUND_ITEMS - active);
                for (let j = 0; j < toSpawn; j++) {
                    // Spawn within a range around the player but not too close
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 30 + Math.random() * 80; // 30–110 units from player
                    const x = playerPosition.x + Math.cos(angle) * dist;
                    const z = playerPosition.z + Math.sin(angle) * dist;
                    // Clamp to world boundary
                    const cx = Math.max(-270, Math.min(270, x));
                    const cz = Math.max(-270, Math.min(270, z));
                    spawnItem(cx, cz);
                }
            }

            // Cleanup old collected entries
            for (let i = items.length - 1; i >= 0; i--) {
                if (items[i].collected) items.splice(i, 1);
            }
        }
    }

    // ── Collect an item ─────────────────────────────────────────────────────
    function collectItem(item) {
        if (item.collected) return;
        item.collected = true;

        const def = getItem(item.itemId);
        const color = RARITY_COLORS[def?.rarity] || 0xbbbbbb;

        // Add to inventory
        const leftover = invSystem.addItem(item.itemId, item.count);

        // Only show feedback if at least some was picked up
        if (leftover < item.count) {
            const collected = item.count - leftover;
            // Spawn visual effect at the item's position
            spawnCollectionEffect(item.group.position.clone(), color);

            // Audio feedback
            if (callbacks.playPickupSound) {
                callbacks.playPickupSound();
            }

            // Toast notification
            if (callbacks.showPickupToast) {
                callbacks.showPickupToast(def, collected);
            }
        }

        // Remove from scene
        scene.remove(item.group);
        // Dispose geometries & materials
        item.group.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (child.material.map) child.material.map.dispose();
                child.material.dispose();
            }
        });
    }

    // Spawn initial set
    spawnInitialItems();

    return { update };
}
