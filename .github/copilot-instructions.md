# MyWebsite 專案指引

## 📋 專案資訊

| 項目 | 內容 |
|------|------|
| 專案 | Jimmy 個人網站（吉米與他的貓貓小窩） |
| 技術 | HTML, CSS, JavaScript, Python (圖片處理) |
| Git Remote | `https://github.com/chengzee/my-website.git` (branch: main) |
| 部署目標 | Alpine Linux 3.23.3 VM（ESXi, IP `10.77.49.88`, Nginx 1.28.2）|

## 🎯 專案範圍

這是一個**純前端個人網站**，功能包含：
- 首頁入口 (index.html → 自動導向 homepage.html)
- 主首頁 (homepage.html) — Hero 輪播、近期文章/相簿卡片
- 相片藝廊 (photo-gallery.html) — 分頁瀏覽 + Lightbox 放大
- 文章列表 (articles.html) — 目前為 placeholder，未來擴充
- 關於頁面 (about.html) — 作者介紹 + 貓貓們
- 404 錯誤頁 (404.html) — 部署用
- 貓咪檔案 (cats.html) — 四隻貓的個別卡片＋展開詳情
- 飲食日記 (cat-diary.html) — 互動式飲食紀錄（localStorage + Chart.js）
- HEIC 圖片轉檔 (convert_heic_batch.py)
- 相片清單更新 (update-photolist_json.py)

## 🗂 檔案架構

```
MyWebsite/
├── index.html              # 入口（自動導向 homepage.html）
├── homepage.html           # 主首頁（Hero 輪播 + 卡片）
├── photo-gallery.html      # 相片藝廊（分頁 + Lightbox）
├── cats.html               # 貓咪檔案（卡片 + 展開詳情）
├── cat-diary.html          # 飲食日記（互動式紀錄）
├── articles.html           # 文章列表（placeholder）
├── about.html              # 關於頁面
├── 404.html                # 404 錯誤頁
├── photo-list.json         # 相片清單（由 Python 腳本產生）
├── sw.js                   # Service Worker（快取策略）
├── css/
│   └── style.css           # 共用樣式表（含 Dark Mode CSS 變數）
├── js/
│   ├── common.js           # 共用 JS（Dark Mode、header scroll、漢堡選單、active nav、SW 註冊）
│   ├── components.js       # Header + Footer HTML 注入（含 Dark Mode 切換按鈕）
│   ├── hero.js             # 首頁 Hero 無限輪播（IIFE）
│   ├── gallery.js          # 相片藝廊 + Lightbox + History API（IIFE）
│   ├── cats.js             # 貓咪卡片展開/收合（IIFE）
│   ├── diary.js            # 飲食日記 CRUD + Chart.js（IIFE）
│   └── vendor/
│       └── chart.umd.min.js # Chart.js 4.4.7（本地化）
├── images/
│   └── favicon.png         # 網站 icon
├── photos/                 # 相片目錄
│   ├── _hero/              # Hero 專用 1920px 高品質圖（6 張）
│   ├── _cards/             # 首頁卡片專用 800px 圖
│   ├── _thumbnails/        # 400px 縮圖（Gallery 用）
│   ├── 波波/、米米/、豆豆/、小寶寶/ # 原圖依貓咪分類
│   └── _已歸類/            # 已歸類的雜項照片
├── convert_heic_batch.py   # HEIC→JPG 批次轉檔
└── update-photolist_json.py # 掃描 photos/ 更新 JSON
```

## 🎨 設計規範
- 主色：`#336699`（CSS 變數 `--primary`），hover：`#274d73`
- Light Mode：背景 `#f8f8f8`，卡片 `#fff`，文字 `#333`
- Dark Mode：背景 `#1a1a2e`，卡片 `#222240`，文字 `#e0e0e0`，主色 `#5599cc`
- Dark Mode 切換：`[data-theme="dark"]` CSS 變數覆蓋 + `@media (prefers-color-scheme: dark)` 自動偵測 + localStorage 持久化
- Footer 底色：`#2c3e50`
- 字體：Segoe UI / Noto Sans TC / Arial
- 所有頁面共用統一 header（導覽列：首頁/相片集/貓咪/飲食日記/文章/關於 + 🌙 Dark Mode 切換）+ footer
- Hero 頁面（homepage）header 初始透明，滾動後變白
- 手機版 ≤768px 漢堡選單折疊

## 程式碼風格
- HTML/CSS/JS 優先考慮可讀性與簡潔
- CSS 抽離至 `css/style.css`，使用 CSS 變數（`:root` + `[data-theme="dark"]`），不在 HTML 內嵌 style
- JS 共用邏輯放 `js/common.js`，頁面專屬邏輯各自抽離為獨立 JS 檔案（IIFE 封裝避免全域污染）
- 需暴露到全域的函式（如 `deleteRecord`、`adminLogin`）在 IIFE 內用 `window.fn = fn` 方式匯出
- Python 腳本使用標準 library 為主
- 檔案命名：kebab-case（HTML）、snake_case（Python）

