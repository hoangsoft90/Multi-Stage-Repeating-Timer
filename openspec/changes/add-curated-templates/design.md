# Design: add-curated-templates

## Context

- `src/core/templates.ts`: `BUILTIN_TEMPLATES` (3 template: Work/Break, Pomodoro, HIIT — name English, immutable, không nằm trong DB). `duplicatePreset` helper.
- `src/core/timer/models.ts`: `createPresetId()`, `createStageId()`, `Preset`, `Stage`, `RepeatMode`.
- `src/core/validation.ts`: `validatePreset` — dùng làm gate cho dữ liệu template.
- Presets store: `usePresetsStore.save(preset)` (persist + reload). Home: header có nút Thống kê (bar-chart icon) + Settings (icon); templates-first: 3 built-in nổi trên danh sách.
- `_layout.tsx`: Stack.Screen cho từng route (title theo i18n).
- Components sẵn: `Chip`, `AppCard`, `GradientButton`, `ThemedText/View`, `StagePill` (dùng cho preview stages).

## Decisions

1. **Data** `src/core/curated-templates.ts`: `CuratedTemplate` interface (id/name/category/description/emoji/stages/repeatMode/fixedCount) + `CURATED_TEMPLATES` 12 template:
   - **workout**: Tabata 20/10 (fixedCount 8), EMOM 10×60 (once, 10 stage "MIN 1..10"? → dùng stage 'WORK' lặp — quyết định: 10 stage tên "MIN 1".."MIN 10", once), Sprint 30/90 (fixedCount 6)
   - **focus**: Deep Work 52/17 (fixedCount 4), Pomodoro 15/5 (fixedCount 4), Reading 25/5 (fixedCount 3)
   - **wellness**: Box Breathing (forever, Inhale 4/Hold 4/Exhale 4/Hold 4), Meditation 10 (once, 1 stage 600s), Full Body Stretch (once, 10 stage 30s: Neck/Shoulders/Arms/Back/Hips/Quads/Hamstrings/Calves/Glutes/Full)
   - **daily**: Study 45/10 (fixedCount 3), Cleaning 20/5 (fixedCount 3), Cooking Multi-Timer (once: Prep 10m/Cook 20m/Rest 5m)
   - `toPreset(template)`: `{ id: createPresetId(), name, stages: stages.map(s => ({...s, id: createStageId()})), repeatMode, fixedCount, createdAt: now, lastUsedAt: now, schemaVersion: 1 }`.
2. **Screen** `src/app/templates.tsx`: `useState` category filter ('all' | 4 loại) → `Chip` row; danh sách `AppCard`: emoji + name (subtitle) + description + `StagePill` preview (tên + `formatSeconds` ngắn) + round label + `GradientButton` "Use this" → `await usePresetsStore.getState().save(toPreset(t))` → `alertAsync(templates.added, name)` → `router.back()` (về Home). `_layout.tsx` thêm `Stack.Screen name="templates"` (title `templates.title`).
3. **Entry Home**: header thêm `IconButton` (Ionicons `library-outline`, accessibilityLabel `templates.title`) cạnh nút Thống kê → `router.push('/templates')`.
4. **Không đổi repos/model** — preset tạo ra là user preset thường (lưu vào PresetRepo, xóa/sửa được).
5. **i18n ×12** key `templates.*`: title, all, workout, focus, wellness, daily, useThis, added, rounds (cho label round), stages.

## Risks / Trade-offs

- **name/description English**: nhất quán với 3 built-in hiện tại; localize description 12×12 = nặng không xứng. Category + UI labels localize.
- **EMOM 10 stage 'MIN n'**: đơn giản, rõ ràng; không cần cơ chế đặc biệt (once).
- **Screen riêng thay vì section trên Home**: Home đã dài (templates + routine + favorites + chips + quick routine + upcoming + missed) — screen riêng giữ Home gọn, entry 1 tap.

## Migration Plan

Không migrate. Data hard-code thuần — không có storage mới.
