/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { readSaveData, wavedash, writeSaveData } from 'littlejsengine';

const SAVE_KEY = 'org.remarkablegames.zag';

/** The leaderboard the game posts to, named as it shows on the game page. */
export const HIGH_SCORE_LEADERBOARD = 'high-score';

/** Cloud save slot holding the high score, kept by Wavedash across devices. */
const CLOUD_SLOT = 0;

/** What both stores hold: one number, under the same name in each. */
interface HighScoreSave {
  highScore: number;
}

/** A cloud slot holding a high score, once it has been read back. */
const isHighScoreSave = (value: unknown): value is HighScoreSave =>
  typeof value === 'object' &&
  value !== null &&
  'highScore' in value &&
  typeof value.highScore === 'number';

/** The high score this device has seen, or 0 before the first run. */
export const getHighScore = (): number =>
  readSaveData(SAVE_KEY, { highScore: 0 }).highScore;

/** Remember a run that beat the high score. */
export function saveHighScore(highScore: number): void {
  writeSaveData(SAVE_KEY, { highScore });

  // fire and forget: off Wavedash both do nothing, and the leaderboard
  // keeps the best itself, so a worse run is discarded there anyway
  void wavedash?.postScore(HIGH_SCORE_LEADERBOARD, highScore);
  void wavedash?.cloudSave(CLOUD_SLOT, { highScore });
}

/**
 * The high score of every device the player has run the game on: the
 * local one, raised to Wavedash's cloud slot when that is higher, so
 * the two converge. A load that failed leaves the local one alone and
 * never writes over the slot, which may still hold the player's save.
 */
export async function loadHighScore(): Promise<number> {
  const localHighScore = getHighScore();

  // cloudLoad gives back anything a save can hold, so it is checked
  // before a field of it is read
  const saved: unknown = await wavedash?.cloudLoad(CLOUD_SLOT);

  // null is a slot Wavedash says is empty, undefined one that could not
  // be loaded, or no Wavedash at all
  if (!isHighScoreSave(saved)) {
    return localHighScore;
  }

  const highScore = Math.max(localHighScore, saved.highScore);

  if (highScore !== localHighScore) {
    writeSaveData(SAVE_KEY, { highScore });
  }

  if (highScore !== saved.highScore) {
    await wavedash?.cloudSave(CLOUD_SLOT, { highScore });
  }

  return highScore;
}
