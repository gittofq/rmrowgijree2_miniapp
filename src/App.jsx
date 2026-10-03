import React, { useState, useEffect, useMemo, useRef } from 'react';
import PatternWaves from './components/PatternWaves';
import InfiniteSpiral from './components/InfiniteSpiral';
import TelegramParticlePortal from './components/TelegramParticlePortal';
import StatsCounter from './components/StatsCounter';
import { 
  Play, PenTool, EyeOff, Crown, Zap, ShieldAlert, Sparkles, Layers, ArrowUp,
  Maximize2, Minimize2
} from 'lucide-react';

export default function App() {
  const [activeSection, setActiveSection] = useState('hero');
  const [isFullscreen, setIsFullscreen] = useState(() => {
    if (typeof window === 'undefined') return false;
    const tg = window.Telegram?.WebApp;
    return Boolean(tg?.isFullscreen || document.fullscreenElement || document.webkitFullscreenElement);
  });
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    const tg = window.Telegram?.WebApp;
    const isSmallScreen = window.innerWidth <= 768;
    const isTgMobile = ['android', 'ios'].includes(tg?.platform?.toLowerCase());
    const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    return Boolean(isSmallScreen || isTgMobile || isMobileUA);
  });
  const activeSectionRef = useRef('hero');
  const progressBarRef = useRef(null);

  // --- 1. Telegram Desktop & Fullscreen Expansion Lifecycle ---
  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    const updateFullscreenAndInsets = () => {
      const isTgFull = Boolean(tg?.isFullscreen);
      const isDocFull = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(isTgFull || isDocFull);

      // Extract Telegram Bot API 8.0+ content safe areas if available
      const topInset = tg?.contentSafeAreaInset?.top ?? tg?.safeAreaInset?.top;
      if (typeof topInset === 'number' && topInset > 0) {
        document.documentElement.style.setProperty('--tg-dynamic-inset-top', `${topInset + 8}px`);
      }
    };

    const handleResize = () => {
      const isSmallScreen = window.innerWidth <= 768;
      const isTgMobile = ['android', 'ios'].includes(tg?.platform?.toLowerCase());
      const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      setIsMobile(Boolean(isSmallScreen || isTgMobile || isMobileUA));
      updateFullscreenAndInsets();
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', updateFullscreenAndInsets);
    document.addEventListener('webkitfullscreenchange', updateFullscreenAndInsets);

    const initTelegram = () => {
      if (!tg) return;

      try {
        // Inform Telegram client that app is loaded
        tg.ready();
        
        // Expand immediately to maximum size
        tg.expand();

        // Blend Telegram client chrome with app background
        tg.setHeaderColor?.('#050508');
        tg.setBackgroundColor?.('#050508');
        tg.enableClosingConfirmation?.();

        // If client supports fullscreen (Bot API 8.0+), expand
        if (typeof tg.requestFullscreen === 'function') {
          try {
            tg.requestFullscreen();
            setTimeout(updateFullscreenAndInsets, 150);
            setTimeout(updateFullscreenAndInsets, 450);
          } catch (e) {
            console.warn('Telegram requestFullscreen error:', e);
          }
        }

        // Disable accidental pull-down-to-close gestures
        if (typeof tg.disableVerticalSwipes === 'function') {
          try {
            tg.disableVerticalSwipes();
          } catch (e) {}
        }

        // Listen for fullscreen state changes & safe areas
        tg.onEvent?.('fullscreenChanged', updateFullscreenAndInsets);
        tg.onEvent?.('fullscreenFailed', updateFullscreenAndInsets);
        tg.onEvent?.('safeAreaChanged', updateFullscreenAndInsets);
        tg.onEvent?.('contentSafeAreaChanged', updateFullscreenAndInsets);
        tg.onEvent?.('viewportChanged', updateFullscreenAndInsets);
      } catch (err) {
        console.warn('Telegram WebApp init error:', err);
      }
    };

    initTelegram();
    updateFullscreenAndInsets();

    // Secondary attempt on user interaction if browser/client deferred fullscreen
    const handleInitialUserGesture = () => {
      if (tg) {
        if (!tg.isExpanded) tg.expand?.();
        if (typeof tg.requestFullscreen === 'function' && !tg.isFullscreen) {
          try {
            tg.requestFullscreen();
            setTimeout(updateFullscreenAndInsets, 150);
          } catch (e) {}
        }
      }
    };

    window.addEventListener('click', handleInitialUserGesture, { once: true });
    window.addEventListener('keydown', handleInitialUserGesture, { once: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', updateFullscreenAndInsets);
      document.removeEventListener('webkitfullscreenchange', updateFullscreenAndInsets);
      window.removeEventListener('click', handleInitialUserGesture);
      window.removeEventListener('keydown', handleInitialUserGesture);
      if (tg) {
        tg.offEvent?.('fullscreenChanged', updateFullscreenAndInsets);
        tg.offEvent?.('fullscreenFailed', updateFullscreenAndInsets);
        tg.offEvent?.('safeAreaChanged', updateFullscreenAndInsets);
        tg.offEvent?.('contentSafeAreaChanged', updateFullscreenAndInsets);
        tg.offEvent?.('viewportChanged', updateFullscreenAndInsets);
      }
    };
  }, []);

  const toggleFullscreen = () => {
    const tg = window.Telegram?.WebApp;
    if (tg && typeof tg.requestFullscreen === 'function') {
      try {
        if (tg.isFullscreen) {
          tg.exitFullscreen?.();
          setIsFullscreen(false);
        } else {
          tg.requestFullscreen?.();
          setIsFullscreen(true);
        }
        setTimeout(() => {
          setIsFullscreen(Boolean(tg.isFullscreen || document.fullscreenElement));
        }, 150);
        return;
      } catch (e) {}
    }

    // Native browser fullscreen fallback
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.()
        .then(() => setIsFullscreen(true))
        .catch(() => {
          setIsFullscreen(prev => !prev);
        });
    } else {
      document.exitFullscreen?.()
        .then(() => setIsFullscreen(false))
        .catch(() => {
          setIsFullscreen(false);
        });
    }
  };

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
        if (totalScroll > 0 && progressBarRef.current) {
          const pct = Math.min(100, Math.max(0, (scrollY / totalScroll) * 100));
          progressBarRef.current.style.width = `${pct}%`;
        }

        const protocolsEl = document.getElementById('protocols');
        const telegramEl = document.getElementById('telegram-portal');
        const footerEl = document.getElementById('footer');
        let nextSection = 'hero';
        if (footerEl && scrollY >= footerEl.offsetTop - window.innerHeight / 2) {
          nextSection = 'footer';
        } else if (telegramEl && scrollY >= telegramEl.offsetTop - 150) {
          nextSection = 'telegram-portal';
        } else if (protocolsEl && scrollY >= protocolsEl.offsetTop - 120) {
          nextSection = 'protocols';
        }

        if (nextSection !== activeSectionRef.current) {
          activeSectionRef.current = nextSection;
          setActiveSection(nextSection);
        }

        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // --- 7 Active Theory Styled Game Cards (Cleaned of all plus signs) ---
  const spiralCardsData = [
    {
      id: 'role-artist',
      num: '01 / 07',
      category: '// АРХЕТИП',
      icon: PenTool,
      color: '#10b981',
      title: 'Художник',
      status: 'СТАТУС: В ТЕМЕ',
      desc: 'Получает секретное слово вместе со всеми. Ваша цель — сделать один точный штрих, который подтвердит ваш статус своим и останется тайной для самозванца.',
      footerLeft: 'ВХОД: 1 ШТРИХ',
      footerRight: 'ХУДОЖНИКИ'
    },
    {
      id: 'role-liar',
      num: '02 / 07',
      category: '// САМОЗВАНЕЦ',
      icon: EyeOff,
      color: '#e11d48',
      title: 'Обманщик',
      status: 'СТАТУС: ВСЛЕПУЮ',
      desc: 'Не знает тему раунда. Наблюдает за мазками других игроков, копирует ритм общего холста, мимикрирует и выстраивает алиби до финального вердикта.',
      footerLeft: 'ИНФО: 0%',
      footerRight: 'ОДИНОЧКА'
    },
    {
      id: 'role-master',
      num: '03 / 07',
      category: '// ВЕДУЩИЙ',
      icon: Crown,
      color: '#8b5cf6',
      title: 'Мастер игры',
      status: 'СТАТУС: КОНТРОЛЬ',
      desc: 'Выбирает категорию холста, запускает строгий таймер каждого хода и модерирует жаркие дебаты в чате перед вынесением приговора.',
      footerLeft: 'ДОСТУП: АРБИТР',
      footerRight: 'ВЕДУЩИЙ'
    },
    {
      id: 'rule-stroke',
      num: '04 / 07',
      category: '// МЕХАНИКА',
      icon: Zap,
      color: '#f59e0b',
      title: 'Один штрих',
      status: 'ПРАВИЛО: НЕПРЕРЫВНО',
      desc: 'Общий холст в реальном времени. Ровно одна непрерывная линия за ход. Оторвал палец или перо — право мазка мгновенно сгорает. Буквы запрещены.',
      footerLeft: 'ЛИМИТ: 1 КАСАНИЕ',
      footerRight: 'СТРОГОЕ'
    },
    {
      id: 'rule-tribunal',
      num: '05 / 07',
      category: '// КУЛЬМИНАЦИЯ',
      icon: ShieldAlert,
      color: '#f43f5e',
      title: 'Суд художников',
      status: 'ФАЗА: ГОЛОСОВАНИЕ',
      desc: '60 секунд перекрестного допроса. Открытое голосование на выбывание: ошибка большинства дарит немедленную победу обманщику.',
      footerLeft: 'ТАЙМЕР: 60 СЕК',
      footerRight: 'БОЛЬШИНСТВО'
    },
    {
      id: 'rule-guess',
      num: '06 / 07',
      category: '// РЕВАНШ',
      icon: Sparkles,
      color: '#06b6d4',
      title: 'Угадать слово',
      status: 'ШАНС: КУШ 100%',
      desc: 'Разоблачение — еще не конец. Если пойманный обманщик с одной попытки назовет загаданное слово, он перехватывает всю победу раунда.',
      footerLeft: 'ПОПЫТКА: 1 РАЗ',
      footerRight: 'РЕВАНШ'
    },
    {
      id: 'feature-wardrobe',
      num: '07 / 07',
      category: '// ПРЕСТИЖ',
      icon: Layers,
      color: '#6366f1',
      title: 'Гардеробная',
      status: 'РАНГ: МАСТЕР-КЛАСС',
      desc: 'Победные очки открывают кастомные титулы мастера, золотой VIP-градиент имени в таблице лидеров и закрытые палитры кистей.',
      footerLeft: 'СТАТУС: VIP',
      footerRight: 'ПРОФИЛЬ'
    }
  ];

  const spiralCards = useMemo(() => spiralCardsData.map(card => {
    const IconComp = card.icon;
    return {
      id: card.id,
      content: (
        <div className="spiral-card-content">
          <div>
            <div className="spiral-card-header">
              <span className="spiral-card-num" style={{ color: card.color }}>
                {card.num}
              </span>
              <span className="spiral-card-cat">
                {card.category}
              </span>
            </div>

            <div className="spiral-card-role-row">
              <div 
                className="spiral-card-icon-box"
                style={{
                  background: `${card.color}1e`,
                  border: `1px solid ${card.color}66`,
                  color: card.color,
                  boxShadow: `0 0 24px ${card.color}40`
                }}
              >
                <IconComp size={22} strokeWidth={2} />
              </div>
              <div>
                <h3 className="spiral-card-title">
                  {card.title}
                </h3>
                <span className="spiral-card-badge" style={{ color: card.color }}>
                  {card.status}
                </span>
              </div>
            </div>

            <p className="spiral-card-desc">
              {card.desc}
            </p>
          </div>

          <div className="spiral-card-footer">
            <span>{card.footerLeft}</span>
            <span style={{ color: card.color }}>{card.footerRight}</span>
          </div>
        </div>
      )
    };
  }), []);

  return (
    <div style={{ minHeight: '100vh', background: '#050508', color: '#ffffff', position: 'relative' }}>
      
      {/* Top Hairline Progress Stream */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '2px', background: 'rgba(255,255,255,0.06)', zIndex: 140 }}>
        <div 
          ref={progressBarRef} 
          style={{ height: '100%', width: '0%', background: '#e11d48', boxShadow: '0 0 10px #e11d48' }} 
        />
      </div>

      {/* Top Floating Island (Frosted Soft Glass Pill with liar_artist.jpg) */}
      <header className={`header-island ${isMobile && isFullscreen ? 'header-island-mobile-fullscreen' : ''}`}>
        <div 
          onClick={() => scrollTo('hero')} 
          className="header-island-brand"
        >
          <img 
            src={`${import.meta.env.BASE_URL}liar_artist.jpg`} 
            alt="The Liar Artist" 
            className="header-island-avatar" 
          />
          <span className="header-island-title">
            THE LIAR ARTIST
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={toggleFullscreen}
            className="header-island-expand-btn"
            title={isFullscreen ? "Свернуть" : "Развернуть во весь экран"}
            aria-label="Переключить полноэкранный режим"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          <a 
            href="https://t.me/TheLiarArtist_bot" 
            target="_blank" 
            rel="noreferrer"
            className="header-island-btn"
          >
            <span className="header-island-btn-full">ИГРАТЬ В TELEGRAM</span>
            <span className="header-island-btn-short">ИГРАТЬ</span>
            <span style={{ fontSize: '13px' }}>→</span>
          </a>
        </div>
      </header>

      {/* Right 4-Dot Scroll Navigation */}
      <nav className="right-dot-nav" aria-label="Page navigation">
        {[
          { id: 'hero', label: '01 Обзор' },
          { id: 'protocols', label: '02 Протоколы' },
          { id: 'telegram-portal', label: '03 Телеграм' },
          { id: 'footer', label: '04 Запуск' }
        ].map((section) => (
          <button
            key={section.id}
            onClick={() => scrollTo(section.id)}
            className={`right-dot-nav-item ${activeSection === section.id ? 'active' : ''}`}
            aria-label={section.label}
            title={section.label}
          >
            <span className="right-dot-nav-bullet" />
          </button>
        ))}
      </nav>

      {/* ==============================================================
          1. HERO SECTION
          ============================================================== */}
      <section 
        id="hero"
        style={{
          position: 'relative',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '0 24px',
          overflow: 'hidden'
        }}
      >
        {/* React Bits PatternWaves WebGL2 Background */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'auto' }}>
          <PatternWaves
            preset="silk"
            color="#e86666"
            backgroundColor="#050508"
            fade="edges"
            interactive
            cursorSize={50}
            cursorStrength={0.6}
          />
        </div>

        {/* Soft bottom transition vignette into section 2 */}
        <div className="section-vignette-bottom" />

        {/* Hero Foreground Content */}
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '920px', margin: '0 auto', pointerEvents: 'none' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '9999px',
            background: 'rgba(225, 29, 72, 0.12)',
            border: '1px solid rgba(225, 29, 72, 0.35)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: '#fb7185',
            marginBottom: '32px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            pointerEvents: 'auto'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e11d48', display: 'inline-block' }} />
            <span>СОЦИАЛЬНЫЙ ДЕТЕКТИВ В TELEGRAM</span>
          </div>

          <h1 className="hero-title">
            <span className="hero-brand-name">THE LIAR ARTIST</span><br />
            <span className="crimson-gradient-text hero-title-line">ХУДОЖНИК-ОБМАНЩИК</span>
          </h1>

          <p className="hero-description">
            Один общий холст. Одно секретное слово. Ровно один штрих за ход.<br />
            Среди вас — мастер блефа, который рисует вслепую.
          </p>

          <div className="hero-cta-group">
            <a 
              href="https://t.me/TheLiarArtist_bot" 
              target="_blank" 
              rel="noreferrer"
              className="btn-primary-tactile hero-btn-main"
            >
              <Play size={14} fill="#fff" />
              <span>НАЧАТЬ ПАРТИЮ</span>
            </a>

            <button 
              onClick={() => scrollTo('protocols')}
              className="btn-secondary-tactile hero-btn-sub"
            >
              ПРАВИЛА ИГРЫ ↓
            </button>
          </div>
        </div>
      </section>

      {/* ==============================================================
          2. PROTOCOLS & ROLES: FULLSCREEN STICKY CAMERA
          ============================================================== */}
      <section 
        id="protocols" 
        style={{ 
          height: '350vh',
          position: 'relative'
        }}
      >
        {/* Sticky Fullscreen Viewport Camera */}
        <div style={{
          position: 'sticky',
          top: 0,
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#050508'
        }}>
          {/* Seamless edge vignettes */}
          <div className="section-vignette-top" />
          <div className="section-vignette-bottom" />

          {/* Fullscreen InfiniteSpiral (Clean 3D Panels) */}
          <div style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <InfiniteSpiral
              items={spiralCards}
              animationMode="scroll"
              speed={0.55}
              radius={240}
              cardWidth={270}
              cardHeight={380}
              verticalSpacing={95}
              perspective={1200}
              cardRadius={16}
              centerScale={1.16}
              edgeBlur={0}
              cardsPerTurn={6}
              pauseOnHover={false}
            />
          </div>
        </div>
      </section>

      {/* ==============================================================
          3. TELEGRAM QUANTUM PARTICLE PORTAL
          ============================================================== */}
      <TelegramParticlePortal />

      {/* ==============================================================
          4. LAUNCH SECTION
          ============================================================== */}
      <footer 
        id="footer"
        style={{
          minHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '120px 24px 80px',
          background: 'radial-gradient(ellipse at 50% 30%, rgba(225, 29, 72, 0.12) 0%, #050508 75%)',
          position: 'relative'
        }}
      >
        <div className="section-vignette-top" />

        <div style={{ maxWidth: '860px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '9999px',
            background: 'rgba(225, 29, 72, 0.12)',
            border: '1px solid rgba(225, 29, 72, 0.35)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: '#fb7185',
            marginBottom: '28px',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e11d48' }} />
            <span>ИНИЦИАЛИЗАЦИЯ ИГРОВОЙ СЕССИИ</span>
          </div>

          <h2 className="footer-title" style={{ color: '#ffffff' }}>
            <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>ВЫЧИСЛИТЕ ОБМАНЩИКА</span><br />
            <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }} className="crimson-gradient-text">СРЕДИ ДРУЗЕЙ</span>
          </h2>

          <p style={{
            fontSize: '17px',
            color: '#f4f4f5',
            marginBottom: '42px',
            lineHeight: 1.65,
            fontWeight: 400
          }}>
            Добавьте бота в свою группу Telegram для игры с друзьями или начните одиночный поиск матчей онлайн.
          </p>

          <div className="footer-cta-group">
            <a 
              href="https://t.me/TheLiarArtist_bot" 
              target="_blank" 
              rel="noreferrer"
              className="btn-primary-tactile footer-btn-main"
            >
              <Play size={15} fill="#fff" />
              <span>ЗАПУСТИТЬ @TheLiarArtist_bot</span>
            </a>

            <button 
              onClick={() => scrollTo('hero')}
              className="btn-secondary-tactile footer-btn-sub"
            >
              <ArrowUp size={15} />
              <span>В НАЧАЛО</span>
            </button>
          </div>

          {/* Animated Statistics Section ("10+ тысяч игроков", "Существуем с 2025 года") */}
          <StatsCounter />
        </div>

        <div style={{
          marginTop: '32px',
          paddingTop: '20px',
          width: '100%',
          maxWidth: '640px',
          textAlign: 'center',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: '#71717a',
          letterSpacing: '1px',
          position: 'relative',
          zIndex: 10
        }}>
          © THE LIAR ARTIST 2025 – 2026 // ALL RIGHTS RESERVED
        </div>
      </footer>

    </div>
  );
}
