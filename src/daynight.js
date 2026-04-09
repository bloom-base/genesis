/**
 * Day/Night cycle system.
 *
 * Manages a 0–24 hour clock that advances each frame and drives:
 *   - Sky shader uniforms (sun position, turbidity, rayleigh)
 *   - Directional / hemisphere / ambient light colours & intensities
 *   - Fog colour
 *   - Tone-mapping exposure
 *   - A small HUD clock widget
 *   - A sun/moon indicator on the sky horizon
 *
 * One full in-game day = ~24 real-time minutes (1 real second = 1 in-game minute).
 */

import * as THREE from 'three';

// ── Colour palette ──────────────────────────────────────────────────────────
// Key-framed sky / fog / light colours at specific hours.  Values between
// key-frames are linearly interpolated.

const SKY_KEYS = [
    //  hour   sky-hex      fog-hex      sun-hex      hemiSky-hex  hemiGnd-hex  ambient-hex
    [  0.0, 0x0a0e1a, 0x070a14, 0x223366, 0x0c1220, 0x0a0e14, 0x0a0e1a ],  // midnight
    [  5.0, 0x0f1428, 0x0c1020, 0x334466, 0x141a2a, 0x0e1218, 0x101828 ],  // pre-dawn
    [  6.0, 0x3a2a40, 0x4a3050, 0xff8844, 0x5a3a50, 0x2a2020, 0x302030 ],  // dawn
    [  7.0, 0xd08050, 0xc07848, 0xffaa55, 0xc08868, 0x4a5a28, 0x605040 ],  // sunrise
    [  8.5, 0x88bbdd, 0x7aaac8, 0xfff0d0, 0x8ab8d4, 0x3a6828, 0x385068 ],  // morning
    [ 12.0, 0x9bbdd6, 0x9bbdd6, 0xfff3d6, 0x9bbdd6, 0x4a7a30, 0x405870 ],  // noon (original)
    [ 17.0, 0x9bbdd6, 0x9bbdd6, 0xfff3d6, 0x9bbdd6, 0x4a7a30, 0x405870 ],  // afternoon
    [ 18.5, 0xd09060, 0xc08050, 0xffaa55, 0xc09070, 0x4a5a28, 0x605040 ],  // sunset
    [ 19.5, 0x4a2a40, 0x3a2040, 0xff6633, 0x5a3a50, 0x2a2020, 0x302030 ],  // dusk
    [ 20.5, 0x141828, 0x101420, 0x334466, 0x1a2030, 0x0e1218, 0x141828 ],  // twilight
    [ 24.0, 0x0a0e1a, 0x070a14, 0x223366, 0x0c1220, 0x0a0e14, 0x0a0e1a ],  // midnight wrap
];

// Intensity key-frames:  [hour, sunIntensity, hemiIntensity, ambientIntensity, exposure]
const INTENSITY_KEYS = [
    [  0.0,  0.0,  0.08, 0.15, 0.08 ],
    [  5.0,  0.0,  0.10, 0.18, 0.10 ],
    [  6.0,  0.3,  0.25, 0.25, 0.18 ],
    [  7.0,  1.0,  0.55, 0.35, 0.30 ],
    [  8.5,  1.8,  0.80, 0.50, 0.42 ],
    [ 12.0,  2.2,  0.90, 0.55, 0.45 ],   // noon (original values)
    [ 17.0,  2.0,  0.85, 0.55, 0.44 ],
    [ 18.5,  1.0,  0.55, 0.35, 0.30 ],
    [ 19.5,  0.3,  0.25, 0.25, 0.18 ],
    [ 20.5,  0.0,  0.10, 0.18, 0.10 ],
    [ 24.0,  0.0,  0.08, 0.15, 0.08 ],
];

// Sun arc:  [hour, elevationDeg, azimuthDeg]
const SUN_ARC = [
    [  0.0,  -40, 0   ],   // below horizon (north – "midnight sun" direction)
    [  6.0,   -2, 90  ],   // just below east horizon
    [  7.0,    8, 105 ],   // rising in the east
    [ 10.0,   38, 150 ],
    [ 12.0,   55, 180 ],   // due south, high noon
    [ 14.0,   42, 210 ],
    [ 17.0,   22, 255 ],
    [ 18.5,    6, 270 ],   // setting in the west
    [ 19.5,   -4, 280 ],   // just below west horizon
    [ 24.0,  -40, 360 ],   // below horizon again
];

