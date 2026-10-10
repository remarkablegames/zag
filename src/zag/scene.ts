import type { Color, Vector2 } from 'littlejsengine';
import {
  cameraScale,
  drawCircle,
  drawEllipse,
  drawLine,
  hsl,
  lerp,
  mainCanvasSize,
  rand,
  setCameraPos,
  setCanvasClearColor,
  timeDelta,
  vec2,
} from 'littlejsengine';

import { ZagParticles } from './particles';
import { PATH_WIDTH, ZagPath } from './path';
import { turnSound } from './sounds';

const BALL_RADIUS = 0.36;
export const BALL_DIAMETER = BALL_RADIUS * 2;

/** How far the ball center can drift from the path center before falling. */
export const PATH_TOLERANCE = PATH_WIDTH / 2 - BALL_RADIUS * 0.4;

/** Taps within this distance of the next corner snap onto it. */
const CORNER_SNAP_DISTANCE = 0.8;

export const BASE_SPEED = 4.5;

const TRAIL_LIFE = 0.35;
const TRAIL_INTERVAL = 0.03;

const PATH_AHEAD = 4;
const PATH_BEHIND = 6;

/** How far the path hue walks per segment; small steps read as a rainbow. */
const HUE_STEP = 0.05;

/** The near grid the ball races over, in world units. */
const NEAR_STEP = 3;
const NEAR_DOT_SIZE = 0.08;
const NEAR_DOT_ALPHA = 0.06;

/** The far grid trailing behind it, sparser and softer for a sense of depth. */
const FAR_PARALLAX = 0.5;
const FAR_STEP = 6;
const FAR_DOT_SIZE = 0.22;
const FAR_DOT_ALPHA = 0.045;

/** Saturation and resting lightness of the backdrop. */
const BACKGROUND_SATURATION = 0.45;
const BACKGROUND_LIGHTNESS = 0.1;

/** Lightness a finished run settles the backdrop to. */
const BACKGROUND_DIM_LIGHTNESS = 0.05;

/** How far the backdrop's hue walks per milestone. */
const BACKGROUND_HUE_STEP = 0.08;

/** How quickly the backdrop settles onto each milestone's hue, per second. */
const BACKGROUND_HUE_LERP = 6;

/** Seconds a finished run takes to settle the backdrop into its dim. */
const BACKGROUND_DIM_TIME = 0.4;

/** How long a camera shake takes to die away, in seconds. */
const SHAKE_TIME = 0.35;

/** How hard the fall shakes the camera, in world units. */
const FALL_SHAKE = 0.4;

/** Camera shake is a common motion trigger, so players can turn it off. */
const MOTION_REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

interface TrailPoint {
  pos: Vector2;
  age: number;
}

/**
 * The scene shared by the game and the cover: it owns the ball, path,
 * camera and trail, renders everything, and leaves the motion rules
 * (input and falling vs an autopilot) to subclasses.
 */
export abstract class ZagScene {
  protected readonly path = new ZagPath();
  protected readonly particles = new ZagParticles();
  private readonly trail: TrailPoint[] = [];

  protected ball = vec2();
  protected direction = vec2(1, 0);
  protected cameraPos = vec2();
  protected segmentIndex = 0;
  private baseHue = rand();
  private trailTimer = 0;
  private turnPulse = 0;
  private rollAngle = 0;
  private shakeTime = 0;
  private shakeStrength = 0;
  private backgroundHue = 0;
  private backgroundHueTarget = 0;
  private backgroundDim = 0;
  private backgroundDimmed = false;
  private readonly hueStep: number;

  constructor(hueStep = HUE_STEP) {
    this.hueStep = hueStep;
  }

  init(): void {
    this.reset();
  }

  update(): void {
    this.updateMotion();
    this.turnPulse = Math.max(0, this.turnPulse - 8 * timeDelta);
    this.updateBackground();
    this.updateCamera();
    this.updateTrail();
  }

  render(): void {
    this.renderBackground();
    this.renderPath();
    this.renderTrail();
    this.renderBall();
  }

  /** Move the ball one frame along its current direction. */
  protected moveBall(speed: number): void {
    const travelled = speed * timeDelta;
    this.ball = this.ball.add(this.direction.scale(travelled));
    this.roll(travelled);
  }

  /** Turn 90 degrees onto the next segment. */
  protected turn(): void {
    // small assist: snap onto the corner when turning close to it
    const corner = this.path.corners[this.segmentIndex + 1];
    if (this.ball.distance(corner) <= CORNER_SNAP_DISTANCE)
      this.ball.setFrom(corner);

    // the path alternates axes, so toggle between moving right and up
    const goingRight = this.direction.x > 0;
    this.direction.set(goingRight ? 0 : 1, goingRight ? 1 : 0);
    this.turnPulse = 1;
    // burst where the ball actually turned, fanned into its new heading
    this.particles.turn(
      this.ball,
      this.pathHue(this.segmentIndex + 1),
      Math.atan2(this.direction.y, this.direction.x),
    );
    turnSound.play();
  }

