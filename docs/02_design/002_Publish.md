Để xuất bản một Extension cho VS Code lên cả **Microsoft Marketplace** (dùng cho VS Code chính thức) và **Open VSX** (dùng cho VSCodium, Gitpod, Eclipse Theia...), bạn cần thực hiện theo các bước chi tiết dưới đây.

---

### BƯỚC 1: Chuẩn bị Extension (Dùng chung cho cả 2)

1. **Cấu hình `package.json`:**
   Đảm bảo file `package.json` của bạn có đầy đủ các thông tin:
   ```json
   {
     "name": "ten-extension",
     "displayName": "Tên Hiển Thị",
     "version": "0.0.1",
     "publisher": "ten-publisher-cua-ban", // Phải khớp với tên Publisher bạn tạo sau này
     "engines": {
       "vscode": "^1.80.0"
     },
     "repository": {
       "type": "git",
       "url": "https://github.com/username/repo"
     },
     "icon": "icon.png" // Khuyến nghị 128x128 px
   }
   ```
2. **Cần có file `README.md` và `LICENSE`**: Cả hai nền tảng đều yêu cầu/khuyến khích bắt buộc phải có.

---

### BƯỚC 2: Đưa lên Microsoft VS Code Marketplace

#### 1. Tạo tài khoản Publisher
1. Truy cập [Visual Studio Marketplace Management Portal](https://marketplace.visualstudio.com/manage).
2. Đăng nhập bằng tài khoản Microsoft.
3. Nhấp vào **Create publisher**, điền các thông tin:
   * **ID**: Tên định danh (viết liền, không dấu). **Giá trị này phải khớp với trường `publisher` trong file `package.json`**.
   * **Name**: Tên hiển thị.

#### 2. Lấy Personal Access Token (PAT) từ Azure DevOps
Microsoft quản lý quyền qua Azure DevOps:
1. Truy cập [dev.azure.com](https://dev.azure.com) và đăng nhập.
2. Tạo một Tổ chức (Organization) nếu chưa có. Lưu ý chọn tổ chức là **All accessible organizations** khi tạo token.
3. Ở góc phải trên, nhấp vào biểu tượng **User settings** (cạnh avatar) -> chọn **Personal access tokens**.
4. Nhấp **New Token**:
   * **Organization**: Chọn `All accessible organizations`.
   * **Scopes**: Nhấp vào *Show all scopes*, cuộn xuống tìm **Marketplace** và tích vào ô **Manage**.
5. Nhấp **Create** và **LƯU LẠI TOKEN NÀY** (bạn sẽ không xem lại được).

#### 3. Xuất bản Extension
Bạn có 2 cách:

* **Cách 1: Qua Web (Đơn giản nhất)**
  1. Cài đặt công cụ đóng gói: `npm install -g @vscode/vsce`
  2. Tại thư mục dự án, chạy lệnh: `vsce package` (Nó sẽ tạo ra file `.vsix`).
  3. Vào trang [Marketplace Management](https://marketplace.visualstudio.com/manage), chọn Publisher của bạn.
  4. Bấm **New extension** -> **Visual Studio Code** -> Tải file `.vsix` lên.

* **Cách 2: Dùng lệnh (CLI)**
  1. Đăng nhập qua terminal:
     ```bash
     vsce login <tên-publisher-của-bạn>
     # Nhập PAT token bạn vừa tạo ở trên
     ```
  2. Xuất bản:
     ```bash
     vsce publish
     ```

---

### BƯỚC 3: Đưa lên Open VSX Registry

Open VSX là giải pháp mã nguồn mở thay thế cho Microsoft Marketplace.

#### 1. Tạo tài khoản & Namespace
1. Truy cập [open-vsx.org](https://open-vsx.org/).
2. Đăng nhập bằng tài khoản **GitHub**.
3. Bấm vào Avatar -> chọn **Settings**.
4. Tạo một **Namespace** (Namespace này **phải trùng tên** với trường `publisher` trong `package.json`).
   * *Lưu ý:* Lần đầu tạo Namespace, Open VSX có thể yêu cầu xác minh (claim) nếu namespace đó chưa có ai dùng. Quá trình này hoàn toàn tự động nếu tài khoản GitHub khớp với tên hoặc bạn sở hữu repo.

#### 2. Lấy Access Token
1. Vẫn trong trang **Settings** của Open VSX.
2. Cuộn xuống phần **Access Tokens**, tạo một token mới.
3. Copy lại Token.

#### 3. Xuất bản Extension
Sử dụng công cụ `ovsx`:
* **Cách nhanh nhất (không cần cài tool toàn cục):**
  Dùng chính file `.vsix` đã tạo ở Bước 2:
  ```bash
  npx ovsx publish <duong-dan-toi-file>.vsix -p <TOKEN_OPEN_VSX>
  ```
  *(Thay `<TOKEN_OPEN_VSX>` bằng token bạn lấy ở bước trên)*.

---

### BƯỚC 4 (Khuyên dùng): Tự động hóa qua GitHub Actions

Để mỗi lần ra phiên bản mới bạn không cần gõ lệnh thủ công, hãy tạo file `.github/workflows/publish.yml`:

```yaml
name: Publish Extension

on:
  release:
    types: [created] # Chạy khi bạn tạo một Release mới trên GitHub

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm install

      # Publish to Microsoft Marketplace
      - name: Publish to VS Code Marketplace
        run: npx @vscode/vsce publish -p ${{ secrets.VSCE_PAT }}

      # Publish to Open VSX
      - name: Publish to Open VSX
        run: npx ovsx publish -p ${{ secrets.OVSX_PAT }}
```

**Cần làm:** Vào GitHub repo của bạn -> `Settings` -> `Secrets and variables` -> `Actions` -> Thêm 2 secret:
* `VSCE_PAT`: Token của Azure DevOps.
* `OVSX_PAT`: Token của Open VSX.

Lần sau, bạn chỉ cần nâng version trong `package.json`, push code lên và tạo một **Release/Tag mới trên GitHub**, extension sẽ tự động được gửi lên cả 2 chợ.
