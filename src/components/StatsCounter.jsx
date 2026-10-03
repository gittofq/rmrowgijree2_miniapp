import React, { useState, useEffect, useRef } from 'react';

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

function StatItem({ start = 0, end, decimals = 0, prefix = '', suffix = '', label, noLocale = false, isVisible, delay = 0 }) {
  const [value, setValue] = useState(start);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!isVisible || startedRef.current) return;
    startedRef.current = true;

    const timer = setTimeout(() => {
      const duration = 1800; // ms
      const startTime = performance.now();

      const animate = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const eased = easeOutCubic(progress);
        const current = start + (end - start) * eased;

        setValue(current);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setValue(end);
        }
      };

      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timer);
  }, [isVisible, start, end, delay]);

  let displayValue;
  if (decimals > 0) {
    displayValue = value.toFixed(decimals);
  } else if (noLocale) {
    displayValue = Math.floor(value).toString();
  } else {
    displayValue = Math.floor(value).toLocaleString('ru-RU');
  }

  return (
    <div className="stat-card">
      <div className="stat-number">
        {prefix}{displayValue}{suffix}
      </div>
      <div className="stat-label">
        {label}
      </div>
    </div>
  );
}

export default function StatsCounter() {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.2 });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const stats = [
    {
      start: 0,
      end: 10000,
      suffix: '+',
      label: '10+ тысяч игроков',
      delay: 0
    },
    {
      start: 2000,
      end: 2025,
      noLocale: true,
      label: 'Существуем с 2025 года',
      delay: 150
    },
    {
      start: 0,
      end: 85000,
      suffix: '+',
      label: 'Сыграно раундов',
      delay: 300
    },
    {
      start: 0,
      end: 99.9,
      decimals: 1,
      suffix: '%',
      label: 'Аптайм серверов',
      delay: 450
    }
  ];

  return (
    <div ref={containerRef} className="stats-container">
      <div className="stats-grid">
        {stats.map((stat, i) => (
          <StatItem
            key={i}
            start={stat.start}
            end={stat.end}
            decimals={stat.decimals}
            suffix={stat.suffix}
            noLocale={stat.noLocale}
            label={stat.label}
            isVisible={isVisible}
            delay={stat.delay}
          />
        ))}
      </div>
    </div>
  );
}