  /** Move to the next segment, generating more path when it runs low. */
  protected advanceSegment(): void {
    this.segmentIndex++;
    // keep the path generated a few segments ahead of the ball
    while (this.segmentIndex + PATH_AHEAD >= this.path.segmentCount)
      this.path.extend();
  }

  /** Sparkle where the ball crossed a corner, in the path's own color. */
  protected scorePoint(pos: Vector2): void {
    this.particles.score(pos, this.pathHue(this.segmentIndex));
  }

  /** Walk the backdrop onto the next hue, for a milestone. */
  protected milestone(): void {
    this.backgroundHueTarget += BACKGROUND_HUE_STEP;
    this.particles.milestone(this.ball, this.backdropHue());
  }

  /** Burst apart and shake the camera, for a ball that left the path. */
  protected fallApart(): void {
    this.particles.fall(this.ball, this.baseHue);
    this.shake(FALL_SHAKE);
  }

  /** Settle the backdrop to its dim, for a run that has ended. */
  protected dimBackground(): void {
    this.backgroundDimmed = true;
  }

  /** Hue the backdrop is settling on, so the score can be tinted to match. */
  protected currentHue(): number {
    return this.backgroundHueTarget % 1;
  }

  /**
   * Hue the backdrop starts a run on, overridden by the cover so a
   * capture of it keeps one stable palette.
   */
  protected startingBackgroundHue(): number {
    return this.baseHue;
  }

  /** Start a fresh scene at the origin. */
  protected reset(): void {
    this.path.reset();
    this.path.extend(PATH_AHEAD + 1);
    this.ball.setFrom(this.path.corners[0]);
    this.direction.set(1, 0);
    this.segmentIndex = 0;
    this.turnPulse = 0;
    this.rollAngle = 0;
    this.shakeTime = 0;
    this.baseHue = rand();
    this.backgroundHue = this.startingBackgroundHue();
    this.backgroundHueTarget = this.backgroundHue;
    this.backgroundDim = 0;
    this.backgroundDimmed = false;
    this.trail.length = 0;
    this.cameraPos.setFrom(this.ball);
    setCameraPos(this.cameraPos);
    setCanvasClearColor(this.backgroundColor());
  }

  /** Advance the ball and everything tied to it each frame. */
  protected abstract updateMotion(): void;

  /** True while the ball moves, so the trail keeps flowing. */
  protected isMoving(): boolean {
    return true;
  }

  /** Turn the ball's mark by the distance it covered, as a wheel would. */
  protected roll(distance: number): void {
    // one turn per ball width: fast enough to read as rolling, slow enough not to blur
    this.rollAngle -= distance / BALL_DIAMETER;
  }

  private updateCamera(): void {
    // keep the ball down and to the left so the upcoming path is visible
    const target = this.ball.add(vec2(2.5, 2));
    const lerpFactor = 1 - Math.exp(-8 * timeDelta);
    this.cameraPos = this.cameraPos.lerp(target, lerpFactor);
    // the shake nudges only this frame's camera, never the smoothed follow
    setCameraPos(this.cameraPos.add(this.shakeOffset()));
  }

  /** Nudge the camera by a random amount that fades to nothing. */
  private shakeOffset(): Vector2 {
    this.shakeTime = Math.max(0, this.shakeTime - timeDelta);
    if (!this.shakeTime) return vec2();
    return vec2(rand(-1, 1), rand(-1, 1)).scale(
      (this.shakeStrength * this.shakeTime) / SHAKE_TIME,
    );
  }

  /** Shake the camera, for a hit that costs the player nothing to read. */
  private shake(strength: number): void {
    if (MOTION_REDUCED) return;
    this.shakeTime = SHAKE_TIME;
    this.shakeStrength = Math.max(this.shakeStrength, strength);
  }

  private updateBackground(): void {
    // the backdrop walks onto each milestone's hue, rather than flashing
    const lerpFactor = 1 - Math.exp(-BACKGROUND_HUE_LERP * timeDelta);
    this.backgroundHue = lerp(
      this.backgroundHue,
      this.backgroundHueTarget,
      lerpFactor,
    );
    // only a finished run dims the backdrop, and it eases in rather than snapping
    if (this.backgroundDimmed)
      this.backgroundDim = Math.min(
        1,
        this.backgroundDim + timeDelta / BACKGROUND_DIM_TIME,
      );
    // set before the frame clears the canvas, so the backdrop never lags the walk
    setCanvasClearColor(this.backgroundColor());
  }

