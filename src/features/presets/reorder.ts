/**
 * reorderStages (spec: drag-drop R1) — pure helper that moves a stage from
 * index `from` to index `to` WITHOUT recreating stage ids, so the per-stage
 * soundId mapping (custom sound pack) stays intact. Returns the same array
 * reference for no-op moves (same index / out-of-range).
 */
export function reorderStages<T extends { id: string }>(
  stages: T[],
  from: number,
  to: number,
): T[] {
  if (from === to) return stages;
  if (from < 0 || to < 0 || from >= stages.length || to >= stages.length) return stages;
  const next = [...stages];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
