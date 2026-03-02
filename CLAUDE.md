# CLAUDE.md — MyWebsite 專案 AI 助理指引

> 基於 Boris Cherny（Anthropic 工程師、Claude Code 主要創建者）分享的最佳實踐，  
> 針對「吉米與他的貓貓小窩」個人網站專案客製化。  
> 此文件讓 AI 助理在任何裝置、任何時間都能延續相同的工作品質與經驗。

---

## 🧠 工作流程編排

### 1. 計畫模式優先
- 任何超過 3 步驟的任務，先進入**計畫模式**
- 發現方向偏離時，**立刻停下重新規劃**，不要硬撐
- 修改 CSS/HTML 架構前先列出影響範圍
- 寫好明確的變更規格再動手

### 2. 分步執行策略
- 大型重構拆成多個小步驟，逐步驗證
- 研究性質的工作（查 CSS 相容性、RWD 斷點等）先獨立調查
- 一次只專注處理一個功能，避免混亂
- 保持 commit 粒度適當：一個功能一個 commit

### 3. 自我改進循環
- 使用者糾正後，將錯誤模式記錄到本文件的「📒 經驗教訓」區塊
- 為自己建立規則，**防止重複犯錯**
- 每次開始新工作階段前，**先回顧經驗教訓**
- 隨時間累積，助理品質會持續提升（複利效應）

### 4. 完成前必須驗證
- 不要在沒有驗證的情況下標記任務完成
- HTML 修改後確認所有頁面的連結、導覽列一致性
- CSS 修改後考慮 RWD 斷點（768px / 480px）的影響
- 問自己：「一個前端工程師會批准這個嗎？」

### 5. 追求優雅但保持平衡
- 複雜佈局追求漂亮解法；簡單修復直接做
- 感覺像補丁的方案 → 退一步想更好的做法
- 這是個人網站，**可讀性 > 花俏技巧**
- 不要過度工程化，保持簡潔

### 6. 自主處理問題
- 發現 bug（壞連結、樣式跑版等）直接修，不用反覆確認
- 看到明顯遺漏（缺 viewport、缺 alt 屬性等）順手補上
- 使用者不需要告訴你「怎麼修」，只需要告訴你「要修什麼」

---

## 📋 任務管理

1. **計畫先行**：用 todo list 列出可勾選的工作項目
2. **確認方向**：開始實作前向使用者確認
3. **追蹤進度**：完成一項就標記一項
4. **說明變更**：每步提供簡要摘要
5. **記錄結果**：完成後更新開發紀錄
6. **捕捉教訓**：被糾正後更新經驗教訓

---

## 🎯 核心原則

| 原則 | 說明 |
|------|------|
| **簡潔優先** | 每個修改盡可能簡單，影響最少的程式碼 |
| **不偷懶** | 找到根本原因，不打臨時補丁 |
| **最小影響** | 只改必要的部分，避免引入新 bug |
| **一致性** | 所有頁面維持統一的 header / footer / 配色 / 字體 |
| **可維護性** | CSS 集中管理、JS 共用邏輯抽離、HTML 結構清晰 |

---

## 🔧 專案特定規則

### Git 操作
- Remote: `git@github.com:chengzee/my-website.git`（SSH）
- **push 前必須先執行 `git remote -v` 確認 remote，並向使用者展示確認**
- 提交前確認 `git status`、`git diff`
- Commit message 格式：`feat/fix/docs: 簡短描述`
- **絕不自行 push，必須經使用者同意**

### 設計規範
- 主色：`#336699`，hover：`#274d73`
- 背景：`#f8f8f8`，卡片：`#fff`，Footer：`#2c3e50`
- 字體：Segoe UI / Noto Sans TC / Arial
- RWD 斷點：768px（手機漢堡選單）、480px（極小螢幕）

### 檔案規範
- CSS 統一在 `css/style.css`，不在 HTML 內嵌大量 style
- JS 共用邏輯放 `js/common.js`，頁面專屬邏輯用 inline script
- 圖片統一放 `photos/`，不在根目錄散落
- HTML 用 kebab-case，Python 用 snake_case

