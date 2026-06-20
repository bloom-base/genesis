/**
 * Minimap — a small radar/elevation map in the top-right corner.
 *
 * Samples terrain height data around the player and renders a
 * simplified overhead view with player position and direction indicator.
 *
 * Exports:
 *   createMinimap(canvas, getHeight, seaLevel) → { update(camera) }
 */

// ── Configuration ────────────────────────────────────────────────────────────
const MAP_SIZE       = 120;    // canvas pixel size
const SAMPLE_RADIUS  = 80;     // world units around the player to display
const SAMPLE_STEP    = 3;      // world units between each terrain sample
const PLAYER_SIZE    = 5;      // player triangle radius in pixels
const DIR_LINE_LEN   = 14;    // direction indicator length in pixels
const BORDER_WIDTH   = 2;

// ── Colour palette ───────────────────────────────────────────────────────────
// Muted earth tones for terrain, brighter for player/direction
const COLORS = {
    water:      [34,  100, 160],   // deep blue
    beach:      [170, 155, 110],   // sandy tan
    lowGrass:   [62,  115,  48],   // muted green
    midGrass:   [82,  120,  58],   // slightly drier green
    rock:       [115, 100,  82],   // brownish grey
    snow:       [205, 210, 218],   // pale grey-white
    player:     [255, 220,  60],   // bright gold
    direction:  [255, 100,  80],   // coral red
    border:     [30,   30,  30],   // dark border
    background: [20,   24,  30],   // very dark fill for out-of-range
};

/**
 * Map a terrain height to an [r, g, b] colour matching the biome scheme.
 */
function heightToMinimapColor(h, seaLevel) {
    if (h < seaLevel)          return COLORS.water;
    if (h < seaLevel + 0.6)    return COLORS.beach;
    if (h < 2.5)               return COLORS.lowGrass;
    if (h < 7)                 return COLORS.midGrass;
    if (h < 12)                return COLORS.rock;
    return COLORS.snow;
}

/**
 * Blend a colour towards white or black based on normalised height for subtle shading.
 * `t` ranges 0–1; returns a new [r,g,b].
 */
function shadeTerrain(rgb, t) {
    // Mix 70% base colour + 30% brightness variation
    const brightness = 0.7 + t * 0.3;
    return [
        Math.min(255, Math.round(rgb[0] * brightness)),
        Math.min(255, Math.round(rgb[1] * brightness)),
        Math.min(255, Math.round(rgb[2] * brightness)),
    ];
}

/**
 * Create the minimap system.
 *
 * @param {HTMLCanvasElement} canvas  — the minimap canvas element
 * @param {(x:number, z:number)=>number} getHeight — terrain height sampler
 * @param {number} seaLevel
 * @returns {{ update: (camera: THREE.Camera) => void }}
 */
