/* ============================
   Hero 無限輪播
   ============================ */
(function() {
  const slidesContainer = document.getElementById('slides');
  const navContainer = document.getElementById('slider-nav');
  if (!slidesContainer || !navContainer) return;

  let currentIndex = 1;
  let autoplayInterval;

  // 精選 Hero 照片（1920px 高品質，依亮度分析挑選最明亮的照片）
  const heroPhotos = [
    'photos/_hero/IMG_0766.jpg',  // 豆豆 - brightness 192
    'photos/_hero/IMG_0785.jpg',  // 豆豆 - brightness 182
    'photos/_hero/IMG_1575.jpg',  // 小寶寶 - brightness 132
    'photos/_hero/IMG_0784.jpg',  // 米米 - brightness 130
    'photos/_hero/IMG_1478.jpg',  // 波波 - brightness 128
    'photos/_hero/IMG_0744.jpg',  // 豆豆 - brightness 178
  ];

  // 無限循環：前後各加一個 clone
  const firstClone = heroPhotos[0];
  const lastClone  = heroPhotos[heroPhotos.length - 1];
  const allSlides  = [lastClone, ...heroPhotos, firstClone];

  allSlides.forEach((src, i) => {
    const slide = document.createElement('div');
    slide.classList.add('slide-item');
    const img = document.createElement('img');
    img.src = src;
    img.alt = '近期相片';
    img.loading = (i <= 2) ? 'eager' : 'lazy';
    slide.appendChild(img);
    slidesContainer.appendChild(slide);
  });

  // 導覽圓點
  for (let i = 0; i < heroPhotos.length; i++) {
    const btn = document.createElement('button');
    btn.setAttribute('aria-label', `第 ${i + 1} 張`);
    btn.addEventListener('click', () => {
      stopAutoplay();
      goToSlide(i + 1);
      startAutoplay();
    });
    navContainer.appendChild(btn);
  }

  slidesContainer.style.transform = `translateX(-${currentIndex * 100}vw)`;
  updateNav();
  startAutoplay();

  function goToSlide(index) {
    slidesContainer.style.transition = 'transform 1.2s ease-in-out';
    currentIndex = index;
    slidesContainer.style.transform = `translateX(-${currentIndex * 100}vw)`;
    updateNav();
  }

  function startAutoplay() {
    autoplayInterval = setInterval(() => {
      goToSlide(currentIndex + 1);
    }, 4000);
  }

  function stopAutoplay() {
    clearInterval(autoplayInterval);
  }

  // 無限循環：到達 clone 時瞬間跳回
  slidesContainer.addEventListener('transitionend', () => {
    const childrenCount = slidesContainer.children.length;
    if (currentIndex === childrenCount - 1) {
      slidesContainer.style.transition = 'none';
      currentIndex = 1;
      slidesContainer.style.transform = `translateX(-${currentIndex * 100}vw)`;
    } else if (currentIndex === 0) {
      slidesContainer.style.transition = 'none';
      currentIndex = slidesContainer.children.length - 2;
      slidesContainer.style.transform = `translateX(-${currentIndex * 100}vw)`;
    }
  });

  function updateNav() {
    const buttons = document.querySelectorAll('#slider-nav button');
    buttons.forEach((btn, i) => {
      btn.classList.toggle('active', i === currentIndex - 1);
    });
  }

  // === 觸控滑動支援 ===
  let touchStartX = 0;
  const heroEl = document.querySelector('.hero');

  // hover 時暫停輪播
  heroEl.addEventListener('mouseenter', stopAutoplay);
  heroEl.addEventListener('mouseleave', startAutoplay);

  heroEl.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
  heroEl.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 50) {
      stopAutoplay();
      goToSlide(currentIndex + (diff > 0 ? 1 : -1));
      startAutoplay();
    }
  });
})();