### 專案隔離
- 此專案與 assistant 專案**完全獨立**
- 不涉及 JIRA、Jenkins、NAS、Robot Framework 等功能
- MyWebsite.code-workspace 只包含 MyWebsite 資料夾

---

## 📒 經驗教訓

> 此區塊會隨使用累積持續更新，是 AI 助理的「長期記憶」。

### 2026-03-02
1. **Git push 前必須確認 remote**  
   - 錯誤：直接執行 `git push` 沒有先確認 remote 是哪裡  
   - 正確：先 `git remote -v` 展示給使用者，確認後才 push  
   - 規則：**任何 push 操作前，先展示 remote 資訊並取得使用者同意**

2. **專案隔離意識**  
   - 錯誤：MyWebsite workspace 曾包含 assistant 資料夾，導致不相關的 MCP 工具指引被載入  
   - 正確：workspace 只包含自身專案資料夾，copilot-instructions.md 各自獨立  
   - 規則：**不同專案的指引文件保持完全隔離**

3. **GitHub 認證使用 SSH**  
   - 錯誤：用 HTTPS remote 嘗試 push，GitHub 已不支援密碼認證  
   - 正確：使用 SSH remote（`git@github.com:chengzee/my-website.git`）  
   - SSH Key：`mac-copilot-assistant`（已設定於 GitHub，read/write）  
   - 規則：**remote 一律使用 SSH 格式，若發現是 HTTPS 先 `git remote set-url` 轉換**

4. **重構前先全面盤點**  
   - 做法：先讀取所有檔案、列出問題清單、排優先序、再逐步實作  
   - 效果：一次性找出 articles.html 缺失、CSS 重複、圖片路徑混亂等多個問題  
   - 規則：**大型重構前先做完整的現況分析報告**

---

## 📝 開發紀錄

### 2026-03-02：網站架構重構
**變更內容：**
1. 抽離共用 `css/style.css`（含 RWD 斷點 768px / 480px）
2. 抽離共用 `js/common.js`（header scroll、漢堡選單、active nav 標記）
3. 所有頁面加入統一導覽列（首頁/相片集/文章/關於）+ Footer
4. `index.html` 改為自動導向 homepage.html（meta refresh + viewport 修復）
5. `homepage.html` 重寫：共用 CSS + Hero 輪播 + 卡片區塊
6. `photo-gallery.html` 重寫：Lightbox 圖片放大 + ESC 關閉
7. 新增 `about.html`：作者介紹 + 貓貓圖集（從舊 index.html 遷移）
8. 新增 `articles.html`：placeholder 頁面（修復 homepage 死連結）
9. 新增 `404.html`：VM 部署用錯誤頁
10. 完善 `.gitignore`：排除 heic_images/、converted_images/、*.bak
11. 新增 `.github/copilot-instructions.md`：專案指引
12. 新增 `CLAUDE.md`：AI 助理工作指引 + 經驗教訓
13. `MyWebsite.code-workspace` 移除 assistant，實現完全隔離

### 2026-03-02：Phase 1 — 貓咪檔案 + 飲食日記
**變更內容：**
1. 新增 `cats.html`：四隻貓（波波/米米/豆豆/小寶寶）卡片式檔案
   - 點擊卡片展開詳情（資料表、個性、最愛事物）
   - CSS 展開動畫（max-height transition）
2. 新增 `cat-diary.html`：互動式飲食日記
   - 表單：日期/時間/貓咪/類型/食物/份量/備註
   - localStorage 持久化儲存（無需後端）
   - Chart.js 近 7 天堆疊長條圖（per-cat 顏色）
   - 今日摘要卡片（每隻貓進食次數 & 總量）
   - 篩選（依貓咪/類型）
   - 匯出 / 匯入 JSON 備份功能
3. `css/style.css` 新增大量元件樣式：
   - `.cat-cards` / `.cat-card` / `.cat-card-header` / `.cat-card-body` / `.cat-card-detail`
   - `.cat-badge` / `.cat-info-table` / `.tag-list` / `.tag`
   - `.diary-form-card` / `.diary-form` / `.form-row` / `.form-group`
   - `.btn-primary` / `.btn-secondary` / `.btn-delete`
   - `.diary-controls` / `.filter-group` / `.data-actions`
   - `.diary-summary` / `.summary-grid` / `.summary-card` / `.cat-dot` / `.cat-dot-lg`
   - `.diary-chart-container` / `.diary-table-container` / `.diary-table`
   - 對應 RWD 768px / 480px 斷點
