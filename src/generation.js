/**
 * Procedural generation utilities for creating solar systems and planets
 * Uses seeded random number generation for deterministic results
 */

/**
 * Seeded random number generator (Mulberry32)
 * Returns a function that generates deterministic pseudo-random numbers
 */
export function createSeededRandom(seed) {
    let state = seed;
    return function() {
        state = (state + 0x6D2B79F5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Generate a random integer between min and max (inclusive)
 */
function randomInt(random, min, max) {
    return Math.floor(random() * (max - min + 1)) + min;
}

/**
 * Generate a random float between min and max
 */
function randomFloat(random, min, max) {
    return random() * (max - min) + min;
}

/**
 * Pick a random element from an array
 */
function randomChoice(random, array) {
    return array[Math.floor(random() * array.length)];
}

/**
 * Planet name generator using procedural syllables
 */
const SYLLABLES = [
    'al', 'an', 'ar', 'as', 'at', 'or', 'en', 'er', 'es', 'et',
    'ax', 'ex', 'ix', 'ox', 'ux', 'il', 'ul', 'ol', 'el', 'yl',
    'ra', 're', 'ri', 'ro', 'ru', 'ka', 'ke', 'ki', 'ko', 'ku',
    'ta', 'te', 'ti', 'to', 'tu', 'na', 'ne', 'ni', 'no', 'nu',
    'ma', 'me', 'mi', 'mo', 'mu', 'la', 'le', 'li', 'lo', 'lu',
    'za', 'ze', 'zi', 'zo', 'zu', 'va', 've', 'vi', 'vo', 'vu',
    'dar', 'dor', 'tar', 'tor', 'kor', 'kar', 'nar', 'nor', 'mar',
    'ion', 'ian', 'eon', 'ean', 'on', 'us', 'is', 'os', 'as'
];

const PREFIXES = ['', '', '', 'New ', 'Alpha ', 'Beta ', 'Nova ', 'Proxima '];
const SUFFIXES = ['', '', '', ' Prime', ' Minor', ' Major', ' II', ' III'];

export function generatePlanetName(random) {
    const syllableCount = randomInt(random, 2, 4);
    let name = '';
    
    for (let i = 0; i < syllableCount; i++) {
        name += randomChoice(random, SYLLABLES);
    }
    
    // Capitalize first letter
    name = name.charAt(0).toUpperCase() + name.slice(1);
    
    // Occasionally add prefix or suffix
    if (random() < 0.2) {
        name = randomChoice(random, PREFIXES) + name;
    }
    if (random() < 0.2) {
        name = name + randomChoice(random, SUFFIXES);
    }
    
    return name.trim();
}

/**
 * Generate planet color based on type and temperature
 */
function generatePlanetColor(random, type, temperature) {
    const colors = {
        terrestrial: [
            { r: 180, g: 140, b: 100 }, // Desert
            { r: 120, g: 150, b: 180 }, // Ocean
            { r: 100, g: 160, b: 120 }, // Forest
            { r: 200, g: 180, b: 160 }  // Rocky
        ],
        gas: [
            { r: 200, g: 180, b: 140 }, // Jupiter-like
            { r: 220, g: 200, b: 160 }, // Saturn-like
            { r: 140, g: 180, b: 220 }, // Neptune-like
            { r: 120, g: 200, b: 240 }  // Uranus-like
        ],
        ice: [
            { r: 180, g: 200, b: 220 }, // Ice
            { r: 160, g: 180, b: 200 }, // Frozen
            { r: 200, g: 210, b: 230 }  // Snow
        ]
    };
    
    const colorSet = colors[type] || colors.terrestrial;
    const baseColor = randomChoice(random, colorSet);
    
    // Add some variation
    return {
        r: Math.min(255, Math.max(0, baseColor.r + randomInt(random, -20, 20))),
        g: Math.min(255, Math.max(0, baseColor.g + randomInt(random, -20, 20))),
        b: Math.min(255, Math.max(0, baseColor.b + randomInt(random, -20, 20)))
    };
}

/**
 * Generate atmosphere composition based on planet type
 */
function generateAtmosphere(random, type, temperature) {
    if (type === 'gas') {
        return randomChoice(random, [
            'Hydrogen-Helium',
            'Hydrogen-Methane',
            'Hydrogen-Ammonia',
            'Helium-Methane'
        ]);
    } else if (type === 'ice') {
        return randomChoice(random, [
            'Thin Nitrogen',
            'Methane traces',
            'None detected',
            'Frozen volatiles'
        ]);
    } else {
        if (temperature > 400) {
            return randomChoice(random, ['Thin CO₂', 'Sulfur compounds', 'None']);
        } else if (temperature > 200) {
            return randomChoice(random, ['Nitrogen-Oxygen', 'CO₂-Nitrogen', 'Nitrogen-Argon']);
        } else {
            return randomChoice(random, ['Thin CO₂', 'Methane-Nitrogen', 'None']);
        }
    }
}

/**
 * Generate terrain type based on planet properties
 */
function generateTerrain(random, type, temperature) {
    if (type === 'gas') {
        return randomChoice(random, ['Gaseous', 'Turbulent storms', 'Cloud bands']);
    } else if (type === 'ice') {
        return randomChoice(random, ['Frozen plains', 'Ice sheets', 'Cryovolcanic', 'Glacial']);
    } else {
        if (temperature > 400) {
            return randomChoice(random, ['Volcanic', 'Molten', 'Barren rock', 'Lava plains']);
        } else if (temperature > 250 && temperature < 350) {
            return randomChoice(random, ['Continental', 'Oceanic', 'Mixed', 'Desert', 'Forested']);
        } else if (temperature > 200) {
            return randomChoice(random, ['Desert', 'Arid', 'Rocky', 'Canyon systems']);
        } else {
            return randomChoice(random, ['Frozen', 'Tundra', 'Glacial', 'Ice-covered']);
        }
    }
}

/**
 * Generate a descriptive text for the planet
 */
function generateDescription(planet) {
    const { name, type, temperature, atmosphere, terrain, distance, size } = planet;
    
    const descriptions = [];
    
    // Opening
    if (type === 'gas') {
        descriptions.push(`${name} is a massive gas giant`);
    } else if (type === 'ice') {
        descriptions.push(`${name} is a frozen world`);
    } else {
        if (temperature > 300) {
            descriptions.push(`${name} is a scorching terrestrial planet`);
        } else if (temperature > 200) {
            descriptions.push(`${name} is a temperate terrestrial world`);
        } else {
            descriptions.push(`${name} is a cold terrestrial planet`);
        }
    }
    
    // Distance context
    if (distance < 1) {
        descriptions.push(`orbiting dangerously close to its star`);
    } else if (distance < 2) {
        descriptions.push(`in the inner region of its solar system`);
    } else if (distance < 4) {
        descriptions.push(`within the habitable zone`);
    } else {
        descriptions.push(`in the outer reaches of its solar system`);
    }
    
    // Surface description
    if (type === 'gas') {
        descriptions.push(`Its atmosphere of ${atmosphere.toLowerCase()} swirls with massive storm systems, and its ${terrain.toLowerCase()} dominate the visible surface.`);
    } else {
        descriptions.push(`The surface features ${terrain.toLowerCase()} terrain beneath a ${atmosphere.toLowerCase()} atmosphere.`);
    }
    
    // Additional flavor
    if (temperature > 400) {
        descriptions.push(`Surface conditions are extreme, with temperatures hot enough to melt lead.`);
    } else if (temperature > 250 && temperature < 350 && type === 'terrestrial') {
        descriptions.push(`Conditions may be suitable for liquid water and potentially life.`);
    } else if (temperature < 100) {
        descriptions.push(`The extreme cold has locked most volatiles into solid ice.`);
    }
    
    return descriptions.join(' ');
}

/**
 * Generate a single planet with procedural properties
 */
export function generatePlanet(random, orbitIndex, starSeed) {
    const distance = 0.5 + (orbitIndex * 0.8) + randomFloat(random, 0, 0.4);
    
    // Determine planet type based on distance (inner = terrestrial, outer = gas/ice)
    let type;
    if (distance < 2.5) {
        type = 'terrestrial';
    } else if (distance < 4.5) {
        type = random() < 0.7 ? 'gas' : 'terrestrial';
    } else {
        type = random() < 0.5 ? 'gas' : 'ice';
    }
    
    // Size based on type
    let size;
    if (type === 'gas') {
        size = randomFloat(random, 40, 80);
    } else if (type === 'ice') {
        size = randomFloat(random, 15, 35);
    } else {
        size = randomFloat(random, 20, 50);
    }
    
    // Temperature based on distance (inverse square law approximation)
    const baseTemp = 600 / (distance * distance);
    const temperature = Math.round(baseTemp + randomFloat(random, -50, 50));
    
    // Orbital period (simplified Kepler's third law)
    const orbitalPeriod = Math.round(Math.pow(distance, 1.5) * 365);
    
    const atmosphere = generateAtmosphere(random, type, temperature);
    const terrain = generateTerrain(random, type, temperature);
    const color = generatePlanetColor(random, type, temperature);
    const name = generatePlanetName(random);
    
    const planet = {
        name,
        type,
        size,
        distance,
        temperature,
        orbitalPeriod,
        atmosphere,
        terrain,
        color,
        angle: randomFloat(random, 0, Math.PI * 2) // Starting position in orbit
    };
    
    planet.description = generateDescription(planet);
    
    return planet;
}

/**
 * Generate a complete solar system
 */
export function generateSolarSystem(seed = 42) {
    const random = createSeededRandom(seed);
    const planetCount = randomInt(random, 4, 8);
    
    const system = {
        seed,
        star: {
            name: 'Sol ' + seed,
            radius: 50,
            color: { r: 255, g: 230, b: 150 }
        },
        planets: []
    };
    
    for (let i = 0; i < planetCount; i++) {
        system.planets.push(generatePlanet(random, i, seed));
    }
    
    return system;
}
