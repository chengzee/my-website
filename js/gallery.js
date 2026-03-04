/* ============================
   相片藝廊 + Lightbox
   ============================ */
(function() {
  const IMAGES_PER_PAGE = 50;
  const gallery = document.getElementById('gallery');
  const pagination = document.getElementById('pagination');
  const galleryCount = document.getElementById('galleryCount');

  if (!gallery || !pagination) return;

  let allData = [];
  let filteredData = [];
  let currentCat = 'all';

  // 取得 ?page= 參數
  function getPage() {
    const params = new URLSearchParams(window.location.search);
    return parseInt(params.get('page')) || 1;
  }

  // 篩選按鈕
  document.getElementById('filterBar').addEventListener('click', function(e) {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCat = btn.dataset.cat;
    applyFilter();
    renderPage(1, true);
  });

  function applyFilter() {
    if (currentCat === 'all') {
      // 「全部」分類時，依檔名去重（避免同一張照片在多個分類目錄中重複出現）
      var seen = {};
      filteredData = [];
      allData.forEach(function(item) {
        if (item.type !== 'image') return;
        var basename = item.filename.split('/').pop();
        if (!seen[basename]) {
          seen[basename] = true;
          filteredData.push(item);
        }
      });
    } else {
      filteredData = allData.filter(item => item.category === currentCat && item.type === 'image');
    }
  }

  function renderPage(page, pushHistory) {
    gallery.innerHTML = '';
    pagination.innerHTML = '';

    const totalImages = filteredData.length;
    const totalPages = Math.ceil(totalImages / IMAGES_PER_PAGE);

    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    if (totalPages === 0) page = 0;

    // 更新 URL（pushState 讓上/下一頁可用瀏覽器返回）
    if (pushHistory) {
      const url = '?page=' + page + (currentCat !== 'all' ? '&cat=' + encodeURIComponent(currentCat) : '');
      history.pushState({ page: page, cat: currentCat }, '', url);
    }

    galleryCount.textContent = '共 ' + totalImages + ' 張照片' +
      (currentCat !== 'all' ? '（' + currentCat + '）' : '');

    if (totalImages === 0) {
      gallery.innerHTML = '<p style="text-align:center;padding:2rem;color:#999;grid-column:1/-1;">此分類暫無照片</p>';
      return;
    }

    const startIndex = (page - 1) * IMAGES_PER_PAGE;
    const endIndex = startIndex + IMAGES_PER_PAGE;
    const imagesToShow = filteredData.slice(startIndex, endIndex);

    // 顯示圖片
    imagesToShow.forEach(item => {
      const img = document.createElement('img');
      // 使用縮圖加快載入，沒有縮圖則用原圖
      img.src = item.thumbnail || item.filename;
      img.alt = item.category || 'photo';
      img.loading = 'lazy';
      // 載入完成後淡入
      img.addEventListener('load', function() { this.classList.add('loaded'); });
      img.addEventListener('click', function() { openLightbox(item.filename); });
      gallery.appendChild(img);
    });

    // 分頁按鈕（含頁碼快捷）
    if (totalPages > 1) {
      // 上一頁
      if (page > 1) {
        const prev = document.createElement('a');
        prev.href = '#';
        prev.textContent = '‹';
        prev.className = 'page-arrow';
        prev.title = '上一頁';
        prev.addEventListener('click', function(e) { e.preventDefault(); renderPage(page - 1, true); });
        pagination.appendChild(prev);
      }

      // 計算要顯示的頁碼
      const pages = [];
      const neighbor = 2; // 當前頁左右各顯示幾個鄰居
      pages.push(1);
      let rangeStart = Math.max(2, page - neighbor);
      let rangeEnd = Math.min(totalPages - 1, page + neighbor);
      if (rangeStart > 2) pages.push('...');
      for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
      if (rangeEnd < totalPages - 1) pages.push('...');
      if (totalPages > 1) pages.push(totalPages);

      pages.forEach(function(p) {
        if (p === '...') {
          const dots = document.createElement('span');
          dots.className = 'page-dots';
          dots.textContent = '…';
          pagination.appendChild(dots);
        } else {
          const btn = document.createElement('a');
          btn.href = '#';
          btn.textContent = p;
          btn.className = 'page-num' + (p === page ? ' active' : '');
          if (p !== page) {
            btn.addEventListener('click', function(e) { e.preventDefault(); renderPage(p, true); });
          } else {
            btn.addEventListener('click', function(e) { e.preventDefault(); });
          }
          pagination.appendChild(btn);
        }
      });

      // 下一頁
      if (page < totalPages) {
        const next = document.createElement('a');
        next.href = '#';
        next.textContent = '›';
        next.className = 'page-arrow';
        next.title = '下一頁';
        next.addEventListener('click', function(e) { e.preventDefault(); renderPage(page + 1, true); });
        pagination.appendChild(next);
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 初始化
  fetch('photo-list.json')
    .then(function(response) { return response.json(); })
    .then(function(data) {
      allData = data;
      // 讀取 URL 的 cat 參數
      var params = new URLSearchParams(window.location.search);
      var urlCat = params.get('cat');
      if (urlCat) {
        currentCat = urlCat;
        document.querySelectorAll('.filter-btn').forEach(function(b) {
          b.classList.toggle('active', b.dataset.cat === urlCat);
        });
      }
      applyFilter();
      renderPage(getPage());
    })
    .catch(function(error) {
      console.error('讀取 JSON 發生錯誤:', error);
      gallery.innerHTML = '<p style="text-align:center;padding:2rem;color:#999;">抱歉，無法載入相片清單。</p>';
    });

  // === 瀏覽器上/下一頁支援 ===
  window.addEventListener('popstate', function(e) {
    if (e.state && e.state.page) {
      // 從 state 恢復分類與頁碼
      if (e.state.cat && e.state.cat !== currentCat) {
        currentCat = e.state.cat;
        document.querySelectorAll('.filter-btn').forEach(function(b) {
          b.classList.toggle('active', b.dataset.cat === currentCat);
        });
        applyFilter();
      }
      renderPage(e.state.page);
    } else {
      // 回到初始狀態
      var params = new URLSearchParams(window.location.search);
      currentCat = params.get('cat') || 'all';
      document.querySelectorAll('.filter-btn').forEach(function(b) {
        b.classList.toggle('active', b.dataset.cat === currentCat);
      });
      applyFilter();
      renderPage(getPage());
    }
  });

  // === Lightbox 功能（含左右導覽）===
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');
  const lightboxCounter = document.getElementById('lightbox-counter');
  let lightboxIndex = -1;

  function openLightbox(src) {
    // 找到在 filteredData 中的 index
    lightboxIndex = filteredData.findIndex(item => item.filename === src);
    showLightboxImage();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function showLightboxImage() {
    if (lightboxIndex < 0 || lightboxIndex >= filteredData.length) return;
    lightboxImg.src = filteredData[lightboxIndex].filename;
    lightboxCounter.textContent = (lightboxIndex + 1) + ' / ' + filteredData.length;
    lightboxPrev.style.display = lightboxIndex > 0 ? '' : 'none';
    lightboxNext.style.display = lightboxIndex < filteredData.length - 1 ? '' : 'none';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    lightboxImg.src = '';
    document.body.style.overflow = '';
    lightboxIndex = -1;
  }

  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  lightboxPrev.addEventListener('click', (e) => {
    e.stopPropagation();
    if (lightboxIndex > 0) { lightboxIndex--; showLightboxImage(); }
  });

  lightboxNext.addEventListener('click', (e) => {
    e.stopPropagation();
    if (lightboxIndex < filteredData.length - 1) { lightboxIndex++; showLightboxImage(); }
  });

  // 鍵盤導覽：ESC 關閉、← → 切換
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft' && lightboxIndex > 0) { lightboxIndex--; showLightboxImage(); }
    if (e.key === 'ArrowRight' && lightboxIndex < filteredData.length - 1) { lightboxIndex++; showLightboxImage(); }
  });

  // Lightbox 觸控滑動
  let lbTouchStartX = 0;
  lightbox.addEventListener('touchstart', e => { lbTouchStartX = e.changedTouches[0].screenX; }, { passive: true });
  lightbox.addEventListener('touchend', e => {
    const diff = lbTouchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && lightboxIndex < filteredData.length - 1) { lightboxIndex++; showLightboxImage(); }
      if (diff < 0 && lightboxIndex > 0) { lightboxIndex--; showLightboxImage(); }
    }
  });
})();
