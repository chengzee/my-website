/* ============================
   MyWebsite - 共用 JavaScript
   ============================ */

document.addEventListener('DOMContentLoaded', () => {

  // --- Header scroll 行為（僅 hero 頁面） ---
  const header = document.querySelector('.site-header');
  const isHeroPage = document.body.classList.contains('page-hero');

  if (isHeroPage && header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  // --- 手機漢堡選單 ---
  const navToggle = document.querySelector('.nav-toggle');
  const mainNav = document.querySelector('.main-nav');

  if (navToggle && mainNav) {
    navToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      mainNav.classList.toggle('open');
      const isOpen = mainNav.classList.contains('open');
      navToggle.textContent = isOpen ? '✕' : '☰';
      navToggle.setAttribute('aria-expanded', isOpen);
    });

    // 點擊外部關閉選單
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.site-header')) {
        mainNav.classList.remove('open');
        navToggle.textContent = '☰';
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // --- 標記目前頁面的導覽連結 ---
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('active');
    }
  });

});
