import {
  setCameraScale,
  setDebugOverlay,
  setDebugWatermark,
  WavedashPlugin,
} from 'littlejsengine';

import { setGame } from '../shared';
import { HIGH_SCORE_LEADERBOARD } from '../utils';
import { ZagCover } from '../zag/cover';
import { ZagGame } from '../zag/game';

/** Query parameter that renders the animated cover instead of the game. */
const COVER_PARAM = 'cover';

export function gameInit() {
  // zoom in so the path fills a comfortable part of the screen;
  // the scene owns the backdrop color from here on
  setCameraScale(32);

  const isCover = new URLSearchParams(location.search).has(COVER_PARAM);
  if (isCover) {
    // keep the engine's FPS watermark and debug overlay off the cover
    setDebugWatermark(false);
    setDebugOverlay(false);
  }

  const game = isCover ? new ZagCover() : new ZagGame();
  setGame(game);
  game.init();

  // made last, so `Wavedash.init` runs once the game can draw:
  // until it does the SDK keeps its loading screen over the game.
  // Higher wins and a plain number are both what Zag wants,
  // so the board needs nothing but the name it shows under on the game page.
  new WavedashPlugin({ [HIGH_SCORE_LEADERBOARD]: {} });
}
