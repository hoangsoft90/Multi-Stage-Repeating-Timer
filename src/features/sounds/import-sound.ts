/**
 * Import a user audio file via the system document picker (custom sounds).
 *
 * The picked file is copied into the app's persistent document directory
 * (`<document>/user-sounds/`) so its `file://` uri survives app restarts —
 * the raw picker uri (content:// or cache copy) is not guaranteed to stay
 * valid. On web the new expo-file-system API throws, so we keep the picker
 * uri (blob/data uri — fine for the session).
 */
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { createUserSoundId, type UserSound } from './user-sounds-store';

/** Open the system file picker filtered to audio, persist the file and
 * return the new UserSound. Resolves null when canceled / unreadable. */
export async function pickAudioFile(): Promise<UserSound | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'audio/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  const name = asset.name?.trim() || 'Custom sound';
  const label = name.replace(/\.[^.]+$/, '');
  const ext = name.match(/\.[^.]+$/)?.[0] ?? '.m4a';

  const id = createUserSoundId();
  let uri = asset.uri;
  if (Platform.OS !== 'web') {
    try {
      const dir = new Directory(Paths.document, 'user-sounds');
      dir.create({ intermediates: true, idempotent: true });
      const dest = new File(dir, `${id}${ext}`);
      await new File(asset.uri).copy(dest);
      uri = dest.uri;
    } catch {
      // Best-effort persistence — fall back to the picker uri (cache copy
      // that Android may purge). The caller still gets a sound entry.
    }
  }

  return { id, label, uri, addedAt: Date.now() };
}
