import { CONFIG } from "../core/config.js?v=20260824-3pa8";
import { RARITY_CONFIG, RARITY_ORDER, SKINS, SKINS_BY_RARITY } from "../data/skins.js?v=20260824-3pa8";

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

// Rank reveal build-up: lowest to highest, used to drive the slot-style
// cycle in animateRankReveal() below (D always starts the cycle, landing
// stops at the run's actual rank).
const RANK_ORDER = ["D", "C", "B", "A", "S", "SS", "SSS"];

// Per-tier landing intensity: shake (px), particle burst count/color, and
// pop-scale amplitude. Low ranks stay quiet on purpose — the escalation
// itself is what sells the high ranks as special.
const RANK_FX = {
  D: { shake: 0, particles: 0, pop: 1.03, colors: [] },
  C: { shake: 1, particles: 4, pop: 1.05, colors: ["#a7ac86"] },
  B: { shake: 2, particles: 6, pop: 1.07, colors: ["#7fd8c8", "var(--accent)"] },
  A: { shake: 3, particles: 9, pop: 1.1, colors: ["var(--accent)", "#7fd8c8"] },
  S: { shake: 5, particles: 13, pop: 1.16, colors: ["var(--gold)", "#fff6cf"] },
  SS: { shake: 7, particles: 18, pop: 1.22, colors: ["var(--gold)", "#fff6cf", "#ffb347"] },
  SSS: { shake: 10, particles: 26, pop: 1.32, colors: ["var(--gold)", "#fff6cf", "#ffb347", "#ff5cc0"] },
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Small mechanic reminders shown on the Game Over screen — for details
// like the "NO HIT" wave-clear bonus that only exist as a small in-run
// banner and are easy to miss, or a #howto-tip a player never opened.
// One is picked at random per run (never the same one twice in a row —
// see lastTipIndex/getRunTip below, same no-immediate-repeat pattern as
// getRankPhrase()). Solo-only tips are filtered out in coop.
const RUN_TIPS = [
  { text: `จบเวฟโดยไม่โดนดาเมจเลยสักครั้ง จะได้คะแนนโบนัส เพิ่มคะแนน (มากขึ้นเรื่อย ๆ ตามเวฟ)`, modes: ["solo", "coop"] },
  { text: `เฉียดกระสุนแบบไม่โดน จะได้ <strong>Graze</strong> เพิ่มคะแนน แถมลดคูลดาวน์สกิลด้วย`, modes: ["solo", "coop"] },
  { text: `ไอเทม <strong>Mystery Box</strong> มีโอกาส 50/50 ทั้งด้านดีและด้านเสี่ยง เก็บแล้วลุ้นได้เลย`, modes: ["solo", "coop"] },
  { text: `เพื่อนร่วมทีมล้ม (DOWN) ให้เข้าไปใกล้ ๆ เพื่อช่วยปลุกให้ฟื้นกลับมาเล่นต่อได้`, modes: ["coop"] },
  { text: `Graze คือ การเฉียดกระสุน`, modes: ["solo", "coop"] },
  { text: `การอยู่ใกล้กระสุนไม่อันตรายเสมอไป แต่การไม่มีทางหนีต่างหากที่อันตราย`, modes: ["solo", "coop"] },


];
let lastTipIndex = -1;
function getRunTip(mode) {
  const pool = RUN_TIPS.filter((t) => t.modes.includes(mode));
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0];
  let index = Math.floor(Math.random() * pool.length);
  if (pool[index] === RUN_TIPS[lastTipIndex]) {
    index = (index + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
  }
  lastTipIndex = RUN_TIPS.indexOf(pool[index]);
  return pool[index];
}

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
    this.skinSystem = null;
    this.skinCaseBusy = false;
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

    this.fitOverlayScreens();
    window.addEventListener("resize", () => this.fitOverlayScreens(), {
      passive: true,
    });

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
    this.skinScreen = document.getElementById("skinScreen");
    this.skinCollectionScreen = document.getElementById("skinCollectionScreen");
    this.skinGrid = document.getElementById("skinGrid");
    this.skinCaseCount = document.getElementById("skinCaseCount");
    this.skinScrapCount = document.getElementById("skinScrapCount");
    this.openSkinCaseBtn = document.getElementById("openSkinCaseBtn");
    this.skinCaseRoll = document.getElementById("skinCaseRoll");
    this.skinCaseResult = document.getElementById("skinCaseResult");
    this.exchangeRarePlusBtn = document.getElementById("exchangeRarePlusBtn");
    this.chooseRareExchange = document.getElementById("chooseRareExchange");
    this.skinInfoBtn = document.getElementById("skinInfoBtn");
    this.skinInfoOverlay = document.getElementById("skinInfoOverlay");
    this.skinInfoCloseBtn = document.getElementById("skinInfoCloseBtn");

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
      .getElementById("skinsBtn")
      ?.addEventListener("click", () => this.showSkinScreen());
    document
      .getElementById("backSkinBtn")
      ?.addEventListener("click", () => this.showModeScreen());
    document
      .getElementById("viewSkinCollectionBtn")
      ?.addEventListener("click", () => this.showSkinCollectionScreen());
    document
      .getElementById("backSkinCollectionBtn")
      ?.addEventListener("click", () => this.showSkinScreen());
    this.openSkinCaseBtn?.addEventListener("click", () => this.openSkinCase());
    this.exchangeRarePlusBtn?.addEventListener("click", () => this.exchangeRarePlus());
    this.skinInfoBtn?.addEventListener("click", () => this.showSkinInfo());
    this.skinInfoCloseBtn?.addEventListener("click", () => this.hideSkinInfo());
    this.skinInfoOverlay?.addEventListener("click", (e) => {
      if (e.target === this.skinInfoOverlay) this.hideSkinInfo();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !this.skinInfoOverlay?.classList.contains("hidden")) this.hideSkinInfo();
    });
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
    this.skinScreen?.classList.add("hidden");
    this.skinCollectionScreen?.classList.add("hidden");
    this.updateMouseSensitivityDisplay();
    this.fitOverlayScreens();
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
    this.skinScreen?.classList.add("hidden");
    this.skinCollectionScreen?.classList.add("hidden");
    this.fitOverlayScreens();
  }

  showHowToPlayScreen() {
    this.modeScreen?.classList.add("hidden");
    this.settingsScreen?.classList.add("hidden");
    this.howToPlayScreen?.classList.remove("hidden");
    this.skillScreen?.classList.add("hidden");
    this.resultScreen?.classList.add("hidden");
    this.skinScreen?.classList.add("hidden");
    this.skinCollectionScreen?.classList.add("hidden");
    this.fitOverlayScreens();
  }

  showSkillScreen() {
    this.modeScreen?.classList.add("hidden");
    this.skillScreen?.classList.remove("hidden");
    this.resultScreen?.classList.add("hidden");
    this.skinScreen?.classList.add("hidden");
    this.skinCollectionScreen?.classList.add("hidden");

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
    this.fitOverlayScreens();
  }

  updateLoadout() {
    if (!this.selectedLoadout) return;
    this.selectedLoadout.innerHTML =
      this.currentMode === "coop"
        ? `<span>P1 <b>${SKILL_NAMES[this.currentSkill]}</b></span><i>•</i><span>P2 <b>${SKILL_NAMES[this.currentSkillP2]}</b></span>`
        : `<span>สกิลที่เลือก <b>${SKILL_NAMES[this.currentSkill]}</b></span>`;
  }

  setSkinSystem(system) {
    this.skinSystem = system;
    this.renderSkinScreen();
  }

  showSkinScreen() {
    this.modeScreen?.classList.add("hidden");
    this.howToPlayScreen?.classList.add("hidden");
    this.settingsScreen?.classList.add("hidden");
    this.skillScreen?.classList.add("hidden");
    this.resultScreen?.classList.add("hidden");
    this.skinCollectionScreen?.classList.add("hidden");
    this.skinScreen?.classList.remove("hidden");
    this.renderSkinScreen();
    this.fitOverlayScreens();
  }

  showSkinCollectionScreen() {
    this.modeScreen?.classList.add("hidden");
    this.howToPlayScreen?.classList.add("hidden");
    this.settingsScreen?.classList.add("hidden");
    this.skillScreen?.classList.add("hidden");
    this.resultScreen?.classList.add("hidden");
    this.skinScreen?.classList.add("hidden");
    this.skinCollectionScreen?.classList.remove("hidden");
    this.renderSkinScreen();
    this.fitOverlayScreens();
  }

  renderSkinScreen() {
    if (!this.skinSystem || !this.skinGrid) return;
    const data = this.skinSystem.snapshot();
    if (this.skinCaseCount) this.skinCaseCount.textContent = data.cases;
    if (this.skinScrapCount) this.skinScrapCount.textContent = data.scrap;
    if (this.exchangeRarePlusBtn) this.exchangeRarePlusBtn.disabled = data.scrap < 100;
    if (this.chooseRareExchange) {
      const rares = SKINS.filter((s) => s.rarity === "Rare" && !data.ownedSkins.includes(s.id));
      const canAffordRare = data.scrap >= 500;
      this.chooseRareExchange.innerHTML = rares.length
        ? rares.map((s) => `<button type="button" class="rarity-rare" data-exchange-rare="${s.id}" ${canAffordRare ? "" : "disabled"}>${s.name}</button>`).join("")
        : `<span class="exchange-empty">เก็บสกิน Rare ครบทุกใบแล้ว</span>`;
      this.chooseRareExchange.querySelectorAll("[data-exchange-rare]").forEach((button) => button.addEventListener("click", () => this.exchangeChooseRare(button.dataset.exchangeRare)));
    }
    const equipped = data.equippedSkin;
    const cards = SKINS.map((s) => {
      const owned = data.ownedSkins.includes(s.id);
      const isEquipped = equipped === s.id;
      return `<button type="button" class="skin-card ${owned ? "owned" : "locked"} ${isEquipped ? "equipped" : ""}" data-skin-id="${s.id}" ${owned ? "" : "disabled"}>
        <span class="skin-preview rarity-${s.rarity.toLowerCase()}" style="--skin:${s.color};--skin2:${s.secondaryColor}"><i class="skin-shape skin-shape-${s.shape}"></i></span>
        <span class="skin-card-rarity rarity-${s.rarity.toLowerCase()}">${s.rarity}</span>
        <strong>${owned ? s.name : "???"}</strong>
        <small>${isEquipped ? "EQUIPPED" : owned ? "EQUIP" : "LOCKED"}</small>
      </button>`;
    }).join("");
    this.skinGrid.innerHTML = `<button type="button" class="skin-card owned ${equipped === "default" ? "equipped" : ""}" data-skin-id="default">
      <span class="skin-preview default-preview"><i class="skin-shape skin-shape-circle"></i></span><span class="skin-card-rarity">DEFAULT</span><strong>Default</strong><small>${equipped === "default" ? "EQUIPPED" : "EQUIP"}</small>
    </button>${cards}`;
    this.skinGrid.querySelectorAll("[data-skin-id]").forEach((button) => button.addEventListener("click", () => {
      if (this.skinSystem.equip(button.dataset.skinId)) this.renderSkinScreen();
    }));
  }

  openSkinCase() {
    if (!this.skinSystem || this.skinCaseBusy || this.skinSystem.data.cases <= 0) return;
    const caseResult = this.skinSystem.consumeCase();
    if (!caseResult.ok) return;
    this.skinCaseBusy = true;
    if (this.openSkinCaseBtn) this.openSkinCaseBtn.disabled = true;
    if (this.skinCaseResult) this.skinCaseResult.classList.add("hidden");
    this.runCaseReel(caseResult.rarity);
  }

  /**
   * CS:GO-style case-opening reel: fills #skinCaseRoll with a short strip of
   * skin items. We randomly populate the reel matching natural rarity weights,
   * pick a PLANNED_INDEX near the end, and inject an item of the rolled rarity there.
   * Then we drive the strip's position itself via requestAnimationFrame.
   * 
   * CRITICAL: The item at PLANNED_INDEX is just a visual target. The ACTUAL result
   * is strictly determined by whatever element physically sits under the pointer
   * when the animation ends.
   */
  runCaseReel(targetRarity) {
    const roll = this.skinCaseRoll;
    if (!roll) { 
      // Fallback if no UI: award a random skin of the target rarity directly
      const pool = SKINS_BY_RARITY[targetRarity];
      const fallbackItem = pool[Math.floor(Math.random() * pool.length)] || pool[0];
      const result = this.skinSystem.awardSkin(fallbackItem.id);
      this.finishCaseReel(result);
      return; 
    }
    if (this._caseReelRaf) cancelAnimationFrame(this._caseReelRaf);

    const REEL_LENGTH = 70;
    const SPIN_MS = 9000;
    const items = [];
    
    // 1. Generate the entire reel using the natural weighted random
    for (let i = 0; i < REEL_LENGTH; i += 1) {
      const r = this.skinSystem.rollRarity();
      const rp = SKINS_BY_RARITY[r];
      items.push(rp[Math.floor(Math.random() * rp.length)] || rp[0]);
    }

    // 2. Select a stop zone near the end of the reel
    const stopZoneStart = 55;
    const stopZoneEnd = 65;
    const candidateIndices = [];
    
    for (let i = stopZoneStart; i <= stopZoneEnd; i++) {
      if (items[i].rarity === targetRarity) {
        candidateIndices.push(i);
      }
    }

    // 3. Ensure the target rarity exists in the stop zone
    if (candidateIndices.length === 0) {
      const forcedIndex = stopZoneStart + Math.floor(Math.random() * (stopZoneEnd - stopZoneStart + 1));
      const targetRarityPool = SKINS_BY_RARITY[targetRarity];
      items[forcedIndex] = targetRarityPool[Math.floor(Math.random() * targetRarityPool.length)] || targetRarityPool[0];
      candidateIndices.push(forcedIndex);
    }

    // 4. Pick our visual target index from the candidates
    const PLANNED_INDEX = candidateIndices[Math.floor(Math.random() * candidateIndices.length)];

    roll.classList.remove("hidden");
    roll.innerHTML = `<div class="skin-reel-track">${items.map((s) => `
      <span class="skin-reel-item rarity-${s.rarity.toLowerCase()}" data-skin-id="${s.id}" style="--skin:${s.color};--skin2:${s.secondaryColor}">
        <i class="skin-shape skin-shape-${s.shape}"></i>
      </span>`).join("")}</div>`;

    const track = roll.querySelector(".skin-reel-track");
    
    // Calculate actual pixel positions based on layout
    const rollRect = roll.getBoundingClientRect();
    const trackRect = track.getBoundingClientRect();
    const viewportCenter = roll.clientWidth / 2;
    const pointerScreenX = rollRect.left + viewportCenter;
    
    // Precalculate item centers relative to track for exact tick tracking
    const itemCenters = Array.from(track.children).map(el => {
      const rect = el.getBoundingClientRect();
      return (rect.left - trackRect.left) + (rect.width / 2);
    });

    const plannedCenter = itemCenters[PLANNED_INDEX];
    
    // Remove jitter temporarily for 100% deterministic pixel-perfect alignment
    const jitter = 0; 
    
    const startX = 0;
    const targetX = pointerScreenX - (trackRect.left + plannedCenter) - jitter;

    track.style.willChange = "transform";
    track.style.transform = "translate3d(0px, 0, 0)";

    // Quintic ease-out: fast for most of the spin, then a long smooth
    // crawl into the stop — the CS:GO/CS2 "will it land here?" feel.
    const easeOutQuint = (t) => 1 - (1 - t) ** 5;

    let lastTickIndex = -1;
    const startTime = performance.now();
    const frame = (now) => {
      const t = Math.min((now - startTime) / SPIN_MS, 1);
      const x = startX + (targetX - startX) * easeOutQuint(t);
      track.style.transform = `translate3d(${x}px, 0, 0)`;

      // Tick logic: find which item's center is closest to the pointer's local X in track coordinates
      const currentCenterTarget = viewportCenter - x - (trackRect.left - rollRect.left);
      
      let idx = lastTickIndex >= 0 ? lastTickIndex : 0;
      // Advance idx if the next item is closer to the center target
      while (idx < itemCenters.length - 1 && Math.abs(currentCenterTarget - itemCenters[idx + 1]) <= Math.abs(currentCenterTarget - itemCenters[idx])) {
        idx++;
      }

      if (idx !== lastTickIndex && idx >= 0 && idx < items.length) {
        lastTickIndex = idx;
        const el = track.children[idx];
        el.classList.add("tick");
        setTimeout(() => el.classList.remove("tick"), 140);
      }

      if (t < 1) {
        this._caseReelRaf = requestAnimationFrame(frame);
      } else {
        // Snap to the exact target so the winner lands pixel-perfect under
        // the pointer regardless of any rAF timing drift.
        track.style.transform = `translate3d(${targetX}px, 0, 0)`;
        track.style.willChange = "auto";
        this._caseReelRaf = null;

        // VERIFY: The Source of Truth is the DOM element under the pointer
        // Get the final layout after the target transform
        const finalRollRect = roll.getBoundingClientRect();
        const finalPointerX = finalRollRect.left + finalRollRect.width / 2;
        
        let pointedElement = null;
        let minDiff = Infinity;
        let pointedIndex = -1;
        for (let i = 0; i < track.children.length; i++) {
            const el = track.children[i];
            const rect = el.getBoundingClientRect();
            const center = rect.left + rect.width / 2;
            const diff = Math.abs(center - finalPointerX);
            if (diff < minDiff) {
                minDiff = diff;
                pointedElement = el;
                pointedIndex = i;
            }
        }
        
        if (pointedElement) {
          pointedElement.classList.add("winner");
        }

        // Award the item strictly based on the element the pointer landed on
        const skinId = pointedElement ? pointedElement.dataset.skinId : null;
        if (!skinId) {
            console.error("[Case Reel] Failed to find skin element under pointer!");
            this.finishCaseReel(null);
            return;
        }

        const finalResult = this.skinSystem.awardSkin(skinId);

        // Requested log: targetIndex / pointedIndex / targetSkin / pointedSkin
        const targetSkin = items[PLANNED_INDEX].id;
        const pointedSkin = finalResult.item.id;
        console.log(`[Case Reel Align Test] targetIndex: ${PLANNED_INDEX} / pointedIndex: ${pointedIndex} / targetSkin: ${targetSkin} / pointedSkin: ${pointedSkin}`);
        if (PLANNED_INDEX !== pointedIndex || targetSkin !== pointedSkin) {
            console.error(`[Case Reel Mismatch] Expected ${PLANNED_INDEX} (${targetSkin}) but got ${pointedIndex} (${pointedSkin})`);
        }

        setTimeout(() => this.finishCaseReel(finalResult), 400);
      }
    };
    this._caseReelRaf = requestAnimationFrame(frame);
  }

  /**
   * Same .skin-preview icon markup (and rarity class) used in the Skin
   * Collection grid and Case Reel, reused here so the Case Result panel
   * speaks the same rarity-frame visual language instead of just colored
   * text. Purely presentational — reads rarity/shape/color straight off the
   * rolled item, no gameplay/RNG involvement.
   */
  skinResultIconHTML(item) {
    return `<span class="skin-preview rarity-${item.rarity.toLowerCase()}" style="--skin:${item.color};--skin2:${item.secondaryColor}"><i class="skin-shape skin-shape-${item.shape}"></i></span>`;
  }

  finishCaseReel(result) {
    this.skinCaseBusy = false;
    if (this.openSkinCaseBtn) this.openSkinCaseBtn.disabled = false;
    if (this.skinCaseRoll) this.skinCaseRoll.classList.add("hidden");
    if (this.skinCaseResult) {
      this.skinCaseResult.className = `skin-case-result rarity-${result.item.rarity.toLowerCase()}`;
      this.skinCaseResult.innerHTML = `${this.skinResultIconHTML(result.item)}<span>${result.duplicate ? "DUPLICATE" : "YOU UNLOCKED"}</span><strong>${result.item.name}</strong><b>${result.item.rarity}</b>${result.duplicate ? `<small>+${result.scrap} SCRAP</small>` : `<small>Added to Inventory</small>`}`;
    }
    this.renderSkinScreen();
  }

  exchangeChooseRare(id) {
    if (!this.skinSystem || this.skinSystem.data.scrap < 500 || this.skinCaseBusy) return;
    const result = this.skinSystem.exchangeChooseRare(id);
    if (!result.ok) return;
    if (this.skinCaseResult) {
      this.skinCaseResult.className = `skin-case-result rarity-${result.item.rarity.toLowerCase()}`;
      this.skinCaseResult.innerHTML = `${this.skinResultIconHTML(result.item)}<span>EXCHANGE</span><strong>${result.item.name}</strong><b>${result.item.rarity}</b><small>Added to Inventory</small>`;
    }
    this.renderSkinScreen();
  }

  exchangeRarePlus() {
    if (!this.skinSystem || this.skinSystem.data.scrap < 100 || this.skinCaseBusy) return;
    const result = this.skinSystem.exchangeRandomRarePlus();
    if (!result.ok) return;
    if (this.skinCaseResult) {
      this.skinCaseResult.className = `skin-case-result rarity-${result.item.rarity.toLowerCase()}`;
      this.skinCaseResult.innerHTML = `${this.skinResultIconHTML(result.item)}<span>${result.duplicate ? "DUPLICATE" : "EXCHANGE"}</span><strong>${result.item.name}</strong><b>${result.item.rarity}</b><small>${result.duplicate ? `+${result.scrap} SCRAP` : "Added to Inventory"}</small>`;
    }
    this.renderSkinScreen();
  }

  showSkinInfo() {
    this.skinInfoOverlay?.classList.remove("hidden");
  }

  hideSkinInfo() {
    this.skinInfoOverlay?.classList.add("hidden");
  }

  showSkinRewardToast(title, subtitle) {
    let toast = document.getElementById("skinRewardToast");
    if (!toast) {
      toast = document.createElement("section");
      toast.id = "skinRewardToast";
      document.getElementById("gameRoot")?.appendChild(toast);
    }
    toast.innerHTML = subtitle ? `<strong>${title}</strong><span>${subtitle}</span>` : `<span>${title}</span>`;
    toast.classList.remove("hidden");
    clearTimeout(this._skinToastTimer);
    this._skinToastTimer = setTimeout(() => toast.classList.add("hidden"), 2200);
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

  /**
   * Scales visible menu / result screens to fit within the viewport height and width
   * without distortion or clipping. Particularly on laptops (600-750px high viewports),
   * this uniformly scales the panel down so all buttons (including Reset Best) and stats
   * fit neatly inside the screen with zero scrollbar.
   */
  fitOverlayScreens() {
    if (!this.overlay) return;
    const screens = this.overlay.querySelectorAll(
      ".menu-screen:not(.hidden):not(.scrollable-screen)",
    );
    this.overlay
      .querySelectorAll(".menu-screen.scrollable-screen")
      .forEach((screen) => {
        screen.style.zoom = "";
      });
    if (!screens || screens.length === 0) return;

    const pad = 96;
    const availH =
      (window.innerHeight || document.documentElement.clientHeight || 800) -
      pad;
    const availW =
      (window.innerWidth || document.documentElement.clientWidth || 1000) -
      pad;

    screens.forEach((screen) => {
      screen.style.zoom = "";

      const panel = screen.querySelector(".panel") || screen;
      const naturalH = panel.scrollHeight || panel.offsetHeight;
      const naturalW = panel.scrollWidth || panel.offsetWidth;

      if (naturalH > 0 && naturalW > 0) {
        const scaleY = naturalH > availH ? availH / naturalH : 1;
        const scaleX = naturalW > availW ? availW / naturalW : 1;
        const scale = Math.min(1, scaleY, scaleX);

        if (scale < 0.999) {
          screen.style.zoom = scale.toFixed(4);
        } else {
          screen.style.zoom = "";
        }
      }
    });
  }

  hideOverlay() {
    this.overlay.classList.add("hidden");
    this.pause?.classList.add("hidden");
    this.hud?.classList.remove("hidden");
    this.skinScreen?.classList.add("hidden");
    this.skinCollectionScreen?.classList.add("hidden");
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
    this.fitOverlayScreens();
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
    const runTip = getRunTip(mode);
    const tipBlock = runTip
      ? `<div class="howto-tip run-tip">💡 ${runTip.text}</div>`
      : "";

    // Per-stat record breaks — each compared against the pre-run record.
    const isNewBestScore = Math.round(finalScore) > 0 && Math.round(finalScore) > Math.round(bestScore);
    const isNewBestTime  = time > bestTime;
    const isNewBestWave  = wave > bestWave;
    const isNewBestGraze = graze > bestGraze;
    const isAllNewBest = isNewBestScore && isNewBestTime && isNewBestWave && isNewBestGraze;

    // When every single stat breaks its record, show one big "NEW SCORE"
    // banner instead of decorating each row individually.
    const newBestBadge = isAllNewBest
      ? `<style>
           .new-score-banner{display:flex;align-items:center;justify-content:center;gap:8px;margin:0 0 14px;padding:8px 16px;border-radius:999px;background:rgba(255,217,61,.12);border:1px solid rgba(255,217,61,.4);color:var(--gold);font-size:14px;font-weight:900;letter-spacing:1px;animation:new-best-pop .45s cubic-bezier(.2,.8,.2,1) both}
           @keyframes new-best-pop{0%{transform:scale(.7);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}
         </style>
         <div class="new-score-banner">🏆 NEW SCORE</div>`
      : `<style>
           .best-arrow{margin-left:4px;font-weight:900;color:var(--gold)}
         </style>`;

    // Small up-arrow next to an individual cell's latest value — only used
    // when it's NOT the case that every stat broke its record (that case
    // gets the banner above instead).
    const arrow = (isNew) =>
      isNew && !isAllNewBest ? '<span class="best-arrow">↑</span>' : "";


    this.showResultScreen(`
      <div class="panel">
        <div class="logo">RUN COMPLETE</div>
        <h1>จบเกม!</h1>
        <p class="tagline">${mode === "coop" ? "Co-op · แข่งคะแนนกันในทีมเดียว" : "Solo Run"}</p>

        <div class="rank-result rank-${rank.toLowerCase()}">
          <div class="rank-kicker">RANK</div>
          <div class="rank-letter" id="rankLetterEl"></div>
          <div class="rank-particles" id="rankParticlesEl"></div>
          <div class="rank-phrase" id="rankPhraseEl">${rankPhrase}</div>
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
            <div class="run-value run-latest">${time.toFixed(1)}s${arrow(isNewBestTime)}</div>
            <div class="run-value run-best">${Number(bestTime).toFixed(1)}s</div>
          </div>
          <div class="run-comparison-row">
            <div class="run-label">Wave :</div>
            <div class="run-value run-latest">${wave}${arrow(isNewBestWave)}</div>
            <div class="run-value run-best">${Number(bestWave)}</div>
          </div>
          <div class="run-comparison-row">
            <div class="run-label">Score :</div>
            <div class="run-value run-latest">${Math.round(finalScore).toLocaleString()}${arrow(isNewBestScore)}</div>
            <div class="run-value run-best">${Number(bestScore).toLocaleString()}</div>
          </div>
          <div class="run-comparison-row">
            <div class="run-label">Graze :</div>
            <div class="run-value run-latest">${graze}${arrow(isNewBestGraze)}</div>
            <div class="run-value run-best">${Number(bestGraze)}</div>
          </div>
        </div>

        ${scoreRows}
        ${tipBlock}
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

    this.animateRankReveal(rank);
  }

  /**
   * Slot-machine style rank reveal for the game-over screen: cycles the
   * rank letter up from D to the run's actual rank (skipped/instant for D
   * itself), decelerating on each step, then "lands" with a per-tier pop,
   * shake, and particle burst (see RANK_FX). Runs after showResultScreen()
   * has already inserted the placeholder elements into the DOM.
   */
  async animateRankReveal(rank) {
    const letterEl = this.resultScreen?.querySelector("#rankLetterEl");
    if (!letterEl) return;

    const targetIndex = Math.max(0, RANK_ORDER.indexOf(rank));
    const sequence = RANK_ORDER.slice(0, targetIndex + 1);
    const revealToken = (this.rankRevealToken = (this.rankRevealToken || 0) + 1);

    for (let i = 0; i < sequence.length; i++) {
      letterEl.textContent = sequence[i];
      const isLast = i === sequence.length - 1;
      if (isLast) break;
      await wait(55 + i * 35);
      if (revealToken !== this.rankRevealToken) return; // superseded by a new run
    }

    this.landRank(rank);
  }

  /** Applies the landing pop/shake/particles for `rank` once the reveal cycle stops. */
  landRank(rank) {
    const resultEl = this.resultScreen?.querySelector(".rank-result");
    const letterEl = this.resultScreen?.querySelector("#rankLetterEl");
    const particlesEl = this.resultScreen?.querySelector("#rankParticlesEl");
    const phraseEl = this.resultScreen?.querySelector("#rankPhraseEl");
    if (!resultEl || !letterEl) return;

    const fx = RANK_FX[rank] || RANK_FX.D;
    resultEl.style.setProperty("--rank-shake-amp", `${fx.shake}px`);
    resultEl.style.setProperty("--rank-pop-scale", fx.pop);

    letterEl.classList.remove("rank-pop");
    resultEl.classList.remove("rank-landed");
    // Force reflow so the animation restarts if a rank was just re-landed.
    void letterEl.offsetWidth;
    letterEl.classList.add("rank-pop");
    resultEl.classList.add("rank-landed");

    if (fx.particles > 0 && particlesEl) {
      this.spawnRankParticles(particlesEl, fx);
    }
    phraseEl?.classList.add("rank-phrase-visible");
  }

  /** Spawns a short-lived DOM particle burst inside `container`, colored per RANK_FX entry. */
  spawnRankParticles(container, fx) {
    container.innerHTML = "";
    const frag = document.createDocumentFragment();
    for (let i = 0; i < fx.particles; i++) {
      const dot = document.createElement("span");
      dot.className = "rank-particle";
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 70;
      dot.style.setProperty("--rp-x", `${Math.cos(angle) * dist}px`);
      dot.style.setProperty("--rp-y", `${Math.sin(angle) * dist}px`);
      dot.style.setProperty("--rp-delay", `${Math.random() * 0.12}s`);
      dot.style.setProperty("--rp-color", fx.colors[i % fx.colors.length]);
      frag.appendChild(dot);
    }
    container.appendChild(frag);
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
      s,
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
      s,
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
    s,
  ) {
    const cd = Math.max(0, player.skillCooldown);
    const ready = cd <= 0;

    // Fire the ready callout only on the exact cooldown -> ready edge, not
    // every frame the chip happens to already read ready. The "READY" text
    // alone lives in a top corner and is easy to miss mid-swarm, so this
    // adds motion (chip pop) plus a peripheral screen-edge pulse that
    // doesn't cover the play area.
    if (ready && player._skillWasReady === false) {
      // Suppress the visual pop at the very start of the game (first 0.5s).
      // The player already knows they start with a ready skill; flashing the
      // screen immediately on game start is jarring and unnecessary.
      if (!s || s.elapsed > 0.5) {
        this.pulseSkillReady(chipId);
        if (s) s.skillReadyFlashAlpha = 1;
      }
    }
    player._skillWasReady = ready;

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

  /** Brief self-cleaning scale/glow pop on the skill chip, triggered once
   * when its skill goes from cooldown to ready — see updateSkillDisplay().
   * Removes and re-adds the class (with a reflow in between) so a rapid
   * retrigger restarts the animation instead of doing nothing. */
  pulseSkillReady(chipId) {
    const chip = document.getElementById(chipId);
    if (!chip) return;
    chip.classList.remove("skill-pop");
    void chip.offsetWidth;
    chip.classList.add("skill-pop");
    chip.addEventListener(
      "animationend",
      () => chip.classList.remove("skill-pop"),
      { once: true },
    );
  }
}
