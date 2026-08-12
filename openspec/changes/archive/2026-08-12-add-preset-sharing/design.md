# Design: add-preset-sharing

## Context

Presets lưu qua PresetRepo (AsyncStorage). Deep-link quick start `?start=` đã có trên Home. ShareService sẽ được thêm ở change `add-retention-pack` (cùng platform abstraction).

## Decisions

1. **Codec JSON versioned**: `encodePreset` trả `{ type: 'looptimer-preset', version: 1, preset: {...} }` (JSON string). `decodePreset` parse an toàn (try/catch), validate bằng `validatePreset` từ `core/validation.ts`, nếu không hợp lệ trả null. Stage id mới được sinh lại khi import (tránh trùng id).
2. **Export qua ActionMenu**: item "Share preset" xuất hiện cho mọi preset (cả template — share bản template là hợp lệ). Dùng `ShareService.share(encoded)`.
3. **Import 2 đường**: deep-link param `?import=` (giống `?start=` hiện có) và dialog "Import preset" trên Home (TextInput paste JSON). Cả hai gọi action `importPreset(json)` trong presets-store (decode + validate + save + trả kết quả).
4. **presets-store** thêm action `importPreset(json: string): Promise<{ ok: boolean; name?: string }>` — tái dùng `save` + `load`.

## Risks / Trade-offs

- **JSON nhúng trong URL dài** → web `?import=` có thể bị giới hạn URL length; native deep-link OK. Web vẫn có dialog paste JSON là đường chính.
- **Preset không hợp lệ khi import** → validate trước khi lưu, alert lỗi rõ ràng.
- **Share fail** → ShareService đã nuốt lỗi; alert "không chia sẻ được".

## Migration Plan

Không cần migration — preset format cũ vẫn đọc được (codec chỉ dùng cho export/import mới).
