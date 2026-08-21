import { CONFIG } from "../core/config.js?v=20260821-xdqs";

const SKILL_NAMES = {
  pulse: "PULSE",
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
  shield: "assets/skills/shield.svg",
  slow: "assets/skills/slow.svg",
  nova: "assets/skills/nova.svg",
  timestop: "assets/skills/timestop.png",
  heal: "assets/skills/heal.png",
  repulse: "assets/skills/repulse.png",
  phase: "assets/skills/phase.png",
};

const RANK_PHRASES = {
  D: [
    "ผู้ถูกความมืดกลืนกินก่อนรุ่งอรุณ",
    "ผู้ซึ่งชื่อยังมิถูกจารึกไว้ในตำนาน",
    "ผู้พ่ายแพ้ต่อโชคชะตา",
    "ผู้ยืนอยู่เบื้องล่างของผู้ท้าทายชะตา",
    "ผู้ไร้นามในสมรภูมิแห่งความตาย",
  ],
  C: [
    "นี่คือก้าวแรกก่อนตำนานจะถือกำเนิด",
    "ผู้เริ่มทำให้ชะตากรรมสั่นคลอน",
    "คำพยากรณ์เริ่มคลาดเคลื่อนจากความจริง",
    "พลังที่ถูกผนึกเริ่มเรียกร้องอิสรภาพ",
    "กระสุนทุกนัดกำลังกลายเป็นบททดสอบ",
  ],
  B: [
    "ลิขิตแห่งความตายเริ่มถูกเขียนใหม่",
    "ขีดจำกัดของมนุษย์เริ่มเลือนหาย",
    "เสียงกระซิบแห่งตำนานเริ่มเอ่ยนามของเจ้า",
    "ระยะห่างระหว่างชีวิตกับความตายกำลังเพิ่มขึ้น",
    "บางสิ่งที่ไม่ควรตื่น กำลังลืมตาขึ้น",
  ],
  A: [
    "ก้าวข้ามขีดจำกัดของมนุษย์",
    "ความเร็วเพียงเสี้ยววินาทีตัดสินระหว่างรอดและตาย",
    "เจ้ากำลังเข้าใกล้ขอบเขตที่มิใช่ทุกคนจะไปถึง",
    "ฝีเท้านี้กำลังเข้าใกล้จุดที่มนุษย์ไม่ควรแตะต้อง",
    "ยืนอยู่บนจุดสูงสุดของผู้ฝึกฝน",
  ],
  S: [
    "ฝีเท้าของเจ้าเริ่มทิ้งเงาไว้เหนือผู้คน",
    "ชะตากรรมคือสิ่งที่เจ้าปฏิเสธจะยอมรับ",
    "ชะตากรรมมิอาจกำหนดจุดจบของเจ้า",
    "ทุกนัดที่พลาดคือหลักฐานแห่งความเหนือชั้น",
    "ห่ากระสุนกลายเป็นเพียงสายลมที่พัดผ่าน",
  ],
  SS: [
    "คำสั่งของสวรรค์มิอาจบังคับให้เจ้าคุกเข่า",
    "ลิขิตนับพันมิอาจกำหนดแม้เพียงก้าวเดียวของเจ้า",
    "ความตายมิใช่สิ่งที่เจ้าหลีกหนีอีกต่อไป แต่มันต่างหากที่หลีกหนีเจ้า",
    "ผู้ที่ยืนอยู่เหนือประตูแห่งความตาย",
    "ผู้ก้าวข้ามขอบเขตระหว่างชีวิตและความตาย",
  ],
  SSS: [
    "ผู้ที่ชะตากรรมมิอาจแม้แต่จะเอ่ยนาม",
    "ผู้ที่ไม่มีชื่ออยู่ในบัญชีของความตาย",
    "ผู้ซึ่งแม้กฎของโลกยังมิอาจอธิบาย",
    "ทุกกฎมีจุดสิ้นสุด และเจ้าคือผู้ก้าวข้ามมัน",
    "เมื่อไม่มีเส้นทางเหลืออยู่ เจ้าได้สร้างเส้นทางขึ้นมาเอง",
  ],
};

let lastRankPhrase = {};

function getScoreRank(score) {
  const value = Math.max(0, Number(score) || 0);
  const thresholds = CONFIG.rank?.thresholds || [];
  return thresholds.find((entry) => value >= entry.min)?.rank || "D";
}

