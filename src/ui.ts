import './style.css';

import { noop } from './utils';

/** Class that gives a milestone its glow, removed once its pop lands. */
const MILESTONE_CLASS = 'zag-score--milestone';

/** Pop the score gets whenever it changes. */
const SCORE_KEYFRAMES = [
  { transform: 'translateX(-50%) scale(1.25)' },
  { transform: 'translateX(-50%) scale(1)' },
];
const SCORE_ANIMATION: KeyframeAnimationOptions = {
  duration: 160,
  easing: 'ease-out',
};

/** A milestone pops taller and slower, so it reads as more than one point. */
const MILESTONE_KEYFRAMES = [
  { transform: 'translateX(-50%) scale(1.6)' },
  { transform: 'translateX(-50%) scale(1)' },
];
const MILESTONE_ANIMATION: KeyframeAnimationOptions = {
  duration: 320,
  easing: 'ease-out',
};

export interface UiHandlers {
  onStart: () => void;
  onRestart: () => void;
}

/**
 * DOM overlay layered over the canvas: live score, start card and a
 * game over card with a restart button. The card captures pointer
 * events so pressing the button never doubles as a game tap.
 */
export class Ui {
  private readonly card: HTMLDivElement;
  private readonly score: HTMLDivElement;
  private readonly title: HTMLHeadingElement;
  private readonly message: HTMLParagraphElement;
  private readonly highScore: HTMLParagraphElement;
  private readonly button: HTMLButtonElement;
  private handlers: UiHandlers = { onStart: noop, onRestart: noop };
  private mode: 'start' | 'gameover' = 'start';

  constructor() {
    this.score = document.createElement('div');
    this.score.className = 'zag-score';
    this.score.hidden = true;

    this.title = document.createElement('h1');
    this.title.className = 'zag-title';

    this.message = document.createElement('p');
    this.message.className = 'zag-message';

    this.highScore = document.createElement('p');
    this.highScore.className = 'zag-high-score';

    this.button = document.createElement('button');
    this.button.className = 'zag-button';
    this.button.addEventListener('click', () => {
      this.handleClick();
    });

    this.card = document.createElement('div');
    this.card.className = 'zag-card';
    this.card.append(this.title, this.message, this.highScore, this.button);

    const overlay = document.createElement('div');
    overlay.className = 'zag-overlay';
    overlay.append(this.score, this.card);
    document.body.append(overlay);
  }

  /** Set the callbacks the start and restart buttons fire. */
  setHandlers(handlers: UiHandlers): void {
    this.handlers = handlers;
  }

  /** Show the start card. */
  showStart(highScore: number): void {
    this.mode = 'start';
    this.title.textContent = 'ZAG';
    this.message.textContent = 'Tap, click, or press Space to turn';
    this.setHighScore(highScore);
    this.button.textContent = 'Play';
    this.score.hidden = true;
    this.card.hidden = false;
  }

  /** Show the high score, which Wavedash may raise after the card does. */
  setHighScore(highScore: number): void {
    this.highScore.textContent = `High score: ${String(highScore)}`;
  }

  /** Hide the card so only the live score shows while a run is in progress. */
  hide(): void {
    this.card.hidden = true;
  }

  /** Tint the score to the backdrop's current hue, so the two stay in step. */
  setHue(hue: number): void {
    this.score.style.setProperty('--zag-hue', String(hue));
  }

  /** Update the live score, popping the number when it changes. */
  setScore(score: number, milestoneHue?: number): void {
    if (!this.score.hidden && this.score.textContent === String(score)) return;
    this.score.textContent = String(score);
    this.score.hidden = false;

    const milestone = milestoneHue !== undefined;
    if (milestone) {
      this.setHue(milestoneHue);
      this.score.classList.add(MILESTONE_CLASS);
    }
    const animation = this.score.animate(
      milestone ? MILESTONE_KEYFRAMES : SCORE_KEYFRAMES,
      milestone ? MILESTONE_ANIMATION : SCORE_ANIMATION,
    );
    if (milestone)
      animation.onfinish = () => {
        this.score.classList.remove(MILESTONE_CLASS);
      };
  }

  /** Show the game over card with the final score and high score. */
  showGameOver(score: number, highScore: number, newHighScore: boolean): void {
    this.mode = 'gameover';
    this.title.textContent = 'GAME OVER';
    this.message.textContent = newHighScore
      ? 'New high score!'
      : `Score: ${String(score)}`;
    this.setHighScore(highScore);
    this.button.textContent = 'Restart';
    this.score.hidden = true;
    this.card.hidden = false;
    // focus so keyboard players can restart with space or enter
    this.button.focus({ preventScroll: true });
  }

  private handleClick(): void {
    this.button.blur();
    if (this.mode === 'gameover') this.handlers.onRestart();
    else this.handlers.onStart();
  }
}
