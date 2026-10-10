import './style.css';

import { noop } from './utils';

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
  private readonly best: HTMLParagraphElement;
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

    this.best = document.createElement('p');
    this.best.className = 'zag-best';

    this.button = document.createElement('button');
    this.button.className = 'zag-button';
    this.button.addEventListener('click', () => {
      this.handleClick();
    });

    this.card = document.createElement('div');
    this.card.className = 'zag-card';
    this.card.append(this.title, this.message, this.best, this.button);

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
  showStart(best: number): void {
    this.mode = 'start';
    this.title.textContent = 'ZAG';
    this.message.textContent = 'Tap, click, or press Space to turn';
    this.best.textContent = `Best: ${String(best)}`;
    this.button.textContent = 'Play';
    this.score.hidden = true;
    this.card.hidden = false;
  }

  /** Hide the card so only the live score shows while a run is in progress. */
  hide(): void {
    this.card.hidden = true;
  }

  /** Update the live score, popping the number when it changes. */
  setScore(score: number): void {
    if (!this.score.hidden && this.score.textContent === String(score)) return;
    this.score.textContent = String(score);
    this.score.hidden = false;
    this.score.animate(
      [
        { transform: 'translateX(-50%) scale(1.25)' },
        { transform: 'translateX(-50%) scale(1)' },
      ],
      { duration: 160, easing: 'ease-out' },
    );
  }

  /** Show the game over card with the final score and best. */
  showGameOver(score: number, best: number, newBest: boolean): void {
    this.mode = 'gameover';
    this.title.textContent = 'GAME OVER';
    this.message.textContent = newBest
      ? 'New best score!'
      : `Score: ${String(score)}`;
    this.best.textContent = `Best: ${String(best)}`;
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
