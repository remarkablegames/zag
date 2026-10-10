import {
  hsl,
  setCameraScale,
  setCanvasClearColor,
  setDebugOverlay,
  setDebugWatermark,
} from 'littlejsengine';

import { setGame } from '../shared';
import { ZagCover } from '../zag/cover';
import { ZagGame } from '../zag/game';

// deep indigo backdrop that contrasts with the bright path
const BACKGROUND_COLOR = hsl(0.68, 0.45, 0.1);

/** Query parameter that renders the animated cover instead of the game. */
const COVER_PARAM = 'cover';

export function gameInit() {
  // zoom in so the path fills a comfortable part of the screen
  setCameraScale(32);
  setCanvasClearColor(BACKGROUND_COLOR);

  const isCover = new URLSearchParams(location.search).has(COVER_PARAM);
  if (isCover) {
    // keep the engine's FPS watermark and debug overlay off the cover
    setDebugWatermark(false);
    setDebugOverlay(false);
  }

  const game = isCover ? new ZagCover() : new ZagGame();
  setGame(game);
  game.init();
}
