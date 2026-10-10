import { clamp, rand, vec2, type Vector2 } from 'littlejsengine';

/** Width of the walkable path in world units. */
export const PATH_WIDTH = 1.2;

const MIN_SEGMENT_LENGTH = 4.5;
const MAX_SEGMENT_LENGTH = 8;

/**
 * A staircase path of alternating horizontal and vertical segments.
 * Segment `i` runs from `corners[i]` to `corners[i + 1]`.
 */
export class ZagPath {
  readonly corners: Vector2[] = [vec2()];
  private readonly lengths: number[] = [];

  get segmentCount(): number {
    return this.lengths.length;
  }

  /** Direction of a segment; the path always alternates between x and y. */
  static segmentDirection(segment: number): Vector2 {
    return segment % 2 ? vec2(0, 1) : vec2(1, 0);
  }

  /** Start a fresh path at the origin. */
  reset(): void {
    this.corners.length = 1;
    this.lengths.length = 0;
  }

  /** Add random length segments to the end of the path. */
  extend(count = 1): void {
    for (let i = 0; i < count; i++) {
      const length = rand(MIN_SEGMENT_LENGTH, MAX_SEGMENT_LENGTH);
      const from = this.corners[this.corners.length - 1];
      const to = from.add(
        ZagPath.segmentDirection(this.lengths.length).scale(length),
      );
      this.corners.push(to);
      this.lengths.push(length);
    }
  }

  /** Distance from a point to the centerline of a segment. */
  distanceToSegment(pos: Vector2, segment: number): number {
    const a = this.corners[segment];
    const b = this.corners[segment + 1];
    const ab = b.subtract(a);
    const t = clamp(pos.subtract(a).dot(ab) / ab.lengthSquared(), 0, 1);
    return pos.distance(a.add(ab.scale(t)));
  }
}
