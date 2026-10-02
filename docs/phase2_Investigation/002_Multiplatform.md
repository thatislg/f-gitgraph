# Phase 2 Investigation: Bản Điều Tra Kiến Trúc Đa Nền Tảng (Cross-Platform)

Tài liệu này nghiên cứu chi tiết cấu trúc ứng dụng, cơ chế biên dịch và cách thức đóng gói để **Neo Git Graph (với nhân F# Native AOT)** hoạt động trơn tru, hiệu năng cao và an toàn trên cả 3 hệ điều hành lớn: **Windows, Linux và macOS**.

---

## 1. Ma Trận Nền Tảng Mục Tiêu (Target Matrix)

| Hệ Điều Hành | Phiên Bản Hỗ Trợ | Kiến Trúc CPU | Runtime Identifier (.NET RID) | File Nhị Phân Đầu Ra |
| :--- | :--- | :--- | :--- | :--- |
| **Windows** | Windows 10, Windows 11+ | x64 (AMD64) | `win-x64` | `neo-git-core.exe` |
| **Windows** | Windows 11 on ARM | ARM64 | `win-arm64` | `neo-git-core.exe` |
| **Linux** | Ubuntu 20.04+, Fedora 38+, Debian 11+ | x64 (AMD64) | `linux-x64` | `neo-git-core` |
| **Linux** | Ubuntu/Debian on ARM, Raspberry Pi 4/5 | ARM64 (aarch64) | `linux-arm64` | `neo-git-core` |
| **macOS** | macOS 12 Monterey trở lên (M1/M2/M3/M4) | ARM64 (Apple Silicon) | `osx-arm64` | `neo-git-core` |
| **macOS** | macOS 11 Big Sur trở lên | x64 (Intel Mac) | `osx-x64` | `neo-git-core` |

---

## 2. Cấu Trúc Thư Mục Ứng Dụng (Application Structure)

Để một VS Code extension có thể chứa hoặc tải đúng file nhị phân tương ứng với máy người dùng, cấu trúc thư mục của dự án cần được tổ chức như sau:

```
neo-git-graph/
├── package.json                         # Manifest extension
├── src/
│   ├── extension/                       # Thin TypeScript Client (Node.js)
│   │   ├── extension.ts                 # Điểm khởi đầu extension
│   │   ├── core/
│   │   │   ├── PlatformResolver.ts      # Xác định OS/Arch và định vị binary
│   │   │   ├── CoreEngineProcess.ts     # Quản lý tiến trình F# sidecar
│   │   │   └── GitCliMutator.ts         # Gọi git.exe cho lệnh ghi
│   ├── webview/                         # Giao diện UI Preact (Phase 1)
│   └── core-engine/                     # Source code F# Core (.NET)
│       ├── NeoGitGraph.Core.fsproj
│       ├── Domain.fs                    # Mô hình Types, Errors
│       ├── GitReader.fs                 # Đọc packfile / commit-graph
│       ├── GraphLayout.fs               # Thuật toán tính lane song song
│       └── Program.fs                   # Điểm khởi chạy Stdio RPC
│
├── bin/                                 # Chứa các file nhị phân Native AOT
│   ├── win-x64/
│   │   └── neo-git-core.exe
│   ├── win-arm64/
│   │   └── neo-git-core.exe
│   ├── linux-x64/
│   │   └── neo-git-core
│   ├── linux-arm64/
│   │   └── neo-git-core
│   ├── osx-arm64/
│   │   └── neo-git-core
│   └── osx-x64/
│       └── neo-git-core
└── out/                                 # Mã biên dịch của Extension Host & Webview
```

---

## 3. Cơ Chế Phát Hiện & Nạp Binary Khi Chạy (Platform Resolver)

Phía TypeScript Extension Host sử dụng module `PlatformResolver.ts` để tự động chọn đúng binary tại runtime:

```typescript
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

export function resolveCoreBinaryPath(extensionContext: vscode.ExtensionContext): string {
    const platform = process.platform; // 'win32' | 'linux' | 'darwin'
    const arch = process.arch;         // 'x64' | 'arm64'

    let rid = '';
    let binaryName = 'neo-git-core';

    if (platform === 'win32') {
        binaryName += '.exe';
        rid = arch === 'arm64' ? 'win-arm64' : 'win-x64';
    } else if (platform === 'linux') {
        rid = arch === 'arm64' ? 'linux-arm64' : 'linux-x64';
    } else if (platform === 'darwin') {
        rid = arch === 'arm64' ? 'osx-arm64' : 'osx-x64';
    } else {
        throw new Error(`Nền tảng không được hỗ trợ: ${platform} ${arch}`);
    }

    const binaryPath = path.join(extensionContext.extensionPath, 'bin', rid, binaryName);

    if (!fs.existsSync(binaryPath)) {
        throw new Error(`Không tìm thấy file nhị phân core engine tại: ${binaryPath}`);
    }

    // Đảm bảo file nhị phân có quyền thực thi (executable permission) trên Linux và macOS
    if (platform !== 'win32') {
        try {
            const stat = fs.statSync(binaryPath);
            const isExecutable = (stat.mode & 0o111) !== 0;
            if (!isExecutable) {
                fs.chmodSync(binaryPath, 0o755);
            }
        } catch (err) {
            console.warn('Không thể cấp quyền chmod cho binary:', err);
        }
    }

    return binaryPath;
}
```

---

## 4. Những Thách Thức Kỹ Thuật Đa Nền Tảng & Giải Pháp

### 4.1. Đường Dẫn File & Phân Cách Thư Mục (Path Separator)
- **Vấn đề**: Windows sử dụng dấu `\` (ví dụ: `D:\repo\.git`), trong khi Linux và macOS sử dụng dấu `/` (ví dụ: `/home/user/repo/.git`). Ngoài ra Windows có ký tự ổ đĩa (`C:`, `D:`).
- **Giải pháp trên F#**:
  - Luôn sử dụng `System.IO.Path.Combine` hoặc chuẩn hóa toàn bộ đường dẫn nội bộ về chuẩn Unix `/` (`path.Replace('\\', '/')`).
  - Trong Git, định dạng ref và tree object bên trong `.git/` luôn luôn dùng dấu `/` trên mọi hệ điều hành.

### 4.2. Quyền Thực Thi (Executable Permission / `chmod +x`)
- **Vấn đề**: Khi đóng gói file zip/VSIX trên Windows, thuộc tính phân quyền file Unix (`0755`) thường bị mất. Khi giải nén trên Ubuntu hoặc macOS, file `neo-git-core` có thể bị lỗi `EACCES: permission denied`.
- **Giải pháp**:
  - Phía TypeScript kiểm tra bit thực thi và tự động gọi `fs.chmodSync(binaryPath, 0o755)` trước khi `child_process.spawn()` (như code ở Mục 3).

### 4.3. macOS Gatekeeper & Ký Số (Code Signing)
- **Vấn đề**: macOS Catalina trở lên chặn các file thực thi nhị phân không có chứng chỉ Apple Developer với cảnh báo *"neo-git-core cannot be opened because the developer cannot be verified"*.
- **Giải pháp**:
  - Với môi trường phát triển / self-build: Sử dụng lệnh ad-hoc codesign:
    ```bash
    codesign -s - --force bin/osx-arm64/neo-git-core
    codesign -s - --force bin/osx-x64/neo-git-core
    ```
  - Khi phân phối chính thức qua VS Code Marketplace: Đăng ký chứng chỉ Apple Developer ID hoặc thực hiện codesign trong quy trình CI/CD của GitHub Actions.
  - Phía Extension có thể xử lý xóa cờ cách ly (quarantine attribute) nếu cần:
    `xattr -d com.apple.quarantine <binaryPath>`.

### 4.4. Thư Viện C Native (`libgit2`) & Phụ Thuộc C-Runtime
- **Vấn đề**:
  - Trên Linux: Một số distro dùng phiên bản `glibc` khác nhau (Ubuntu 20.04 dùng glibc 2.31, Fedora 39 dùng glibc 2.38). Nếu biên dịch trên máy có glibc mới thì máy cũ sẽ báo lỗi `version 'GLIBC_2.38' not found`.
  - Trên Windows: Cần thư viện Universal C Runtime (`ucrtbase.dll`), vốn đã có sẵn mặc định từ Windows 10 trở lên.
- **Giải pháp**:
  - **Biên dịch trên môi trường glibc cũ nhất** (ví dụ: build trên `ubuntu-20.04` container) để file nhị phân tương thích ngược với mọi bản Ubuntu, Fedora, Debian hiện đại.
  - Cấu hình F# Native AOT nhúng tĩnh (Statically linked) C-runtime khi khả thi, hoặc sử dụng `libgit2` dạng nhúng tĩnh để không cần phụ thuộc vào file `.so` hay `.dylib` bên ngoài.

---

## 5. Chiến Lược Đóng Gói VSIX (Packaging Strategies)

Có 2 phương án đóng gói VSIX để người dùng cài đặt:

### Phương án A: Universal VSIX (Tất cả trong một - Khuyên dùng cho giai đoạn đầu)
- **Cơ chế**: File `.vsix` chứa đủ các binary trong thư mục `bin/` (`win-x64`, `linux-x64`, `osx-arm64`...).
- **Ưu điểm**:
  - Người dùng tải 1 file VSIX duy nhất cài được trên mọi máy.
  - Cực kỳ thuận tiện khi phân phối nội bộ qua file đính kèm GitHub Releases.
- **Dung lượng**: Mỗi binary Native AOT nặng ~6 - 8MB. Tổng cộng 5 nền tảng sẽ làm file VSIX nặng khoảng 30MB - 35MB (vẫn ở mức nhẹ so với các extension như GitLens ~40MB).

### Phương án B: Platform-Specific VSIX (Chuẩn VS Code Marketplace)
- **Cơ chế**: VS Code hỗ trợ thuộc tính `--target` khi đóng gói bằng `vsce package`:
  ```bash
  vsce package --target win32-x64
  vsce package --target linux-x64
  vsce package --target darwin-arm64
  ```
- **Ưu điểm**:
  - Người dùng chỉ tải đúng file nhị phân cho hệ điều hành của mình.
  - Kích thước file VSIX siêu nhẹ (~8MB).
- **Áp dụng**: Khi dự án đã ổn định và sẵn sàng phát hành chính thức lên Visual Studio Marketplace.

---

## 6. Quy Trình Tự Động Hóa Build Đa Nền Tảng (CI/CD Matrix)

Sử dụng **GitHub Actions** với ma trận đa hệ điều hành để tự động biên dịch Native AOT cho từng OS:

```yaml
name: Build Cross-Platform Core Engine

on: [push, pull_request]

jobs:
  build-engine:
    strategy:
      matrix:
        include:
          - os: windows-latest
            rid: win-x64
            output: neo-git-core.exe
          - os: ubuntu-20.04
            rid: linux-x64
            output: neo-git-core
          - os: macos-latest
            rid: osx-arm64
            output: neo-git-core

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET SDK
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'

      - name: Publish Native AOT
        run: |
          dotnet publish src/core-engine/NeoGitGraph.Core.fsproj \
            -c Release \
            -r ${{ matrix.rid }} \
            --self-contained \
            -p:PublishAot=true \
            -o ./dist-bin/${{ matrix.rid }}

      - name: Upload Artifact
        uses: actions/upload-artifact@v4
        with:
          name: core-${{ matrix.rid }}
          path: ./dist-bin/${{ matrix.rid }}/${{ matrix.output }}
```

---

## 7. Tóm Tắt & Kết Luận Cho Kiến Trúc

1. **Khả thi 100%**: F# với .NET Native AOT hỗ trợ native hoàn hảo cả 3 nền tảng (Windows 10/11, Linux Ubuntu/Fedora, macOS Intel & Apple Silicon).
2. **Không cần cài đặt phụ thuộc**: Người dùng cuối không cần cài .NET SDK/Runtime hay Python/Mono trên máy.
3. **An toàn & Trong suốt**: Tầng TypeScript Extension Host tự động phát hiện hệ điều hành và gán quyền thực thi, đảm bảo người dùng trải nghiệm liền mạch trên mọi môi trường.
