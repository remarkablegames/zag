import type { Color, Vector2 } from 'littlejsengine';
import {
  cameraScale,
  drawCircle,
  drawEllipse,
  drawLine,
  gamepadIsDown,
  gamepadWasPressed,
  hsl,
  keyIsDown,
  keyWasPressed,
  mainCanvasSize,
  mouseIsDown,
  mouseWasPressed,
  rand,
  readSaveData,
  setCameraPos,
  timeDelta,
  vec2,
  writeSaveData,
} from 'littlejsengine';

import { Ui } from '../ui';
import { PATH_WIDTH, ZagPath } from './path';
import { fallSound, gameOverSound, scoreSound, turnSound } from './sounds';

const BALL_RADIUS = 0.36;
const BALL_DIAMETER = BALL_RADIUS * 2;

/** How far the ball center can drift from the path center before falling. */
const PATH_TOLERANCE = PATH_WIDTH / 2 - BALL_RADIUS * 0.4;

/** Taps within this distance of the next corner snap onto it. */
const CORNER_SNAP_DISTANCE = 0.8;

const BASE_SPEED = 4.5;
const MAX_SPEED = 10;
const SPEED_PER_SCORE = 0.12;

const FALL_GRAVITY = 25;
const FALL_DURATION = 0.8;

const TRAIL_LIFE = 0.35;
const TRAIL_INTERVAL = 0.03;

const PATH_AHEAD = 4;
const PATH_BEHIND = 6;

const SAVE_KEY = 'org.remarkablegames.zag';

type GameState = 'ready' | 'playing' | 'falling' | 'gameover';

interface TrailPoint {
  pos: Vector2;
  age: number;
}

/**
 * A tap-to-turn auto-runner: the ball zags along a staircase path
 * of straight segments. Each tap turns it 90 degrees onto the next
 * segment; drifting off the path makes it tumble away and ends the run.
 */
export class ZagGame {
  private readonly ui = new Ui();
  private readonly path = new ZagPath();
  private readonly trail: TrailPoint[] = [];

  private state: GameState = 'ready';
  private ball = vec2();
  private direction = vec2(1, 0);
  private cameraPos = vec2();
  private fallVelocity = vec2();
  private baseHue = rand();

  private segmentIndex = 0;
  private score = 0;
  private best = 0;
  private fallTime = 0;
  private trailTimer = 0;
  private turnPulse = 0;
  private inputArmed = true;

  init(): void {
    this.best = readSaveData(SAVE_KEY, { best: 0 }).best;
    this.ui.setHandlers({
      onStart: () => {
        this.start();
      },
      onRestart: () => {
        this.start();
      },
    });
    this.reset();
    this.ui.showStart(this.best);
  }

