# MyWebsite 專案指引

## 📋 專案資訊

| 項目 | 內容 |
|------|------|
| 專案 | Jimmy 個人網站 |
| 技術 | HTML, CSS, JavaScript, Python (圖片處理) |

## 🎯 專案範圍

這是一個**純前端個人網站**，功能包含：
- 首頁 (index.html / homepage.html)
- 相片藝廊 (photo-gallery.html)
- HEIC 圖片轉檔 (convert_heic_batch.py)
- 相片清單更新 (update-photolist_json.py)

## 程式碼風格
- HTML/CSS/JS 優先考慮可讀性與簡潔
- Python 腳本使用標準 library 為主
- 檔案命名：kebab-case（HTML）、snake_case（Python）

## Git 操作
- Remote: 個人 repo
- 提交前確認 `git status`、`git diff`
- Commit message 格式：`feat/fix/docs: 簡短描述`

## 注意事項
- 此專案與 assistant 專案**完全獨立**，不共用任何工具或設定
- 不涉及 JIRA、Jenkins、NAS、Robot Framework 等功能
- 圖片檔案較大，注意 .gitignore 排除不必要的檔案