4. 所有頁面導覽列更新為 6 項：首頁/相片集/貓咪/飲食日記/文章/關於

### 2026-03-02：Phase 2 — 照片分類 + 相簿優化
**變更內容：**
1. 新增 `tools/photo-manager.py`（~778 行）：web-based 照片分類工具
   - localhost:9090，單張預覽 + 7 按鈕（4 隻貓 + 多貓 + 保留 + 刪除）
   - 鍵盤快捷鍵（1-4/M/K/D/S/Z），HEIC 用 sips 轉換預覽，MOV 跳過
   - 成功分類 636 張照片至 photos/波波、米米、豆豆、小寶寶
2. `update-photolist_json.py` 重寫：遞迴掃描子目錄，新增 thumbnail 欄位
3. `photo-gallery.html` 更新：
   - 分類篩選按鈕（全部/波波/米米/豆豆/小寶寶）
   - 改用縮圖載入（~36KB/張 vs 原本 2-8MB），Lightbox 才載入原圖
4. 新增 `tools/generate-thumbnails.py`：sips 產生 400px 寬 JPEG 縮圖
   - 141 張縮圖，總計 5.1 MB（原圖 5.8 GB）
5. `cats.html` 卡片重構：
   - HTML：加 detail-inner wrapper 修正 grid-template-rows 展開動畫
   - 新增卡片簡述、性別 badge、「查看詳細 ▾/收合 ▴」提示
   - CSS：固定 2 欄 grid、正確 0fr→1fr 展開
6. 花色修正：波波=虎斑、米米=橘虎斑白、豆豆=虎斑+白、小寶寶=虎斑
7. 生日修正：波波=2023-09、小寶寶=2016
8. 新增 `docs/使用手冊.md`：完整使用手冊

---

## 🗺️ Roadmap（待進行）

### 🔴 高優先
| # | 任務 | 說明 |
|---|------|------|
| 1 | **VM 環境建置 + 網站上線** | 建議 Alpine Linux，Nginx 靜態伺服 |
| 2 | **MyPhotos/ 171 張保留照片重新分類** | 搬回 MyPhotos/ 等再跑 photo-manager |
| 3 | **photos/ 根目錄散落 JPG 清理** | 6 張舊照片需歸類或刪除 |

### 🟡 中優先
| # | 任務 | 說明 |
|---|------|------|
| 4 | homepage.html 卡片內容更新 | 近期文章/相簿卡片仍 hardcoded |
| 5 | articles.html 內容充實 | 目前是 placeholder |
| 6 | about.html 圖片更新 | 引用根目錄舊圖，改用分類照片 |
| 7 | photos/_已刪除/ 永久清理 | 9 張待確認後刪除 |

### 🟢 低優先
| # | 任務 | 說明 |
|---|------|------|
| 8 | 相片集選取/下載/移除功能 | Admin 模式下批次管理照片 |
| 9 | 相似/重複照片偵測 | 比對相似圖片，協助清理 |
| 10 | HEIC 批次轉檔 | 使用者決定先緩緩 |
| 11 | 貓咪獨立相簿頁 | 從 cats.html 連結到各貓專屬相簿 |
| 12 | 飲食日記統計擴充 | 月度/週度趨勢圖 |
| 13 | 寵物健康紀錄 | 疫苗、就醫、體重追蹤 |

### 🐱 四隻貓資料
| 名字 | 花色 | 生日 | 性別 |
|------|------|------|------|
| 波波 BoBo | 虎斑 | 2023-09 | ♀ 女 |
| 米米 MiMi | 橘虎斑白 | 2024-05 | ♀ 女 |
| 豆豆 DouDou | 虎斑+白 | 2024-05 | ♂ 男 |
| 小寶寶 BaoBao | 虎斑 | 2016 | ♂ 男 |