export function createMinimap(canvas, getHeight, seaLevel) {
    canvas.width  = MAP_SIZE;
    canvas.height = MAP_SIZE;

    const ctx = canvas.getContext('2d');
    const halfSize = MAP_SIZE / 2;

    // Pre-allocate an ImageData for pixel-level terrain drawing
    const imgData = ctx.createImageData(MAP_SIZE, MAP_SIZE);
    const pixels  = imgData.data; // Uint8ClampedArray — RGBA

    // Reusable object for camera.getWorldDirection() — avoids allocation per frame.
    // Three.js getWorldDirection() accepts any object with x,y,z and mutates it.
    const cameraDir = { x: 0, y: 0, z: 0 };

    // Height range for shading normalisation (discovered once, cached)
    let hMin =  Infinity;
    let hMax = -Infinity;

    /**
     * Update and redraw the minimap.
     * Called once per frame from the game loop.
     *
     * @param {THREE.Camera} camera
     */
    function update(camera) {
        const px = camera.position.x;
        const pz = camera.position.z;

        // ── 1. Sample terrain & write pixels ────────────────────────────────
        // We map a square region in world space (±SAMPLE_RADIUS around player)
        // onto the MAP_SIZE×MAP_SIZE canvas.

        const worldPerPixel = (SAMPLE_RADIUS * 2) / MAP_SIZE;

        // Reset height extremes each frame for adaptive shading
        hMin =  Infinity;
        hMax = -Infinity;

        // First pass: sample heights to find min/max for this viewport
        // Use a coarser grid for the range scan (every 4th pixel)
        for (let py = 0; py < MAP_SIZE; py += 4) {
            for (let ppx = 0; ppx < MAP_SIZE; ppx += 4) {
                const wx = px + (ppx - halfSize) * worldPerPixel;
                const wz = pz + (py  - halfSize) * worldPerPixel;
                const h  = getHeight(wx, wz);
                if (h < hMin) hMin = h;
                if (h > hMax) hMax = h;
            }
        }

        const hRange = hMax - hMin || 1;

        // Second pass: full resolution pixel fill
        for (let py = 0; py < MAP_SIZE; py++) {
            for (let ppx = 0; ppx < MAP_SIZE; ppx++) {
                const wx = px + (ppx - halfSize) * worldPerPixel;
                const wz = pz + (py  - halfSize) * worldPerPixel;
                const h  = getHeight(wx, wz);

                const baseColor = heightToMinimapColor(h, seaLevel);
                const t = (h - hMin) / hRange;  // 0..1 normalised height
                const [r, g, b] = shadeTerrain(baseColor, t);

                const idx = (py * MAP_SIZE + ppx) * 4;
                pixels[idx]     = r;
                pixels[idx + 1] = g;
                pixels[idx + 2] = b;
                pixels[idx + 3] = 255;
            }
        }

        ctx.putImageData(imgData, 0, 0);

        // ── 2. Draw circular mask (clip outside to a circle) ────────────────
        // We draw the terrain into the full square, then punch out corners
        // using a composite operation to get a circular shape.
        ctx.globalCompositeOperation = 'destination-in';
        ctx.beginPath();
        ctx.arc(halfSize, halfSize, halfSize - BORDER_WIDTH, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        // ── 3. Draw border ring ─────────────────────────────────────────────
        ctx.strokeStyle = `rgb(${COLORS.border.join(',')})`;
        ctx.lineWidth   = BORDER_WIDTH;
        ctx.beginPath();
        ctx.arc(halfSize, halfSize, halfSize - BORDER_WIDTH / 2, 0, Math.PI * 2);
        ctx.stroke();

        // ── 4. Player direction indicator ───────────────────────────────────
        // Get camera yaw from its world-space forward vector (XZ plane).
        // Three.js camera looks down -Z locally, so getWorldDirection gives
        // the forward vector. We compute the angle in the XZ plane.
        // We duck-type the direction object — getWorldDirection mutates
        // the passed object, setting .x, .y, .z properties.
        const dir = cameraDir;
        camera.getWorldDirection(dir);
        // atan2 gives angle from +X axis; we want angle from -Z (north on map)
        const yaw = Math.atan2(dir.x, dir.z);

        // Direction line from center
        const lineEndX = halfSize + Math.sin(yaw) * DIR_LINE_LEN;
        const lineEndY = halfSize + Math.cos(yaw) * DIR_LINE_LEN;

        ctx.strokeStyle = `rgb(${COLORS.direction.join(',')})`;
        ctx.lineWidth   = 2.5;
        ctx.beginPath();
        ctx.moveTo(halfSize, halfSize);
        ctx.lineTo(lineEndX, lineEndY);
        ctx.stroke();

        // ── 5. Player dot / triangle ────────────────────────────────────────
        // Draw a small filled triangle pointing in the camera direction.
        const tipX = halfSize + Math.sin(yaw) * PLAYER_SIZE;
        const tipY = halfSize + Math.cos(yaw) * PLAYER_SIZE;

        const baseAngle1 = yaw + Math.PI * 0.75;
        const baseAngle2 = yaw - Math.PI * 0.75;
        const base1X = halfSize + Math.sin(baseAngle1) * (PLAYER_SIZE * 0.6);
        const base1Y = halfSize + Math.cos(baseAngle1) * (PLAYER_SIZE * 0.6);
        const base2X = halfSize + Math.sin(baseAngle2) * (PLAYER_SIZE * 0.6);
        const base2Y = halfSize + Math.cos(baseAngle2) * (PLAYER_SIZE * 0.6);

        ctx.fillStyle = `rgb(${COLORS.player.join(',')})`;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(base1X, base1Y);
        ctx.lineTo(base2X, base2Y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // ── 6. Subtle cardinal direction labels ─────────────────────────────
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.font      = 'bold 9px monospace';
        ctx.textAlign  = 'center';
        ctx.textBaseline = 'middle';

        const labelR = halfSize - 10;
        ctx.fillText('N', halfSize, BORDER_WIDTH + 8);
        ctx.fillText('S', halfSize, MAP_SIZE - BORDER_WIDTH - 6);
        ctx.fillText('W', BORDER_WIDTH + 6, halfSize);
        ctx.fillText('E', MAP_SIZE - BORDER_WIDTH - 6, halfSize);
    }

    return { update };
}
