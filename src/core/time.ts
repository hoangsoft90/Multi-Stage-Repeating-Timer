/**
 * Pure time helpers shared across features — no platform or storage
 * dependency, so any pure module can import them without pulling in
 * AsyncStorage or native modules (keeps stats.ts etc. unit-testable).
 */

/** JS getDay(): 0=Sun..6=Sat → our 1=Mon..7=Sun (RoutineSchedule convention). */
export function weekDay(ts: number): number {
  const d = new Date(ts).getDay();
  return d === 0 ? 7 : d;
}
