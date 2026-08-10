/**
 * Template helpers (spec: drag-drop R2) — built-in templates are immutable
 * read-only entry points: they can't be deleted and any Save from one always
 * creates a new preset. Shared by Home + Editor.
 */
import { BUILTIN_TEMPLATES } from '../../core/templates';

export function isTemplate(id: string): boolean {
  return BUILTIN_TEMPLATES.some((t) => t.id === id);
}
