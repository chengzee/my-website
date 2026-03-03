# 🖥️ VM 日常維護手冊

> 「吉米與他的貓貓小窩」伺服器維護指南  
> 就算沒有 AI 助理，你也能自己搞定！  
> 最後更新：2026-03-03

---

## 📋 VM 基本資訊

| 項目 | 內容 |
|------|------|
| 平台 | ESXi 虛擬機 |
| OS | Alpine Linux 3.23.3 |
| IP | `10.77.49.88` |
| 帳號 | `root` |
| 密碼 | `3edc@WSX1qaz` |
| SSH | `ssh root@10.77.49.88`（已配置 SSH Key） |
| Web Server | Nginx 1.28.2 |
| 網站目錄 | `/var/www/my-website` |
| Nginx 設定 | `/etc/nginx/http.d/default.conf` |
| 磁碟 | 30.1 GB（網站照片約 5.7GB） |

---

## 🔄 重開機後：確認服務

Alpine Linux 已設定 Nginx 開機自動啟動，**正常情況重開機後不需要做任何事**。

但如果你想確認，SSH 進去後執行：

```bash
# 1. 確認 Nginx 有在跑
rc-service nginx status
# 預期輸出：* status: started

# 2. 確認在監聽 80 port
netstat -tlnp | grep :80
# 預期看到 0.0.0.0:80 LISTEN

# 3. 本機測試網頁
curl -s -o /dev/null -w '%{http_code}' http://localhost/
# 預期輸出：200
```

### ❌ 如果 Nginx 沒有在跑

```bash
# 啟動 Nginx
rc-service nginx start

# 確認加入開機自動啟動（只需做一次）
rc-update add nginx default

# 如果啟動失敗，查看錯誤
nginx -t          # 測試設定檔語法
cat /var/log/nginx/error.log   # 看錯誤日誌
```

---

## 🌐 更新網站內容

### 方法一：Git Pull（推薦）

在 Mac 上修改並 push 到 GitHub 後，SSH 進 VM 拉最新程式碼：

```bash
ssh root@10.77.49.88
cd /var/www/my-website
git pull origin main
```

> ⚠️ 這只會更新 HTML/CSS/JS/JSON 等程式碼，  
> 照片不在 Git 裡，需要用方法二。

### 方法二：Rsync 同步照片

從 Mac 同步新照片到 VM：

```bash
# 同步某一隻貓的照片（在 Mac 上執行）
rsync -avz --progress ~/Documents/jimmyhuang_code/MyWebsite/photos/波波/ root@10.77.49.88:/var/www/my-website/photos/波波/

# 同步全部照片
rsync -avz --progress ~/Documents/jimmyhuang_code/MyWebsite/photos/ root@10.77.49.88:/var/www/my-website/photos/
```

### 方法三：同步縮圖

如果用 `tools/generate-thumbnails.py` 產生了新縮圖：

```bash
rsync -avz --progress ~/Documents/jimmyhuang_code/MyWebsite/photos/_thumbnails/ root@10.77.49.88:/var/www/my-website/photos/_thumbnails/
```

---

## 🔧 常用維護指令

### Nginx 操作

```bash
# 啟動 / 停止 / 重啟
rc-service nginx start
rc-service nginx stop
rc-service nginx restart

# 重新載入設定（不中斷服務）
rc-service nginx reload

# 測試設定檔語法
nginx -t
```

### 查看日誌

```bash
# Nginx 存取日誌
tail -f /var/log/nginx/access.log

# Nginx 錯誤日誌
tail -f /var/log/nginx/error.log

# 看最近 50 行
tail -50 /var/log/nginx/error.log
```

### 磁碟空間

```bash
# 總體空間
df -h /

# 照片目錄用了多少
du -sh /var/www/my-website/photos/

# 各子目錄明細
du -sh /var/www/my-website/photos/*/
```

### 系統資訊

```bash
# 系統版本
cat /etc/alpine-release

# 記憶體使用
free -m

# CPU 使用
top -bn1 | head -5

# 開機時間
uptime
```

---

## 🛡️ Nginx 安全設定

目前 Nginx 設定已封鎖以下路徑（回傳 403）：

| 路徑 | 說明 |
|------|------|
| `/.git` | Git 版本庫 |
| `/*.md` | Markdown 文件（CLAUDE.md 等） |
| `/tools/` | Python 工具腳本 |
| `/*.py` | Python 檔案 |

### 查看目前設定

```bash
cat /etc/nginx/http.d/default.conf
```

### 修改設定後重新載入

```bash
# 1. 編輯
nano /etc/nginx/http.d/default.conf

# 2. 測試語法
nginx -t

# 3. 沒問題就載入
rc-service nginx reload
```

---

## 🆘 疑難排解

### 問題：瀏覽器打不開網頁

1. **確認 VPN 有連上**（你的 VM 在內網 10.77.49.88）
2. **確認 Nginx 有在跑**：
   ```bash
   ssh root@10.77.49.88 "rc-service nginx status"
   ```
3. **確認 port 80 有在聽**：
   ```bash
   ssh root@10.77.49.88 "netstat -tlnp | grep :80"
   ```
4. **從 Mac 測試連線**：
   ```bash
   curl -I http://10.77.49.88/
   ```
5. 如果 curl 可以但瀏覽器不行，**檢查瀏覽器是否走了 Proxy**

### 問題：照片載入很慢

- 照片原圖很大（2-8MB/張），第一次載入會慢
- Gallery 頁面已使用縮圖（~36KB/張），應該很快
- Lightbox 點開才載入原圖，這是正常的

### 問題：git pull 衝突

```bash
cd /var/www/my-website
# 放棄本機修改，強制用 GitHub 上的版本
git fetch origin
git reset --hard origin/main
```

### 問題：磁碟空間不足

```bash
# 查看哪裡最佔空間
du -sh /var/www/my-website/photos/*/ | sort -rh

# 清理 Nginx 日誌
> /var/log/nginx/access.log
> /var/log/nginx/error.log
rc-service nginx reload
```

### 問題：VM 重開機後 Nginx 沒自動啟動

```bash
# 手動啟動
rc-service nginx start

# 確認在自動啟動清單
rc-update show default | grep nginx

# 如果沒有，加入：
rc-update add nginx default
```

---

## 📁 VM 目錄結構

```
/var/www/my-website/          ← 網站根目錄
├── index.html                ← 入口（重定向到 homepage.html）
├── homepage.html             ← 主首頁
├── photo-gallery.html        ← 相片藝廊
├── cats.html                 ← 貓咪檔案
├── cat-diary.html            ← 飲食日記
├── articles.html             ← 文章列表
├── about.html                ← 關於頁面
├── 404.html                  ← 錯誤頁
├── photo-list.json           ← 相片清單
├── css/style.css             ← 共用樣式
├── js/common.js              ← 共用 JS
├── images/favicon.png        ← 網站 icon
└── photos/                   ← 相片（~5.7GB）
    ├── _thumbnails/           ← 縮圖（~5MB）
    │   ├── 波波/
    │   ├── 米米/
    │   ├── 豆豆/
    │   └── 小寶寶/
    ├── 波波/                  ← 153 檔案
    ├── 米米/                  ← 163 檔案
    ├── 豆豆/                  ← 185 檔案
    └── 小寶寶/                ← 55 檔案
```

---

## ⏰ 開機自動啟動服務清單

```
acpid    | default    ← 電源管理
crond    | default    ← 排程
nginx    | default    ← 網頁伺服器 ⭐
ntpd     | default    ← 時間同步
sshd     | default    ← SSH 遠端連線
```

查看完整清單：`rc-update show default`