  /** The backdrop, walked to its milestone hue and dimmed by a finished run. */
  private backgroundColor(): Color {
    return hsl(
      this.backdropHue(),
      BACKGROUND_SATURATION,
      lerp(BACKGROUND_LIGHTNESS, BACKGROUND_DIM_LIGHTNESS, this.backgroundDim),
    );
  }

  /** The hue the backdrop sits at now, kept inside hsl's 0 to 1 range. */
  private backdropHue(): number {
    return this.backgroundHue % 1;
  }

  private updateTrail(): void {
    const dt = timeDelta;
    for (const point of this.trail) point.age += dt;
    while (this.trail.length && this.trail[0].age > TRAIL_LIFE)
      this.trail.shift();

    this.trailTimer += dt;
    if (this.isMoving() && this.trailTimer >= TRAIL_INTERVAL) {
      this.trailTimer = 0;
      this.trail.push({ pos: this.ball.copy(), age: 0 });
    }
  }

  private pathHue(segment: number): number {
    return (this.baseHue + this.hueStep * segment) % 1;
  }

  private pathColor(segment: number): Color {
    // the traveled part of the path dims behind the ball
    const light = segment < this.segmentIndex ? 0.32 : 0.55;
    return hsl(this.pathHue(segment), 0.55, light);
  }

  private renderBackground(): void {
    this.renderDotGrid(1, NEAR_STEP, NEAR_DOT_SIZE, NEAR_DOT_ALPHA);
    this.renderDotGrid(FAR_PARALLAX, FAR_STEP, FAR_DOT_SIZE, FAR_DOT_ALPHA);
  }

  /**
   * A grid of faint dots anchored to a fraction of the camera's
   * movement: 1 keeps up with the world, less trails behind it for a
   * sense of depth.
   */
  private renderDotGrid(
    parallax: number,
    step: number,
    dotSize: number,
    alpha: number,
  ): void {
    const center = this.cameraPos.scale(parallax);
    const half = mainCanvasSize.scale(0.5 / cameraScale);
    const fromX = Math.floor((center.x - half.x) / step) * step;
    const fromY = Math.floor((center.y - half.y) / step) * step;
    const color = hsl(this.backdropHue(), 0.4, 1, alpha);

    for (let x = fromX; x < center.x + half.x; x += step)
      for (let y = fromY; y < center.y + half.y; y += step)
        drawCircle(vec2(x, y), dotSize, color);
  }

  private renderPath(): void {
    const first = Math.max(0, this.segmentIndex - PATH_BEHIND);
    const last = Math.min(
      this.path.segmentCount - 1,
      this.segmentIndex + PATH_AHEAD,
    );

    for (let i = first; i <= last; i++) {
      const a = this.path.corners[i];
      const b = this.path.corners[i + 1];
      const color = this.pathColor(i);

      // shadow under the path gives it some depth
      const shadow = vec2(0.12, -0.18);
      drawLine(
        a.add(shadow),
        b.add(shadow),
        PATH_WIDTH + 0.15,
        hsl(0, 0, 0, 0.25),
      );

      drawLine(a, b, PATH_WIDTH, color);
      // round the corners where segments meet
      drawCircle(a, PATH_WIDTH, color);
      drawCircle(b, PATH_WIDTH, color);
    }
  }

  private renderTrail(): void {
    for (const point of this.trail) {
      const t = 1 - point.age / TRAIL_LIFE;
      const size = BALL_DIAMETER * t;
      drawCircle(point.pos, size, hsl(this.baseHue, 0.5, 0.7, 0.25 * t));
    }
  }

  protected renderBall(): void {
    // squash along the movement axis right after each turn
    const squash = 0.3 * this.turnPulse;
    const size =
      this.direction.y > 0
        ? vec2(BALL_DIAMETER * (1 - squash), BALL_DIAMETER * (1 + squash))
        : vec2(BALL_DIAMETER * (1 + squash), BALL_DIAMETER * (1 - squash));
    this.drawBall(size);
  }

  /** Soft shadow, the ball itself, then a mark so its roll reads as motion. */
  protected drawBall(size: Vector2): void {
    drawEllipse(this.ball.add(vec2(0.1, -0.14)), size, hsl(0, 0, 0, 0.25));
    drawEllipse(
      this.ball,
      size,
      hsl(this.baseHue, 0.15, 0.97),
      0,
      0.05,
      hsl(0, 0, 0.3),
    );
    // an axle mark across the ball, kept inside it even at the squash's widest
    const mark = vec2(BALL_DIAMETER * 0.26, BALL_DIAMETER * 0.6);
    drawEllipse(this.ball, mark, hsl(this.baseHue, 0.35, 0.78), this.rollAngle);
    drawCircle(this.ball, BALL_DIAMETER * 0.12, hsl(this.baseHue, 0.35, 0.78));
  }
}
