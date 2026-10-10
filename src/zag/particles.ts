import { hsl, ParticleEmitter, vec2, type Vector2 } from 'littlejsengine';

/** Full circle, so a burst throws particles every way at once. */
const SPREAD = Math.PI;

/** The engine measures speed and spin per frame at 60fps. */
const FRAMES_PER_SECOND = 60;

/** A quarter of each particle's life fades in, a quarter out, the rest solid. */
const FADE_RATE = 0.5;

/** How much extra speed and spin each particle picks up, as a fraction. */
const RANDOMNESS = 0.3;

/** Angular velocity kept each frame, so particles spin down instead of stopping. */
const ANGLE_DAMPING = 0.95;

interface Burst {
  /** How many particles one burst throws. */
  count: number;
  /** How long a particle lives, in seconds. */
  life: number;
  /** Particle size in world units, from birth to death. */
  sizeStart: number;
  sizeEnd: number;
  /** How fast particles leave, in world units per second. */
  speed: number;
  /** How fast particles spin, in radians per second. */
  angleSpeed: number;
  /** Fraction of velocity kept each frame, so particles settle instead of flying forever. */
  damping: number;
  /** Downward drift in world units per frame; the world's gravity is not set by the game. */
  fall: number;
  /** Blends the burst additively so it glows over the scene. */
  additive: boolean;
  /** Saturation and lightness of the particles, in the same terms as hsl. */
  saturation: number;
  lightness: number;
}

/** How wide a turn fans its dust forward, in radians either side of the new heading. */
const TURN_SPREAD = Math.PI / 3;

/** A quick puff of path-colored dust where the ball turned onto a segment. */
const TURN_BURST: Burst = {
  count: 8,
  life: 0.3,
  sizeStart: 0.16,
  sizeEnd: 0,
  speed: 3,
  angleSpeed: 5,
  damping: 0.9,
  fall: 0,
  additive: false,
  saturation: 0.6,
  lightness: 0.72,
};

/** A small bright pop where the ball crossed a corner and scored. */
const SCORE_BURST: Burst = {
  count: 5,
  life: 0.28,
  sizeStart: 0.1,
  sizeEnd: 0,
  speed: 4.5,
  angleSpeed: 8,
  damping: 0.88,
  fall: 0,
  additive: true,
  saturation: 0.35,
  lightness: 0.9,
};

/** The celebration for reaching a milestone, wide enough to read past the ball. */
const MILESTONE_BURST: Burst = {
  count: 24,
  life: 0.7,
  sizeStart: 0.24,
  sizeEnd: 0,
  speed: 7,
  angleSpeed: 4,
  damping: 0.95,
  fall: -0.003,
  additive: true,
  saturation: 0.5,
  lightness: 0.78,
};

/** The ball coming apart where it left the path, big and slow enough to watch fall. */
const FALL_BURST: Burst = {
  count: 30,
  life: 1,
  sizeStart: 0.3,
  sizeEnd: 0,
  speed: 8,
  angleSpeed: 6,
  damping: 0.95,
  fall: -0.004,
  additive: false,
  saturation: 0.4,
  lightness: 0.82,
};

/**
 * The game's four bursts: turning, scoring, reaching a milestone and
 * falling off the path. Each keeps one permanent emitter that never
 * spawns on its own, so a burst is just a handful of emitParticle
 * calls colored to match whatever the ball is standing on.
 */
export class ZagParticles {
  private readonly turnEmitter = makeEmitter(TURN_BURST);
  private readonly scoreEmitter = makeEmitter(SCORE_BURST);
  private readonly milestoneEmitter = makeEmitter(MILESTONE_BURST);
  private readonly fallEmitter = makeEmitter(FALL_BURST);

  /**
   * Puff of dust where the ball turned, fanned into the new heading so
   * a turn reads as momentum rather than a splash down the corridor.
   */
  turn(pos: Vector2, hue: number, angle: number): void {
    this.turnEmitter.angle = angle;
    this.turnEmitter.particleConeAngle = TURN_SPREAD;
    this.burst(this.turnEmitter, TURN_BURST, pos, hue);
  }

  /** Bright pop where the ball crossed a corner and scored. */
  score(pos: Vector2, hue: number): void {
    this.burst(this.scoreEmitter, SCORE_BURST, pos, hue);
  }

  /** Wide celebration for reaching a milestone. */
  milestone(pos: Vector2, hue: number): void {
    this.burst(this.milestoneEmitter, MILESTONE_BURST, pos, hue);
  }

  /** The ball bursting apart where it drifted off the path. */
  fall(pos: Vector2, hue: number): void {
    this.burst(this.fallEmitter, FALL_BURST, pos, hue);
  }

  /** Throw one burst at a spot, in the given hue. */
  private burst(
    emitter: ParticleEmitter,
    config: Burst,
    pos: Vector2,
    hue: number,
  ): void {
    emitter.pos.setFrom(pos);
    // particles are born in the hue and die transparent, so a burst blends into the path
    emitter.colorStartA = hsl(hue, config.saturation, config.lightness);
    emitter.colorStartB = hsl(hue, config.saturation, config.lightness + 0.15);
    emitter.colorEndA = hsl(hue, config.saturation, config.lightness, 0);
    emitter.colorEndB = hsl(hue, config.saturation, config.lightness + 0.15, 0);

    for (let i = 0; i < config.count; i++) emitter.emitParticle();
  }
}

/** Build an emitter that only ever spawns when a burst asks it to. */
function makeEmitter(config: Burst): ParticleEmitter {
  const clear = hsl(0, 0, 0, 0);
  const emitter = new ParticleEmitter(
    vec2(), // pos: moved to the burst before each burst
    0, // angle
    0, // emitSize: a point, so every particle starts at the burst
    0, // emitTime: never expires, so bursts can keep coming
    0, // emitRate: bursts call emitParticle directly
    SPREAD, // emitConeAngle
    undefined, // tileInfo: particles are untextured
    clear, // colorStartA: set per burst
    clear, // colorStartB
    clear, // colorEndA
    clear, // colorEndB
    config.life,
    config.sizeStart,
    config.sizeEnd,
    config.speed / FRAMES_PER_SECOND,
    config.angleSpeed / FRAMES_PER_SECOND,
    config.damping,
    ANGLE_DAMPING,
    0, // gravityScale: the world's gravity is never set, so this is unused
    SPREAD, // particleConeAngle: every direction
    FADE_RATE,
    RANDOMNESS,
    false, // collideLevel: bursts fly over the path
    config.additive,
  );
  emitter.gravity = config.fall;
  return emitter;
}
