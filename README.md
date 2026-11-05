# N1 Dojo — Web ôn thi JLPT N1

## Mục Lục
- [1. Giới thiệu](#1-giới-thiệu)
- [2. Cấu trúc thư mục](#2-cấu-trúc-thư-mục)
- [3. Chạy thử trên máy](#3-chạy-thử-trên-máy)
- [4. Deploy lên GitHub Pages](#4-deploy-lên-github-pages)
  - [4.1 Chuẩn bị](#41-chuẩn-bị)
  - [4.2 Tạo repository](#42-tạo-repository)
  - [4.3 Đẩy code lên GitHub](#43-đẩy-code-lên-github)
  - [4.4 Bật GitHub Pages](#44-bật-github-pages)
  - [4.5 Cập nhật nội dung sau này](#45-cập-nhật-nội-dung-sau-này)
- [5. Thêm dữ liệu học](#5-thêm-dữ-liệu-học)
- [6. Tuỳ chọn nâng cao](#6-tuỳ-chọn-nâng-cao)
- [7. Xử lý sự cố](#7-xử-lý-sự-cố)

---

## 1. Giới thiệu

Web tĩnh (HTML/CSS/JS thuần, **không cần build, không cần server**) để ôn JLPT N1:

| Chức năng | Mô tả |
|---|---|
| Tổng quan | Đếm ngược ngày thi JLPT (Chủ nhật đầu tiên của tháng 7/12), chuỗi ngày học, số thẻ cần ôn |
| Từ vựng / Kanji | Flashcard lật thẻ, lặp lại ngắt quãng (Leitner 7 hộp), phát âm tiếng Nhật, phím tắt |
| Ngữ pháp | Danh sách mẫu N1, tìm kiếm, cấu trúc + ví dụ, đánh dấu đã thuộc |
| Đọc hiểu | Đoạn văn + câu hỏi trắc nghiệm có giải thích |
| Thi thử | Trộn 4 dạng câu hỏi, 10/20/30 câu, bấm giờ, xem lại câu sai |
| Tiến độ | Thống kê, biểu đồ hộp Leitner, xuất/nhập file JSON sao lưu |

Tiến độ học lưu bằng `localStorage` trên trình duyệt — mỗi máy/trình duyệt có dữ liệu riêng. Dùng **Tiến độ → Xuất JSON / Nhập JSON** để chuyển máy.

Dữ liệu mẫu: 50 từ vựng, 24 kanji, 30 mẫu ngữ pháp, 2 bài đọc. Bạn tự bổ sung thêm theo [mục 5](#5-thêm-dữ-liệu-học).

## 2. Cấu trúc thư mục

```
jlpt-n1-study/
├── index.html            # Trang chính (khung giao diện + menu)
├── .nojekyll             # Báo GitHub Pages không xử lý Jekyll
├── assets/
│   ├── css/style.css     # Giao diện (có chế độ sáng/tối)
│   └── js/app.js         # Toàn bộ logic: router, flashcard, quiz, tiến độ
└── data/
    ├── vocab.js          # Từ vựng
    ├── kanji.js          # Kanji
    ├── grammar.js        # Ngữ pháp
    └── reading.js        # Bài đọc hiểu
```

## 3. Chạy thử trên máy

Cách nhanh nhất: **mở trực tiếp file `index.html`** bằng Chrome/Edge (dữ liệu nạp bằng `<script>` nên chạy được cả với `file://`).

Hoặc chạy server cục bộ (giống môi trường GitHub Pages hơn):

```bash
cd jlpt-n1-study
python -m http.server 8000
# mở http://localhost:8000
```

## 4. Deploy lên GitHub Pages

### 4.1 Chuẩn bị
- Tài khoản GitHub cá nhân (ví dụ username: `yourname`).
- Cài [Git](https://git-scm.com/downloads). Kiểm tra: `git --version`.
- Cấu hình tên/email (một lần duy nhất):
  ```bash
  git config --global user.name "Tên của bạn"
  git config --global user.email "email-github-cua-ban@example.com"
  ```

### 4.2 Tạo repository
1. Vào https://github.com/new
2. **Repository name** — chọn 1 trong 2:
   - `jlpt-n1-study` → web sẽ ở `https://yourname.github.io/jlpt-n1-study/`
   - `yourname.github.io` (đúng bằng username) → web ở `https://yourname.github.io/`
3. Chọn **Public** (GitHub Pages miễn phí yêu cầu repo public).
4. **Không** tick “Add a README” (đã có sẵn). Bấm **Create repository**.

### 4.3 Đẩy code lên GitHub

```bash
cd D:/WorkSpace/jlpt-n1-study
git init
git add .
git commit -m "Khởi tạo web ôn thi N1"
git branch -M main
git remote add origin https://github.com/yourname/jlpt-n1-study.git
git push -u origin main
```

> Lần đầu push, Git sẽ mở cửa sổ đăng nhập GitHub (Git Credential Manager). Nếu được hỏi mật khẩu trên dòng lệnh, dùng **Personal Access Token** (GitHub → Settings → Developer settings → Personal access tokens → Fine-grained, quyền *Contents: Read and write*) thay cho mật khẩu.

Không muốn dùng dòng lệnh? Trên trang repo vừa tạo bấm **uploading an existing file**, kéo thả toàn bộ nội dung thư mục (kể cả `assets/`, `data/`) rồi **Commit changes**. Lưu ý file `.nojekyll` bị ẩn trên Windows — nếu không thấy, tạo file mới tên `.nojekyll` (nội dung trống) ngay trên GitHub.

### 4.4 Bật GitHub Pages
1. Vào repo → **Settings** → **Pages** (menu trái).
2. **Source**: chọn **Deploy from a branch**.
3. **Branch**: chọn `main`, thư mục `/ (root)` → **Save**.
4. Chờ 1–2 phút, tải lại trang Settings → Pages sẽ hiện: *Your site is live at `https://yourname.github.io/jlpt-n1-study/`*.
5. Theo dõi tiến trình ở tab **Actions** (workflow `pages build and deployment`).

### 4.5 Cập nhật nội dung sau này

```bash
# sửa file xong
git add .
git commit -m "Thêm 50 từ vựng mới"
git push
```

GitHub Pages tự deploy lại sau ~1 phút. Nếu chưa thấy thay đổi, nhấn `Ctrl+F5` để bỏ cache.

## 5. Thêm dữ liệu học

Mở file trong `data/`, copy một dòng có sẵn, sửa nội dung. Chú ý giữ dấu phẩy `,` giữa các mục.

**Từ vựng** (`data/vocab.js`):
```js
{ w: "顧客", r: "こきゃく", m: "khách hàng", e: "顧客の声を大切にする。", ev: "Coi trọng ý kiến khách hàng." },
```

**Kanji** (`data/kanji.js`):
```js
{ k: "顧", hv: "CỐ", on: "コ", kun: "かえり(みる)", m: "nhìn lại", ex: [["顧客", "こきゃく", "khách hàng"]] },
```

**Ngữ pháp** (`data/grammar.js`) — `q` là câu ví dụ thay phần mẫu bằng `＿＿`, `a` là đoạn điền vào (dùng cho Thi thử):
```js
{ p: "～に際して", m: "khi, nhân dịp", s: "N / Vる + に際して", e: "出発に際して注意事項を説明します。",
  ev: "Trước khi xuất phát xin giải thích các lưu ý.", q: "出発＿＿注意事項を説明します。", a: "に際して" },
```

**Đọc hiểu** (`data/reading.js`) — `a` là chỉ số đáp án đúng, bắt đầu từ `0`:
```js
{ title: "Tiêu đề", level: "短文", text: "Đoạn văn…\nĐoạn 2…",
  qs: [{ q: "Câu hỏi", o: ["A", "B", "C", "D"], a: 2, x: "Giải thích" }] },
```

> Lưu ý: tiến độ flashcard gắn với chính chữ (`w` / `k`). Đổi chữ của một mục đã học sẽ làm mục đó tính như thẻ mới.

Kiểm tra lỗi cú pháp sau khi sửa: mở web, nhấn `F12` → tab **Console**. Nếu có dòng đỏ báo lỗi ở `data/xxx.js` thì thường là thiếu dấu phẩy hoặc dấu ngoặc kép.

## 6. Tuỳ chọn nâng cao

**Tên miền riêng**: Settings → Pages → *Custom domain* nhập `n1.tenmien.com`, rồi tạo bản ghi DNS `CNAME` trỏ về `yourname.github.io`. Tick **Enforce HTTPS** khi đã có chứng chỉ.

**Repo private**: GitHub Pages cho repo private cần gói GitHub Pro trở lên.

**Đổi giao diện**: màu chủ đạo nằm ở biến `--accent` đầu file `assets/css/style.css` (có bản riêng cho chế độ tối).

## 7. Xử lý sự cố

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| Trang 404 sau khi bật Pages | Chờ thêm 2–5 phút; kiểm tra `index.html` nằm ở **gốc** repo (không nằm trong thư mục con) |
| Trang trắng, không có nội dung | `F12` → Console xem lỗi; thường do sai cú pháp file `data/*.js` |
| Không có CSS / dữ liệu | Tên file phân biệt hoa thường trên GitHub (`style.css` ≠ `Style.css`) |
| Không phát âm được | Trình duyệt/OS chưa có giọng tiếng Nhật. Windows: Settings → Time & language → Speech → thêm Japanese |
| Mất tiến độ | Đã xoá dữ liệu duyệt web hoặc dùng tab ẩn danh. Hãy xuất JSON sao lưu định kỳ |
| Sửa rồi mà web không đổi | Cache trình duyệt — nhấn `Ctrl+F5`, hoặc xem tab Actions đã deploy xong chưa |
