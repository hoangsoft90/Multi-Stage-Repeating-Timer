/**
 * Injectable clock so the engine is deterministic under test.
 * Pure TypeScript.
 */

export interface Clock {
  now(): Date;
}

/** Default clock — real system time. */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

/** Test clock — time advanced by hand. */
export class FakeClock implements Clock {
  private current: Date;

  constructor(start: Date = new Date(2026, 0, 1, 0, 0, 0, 0)) {
    this.current = new Date(start.getTime());
  }

  now(): Date {
    return new Date(this.current.getTime());
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }

  /** Jump to an exact absolute time (simulates system clock change). */
  jumpTo(date: Date): void {
    this.current = new Date(date.getTime());
  }
}
