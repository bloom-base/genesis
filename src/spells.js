/**
 * Genesis — Spell casting system.
 *
 * Provides SpellSystem: manages mana, cooldowns, projectile simulation,
 * particle trails/explosions, and HUD updates.
 *
 * Hotbar slot assignment and icon display is handled by hotbar.js.
 * SpellSystem only owns: the mana bar and per-spell cooldown overlays.
 */

import * as THREE from 'three';

// ── Spell definitions ─────────────────────────────────────────────────────────
const SPELLS = {
    fireball: {
        id:          'fireball',
        name:        'Fireball',
        manaCost:    25,
        cooldown:    1.5,   // seconds between casts
        speed:       45,    // units / second
        maxRange:    120,   // units before auto-explode
        blastRadius: 4,     // explosion visual radius
    },
};

// Dispatch table: spellId → spawn function.
// Add new entries here when adding spells — no if-chains needed.
const _spawnHandlers = {
    fireball: (sys, spell) => sys._spawnFireball(spell),
};

// ── Shared geometry pool (tiny spheres – reused across particles) ─────────────
const _geoPool = {};
function getSharedGeo(radius, wSeg = 5, hSeg = 5) {
    const key = `${radius}-${wSeg}-${hSeg}`;
    if (!_geoPool[key]) _geoPool[key] = new THREE.SphereGeometry(radius, wSeg, hSeg);
    return _geoPool[key];
}

// ── SpellSystem ───────────────────────────────────────────────────────────────
export class SpellSystem {
    /**
     * @param {THREE.Scene}  scene
     * @param {THREE.Camera} camera
     * @param {function}     getHeight  – terrain height at (x, z)
     * @param {number}       seaLevel
     */
    constructor(scene, camera, getHeight, seaLevel) {
        this.scene     = scene;
        this.camera    = camera;
        this.getHeight = getHeight;
        this.seaLevel  = seaLevel;

        // Mana
        this.maxMana   = 100;
        this.mana      = 100;
        this.manaRegen = 8;   // per second

        // Per-spell last-cast timestamps (seconds)
        this._cooldowns = {};

        // Live projectiles and particles
        this._projectiles = [];
        this._particles   = [];

        // Pending setTimeout handles — cleared on destroy()
        this._pendingTimeouts = [];

        // DOM refs – populated by initUI() and registerCooldownSlot()
        this._manaFill      = null;
        this._manaText      = null;
        this._lastManaWidth = null; // change-detection for mana bar DOM writes

        // Map of spellId → { el: overlayElement } for cooldown rendering
        this._cooldownSlots = {};
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /** Wire up mana bar DOM elements. Call after the page is ready. */
    initUI() {
        this._manaFill = document.getElementById('mana-bar-fill');
        this._manaText = document.getElementById('mana-text');
        this._updateManaUI();
    }

    /**
     * Register a hotbar slot DOM element to receive a cooldown overlay for
     * the given spell.  A `.slot-cooldown` div is injected if not already present.
     * @param {string}      spellId
     * @param {HTMLElement} slotEl
     */
    registerCooldownSlot(spellId, slotEl) {
        if (!slotEl) return;
        let overlay = slotEl.querySelector('.slot-cooldown');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'slot-cooldown';
            slotEl.appendChild(overlay);
        }
        this._cooldownSlots[spellId] = overlay;
    }

    /**
     * Try to cast a spell by id.  Called when the player activates a spell slot.
     * @param {string} spellId
     */
    tryCast(spellId) {
        const spell = SPELLS[spellId];
        if (!spell) return;

        const now     = performance.now() / 1000;
        const elapsed = now - (this._cooldowns[spellId] || 0);

        if (this.mana < spell.manaCost) return; // not enough mana
        if (elapsed < spell.cooldown)   return; // still on cooldown

        this.mana -= spell.manaCost;
        this._cooldowns[spellId] = now;
        this._updateManaUI();
        this._flashManaBar();

        const handler = _spawnHandlers[spellId];
        if (handler) handler(this, spell);
    }