// Sky shader parameter key-frames: [hour, turbidity, rayleigh, mieCoefficient, mieDirectionalG]
const SKY_PARAMS = [
    [  0.0,   2,  0.5, 0.001, 0.75 ],
    [  5.0,   3,  1.0, 0.002, 0.78 ],
    [  6.0,   8,  3.5, 0.010, 0.90 ],   // dawn — heavy scattering, warm sky
    [  7.0,  10,  3.0, 0.008, 0.88 ],   // sunrise
    [  8.5,   7,  2.0, 0.005, 0.82 ],
    [ 12.0,   7,  1.8, 0.004, 0.82 ],   // noon (original)
    [ 17.0,   7,  1.8, 0.004, 0.82 ],
    [ 18.5,  10,  3.0, 0.008, 0.88 ],   // sunset
    [ 19.5,   8,  3.5, 0.010, 0.90 ],   // dusk
    [ 20.5,   3,  1.0, 0.002, 0.78 ],
    [ 24.0,   2,  0.5, 0.001, 0.75 ],
];


// ── Helpers ─────────────────────────────────────────────────────────────────

const _c = new THREE.Color();

/** Linearly interpolate between two hex colours, returning a THREE.Color. */
function lerpColor(hex1, hex2, t) {
    _c.setHex(hex1);
    const r1 = _c.r, g1 = _c.g, b1 = _c.b;
    _c.setHex(hex2);
    return _c.setRGB(
        r1 + ((_c.r - r1) * t),
        g1 + ((_c.g - g1) * t),
        b1 + ((_c.b - b1) * t),
    );
}

/** Sample a key-frame table.  Returns an array of interpolated values. */
function sampleKeys(table, hour) {
    // Find the two surrounding key-frames.
    for (let i = 0; i < table.length - 1; i++) {
        const a = table[i];
        const b = table[i + 1];
        if (hour >= a[0] && hour <= b[0]) {
            const t = (b[0] === a[0]) ? 0 : (hour - a[0]) / (b[0] - a[0]);
            const out = [hour];
            for (let j = 1; j < a.length; j++) {
                out.push(a[j] + (b[j] - a[j]) * t);
            }
            return out;
        }
    }
    // Fallback (shouldn't happen with 0–24 wraparound).
    return table[0];
}

/** Sample a colour key-frame table (hex values).  Returns array of THREE.Colors. */
function sampleColorKeys(table, hour) {
    for (let i = 0; i < table.length - 1; i++) {
        const a = table[i];
        const b = table[i + 1];
        if (hour >= a[0] && hour <= b[0]) {
            const t = (b[0] === a[0]) ? 0 : (hour - a[0]) / (b[0] - a[0]);
            const colors = [];
            for (let j = 1; j < a.length; j++) {
                colors.push(lerpColor(a[j], b[j], t).clone());
            }
            return colors;
        }
    }
    return [new THREE.Color(table[0][1])];
}


// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Create the day/night cycle controller.
 *
 * @param {object} opts
 * @param {THREE.Sky}              opts.sky         – Sky mesh
 * @param {THREE.DirectionalLight} opts.sunLight    – Main sun light
 * @param {THREE.HemisphereLight}  opts.hemiLight   – Hemisphere light
 * @param {THREE.AmbientLight}     opts.ambientLight
 * @param {THREE.FogExp2}          opts.fog         – Scene fog
 * @param {THREE.WebGLRenderer}    opts.renderer
 * @param {THREE.Scene}            opts.scene
 * @param {number}                [opts.startHour=10] – Starting time of day (0–24)
 */
