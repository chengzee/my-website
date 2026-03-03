# 🖥️ Alpine Linux + Nginx 部署指南

> 「吉米與他的貓貓小窩」靜態網站部署  
> 最後更新：2026-03-02

---

## 📋 VM 系統配置建議

| 項目 | 最低需求 | 建議配置 | 說明 |
|------|----------|----------|------|
| CPU | 1 vCPU | 1 vCPU | 純靜態網站，1 核綽綽有餘 |
| RAM | 256 MB | 512 MB | Alpine ~50MB + Nginx ~2MB，512 留餘裕 |
| Disk | 2 GB | 8 GB | 系統 ~500MB + 網站照片 ~200MB + 日誌/緩衝 |
| 網路 | NAT/Bridge | Bridge | Bridge 模式才能從外部存取 |
| OS | Alpine Linux 3.21 | Alpine Linux 3.21 | 官網下載 Standard 版 |

> 💡 **照片目前 5.8GB 但 Git repo 只含縮圖（~5MB）+ 程式碼**  
> 如果之後要放原圖到 VM 上，disk 建議 **16 GB 以上**

---

## 1️⃣ 下載 Alpine Linux

前往：https://alpinelinux.org/downloads/

選擇 **Standard** 版本：
- x86_64（Intel/AMD 64-bit）— 大部分 VM 用這個
- aarch64（ARM 64-bit）— 如果 VM 跑在 Apple Silicon 的 UTM/Parallels

下載 ISO 檔案（約 200MB）

---

## 2️⃣ 建立虛擬機

### 選項 A：UTM（macOS 推薦，免費）

1. 下載安裝 UTM：https://mac.getutm.app/
2. 開啟 UTM → **Create a New Virtual Machine**
3. 選 **Virtualize**（Apple Silicon）或 **Emulate**（Intel）
4. 選 **Linux**
5. Browse 選擇下載的 Alpine ISO
6. 設定：
   - Memory: **512 MB**
   - CPU Cores: **1**
   - Storage: **8 GB**
7. Network: **Shared Network**（稍後設定 port forwarding）
8. 完成建立，啟動 VM

### 選項 B：Parallels Desktop

1. File → New → Install from image
2. 選擇 Alpine ISO
3. 配置同上（1 CPU / 512 MB / 8 GB disk）
4. Network: **Bridged**（直接取得區網 IP）

### 選項 C：VirtualBox

1. New → Name: `my-website` → Type: Linux → Version: Other Linux (64-bit)
2. Memory: 512 MB
3. Create VHD: 8 GB (Dynamically allocated)
4. Settings → Storage → 掛載 Alpine ISO
5. Settings → Network → Bridged Adapter
6. Start

---

## 3️⃣ 安裝 Alpine Linux

> ⚠️ **重要！** VM 從 ISO 開機後只是進入 Live 環境（跑在記憶體中），  
> **必須執行 `setup-alpine` 才會真正安裝到硬碟**，否則重開機所有東西都會消失。

VM 開機後會進入 Alpine Live 環境：

```bash
# 以 root 登入（無密碼，直接按 Enter）
localhost login: root
Password: （直接按 Enter）

# ⭐ 執行安裝精靈 — 這步不能跳過！
setup-alpine
```

安裝精靈會依序詢問以下問題，逐一回答：

```
Keyboard layout:        us
Keyboard variant:       us
Hostname:               my-website
Network interface:      eth0         ← 直接 Enter 用預設
IP address:             dhcp         ← 先用 DHCP
Manual network config:  n
Root password:          （輸入你的密碼，輸入時不會顯示）
Confirm password:       （再輸入一次）
Timezone:               Asia/Taipei
HTTP Proxy:             none         ← 沒有 proxy 就打 none
NTP client:             chrony       ← 直接 Enter 用預設
Mirror:                 1            ← 或按 f 自動選最快的
SSH server:             openssh      ← 直接 Enter 用預設
```

接下來是最關鍵的硬碟安裝步驟：

```
Available disks are:
  sda    (8.6 GB ...)

Which disk(s) would you like to use?    sda      ← ⭐ 輸入 sda
How would you like to use it?           sys      ← ⭐ 輸入 sys（安裝到硬碟）
WARNING: Erase the above disk(s)?       y        ← ⭐ 輸入 y 確認
```

> 🔴 **如果沒有執行到這步，系統只在記憶體中運行，重開機就沒了！**  
> 確認標誌：安裝成功會顯示 `Installation is complete. Please reboot.`

安裝完成後：

```bash
# 1. 先在 ESXi 中退出 ISO：
#    VM Settings → CD/DVD → 取消勾選「Connect at power on」或 Disconnect
# 2. 重開機
reboot
```

重開機後以 root + 你剛設的密碼登入。  
執行 `df -h` 確認根目錄掛載在 `/dev/sda3`（不是 tmpfs）即代表安裝成功。

---

## 4️⃣ 基礎環境設定

重開機後以 root 登入：

```bash
# 更新套件庫
apk update && apk upgrade

# 安裝基本工具
apk add curl git nano sudo

# 建立一般使用者（避免全程用 root）
adduser jimmy
adduser jimmy wheel

# 允許 wheel 群組 sudo
echo '%wheel ALL=(ALL) ALL' > /etc/sudoers.d/wheel

# 啟用社群套件庫（某些套件需要）
nano /etc/apk/repositories
# 取消註釋第三行（community），存檔
apk update
```

