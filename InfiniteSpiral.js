// InfiniteSpiral component from React Bits, vanilla JS + CSS 3D
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const modulo = (value, divisor) => ((value % divisor) + divisor) % divisor;
const smoothstep = (min, max, value) => {
  const x = clamp((value - min) / (max - min || 1), 0, 1);
  return x * x * (3 - 2 * x);
};

export function initInfiniteSpiral(container, options = {}) {
  if (!container) return null;

  const {
    items = [],
    speed = 0.55,
    direction = 'up',
    animationMode = 'all', // 'auto' | 'drag' | 'scroll' | 'all'
    radius = 210,
    cardWidth = 200,
    cardHeight = 240,
    verticalSpacing = 85,
    perspective = 1100,
    cardsPerTurn = 6,
    rotation = 0,
    cardTilt = 0,
    cardRadius = 18,
    centerScale = 1.25,
    edgeFade = 0.35,
    edgeBlur = 6,
    pauseOnHover = true,
    imageFit = 'cover',
    grayscale = 0
  } = options;

  if (!items.length) return null;

  container.classList.add('infinite-spiral');
  container.style.perspective = `${perspective}px`;
  container.style.setProperty('--infinite-spiral-card-width', `${cardWidth}px`);
  container.style.setProperty('--infinite-spiral-card-height', `${cardHeight}px`);
  container.style.setProperty('--infinite-spiral-card-radius', `${cardRadius}px`);

  const dragEnabled = animationMode === 'drag' || animationMode === 'all';
  container.style.cursor = dragEnabled ? 'grab' : 'default';
  container.style.touchAction = dragEnabled ? 'pan-x' : 'auto';
  container.style.userSelect = dragEnabled ? 'none' : 'auto';

  const stage = document.createElement('div');
  stage.className = 'infinite-spiral__stage';
  stage.setAttribute('role', 'list');
  stage.setAttribute('aria-label', 'Infinite spiral gallery');
  container.innerHTML = '';
  container.appendChild(stage);

  const cardElements = [];

  items.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'infinite-spiral__item';
    card.setAttribute('role', 'listitem');
    card.style.width = `${cardWidth}px`;
    card.style.height = `${cardHeight}px`;
    card.style.borderRadius = `${cardRadius}px`;

    if (item.html) {
      card.innerHTML = item.html;
    } else if (item.src) {
      const img = document.createElement('img');
      img.className = 'infinite-spiral__image';
      img.src = item.src;
      img.alt = item.alt || `Item ${index + 1}`;
      img.draggable = false;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = imageFit;
      if (grayscale > 0) {
        img.style.filter = `grayscale(${Math.min(1, Math.max(0, grayscale))})`;
      }
      card.appendChild(img);
    }

    if (item.onClick) {
      card.addEventListener('click', item.onClick);
    }

    stage.appendChild(card);
    cardElements.push(card);
  });

  let frameId = 0;
  let previousTime = performance.now();
  let bounds = container.getBoundingClientRect();
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  const scrollEnabled = animationMode === 'scroll' || animationMode === 'all';
  const scrollSpeedMultiplier = Math.max(speed, 0) / 0.55;
  let lastScrollY = window.scrollY;

  let progress = 0;
  let targetProgress = 0;
  let autoSpeed = 0;
  let hovered = false;
  let visible = true;
  let dragging = false;
  let lastPointerY = 0;
  let dragMoved = false;

  const resizeObserver = new ResizeObserver(() => {
    bounds = container.getBoundingClientRect();
  });
  resizeObserver.observe(container);

  const intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
    },
    { threshold: 0.02 }
  );
  intersectionObserver.observe(container);

  const handleScroll = () => {
    const nextScrollY = window.scrollY;
    const scrollDelta = nextScrollY - lastScrollY;
    lastScrollY = nextScrollY;
    if (!scrollEnabled || !visible || scrollDelta === 0) return;
    targetProgress += clamp(
      (scrollDelta * scrollSpeedMultiplier) / Math.max(verticalSpacing * 2, 1),
      -1.5,
      1.5
    );
  };
  window.addEventListener('scroll', handleScroll, { passive: true });

  const handleWheel = e => {
    if (Math.abs(e.deltaY) > 2) {
      targetProgress += clamp(e.deltaY * 0.0035, -0.8, 0.8);
    }
  };
  container.addEventListener('wheel', handleWheel, { passive: true });

  const render = time => {
    const delta = Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;

    const autoEnabled = animationMode === 'auto' || animationMode === 'all';
    const motionPaused = dragging || (pauseOnHover && hovered);
    const directionMultiplier = direction === 'down' ? -1 : 1;
    const desiredAutoSpeed =
      autoEnabled && visible && !reducedMotion && !motionPaused
        ? speed * directionMultiplier
        : 0;
    const speedBlend = 1 - Math.exp(-delta * 7);
    autoSpeed += (desiredAutoSpeed - autoSpeed) * speedBlend;
    targetProgress += autoSpeed * delta;

    const followBlend = 1 - Math.exp(-delta * (dragging ? 22 : 11));
    progress += (targetProgress - progress) * followBlend;

    const count = items.length;
    const half = count / 2;
    const width = Math.max(bounds.width, 1);
    const height = Math.max(bounds.height, 1);
    const fit = Math.min(1, width / (cardWidth * 2.8), height / (cardHeight * 2.35));
    const responsiveRadius = Math.min(radius, Math.max(72, width * 0.36)) * fit;
    const fadeStart = clamp(1 - edgeFade, 0, 0.98);
    const turnSize = Math.max(cardsPerTurn, 1);

    cardElements.forEach((card, index) => {
      let offset = index - progress;
      offset = modulo(offset + half, count) - half;

      const edge = Math.min(Math.abs(offset) / Math.max(half, 1), 1);
      const opacity = 1 - smoothstep(fadeStart, 1, edge);
      const focus = 1 - Math.min(Math.abs(offset) / Math.max(turnSize * 0.65, 1), 1);
      const scale = (1 + (centerScale - 1) * focus) * fit;
      const angle = offset * (360 / turnSize) + rotation;
      const angleRadians = (angle * Math.PI) / 180;
      const x = Math.sin(angleRadians) * responsiveRadius;
      const z = Math.cos(angleRadians) * responsiveRadius;
      const depthScale = clamp(perspective / Math.max(perspective - z, 1), 0.72, 1.45);
      const visualScale = scale * depthScale;
      const depth = (z / Math.max(responsiveRadius, 1) + 1) / 2;
      const blur = edgeBlur * smoothstep(0.35, 1, edge);

      card.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${offset * verticalSpacing * fit}px, 0) rotateZ(${cardTilt}deg) scale(${visualScale})`;
      card.style.opacity = opacity.toFixed(3);
      card.style.filter = blur > 0.01 ? `blur(${blur.toFixed(2)}px)` : 'none';
      card.style.zIndex = String(Math.round(depth * 100000) + index);
      card.style.pointerEvents = opacity > 0.25 ? 'auto' : 'none';
    });

    frameId = requestAnimationFrame(render);
  };

  frameId = requestAnimationFrame(render);

  const stopDragging = event => {
    if (!dragging) return;
    dragging = false;
    if (event.currentTarget.hasPointerCapture && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    event.currentTarget.style.cursor = dragEnabled ? 'grab' : 'default';
  };

  const onPointerDown = event => {
    if (!dragEnabled || event.button !== 0) return;
    dragging = true;
    dragMoved = false;
    lastPointerY = event.clientY;
    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    event.currentTarget.style.cursor = 'grabbing';
  };

  const onPointerMove = event => {
    if (!dragging) return;
    const pointerDelta = event.clientY - lastPointerY;
    lastPointerY = event.clientY;
    if (Math.abs(pointerDelta) > 0.5) dragMoved = true;
    targetProgress -= pointerDelta / Math.max(verticalSpacing, 1);
  };

  container.addEventListener('mouseenter', () => { hovered = true; });
  container.addEventListener('mouseleave', () => { hovered = false; });
  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerup', stopDragging);
  container.addEventListener('pointercancel', stopDragging);

  return {
    destroy() {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', stopDragging);
      container.removeEventListener('pointercancel', stopDragging);
    }
  };
}
