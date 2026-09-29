/* Game Acquisition: one data source, one active panel, no external assets. */
(() => {
  const root = document.querySelector('[data-acquisition]');
  if (!root) return;

  const stages = [
    { id: 'publishing', number: '01', title: 'Roblox Publishing', icon: 'rocket',
      description: 'We launch traffic, test thumbnails, icons, and first-session funnels for stronger conversion.',
      features: ['Thumbnail testing', 'Store conversion', 'Launch traffic'], metricLabel: 'CTR', metricValue: '+18%',
      imageSrc: 'images/Game Acquisition/1.png' },
    { id: 'liveops', number: '02', title: 'LiveOps', icon: 'controller',
      description: 'Seasonal events, updates, reward loops, and content beats that keep players coming back.',
      features: ['Seasonal events', 'Content updates', 'Reward loops'], metricLabel: 'Returning players', metricValue: '+31%',
      imageSrc: 'images/Game Acquisition/2.png' },
    { id: 'acquisition', number: '03', title: 'User Acquisition', icon: 'megaphone',
      description: 'We scale paid and organic growth channels with creative testing and clear performance targets.',
      features: ['Creative testing', 'Organic growth', 'Paid acquisition'], metricLabel: 'CTR', metricValue: '+24%',
      imageSrc: 'images/Game Acquisition/3.png' },
    { id: 'retention', number: '04', title: 'Retention Design', icon: 'chart',
      description: 'Daily rewards, progression, quests, and early-game tuning built around player behavior.',
      features: ['Daily rewards', 'Progression', 'Early-game tuning'], metricLabel: 'D7 retention', metricValue: '+12%',
      imageSrc: 'images/Game Acquisition/4.png' },
    { id: 'monetization', number: '05', title: 'Monetization', icon: 'crystal',
      description: 'Gamepasses, offers, limited deals, and economy updates that feel natural inside the game.',
      features: ['Gamepasses', 'Limited offers', 'Economy design'], metricLabel: 'ARPPU', metricValue: '+16%',
      imageSrc: 'images/Game Acquisition/5.png' },
    { id: 'analytics', number: '06', title: 'Analytics & Testing', icon: 'flask',
      description: 'We track weak points, run experiments, and focus production on changes that move metrics.',
      features: ['A/B testing', 'Funnel analysis', 'Metric tracking'], metricLabel: 'Conversion', metricValue: '+9%',
      imageSrc: 'images/Game Acquisition/6.png' }
  ];

  const paths = {
    rocket: '<path d="M13 29c0-10 8-21 22-24 0 14-11 22-21 22l-1 2Z"/><path d="m16 17-8 1-4 8 9-1m10 1-1 9-8 4 1-11M9 31l-4 8 8-4"/><circle cx="26" cy="14" r="3"/>',
    controller: '<path d="M13 12h18c5 0 7 6 9 17 1 7-3 10-7 5l-5-5H16l-5 5c-4 5-8 2-7-5 2-11 4-17 9-17Z"/><path d="M10 21h10m-5-5v10M29 18h.01M34 23h.01"/>',
    megaphone: '<path d="m8 18 12-3L36 7v28l-16-8-12-3v-6Z"/><path d="m14 26 3 12h6l-3-11M36 16c6 0 6 10 0 10M7 18H4v7h4"/>',
    chart: '<path d="M6 7v31h32M11 29l9-10 8 5L38 9M29 9h9v9"/>',
    crystal: '<path d="m5 15 8-9h18l8 9-17 24L5 15Z"/><path d="M5 15h34M13 6l9 33 9-33M13 6l9 9 9-9"/>',
    flask: '<path d="M16 5h12m-10 0v13L7 35c-2 3 0 5 3 5h24c3 0 5-2 3-5L26 18V5M13 26h18"/><circle cx="20" cy="32" r="1"/><circle cx="26" cy="35" r="1"/>'
  };
  const icon = name => `<svg viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  function card(stage, index) {
    const expanded = index === 2;
    return `<article class="ga-card${expanded ? ' is-active' : ''}" style="--step:${index}" data-stage="${index}">
      <div class="ga-surface">
        <h3 class="ga-card-heading"><button class="ga-trigger" type="button" id="ga-trigger-${stage.id}" aria-expanded="${expanded}" aria-controls="ga-panel-${stage.id}">
          <span class="ga-number">${stage.number}</span><span class="ga-icon ga-icon-${stage.icon}">${icon(stage.icon)}</span>
          <span class="ga-title">${stage.title}</span><span class="ga-chevron" aria-hidden="true">${icon('chart').replace(paths.chart, '<path d="m12 17 10 10 10-10"/>')}</span>
        </button></h3>
        <p class="ga-compact-description" aria-hidden="true">${stage.description}</p>
        <div class="ga-panel" id="ga-panel-${stage.id}" role="region" aria-labelledby="ga-trigger-${stage.id}" aria-hidden="${!expanded}" ${expanded ? '' : 'inert'}>
          <div class="ga-panel-clip"><div class="ga-panel-content">
            <div class="ga-detail"><p class="ga-description">${stage.description}</p>
              <ul class="ga-features">${stage.features.map(feature => `<li>${feature}</li>`).join('')}</ul>
              <div class="ga-metric"><svg viewBox="0 0 26 26" aria-hidden="true"><path d="M3 22v-6m6 6V11m6 11V6m6 16V2" stroke="currentColor" stroke-width="3"/></svg><span>${stage.metricLabel} <strong>${stage.metricValue}</strong></span></div>
            </div>
            <div class="ga-visual" aria-hidden="true"><img src="${stage.imageSrc}" alt="" width="1536" height="1024" loading="${expanded ? 'eager' : 'lazy'}" decoding="async" /></div>
          </div></div>
        </div>
      </div>
    </article>`;
  }
  root.innerHTML = stages.map(card).join('');
  const cards = [...root.querySelectorAll('.ga-card')];
  const triggers = [...root.querySelectorAll('.ga-trigger')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 1280px)');
  let active = 2;
  let scrollTimer;

  // Observe each item so mobile cards appear when they actually enter view.
  // Independent translate leaves the accordion and hover transforms intact.
  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    const section = root.closest('#acquisition');
    const revealItems = [section.querySelector('.ga-heading'), ...cards];
    const reveal = element => {
      element.classList.remove('ga-reveal-pending');
      observer.unobserve(element);
    };
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) reveal(entry.target); });
    }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });
    revealItems.forEach(element => {
      element.classList.add('ga-reveal-pending');
      observer.observe(element);
    });
    section.addEventListener('focusin', event => {
      const card = event.target.closest('.ga-card');
      if (card) reveal(card);
    });
    reducedMotion.addEventListener('change', event => {
      if (event.matches) {
        revealItems.forEach(reveal);
        observer.disconnect();
      }
    });
  }

  function selectStage(index) {
    if (index === active) return;
    active = index;
    root.style.gridTemplateColumns = stages.map((_, i) => i === active ? '3.6fr' : '1fr').join(' ');
    cards.forEach((item, i) => {
      const selected = i === active;
      item.classList.toggle('is-active', selected);
      triggers[i].setAttribute('aria-expanded', String(selected));
      const panel = item.querySelector('.ga-panel');
      panel.inert = !selected;
      panel.setAttribute('aria-hidden', String(!selected));
    });
    clearTimeout(scrollTimer);
    if (!desktop.matches) {
      scrollTimer = setTimeout(() => {
        const bounds = triggers[active].getBoundingClientRect();
        const headerHeight = document.querySelector('[data-header]')?.getBoundingClientRect().height || 0;
        if (bounds.top < headerHeight + 12 || bounds.bottom > innerHeight - 24) {
          window.scrollBy({ top: bounds.top - headerHeight - 24, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
        }
      }, reducedMotion.matches ? 0 : 650);
    }
  }
  root.addEventListener('click', event => {
    const item = event.target.closest('.ga-card');
    if (item) selectStage(Number(item.dataset.stage));
  });
  root.addEventListener('keydown', event => {
    const index = triggers.indexOf(event.target);
    if (index < 0) return;
    const next = { ArrowRight: (index + 1) % 6, ArrowDown: (index + 1) % 6, ArrowLeft: (index + 5) % 6, ArrowUp: (index + 5) % 6, Home: 0, End: 5 }[event.key];
    if (next !== undefined) { event.preventDefault(); triggers[next].focus(); }
  });

})();
