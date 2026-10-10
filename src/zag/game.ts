import {
  gamepadIsDown,
  gamepadWasPressed,
  keyIsDown,
  keyWasPressed,
  mouseIsDown,
  mouseWasPressed,
  timeDelta,
  vec2,
} from 'littlejsengine';

import { Ui } from '../ui';
import { getBestScore, saveBestScore } from '../utils';
import { BALL_DIAMETER, BASE_SPEED, PATH_TOLERANCE, ZagScene } from './scene';
import { fallSound, gameOverSound, scoreSound, turnSound } from './sounds';

const MAX_SPEED = 10;
const SPEED_PER_SCORE = 0.12;

/** Points between backdrop hue steps and milestone bursts. */
const MILESTONE = 10;

const FALL_GRAVITY = 25;
const FALL_DURATION = 0.8;

type GameState = 'ready' | 'playing' | 'falling' | 'gameover';

/**
 * A tap-to-turn auto-runner: the ball zags along a staircase path
 * of straight segments. Each tap turns it 90 degrees onto the next
 * segment; drifting off the path makes it tumble away and ends the run.
 */
export class ZagGame extends ZagScene {
  private readonly ui = new Ui();

  private state: GameState = 'ready';
  private fallVelocity = vec2();

  private score = 0;
  private best = 0;
  private fallTime = 0;
  private inputArmed = true;

  init(): void {
    this.best = getBestScore();
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

  /** Start a new run from the first corner. */
  start(): void {
    this.reset();
    this.state = 'playing';
    // wait for the starting press to be released so it does not turn the ball
    this.inputArmed = false;
    this.ui.hide();
    turnSound.play();
  }

  protected updateMotion(): void {
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
  }

  protected override renderBall(): void {
    if (this.state === 'gameover') return;
    if (this.state === 'falling') {
      this.drawBall(vec2(BALL_DIAMETER));
      return;
    }
    super.renderBall();
  }

  protected override isMoving(): boolean {
    return this.state === 'playing' || this.state === 'falling';
  }

  protected override reset(): void {
    super.reset();
    this.score = 0;
    this.fallTime = 0;
    this.ui.setScore(0);
    // a fresh run picks up the backdrop's new hue
    this.ui.setHue(this.currentHue());
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
    this.moveBall(this.speed());

    // count a point when the ball crosses a corner it is actually on
    const corner = this.path.corners[this.segmentIndex + 1];
    if (
      this.ball.distance(corner) <= PATH_TOLERANCE &&
      this.ball.subtract(corner).dot(this.direction) > 0
    ) {
      this.advanceSegment();
      this.score++;
      // the corner just crossed is where the new segment now starts
      const crossed = this.path.corners[this.segmentIndex];
      const milestone = this.score % MILESTONE === 0;
      if (milestone) this.milestone();
      else this.scorePoint(crossed);
      scoreSound.play(this.ball);
      // a milestone also tints the score to the backdrop's new hue
      this.ui.setScore(this.score, milestone ? this.currentHue() : undefined);
    }

    // the ball has drifted off the path
    if (!this.isOnPath()) this.startFall();
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
    this.fallApart();
    fallSound.play(this.ball);
  }

  private updateFalling(): void {
    const dt = timeDelta;
    this.fallVelocity = this.fallVelocity.add(vec2(0, -FALL_GRAVITY * dt));
    this.ball = this.ball.add(this.fallVelocity.scale(dt));
    this.fallTime += dt;
    // the ball tumbles as fast as it is travelling on the way down
    this.roll(this.fallVelocity.length() * dt);

    if (this.fallTime >= FALL_DURATION) {
      this.state = 'gameover';
      this.dimBackground();
      const newBest = this.score > this.best;
      if (newBest) {
        this.best = this.score;
        saveBestScore(this.score);
      }
      gameOverSound.play();
      this.ui.showGameOver(this.score, this.best, newBest);
    }
  }
}
