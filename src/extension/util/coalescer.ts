// Cơ chế gom sự kiện (coalescing): nhiều lần gọi `trigger()` liên tiếp chỉ dẫn đến
// một lần gọi `callback` sau khoảng lặng `delayMs` — dùng để hoãn xử lý biến động
// tệp hệ thống dồn dập (ví dụ rebase nhiều commit) thành một thông báo duy nhất.

export function createCoalescer(delayMs: number, callback: () => void | Promise<void>) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return {
    trigger(): void {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        timer = undefined;
        void callback();
      }, delayMs);
    },
    dispose(): void {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
    }
  };
}
