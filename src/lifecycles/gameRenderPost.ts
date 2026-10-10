import * as LittleJS from 'littlejsengine';
import { vec2 } from 'littlejsengine';

export function gameRenderPost() {
  LittleJS.drawTextScreen('Zag', vec2(LittleJS.mainCanvasSize.x / 2, 80), 80);
}
