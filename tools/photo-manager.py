#!/usr/bin/env python3
"""
📸 貓咪照片分類工具 — 逐張預覽 + 快速分類
用法：python3 tools/photo-manager.py
瀏覽器開啟 http://localhost:9090
"""
import os
import sys
import json
import shutil
import mimetypes
import urllib.parse
import subprocess
import tempfile
from http.server import HTTPServer, BaseHTTPRequestHandler

# ── 設定 ──────────────────────────────────────────────
PORT = 9090
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_DIR = os.path.join(BASE_DIR, "MyPhotos")
OUTPUT_DIR = os.path.join(BASE_DIR, "photos")

CATEGORIES = {
    "bobo":    "波波",
    "mimi":    "米米",
    "doudou":  "豆豆",
    "baby":    "小寶寶",
    "keep":    "_保留",
    "delete":  "_已刪除",
}

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".heic"}
VIDEO_EXTS = {".mp4", ".mov", ".avi", ".mkv", ".m4v", ".webm"}
ALL_EXTS = IMAGE_EXTS | VIDEO_EXTS

# HEIC 轉檔快取目錄
HEIC_CACHE = os.path.join(tempfile.gettempdir(), "photo-manager-heic-cache")
os.makedirs(HEIC_CACHE, exist_ok=True)


def convert_heic_to_jpeg(heic_path):
    """用 macOS sips 將 HEIC 轉為 JPEG（有快取）"""
    basename = os.path.splitext(os.path.basename(heic_path))[0]
    # 用原檔修改時間作為快取 key，避免舊快取
    mtime = str(int(os.path.getmtime(heic_path)))
    cache_name = "%s_%s.jpg" % (basename, mtime)
    cache_path = os.path.join(HEIC_CACHE, cache_name)
    if os.path.isfile(cache_path):
        return cache_path
    try:
        subprocess.run(
            ["sips", "-s", "format", "jpeg", "-s", "formatOptions", "80",
             heic_path, "--out", cache_path],
            capture_output=True, timeout=15
        )
        if os.path.isfile(cache_path):
            return cache_path
    except Exception as e:
        print("  ⚠️ HEIC 轉檔失敗: %s" % e)
    return None


def scan_files():
    """掃描 MyPhotos/ 內所有圖片與影片"""
    if not os.path.isdir(SOURCE_DIR):
        return []
    files = []
    for f in sorted(os.listdir(SOURCE_DIR)):
        ext = os.path.splitext(f)[1].lower()
        if ext in ALL_EXTS:
            files.append(f)
    return files


def get_file_type(filename):
    ext = os.path.splitext(filename)[1].lower()
    if ext in IMAGE_EXTS:
        return "image"
    if ext in VIDEO_EXTS:
        return "video"
    return "unknown"


# ── HTML 頁面 ─────────────────────────────────────────
HTML_PAGE = r"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🐱 貓咪照片分類工具</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    background: #1a1a2e; color: #eee;
    font-family: -apple-system, "Segoe UI", "Noto Sans TC", sans-serif;
    height: 100vh; display: flex; flex-direction: column; overflow: hidden;
}

