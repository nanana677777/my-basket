/* 🏅 My Basket — Visitor badges / achievements engine
   Shared across every page. Include with: <script src="./badges.js"></script>
   Exposes window.unlockBadge(id) for pages to call on specific actions.
*/
(function () {
  "use strict";

  const BADGES = [
    { id: "first-vote", icon: "🗳️", title: "First vote", desc: "Voted for an item" },
    { id: "first-fav",  icon: "❤️", title: "Crush",       desc: "First favorite added" },
    { id: "commenter",  icon: "✍️", title: "Commentator", desc: "Left a comment" },
    { id: "curious",    icon: "🙋", title: "Curious",     desc: "Asked a question on the AMA" },
    { id: "stylist",    icon: "🎨", title: "Stylist",     desc: "Proposed an outfit" },
    { id: "explorer",   icon: "👀", title: "Explorer",    desc: "Visited every page on the site" },
    { id: "loyal",      icon: "💫", title: "Loyal",       desc: "3rd visit to the site" },
    { id: "player",     icon: "🎮", title: "Gamer",       desc: "5 correct answers in a row on Higher/Lower" },
    { id: "memory",     icon: "🧠", title: "Elephant memory", desc: "Cleared a level in the Memory game" },
    { id: "swiper",     icon: "📱", title: "Swiper",      desc: "Tried swipe mode" },
    { id: "lucky",      icon: "🎲", title: "Lucky",       desc: "Revealed a Pick-for-me result" },
    { id: "outfit-fan", icon: "🩷", title: "Outfit supporter", desc: "Voted for an outfit" },
    { id: "sociable",   icon: "😊", title: "Sociable",    desc: "Left a reaction on a comment" },
  ];

  const STORAGE_KEY = "nanaBadgesUnlocked";
  const PAGES_KEY = "nanaBadgesPagesSeen";
  const VISITS_KEY = "nanaBadgesVisitCount";
  const SESSION_FLAG = "nanaBadgesSessionCounted";

  const TRACKED_PAGES = [
    "index.html", "outfits.html", "leaderboard.html", "comments.html",
    "ama.html", "stats.html", "timeline.html", "dna.html", "about.html",
  ];

  function getUnlocked() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch (e) { return []; }
  }
  function saveUnlocked(arr) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch (e) {}
  }

  function injectStyles() {
    if (document.getElementById("nb-styles")) return;
    const style = document.createElement("style");
    style.id = "nb-styles";
    style.textContent = `
      #nb-toast-container {
        position: fixed; top: 18px; right: 18px; z-index: 3000;
        display: flex; flex-direction: column; gap: 10px;
        pointer-events: none; max-width: 280px;
      }
      .nb-toast {
        display: flex; align-items: center; gap: 12px;
        background: #1b1b26; border: 1px solid rgba(255,158,203,0.35);
        border-radius: 16px; padding: 12px 16px;
        box-shadow: 0 0 30px rgba(255,158,203,0.18), 0 12px 30px rgba(0,0,0,0.55);
        font-family: "Segoe UI", Arial, sans-serif; color: #fff;
        transform: translateX(120%); opacity: 0; transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1);
      }
      .nb-toast.show { transform: translateX(0); opacity: 1; }
      .nb-toast-icon { font-size: 26px; flex-shrink: 0; filter: drop-shadow(0 0 6px rgba(255,158,203,0.5)); }
      .nb-toast-title { font-size: 10.5px; letter-spacing: 0.5px; text-transform: uppercase; color: #ff9ecb; margin-bottom: 2px; }
      .nb-toast-name { font-size: 14px; font-weight: 600; color: #fff; }

      #nb-badge-tab {
        position: fixed; bottom: 20px; left: 20px; z-index: 2400;
        background: rgba(27,27,38,0.85); border: 1px solid rgba(255,158,203,0.3);
        color: #ff9ecb; border-radius: 999px; padding: 9px 14px;
        font-family: "Segoe UI", Arial, sans-serif; font-size: 13px; font-weight: 600;
        cursor: pointer; backdrop-filter: blur(8px);
        box-shadow: 0 4px 18px rgba(0,0,0,0.35);
        transition: all 0.2s ease; display: flex; align-items: center; gap: 6px;
      }
      #nb-badge-tab:hover { background: rgba(255,158,203,0.16); transform: translateY(-2px); }
      #nb-badge-count {
        background: #ff9ecb; color: #1b1b26; border-radius: 999px;
        font-size: 10.5px; font-weight: 700; padding: 1px 7px;
      }

      #nb-overlay {
        display: none; position: fixed; inset: 0; z-index: 3100;
        background: rgba(8,8,14,0.72); backdrop-filter: blur(10px);
        align-items: center; justify-content: center; padding: 24px;
      }
      #nb-overlay.open { display: flex; animation: nbFade 0.25s ease; }
      @keyframes nbFade { from { opacity: 0; } to { opacity: 1; } }
      #nb-panel {
        width: 100%; max-width: 340px; max-height: 82vh; overflow-y: auto;
        background: #1b1b26; border: 1px solid rgba(255,158,203,0.3);
        border-radius: 24px; padding: 24px 20px;
        box-shadow: 0 0 60px rgba(255,158,203,0.15), 0 20px 50px rgba(0,0,0,0.6);
        font-family: "Segoe UI", Arial, sans-serif; color: #fff;
        transform: scale(0.92) translateY(10px); opacity: 0;
        transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
      }
      #nb-overlay.open #nb-panel { transform: scale(1) translateY(0); opacity: 1; }
      #nb-panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
      #nb-panel-head h3 { margin: 0; font-size: 16px; color: #ff9ecb; letter-spacing: 0.5px; text-shadow: 0 0 12px rgba(255,158,203,0.4); }
      #nb-close {
        background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
        color: #cfc9d8; width: 28px; height: 28px; border-radius: 50%;
        cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;
        transition: all 0.2s ease;
      }
      #nb-close:hover { background: rgba(255,158,203,0.2); color: #fff; transform: rotate(90deg); }
      #nb-progress { font-size: 12px; color: #9c96a8; margin-bottom: 14px; }
      .nb-row {
        display: flex; align-items: center; gap: 12px;
        padding: 10px 8px; border-radius: 12px; margin-bottom: 4px;
      }
      .nb-row.locked { opacity: 0.4; }
      .nb-row-icon { font-size: 24px; width: 30px; text-align: center; flex-shrink: 0; }
      .nb-row.locked .nb-row-icon { filter: grayscale(1); }
      .nb-row-title { font-size: 13.5px; font-weight: 600; }
      .nb-row-desc { font-size: 11.5px; color: #9c96a8; }

      @media (max-width: 480px) {
        #nb-badge-tab { bottom: 14px; left: 14px; padding: 8px 12px; font-size: 12px; }
        #nb-toast-container { top: 12px; right: 12px; max-width: 220px; }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureToastContainer() {
    let c = document.getElementById("nb-toast-container");
    if (!c) {
      c = document.createElement("div");
      c.id = "nb-toast-container";
      document.body.appendChild(c);
    }
    return c;
  }

  function showToast(badge) {
    const container = ensureToastContainer();
    const el = document.createElement("div");
    el.className = "nb-toast";
    el.innerHTML =
      '<div class="nb-toast-icon">' + badge.icon + "</div>" +
      '<div><div class="nb-toast-title">Badge unlocked!</div>' +
      '<div class="nb-toast-name">' + badge.title + "</div></div>";
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 400);
    }, 4000);
    updateBadgeTabCount();
  }

  window.unlockBadge = function (id) {
    const badge = BADGES.find((b) => b.id === id);
    if (!badge) return;
    const unlocked = getUnlocked();
    if (unlocked.includes(id)) return;
    unlocked.push(id);
    saveUnlocked(unlocked);
    showToast(badge);
  };

  function trackPageVisit() {
    let page = location.pathname.split("/").pop();
    if (!page) page = "index.html";
    if (!TRACKED_PAGES.includes(page)) return;
    let seen = [];
    try { seen = JSON.parse(localStorage.getItem(PAGES_KEY)) || []; } catch (e) {}
    if (!seen.includes(page)) {
      seen.push(page);
      try { localStorage.setItem(PAGES_KEY, JSON.stringify(seen)); } catch (e) {}
    }
    if (TRACKED_PAGES.every((p) => seen.includes(p))) {
      window.unlockBadge("explorer");
    }
  }

  function trackVisitCount() {
    if (sessionStorage.getItem(SESSION_FLAG)) return;
    sessionStorage.setItem(SESSION_FLAG, "1");
    let count = parseInt(localStorage.getItem(VISITS_KEY) || "0", 10) + 1;
    try { localStorage.setItem(VISITS_KEY, String(count)); } catch (e) {}
    if (count >= 3) window.unlockBadge("loyal");
  }

  function updateBadgeTabCount() {
    const el = document.getElementById("nb-badge-count");
    if (!el) return;
    el.textContent = getUnlocked().length + "/" + BADGES.length;
  }

  function renderPanel() {
    const panel = document.getElementById("nb-panel");
    if (!panel) return;
    const unlocked = getUnlocked();
    let html =
      '<div id="nb-panel-head"><h3>🏅 My badges</h3>' +
      '<button id="nb-close" title="Close">✕</button></div>' +
      '<div id="nb-progress">' + unlocked.length + " / " + BADGES.length + " unlocked</div>";
    BADGES.forEach((b) => {
      const isUnlocked = unlocked.includes(b.id);
      html +=
        '<div class="nb-row ' + (isUnlocked ? "" : "locked") + '">' +
        '<div class="nb-row-icon">' + (isUnlocked ? b.icon : "🔒") + "</div>" +
        '<div><div class="nb-row-title">' + b.title + "</div>" +
        '<div class="nb-row-desc">' + (isUnlocked ? b.desc : "???") + "</div></div>" +
        "</div>";
    });
    panel.innerHTML = html;
    document.getElementById("nb-close").addEventListener("click", closePanel);
  }

  function openPanel() {
    renderPanel();
    document.getElementById("nb-overlay").classList.add("open");
  }
  function closePanel() {
    const ov = document.getElementById("nb-overlay");
    if (ov) ov.classList.remove("open");
  }

  function buildBadgeTab() {
    if (document.getElementById("nb-badge-tab")) return;

    const tab = document.createElement("button");
    tab.id = "nb-badge-tab";
    tab.innerHTML = '🏅 <span id="nb-badge-count">0/' + BADGES.length + "</span>";
    document.body.appendChild(tab);

    const overlay = document.createElement("div");
    overlay.id = "nb-overlay";
    overlay.innerHTML = '<div id="nb-panel"></div>';
    document.body.appendChild(overlay);

    tab.addEventListener("click", openPanel);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closePanel(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });

    updateBadgeTabCount();
  }

  function init() {
    injectStyles();
    buildBadgeTab();
    trackPageVisit();
    trackVisitCount();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