## Git 操作
- Remote: `git@github.com:chengzee/my-website.git`（SSH）
- **push 前必須先確認 remote 資訊**（`git remote -v`），向使用者確認後才 push
- 提交前確認 `git status`、`git diff`
- Commit message 格式：`feat/fix/docs: 簡短描述`

## 注意事項
- 此專案與 assistant 專案**完全獨立**，不共用任何工具或設定
- 不涉及 JIRA、Jenkins、NAS、Robot Framework 等功能
- 圖片檔案較大，注意 .gitignore 排除不必要的檔案
- `homepage_sample.html` 為舊版，已被 `homepage.html` 取代，可考慮刪除
- 根目錄散落的 `IMG_*.jpg` 為早期遺留，圖片統一放 `photos/`
- **不要在公司內網建立外網隧道**（Cloudflare Tunnel / ngrok 等），除非使用者確認網管已授權
- 網站目前為**內網存取** `http://10.77.49.88`，未來在外網環境再實作對外功能

## 📝 開發紀錄

### 2026-03-02：網站架構重構
**變更內容：**
1. 抽離共用 `css/style.css`（含 RWD 斷點 768px / 480px）
2. 抽離共用 `js/common.js`（header scroll、漢堡選單、active nav 標記）
3. 所有頁面加入統一導覽列（首頁/相片集/文章/關於）+ Footer
4. `index.html` 改為自動導向 homepage.html（meta refresh）
5. `homepage.html` 重寫：使用共用 CSS，保留 Hero 輪播 + 卡片區塊
6. `photo-gallery.html` 重寫：加入 Lightbox 圖片放大功能 + ESC 關閉
7. 新增 `about.html`：作者介紹 + 貓貓圖集（從舊 index.html 內容遷移）
8. 新增 `articles.html`：placeholder 頁面（修復 homepage 死連結）
9. 新增 `404.html`：VM 部署用錯誤頁
10. 完善 `.gitignore`：排除 heic_images/、converted_images/、*.bak 等
11. 新增 `.github/copilot-instructions.md`：MyWebsite 專屬輕量指引
12. `MyWebsite.code-workspace` 移除 assistant 資料夾，實現專案完全隔離

**經驗教訓：**
- 執行 `git push` 前**必須先確認 remote**（`git remote -v`）並向使用者確認
- 不要假設 remote 就是正確的，先展示再行動

### 2026-03-02：Phase 1 — 貓咪檔案 + 飲食日記
**變更內容：**
1. 新增 `cats.html`：四隻貓（波波/米米/豆豆/小寶寶）卡片式檔案，點擊展開詳情
2. 新增 `cat-diary.html`：互動式飲食日記
   - 表單新增紀錄（日期/時間/貓咪/類型/食物/份量/備註）
   - localStorage 本地儲存（無需後端）
   - Chart.js 近 7 天堆疊長條圖
   - 今日摘要（每隻貓進食次數 & 總量）
   - 篩選（依貓咪/類型）
   - 匯出/匯入 JSON 備份
3. `css/style.css` 新增：cat-cards、diary-form、diary-table、summary、chart 等元件樣式 + RWD
4. 所有頁面導覽列更新為 6 項：首頁/相片集/貓咪/飲食日記/文章/關於

### 2026-03-03：Phase 3 — VM 部署 + 照片同步
**變更內容：**
1. Alpine Linux 3.23.3 VM 部署（ESXi, IP `10.77.49.88`）
2. Nginx 1.28.2 設定：靜態快取、gzip、403 安全封鎖（.git/.md/.py/tools/）
3. rsync 5.7GB 貓咪照片至 VM
4. 所有頁面驗證 HTTP 200

### 2026-03-03：Phase 3.1 — 照片整理 + 縮圖優化 + Quick Wins
**變更內容：**
1. 6 張根目錄散落照片歸類至對應貓咪子目錄
2. 產生 6 張新縮圖（25-58KB），首頁效能 30MB → <1MB
3. homepage/cats/about 圖片路徑全面改用縮圖
4. photo-list.json 修正 6 筆空分類
5. 404.html 補 meta description、CSS 移除重複 width、cats.html 修正縮排
6. Cloudflare Tunnel 嘗試失敗（port 7844 被封），使用者決策暫停外網存取

**經驗教訓：**
- 公司內網環境不建立外網隧道，避免資安風險
- Cloudflare Tunnel 需 port 7844 出站（TCP/UDP），公司防火牆通常封鎖
- 網站維持內網 `10.77.49.88` 存取，未來在外網環境再實作

