import { readSaveData, writeSaveData } from 'littlejsengine';

const SAVE_KEY = 'org.remarkablegames.zag';

/** The best score of every run so far, or 0 before the first one. */
export const getBestScore = (): number =>
  readSaveData(SAVE_KEY, { best: 0 }).best;

/** Remember a run that beat the best score. */
export const saveBestScore = (best: number): void => {
  writeSaveData(SAVE_KEY, { best });
};
