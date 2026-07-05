/* 🏷️ My Basket — Visitor identity
   Shared across every page. Include with: <script src="./identity.js"></script>
   Lets a visitor pick a nickname + emoji once; reused automatically to pre-fill
   name fields (comments, AMA, outfit proposals, dressing room, sent picks) and
   to personalize the badge panel + vote notifications. Fully optional — a
   visitor can skip it and stay anonymous exactly like before.
*/
(function () {
  "use strict";

  const STORAGE_KEY = "nanaVisitorIdentity";
  const SKIPPED_KEY = "nanaIdentitySkipped";
  const EMOJI_CHOICES = ["🌸", "🦋", "💫", "✨", "🎀", "🐰", "🌙", "💖", "🔥", "🍒", "🎧", "👑", "🍓", "🦄", "🐱", "🍑"];

  // Name-field IDs across the site that should auto-fill from the identity.
  const NAME_FIELD_IDS = ["comment-name", "propose-by", "dressing-by", "selection-name", "ask-name"];

  function getIdentity() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { return null; }
  }
  function saveIdentity(identity) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(identity)); } catch (e) {}
  }
  window.getVisitorIdentity = getIdentity;
  window.getVisitorLabel = function () {
    const id = getIdentity();
    return id ? (id.emoji ? id.emoji + " " : "") + id.name : "";
  };

  function injectStyles() {
    if (document.getElementById("vi-styles")) return;
    const style = document.createElement("style");
    style.id = "vi-styles";
    style.textContent = `
      #vi-pill {
        position: fixed; top: 16px; right: 16px; z-index: 2400;
        background: rgba(27,27,38,0.85); border: 1px solid rgba(255,158,203,0.3);
        color: #ff9ecb; border-radius: 999px; padding: 7px 13px;
        font-family: "Segoe UI", Arial, sans-serif; font-size: 12.5px; font-weight: 600;
        cursor: pointer; backdrop-filter: blur(8px);
        box-shadow: 0 4px 18px rgba(0,0,0,0.35);
        transition: all 0.2s ease; display: flex; align-items: center; gap: 5px;
        max-width: 160px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
      }
      #vi-pill:hover { background: rgba(255,158,203,0.16); transform: translateY(-2px); }

      #vi-overlay {
        display: none; position: fixed; inset: 0; z-index: 3400;
        background: rgba(8,8,14,0.78); backdrop-filter: blur(10px);
        align-items: center; justify-content: center; padding: 24px;
      }
      #vi-overlay.open { display: flex; animation: viFade 0.25s ease; }
      @keyframes viFade { from { opacity: 0; } to { opacity: 1; } }
      #vi-panel {
        width: 100%; max-width: 320px;
        background: #1b1b26; border: 1px solid rgba(255,158,203,0.3);
        border-radius: 24px; padding: 24px 20px;
        box-shadow: 0 0 60px rgba(255,158,203,0.15), 0 20px 50px rgba(0,0,0,0.6);
        font-family: "Segoe UI", Arial, sans-serif; color: #fff; text-align: center;
        transform: scale(0.92) translateY(10px); opacity: 0;
        transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); position: relative;
      }
      #vi-overlay.open #vi-panel { transform: scale(1) translateY(0); opacity: 1; }
      #vi-close {
        position: absolute; top: 14px; right: 14px;
        background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
        color: #cfc9d8; width: 28px; height: 28px; border-radius: 50%;
        cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;
      }
      #vi-close:hover { background: rgba(255,158,203,0.2); color: #fff; }
      #vi-title {
        font-size: 16px; font-weight: 800; color: #ff9ecb;
        text-shadow: 0 0 12px rgba(255,158,203,0.4); margin-bottom: 4px;
      }
      #vi-sub { font-size: 12px; color: #9c96a8; margin-bottom: 16px; }
      #vi-name-input {
        width: 100%; box-sizing: border-box; padding: 10px 14px; border-radius: 999px;
        border: 1px solid rgba(255,158,203,0.35); background: #14141c; color: #fff;
        outline: none; font-size: 13px; text-align: center; font-family: inherit;
        margin-bottom: 14px;
      }
      #vi-emoji-grid {
        display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px;
        margin-bottom: 18px;
      }
      .vi-emoji-opt {
        font-size: 20px; padding: 8px 0; border-radius: 12px; cursor: pointer;
        background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
        transition: all 0.15s ease;
      }
      .vi-emoji-opt:hover { background: rgba(255,158,203,0.12); }
      .vi-emoji-opt.active { background: linear-gradient(135deg, #ff9ecb, #c9a6ff); border-color: transparent; }
      #vi-save-btn {
        width: 100%; padding: 12px; border-radius: 999px; border: none;
        background: linear-gradient(135deg, #ff9ecb, #c9a6ff); color: #1b1b26;
        font-weight: 800; font-size: 13.5px; cursor: pointer; font-family: inherit;
        margin-bottom: 8px;
      }
      #vi-save-btn:disabled { opacity: 0.4; cursor: default; }
      #vi-skip-btn {
        width: 100%; padding: 10px; border-radius: 999px; border: none;
        background: transparent; color: #9c96a8; font-size: 12px; cursor: pointer;
        font-family: inherit;
      }
      #vi-skip-btn:hover { color: #cfc9d8; }

      @media (max-width: 480px) {
        #vi-pill { top: 12px; right: 12px; font-size: 11.5px; padding: 6px 11px; max-width: 130px; }
      }
    `;
    document.head.appendChild(style);
  }

  function buildOverlay() {
    if (document.getElementById("vi-overlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "vi-overlay";
    overlay.innerHTML = `
      <div id="vi-panel">
        <button id="vi-close" title="Close">✕</button>
        <div id="vi-title">🏷️ Pick your look</div>
        <div id="vi-sub">Used for your comments, votes &amp; badges — no account needed</div>
        <input id="vi-name-input" type="text" placeholder="Nickname (e.g. Sam)" maxlength="20">
        <div id="vi-emoji-grid"></div>
        <button id="vi-save-btn" disabled>✨ Save my look</button>
        <button id="vi-skip-btn">Stay anonymous instead</button>
      </div>
    `;
    document.body.appendChild(overlay);

    const grid = document.getElementById("vi-emoji-grid");
    let chosenEmoji = null;
    EMOJI_CHOICES.forEach((e) => {
      const opt = document.createElement("div");
      opt.className = "vi-emoji-opt";
      opt.textContent = e;
      opt.addEventListener("click", () => {
        grid.querySelectorAll(".vi-emoji-opt").forEach((o) => o.classList.remove("active"));
        opt.classList.add("active");
        chosenEmoji = e;
        updateSaveState();
      });
      grid.appendChild(opt);
    });

    const nameInput = document.getElementById("vi-name-input");
    const saveBtn = document.getElementById("vi-save-btn");

    function updateSaveState() {
      saveBtn.disabled = !(nameInput.value.trim() && chosenEmoji);
    }
    nameInput.addEventListener("input", updateSaveState);

    function prefillFromExisting() {
      const existing = getIdentity();
      if (existing) {
        nameInput.value = existing.name || "";
        if (existing.emoji) {
          const match = Array.from(grid.children).find((o) => o.textContent === existing.emoji);
          if (match) {
            match.classList.add("active");
            chosenEmoji = existing.emoji;
          }
        }
      }
      updateSaveState();
    }

    document.getElementById("vi-close").addEventListener("click", closeOverlay);
    document.getElementById("vi-skip-btn").addEventListener("click", () => {
      try { localStorage.setItem(SKIPPED_KEY, "1"); } catch (e) {}
      closeOverlay();
    });
    saveBtn.addEventListener("click", () => {
      const identity = { name: nameInput.value.trim().slice(0, 20), emoji: chosenEmoji };
      saveIdentity(identity);
      updatePill();
      applyAutoFill();
      document.dispatchEvent(new CustomEvent("nanaIdentityChanged", { detail: identity }));
      closeOverlay();
    });
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeOverlay(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeOverlay(); });

    overlay._prefill = prefillFromExisting;
  }

  function openOverlay() {
    buildOverlay();
    document.getElementById("vi-overlay")._prefill();
    document.getElementById("vi-overlay").classList.add("open");
  }
  function closeOverlay() {
    const ov = document.getElementById("vi-overlay");
    if (ov) ov.classList.remove("open");
  }

  function buildPill() {
    if (document.getElementById("vi-pill")) return;
    const pill = document.createElement("button");
    pill.id = "vi-pill";
    document.body.appendChild(pill);
    pill.addEventListener("click", openOverlay);
    updatePill();
  }

  function updatePill() {
    const pill = document.getElementById("vi-pill");
    if (!pill) return;
    const id = getIdentity();
    pill.textContent = id ? id.emoji + " " + id.name : "🏷️ Set your look";
  }

  function applyAutoFill() {
    const id = getIdentity();
    if (!id) return;
    const label = (id.emoji ? id.emoji + " " : "") + id.name;
    NAME_FIELD_IDS.forEach((fieldId) => {
      const el = document.getElementById(fieldId);
      if (el && !el.value) el.value = label;
    });
  }

  function maybePromptFirstVisit() {
    if (getIdentity() || localStorage.getItem(SKIPPED_KEY)) return;
    setTimeout(openOverlay, 1400);
  }

  function init() {
    injectStyles();
    buildPill();
    applyAutoFill();
    // Fields can be created dynamically after this script runs (e.g. propose
    // modal opens later) — keep trying for a bit so they still get filled.
    let tries = 0;
    const retry = setInterval(() => {
      applyAutoFill();
      if (++tries > 20) clearInterval(retry);
    }, 500);
    maybePromptFirstVisit();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
