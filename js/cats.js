/* ============================
   貓咪卡片展開/收合
   ============================ */
(function() {
  document.querySelectorAll('.cat-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') return;
      const wasExpanded = card.classList.contains('expanded');
      card.classList.toggle('expanded');
      const toggle = card.querySelector('.cat-card-toggle');
      if (toggle) {
        toggle.textContent = wasExpanded ? '查看詳細 ▾' : '收合 ▴';
      }
    });
  });
})();
