/**
 * Camera Animation Module
 * Handles smooth zoom in/out animations using requestAnimationFrame
 */

/**
 * Easing function for smooth animation (ease-in-out cubic)
 * @param {number} t - Progress from 0 to 1
 * @returns {number} Eased value from 0 to 1
 */
function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Camera state manager with animation support
 */
export class CameraAnimator {
  constructor() {
    this.camera = {
      x: 0,
      y: 0,
      scale: 1
    };
    this.isAnimating = false;
    this.animationId = null;
    this.onAnimationComplete = null;
  }

  /**
   * Get current camera state
   * @returns {{x: number, y: number, scale: number}}
   */
  getCamera() {
    return { ...this.camera };
  }

  /**
   * Check if animation is in progress
   * @returns {boolean}
   */
  isAnimationInProgress() {
    return this.isAnimating;
  }

  /**
   * Cancel any ongoing animation
   */
  cancelAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isAnimating = false;
  }

  /**
   * Animate camera to target position and scale
   * @param {Object} target - Target camera state
   * @param {number} target.x - Target x position
   * @param {number} target.y - Target y position
   * @param {number} target.scale - Target scale
   * @param {number} duration - Animation duration in milliseconds
   * @param {Function} onUpdate - Callback called each frame with current camera state
   * @param {Function} onComplete - Callback called when animation completes
   */
  animateTo(target, duration = 800, onUpdate = null, onComplete = null) {
    // Validate inputs
    if (!target || typeof target !== 'object') {
      console.error('CameraAnimator.animateTo: target must be an object');
      return;
    }
    
    if (typeof target.x !== 'number' || !isFinite(target.x) ||
        typeof target.y !== 'number' || !isFinite(target.y) ||
        typeof target.scale !== 'number' || !isFinite(target.scale)) {
      console.error('CameraAnimator.animateTo: target.x, target.y, and target.scale must be finite numbers');
      return;
    }
    
    if (target.scale <= 0) {
      console.error('CameraAnimator.animateTo: target.scale must be positive');
      return;
    }
    
    if (duration <= 0) {
      console.error('CameraAnimator.animateTo: duration must be positive');
      return;
    }

    // Cancel any existing animation
    this.cancelAnimation();

    const start = {
      x: this.camera.x,
      y: this.camera.y,
      scale: this.camera.scale
    };

    const startTime = performance.now();
    this.isAnimating = true;
    this.onAnimationComplete = onComplete;

    const animate = (currentTime) => {
      try {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeInOutCubic(progress);

        // Interpolate camera values
        this.camera.x = start.x + (target.x - start.x) * easedProgress;
        this.camera.y = start.y + (target.y - start.y) * easedProgress;
        this.camera.scale = start.scale + (target.scale - start.scale) * easedProgress;

        // Call update callback
        if (onUpdate) {
          try {
            onUpdate(this.getCamera());
          } catch (error) {
            console.error('CameraAnimator: Error in onUpdate callback:', error);
          }
        }

        // Continue or complete animation
        if (progress < 1) {
          this.animationId = requestAnimationFrame(animate);
        } else {
          this.isAnimating = false;
          this.animationId = null;
          if (this.onAnimationComplete) {
            try {
              this.onAnimationComplete();
            } catch (error) {
              console.error('CameraAnimator: Error in onComplete callback:', error);
            }
            this.onAnimationComplete = null;
          }
        }
      } catch (error) {
        console.error('CameraAnimator: Error during animation:', error);
        this.isAnimating = false;
        this.animationId = null;
        this.onAnimationComplete = null;
      }
    };

    this.animationId = requestAnimationFrame(animate);
  }

  /**
   * Zoom in to focus on a planet
   * @param {Object} planet - Planet object with x, y, radius properties
   * @param {number} canvasWidth - Canvas width in pixels
   * @param {number} canvasHeight - Canvas height in pixels
   * @param {number} duration - Animation duration in milliseconds
   * @param {Function} onUpdate - Callback called each frame
   * @param {Function} onComplete - Callback called when animation completes
   */
  zoomToPlanet(planet, canvasWidth, canvasHeight, duration = 800, onUpdate = null, onComplete = null) {
    // Validate planet object
    if (!planet || typeof planet !== 'object') {
      console.error('CameraAnimator.zoomToPlanet: planet must be an object');
      return;
    }
    
    if (typeof planet.x !== 'number' || !isFinite(planet.x) ||
        typeof planet.y !== 'number' || !isFinite(planet.y) ||
        typeof planet.radius !== 'number' || !isFinite(planet.radius) || planet.radius <= 0) {
      console.error('CameraAnimator.zoomToPlanet: planet must have valid x, y, and radius properties');
      return;
    }
    
    // Validate canvas dimensions
    if (typeof canvasWidth !== 'number' || !isFinite(canvasWidth) || canvasWidth <= 0 ||
        typeof canvasHeight !== 'number' || !isFinite(canvasHeight) || canvasHeight <= 0) {
      console.error('CameraAnimator.zoomToPlanet: canvasWidth and canvasHeight must be positive numbers');
      return;
    }

    // Calculate target scale to show planet nicely (zoom to ~3x the planet's size)
    const targetScale = Math.min(
      canvasWidth / (planet.radius * 8),
      canvasHeight / (planet.radius * 8),
      3.0 // Maximum zoom level
    );

    // Calculate target position to center the planet
    const targetX = -planet.x * targetScale + canvasWidth / 2;
    const targetY = -planet.y * targetScale + canvasHeight / 2;

    this.animateTo(
      { x: targetX, y: targetY, scale: targetScale },
      duration,
      onUpdate,
      onComplete
    );
  }

  /**
   * Zoom out to system view
   * @param {number} canvasWidth - Canvas width in pixels
   * @param {number} canvasHeight - Canvas height in pixels
   * @param {number} duration - Animation duration in milliseconds
   * @param {Function} onUpdate - Callback called each frame
   * @param {Function} onComplete - Callback called when animation completes
   */
  zoomToSystemView(canvasWidth, canvasHeight, duration = 800, onUpdate = null, onComplete = null) {
    // Validate canvas dimensions (optional parameters, but validate if provided)
    if (canvasWidth !== undefined && (typeof canvasWidth !== 'number' || !isFinite(canvasWidth) || canvasWidth <= 0)) {
      console.error('CameraAnimator.zoomToSystemView: canvasWidth must be a positive number if provided');
      return;
    }
    
    if (canvasHeight !== undefined && (typeof canvasHeight !== 'number' || !isFinite(canvasHeight) || canvasHeight <= 0)) {
      console.error('CameraAnimator.zoomToSystemView: canvasHeight must be a positive number if provided');
      return;
    }

    // Reset to default view (centered, scale 1)
    this.animateTo(
      { x: 0, y: 0, scale: 1 },
      duration,
      onUpdate,
      onComplete
    );
  }

  /**
   * Immediately set camera position without animation
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} scale - Scale
   */
  setCamera(x, y, scale) {
    // Validate inputs
    if (typeof x !== 'number' || !isFinite(x)) {
      console.error('CameraAnimator.setCamera: x must be a finite number');
      return;
    }
    
    if (typeof y !== 'number' || !isFinite(y)) {
      console.error('CameraAnimator.setCamera: y must be a finite number');
      return;
    }
    
    if (typeof scale !== 'number' || !isFinite(scale) || scale <= 0) {
      console.error('CameraAnimator.setCamera: scale must be a positive finite number');
      return;
    }

    this.cancelAnimation();
    this.camera.x = x;
    this.camera.y = y;
    this.camera.scale = scale;
  }
}
