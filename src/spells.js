/**
 * Genesis — Spell casting system.
 *
 * Manages projectile creation, physics, trail rendering, collision detection,
 * and impact effects. Reads the active hotbar item to determine spell type.
 */

import * as THREE from 'three';
import { CATEGORIES } from './items.js';

// ── Spell configs (one per item id) ─────────────────────────────────────────

const SPELL_CONFIGS = {
    fireball: {
        color: 0xff4400,
        emissive: 0xff6600,
        speed: 28,
        radius: 0.22,
        gravity: 3.5,
        cooldown: 0.8,
        lightColor: 0xff6600,
        lightIntensity: 3,
        lightRange: 10,
    },
    frost_bolt: {
        color: 0x88ccff,
        emissive: 0x44aaff,
        speed: 38,
        radius: 0.14,
        gravity: 1.0,
        cooldown: 0.5,
        lightColor: 0x88ccff,
        lightIntensity: 2.5,
        lightRange: 7,
    },
    lightning: {
        color: 0xffffaa,
        emissive: 0xffff00,
        speed: 55,
        radius: 0.10,
        gravity: 0,
        cooldown: 1.5,
        lightColor: 0xffff88,
        lightIntensity: 4,
        lightRange: 12,
    },
    nature_call: {
        color: 0x88ff44,
        emissive: 0x44ff00,
        speed: 22,
        radius: 0.20,
        gravity: 4.0,
        cooldown: 1.0,
        lightColor: 0x88ff44,
        lightIntensity: 2,
        lightRange: 7,
    },
    void_rift: {
        color: 0xaa44ff,
        emissive: 0x8800ff,
        speed: 32,
        radius: 0.28,
        gravity: 0.5,
        cooldown: 2.0,
        lightColor: 0xaa44ff,
        lightIntensity: 5,
        lightRange: 14,
    },
};

const TRAIL_LENGTH    = 20;   // number of trail position samples
const MAX_AGE         = 12;   // seconds before a projectile auto-expires
const WORLD_LIMIT     = 282;  // remove projectile outside world bounds

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * @param {THREE.Scene}    scene
 * @param {THREE.Camera}   camera
 * @param {Function}       getHeight   terrain height sampler
 * @param {number}         seaLevel
 * @param {object}         invSystem   inventory system (getSelectedItem)
 */