    /**
     * Per-frame update.
     * @param {number} delta – seconds since last frame
     */
    update(delta) {
        // Compute time once per frame and share with helpers that need it.
        const now = performance.now() / 1000;

        // Mana regen
        this.mana = Math.min(this.maxMana, this.mana + this.manaRegen * delta);
        this._updateManaUI();
        this._updateCooldownUI(now);

        // Projectiles
        for (let i = this._projectiles.length - 1; i >= 0; i--) {
            const proj = this._projectiles[i];
            if (!proj.alive) {
                this._destroyProjectile(proj);
                this._projectiles.splice(i, 1);
            } else {
                this._stepProjectile(proj, delta);
            }
        }

        // Particles
        for (let i = this._particles.length - 1; i >= 0; i--) {
            const p = this._particles[i];
            p.age += delta;
            if (p.age >= p.maxAge) {
                p.mesh.material.dispose();
                this.scene.remove(p.mesh);
                this._particles.splice(i, 1);
                continue;
            }
            const life = 1 - p.age / p.maxAge;
            p.mesh.position.addScaledVector(p.vel, delta);
            p.vel.y -= p.gravity * delta;
            p.mesh.scale.setScalar(Math.max(0.001, life * p.startScale));
            p.mesh.material.opacity = life * p.startOpacity;
        }
    }

    /** Clean up all active objects and pending timers. */
    destroy() {
        this._pendingTimeouts.forEach(t => clearTimeout(t));
        this._pendingTimeouts = [];
        this._projectiles.forEach(p => this._destroyProjectile(p));
        this._projectiles = [];
        this._particles.forEach(p => { p.mesh.material.dispose(); this.scene.remove(p.mesh); });
        this._particles = [];
    }

    // ── Fireball projectile ───────────────────────────────────────────────────

    _spawnFireball(spell) {
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);

        // Spawn slightly in front of the camera so it doesn't clip into terrain.
        const origin = this.camera.position.clone().addScaledVector(dir, 1.1);

        const mesh = new THREE.Mesh(
            getSharedGeo(0.22, 10, 8),
            new THREE.MeshBasicMaterial({ color: 0xff5500 })
        );
        mesh.position.copy(origin);
        this.scene.add(mesh);

        // Dynamic glow light attached to the projectile.
        const light = new THREE.PointLight(0xff6600, 5, 14);
        mesh.add(light);

