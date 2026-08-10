/**
 * Confirm/alert helpers backed by the app's own dialog (`ConfirmDialog`).
 *
 * Native `Alert.alert` is a NO-OP on react-native-web and `window.confirm`
 * can't style/customize — so every confirmation (Stop timer, delete
 * preset, start-over-running, …) now shows the same styled modal on every
 * platform through `<DialogHost />` (mounted in the root layout).
 *
 * Usage stays promise-based:
 *   const ok = await confirmAsync({ title, message, confirmLabel, destructive });
 *   alertAsync('Không thể lưu', 'Vui lòng sửa các lỗi trong form.');
 */
import { create } from 'zustand';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { t } from '@/i18n';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface PendingDialog {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
  alertMode: boolean;
}

interface DialogStore {
  pending: PendingDialog | null;
}

const useDialogStore = create<DialogStore>(() => ({ pending: null }));

let resolver: ((value: boolean) => void) | null = null;

function showDialog(opts: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  alertMode: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    // A new dialog supersedes any open one — settle the previous caller so
    // its `await` never hangs (e.g. double-tapping Stop).
    resolver?.(false);
    resolver = resolve;
    useDialogStore.setState({
      pending: {
        title: opts.title,
        message: opts.message,
        confirmLabel: opts.confirmLabel ?? t('common.ok'),
        cancelLabel: opts.cancelLabel ?? t('common.cancel'),
        destructive: opts.destructive ?? false,
        alertMode: opts.alertMode,
      },
    });
  });
}

/** Resolve + close the open dialog. */
function dismiss(value: boolean) {
  const r = resolver;
  resolver = null;
  useDialogStore.setState({ pending: null });
  r?.(value);
}

/** Promise<boolean> — resolves `true` when the user confirms. */
export function confirmAsync(options: ConfirmOptions): Promise<boolean> {
  return showDialog({ ...options, alertMode: false });
}

/** Informational dialog (single OK). Fire-and-forget. */
export function alertAsync(title: string, message = ''): void {
  void showDialog({ title, message, alertMode: true });
}

/** Test helper — force-close any open dialog. */
export function clearDialog(): void {
  dismiss(false);
}

/** Mount once in the root layout; renders the dialog when one is pending. */
export function DialogHost() {
  const pending = useDialogStore((s) => s.pending);
  if (!pending) return null;
  return (
    <ConfirmDialog
      visible
      title={pending.title}
      message={pending.message}
      confirmLabel={pending.confirmLabel}
      cancelLabel={pending.cancelLabel}
      destructive={pending.destructive}
      alertMode={pending.alertMode}
      onConfirm={() => dismiss(true)}
      onCancel={() => dismiss(false)}
    />
  );
}
