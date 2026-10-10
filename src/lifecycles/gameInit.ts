import { hsl, setCameraScale, setCanvasClearColor } from 'littlejsengine';

import { setGame } from '../shared';
import { ZagGame } from '../zag/game';

// deep indigo backdrop that contrasts with the bright path
const BACKGROUND_COLOR = hsl(0.68, 0.45, 0.1);

export function gameInit() {
  // zoom in so the path fills a comfortable part of the screen
  setCameraScale(32);
  setCanvasClearColor(BACKGROUND_COLOR);

  const game = new ZagGame();
  setGame(game);
  game.init();
}
