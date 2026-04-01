/**
 * Genesis — Item catalog.
 *
 * Every item definition lives here.  Add new items by extending ITEMS.
 */

export const CATEGORIES = {
    WEAPON:     'weapon',
    CONSUMABLE: 'consumable',
    MATERIAL:   'material',
    SPELL:      'spell',
    TOOL:       'tool',
};

export const RARITIES = {
    COMMON:    'common',
    UNCOMMON:  'uncommon',
    RARE:      'rare',
    EPIC:      'epic',
    LEGENDARY: 'legendary',
};

/**
 * @typedef {{
 *   id:          string,
 *   name:        string,
 *   icon:        string,
 *   category:    string,
 *   rarity:      string,
 *   stackable:   boolean,
 *   maxStack?:   number,
 *   description: string,
 * }} ItemDef
 */

/** @type {Record<string, ItemDef>} */
export const ITEMS = {

    // ── Weapons ──────────────────────────────────────────────────────────────

    iron_sword: {
        id: 'iron_sword', name: 'Iron Sword', icon: '⚔️',
        category: CATEGORIES.WEAPON, rarity: RARITIES.COMMON,
        stackable: false,
        description: 'A reliable iron blade forged by a village smith.',
    },
    elven_bow: {
        id: 'elven_bow', name: 'Elven Bow', icon: '🏹',
        category: CATEGORIES.WEAPON, rarity: RARITIES.UNCOMMON,
        stackable: false,
        description: 'A graceful bow carved from ancient silverwood.',
    },
    shadow_dagger: {
        id: 'shadow_dagger', name: 'Shadow Dagger', icon: '🗡️',
        category: CATEGORIES.WEAPON, rarity: RARITIES.RARE,
        stackable: false,
        description: 'A blade that drinks in darkness.',
    },
    dragon_lance: {
        id: 'dragon_lance', name: 'Dragon Lance', icon: '🔱',
        category: CATEGORIES.WEAPON, rarity: RARITIES.LEGENDARY,
        stackable: false,
        description: 'Forged from the spine of an ancient dragon.',
    },

    // ── Consumables ──────────────────────────────────────────────────────────

    health_potion: {
        id: 'health_potion', name: 'Health Potion', icon: '🧪',
        category: CATEGORIES.CONSUMABLE, rarity: RARITIES.COMMON,
        stackable: true, maxStack: 99,
        description: 'Restores health when consumed.',
    },
    mana_potion: {
        id: 'mana_potion', name: 'Mana Potion', icon: '💙',
        category: CATEGORIES.CONSUMABLE, rarity: RARITIES.COMMON,
        stackable: true, maxStack: 99,
        description: 'Restores mana when consumed.',
    },
    bread: {
        id: 'bread', name: 'Bread', icon: '🍞',
        category: CATEGORIES.CONSUMABLE, rarity: RARITIES.COMMON,
        stackable: true, maxStack: 20,
        description: 'A simple loaf. Restores a bit of stamina.',
    },
    mushroom: {
        id: 'mushroom', name: 'Forest Mushroom', icon: '🍄',
        category: CATEGORIES.CONSUMABLE, rarity: RARITIES.COMMON,
        stackable: true, maxStack: 30,
        description: 'Found growing in dark glades. Mildly restorative.',
    },
    golden_apple: {
        id: 'golden_apple', name: 'Golden Apple', icon: '🍎',
        category: CATEGORIES.CONSUMABLE, rarity: RARITIES.EPIC,
        stackable: true, maxStack: 5,
        description: 'Imbued with ancient magic. Greatly restores health.',
    },
    torch: {
        id: 'torch', name: 'Torch', icon: '🔦',
        category: CATEGORIES.CONSUMABLE, rarity: RARITIES.COMMON,
        stackable: true, maxStack: 16,
        description: 'Lights the way in dark caverns.',
    },

    // ── Materials ─────────────────────────────────────────────────────────────

    wood: {
        id: 'wood', name: 'Wood', icon: '🪵',
        category: CATEGORIES.MATERIAL, rarity: RARITIES.COMMON,
        stackable: true, maxStack: 64,
        description: 'Chopped from the forests of Genesis.',
    },
    stone: {
        id: 'stone', name: 'Stone', icon: '🪨',
        category: CATEGORIES.MATERIAL, rarity: RARITIES.COMMON,
        stackable: true, maxStack: 64,
        description: 'A rough chunk of rock.',
    },
    iron_ore: {
        id: 'iron_ore', name: 'Iron Ore', icon: '🔩',
        category: CATEGORIES.MATERIAL, rarity: RARITIES.COMMON,
        stackable: true, maxStack: 64,
        description: 'Raw iron, awaiting the forge.',
    },
    crystal: {
        id: 'crystal', name: 'Crystal Shard', icon: '💎',
        category: CATEGORIES.MATERIAL, rarity: RARITIES.RARE,
        stackable: true, maxStack: 32,
        description: 'A fragment of pure magical energy.',
    },
    moonstone: {
        id: 'moonstone', name: 'Moonstone', icon: '🌙',
        category: CATEGORIES.MATERIAL, rarity: RARITIES.EPIC,
        stackable: true, maxStack: 16,
        description: 'Only falls during lunar eclipses.',
    },
    stardust: {
        id: 'stardust', name: 'Stardust', icon: '✨',
        category: CATEGORIES.MATERIAL, rarity: RARITIES.LEGENDARY,
        stackable: true, maxStack: 8,
        description: 'Harvested from fallen stars. Impossibly rare.',
    },

    // ── Spells ────────────────────────────────────────────────────────────────

    fireball: {
        id: 'fireball', name: 'Fireball', icon: '🔥',
        category: CATEGORIES.SPELL, rarity: RARITIES.UNCOMMON,
        stackable: false,
        description: 'Hurls a blazing sphere at your enemies.',
    },
    frost_bolt: {
        id: 'frost_bolt', name: 'Frost Bolt', icon: '❄️',
        category: CATEGORIES.SPELL, rarity: RARITIES.UNCOMMON,
        stackable: false,
        description: 'A lance of ice that slows whatever it hits.',
    },
    lightning: {
        id: 'lightning', name: 'Lightning Strike', icon: '⚡',
        category: CATEGORIES.SPELL, rarity: RARITIES.RARE,
        stackable: false,
        description: 'Calls a bolt from a clear sky.',
    },
    nature_call: {
        id: 'nature_call', name: "Nature's Call", icon: '🌿',
        category: CATEGORIES.SPELL, rarity: RARITIES.UNCOMMON,
        stackable: false,
        description: 'Commune with the living forest.',
    },
    void_rift: {
        id: 'void_rift', name: 'Void Rift', icon: '🌀',
        category: CATEGORIES.SPELL, rarity: RARITIES.LEGENDARY,
        stackable: false,
        description: 'Tears a hole in the fabric of reality.',
    },

    // ── Tools ─────────────────────────────────────────────────────────────────

    pickaxe: {
        id: 'pickaxe', name: 'Pickaxe', icon: '⛏️',
        category: CATEGORIES.TOOL, rarity: RARITIES.COMMON,
        stackable: false,
        description: 'For mining stone and ore.',
    },
    axe: {
        id: 'axe', name: 'Axe', icon: '🪓',
        category: CATEGORIES.TOOL, rarity: RARITIES.COMMON,
        stackable: false,
        description: 'For chopping trees.',
    },
    compass: {
        id: 'compass', name: 'Compass', icon: '🧭',
        category: CATEGORIES.TOOL, rarity: RARITIES.UNCOMMON,
        stackable: false,
        description: 'Always points toward something interesting.',
    },
    map_fragment: {
        id: 'map_fragment', name: 'Map Fragment', icon: '🗺️',
        category: CATEGORIES.TOOL, rarity: RARITIES.UNCOMMON,
        stackable: true, maxStack: 9,
        description: 'Piece together nine to reveal a hidden location.',
    },
};

/**
 * Look up an item definition by id.
 * @param {string} id
 * @returns {ItemDef | null}
 */
export function getItem(id) {
    return ITEMS[id] ?? null;
}
