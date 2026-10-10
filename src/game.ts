/**
 * Zag
 * - A tap-to-turn auto-runner built with LittleJS
 * - The ball zags along a path; tap to turn onto the next segment
 */
import * as LittleJS from 'littlejsengine';

import {
  gameInit,
  gameRender,
  gameRenderPost,
  gameUpdate,
  gameUpdatePost,
} from './lifecycles';

void LittleJS.engineInit(
  gameInit,
  gameUpdate,
  gameUpdatePost,
  gameRender,
  gameRenderPost,
);