export function createDayNightCycle(opts) {
    const {
        sky, sunLight, hemiLight, ambientLight,
        fog, renderer, scene,
        startHour = 10,
    } = opts;

    const skyU = sky.material.uniforms;
    const sunDir = new THREE.Vector3();

    // ── Time state ──────────────────────────────────────────────────────────
    // 1 real second = 1 in-game minute → 24 real-time minutes per day.
    const MINUTES_PER_REAL_SECOND = 1;
    let timeOfDay = startHour;  // 0–24

    // ── Sun/moon mesh ───────────────────────────────────────────────────────
    const celestialGroup = new THREE.Group();
    scene.add(celestialGroup);

    // Sun disc
    const sunGeo = new THREE.CircleGeometry(18, 32);
    const sunMat = new THREE.MeshBasicMaterial({
        color: 0xffdd88,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    celestialGroup.add(sunMesh);

    // Moon disc
    const moonGeo = new THREE.CircleGeometry(12, 32);
    const moonMat = new THREE.MeshBasicMaterial({
        color: 0xddeeff,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    celestialGroup.add(moonMesh);

    // ── HUD element ─────────────────────────────────────────────────────────
    const clockEl = document.getElementById('time-display');

    // ── Update function (called each frame) ─────────────────────────────────
    function update(delta, camera) {
        // Advance clock.
        timeOfDay += (delta * MINUTES_PER_REAL_SECOND) / 60;  // delta is seconds
        if (timeOfDay >= 24) timeOfDay -= 24;

        const h = timeOfDay;

        // ── Sun position ────────────────────────────────────────────────────
        const arc = sampleKeys(SUN_ARC, h);
        const elevDeg = arc[1];
        const aziDeg  = arc[2];

        sunDir.setFromSphericalCoords(
            1,
            THREE.MathUtils.degToRad(90 - elevDeg),
            THREE.MathUtils.degToRad(aziDeg),
        );

        skyU['sunPosition'].value.copy(sunDir);

        // ── Sky shader params ───────────────────────────────────────────────
        const sp = sampleKeys(SKY_PARAMS, h);
        skyU['turbidity'].value       = sp[1];
        skyU['rayleigh'].value        = sp[2];
        skyU['mieCoefficient'].value  = sp[3];
        skyU['mieDirectionalG'].value = sp[4];

        // ── Colours ─────────────────────────────────────────────────────────
        const [skyCol, fogCol, sunCol, hemiSkyCol, hemiGndCol, ambCol] =
            sampleColorKeys(SKY_KEYS, h);

        fog.color.copy(fogCol);
        sunLight.color.copy(sunCol);
        hemiLight.color.copy(hemiSkyCol);
        hemiLight.groundColor.copy(hemiGndCol);
        ambientLight.color.copy(ambCol);

        // ── Intensities ─────────────────────────────────────────────────────
        const inten = sampleKeys(INTENSITY_KEYS, h);
        sunLight.intensity     = inten[1];
        hemiLight.intensity    = inten[2];
        ambientLight.intensity = inten[3];
        renderer.toneMappingExposure = inten[4];

        // ── Directional light position (follow sun arc) ─────────────────────
        sunLight.position.copy(sunDir).multiplyScalar(400);

        // Move shadow camera target to follow player roughly.
        if (camera) {
            sunLight.target.position.set(camera.position.x, 0, camera.position.z);
            sunLight.target.updateMatrixWorld();
        }

        // ── Celestial bodies ────────────────────────────────────────────────
        if (camera) {
            // Place sun disc far away, facing camera
            const sunDist = 900;
            sunMesh.position.copy(sunDir).multiplyScalar(sunDist).add(camera.position);
            sunMesh.lookAt(camera.position);

            // Sun visibility — fade near horizon, hide at night
            const sunOpacity = elevDeg > 2 ? Math.min(0.9, (elevDeg - 2) * 0.1)
                             : elevDeg > -2 ? 0.9 * Math.max(0, (elevDeg + 2) / 4)
                             : 0;
            sunMat.opacity = sunOpacity;

            // Sun colour — more orange/red near horizon
            const horizonMix = 1 - Math.min(1, Math.max(0, elevDeg / 25));
            sunMat.color.setRGB(
                1.0,
                0.7 + 0.28 * (1 - horizonMix),
                0.4 + 0.53 * (1 - horizonMix),
            );

            // Moon — opposite side of the sky from the sun
            const moonElevDeg = -elevDeg + 10;  // rough opposing arc
            const moonAziDeg  = (aziDeg + 180) % 360;
            const moonDir = new THREE.Vector3().setFromSphericalCoords(
                1,
                THREE.MathUtils.degToRad(90 - moonElevDeg),
                THREE.MathUtils.degToRad(moonAziDeg),
            );
            moonMesh.position.copy(moonDir).multiplyScalar(sunDist).add(camera.position);
            moonMesh.lookAt(camera.position);

            // Moon visible only at night
            const moonOpacity = moonElevDeg > 2 ? Math.min(0.7, (moonElevDeg - 2) * 0.08)
                              : moonElevDeg > -2 ? 0.7 * Math.max(0, (moonElevDeg + 2) / 4)
                              : 0;
            // Fade out moon during daylight
            const dayFade = Math.max(0, 1 - Math.max(0, elevDeg) / 10);
            moonMat.opacity = moonOpacity * dayFade;
        }

        // ── HUD clock ───────────────────────────────────────────────────────
        if (clockEl) {
            const hours   = Math.floor(h) % 24;
            const minutes = Math.floor((h % 1) * 60);
            clockEl.textContent =
                String(hours).padStart(2, '0') + ':' +
                String(minutes).padStart(2, '0');
        }
    }

    // Run one update immediately so the scene starts at the right colours.
    update(0, null);

    return { update, getTime: () => timeOfDay };
}
