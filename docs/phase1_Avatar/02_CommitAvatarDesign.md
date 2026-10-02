# Thiết kế Tích hợp Git Account Avatar vào Hexagon Node (GitLens-style)

Tài liệu thiết kế chi tiết về cơ chế lấy và hiển thị biểu tượng tài khoản Git (Avatar) của người commit vào bên trong node hình lục giác trên biểu đồ commit.

---

## 1. Mục tiêu thiết kế

- Hiển thị ảnh đại diện (avatar) của tác giả commit (commit author) ngay trong tâm của hình lục giác (`HexagonNode`).
- Học hỏi cơ chế giải quyết avatar của GitLens nhưng tự triển khai độc lập, không sao chép nguyên văn mã nguồn:
  1. Nhận diện tài khoản GitHub qua định dạng email noreply để lấy trực tiếp avatar từ GitHub.
  2. Dự phòng tài khoản thông thường qua Gravatar với mã băm MD5 và fallback identicon.
  3. Cắt tròn avatar và lồng vừa vặn bên trong khung viền lục giác.
  4. Dự phòng mềm dẻo (graceful fallback) về icon ngữ nghĩa nếu không có avatar hoặc chưa commit.

---

## 2. Luồng phân giải Avatar (`src/webview/utils/avatar.ts`)

### Quy tắc phân giải URL theo loại email:

```
                  ┌───────────────────────────────┐
                  │       Author Commit Email     │
                  └───────────────┬───────────────┘
                                  │
                    Có phải email rỗng hoặc "*" ?
                       ├── Có ──> Trả về undefined (dùng icon Uncommitted)
                       └── Không
                                  │
                    Chuẩn hóa: trim().toLowerCase()
                                  │
              Kiểm tra trong bộ nhớ đệm (avatarCache)?
                       ├── Có ──> Trả về URL đã lưu
                       └── Không
                                  │
              Email có phải "noreply@github.com"?
                       ├── Có ──> Logo chính thức của GitHub
                       └── Không
                                  │
              Khớp Regex GitHub No-reply email?
              ^(?:(\d+)\+)?([a-zA-Z\d-]{1,39})@users\.noreply\.(.*)$
                       ├── Có ──> URL GitHub:
                       │          https://avatars.githubusercontent.com/u/{userId}?size={size}
                       │          hoặc https://avatars.githubusercontent.com/{username}?size={size}
                       └── Không
                                  │
                                  ▼
                    Băm email bằng thuật toán MD5
                                  │
                                  ▼
                    URL Gravatar (fallback identicon):
                    https://www.gravatar.com/avatar/{md5_hash}?s={size}&d=identicon
```

---

## 3. Thuật toán băm MD5 thuần JavaScript (RFC 1321)

Để chạy được độc lập trong môi trường Webview trình duyệt mà không phụ thuộc vào thư viện bên ngoài hay module `crypto` của Node:

1. **Chuẩn hóa UTF-8:** Chuyển đổi chuỗi đầu vào thành mảng byte UTF-8.
2. **Padding (Đệm bit):**
   - Thêm byte `0x80` (bit 1).
   - Đệm thêm các byte `0x00` sao cho tổng độ dài mảng byte chia cho 64 dư 56 byte ($L \equiv 56 \pmod{64}$).
   - Nối 8 byte cuối cùng biểu diễn độ dài số bit của chuỗi ban đầu (Little-Endian).
3. **Phân khối 512-bit (16 từ 32-bit):**
   - Duyệt từng khối 64 byte (16 từ 32-bit).
   - Khởi tạo 4 thanh ghi tích lũy:
     - $A = 0x67452301$
     - $B = 0xEFCDAB89$
     - $C = 0x98BADCFE$
     - $D = 0x10325476$
4. **4 Vòng biến đổi (64 bước):**
   - Vòng 1 (bước 0-15): $F(X, Y, Z) = (X \land Y) \lor (\neg X \land Z)$
   - Vòng 2 (bước 16-31): $G(X, Y, Z) = (X \land Z) \lor (Y \land \neg Z)$
   - Vòng 3 (bước 32-47): $H(X, Y, Z) = X \oplus Y \oplus Z$
   - Vòng 4 (bước 48-63): $I(X, Y, Z) = Y \oplus (X \lor \neg Z)$
   - Mỗi bước kết hợp cộng tràn 32-bit với bảng hằng số sin $T[i] = \lfloor 2^{32} \times |\sin(i + 1)| \rfloor$ và xoay bit trái.
5. **Định dạng kết quả:** Ghép 4 thanh ghi theo thứ tự byte Little-Endian thành chuỗi Hexadecimal 32 ký tự viết thường.

---

## 4. Thiết kế hiển thị trong `HexagonNode.tsx`

Khi một commit có `avatarUrl`:
1. **Clip Path hình tròn:**
   - Tạo thẻ `<clipPath id="hex-avatar-{id}">` với một hình tròn `<circle cx={cx} cy={cy} r={radius - 1.8} />`.
   - Với bán kính lục giác mặc định $R = 7\text{px}$, bán kính avatar sẽ là $5.2\text{px}$ (đường kính $10.4\text{px}$), để lại khoảng viền đệm $1.8\text{px}$ tinh tế giữa ảnh và viền lục giác.
2. **Nền Placeholder:**
   - Trước khi ảnh tải xong, vẽ một hình tròn nền bán kính $5.2\text{px}$ mờ với màu nhánh (`fill={colour}`, opacity 0.25) giúp giao diện không bị giật nháy.
3. **Thẻ hình ảnh SVG `<image>`:**
   - `href={avatarUrl}`
   - `clipPath="url(#hex-avatar-{id})"`
   - `preserveAspectRatio="xMidYMid slice"` để ảnh luôn vuông vắn, không bị méo tỉ lệ.
4. **Tooltip người commit:**
   - Chèn `<title>{author}</title>` để hiển thị tên người commit khi di chuột qua.
5. **Cơ chế fallback:**
   - Nếu commit là uncommitted (`isCommitted === false`): Luôn vẽ icon cây bút chì.
   - Nếu commit không có avatar hoặc đang ở trạng thái đặc biệt: Fallback về icon semantic (merge, head, tag, dot).

---

## 5. Cấu hình bảo mật CSP (`src/extension/html.ts`)

Trong Webview của VS Code, chính sách Content Security Policy mặc định chặn các ảnh tải từ internet. Cần mở quyền cho giao thức `https:` tại chỉ thị `img-src`:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'none';
  style-src ${webview.cspSource} 'unsafe-inline';
  script-src ${webview.cspSource} 'nonce-${nonce}';
  img-src ${webview.cspSource} https: data:;
  connect-src ${webview.cspSource};
">
```
