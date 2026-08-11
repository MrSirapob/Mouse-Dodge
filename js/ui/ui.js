import { CONFIG } from "../core/config.js";

const SKILL_NAMES = {
  pulse: "PULSE",
  dash: "DASH",
  shield: "SHIELD",
  slow: "SLOW",
  nova: "NOVA",
  timestop: "TIME STOP",
  heal: "HEAL",
  repulse: "REPULSE",
  phase: "PHASE",
};

const SKILL_DESCRIPTIONS = {
  pulse: "ล้างกระสุนรอบตัว",
  dash: "พุ่งไปยังเป้าหมายพร้อมอมตะสั้น ๆ",
  shield: "สร้างโล่ป้องกันดาเมจชั่วคราว",
  slow: "ทำให้กระสุนทั้งหมดช้าลง",
  nova: "ระเบิดพลังรอบตัว ทำลายกระสุนในวงกว้าง",
  timestop: "หยุดการเคลื่อนที่ของกระสุนชั่วคราว",
  heal: "ฟื้นคืน 1 ชีวิต สูงสุด 3 ชีวิต",
  repulse: "ผลักกระสุนรอบตัวให้ออกไปด้านนอก",
  phase: "เข้าสู่สถานะอมตะชั่วคราว",
};

const SKILL_ICONS = {
  pulse: "assets/skills/pulse.svg",
  dash: "assets/skills/dash.svg",
  shield: "assets/skills/shield.svg",
  slow: "assets/skills/slow.svg",
  nova: "assets/skills/nova.svg",
  timestop: "assets/skills/timestop.png",
  heal: "assets/skills/heal.png",
  repulse: "assets/skills/repulse.png",
  phase: "assets/skills/phase.png",
};

const SKILL_ORDER = [
  "pulse",
  "dash",
  "shield",
  "slow",
  "nova",
  "timestop",
  "heal",
  "repulse",
  "phase",
];

/**
 * UI owns every DOM read/write for menus and the in-game HUD. All elements
 * are looked up once in `cacheElements()` and reused, rather than calling
 * `document.getElementById` every frame in `update()`.
 *
 * To add a new HUD readout: add its element to `cacheElements()`, then set
 * it in `update()` (or a dedicated setter method, following the existing
 * `setWave` / `setBossVisible` pattern).
 */
export class UI {
  constructor() {
    this.cacheElements();

    this.onStart = null;
    this.onMenu = null;
    this.currentMode = "solo";
    this.currentSkill = "pulse";
    this.currentSkillP2 = "dash";

    this.buildSkillCards();
    this.bindMenu();
    this.applyMobileModeLock();
    window.addEventListener("resize", () => this.applyMobileModeLock(), { passive: true });
    this.showModeScreen();
  }

  cacheElements() {
    this.overlay = document.getElementById("overlay");
    this.hud = document.getElementById("hud");
    this.pause = document.getElementById("pauseOverlay");
    this.bannerEl = document.getElementById("waveBanner");
    this.modeScreen = document.getElementById("modeScreen");
    this.howToPlayScreen = document.getElementById("howToPlayScreen");
    this.skillScreen = document.getElementById("skillScreen");
    this.p2SkillPicker = document.getElementById("p2SkillPicker");
    this.selectedLoadout = document.getElementById("selectedLoadout");
    this.controlHint = document.getElementById("controlHint");
    this.skillScreenSub = document.getElementById("skillScreenSub");
    this.resultScreen = document.getElementById("resultScreen");

    this.el = {
      best: document.getElementById("best"),
      bestWave: document.getElementById("bestWave"),
      bestScore: document.getElementById("bestScore"),
      wave: document.getElementById("wave"),
      bossWrap: document.getElementById("bossWrap"),
      bossBarFill: document.getElementById("bossBarFill"),
      waveTitle: document.getElementById("waveTitle"),
      waveSubtitle: document.getElementById("waveSubtitle"),
      time: document.getElementById("time"),
      graze: document.getElementById("graze"),
      score: document.getElementById("score"),
      scoreLabel: document.getElementById("scoreLabel"),
      p1Score: document.getElementById("p1Score"),
      p2Score: document.getElementById("p2Score"),
      lives: document.getElementById("lives"),
      p2Hud: document.getElementById("p2Hud"),
      p2ScoreChip: document.getElementById("p2ScoreChip"),
      p2SkillChip: document.getElementById("p2SkillChip"),
      p2Lives: document.getElementById("p2Lives"),
      downBanner: document.getElementById("downBanner"),
      comboChip: document.getElementById("comboChip"),
      comboVal: document.getElementById("comboVal"),
    };
  }