export function createSpellSystem(scene, camera, getHeight, seaLevel, invSystem) {
    const projectiles      = [];
    const activeImpacts    = [];
    const cooldowns        = {};     // spellId → seconds remaining
    const raycaster        = new THREE.Raycaster();
    let   collisionTargets = [];

    // Shared reusable vectors to avoid per-frame allocation
    const _moveVec = new THREE.Vector3();
    const _prevPos = new THREE.Vector3();

    // ── Public: set meshes to test projectile collision against ──────────────
    function setCollisionTargets(meshes) {
        collisionTargets = meshes;
    }

    // ── Cooldown helpers ─────────────────────────────────────────────────────
    function isOnCooldown(spellId) {
        return (cooldowns[spellId] || 0) > 0;
    }

    /** 0 = ready, 1 = fully cooling down */
    function getCooldownFraction(spellId) {
        const cfg = SPELL_CONFIGS[spellId];
        if (!cfg || !cooldowns[spellId]) return 0;
        return Math.min(1, cooldowns[spellId] / cfg.cooldown);
    }

    // ── Cast ─────────────────────────────────────────────────────────────────
    /**
     * Fire the currently selected spell. Returns true if a projectile was spawned.
     */
    function cast() {
        const item = invSystem.getSelectedItem();
        if (!item || item.category !== CATEGORIES.SPELL) return false;

        const spellId = item.id;
        const cfg     = SPELL_CONFIGS[spellId];
        if (!cfg)               return false;
        if (isOnCooldown(spellId)) return false;

        cooldowns[spellId] = cfg.cooldown;

        // Direction the player is looking
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);

        // Spawn slightly in front of the camera (avoids self-intersection)
        const startPos = camera.position.clone().addScaledVector(dir, 0.6);

        // ── Projectile sphere ────────────────────────────────────────────────
        const geo = new THREE.SphereGeometry(cfg.radius, 10, 10);
        const mat = new THREE.MeshStandardMaterial({
            color:             cfg.color,
            emissive:          cfg.emissive,
            emissiveIntensity: 2.5,
            roughness:         0.15,
            metalness:         0.0,
            transparent:       false,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(startPos);
        mesh.castShadow = false;
        scene.add(mesh);

        // ── Point light for glow ─────────────────────────────────────────────
        const light = new THREE.PointLight(cfg.lightColor, cfg.lightIntensity, cfg.lightRange);
        light.position.copy(startPos);
        scene.add(light);

        // ── Trail line ───────────────────────────────────────────────────────
        // Circular-buffer of positions: trailPositions[0] = head (newest).
        const trailPositions = new Float32Array(TRAIL_LENGTH * 3);
        for (let i = 0; i < TRAIL_LENGTH; i++) {
            trailPositions[i * 3]     = startPos.x;
            trailPositions[i * 3 + 1] = startPos.y;
            trailPositions[i * 3 + 2] = startPos.z;
        }
        const trailGeo = new THREE.BufferGeometry();
        trailGeo.setAttribute(
            'position',
            new THREE.BufferAttribute(trailPositions, 3),
        );
        const trailMat = new THREE.LineBasicMaterial({
            color:       cfg.lightColor,
            transparent: true,
            opacity:     0.55,
        });
        const trail = new THREE.Line(trailGeo, trailMat);
        scene.add(trail);

        projectiles.push({
            mesh,
            light,
            trail,
            trailPositions,
            velocity: dir.clone().multiplyScalar(cfg.speed),
            config:   cfg,
            spellId,
            age:      0,
            prevPos:  startPos.clone(),
        });

        return true;
    }

    // ── Impact effect ─────────────────────────────────────────────────────────
    function spawnImpact(position, cfg) {
        // Big flash
        const flash = new THREE.PointLight(cfg.lightColor, cfg.lightIntensity * 8, cfg.lightRange * 4);
        flash.position.copy(position);
        scene.add(flash);

        // Debris spheres
        const debrisGeo = new THREE.SphereGeometry(cfg.radius * 0.3, 6, 6);
        const debrisMat = new THREE.MeshStandardMaterial({
            color:             cfg.color,
            emissive:          cfg.emissive,
            emissiveIntensity: 3.0,
            transparent:       true,
        });
        const DEBRIS_COUNT = 7;
        const debris = [];
        for (let i = 0; i < DEBRIS_COUNT; i++) {
            const p   = new THREE.Mesh(debrisGeo, debrisMat);
            p.position.copy(position);
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 12,
                Math.random() * 8 + 2,
                (Math.random() - 0.5) * 12,
            );
            scene.add(p);
            debris.push({ mesh: p, vel });
        }

        const DURATION = 0.85;
        let elapsed = 0;

        // Returns false when fully done (caller removes it from activeImpacts)
        function tick(delta) {
            elapsed += delta;
            const t = Math.min(elapsed / DURATION, 1);

            flash.intensity = cfg.lightIntensity * 8 * (1 - t);

            for (const d of debris) {
                d.vel.y -= 14 * delta;
                d.mesh.position.addScaledVector(d.vel, delta);
                d.mesh.material.opacity = 1 - t;
            }

            if (t >= 1) {
                scene.remove(flash);
                for (const d of debris) {
                    scene.remove(d.mesh);
                    d.mesh.geometry.dispose();
                }
                debrisMat.dispose();
                return false;
            }
            return true;
        }

        return tick;
    }

    // ── Projectile cleanup ────────────────────────────────────────────────────
    function destroyProjectile(proj, hitPos) {
        scene.remove(proj.mesh);
        scene.remove(proj.light);
        scene.remove(proj.trail);
        proj.mesh.geometry.dispose();
        proj.mesh.material.dispose();
        proj.trail.geometry.dispose();
        proj.trail.material.dispose();

        if (hitPos) {
            activeImpacts.push(spawnImpact(hitPos, proj.config));
        }
    }

    // ── Update (called every frame) ───────────────────────────────────────────
    function update(delta) {
        // Tick cooldowns
        for (const id of Object.keys(cooldowns)) {
            if (cooldowns[id] > 0) cooldowns[id] = Math.max(0, cooldowns[id] - delta);
        }

        // Tick impact animations
        for (let i = activeImpacts.length - 1; i >= 0; i--) {
            if (!activeImpacts[i](delta)) activeImpacts.splice(i, 1);
        }

        // Tick projectiles
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const proj = projectiles[i];
            proj.age += delta;

            if (proj.age > MAX_AGE) {
                destroyProjectile(proj, null);
                projectiles.splice(i, 1);
                continue;
            }

            _prevPos.copy(proj.prevPos);

            // Physics
            proj.velocity.y -= proj.config.gravity * delta;
            proj.mesh.position.addScaledVector(proj.velocity, delta);
            proj.light.position.copy(proj.mesh.position);

            // Pulsing light intensity
            proj.light.intensity =
                proj.config.lightIntensity * (0.8 + Math.sin(proj.age * 14) * 0.2);

            // Spin sphere for visual interest
            proj.mesh.rotation.x += delta * 2.5;
            proj.mesh.rotation.y += delta * 3.5;

            // Update trail: shift buffer and write current pos at index 0
            const tp = proj.trailPositions;
            for (let j = TRAIL_LENGTH - 1; j > 0; j--) {
                tp[j * 3]     = tp[(j - 1) * 3];
                tp[j * 3 + 1] = tp[(j - 1) * 3 + 1];
                tp[j * 3 + 2] = tp[(j - 1) * 3 + 2];
            }
            tp[0] = proj.mesh.position.x;
            tp[1] = proj.mesh.position.y;
            tp[2] = proj.mesh.position.z;
            proj.trail.geometry.attributes.position.needsUpdate = true;

            // ── Collision vs scene geometry ──────────────────────────────────
            _moveVec.copy(proj.mesh.position).sub(_prevPos);
            const moveLen = _moveVec.length();
            if (moveLen > 0.001 && collisionTargets.length) {
                raycaster.set(_prevPos, _moveVec.normalize());
                raycaster.far = moveLen + proj.config.radius;
                const hits = raycaster.intersectObjects(collisionTargets, false);
                if (hits.length > 0) {
                    destroyProjectile(proj, hits[0].point);
                    projectiles.splice(i, 1);
                    continue;
                }
            }

            // ── Collision vs terrain height ──────────────────────────────────
            const px = proj.mesh.position.x;
            const pz = proj.mesh.position.z;
            const groundY = Math.max(getHeight(px, pz), seaLevel);
            if (proj.mesh.position.y < groundY) {
                const hitPos = proj.mesh.position.clone();
                hitPos.y = groundY;
                destroyProjectile(proj, hitPos);
                projectiles.splice(i, 1);
                continue;
            }

            // ── Out of bounds ────────────────────────────────────────────────
            if (Math.abs(px) > WORLD_LIMIT || Math.abs(pz) > WORLD_LIMIT) {
                destroyProjectile(proj, null);
                projectiles.splice(i, 1);
                continue;
            }

            proj.prevPos.copy(proj.mesh.position);
        }
    }

    // ── Spell info for HUD ────────────────────────────────────────────────────
    function getCurrentSpellInfo() {
        const item = invSystem.getSelectedItem();
        if (!item || item.category !== CATEGORIES.SPELL) return null;
        const spellId = item.id;
        return {
            spellId,
            name:             item.name,
            icon:             item.icon,
            cooldownFraction: getCooldownFraction(spellId),
            ready:            !isOnCooldown(spellId),
        };
    }

    return { cast, update, setCollisionTargets, getCurrentSpellInfo };
}