### 2026-03-03：Phase 3.2 — Hero/Card 圖片品質 + Gallery 權限修復
**變更內容：**
1. Hero 輪播改用 1920px 專用圖片（`photos/_hero/`），以亮度分析選出最佳 6 張
2. 首頁卡片改用 800px 專用圖片（`photos/_cards/`），改善裁切與畫質
3. CSS `.card img` height 200→240px，加 `object-position: center 30%`
4. 相片集 Lightbox 部分照片無法顯示 — 根因：rsync 保留 macOS 權限，96 個檔案為 600（owner-only），Nginx 無法讀取
5. VM 修復：`chmod -R a+rX /var/www/my-website/photos/`，96 個檔案權限 600→644
6. 本地修復：同步修正 photos/ 權限，防止未來 rsync 再帶錯誤權限

**經驗教訓：**
- rsync 預設會保留來源檔案權限，macOS 部分檔案權限為 600（如 AirDrop 接收的照片）
- 部署後應執行 `chmod -R a+rX` 確保 web server 可讀取所有靜態檔案
- 檢查 403 問題時，先查檔案權限再查 Nginx 設定

### 2026-03-04：Phase 4 — 全站優化（CSS 變數/元件化/Lightbox 導覽/Chart.js 本地化）
**變更內容：**
1. CSS 變數系統（`:root` 統一管理色彩，20+ 變數）
2. Hero 圖片 lazy load（首 3 張 eager，其餘 lazy）
3. 貓咪卡片連結至相片集（`photo-gallery.html?cat=...`）
4. 所有 inline style 遷移至 CSS class
5. 刪除舊版遺留 CSS（`.cat-gallery` 等 ~30 行）
6. Lightbox 左右箭頭導覽 + 鍵盤 ←→ / ESC + 觸控滑動 + 計數器
7. Header/Footer 元件化（`js/components.js` 注入）
8. Chart.js 本地化（`js/vendor/chart.umd.min.js`，移除 CDN 依賴）
9. 首頁卡片改為單卡片 + 新增「近期文章」區塊

**Commit:** `1db925a`

### 2026-03-04：Lightbox 箭頭修復 + 分頁頁碼
**變更內容：**
1. Lightbox 箭頭 `position: absolute` → `position: fixed`，固定 56×72px，backdrop-filter blur + :active 動畫
2. 分頁從「← 上一頁 / 下一頁 →」升級為完整頁碼按鈕（‹ 1 2 3 ... 10 ›），neighbor=2 邏輯 + ellipsis
3. 新增 CSS：`.page-num`、`.page-num.active`、`.page-arrow`、`.page-dots`

### 2026-03-04：Phase 5 — 程式碼品質 + a11y + SEO
**變更內容：**
1. 移除 20+ 殘留 inline style → CSS class
2. 20+ hardcoded 色碼改用 CSS 變數
3. 刪除 ~30 行死碼 CSS（`.cat-gallery` 相關 + RWD）
4. 漢堡選單加 `aria-expanded` 屬性
5. 5 個頁面加 Open Graph meta 標籤
6. homepage / photo-gallery 加 `<main>` 語義標籤
7. `prefers-reduced-motion` 媒體查詢（停用動畫）
8. `:focus-visible` 鍵盤焦點樣式
9. Hero 輪播 hover 暫停（mouseenter/mouseleave）

**驗證：** Python 驗證腳本 27/27 PASSED
**Commit:** `1eec559`

### 2026-03-04：Phase 6 — 大型功能（Dark Mode / Script 抽離 / History / Service Worker）
**變更內容：**
1. **Dark Mode**：
   - `[data-theme="dark"]` CSS 變數覆蓋（--bg: #1a1a2e, --card-bg: #222240, --text: #e0e0e0 等）
   - `@media (prefers-color-scheme: dark)` 系統偏好自動偵測
   - Header 🌙/☀️ 切換按鈕（`.theme-toggle`），localStorage 持久化
   - 元件覆蓋：header、nav、filter、gallery、diary、pagination 全套 dark 樣式
2. **Inline Script 抽離**（4 個 HTML → 4 個 IIFE JS 檔案）：
   - `homepage.html` → `js/hero.js`（Hero 輪播、自動播放、觸控、hover 暫停）
   - `photo-gallery.html` → `js/gallery.js`（Gallery 渲染、分頁、篩選、Lightbox）
   - `cats.html` → `js/cats.js`（卡片展開/收合）
   - `cat-diary.html` → `js/diary.js`（飲食日記 CRUD、管理員登入、Chart.js、匯出/匯入）
3. **Gallery History**：`history.pushState` + `popstate` 監聽，瀏覽器上/下一頁可在相片集分頁間切換
4. **Image Placeholder**：Gallery 圖片灰色背景佔位 + `opacity: 0→1` 淡入效果（`.loaded` class）
5. **Service Worker**（`sw.js`）：
   - 核心 CSS/JS/HTML 預快取（`catsite-v1`）
   - 縮圖/Hero/Card 圖片 Cache-First
   - HTML/JSON Network-First（離線 fallback 快取版）
   - `js/common.js` 中註冊 SW

**部署：** rsync 至 VM，所有頁面 + JS 檔案 HTTP 200 ✅
**Commit:** `8d072d0`