---

## 5️⃣ 安裝 Nginx

```bash
# 安裝 Nginx
apk add nginx

# 啟動並設為開機自動啟動
rc-service nginx start
rc-update add nginx default

# 確認 Nginx 運作
curl -I http://localhost
# 應該看到 HTTP/1.1 200 OK
```

---

## 6️⃣ 設定網站目錄

```bash
# 建立網站根目錄
mkdir -p /var/www/my-website
chown -R jimmy:jimmy /var/www/my-website
```

---

## 7️⃣ 設定 Nginx 站台

```bash
# 備份預設設定
cp /etc/nginx/http.d/default.conf /etc/nginx/http.d/default.conf.bak

# 編輯站台設定
nano /etc/nginx/http.d/default.conf
```

貼上以下內容（取代全部）：

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    root /var/www/my-website;
    index index.html;

    # 靜態檔案快取（圖片、CSS、JS）
    location ~* \.(jpg|jpeg|png|gif|webp|ico|css|js|json)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # 縮圖目錄快取更長
    location /photos/_thumbnails/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # SPA-like fallback（可選，目前用不到）
    location / {
        try_files $uri $uri/ =404;
    }

    # 自訂 404 頁面
    error_page 404 /404.html;
    location = /404.html {
        internal;
    }

    # 禁止存取隱藏檔案
    location ~ /\. {
        deny all;
    }

    # 禁止存取 Python 腳本和工具
    location ~ \.(py|md)$ {
        deny all;
    }
    location /tools/ {
        deny all;
    }
    location /docs/ {
        deny all;
    }

    # Gzip 壓縮
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 256;
}
```

```bash
# 測試設定語法
nginx -t

# 重載 Nginx
rc-service nginx reload
```

---

## 8️⃣ 部署網站程式碼

### 方法 A：Git Clone（推薦）

```bash
# 切換到一般使用者
su - jimmy

# Clone 專案
cd /var/www
git clone https://github.com/chengzee/my-website.git my-website

# 之後更新只需：
cd /var/www/my-website
git pull origin main
```

### 方法 B：SCP 手動上傳

```bash
# 從 Mac 終端機執行（不是 VM 裡面）
# 先查 VM 的 IP（在 VM 裡執行 ip addr）

scp -r /Users/jimmyhuang/Documents/jimmyhuang_code/MyWebsite/* jimmy@<VM-IP>:/var/www/my-website/
```

---

## 9️⃣ 上傳原圖（可選）

如果你想在 VM 上放原始照片（非僅縮圖）：

```bash
# 從 Mac（照片較大，用 rsync 比較穩）
rsync -avz --progress \
  /Users/jimmyhuang/Documents/jimmyhuang_code/MyWebsite/photos/ \
  jimmy@<VM-IP>:/var/www/my-website/photos/
```

> ⚠️ 原圖約 5.8GB，確保 VM disk 空間足夠

---

## 🔟 驗證

```bash
# 在 VM 裡查 IP
ip addr show eth0
# 記下 inet 後面的 IP，例如 192.168.64.5

# 在 Mac 瀏覽器開啟：
# http://192.168.64.5
```

應該看到「吉米與他的貓貓小窩」首頁！

---

## 🔒 安全加固（建議）

```bash
# 1. SSH 禁用 root 登入
nano /etc/ssh/sshd_config
# 找到 PermitRootLogin，改為：
# PermitRootLogin no
rc-service sshd restart

# 2. 安裝防火牆
apk add iptables ip6tables
# 只開放 80 (HTTP) 和 22 (SSH)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A INPUT -i lo -j ACCEPT
iptables -P INPUT DROP
# 儲存規則
rc-service iptables save
rc-update add iptables default

# 3. 之後如需 HTTPS（Let's Encrypt）
apk add certbot certbot-nginx
certbot --nginx -d your-domain.com
```

---

## 📌 日常維護指令

```bash
# 更新網站（Git 方式）
cd /var/www/my-website && git pull origin main

# 更新系統
apk update && apk upgrade

# 查看 Nginx 日誌
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# 重啟 Nginx
rc-service nginx restart

# 查看磁碟使用量
df -h

# 查看記憶體使用量
free -m
```

---

## 🛠️ 疑難排解

| 問題 | 解法 |
|------|------|
| 網頁打不開 | `rc-service nginx status` 確認 Nginx 運作中 |
| 403 Forbidden | 檢查檔案權限：`chown -R jimmy:jimmy /var/www/my-website` |
| 圖片不顯示 | 確認 photos/ 目錄有檔案，路徑大小寫正確 |
| SSH 連不上 | `rc-service sshd status`，確認防火牆開放 22 port |
| Git pull 失敗 | 確認 VM 有網路：`ping 8.8.8.8` |

---

## ⏭️ 下一步

VM 建好跑起來後，告訴我 VM 的 IP，我會：
1. SSH 進去確認環境
2. 部署程式碼
3. 測試所有頁面
4. 確認上線！
