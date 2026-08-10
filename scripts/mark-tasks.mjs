/**
 * Marks completed tasks ([ ] -> [x]) in each change's tasks.md, based on the
 * implementation actually delivered. Device-only / credential-only tasks are
 * left unchecked so the remaining work is visible.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// task id prefix (e.g. "1.1") -> complete
const PLAN = {
  'add-timer-engine': {
    done: [
      '1.1','1.2','1.3','1.4','1.5','2.1','3.1','3.2','4.1','4.2','4.3','4.4','4.5','4.6','4.7','4.8',
      '5.1','5.2','5.3','5.4','5.5','5.6','5.7','5.8','5.9','6.1','6.2',
    ],
  },
  'add-ui-and-storage': {
    done: [
      '1.1','1.2','1.3','1.4','2.1','2.2','2.3','2.4','3.1','3.2','3.3','4.1','4.2','4.3','4.4',
      '5.1','5.2','5.3','5.4','6.1','6.2','6.3','6.4','6.5','7.1','7.2','8.1','8.4',
    ],
  },
  'add-background-scheduling': {
    done: [
      '1.1','1.2','1.3','2.1','2.2','3.1','3.3','4.1','4.2','5.1','5.2','5.3','5.4','6.1','6.2','6.3','7.1','7.5',
    ],
  },
  'add-feedback-notifications': {
    done: [
      '1.1','1.2','1.3','1.4','2.1','2.2','2.3','3.1','3.2','3.3','4.1','4.2','5.1','5.2','5.3',
      '6.1','6.2','6.3','6.4','6.5','7.1','7.2','7.4',
    ],
  },
  'add-monetization-observability': {
    done: [
      '1.2','1.3','1.4','2.1','2.2','3.1','3.2','3.3','3.4','3.5','3.6','3.7','4.1','4.2','4.3',
      '5.1','5.2','5.3','6.1','6.2','6.4','6.5',
    ],
  },
  'add-curated-templates': {
    done: ['1.1','1.2','2.1','2.2','3.1','4.1','5.1'],
  },
  'add-session-notes': {
    done: ['1.1','1.2','1.3','2.1','3.1','3.2','4.1','4.2','4.3','5.1','6.1'],
  },
  'add-weekly-goals': {
    done: ['1.1','1.2','2.1','2.2','3.1','3.2','4.1','4.2','5.1','6.1','7.1'],
  },
};

for (const [change, { done }] of Object.entries(PLAN)) {
  const file = join(root, 'openspec', 'changes', change, 'tasks.md');
  let text = readFileSync(file, 'utf8');
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^- \[ \] (\d+\.\d+)/);
    if (m && done.includes(m[1])) {
      lines[i] = lines[i].replace('- [ ]', '- [x]');
    }
  }
  writeFileSync(file, lines.join('\n'));
  const total = lines.filter((l) => /^- \[[ x]\]/.test(l)).length;
  const checked = lines.filter((l) => /^- \[x\]/.test(l)).length;
  console.log(`${change}: ${checked}/${total} tasks checked`);
}
