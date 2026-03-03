# MyWebsite 專案指引

## 📋 專案資訊

| 項目 | 內容 |
|------|------|
| 專案 | Jimmy 個人網站（吉米與他的貓貓小窩） |
| 技術 | HTML, CSS, JavaScript, Python (圖片處理) |
| Git Remote | `https://github.com/chengzee/my-website.git` (branch: main) |
| 部署目標 | 後續將建立 VM 運行 |

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
├── css/
│   └── style.css           # 共用樣式表
├── js/
│   └── common.js           # 共用 JS（header scroll、漢堡選單、active nav）
├── images/
│   └── favicon.png         # 網站 icon
├── photos/                 # 相片目錄（JPG）
├── convert_heic_batch.py   # HEIC→JPG 批次轉檔
└── update-photolist_json.py # 掃描 photos/ 更新 JSON
```

## 🎨 設計規範
- 主色：`#336699`，hover：`#274d73`
- 背景色：`#f8f8f8`，卡片底：`#fff`
- Footer 底色：`#2c3e50`
- 字體：Segoe UI / Noto Sans TC / Arial
- 所有頁面共用統一 header（導覽列：首頁/相片集/貓咪/飲食日記/文章/關於）+ footer
- Hero 頁面（homepage）header 初始透明，滾動後變白
- 手機版 ≤768px 漢堡選單折疊

## 程式碼風格
- HTML/CSS/JS 優先考慮可讀性與簡潔
- CSS 抽離至 `css/style.css`，不在 HTML 內嵌大量 style
- JS 共用邏輯放 `js/common.js`，頁面專屬邏輯用 inline script
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
