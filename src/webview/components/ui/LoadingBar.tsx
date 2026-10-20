import type { LocalizedStrings } from "@/extension/l10n/webviewL10n";
import {
  activeOperation,
  elapsedSeconds,
  type OperationKind
} from "@/webview/lib/stores/loading.store";

/**
 * Nhãn hiển thị theo loại thao tác đang chạy. `window.l10n` chỉ cung cấp chuỗi tĩnh,
 * nên bảng tra cứu này ánh xạ `OperationKind` sang khóa i18n gerund tương ứng.
 */
const LABEL_KEY: Record<OperationKind, keyof LocalizedStrings> = {
  fetch: "loadingFetch",
  pull: "loadingPull",
  push: "loadingPush",
  stash: "loadingStash",
  pop: "loadingPop"
};

/**
 * Thanh tải chặn toàn màn hình (Blocking Loading Bar). Khi có một thao tác mạng/stash
 * đang chạy (`activeOperation`), nó phủ một lớp mờ che toàn bộ UI, chặn mọi tương tác
 * chuột/phím bên dưới, và hiển thị một thẻ Cyber-Lab ở giữa gồm nhãn thao tác + thanh
 * tiến trình vô định + đồng hồ đếm giây. Khi không có thao tác, nó không render gì.
 */
export function LoadingBar() {
  const operation = activeOperation.value;

  if (operation === null) {
    return null;
  }

  return (
    <div class="fixed inset-0 z-50" role="alertdialog" aria-modal="true" aria-busy="true">
      {/* Lớp mờ che toàn màn hình: chặn click chuột lọt xuống UI phía sau. */}
      <div
        class="absolute inset-0"
        style={{
          background: "rgba(15, 23, 42, 0.55)",
          backdropFilter: "blur(6px)"
        }}
      />
      <div class="relative flex h-full items-center justify-center p-4">
        <div class="w-64 rounded-md border border-line bg-menu p-4 text-center text-menu-fg shadow-dialog">
          <p class="text-ui font-medium text-fg">{window.l10n[LABEL_KEY[operation.kind]]} ...</p>
          <div class="mt-3 h-1 w-full overflow-hidden rounded-full bg-line-soft" aria-hidden="true">
            <div class="h-full w-1/2 animate-pulse bg-focus motion-reduce:animate-none" />
          </div>
          <p class="mt-3 font-mono text-ui text-muted" aria-live="off">
            {window.l10n.loadingElapsed.replace("{0}", elapsedSeconds.value.toFixed(1))}
          </p>
        </div>
      </div>
    </div>
  );
}
