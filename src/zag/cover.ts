import {
  cameraScale,
  Color,
  drawText,
  hsl,
  mainCanvasSize,
  vec2,
} from 'littlejsengine';

import { BASE_SPEED, PATH_TOLERANCE, ZagScene } from './scene';

const TITLE = 'ZAG';

/** Title height as a fraction of the screen height. */
const TITLE_HEIGHT = 0.22;

/** Gap left above the title, as a fraction of its own height. */
const TITLE_GAP = 0.1;

/** Letter tracking, matching the 0.08em letter-spacing of the DOM title. */
const TITLE_SPACING = 0.08;

const TITLE_FONT = 'arial';
const TITLE_FONT_STYLE = '900';

// gradient endpoints, matching .zag-title in src/style.css
const TITLE_FROM = new Color(0x7e / 255, 0xe8 / 255, 0xfa / 255);
const TITLE_TO = new Color(0xee / 255, 0xc0 / 255, 0xc6 / 255);

/** Two hues alternate so a capture of the cover stays in a small palette. */
const COVER_HUE_STEP = 0.5;

/** Backdrop hue, matching the indigo the game rests on, kept fixed here. */
const COVER_BACKGROUND_HUE = 0.68;

// used to measure letters with the same font string drawText builds
const measureContext = document.createElement('canvas').getContext('2d');

/**
 * The cover: a non-playable attract mode that drives the ball through
 * the path on its own forever, with the game name drawn in large text
 * across the top center of the screen.
 */
export class ZagCover extends ZagScene {
  constructor() {
    super(COVER_HUE_STEP);
  }

  /**
   * The backdrop keeps one hue here, so a capture of the cover stays
   * in the same small palette every time.
   */
  protected override startingBackgroundHue(): number {
    return COVER_BACKGROUND_HUE;
  }

  protected override updateMotion(): void {
    this.moveBall(BASE_SPEED);

    // turn onto the next segment as soon as the ball reaches the corner
    const corner = this.path.corners[this.segmentIndex + 1];
    if (
      this.ball.distance(corner) <= PATH_TOLERANCE &&
      this.ball.subtract(corner).dot(this.direction) > 0
    ) {
      this.ball.setFrom(corner);
      this.advanceSegment();
      this.turn();
    }
  }

  render(): void {
    super.render();
    this.renderTitle();
  }

  private renderTitle(): void {
    const size = (mainCanvasSize.y / cameraScale) * TITLE_HEIGHT;
    const spacing = size * TITLE_SPACING;
    const letters = TITLE.split('');
    const widths = letters.map((letter) => measureWidth(letter, size));
    const total =
      widths.reduce((sum, width) => sum + width, 0) +
      spacing * (widths.length - 1);

    // pinned to the camera so it stays at the top center of the screen
    const top = (mainCanvasSize.y * 0.5) / cameraScale;
    const y = this.cameraPos.y + top - size * (0.5 + TITLE_GAP);
    let x = this.cameraPos.x - total / 2;

    letters.forEach((letter, i) => {
      // each letter takes the next step of the game's title gradient
      const t = i / (letters.length - 1);
      const color = TITLE_FROM.lerp(TITLE_TO, t);
      const center = vec2(x + widths[i] / 2, y);
      drawText(
        letter,
        center,
        size,
        color,
        size * 0.04,
        hsl(0, 0, 0, 0.4),
        'center',
        TITLE_FONT,
        TITLE_FONT_STYLE,
      );
      x += widths[i] + spacing;
    });
  }
}

/** Measure a letter with the same font string drawText uses. */
function measureWidth(letter: string, size: number): number {
  if (!measureContext) return size; // fall back to uniform widths
  measureContext.font = `${TITLE_FONT_STYLE} ${String(size)}px ${TITLE_FONT}`;
  return measureContext.measureText(letter).width;
}