  update(): void {
    switch (this.state) {
      case 'ready':
        if (this.pressed()) this.start();
        break;
      case 'playing':
        this.updatePlaying();
        break;
      case 'falling':
        this.updateFalling();
        break;
      case 'gameover':
        break; // the restart button handles this state
    }

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

  /** Start a new run from the first corner. */
  start(): void {
    this.reset();
    this.state = 'playing';
    // wait for the starting press to be released so it does not turn the ball
    this.inputArmed = false;
    this.ui.hide();
    turnSound.play();
  }

  private reset(): void {
    this.path.reset();
    this.path.extend(PATH_AHEAD + 1);
    this.ball.setFrom(this.path.corners[0]);
    this.direction.set(1, 0);
    this.segmentIndex = 0;
    this.score = 0;
    this.fallTime = 0;
    this.turnPulse = 0;
    this.trail.length = 0;
    this.baseHue = rand();
    this.cameraPos.setFrom(this.ball);
    setCameraPos(this.cameraPos);
    this.ui.setScore(0);
  }

  /** True on the frame a turn is requested by mouse, touch, key or pad. */
  private pressed(): boolean {
    return (
      mouseWasPressed(0) ||
      keyWasPressed('Space') ||
      keyWasPressed('Enter') ||
      keyWasPressed('ArrowUp') ||
      gamepadWasPressed(0)
    );
  }

  /** True while the player still holds the starting press. */
  private held(): boolean {
    return (
      mouseIsDown(0) ||
      keyIsDown('Space') ||
      keyIsDown('Enter') ||
      keyIsDown('ArrowUp') ||
      gamepadIsDown(0)
    );
  }

  private updatePlaying(): void {
    // ignore turns until the starting click or key has been released
    if (!this.inputArmed) this.inputArmed = !this.held();
    else if (this.pressed()) this.turn();

    // advance along the current segment
    const speed = this.speed();
    this.ball = this.ball.add(this.direction.scale(speed * timeDelta));

    // count a point when the ball crosses a corner it is actually on
    const corner = this.path.corners[this.segmentIndex + 1];
    if (
      this.ball.distance(corner) <= PATH_TOLERANCE &&
      this.ball.subtract(corner).dot(this.direction) > 0
    ) {
      this.segmentIndex++;
      this.score++;
      this.ui.setScore(this.score);
      scoreSound.play(this.ball);

      // keep the path generated a few segments ahead of the ball
      while (this.segmentIndex + PATH_AHEAD >= this.path.segmentCount)
        this.path.extend();
    }

    // the ball has drifted off the path
    if (!this.isOnPath()) this.startFall();
  }

  /** Turn 90 degrees onto the next segment. */
  private turn(): void {
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

  /** Check the ball center against the corridor around nearby segments. */
  private isOnPath(): boolean {
    const first = Math.max(0, this.segmentIndex - 1);
    const last = Math.min(this.path.segmentCount - 1, this.segmentIndex + 2);

    for (let i = first; i <= last; i++)
      if (this.path.distanceToSegment(this.ball, i) <= PATH_TOLERANCE)
        return true;

    return false;
  }

  private speed(): number {
    return Math.min(MAX_SPEED, BASE_SPEED + this.score * SPEED_PER_SCORE);
  }

  private startFall(): void {
    this.state = 'falling';
    this.fallTime = 0;
    this.fallVelocity = this.direction.scale(this.speed());
    fallSound.play(this.ball);
  }

  private updateFalling(): void {
    const dt = timeDelta;
    this.fallVelocity = this.fallVelocity.add(vec2(0, -FALL_GRAVITY * dt));
    this.ball = this.ball.add(this.fallVelocity.scale(dt));
    this.fallTime += dt;

    if (this.fallTime >= FALL_DURATION) {
      this.state = 'gameover';
      const newBest = this.score > this.best;
      if (newBest) {
        this.best = this.score;
        writeSaveData(SAVE_KEY, { best: this.best });
      }
      gameOverSound.play();
      this.ui.showGameOver(this.score, this.best, newBest);
    }
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

    const moving = this.state === 'playing' || this.state === 'falling';
    this.trailTimer += dt;
    if (moving && this.trailTimer >= TRAIL_INTERVAL) {
      this.trailTimer = 0;
      this.trail.push({ pos: this.ball.copy(), age: 0 });
    }
  }

  private pathColor(segment: number): Color {
    const hue = (this.baseHue + 0.05 * segment) % 1;
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

  private renderBall(): void {
    if (this.state === 'gameover') return;

    // squash along the movement axis right after each turn
    const squash = 0.3 * this.turnPulse;
    const wide = vec2(
      BALL_DIAMETER * (1 + squash),
      BALL_DIAMETER * (1 - squash),
    );
    const tall = vec2(
      BALL_DIAMETER * (1 - squash),
      BALL_DIAMETER * (1 + squash),
    );
    const movingUp = this.state === 'playing' && this.direction.y > 0;
    const size =
      this.state === 'falling' ? vec2(BALL_DIAMETER) : movingUp ? tall : wide;

    // soft shadow, then the ball itself
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
