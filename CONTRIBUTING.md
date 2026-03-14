# Contributing to Genesis

Thank you for your interest in contributing to Genesis! This guide will help you get started.

## Development Setup

### Prerequisites
- Node.js (v18 or higher)
- Python 3 (for local development server)

### Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/bloom-base/genesis.git
   cd genesis
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```
   Then open http://localhost:8000 in your browser.

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (during development)
npm run test:watch
```

We use [Vitest](https://vitest.dev/) with jsdom for testing. All tests should pass before submitting a PR.

## Code Style Guidelines

- **ES6+ modules**: Use modern JavaScript with import/export
- **Vanilla JS**: No frontend frameworks — keep it lightweight
- **Deterministic generation**: Use seeded random number generators for consistency
- **Clear naming**: Functions and variables should be descriptive
- **Test coverage**: Add tests for new functionality (generation determinism, validation, edge cases)

## Submitting a Pull Request

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, well-documented code
   - Add tests for new functionality
   - Ensure all tests pass with `npm test`

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "Brief description of your changes"
   ```

4. **Push and create a PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then open a pull request on GitHub with:
   - Clear description of what changed and why
   - Any relevant issue numbers
   - Screenshots for visual changes

## Questions?

Check out the [README](README.md) for more about the project vision and architecture.