        this._projectiles.push({
            mesh,
            light,
            vel:       dir.clone().multiplyScalar(spell.speed),
            speed:     spell.speed, // cached magnitude — avoids vel.length() sqrt per frame
            travelled: 0,
            maxDist:   spell.maxRange,
            blastR:    spell.blastRadius,
            trailT:    0,
            alive:     true,
        });
    }

    _stepProjectile(proj, delta) {
        proj.mesh.position.addScaledVector(proj.vel, delta);
        proj.travelled += proj.speed * delta; // use cached scalar, no sqrt needed
        proj.trailT    += delta;

        // Emit trail particle every ~30 ms.
        if (proj.trailT >= 0.03) {
            proj.trailT = 0;
            this._emitTrail(proj.mesh.position);
        }

        // Flicker glow.
        proj.light.intensity = 3 + Math.random() * 3;

        const pos     = proj.mesh.position;
        const groundY = Math.max(this.getHeight(pos.x, pos.z), this.seaLevel);

        const hitGround = pos.y <= groundY + 0.1;
        const rangeOut  = proj.travelled >= proj.maxDist;

        if (hitGround || rangeOut) {
            this._explode(pos.clone(), proj.blastR);
            proj.alive = false;
        }
    }

    _destroyProjectile(proj) {
        proj.mesh.material.dispose();
        this.scene.remove(proj.mesh);
    }

    // ── Particles ─────────────────────────────────────────────────────────────

    /** Emit a single fire/smoke trail puff at position. */
    _emitTrail(position) {
        const smoke = Math.random() < 0.3;
        const color = smoke
            ? 0x221100
            : (Math.random() < 0.5 ? 0xff4400 : 0xffaa00);
        const size = 0.10 + Math.random() * 0.12;

        const mesh = new THREE.Mesh(
            getSharedGeo(size),
            new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity:     0.85,
                depthWrite:  false,
            })
        );
        mesh.position.copy(position).add(
            new THREE.Vector3(
                (Math.random() - 0.5) * 0.25,
                (Math.random() - 0.5) * 0.25,
                (Math.random() - 0.5) * 0.25,
            )
        );
        this.scene.add(mesh);

        this._particles.push({
            mesh,
            age:          0,
            maxAge:       0.35 + Math.random() * 0.25,
            startScale:   1,
            startOpacity: 0.85,
            gravity:      0,
            vel: new THREE.Vector3(
                (Math.random() - 0.5) * 1.5,
                0.5 + Math.random(),
                (Math.random() - 0.5) * 1.5,
            ),
        });
    }

    /** Spawn a burst of fire + smoke spheres at position. */
    _explode(position, radius) {
        const count = 28 + Math.floor(Math.random() * 10);
        for (let i = 0; i < count; i++) {
            const isSmoke = i >= count * 0.55;
            const size    = isSmoke
                ? 0.25 + Math.random() * 0.45
                : 0.18 + Math.random() * 0.35;

            const color = isSmoke
                ? new THREE.Color(0.12 + Math.random() * 0.06, 0.07 + Math.random() * 0.04, 0.03)
                : new THREE.Color(1, 0.3 + Math.random() * 0.4, 0);

            const mesh = new THREE.Mesh(
                getSharedGeo(size, 6, 6),
                new THREE.MeshBasicMaterial({
                    color,
                    transparent: true,
                    opacity:     0.9,
                    depthWrite:  false,
                })
            );
            mesh.position.copy(position).add(
                new THREE.Vector3(
                    (Math.random() - 0.5) * radius * 0.4,
                    Math.random() * radius * 0.3,
                    (Math.random() - 0.5) * radius * 0.4,
                )
            );
            this.scene.add(mesh);

            const speed = 5 + Math.random() * 12;
            const dir   = new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() * 0.6 + 0.3,
                Math.random() - 0.5,
            ).normalize().multiplyScalar(speed);

            this._particles.push({
                mesh,
                age:          0,
                maxAge:       isSmoke ? 1.0 + Math.random() * 0.8 : 0.5 + Math.random() * 0.5,
                startScale:   1,
                startOpacity: 0.9,
                gravity:      isSmoke ? 0 : 6,
                vel:          dir,
            });
        }

        // Brief flash light at impact — track the timeout so it can be cleared on destroy().
        const flash = new THREE.PointLight(0xff8800, 20, radius * 6);
        flash.position.copy(position);
        this.scene.add(flash);
        const t = setTimeout(() => this.scene.remove(flash), 150);
        this._pendingTimeouts.push(t);
    }

    // ── HUD helpers ───────────────────────────────────────────────────────────

    _updateManaUI() {
        if (!this._manaFill) return;
        const pct = (this.mana / this.maxMana) * 100;
        const w   = `${pct.toFixed(1)}%`;
        // Skip DOM write if the bar width hasn't changed — avoids forced layouts every frame.
        if (w === this._lastManaWidth) return;
        this._lastManaWidth = w;
        this._manaFill.style.width = w;
        if (this._manaText) {
            this._manaText.textContent = `${Math.floor(this.mana)} / ${this.maxMana}`;
        }
    }

    /** Brief yellow flash on the mana bar to signal a cast. */
    _flashManaBar() {
        if (!this._manaFill) return;
        this._manaFill.classList.add('mana-flash');
        const t = setTimeout(() => this._manaFill.classList.remove('mana-flash'), 220);
        this._pendingTimeouts.push(t);
    }

    /**
     * Update cooldown overlay heights for all registered spell slots.
     * @param {number} now – current time in seconds (passed from update() to avoid
     *                       redundant performance.now() calls per frame)
     */
    _updateCooldownUI(now) {
        for (const [spellId, overlay] of Object.entries(this._cooldownSlots)) {
            const spell   = SPELLS[spellId];
            if (!spell) continue;
            const elapsed = now - (this._cooldowns[spellId] || 0);
            const pct     = Math.min(1, elapsed / spell.cooldown);
            overlay.style.height = pct >= 1 ? '0%' : `${((1 - pct) * 100).toFixed(1)}%`;
        }
    }
}
