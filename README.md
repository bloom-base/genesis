# genesis

A living digital universe simulation — built by agents, shaped by humans.

## What is this?

Genesis is an ever-expanding digital universe. It starts as nothing. Agents build it. Humans dream it.

Suggest an idea — weather systems, tidal forces, evolving creatures, underground caverns, trade routes between civilizations — and agents build it into the simulation. There is no finish line. The universe just keeps growing.

## How to contribute

Visit [bloomit.ai](https://bloomit.ai) and talk to the agent. Tell it what the universe should have next.

## Current Features

### Procedurally Generated Solar Systems
- **Interactive Planets**: Click any planet to explore its details
- **Procedural Generation**: Each solar system is generated using a seeded random algorithm for consistency
- **Planet Properties**: Size, distance, orbital period, temperature, atmosphere, and terrain type
- **Planet Types**: Terrestrial, gas giants, and ice worlds with appropriate characteristics
- **Visual Design**: Beautiful canvas-based rendering with animated orbits and glowing effects

### Planet Detail Panel
When you click a planet, a detail panel slides in showing:
- **Planet Name**: Procedurally generated unique names
- **Description**: Dynamic text describing the planet's environment and characteristics
- **Key Statistics**:
  - Diameter (in km and Earth ratios)
  - Distance from star (in AU and km)
  - Orbital period (in Earth days/years)
  - Surface temperature (in Kelvin and Celsius)
  - Atmospheric composition
  - Terrain type

## Getting Started

### Prerequisites
- A modern web browser with JavaScript enabled
- (Optional) Node.js and npm for running tests

### Running the Application

#### Simple Method (No Dependencies)
Just open `index.html` in your web browser:
```bash
# On Mac/Linux:
open index.html

# Or use Python's built-in server:
python3 -m http.server 8000
# Then visit http://localhost:8000
```

#### With npm
```bash
npm install
npm run dev
```

Then open your browser to `http://localhost:8000`

### Running Tests
```bash
npm install
npm test
```

## Usage

1. **Explore the Solar System**: The canvas displays a procedurally generated solar system with a star and multiple planets
2. **Hover Over Planets**: Move your mouse over planets to see their names and get visual feedback
3. **Click to Learn More**: Click any planet to open the detail panel with comprehensive information
4. **Close the Panel**: Click the × button, the Dismiss button, or press ESC to close the detail panel

## Technical Architecture

### File Structure
```
genesis/
├── index.html              # Main HTML structure
├── styles.css             # All styling and animations
├── src/
│   ├── app.js            # Main application entry point
│   ├── generation.js     # Procedural generation algorithms
│   ├── renderer.js       # Canvas rendering and animation
│   └── detailPanel.js    # Detail panel controller
├── tests/
│   ├── generation.test.js    # Tests for procedural generation
│   ├── renderer.test.js      # Tests for rendering logic
│   └── detailPanel.test.js   # Tests for detail panel
└── package.json          # Project configuration
```

### Key Technologies
- **Vanilla JavaScript**: No frameworks, pure ES6+ modules
- **Canvas API**: For rendering the solar system
- **Seeded Random Generation**: Deterministic procedural generation using Mulberry32 algorithm
- **CSS3**: Modern styling with gradients, animations, and backdrop filters
- **Vitest**: Fast unit testing framework

### Procedural Generation
The solar system generation uses a seeded random number generator to ensure:
- **Consistency**: The same seed always produces the same solar system
- **Variety**: Different seeds create unique systems
- **Realism**: Planet properties follow real-world physics approximations
  - Temperature decreases with distance (inverse square law)
  - Gas giants more common in outer regions
  - Orbital periods follow Kepler's third law approximation

## How to Contribute

Visit [bloomit.ai](https://bloomit.ai) and talk to the agent. Tell it what the universe should have next.

Ideas for expansion:
- Multiple solar systems to explore
- Moons orbiting planets
- Asteroid belts and comets
- Time controls (speed up/slow down orbit animations)
- Planet zoom view with surface details
- Save/share solar systems by seed
- Procedural civilizations or life forms
- Resource systems and trade routes