/* ── 頂部資訊列 ── */
.top-bar {
    background: #16213e; padding: 8px 20px;
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px solid #0f3460; flex-shrink: 0;
}
.top-bar .info { font-size: 14px; color: #aaa; }
.top-bar .info span { color: #e94560; font-weight: bold; }
.top-bar .filename {
    font-size: 15px; font-weight: bold; color: #fff;
    max-width: 50%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* ── 預覽區 ── */
.preview-area {
    flex: 1; display: flex; justify-content: center; align-items: center;
    padding: 10px; min-height: 0; position: relative; overflow: hidden;
}
.preview-area img {
    max-width: 100%; max-height: 100%; object-fit: contain;
    border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
}
.preview-area video {
    max-width: 100%; max-height: 100%; border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
}
.no-file {
    text-align: center; color: #888; font-size: 20px;
}
.no-file .emoji { font-size: 80px; margin-bottom: 20px; }

/* ── 底部按鈕列 ── */
.btn-bar {
    background: #16213e; padding: 12px 20px;
    display: flex; gap: 10px; justify-content: center; align-items: center;
    flex-wrap: wrap; border-top: 1px solid #0f3460; flex-shrink: 0;
}
.btn {
    padding: 12px 24px; border: none; border-radius: 8px;
    font-size: 15px; font-weight: bold; cursor: pointer;
    transition: all 0.15s; color: #fff; position: relative;
}
.btn:hover { transform: translateY(-2px); filter: brightness(1.15); }
.btn:active { transform: translateY(0); }
.btn .key {
    display: inline-block; background: rgba(255,255,255,0.2);
    border-radius: 4px; padding: 1px 6px; font-size: 11px;
    margin-left: 6px; vertical-align: middle;
}

.btn-bobo   { background: #e17055; }
.btn-mimi   { background: #00b894; }
.btn-doudou { background: #0984e3; }
.btn-baby   { background: #a29bfe; }
.btn-multi  { background: #fdcb6e; color: #333; }
.btn-keep   { background: #636e72; }
.btn-delete { background: #d63031; }
.btn-undo   { background: #2d3436; border: 1px solid #636e72; font-size: 13px; padding: 8px 14px; }
.btn-skip   { background: #6c5ce7; }

/* ── 載入中 spinner ── */
.loading-spinner {
    display: flex; flex-direction: column;
    align-items: center; gap: 12px; color: #888;
}
.loading-spinner .spin {
    width: 40px; height: 40px; border: 4px solid #333;
    border-top-color: #e94560; border-radius: 50%;
    animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── 影片控制提示 ── */
.video-hint {
    position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
    background: rgba(0,0,0,0.7); padding: 6px 14px; border-radius: 20px;
    font-size: 12px; color: #aaa; pointer-events: none;
}

/* ── 多貓複選 overlay ── */
.overlay {
    display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.85); z-index: 100;
    justify-content: center; align-items: center;
}
.overlay.show { display: flex; }
.overlay-box {
    background: #16213e; border-radius: 16px; padding: 30px;
    min-width: 320px; text-align: center;
    border: 2px solid #0f3460;
}
.overlay-box h3 { margin-bottom: 20px; font-size: 20px; }
.overlay-box label {
    display: block; padding: 10px 16px; margin: 6px 0;
    background: #1a1a2e; border-radius: 8px; cursor: pointer;
    font-size: 16px; transition: background 0.15s;
}
.overlay-box label:hover { background: #0f3460; }
.overlay-box input[type="checkbox"] { margin-right: 10px; transform: scale(1.3); }
.overlay-btns { margin-top: 20px; display: flex; gap: 10px; justify-content: center; }
.overlay-btns .btn { padding: 10px 30px; }

/* ── Toast 通知 ── */
.toast {
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    background: #00b894; color: #fff; padding: 12px 24px;
    border-radius: 8px; font-size: 14px; font-weight: bold;
    z-index: 200; opacity: 0; transition: opacity 0.3s;
    pointer-events: none;
}
.toast.show { opacity: 1; }
.toast.error { background: #d63031; }

/* ── 進度條 ── */
.progress-bar {
    height: 3px; background: #0f3460; flex-shrink: 0;
}
.progress-bar .fill {
    height: 100%; background: linear-gradient(90deg, #e94560, #0984e3);
    transition: width 0.3s;
}
</style>
</head>
<body>

<div class="progress-bar"><div class="fill" id="progressFill"></div></div>

<div class="top-bar">
    <div class="filename" id="filename">載入中...</div>
    <div class="info">
        <span id="current">0</span> / <span id="total">0</span>
        &nbsp;|&nbsp; 已分類: <span id="classified">0</span>
    </div>
</div>

<div class="preview-area" id="previewArea">
    <div class="no-file">
        <div class="emoji">🐱</div>
        <div>載入中...</div>
    </div>
</div>

<div class="btn-bar">
    <button class="btn btn-bobo" onclick="classify('bobo')">🐱 波波 <span class="key">1</span></button>
    <button class="btn btn-mimi" onclick="classify('mimi')">🐱 米米 <span class="key">2</span></button>
    <button class="btn btn-doudou" onclick="classify('doudou')">🐱 豆豆 <span class="key">3</span></button>
    <button class="btn btn-baby" onclick="classify('baby')">🐱 小寶寶 <span class="key">4</span></button>
    <button class="btn btn-multi" onclick="showMulti()">🐾 多隻貓 <span class="key">M</span></button>
    <button class="btn btn-keep" onclick="classify('keep')">📁 保留 <span class="key">K</span></button>
    <button class="btn btn-delete" onclick="classify('delete')">🗑️ 刪除 <span class="key">D</span></button>
    <button class="btn btn-skip" onclick="skipFile()">⏭ 跳過 <span class="key">S</span></button>
    <button class="btn btn-undo" onclick="undoLast()">↩ 復原 <span class="key">Z</span></button>
</div>

<!-- 多貓複選 -->
<div class="overlay" id="multiOverlay">
    <div class="overlay-box">
        <h3>🐾 選擇多隻貓咪</h3>
        <label><input type="checkbox" value="bobo"> 🐱 波波</label>
        <label><input type="checkbox" value="mimi"> 🐱 米米</label>
        <label><input type="checkbox" value="doudou"> 🐱 豆豆</label>
        <label><input type="checkbox" value="baby"> 🐱 小寶寶</label>
        <div class="overlay-btns">
            <button class="btn btn-multi" onclick="confirmMulti()">✅ 確認分類</button>
            <button class="btn btn-undo" onclick="hideMulti()">取消</button>
        </div>
    </div>
</div>

<div class="toast" id="toast"></div>

<script>
let files = [];
let currentIndex = 0;
let classifiedCount = 0;
let lastAction = null;
let mediaAbort = null;  // AbortController for media loading
let isClassifying = false;  // prevent double-click

// ── 初始化 ──
async function init() {
    const res = await fetch('/api/files');
    const data = await res.json();
    files = data.files;
    classifiedCount = 0;
    document.getElementById('total').textContent = files.length;
    if (files.length > 0) {
        showFile(0);
    } else {
        showDone();
    }
}

function showDone() {
    document.getElementById('previewArea').innerHTML =
        '<div class="no-file"><div class="emoji">✅</div><div>MyPhotos/ 內沒有需要分類的檔案了！</div></div>';
    document.getElementById('filename').textContent = '全部完成！';
}

// ── 停止當前媒體載入 ──
function abortMedia() {
    // 停止影片播放與下載
    const video = document.querySelector('.preview-area video');
    if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();  // 強制釋放連線
    }
    // 停止圖片載入
    const img = document.querySelector('.preview-area img');
    if (img) {
        img.removeAttribute('src');
    }
}

// ── 顯示檔案 ──
function showFile(idx) {
    abortMedia();

    if (idx >= files.length) {
        document.getElementById('previewArea').innerHTML =
            '<div class="no-file"><div class="emoji">🎉</div><div>所有檔案已分類完成！</div></div>';
        document.getElementById('filename').textContent = '全部完成！';
        document.getElementById('current').textContent = files.length;
        updateProgress();
        return;
    }
    currentIndex = idx;
    const file = files[idx];
    const encoded = encodeURIComponent(file.name);
    document.getElementById('filename').textContent = file.name;
    document.getElementById('current').textContent = idx + 1;
    updateProgress();

    const area = document.getElementById('previewArea');

    // 先顯示 loading
    area.innerHTML = '<div class="loading-spinner"><div class="spin"></div><div>載入中...</div></div>';

    if (file.type === 'image') {
        const img = new Image();
        img.onload = function() { area.innerHTML = ''; area.appendChild(img); };
        img.onerror = function() {
            area.innerHTML = '<div class="no-file"><div class="emoji">⚠️</div><div>圖片載入失敗<br><small>' + file.name + '</small></div></div>';
        };
        img.alt = 'preview';
        img.src = '/media/' + encoded;
    } else if (file.type === 'video') {
        // 影片：preload metadata only，不自動下載全檔
        area.innerHTML = '<video src="/media/' + encoded + '" controls preload="metadata" playsinline></video>' +
            '<div class="video-hint">💡 點擊播放 | 按分類鍵可直接跳過不用等載入</div>';
        const video = area.querySelector('video');
        video.onloadedmetadata = function() {
            const hint = area.querySelector('.video-hint');
            if (hint) hint.remove();
        };
        video.onerror = function() {
            area.innerHTML = '<div class="no-file"><div class="emoji">⚠️</div><div>影片載入失敗<br><small>' + file.name + '</small></div></div>';
        };
    } else {
        area.innerHTML = '<div class="no-file"><div class="emoji">❓</div><div>無法預覽此檔案類型</div></div>';
    }
}

function updateProgress() {
    const pct = files.length > 0 ? ((currentIndex) / files.length * 100) : 0;
    document.getElementById('progressFill').style.width = pct + '%';
}

// ── 分類動作 ──
async function classify(category) {
    if (currentIndex >= files.length) return;
    if (isClassifying) return;  // 防止連點
    isClassifying = true;

    const file = files[currentIndex];

    // 立刻停止媒體載入，釋放連線給 API
    abortMedia();

    try {
        const res = await fetch('/api/classify', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ filename: file.name, categories: [category] })
        });
        const data = await res.json();

        if (data.ok) {
            lastAction = { filename: file.name, categories: [category], destinations: data.destinations };
            classifiedCount++;
            document.getElementById('classified').textContent = classifiedCount;

            const catNames = [category].map(c => getCatName(c)).join(', ');
            showToast('✅ ' + file.name + ' → ' + catNames);

            files.splice(currentIndex, 1);
            document.getElementById('total').textContent = files.length;

            if (currentIndex >= files.length) {
                showFile(files.length);
            } else {
                showFile(currentIndex);
            }
        } else {
            showToast('❌ 錯誤: ' + data.error, true);
        }
    } catch (err) {
        showToast('❌ 網路錯誤，請重試', true);
    } finally {
        isClassifying = false;
    }
}

// ── 跳過（不分類，跳到下一張，之後可回來）──
function skipFile() {
    if (currentIndex >= files.length) return;
    abortMedia();
    // 把當前檔案移到列表末尾
    const skipped = files.splice(currentIndex, 1)[0];
    files.push(skipped);
    showToast('⏭ 已跳過，移至最後');
    if (currentIndex >= files.length) currentIndex = 0;
    showFile(currentIndex);
}

// ── 多貓複選 ──
function showMulti() {
    if (currentIndex >= files.length) return;
    document.getElementById('multiOverlay').classList.add('show');
    // 清除之前的勾選
    document.querySelectorAll('#multiOverlay input[type="checkbox"]').forEach(cb => cb.checked = false);
}

function hideMulti() {
    document.getElementById('multiOverlay').classList.remove('show');
}

async function confirmMulti() {
    const checked = [];
    document.querySelectorAll('#multiOverlay input[type="checkbox"]:checked').forEach(cb => {
        checked.push(cb.value);
    });
    if (checked.length === 0) {
        showToast('⚠️ 請至少選擇一隻貓', true);
        return;
    }
    if (isClassifying) return;
    isClassifying = true;
    hideMulti();

    const file = files[currentIndex];
    abortMedia();

    try {
        const res = await fetch('/api/classify', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ filename: file.name, categories: checked })
        });
        const data = await res.json();

        if (data.ok) {
            lastAction = { filename: file.name, categories: checked, destinations: data.destinations };
            classifiedCount++;
            document.getElementById('classified').textContent = classifiedCount;

            const catNames = checked.map(c => getCatName(c)).join(', ');
            showToast('✅ ' + file.name + ' → ' + catNames);

            files.splice(currentIndex, 1);
            document.getElementById('total').textContent = files.length;

            if (currentIndex >= files.length) {
                showFile(files.length);
            } else {
                showFile(currentIndex);
            }
        } else {
            showToast('❌ 錯誤: ' + data.error, true);
        }
    } catch (err) {
        showToast('❌ 網路錯誤，請重試', true);
    } finally {
        isClassifying = false;
    }
}

// ── 復原 ──
async function undoLast() {
    if (!lastAction) {
        showToast('⚠️ 沒有可復原的操作', true);
        return;
    }
    const res = await fetch('/api/undo', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(lastAction)
    });
    const data = await res.json();

    if (data.ok) {
        showToast('↩ 已復原: ' + lastAction.filename);
        classifiedCount = Math.max(0, classifiedCount - 1);
        document.getElementById('classified').textContent = classifiedCount;
        lastAction = null;
        // 重新載入檔案列表
        const filesRes = await fetch('/api/files');
        const filesData = await filesRes.json();
        files = filesData.files;
        document.getElementById('total').textContent = files.length;
        // 找到復原的檔案位置
        let restoredIdx = files.findIndex(f => f.name === data.filename);
        if (restoredIdx === -1) restoredIdx = currentIndex;
        showFile(restoredIdx);
    } else {
        showToast('❌ 復原失敗: ' + data.error, true);
    }
}

// ── 工具函數 ──
function getCatName(cat) {
    const names = { bobo: '波波', mimi: '米米', doudou: '豆豆', baby: '小寶寶', keep: '保留', delete: '刪除' };
    return names[cat] || cat;
}

function showToast(msg, isError) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show' + (isError ? ' error' : '');
    setTimeout(() => { t.className = 'toast'; }, 2000);
}

// ── 鍵盤快捷鍵 ──
document.addEventListener('keydown', function(e) {
    // 如果多貓 overlay 開啟
    if (document.getElementById('multiOverlay').classList.contains('show')) {
        if (e.key === 'Escape') hideMulti();
        if (e.key === 'Enter') confirmMulti();
        return;
    }
    switch(e.key) {
        case '1': classify('bobo'); break;
        case '2': classify('mimi'); break;
        case '3': classify('doudou'); break;
        case '4': classify('baby'); break;
        case 'm': case 'M': showMulti(); break;
        case 'k': case 'K': classify('keep'); break;
        case 'd': case 'D': classify('delete'); break;
        case 's': case 'S': skipFile(); break;
        case 'z': case 'Z': undoLast(); break;
    }
});

init();
</script>
</body>
</html>"""


# ── HTTP Handler ──────────────────────────────────────
class Handler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        # 簡化 log，只顯示重要資訊
        msg = format % args
        if '/api/' in msg or 'error' in msg.lower():
            sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), msg))

    def safe_send(self, data):
        """安全發送，忽略 BrokenPipe"""
        try:
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_GET(self):
        path = urllib.parse.unquote(self.path)

        # 首頁
        if path == "/" or path == "/index.html":
            try:
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                self.safe_send(HTML_PAGE.encode("utf-8"))
            except (BrokenPipeError, ConnectionResetError):
                pass
            return

        # 檔案列表 API
        if path == "/api/files":
            files = scan_files()
            result = []
            for f in files:
                result.append({"name": f, "type": get_file_type(f)})
            try:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.safe_send(json.dumps({"files": result}).encode())
            except (BrokenPipeError, ConnectionResetError):
                pass
            return

        # 媒體檔案
        if path.startswith("/media/"):
            filename = path[7:]  # 去掉 /media/
            filepath = os.path.join(SOURCE_DIR, filename)
            if not os.path.isfile(filepath):
                try:
                    self.send_response(404)
                    self.end_headers()
                except (BrokenPipeError, ConnectionResetError):
                    pass
                return

            # HEIC → 即時轉 JPEG 預覽
            serve_path = filepath
            ext = os.path.splitext(filename)[1].lower()
            if ext == ".heic":
                converted = convert_heic_to_jpeg(filepath)
                if converted:
                    serve_path = converted
                    mime = "image/jpeg"
                else:
                    # 轉檔失敗，回傳提示圖
                    try:
                        self.send_response(500)
                        self.send_header("Content-Type", "text/plain")
                        self.end_headers()
                        self.safe_send(b"HEIC conversion failed")
                    except (BrokenPipeError, ConnectionResetError):
                        pass
                    return
            else:
                mime = mimetypes.guess_type(filepath)[0]
                if mime is None:
                    mime = "application/octet-stream"

            try:
                self.send_response(200)
                self.send_header("Content-Type", mime)
                self.send_header("Cache-Control", "no-cache")
                fsize = os.path.getsize(serve_path)
                self.send_header("Content-Length", str(fsize))
                self.end_headers()
                with open(serve_path, "rb") as f:
                    while True:
                        chunk = f.read(65536)
                        if not chunk:
                            break
                        self.wfile.write(chunk)
            except (BrokenPipeError, ConnectionResetError):
                pass
            return

        # 其他 → 404
        try:
            self.send_response(404)
            self.end_headers()
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_POST(self):
        path = urllib.parse.unquote(self.path)
        content_len = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_len)

        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            self._json_response(400, {"ok": False, "error": "Invalid JSON"})
            return

        # 分類 API
        if path == "/api/classify":
            filename = data.get("filename", "")
            categories = data.get("categories", [])
            src = os.path.join(SOURCE_DIR, filename)

            if not os.path.isfile(src):
                self._json_response(404, {"ok": False, "error": "檔案不存在"})
                return

            destinations = []
            try:
                for cat in categories:
                    folder_name = CATEGORIES.get(cat)
                    if not folder_name:
                        continue
                    dest_dir = os.path.join(OUTPUT_DIR, folder_name)
                    os.makedirs(dest_dir, exist_ok=True)
                    dest = os.path.join(dest_dir, filename)
                    # 避免覆蓋同名檔案
                    if os.path.exists(dest):
                        base, ext = os.path.splitext(filename)
                        counter = 1
                        while os.path.exists(dest):
                            dest = os.path.join(dest_dir, "%s_%d%s" % (base, counter, ext))
                            counter += 1
                    shutil.copy2(src, dest)
                    destinations.append(dest)

                # 所有複製完成後刪除原檔
                os.remove(src)
                print("  ✅ %s → %s" % (filename, ", ".join(CATEGORIES.get(c, c) for c in categories)))
                self._json_response(200, {"ok": True, "destinations": destinations})

            except Exception as e:
                self._json_response(500, {"ok": False, "error": str(e)})
            return

        # 復原 API
        if path == "/api/undo":
            filename = data.get("filename", "")
            destinations = data.get("destinations", [])
            src = os.path.join(SOURCE_DIR, filename)

            try:
                # 從第一個目的地複製回來
                if destinations and os.path.isfile(destinations[0]):
                    shutil.copy2(destinations[0], src)
                # 刪除所有目的地的檔案
                for dest in destinations:
                    if os.path.isfile(dest):
                        os.remove(dest)
                print("  ↩ 復原: %s" % filename)
                self._json_response(200, {"ok": True, "filename": filename})
            except Exception as e:
                self._json_response(500, {"ok": False, "error": str(e)})
            return

        self._json_response(404, {"ok": False, "error": "Unknown API"})

    def _json_response(self, code, data):
        try:
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.safe_send(json.dumps(data).encode())
        except (BrokenPipeError, ConnectionResetError):
            pass


# ── 主程式 ────────────────────────────────────────────
def main():
    # 確保目標資料夾存在
    for folder in CATEGORIES.values():
        os.makedirs(os.path.join(OUTPUT_DIR, folder), exist_ok=True)

    files = scan_files()
    print("=" * 50)
    print("🐱 貓咪照片分類工具")
    print("=" * 50)
    print("📂 來源: %s" % SOURCE_DIR)
    print("📁 輸出: %s" % OUTPUT_DIR)
    print("📷 待分類: %d 個檔案" % len(files))
    print()
    print("分類目標資料夾：")
    for key, name in CATEGORIES.items():
        print("  %s → photos/%s/" % (key, name))
    print()
    print("🌐 開啟瀏覽器: http://localhost:%d" % PORT)
    print("⌨️  快捷鍵: 1=波波 2=米米 3=豆豆 4=小寶寶 M=多貓 K=保留 D=刪除 S=跳過 Z=復原")
    print("📌 HEIC 檔案會自動轉為 JPEG 預覽（首次較慢）")
    print("🛑 按 Ctrl+C 停止")
    print("=" * 50)

    server = HTTPServer(("", PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 已停止照片分類工具")
        server.server_close()


if __name__ == "__main__":
    main()
