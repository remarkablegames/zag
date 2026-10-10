import type { Color, Vector2 } from 'littlejsengine';
import {
  cameraScale,
  drawCircle,
  drawEllipse,
  drawLine,
  hsl,
  mainCanvasSize,
  rand,
  setCameraPos,
  timeDelta,
  vec2,
} from 'littlejsengine';

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
  private readonly trail: TrailPoint[] = [];

  protected ball = vec2();
  protected direction = vec2(1, 0);
  protected cameraPos = vec2();
  protected segmentIndex = 0;
  private baseHue = rand();
  private trailTimer = 0;
  private turnPulse = 0;
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
    this.ball = this.ball.add(this.direction.scale(speed * timeDelta));
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
    turnSound.play();
  }

  /** Move to the next segment, generating more path when it runs low. */
  protected advanceSegment(): void {
    this.segmentIndex++;
    // keep the path generated a few segments ahead of the ball
    while (this.segmentIndex + PATH_AHEAD >= this.path.segmentCount)
      this.path.extend();
  }

  /** Start a fresh scene at the origin. */
  protected reset(): void {
    this.path.reset();
    this.path.extend(PATH_AHEAD + 1);
    this.ball.setFrom(this.path.corners[0]);
    this.direction.set(1, 0);
    this.segmentIndex = 0;
    this.turnPulse = 0;
    this.trail.length = 0;
    this.baseHue = rand();
    this.cameraPos.setFrom(this.ball);
    setCameraPos(this.cameraPos);
  }

  /** Advance the ball and everything tied to it each frame. */
  protected abstract updateMotion(): void;

  /** True while the ball moves, so the trail keeps flowing. */
  protected isMoving(): boolean {
    return true;
  }

  private updateCamera(): void {
    // keep the ball down and to the left so the upcoming path is visible
    const target = this.ball.add(vec2(2.5, 2));
    const lerp = 1 - Math.exp(-8 * timeDelta);
    this.cameraPos = this.cameraPos.lerp(target, lerp);
    setCameraPos(this.cameraPos);
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

  private pathColor(segment: number): Color {
    const hue = (this.baseHue + this.hueStep * segment) % 1;
    // the traveled part of the path dims behind the ball
    const light = segment < this.segmentIndex ? 0.32 : 0.55;
    return hsl(hue, 0.55, light);
  }

  private renderBackground(): void {
    // faint dot grid drifting behind the path for a sense of speed
    const half = mainCanvasSize.scale(0.5 / cameraScale);
    const step = 3;
    const fromX = Math.floor((this.cameraPos.x - half.x) / step) * step;
    const fromY = Math.floor((this.cameraPos.y - half.y) / step) * step;
    const color = hsl(this.baseHue, 0.4, 1, 0.06);

    for (let x = fromX; x < this.cameraPos.x + half.x; x += step)
      for (let y = fromY; y < this.cameraPos.y + half.y; y += step)
        drawCircle(vec2(x, y), 0.08, color);
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

  /** Soft shadow, then the ball itself. */
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
  }
}
