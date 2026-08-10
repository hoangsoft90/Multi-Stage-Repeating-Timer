/**
 * Custom confirm/alert dialog tests (redesign: the app's own styled dialog
 * replaces native Alert.alert + window.confirm — identical on all platforms).
 *
 * Note: @testing-library/react-native v14 makes render()/fireEvent() async;
 * store updates that render the dialog must be wrapped in `act` to flush.
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { confirmAsync, alertAsync, DialogHost, clearDialog } from '../confirm';

const renderHost = async () => {
  await render(<DialogHost />);
};

beforeEach(() => {
  clearDialog();
});

describe('confirmAsync', () => {
  it('hiện dialog với title/message; bấm confirm → resolves true và dialog đóng', async () => {
    await renderHost();
    let result: boolean | undefined;
    await act(async () => {
      confirmAsync({ title: 'Dừng timer?', message: 'Chắc chưa?', confirmLabel: 'Dừng', destructive: true }).then(
        (v) => (result = v),
      );
    });
    expect(screen.getByText('Dừng timer?')).toBeTruthy();
    expect(screen.getByText('Chắc chưa?')).toBeTruthy();
    expect(screen.getByText('Hủy')).toBeTruthy();
    await fireEvent.press(screen.getByText('Dừng'));
    await waitFor(() => expect(result).toBe(true));
    expect(screen.queryByText('Dừng timer?')).toBeNull();
  });

  it('bấm Hủy → resolves false và dialog đóng', async () => {
    await renderHost();
    let result: boolean | undefined;
    await act(async () => {
      confirmAsync({ title: 'T', message: 'M' }).then((v) => (result = v));
    });
    await fireEvent.press(screen.getByText('Hủy'));
    await waitFor(() => expect(result).toBe(false));
    expect(screen.queryByText('T')).toBeNull();
  });

  it('chạm backdrop (ngoài card) → resolves false', async () => {
    await renderHost();
    let result: boolean | undefined;
    await act(async () => {
      confirmAsync({ title: 'T', message: 'M' }).then((v) => (result = v));
    });
    await fireEvent.press(screen.getByLabelText('Đóng dialog'));
    await waitFor(() => expect(result).toBe(false));
    expect(screen.queryByText('T')).toBeNull();
  });

  it('dialog mới đè dialog cũ → promise trước resolve false (không treo)', async () => {
    await renderHost();
    let first: boolean | undefined;
    await act(async () => {
      confirmAsync({ title: 'Dialog 1', message: 'M' }).then((v) => (first = v));
      confirmAsync({ title: 'Dialog 2', message: 'M' });
    });
    expect(first).toBe(false);
    expect(screen.getByText('Dialog 2')).toBeTruthy();
    expect(screen.queryByText('Dialog 1')).toBeNull();
  });

  it('dùng label mặc định OK / Hủy khi không truyền', async () => {
    await renderHost();
    await act(async () => {
      confirmAsync({ title: 'T', message: 'M' });
    });
    expect(screen.getByText('OK')).toBeTruthy();
    expect(screen.getByText('Hủy')).toBeTruthy();
  });
});

describe('alertAsync', () => {
  it('hiện dialog alert với OK; bấm OK → đóng', async () => {
    await renderHost();
    await act(async () => {
      alertAsync('Không thể lưu', 'Vui lòng sửa các lỗi.');
    });
    expect(screen.getByText('Không thể lưu')).toBeTruthy();
    expect(screen.getByText('Vui lòng sửa các lỗi.')).toBeTruthy();
    await fireEvent.press(screen.getByText('OK'));
    expect(screen.queryByText('Không thể lưu')).toBeNull();
  });

  it('message mặc định rỗng (chỉ title)', async () => {
    await renderHost();
    await act(async () => {
      alertAsync('LoopTimer');
    });
    expect(screen.getByText('LoopTimer')).toBeTruthy();
    expect(screen.getByText('OK')).toBeTruthy();
  });
});