  // --- Menu setup -------------------------------------------------

  buildSkillCards() {
    document.querySelectorAll("[data-skill-player]").forEach((grid) => {
      const player = grid.dataset.skillPlayer;
      grid.innerHTML = SKILL_ORDER.map(
        (skill) => `
        <button type="button" class="skill-card-option${(player === "1" ? skill === this.currentSkill : skill === this.currentSkillP2) ? " selected" : ""}" data-skill="${skill}" data-player="${player}">
          <span class="skill-card-icon"><img src="${SKILL_ICONS[skill]}" alt="" aria-hidden="true" loading="lazy"></span>
          <span class="skill-card-name">${SKILL_NAMES[skill]}</span>
          <span class="skill-card-desc">${SKILL_DESCRIPTIONS[skill]}</span>
        </button>
      `,
      ).join("");
      grid
        .querySelectorAll("[data-skill]")
        .forEach((card) =>
          card.addEventListener("click", () =>
            this.chooseSkill(card.dataset.player, card.dataset.skill),
          ),
        );
    });
  }

  bindMenu() {
    document.querySelectorAll("[data-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.disabled) return;
        this.currentMode = button.dataset.mode;
        this.showSkillScreen();
      });
    });
    document
      .getElementById("howToPlayBtn")
      ?.addEventListener("click", () => this.showHowToPlayScreen());
    document
      .getElementById("backHowToPlayBtn")
      ?.addEventListener("click", () => this.showModeScreen());

    document.querySelectorAll(".howto-platform").forEach((button) => {
      button.addEventListener("click", () => {
        const platform = button.dataset.platform;
        document.querySelectorAll(".howto-platform").forEach((b) =>
          b.classList.toggle("active", b === button)
        );
        document.querySelectorAll("[data-platform-panel]").forEach((panel) =>
          panel.classList.toggle("active", panel.dataset.platformPanel === platform)
        );
      });
    });

    document.querySelectorAll("[data-howto-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        const mode = button.dataset.howtoMode;
        const panel = button.closest("[data-platform-panel]");
        if (!panel) return;
        panel.querySelectorAll("[data-howto-mode]").forEach((b) =>
          b.classList.toggle("active", b === button)
        );
        panel.querySelectorAll("[data-howto-content]").forEach((content) =>
          content.classList.toggle("active", content.dataset.howtoContent === `pc-${mode}`)
        );
      });
    });

    document
      .getElementById("backModeBtn")
      ?.addEventListener("click", () => this.showModeScreen());
    document
      .getElementById("startBtn")
      ?.addEventListener("click", () =>
        this.onStart?.(
          this.currentMode,
          this.currentSkill,
          this.currentSkillP2,
        ),
      );

    // Pause-screen actions: restart instantly with the current loadout, or back out to the menu.
    document
      .getElementById("pauseRestartBtn")
      ?.addEventListener("click", () =>
        this.onStart?.(
          this.currentMode,
          this.currentSkill,
          this.currentSkillP2,
        ),
      );
    document
      .getElementById("pauseMenuBtn")
      ?.addEventListener("click", () => this.onMenu?.());
  }

  applyMobileModeLock() {
    const mobile =
      window.matchMedia("(max-width: 700px)").matches ||
      window.matchMedia("(pointer: coarse)").matches;

    const coopButton = document.querySelector('[data-mode="coop"]');
    if (!coopButton) return;

    coopButton.disabled = mobile;
    coopButton.classList.toggle("mobile-disabled", mobile);

    const small = coopButton.querySelector("small");
    if (small) small.textContent = mobile ? "มือถือไม่รองรับ" : "CO-OP";
  }

  chooseSkill(player, skill) {
    if (player === "2") this.currentSkillP2 = skill;
    else this.currentSkill = skill;
    document
      .querySelectorAll(`[data-skill-player="${player}"] [data-skill]`)
      .forEach((card) =>
        card.classList.toggle("selected", card.dataset.skill === skill),
      );
    this.updateLoadout();
  }

  showModeScreen() {
    this.modeScreen?.classList.remove("hidden");
    this.howToPlayScreen?.classList.add("hidden");
    this.skillScreen?.classList.add("hidden");
    this.resultScreen?.classList.add("hidden");
  }

  showHowToPlayScreen() {
    this.modeScreen?.classList.add("hidden");
    this.howToPlayScreen?.classList.remove("hidden");
    this.skillScreen?.classList.add("hidden");
    this.resultScreen?.classList.add("hidden");
  }

  showSkillScreen() {
    this.modeScreen?.classList.add("hidden");
    this.howToPlayScreen?.classList.add("hidden");
    this.skillScreen?.classList.remove("hidden");
    this.resultScreen?.classList.add("hidden");

    const coop = this.currentMode === "coop";
    this.p2SkillPicker?.classList.toggle("hidden", !coop);
    if (this.skillScreenSub) {
      this.skillScreenSub.textContent = coop
        ? "เลือกสกิลให้ผู้เล่นแต่ละคน"
        : "เลือกสกิลที่ต้องการก่อนเริ่มเกม";
    }
    if (this.controlHint) {
      this.controlHint.textContent = coop
        ? "P1: เมาส์ · P2: WASD / ลูกศร + / · Space: หยุดเกม"
        : "P1: เมาส์ · Space: หยุดเกม";
    }
    this.updateLoadout();
  }

  updateLoadout() {
    if (!this.selectedLoadout) return;
    this.selectedLoadout.innerHTML =
      this.currentMode === "coop"
        ? `<span>P1 <b>${SKILL_NAMES[this.currentSkill]}</b></span><i>•</i><span>P2 <b>${SKILL_NAMES[this.currentSkillP2]}</b></span>`
        : `<span>สกิลที่เลือก <b>${SKILL_NAMES[this.currentSkill]}</b></span>`;
  }

  setStartHandler(fn) {
    this.onStart = fn;
  }

  /** Called when the player asks to leave a match and return to the menu (from Pause or the results screen). */
  setMenuHandler(fn) {
    this.onMenu = fn;
  }

  // --- Overlays -------------------------------------------------

  hideOverlay() {
    this.overlay.classList.add("hidden");
    this.pause?.classList.add("hidden");
    this.hud?.classList.remove("hidden");
  }

  /** Hides the HUD/pause overlay and shows the mode-select menu screen. */
  returnToMenu() {
    this.pause?.classList.add("hidden");
    this.hud?.classList.add("hidden");
    this.overlay.classList.remove("hidden");
    this.showModeScreen();
  }

  /**
   * Shows `html` inside the dedicated result-screen panel (used for the
   * game-over screen). Unlike the old approach, this does NOT overwrite
   * #overlay's innerHTML, so the mode/skill menu screens stay intact and
   * `returnToMenu()` can bring them back afterward.
   */
  showResultScreen(html) {
    this.modeScreen?.classList.add("hidden");
    this.skillScreen?.classList.add("hidden");
    if (this.resultScreen) {
      this.resultScreen.innerHTML = html;
      this.resultScreen.classList.remove("hidden");
    }
    this.overlay.classList.remove("hidden");
    this.resultScreen
      ?.querySelector("#startBtn")
      ?.addEventListener("click", () =>
        this.onStart?.(
          this.currentMode,
          this.currentSkill,
          this.currentSkillP2,
        ),
      );
    this.resultScreen
      ?.querySelector("#menuBtn")
      ?.addEventListener("click", () => this.onMenu?.());
  }

  showGameOver(
    time,
    wave,
    graze,
    mode,
    players = [],
    finalScore = 0,
    bestScore = 0,
    bestTime = 0,
    bestWave = 0,
    bestGraze = 0,
  ) {
    this.currentMode = mode;
    const p1 = Math.round(players[0]?.score || 0);
    const p2 = Math.round(players[1]?.score || 0);

    const scoreRows =
      mode === "coop"
        ? `<div class="score-results"><div><span>P1</span><b>${p1.toLocaleString()}</b></div><div><span>P2</span><b>${p2.toLocaleString()}</b></div></div>
           <div class="team-result"><span>TEAM SCORE</span><b>${Math.round(finalScore).toLocaleString()}</b></div>
           <div class="winner-line">${p1 === p2 ? "เสมอกัน" : p1 > p2 ? "P1 ทำคะแนนสูงสุด" : "P2 ทำคะแนนสูงสุด"}</div>`
        : "";

    this.showResultScreen(`
      <div class="panel">
        <div class="logo">RUN COMPLETE</div>
        <h1>จบเกม!</h1>
        <p class="tagline">${mode === "coop" ? "Co-op · แข่งคะแนนกันในทีมเดียว" : "Solo Run"}</p>

        <div class="run-comparison">
          <div class="run-comparison-header">
            <div></div>
            <div class="run-latest">รอบล่าสุด</div>
            <div class="run-best">รอบที่ดีที่สุด</div>
          </div>
          <div class="run-comparison-row">
            <div class="run-label">เวลา :</div>
            <div class="run-value run-latest">${time.toFixed(1)}s</div>
            <div class="run-value run-best">${Number(bestTime).toFixed(1)}s</div>
          </div>
          <div class="run-comparison-row">
            <div class="run-label">Wave :</div>
            <div class="run-value run-latest">${wave}</div>
            <div class="run-value run-best">${Number(bestWave)}</div>
          </div>
          <div class="run-comparison-row">
            <div class="run-label">Score :</div>
            <div class="run-value run-latest">${Math.round(finalScore).toLocaleString()}</div>
            <div class="run-value run-best">${Number(bestScore).toLocaleString()}</div>
          </div>
          <div class="run-comparison-row">
            <div class="run-label">Graze :</div>
            <div class="run-value run-latest">${graze}</div>
            <div class="run-value run-best">${Number(bestGraze)}</div>
          </div>
        </div>

        ${scoreRows}
        <div class="result-actions">
          <button id="startBtn" class="start restart-btn" type="button"><span>↻</span> เล่นอีกครั้ง</button>
          <button id="menuBtn" class="menu-btn" type="button">กลับเมนู</button>
        </div>
      </div>
    `);
  }

  showPause(v) {
    this.pause.classList.toggle("hidden", !v);
  }

  // --- HUD setters -------------------------------------------------

  setBest(time, wave, score = 0) {
    if (this.el.best) this.el.best.textContent = Number(time).toFixed(1);
    if (this.el.bestWave) this.el.bestWave.textContent = wave;
    if (this.el.bestScore)
      this.el.bestScore.textContent = Math.round(score).toLocaleString();
  }

  setWave(n) {
    this.el.wave.textContent = n;
  }

  setBossVisible(v) {
    this.el.bossWrap.classList.toggle("hidden", !v);
  }

  setBossProgress(pct) {
    this.el.bossBarFill.style.width = `${pct}%`;
  }

  banner(n, subtitle, isBoss) {
    this.el.waveTitle.textContent = isBoss ? `BOSS WAVE ${n}` : `WAVE ${n}`;
    this.el.waveTitle.classList.toggle("boss-title", isBoss);
    this.el.waveSubtitle.textContent = subtitle;
    this.bannerEl.classList.add("wave-show");
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(
      () => this.bannerEl.classList.remove("wave-show"),
      1000,
    );
  }

  // --- Per-frame HUD update -------------------------------------------------

  update(s, players, mode) {
    this.el.hud?.classList.toggle("solo-mode", mode === "solo");
    this.el.hud?.classList.toggle("coop-mode", mode === "coop");
    this.updateTimer(s.elapsed);
    this.updateScores(s, players, mode);
    this.updateSkillChips(s, players);
    this.updateLivesAndDownState(players, mode);
    this.updateCombo(s);
  }

  updateTimer(elapsed) {
    const total = Math.max(0, elapsed);
    const minutes = Math.floor(total / 60);
    const seconds = Math.floor(total % 60);
    const tenths = Math.floor((total % 1) * 10);
    this.el.time.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
  }

  updateScores(s, players, mode) {
    if (this.el.graze) this.el.graze.textContent = s.grazeCount;
    if (this.el.scoreLabel)
      this.el.scoreLabel.textContent = mode === "coop" ? "TEAM SCORE" : "SCORE";
    if (this.el.score)
      this.el.score.textContent = Math.round(s.teamScore || 0).toLocaleString();
    if (this.el.p1Score)
      this.el.p1Score.textContent = Math.round(
        players[0].score || 0,
      ).toLocaleString();
    if (this.el.p2Score)
      this.el.p2Score.textContent = Math.round(
        players[1].score || 0,
      ).toLocaleString();
  }

  updateSkillChips(s, players) {
    const p1Skill = s.skill;
    this.updateSkillDisplay(
      players[0],
      SKILL_NAMES[p1Skill] || String(p1Skill).toUpperCase(),
      this.cooldownFor(p1Skill),
      "skillName",
      "skillStatus",
      "skillVal",
      "skillBarFill",
      "skillChip",
    );

    const p2Skill = s.skillP2;
    this.updateSkillDisplay(
      players[1],
      SKILL_NAMES[p2Skill] || String(p2Skill).toUpperCase(),
      this.cooldownFor(p2Skill),
      "p2SkillName",
      "p2SkillStatus",
      "p2SkillVal",
      "p2SkillBarFill",
      "p2SkillChip",
    );
  }

  updateLivesAndDownState(players, mode) {
    this.renderLives(this.el.lives, players[0]);

    this.el.p2Hud.classList.toggle("hidden", mode !== "coop");
    this.el.p2ScoreChip?.classList.toggle("hidden", mode !== "coop");
    this.el.p2SkillChip.classList.toggle("hidden", mode !== "coop");
    if (players[1].down) {
      this.el.p2Lives.textContent = players[1].reviveProgress > 0
        ? `REVIVE ${Math.round((players[1].reviveProgress / 2) * 100)}%`
        : "DOWN";
    } else {
      this.renderLives(this.el.p2Lives, players[1]);
    }

    if (!this.el.downBanner) return;
    const downPlayers =
      mode === "coop"
        ? players.filter((p) => p.down)
        : players[0].down
          ? [players[0]]
          : [];
    if (!downPlayers.length) {
      this.el.downBanner.classList.add("hidden");
      return;
    }
    const both = mode === "coop" && downPlayers.length === 2;
    this.el.downBanner.classList.remove("hidden");
    this.el.downBanner.classList.toggle("critical", both);
    this.el.downBanner.innerHTML = both
      ? "<b>ทั้งสองคน DOWN</b><small>ช่วยกันกลับเข้าสู่เกม</small>"
      : `<b>PLAYER ${downPlayers[0].id} DOWN</b><small>${mode === "coop" ? "เข้าไปใกล้เพื่อช่วยชุบ" : "รอเริ่มรอบใหม่"}</small>`;
  }

  renderLives(el, player) {
    if (!el || !player) return;
    const max = Math.max(1, CONFIG.lives.max);
    const lives = Math.max(0, Math.min(max, Number(player.lives) || 0));
    // Fixed slots prevent the mobile HUD from clipping/reflowing emoji hearts.
    el.innerHTML = Array.from({ length: max }, (_, i) =>
      `<span class="life-heart" aria-hidden="true">${i < lives ? "❤️" : "♡"}</span>`,
    ).join("");
    el.setAttribute("aria-label", `${lives} / ${max} lives`);
  }

  updateCombo(s) {
    // Combo HUD is optional; keep the game loop safe if the element is not
    // present in a mode/layout variant.
    if (!this.el.comboChip) return;

    if (s.combo >= 2) {
      this.el.comboChip.classList.remove("hidden");
      if (this.el.comboVal) {
        this.el.comboVal.textContent = `x${(1 + Math.min(s.combo, 10) * 0.12).toFixed(1)}`;
      }
    } else {
      this.el.comboChip.classList.add("hidden");
    }
  }

  cooldownFor(skill) {
    if (skill === "dash") return CONFIG.dash.cooldown;
    return CONFIG.skills[skill]?.cooldown ?? 5;
  }

  updateSkillDisplay(
    player,
    name,
    maxCd,
    nameId,
    statusId,
    valueId,
    barId,
    chipId,
  ) {
    const cd = Math.max(0, player.skillCooldown);
    const ready = cd <= 0;

    document.getElementById(nameId).textContent = name;
    document.getElementById(statusId).textContent = ready
      ? "READY"
      : "COOLDOWN";
    document.getElementById(valueId).textContent = ready
      ? "CLICK"
      : `${cd.toFixed(1)}s`;

    const fill = document.getElementById(barId);
    fill.style.width = `${ready ? 100 : Math.max(0, Math.min(100, (1 - cd / maxCd) * 100))}%`;

    document.getElementById(chipId).classList.toggle("ready", ready);
  }
}