function getRankPhrase(rank) {
  const pool = RANK_PHRASES[rank] || RANK_PHRASES.D;
  if (pool.length === 1) return pool[0];

  let index = Math.floor(Math.random() * pool.length);
  if (pool[index] === lastRankPhrase[rank]) {
    index =
      (index + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
  }
  lastRankPhrase[rank] = pool[index];
  return pool[index];
}

const SKILL_ORDER = [
  "pulse",
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
    this.onResume = null;
    this.onResetBest = null;
    // Tracks the best score as it stood *before* the most recent setBest()
    // call, so showGameOver() can tell whether this run just beat it.
    // (setBest() runs once on load with the saved value, then once per
    // game-over with the possibly-updated value — see setBest() below.)
    this.priorBestScore = 0;
    this.currentMode = "solo";
    this.currentSkill = "pulse";
    this.currentSkillP2 = "pulse";
    this.mouseSensitivity = Number(
      localStorage.getItem("waveDodgeMouseSensitivity") || 100,
    );
    this.mouseSensitivity = Math.max(25, Math.min(300, this.mouseSensitivity));

    this.buildSkillCards();
    this.bindMenu();
    this.applyMobileModeLock();
    window.addEventListener("resize", () => this.applyMobileModeLock(), {
      passive: true,
    });

    // Keep the boss HP bar pinned just below the WAVE/TIME/SCORE HUD row
    // instead of a fixed top offset. The HUD row's height changes across
    // breakpoints and whenever extra chips (BEST/GRAZE/COMBO) show or
    // hide, so a hardcoded top would drift out of sync and overlap again;
    // measuring it live keeps the two from ever colliding.
    this.positionBossWrap();
    window.addEventListener("resize", () => this.positionBossWrap(), {
      passive: true,
    });
    if (this.hudCenter && typeof ResizeObserver !== "undefined") {
      new ResizeObserver(() => this.positionBossWrap()).observe(
        this.hudCenter,
      );
    }

    this.showModeScreen();
  }

  cacheElements() {
    this.overlay = document.getElementById("overlay");
    this.hud = document.getElementById("hud");
    this.hudCenter = document.getElementById("hudCenter");
    this.gameRoot = document.getElementById("gameRoot");
    this.scorePopupLayer = document.getElementById("scorePopupLayer");
    this.pause = document.getElementById("pauseOverlay");
    this.bannerEl = document.getElementById("waveBanner");
    this.modeScreen = document.getElementById("modeScreen");
    this.howToPlayScreen = document.getElementById("howToPlayScreen");
    this.settingsScreen = document.getElementById("settingsScreen");
    this.mouseSensitivityInput = document.getElementById("mouseSensitivity");
    this.mouseSensitivityValueEl = document.getElementById(
      "mouseSensitivityValue",
    );
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
      bossLabel: document.getElementById("bossLabel"),
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
      noHitBanner: document.getElementById("noHitBanner"),
      noHitTitle: document.getElementById("noHitTitle"),
      noHitSubtitle: document.getElementById("noHitSubtitle"),
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
      .getElementById("settingsBtn")
      ?.addEventListener("click", () => this.showSettingsScreen());
    document
      .getElementById("backSettingsBtn")
      ?.addEventListener("click", () => this.showModeScreen());
    this.mouseSensitivityInput?.addEventListener("input", () => {
      this.mouseSensitivity = Number(this.mouseSensitivityInput.value);
      localStorage.setItem(
        "waveDodgeMouseSensitivity",
        String(this.mouseSensitivity),
      );
      this.updateMouseSensitivityDisplay();
      this.onMouseSensitivityChange?.(this.mouseSensitivity);
    });
    if (this.mouseSensitivityInput)
      this.mouseSensitivityInput.value = String(this.mouseSensitivity);
    this.updateMouseSensitivityDisplay();
    document
      .getElementById("backHowToPlayBtn")
      ?.addEventListener("click", () => this.showModeScreen());

    document.querySelectorAll(".howto-platform").forEach((button) => {
      button.addEventListener("click", () => {
        const platform = button.dataset.platform;
        document
          .querySelectorAll(".howto-platform")
          .forEach((b) => b.classList.toggle("active", b === button));
        document
          .querySelectorAll("[data-platform-panel]")
          .forEach((p) =>
            p.classList.toggle("active", p.dataset.platformPanel === platform),
          );
      });
    });

    document.querySelectorAll("[data-howto-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        const mode = button.dataset.howtoMode;
        const panel = button.closest("[data-platform-panel]");
        if (!panel) return;
        panel
          .querySelectorAll("[data-howto-mode]")
          .forEach((b) => b.classList.toggle("active", b === button));
        panel
          .querySelectorAll("[data-howto-content]")
          .forEach((c) =>
            c.classList.toggle(
              "active",
              c.dataset.howtoContent === `pc-${mode}`,
            ),
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

    // Pause-screen actions: resume the current run, restart instantly with the
    // current loadout, or back out to the menu. Resume is the primary action
    // (matches pressing Space) and is kept visually separated from the other
    // two so players who meant to resume don't accidentally restart/quit.
    document
      .getElementById("pauseResumeBtn")
      ?.addEventListener("click", () => this.onResume?.());
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

  showSettingsScreen() {
    this.modeScreen?.classList.add("hidden");
    this.howToPlayScreen?.classList.add("hidden");
    this.settingsScreen?.classList.remove("hidden");
    this.skillScreen?.classList.add("hidden");
    this.resultScreen?.classList.add("hidden");
    this.updateMouseSensitivityDisplay();
  }

  updateMouseSensitivityDisplay() {
    if (!this.mouseSensitivityValueEl) return;
    this.mouseSensitivityValueEl.textContent = `${this.mouseSensitivity}%`;
  }

  setMouseSensitivityHandler(fn) {
    this.onMouseSensitivityChange = fn;
    fn?.(this.mouseSensitivity);
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
    this.settingsScreen?.classList.add("hidden");
    this.skillScreen?.classList.add("hidden");
    this.resultScreen?.classList.add("hidden");
  }

  showHowToPlayScreen() {
    this.modeScreen?.classList.add("hidden");
    this.settingsScreen?.classList.add("hidden");
    this.howToPlayScreen?.classList.remove("hidden");
    this.skillScreen?.classList.add("hidden");
    this.resultScreen?.classList.add("hidden");
  }

  showSkillScreen() {
    this.modeScreen?.classList.add("hidden");
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

  /** Called when the player clicks "เล่นต่อ" (Resume) on the Pause screen. */
  setResumeHandler(fn) {
    this.onResume = fn;
  }

  setResetBestHandler(fn) {
    this.onResetBest = fn;
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
    this.pause?.classList.add("hidden");
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

    const rank = getScoreRank(finalScore);
    const rankPhrase = getRankPhrase(rank);

    // A "New Best!" only counts if this run's score actually beat the
    // score that was on record before this run (see setBest() above) —
    // matches the strict `finalScore > this.bestScore` check in
    // game.js's gameOver(), just evaluated from data already in the UI.
    const isNewBestScore =
      Math.round(finalScore) > 0 &&
      Math.round(finalScore) > this.priorBestScore;

    const newBestBadge = isNewBestScore
      ? `<style>
           .new-best-badge{display:inline-flex;align-items:center;gap:6px;margin:0 0 14px;padding:6px 14px;border-radius:999px;background:rgba(255,217,61,.12);border:1px solid rgba(255,217,61,.4);color:var(--gold);font-size:12px;font-weight:900;letter-spacing:.5px;animation:new-best-pop .45s cubic-bezier(.2,.8,.2,1) both}
           @keyframes new-best-pop{0%{transform:scale(.7);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}
         </style>
         <div class="new-best-badge">🏆 New Best!</div>`
      : "";

    this.showResultScreen(`
      <div class="panel">
        <div class="logo">RUN COMPLETE</div>
        <h1>จบเกม!</h1>
        <p class="tagline">${mode === "coop" ? "Co-op · แข่งคะแนนกันในทีมเดียว" : "Solo Run"}</p>

        <div class="rank-result rank-${rank.toLowerCase()}">
          <div class="rank-kicker">RANK</div>
          <div class="rank-letter">${rank}</div>
          <div class="rank-phrase">${rankPhrase}</div>
        </div>

        ${newBestBadge}
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
        <div class="reset-best-area">
          <div class="reset-best-divider"></div>
          <button id="resetBestBtn" class="reset-best-btn" type="button">Reset Best</button>
        </div>
      </div>
    `);

    this.resultScreen
      ?.querySelector("#resetBestBtn")
      ?.addEventListener("click", () => this.onResetBest?.());
  }

  showPause(v) {
    this.pause.classList.toggle("hidden", !v);
  }

  // --- HUD setters -------------------------------------------------

  setBest(time, wave, score = 0) {
    // Remember what the best score was *before* this update, so a later
    // showGameOver() call can detect "New Best!" without touching game.js.
    this.priorBestScore = this.lastBestScore ?? 0;
    this.lastBestScore = Math.round(score) || 0;

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
    if (v) this.positionBossWrap();
  }

  setBossName(name) {
    if (this.el.bossLabel && name) this.el.bossLabel.textContent = name;
  }

  /**
   * Pins #bossWrap directly under the center HUD row (WAVE/TIME/SCORE),
   * measured live, so it can never overlap it — see the ResizeObserver
   * set up in the constructor for when this gets re-run automatically.
   */
  positionBossWrap() {
    if (!this.el.bossWrap || !this.hudCenter || !this.gameRoot) return;
    const gap = 10; // px breathing room between the HUD row and the boss bar
    const hudBottom = this.hudCenter.getBoundingClientRect().bottom;
    const rootTop = this.gameRoot.getBoundingClientRect().top;
    this.el.bossWrap.style.top = `${hudBottom - rootTop + gap}px`;
  }

  setBossProgress(pct) {
    this.el.bossBarFill.style.width = `${pct}%`;
  }

  banner(n, subtitle, isBoss) {
    this.el.waveTitle.textContent = isBoss ? `BOSS WAVE ${n}` : `WAVE ${n}`;
    this.el.waveTitle.classList.toggle("boss-title", isBoss);
    this.el.waveSubtitle.textContent = subtitle;
    const displayMs = CONFIG.wave.bannerDisplayMs;
    clearTimeout(this.bannerTimer);
    this.bannerEl.classList.remove("wave-show");
    // Keep the CSS fade animation's duration in sync with the on-screen time.
    this.bannerEl.style.setProperty("--wave-banner-ms", `${displayMs}ms`);
    // Force a fresh animation frame so every wave gets exactly one fade.
    void this.bannerEl.offsetWidth;
    requestAnimationFrame(() => this.bannerEl.classList.add("wave-show"));
    this.bannerTimer = setTimeout(
      () => this.bannerEl.classList.remove("wave-show"),
      displayMs,
    );
  }

  /**
   * Shows the big "No Hit" wave-clear bonus banner — same size/position/fade
   * as banner()'s #waveBanner, just a separate element so game.js can time
   * the two to appear one after another (No Hit first, then WAVE X) instead
   * of overlapping. `labels` is empty in solo ("NO HIT"), or a list like
   * ["P1"] / ["P1","P2"] in coop when one or both players independently
   * cleared the wave without taking a hit.
   */
  showNoHitBanner(labels, bonus) {
    if (!this.el.noHitBanner || !this.el.noHitTitle) return;

    this.el.noHitTitle.textContent = labels.length
      ? `${labels.join(" & ")} NO HIT`
      : "NO HIT";
    if (this.el.noHitSubtitle)
      this.el.noHitSubtitle.textContent = `+${Math.round(bonus).toLocaleString()} SCORE`;

    const displayMs = CONFIG.noHit.displayMs;
    clearTimeout(this.noHitBannerTimer);
    this.el.noHitBanner.classList.remove("hidden");
    this.el.noHitBanner.classList.remove("no-hit-show");
    this.el.noHitBanner.style.setProperty("--no-hit-ms", `${displayMs}ms`);
    // Force a fresh animation frame so back-to-back No Hit waves each replay
    // the fade instead of the browser coalescing the class toggle away.
    void this.el.noHitBanner.offsetWidth;
    requestAnimationFrame(() =>
      this.el.noHitBanner.classList.add("no-hit-show"),
    );
    this.noHitBannerTimer = setTimeout(() => {
      this.el.noHitBanner.classList.remove("no-hit-show");
      this.el.noHitBanner.classList.add("hidden");
    }, displayMs);
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

  showScorePopup(amount) {
    if (!this.scorePopupLayer) return;

    const popup = document.createElement("span");
    popup.className = "score-popup";
    popup.textContent = `+${Math.round(amount)}`;

    // Match the live SCORE typography exactly (family, size, weight, spacing).
    if (this.el?.score) {
      const scoreStyle = getComputedStyle(this.el.score);
      popup.style.fontFamily = scoreStyle.fontFamily;
      popup.style.fontSize = scoreStyle.fontSize;
      popup.style.fontWeight = scoreStyle.fontWeight;
      popup.style.lineHeight = scoreStyle.lineHeight;
      popup.style.letterSpacing = scoreStyle.letterSpacing;
      popup.style.fontVariantNumeric = scoreStyle.fontVariantNumeric;
    }

    this.scorePopupLayer.appendChild(popup);
    popup.addEventListener("animationend", () => popup.remove(), {
      once: true,
    });
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
      this.el.p2Lives.textContent =
        players[1].reviveProgress > 0
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
    el.innerHTML = Array.from(
      { length: max },
      (_, i) =>
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
