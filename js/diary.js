/* ============================
   飲食日記 - localStorage 互動系統
   ============================ */
(function() {
  const STORAGE_KEY = 'catDiaryRecords';
  const ADMIN_SESSION_KEY = 'catDiaryAdmin';
  // SHA-256 of admin password（預設：jimmy2026）
  // 修改密碼：在 console 執行
  // crypto.subtle.digest('SHA-256', new TextEncoder().encode('你的新密碼')).then(h=>console.log([...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('')))
  const ADMIN_HASH = '17f8fef651da2af9f1d8e6965bff2ed78f587a19fc9e7fd054fd5d2075d901a1';

  const CAT_COLORS = {
    '波波': '#FF6B6B',
    '米米': '#4ECDC4',
    '豆豆': '#45B7D1',
    '小寶寶': '#96CEB4'
  };
  const TYPE_ICONS = {
    '乾糧': '🥣', '濕食': '🥫', '零食': '🍬', '水': '💧', '其他': '📌'
  };

  let records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  let chart = null;
  let isAdmin = sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';

  // --- 管理員登入/登出 ---
  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function adminLogin() {
    const pw = prompt('請輸入管理員密碼：');
    if (!pw) return;
    const hash = await sha256(pw);
    if (hash === ADMIN_HASH) {
      isAdmin = true;
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
      applyAdminMode();
      saveAndRender();
    } else {
      alert('❌ 密碼錯誤');
    }
  }

  function adminLogout() {
    isAdmin = false;
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    applyAdminMode();
    saveAndRender();
  }

  function applyAdminMode() {
    if (isAdmin) {
      document.body.classList.remove('visitor-mode');
    } else {
      document.body.classList.add('visitor-mode');
    }
    document.getElementById('btn-login').style.display = isAdmin ? 'none' : '';
    document.getElementById('admin-status').style.display = isAdmin ? 'flex' : 'none';
  }

  // --- 初始化日期時間 ---
  const now = new Date();
  document.getElementById('record-date').value = now.toISOString().slice(0, 10);
  document.getElementById('record-time').value = now.toTimeString().slice(0, 5);

  // --- 新增紀錄 ---
  document.getElementById('diary-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const record = {
      id: Date.now(),
      date: document.getElementById('record-date').value,
      time: document.getElementById('record-time').value,
      cat: document.getElementById('record-cat').value,
      type: document.getElementById('record-type').value,
      food: document.getElementById('record-food').value || '—',
      amount: document.getElementById('record-amount').value || '—',
      note: document.getElementById('record-note').value || ''
    };
    records.unshift(record);
    saveAndRender();
    // 重設部分欄位
    document.getElementById('record-cat').value = '';
    document.getElementById('record-type').value = '';
    document.getElementById('record-food').value = '';
    document.getElementById('record-amount').value = '';
    document.getElementById('record-note').value = '';
    // 更新時間
    const n = new Date();
    document.getElementById('record-time').value = n.toTimeString().slice(0, 5);
  });

  // --- 刪除紀錄 ---
  function deleteRecord(id) {
    if (!confirm('確定要刪除這筆紀錄嗎？')) return;
    records = records.filter(r => r.id !== id);
    saveAndRender();
  }
  // 暴露到全域供 onclick 呼叫
  window.deleteRecord = deleteRecord;

  // --- 儲存 & 重新渲染 ---
  function saveAndRender() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    renderTable();
    renderSummary();
    renderChart();
  }

  // --- 篩選 ---
  document.getElementById('filter-cat').addEventListener('change', () => { renderTable(); renderSummary(); });
  document.getElementById('filter-type').addEventListener('change', () => { renderTable(); renderSummary(); });

  function getFilteredRecords() {
    const catFilter = document.getElementById('filter-cat').value;
    const typeFilter = document.getElementById('filter-type').value;
    return records.filter(r => {
      if (catFilter !== 'all' && r.cat !== catFilter) return false;
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      return true;
    });
  }

  // --- 渲染表格 ---
  function renderTable() {
    const tbody = document.getElementById('diary-tbody');
    const emptyMsg = document.getElementById('empty-msg');
    const filtered = getFilteredRecords();

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      emptyMsg.style.display = 'block';
      return;
    }
    emptyMsg.style.display = 'none';

    tbody.innerHTML = filtered.map(r => `
      <tr>
        <td>${r.date}</td>
        <td>${r.time}</td>
        <td><span class="cat-dot" style="background:${CAT_COLORS[r.cat] || '#999'}"></span>${r.cat}</td>
        <td>${TYPE_ICONS[r.type] || ''} ${r.type}</td>
        <td>${r.food}</td>
        <td>${r.amount !== '—' ? r.amount + 'g' : '—'}</td>
        <td>${r.note}</td>
        <td class="admin-only-cell"><button class="btn-delete" onclick="deleteRecord(${r.id})">🗑</button></td>
      </tr>
    `).join('');
  }

  // --- 今日摘要 ---
  function renderSummary() {
    const today = new Date().toISOString().slice(0, 10);
    const todayRecords = records.filter(r => r.date === today);
    const container = document.getElementById('diary-summary');

    const cats = ['波波', '米米', '豆豆', '小寶寶'];
    const summaryHTML = cats.map(cat => {
      const catRecords = todayRecords.filter(r => r.cat === cat);
      const totalAmount = catRecords.reduce((sum, r) => sum + (parseInt(r.amount) || 0), 0);
      const count = catRecords.length;
      return `
        <div class="summary-card">
          <span class="cat-dot-lg" style="background:${CAT_COLORS[cat]}"></span>
          <div>
            <strong>${cat}</strong>
            <p>${count > 0 ? `${count} 次，共 ${totalAmount}g` : '今天還沒吃'}</p>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <h3>📅 今日摘要（${today}）</h3>
      <div class="summary-grid">${summaryHTML}</div>
    `;
  }

  // --- 圖表：近 7 天 ---
  function renderChart() {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }

    const cats = ['波波', '米米', '豆豆', '小寶寶'];
    const datasets = cats.map(cat => ({
      label: cat,
      data: dates.map(date => {
        return records
          .filter(r => r.cat === cat && r.date === date)
          .reduce((sum, r) => sum + (parseInt(r.amount) || 0), 0);
      }),
      backgroundColor: CAT_COLORS[cat] + '88',
      borderColor: CAT_COLORS[cat],
      borderWidth: 2,
      borderRadius: 4,
    }));

    const labels = dates.map(d => {
      const parts = d.split('-');
      return `${parts[1]}/${parts[2]}`;
    });

    if (chart) chart.destroy();
    const ctx = document.getElementById('diary-chart').getContext('2d');
    chart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}g` } }
        },
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true, title: { display: true, text: '份量 (g)' } }
        }
      }
    });
  }

  // --- 匯出 JSON ---
  document.getElementById('btn-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cat-diary-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // --- 匯入 JSON ---
  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!Array.isArray(imported)) throw new Error('格式錯誤');
        const mergeCount = imported.filter(imp => !records.some(r => r.id === imp.id)).length;
        if (confirm(`匯入 ${imported.length} 筆資料（${mergeCount} 筆新增）？`)) {
          imported.forEach(imp => {
            if (!records.some(r => r.id === imp.id)) records.push(imp);
          });
          records.sort((a, b) => {
            const da = `${b.date} ${b.time}`;
            const db = `${a.date} ${a.time}`;
            return da.localeCompare(db) || b.id - a.id;
          });
          saveAndRender();
        }
      } catch (err) {
        alert('匯入失敗：檔案格式不正確');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // --- 暴露管理員函式到全域（供 HTML onclick 呼叫）---
  window.adminLogin = adminLogin;
  window.adminLogout = adminLogout;

  // --- 初始化管理模式 & 渲染 ---
  applyAdminMode();
  saveAndRender();
})();
