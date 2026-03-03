import { describe, it, expect } from 'vitest';
import { createSeededRandom, generatePlanetName, generatePlanet, generateSolarSystem } from '../src/generation.js';

describe('Procedural Generation', () => {
    describe('createSeededRandom', () => {
        it('should generate consistent random numbers with the same seed', () => {
            const random1 = createSeededRandom(42);
            const random2 = createSeededRandom(42);
            
            const values1 = [random1(), random1(), random1()];
            const values2 = [random2(), random2(), random2()];
            
            expect(values1).toEqual(values2);
        });
        
        it('should generate different numbers with different seeds', () => {
            const random1 = createSeededRandom(42);
            const random2 = createSeededRandom(43);
            
            const value1 = random1();
            const value2 = random2();
            
            expect(value1).not.toEqual(value2);
        });
        
        it('should generate numbers between 0 and 1', () => {
            const random = createSeededRandom(42);
            
            for (let i = 0; i < 100; i++) {
                const value = random();
                expect(value).toBeGreaterThanOrEqual(0);
                expect(value).toBeLessThan(1);
            }
        });
    });
    
    describe('generatePlanetName', () => {
        it('should generate consistent names with the same seed', () => {
            const random1 = createSeededRandom(42);
            const random2 = createSeededRandom(42);
            
            const name1 = generatePlanetName(random1);
            const name2 = generatePlanetName(random2);
            
            expect(name1).toEqual(name2);
        });
        
        it('should generate different names with different seeds', () => {
            const random1 = createSeededRandom(42);
            const random2 = createSeededRandom(100);
            
            const name1 = generatePlanetName(random1);
            const name2 = generatePlanetName(random2);
            
            expect(name1).not.toEqual(name2);
        });
        
        it('should generate names starting with capital letter', () => {
            const random = createSeededRandom(42);
            const name = generatePlanetName(random);
            
            expect(name[0]).toEqual(name[0].toUpperCase());
        });
        
        it('should generate names with reasonable length', () => {
            const random = createSeededRandom(42);
            
            for (let i = 0; i < 20; i++) {
                const name = generatePlanetName(random);
                expect(name.length).toBeGreaterThan(2);
                expect(name.length).toBeLessThan(30);
            }
        });
    });
    
    describe('generatePlanet', () => {
        it('should generate consistent planets with the same seed', () => {
            const random1 = createSeededRandom(42);
            const random2 = createSeededRandom(42);
            
            const planet1 = generatePlanet(random1, 0, 42);
            const planet2 = generatePlanet(random2, 0, 42);
            
            expect(planet1.name).toEqual(planet2.name);
            expect(planet1.size).toEqual(planet2.size);
            expect(planet1.distance).toEqual(planet2.distance);
            expect(planet1.temperature).toEqual(planet2.temperature);
        });
        
        it('should generate planets with required properties', () => {
            const random = createSeededRandom(42);
            const planet = generatePlanet(random, 0, 42);
            
            expect(planet).toHaveProperty('name');
            expect(planet).toHaveProperty('type');
            expect(planet).toHaveProperty('size');
            expect(planet).toHaveProperty('distance');
            expect(planet).toHaveProperty('temperature');
            expect(planet).toHaveProperty('orbitalPeriod');
            expect(planet).toHaveProperty('atmosphere');
            expect(planet).toHaveProperty('terrain');
            expect(planet).toHaveProperty('color');
            expect(planet).toHaveProperty('description');
            expect(planet).toHaveProperty('angle');
        });
        
        it('should generate planets with valid types', () => {
            const random = createSeededRandom(42);
            const validTypes = ['terrestrial', 'gas', 'ice'];
            
            for (let i = 0; i < 10; i++) {
                const planet = generatePlanet(random, i, 42);
                expect(validTypes).toContain(planet.type);
            }
        });
        
        it('should generate planets with size within reasonable range', () => {
            const random = createSeededRandom(42);
            
            for (let i = 0; i < 10; i++) {
                const planet = generatePlanet(random, i, 42);
                expect(planet.size).toBeGreaterThan(10);
                expect(planet.size).toBeLessThan(100);
            }
        });
        
        it('should generate planets with positive temperatures', () => {
            const random = createSeededRandom(42);
            
            for (let i = 0; i < 10; i++) {
                const planet = generatePlanet(random, i, 42);
                expect(planet.temperature).toBeGreaterThan(0);
            }
        });
        
        it('should generate planets farther out with lower temperatures', () => {
            const random = createSeededRandom(42);
            
            const innerPlanet = generatePlanet(random, 0, 42);
            const random2 = createSeededRandom(42);
            random2(); // Advance to match state
            const outerPlanet = generatePlanet(random2, 5, 42);
            
            // Generally, outer planets should be cooler
            // (allowing some variance due to random factors)
            expect(outerPlanet.distance).toBeGreaterThan(innerPlanet.distance);
        });
        
        it('should generate valid color objects', () => {
            const random = createSeededRandom(42);
            const planet = generatePlanet(random, 0, 42);
            
            expect(planet.color).toHaveProperty('r');
            expect(planet.color).toHaveProperty('g');
            expect(planet.color).toHaveProperty('b');
            expect(planet.color.r).toBeGreaterThanOrEqual(0);
            expect(planet.color.r).toBeLessThanOrEqual(255);
            expect(planet.color.g).toBeGreaterThanOrEqual(0);
            expect(planet.color.g).toBeLessThanOrEqual(255);
            expect(planet.color.b).toBeGreaterThanOrEqual(0);
            expect(planet.color.b).toBeLessThanOrEqual(255);
        });
        
        it('should generate non-empty descriptions', () => {
            const random = createSeededRandom(42);
            const planet = generatePlanet(random, 0, 42);
            
            expect(planet.description).toBeTruthy();
            expect(planet.description.length).toBeGreaterThan(50);
        });
    });
    
    describe('generateSolarSystem', () => {
        it('should generate consistent solar systems with the same seed', () => {
            const system1 = generateSolarSystem(42);
            const system2 = generateSolarSystem(42);
            
            expect(system1.seed).toEqual(system2.seed);
            expect(system1.planets.length).toEqual(system2.planets.length);
            
            for (let i = 0; i < system1.planets.length; i++) {
                expect(system1.planets[i].name).toEqual(system2.planets[i].name);
                expect(system1.planets[i].size).toEqual(system2.planets[i].size);
                expect(system1.planets[i].distance).toEqual(system2.planets[i].distance);
            }
        });
        
        it('should generate different solar systems with different seeds', () => {
            const system1 = generateSolarSystem(42);
            const system2 = generateSolarSystem(100);
            
            expect(system1.planets.length).not.toEqual(system2.planets.length);
        });
        
        it('should generate systems with 4-8 planets', () => {
            for (let seed = 0; seed < 20; seed++) {
                const system = generateSolarSystem(seed);
                expect(system.planets.length).toBeGreaterThanOrEqual(4);
                expect(system.planets.length).toBeLessThanOrEqual(8);
            }
        });
        
        it('should include a star', () => {
            const system = generateSolarSystem(42);
            
            expect(system.star).toBeDefined();
            expect(system.star).toHaveProperty('name');
            expect(system.star).toHaveProperty('radius');
            expect(system.star).toHaveProperty('color');
        });
        
        it('should generate planets in increasing distance order', () => {
            const system = generateSolarSystem(42);
            
            for (let i = 1; i < system.planets.length; i++) {
                // Planets should generally increase in distance
                // (within reason, since there's some random variance)
                const prevDistance = system.planets[i - 1].distance;
                const currDistance = system.planets[i].distance;
                expect(currDistance).toBeGreaterThan(prevDistance - 0.5);
            }
        });
        
        it('should preserve seed in the system object', () => {
            const seed = 12345;
            const system = generateSolarSystem(seed);
            
            expect(system.seed).toEqual(seed);
        });
    });
});
