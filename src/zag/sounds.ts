import { Sound } from 'littlejsengine';

const MUSIC_VOLUME = 2.0;

/** Background music: loops forever, queued until audio unlocks if the file decodes first. */
new Sound(
  'music/soft_lights.mp3',
  undefined, // randomness
  0, // range: music is not positional
  undefined, // taper
  (sound) => sound.playMusic(MUSIC_VOLUME),
);

// zzfx sound parameters:
// [volume, randomness, frequency, attack, sustain, release, shape, shapeCurve, slide, ...]
export const scoreSound = new Sound([0.5, 0.15, 700, 0, 0, 0.08]);

export const turnSound = new Sound([0.2, 0.1, 880, 0, 0, 0.12, 0, 1, 400]);

export const fallSound = new Sound([0.6, 0.25, 500, 0, 0, 0.4, 0, 1, -350]);

export const gameOverSound = new Sound([0.5, 0.2, 320, 0, 0.05, 0.5]);
