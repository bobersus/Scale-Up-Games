(function () {
  const games = Array.isArray(window.SCALEUP_GAMES) ? window.SCALEUP_GAMES : [];
  const state = {
    gamesByUniverse: new Map(),
    thumbsByUniverse: new Map(),
    hasAnimatedCounts: false
  };
  const CONTACT_ENDPOINT = "/api/contact";

  const header = document.querySelector("[data-header]");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  const navLinks = nav ? Array.from(nav.querySelectorAll("a[href]")) : [];
  const navIndicator = nav ? document.createElement("span") : null;
  let navIndicatorFrame = 0;
  let navIndicatorTimer = 0;
  let activeNavPath = "";
  let navClickLockUntil = 0;
  const PATH_ALIASES = new Map([
    ["/", "/home"],
    ["/index.html", "/home"],
    ["/games.html", "/games"],
    ["/privacy-policy.html", "/privacy-policy"]
  ]);
  const SECTION_PATHS = new Map([
    ["home", "/home"],
    ["about", "/about"],
    ["games", "/featured-games"],
    ["acquisition", "/acquisition"],
    ["contact", "/contact"]
  ]);
  const LANDING_ROUTES = new Map(Array.from(SECTION_PATHS, ([sectionId, routePath]) => [routePath, sectionId]));

  if (navIndicator) {
    navIndicator.className = "nav-indicator";
    navIndicator.setAttribute("aria-hidden", "true");
    nav.prepend(navIndicator);
  }

  function setHeaderState() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 18);
  }

  function normalizePath(pathname) {
    const path = pathname || "/";
    return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  }

  function canonicalPath(pathname) {
    const path = normalizePath(pathname);
    return PATH_ALIASES.get(path) || path;
  }

  function currentPath() {
    return canonicalPath(window.location.pathname);
  }

  function getInternalPath(link) {
    try {
      const url = new URL(link.getAttribute("href"), window.location.href);
      return url.origin === window.location.origin ? canonicalPath(url.pathname) : "";
    } catch (error) {
      return "";
    }
  }

  function getLandingSection(pathname) {
    return LANDING_ROUTES.get(canonicalPath(pathname)) || "";
  }

  function setActiveNav(path = currentPath()) {
    if (!navLinks.length) return;
    const activePath = canonicalPath(path);
    const pathChanged = activePath !== activeNavPath;
    activeNavPath = activePath;

    navLinks.forEach((link) => {
      const isActive = getInternalPath(link) === activePath;
      link.classList.toggle("active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
    if (pathChanged) {
      queueNavIndicatorUpdate(true);
    }
  }

  function updateNavIndicator() {
    if (!nav || !navIndicator) return;

    const activeLink = nav.querySelector("a.active");
    if (!activeLink) {
      navIndicator.classList.remove("is-visible");
      return;
    }

    const navRect = nav.getBoundingClientRect();
    const activeRect = activeLink.getBoundingClientRect();
    const isButton = activeLink.classList.contains("btn");
    const padX = isButton ? 2 : 12;
    const padY = isButton ? 0 : 6;
    const x = activeRect.left - navRect.left - padX;
    const y = activeRect.top - navRect.top - padY;
    const tabWidth = activeRect.width + padX * 2;
    const tabX = x;

    navIndicator.style.setProperty("--indicator-x", `${tabX}px`);
    navIndicator.style.setProperty("--indicator-y", `${y}px`);
    navIndicator.style.setProperty("--indicator-w", `${tabWidth}px`);
    navIndicator.style.setProperty("--indicator-h", `${activeRect.height + padY * 2}px`);
    navIndicator.classList.add("is-visible");

    window.clearTimeout(navIndicatorTimer);
    navIndicatorTimer = window.setTimeout(() => {
      navIndicator.classList.remove("is-switching");
    }, 380);
  }

  function queueNavIndicatorUpdate(isSwitching = false) {
    if (navIndicator && isSwitching) {
      navIndicator.classList.add("is-switching");
    }
    window.cancelAnimationFrame(navIndicatorFrame);
    navIndicatorFrame = window.requestAnimationFrame(updateNavIndicator);
  }

  function updateActiveNav() {
    if (Date.now() < navClickLockUntil) return;

    const sectionRoutes = Array.from(SECTION_PATHS, ([sectionId, path]) => {
      const section = document.getElementById(sectionId);
      return section ? { path, section } : null;
    }).filter(Boolean);

    if (!sectionRoutes.length) {
      setActiveNav(currentPath());
      return;
    }

    const sectionOffset = (header?.offsetHeight || 92) + 44;
    let activePath = sectionRoutes.some((route) => route.path === currentPath())
      ? currentPath()
      : sectionRoutes[0].path;

    sectionRoutes.forEach(({ path, section }) => {
      if (section.getBoundingClientRect().top <= sectionOffset) {
        activePath = path;
      }
    });

    setActiveNav(activePath);
  }

  function scrollToSection(sectionId, behavior = "smooth") {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const offset = sectionId === "home" ? 0 : (header?.offsetHeight || 92) + 18;
    const top = Math.max(0, section.getBoundingClientRect().top + window.scrollY - offset);
    window.scrollTo({ top, behavior });
  }

  function navigateToSection(path, sectionId, push = true, behavior = "smooth") {
    const targetPath = canonicalPath(path);
    navClickLockUntil = Date.now() + 900;

    if (push && targetPath !== currentPath()) {
      window.history.pushState(null, "", targetPath);
    }

    setActiveNav(targetPath);
    scrollToSection(sectionId, behavior);
    window.setTimeout(updateActiveNav, 920);
  }

  function replaceLegacyHashRoute() {
    const sectionId = window.location.hash ? window.location.hash.slice(1) : "";
    const path = SECTION_PATHS.get(sectionId);

    if (!path || !document.getElementById(sectionId)) return null;

    window.history.replaceState(null, "", path);
    return { path, sectionId };
  }

  function handleRouteClick(event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const link = event.target.closest("a[href]");
    if (!link || (link.target && link.target !== "_self")) return;

    let url;
    try {
      url = new URL(link.getAttribute("href"), window.location.href);
    } catch (error) {
      return;
    }

    if (url.origin !== window.location.origin) return;

    const path = canonicalPath(url.pathname);
    const sectionId = getLandingSection(path);
    if (!sectionId || !document.getElementById(sectionId)) return;

    event.preventDefault();
    navigateToSection(path, sectionId);
    document.body.classList.remove("nav-open");
  }

  function handlePopState() {
    const sectionId = getLandingSection(currentPath());

    if (sectionId && document.getElementById(sectionId)) {
      navigateToSection(currentPath(), sectionId, false, "auto");
      return;
    }

    setActiveNav(currentPath());
  }

  function setupNavigation() {
    setHeaderState();
    const legacyRoute = replaceLegacyHashRoute();
    const initialSection = legacyRoute?.sectionId || getLandingSection(currentPath());
    if (initialSection && document.getElementById(initialSection)) {
      window.requestAnimationFrame(() => scrollToSection(initialSection, "auto"));
    }
    updateActiveNav();
    queueNavIndicatorUpdate();
    window.addEventListener("scroll", () => {
      setHeaderState();
      updateActiveNav();
    }, { passive: true });
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("resize", queueNavIndicatorUpdate);
    window.addEventListener("load", queueNavIndicatorUpdate);
    document.addEventListener("click", handleRouteClick);
    if (document.fonts?.ready) {
      document.fonts.ready.then(queueNavIndicatorUpdate);
    }

    if (navToggle && nav) {
      navToggle.addEventListener("click", () => {
        document.body.classList.toggle("nav-open");
        queueNavIndicatorUpdate();
      });

      nav.addEventListener("click", (event) => {
        const link = event.target.closest("a");
        if (link) {
          document.body.classList.remove("nav-open");
        }
      });
    }
  }

  function setupLiquidHighlights() {
    document.querySelectorAll(".liquid").forEach((element) => {
      element.addEventListener("pointermove", (event) => {
        const rect = element.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        element.style.setProperty("--mx", `${x}%`);
        element.style.setProperty("--my", `${y}%`);
      });
    });
  }

  function formatNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0";
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1
    }).format(number);
  }

  function animateCount(node, target, duration = 1100) {
    const end = Math.max(0, Number(target) || 0);
    const startTime = performance.now();

    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = formatNumber(Math.round(end * eased));

      if (progress < 1) {
        window.requestAnimationFrame(tick);
      } else {
        node.textContent = formatNumber(end);
      }
    }

    node.textContent = "0";
    window.requestAnimationFrame(tick);
  }

  function animateCountsOnce() {
    if (state.hasAnimatedCounts) return;

    document.querySelectorAll("[data-count-value]").forEach((node) => {
      animateCount(node, node.dataset.countValue);
    });
    state.hasAnimatedCounts = true;
  }

  function universeIds() {
    return games.map((game) => String(game.universeId || "").trim()).filter(Boolean);
  }

  function gameUrl(game) {
    if (game.placeId) {
      return `https://www.roblox.com/games/${game.placeId}`;
    }

    return "#";
  }

  function getLiveGame(game) {
    return state.gamesByUniverse.get(String(game.universeId || "")) || null;
  }

  function getGameTitle(game) {
    const liveGame = getLiveGame(game);
    return liveGame?.name || "Roblox Game";
  }

  function getGameCcu(game) {
    const liveGame = getLiveGame(game);
    return Number(liveGame?.playing || 0);
  }

  function getGameVisits(game) {
    const liveGame = getLiveGame(game);
    return Number(liveGame?.visits || game.visits || 0);
  }

  function getGameThumb(game) {
    return state.thumbsByUniverse.get(String(game.universeId || "")) || "";
  }

  function sortedGamesByCcu() {
    return games
      .map((game, index) => ({ game, index }))
      .sort((a, b) => {
        const ccuDifference = getGameCcu(b.game) - getGameCcu(a.game);
        return ccuDifference || a.index - b.index;
      })
      .map((entry) => entry.game);
  }

  function placeholderClass(index) {
    return `placeholder-${(index % 6) + 1}`;
  }

  function createGameCard(game, index) {
    const url = gameUrl(game);
    const title = getGameTitle(game);
    const ccu = getGameCcu(game);
    const visits = getGameVisits(game);
    const thumb = getGameThumb(game);
    const hasLiveId = Boolean(String(game.universeId || "").trim());

    const card = document.createElement(url === "#" ? "article" : "a");
    card.className = "game-card liquid";
    if (url !== "#") {
      card.href = url;
      card.target = "_blank";
      card.rel = "noreferrer";
    }
    card.dataset.universeId = String(game.universeId || "");

    const media = document.createElement("div");
    media.className = `game-media ${thumb ? "" : placeholderClass(index)}`;

    if (thumb) {
      const image = document.createElement("img");
      image.src = thumb;
      image.alt = title;
      media.appendChild(image);
    } else {
      const placeholder = document.createElement("span");
      placeholder.textContent = "ScaleUp";
      media.appendChild(placeholder);
    }

    const fade = document.createElement("div");
    fade.className = "game-fade";

    const content = document.createElement("div");
    content.className = "game-content";

    const heading = document.createElement("h3");
    heading.textContent = title;

    const meta = document.createElement("div");
    meta.className = "game-metrics";
    meta.innerHTML = `
      <span class="metric-pill">
        <span class="player-dot"></span>
        <span data-card-ccu ${hasLiveId ? `data-count-value="${ccu}"` : ""}>${hasLiveId && state.hasAnimatedCounts ? formatNumber(ccu) : hasLiveId ? "0" : "Add ID"}</span>
        <span>CCU</span>
      </span>
      <span class="metric-pill">
        <span ${hasLiveId ? `data-count-value="${visits}"` : ""}>${hasLiveId && state.hasAnimatedCounts ? formatNumber(visits) : hasLiveId ? "0" : "Add ID"}</span>
        <span>Visits</span>
      </span>
    `;

    content.append(heading, meta);
    card.append(media, fade, content);
    return card;
  }

  function renderGameGrid(target, list) {
    if (!target) return;
    target.replaceChildren();
    list.forEach((game, index) => {
      target.appendChild(createGameCard(game, index));
    });
  }

  function updateStats() {
    const totalCcu = games.reduce((sum, game) => sum + getGameCcu(game), 0);
    const totalVisits = games.reduce((sum, game) => sum + getGameVisits(game), 0);
    document.querySelectorAll("[data-stat='ccu']").forEach((node) => {
      node.dataset.countValue = String(totalCcu);
      node.textContent = state.hasAnimatedCounts ? formatNumber(totalCcu) : "0";
    });
    document.querySelectorAll("[data-stat='visits']").forEach((node) => {
      node.dataset.countValue = String(totalVisits);
      node.textContent = state.hasAnimatedCounts ? formatNumber(totalVisits) : "0";
    });
  }

  async function fetchRobloxGames(ids) {
    if (!ids.length) return;
    const url = `/api/roblox/games?universeIds=${encodeURIComponent(ids.join(","))}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Unable to load Roblox game data.");
    const payload = await response.json();

    (payload.data || []).forEach((game) => {
      state.gamesByUniverse.set(String(game.id), game);
    });
  }

  async function fetchRobloxThumbnails(ids) {
    if (!ids.length) return;
    const url = `/api/roblox/thumbnails?universeIds=${encodeURIComponent(ids.join(","))}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Unable to load Roblox thumbnails.");
    const payload = await response.json();

    (payload.data || []).forEach((entry) => {
      const imageUrl = entry.thumbnails?.[0]?.imageUrl;
      if (entry.universeId && imageUrl) {
        state.thumbsByUniverse.set(String(entry.universeId), imageUrl);
      }
    });
  }

  async function refreshRobloxData() {
    const ids = universeIds();
    if (!ids.length) {
      updateStats();
      return;
    }

    try {
      await Promise.all([fetchRobloxGames(ids), fetchRobloxThumbnails(ids)]);
    } catch (error) {
      console.warn(error);
    }

    const sortedGames = sortedGamesByCcu();
    renderGameGrid(document.getElementById("featuredGamesGrid"), sortedGames.slice(0, 6));
    renderGameGrid(document.getElementById("allGamesGrid"), sortedGames);
    setupLiquidHighlights();
    updateStats();
    if (state.gamesByUniverse.size) {
      animateCountsOnce();
    }
  }

  function getFormValue(formData, name) {
    return String(formData.get(name) || "").trim();
  }

  function setFormStatus(form, message, tone = "") {
    const status = form.querySelector("[data-form-status]");
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function isRobloxGameLink(value) {
    return !value || /^https:\/\/(www\.)?roblox\.com(\/|$)/i.test(value);
  }

  function setupContactForm() {
    const form = document.getElementById("contactForm");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = form.querySelector("button[type='submit']");
      if (!button) return;

      const formData = new FormData(form);
      const payload = {
        name: getFormValue(formData, "name"),
        game: getFormValue(formData, "game"),
        discord: getFormValue(formData, "discord"),
        message: getFormValue(formData, "message")
      };
      const defaultText = button.dataset.defaultText || button.textContent;
      button.dataset.defaultText = defaultText;

      if (!isRobloxGameLink(payload.game)) {
        setFormStatus(form, "Roblox link must start with https://www.roblox.com or https://roblox.com", "error");
        return;
      }

      button.disabled = true;
      button.textContent = "Sending...";
      form.classList.add("is-sending");
      setFormStatus(form, "Sending your request...", "neutral");

      try {
        const response = await fetch(CONTACT_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error("The request could not be sent.");
        }

        form.reset();
        button.textContent = "Sent";
        setFormStatus(form, "Request sent. We'll reach out on Discord.", "success");
        setTimeout(() => {
          button.textContent = defaultText;
        }, 2200);
      } catch (error) {
        console.warn(error);
        button.textContent = defaultText;
        setFormStatus(form, "Could not send right now. Please try again.", "error");
      } finally {
        button.disabled = false;
        form.classList.remove("is-sending");
      }
    });
  }

  function init() {
    document.querySelectorAll("[data-year]").forEach((node) => {
      node.textContent = String(new Date().getFullYear());
    });

    setupNavigation();
    const sortedGames = sortedGamesByCcu();
    renderGameGrid(document.getElementById("featuredGamesGrid"), sortedGames.slice(0, 6));
    renderGameGrid(document.getElementById("allGamesGrid"), sortedGames);
    setupLiquidHighlights();
    setupContactForm();
    updateStats();
    refreshRobloxData();
    window.setInterval(refreshRobloxData, 60000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
