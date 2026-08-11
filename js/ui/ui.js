import { CONFIG } from '../core/config.js';

const SKILL_NAMES = {
  pulse: 'PULSE', dash: 'DASH', shield: 'SHIELD', slow: 'SLOW', nova: 'NOVA',
  timestop: 'TIME STOP', heal: 'HEAL', repulse: 'REPULSE', phase: 'PHASE'
};

const SKILL_DESCRIPTIONS = {
  pulse: 'ล้างกระสุนรอบตัว',
  dash: 'พุ่งไปยังเป้าหมายพร้อมอมตะสั้น ๆ',
  shield: 'สร้างโล่ป้องกันดาเมจชั่วคราว',
  slow: 'ทำให้กระสุนทั้งหมดช้าลง',
  nova: 'ระเบิดพลังรอบตัว ทำลายกระสุนในวงกว้าง',
  timestop: 'หยุดการเคลื่อนที่ของกระสุนชั่วคราว',
  heal: 'ฟื้นคืน 1 ชีวิต สูงสุด 3 ชีวิต',
  repulse: 'ผลักกระสุนรอบตัวให้ออกไปด้านนอก',
  phase: 'เข้าสู่สถานะอมตะชั่วคราว'
};

const SKILL_ICONS = {
  pulse: '💥', dash: '⚡', shield: '🛡', slow: '⏱', nova: '✦',
  timestop: '⏸', heal: '♥', repulse: '◉', phase: '◇'
};

const SKILL_ORDER = ['pulse', 'dash', 'shield', 'slow', 'nova', 'timestop', 'heal', 'repulse', 'phase'];

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
    this.currentMode = 'solo';
    this.currentSkill = 'pulse';
    this.currentSkillP2 = 'dash';

    this.buildSkillCards();
    this.bindMenu();
    this.showModeScreen();
  }

  cacheElements() {
    this.overlay = document.getElementById('overlay');
    this.hud = document.getElementById('hud');
    this.pause = document.getElementById('pauseOverlay');
    this.bannerEl = document.getElementById('waveBanner');
    this.modeScreen = document.getElementById('modeScreen');
    this.skillScreen = document.getElementById('skillScreen');
    this.p2SkillPicker = document.getElementById('p2SkillPicker');
    this.selectedLoadout = document.getElementById('selectedLoadout');
    this.controlHint = document.getElementById('controlHint');
    this.skillScreenSub = document.getElementById('skillScreenSub');
    this.resultScreen = document.getElementById('resultScreen');

    this.el = {
      best: document.getElementById('best'),
      bestWave: document.getElementById('bestWave'),
      bestScore: document.getElementById('bestScore'),
      wave: document.getElementById('wave'),
      bossWrap: document.getElementById('bossWrap'),
      bossBarFill: document.getElementById('bossBarFill'),
      waveTitle: document.getElementById('waveTitle'),
      waveSubtitle: document.getElementById('waveSubtitle'),
      time: document.getElementById('time'),
      graze: document.getElementById('graze'),
      score: document.getElementById('score'),
      p1Score: document.getElementById('p1Score'),
      p2Score: document.getElementById('p2Score'),
      lives: document.getElementById('lives'),
      p2Hud: document.getElementById('p2Hud'),
      p2ScoreChip: document.getElementById('p2ScoreChip'),
      p2SkillChip: document.getElementById('p2SkillChip'),
      p2Lives: document.getElementById('p2Lives'),
      downBanner: document.getElementById('downBanner'),
      comboChip: document.getElementById('comboChip'),
      comboVal: document.getElementById('comboVal')
    };
  }

  // --- Menu setup -------------------------------------------------

  buildSkillCards() {
    document.querySelectorAll('[data-skill-player]').forEach(grid => {
      const player = grid.dataset.skillPlayer;
      grid.innerHTML = SKILL_ORDER.map(skill => `
        <button type="button" class="skill-card-option${(player === '1' ? skill === this.currentSkill : skill === this.currentSkillP2) ? ' selected' : ''}" data-skill="${skill}" data-player="${player}">
          <span class="skill-card-icon">${SKILL_ICONS[skill]}</span>
          <span class="skill-card-name">${SKILL_NAMES[skill]}</span>
          <span class="skill-card-desc">${SKILL_DESCRIPTIONS[skill]}</span>
        </button>
      `).join('');
      grid.querySelectorAll('[data-skill]').forEach(card =>
        card.addEventListener('click', () => this.chooseSkill(card.dataset.player, card.dataset.skill))
      );
    });
  }

  bindMenu() {
    document.querySelectorAll('[data-mode]').forEach(button => {
      button.addEventListener('click', () => {
        this.currentMode = button.dataset.mode;
        this.showSkillScreen();
      });
    });
    document.getElementById('backModeBtn')?.addEventListener('click', () => this.showModeScreen());
    document.getElementById('startBtn')?.addEventListener('click', () => this.onStart?.(this.currentMode, this.currentSkill, this.currentSkillP2));

    // Pause-screen actions: restart instantly with the current loadout, or back out to the menu.
    document.getElementById('pauseRestartBtn')?.addEventListener('click', () => this.onStart?.(this.currentMode, this.currentSkill, this.currentSkillP2));
    document.getElementById('pauseMenuBtn')?.addEventListener('click', () => this.onMenu?.());
  }

  chooseSkill(player, skill) {
    if (player === '2') this.currentSkillP2 = skill;
    else this.currentSkill = skill;
    document.querySelectorAll(`[data-skill-player="${player}"] [data-skill]`).forEach(card =>
      card.classList.toggle('selected', card.dataset.skill === skill)
    );
    this.updateLoadout();
  }

  showModeScreen() {
    this.modeScreen?.classList.remove('hidden');
    this.skillScreen?.classList.add('hidden');
    this.resultScreen?.classList.add('hidden');
  }

  showSkillScreen() {
    this.modeScreen?.classList.add('hidden');
    this.skillScreen?.classList.remove('hidden');
    this.resultScreen?.classList.add('hidden');

    const coop = this.currentMode === 'coop';
    this.p2SkillPicker?.classList.toggle('hidden', !coop);
    if (this.skillScreenSub) {
      this.skillScreenSub.textContent = coop ? 'เลือกสกิลให้ผู้เล่นแต่ละคน' : 'เลือกสกิลที่ต้องการก่อนเริ่มเกม';
    }
    if (this.controlHint) {
      this.controlHint.textContent = coop
        ? 'P1: เมาส์ · P2: WASD / ลูกศร + / · Space: หยุดเกม'
        : 'P1: เมาส์ · Space: หยุดเกม';
    }
    this.updateLoadout();
  }

  updateLoadout() {
    if (!this.selectedLoadout) return;
    this.selectedLoadout.innerHTML = this.currentMode === 'coop'
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
    this.overlay.classList.add('hidden');
    this.pause?.classList.add('hidden');
    this.hud?.classList.remove('hidden');
  }

  /** Hides the HUD/pause overlay and shows the mode-select menu screen. */
  returnToMenu() {
    this.pause?.classList.add('hidden');
    this.hud?.classList.add('hidden');
    this.overlay.classList.remove('hidden');
    this.showModeScreen();
  }

  /**
   * Shows `html` inside the dedicated result-screen panel (used for the
   * game-over screen). Unlike the old approach, this does NOT overwrite
   * #overlay's innerHTML, so the mode/skill menu screens stay intact and
   * `returnToMenu()` can bring them back afterward.
   */
  showResultScreen(html) {
    this.modeScreen?.classList.add('hidden');
    this.skillScreen?.classList.add('hidden');
    if (this.resultScreen) {
      this.resultScreen.innerHTML = html;
      this.resultScreen.classList.remove('hidden');
    }
    this.overlay.classList.remove('hidden');
    this.resultScreen?.querySelector('#startBtn')?.addEventListener('click', () => this.onStart?.(this.currentMode, this.currentSkill, this.currentSkillP2));
    this.resultScreen?.querySelector('#menuBtn')?.addEventListener('click', () => this.onMenu?.());
  }

  showGameOver(time, wave, graze, mode, players = [], finalScore = 0, bestScore = 0) {
    this.currentMode = mode;
    const p1 = Math.round(players[0]?.score || 0);
    const p2 = Math.round(players[1]?.score || 0);

    const scoreRows = mode === 'coop'
      ? `<div class="score-results"><div><span>P1</span><b>${p1.toLocaleString()}</b></div><div><span>P2</span><b>${p2.toLocaleString()}</b></div></div>
         <div class="team-result"><span>TEAM SCORE</span><b>${Math.round(finalScore).toLocaleString()}</b></div>
         <div class="winner-line">${p1 === p2 ? 'เสมอกัน' : p1 > p2 ? 'P1 ทำคะแนนสูงสุด' : 'P2 ทำคะแนนสูงสุด'}</div>`
      : `<div class="team-result"><span>SCORE</span><b>${Math.round(finalScore).toLocaleString()}</b></div>`;

    this.showResultScreen(`
      <div class="panel">
        <div class="logo">RUN COMPLETE</div>
        <h1>จบเกม!</h1>
        <p class="tagline">${mode === 'coop' ? 'Co-op · แข่งคะแนนกันในทีมเดียว' : 'Solo Run'}</p>
        <p class="result-line">รอดได้ <b>${time.toFixed(1)}</b> วินาที — ถึง <b>Wave ${wave}</b></p>
        ${scoreRows}
        <p class="result-line">Graze รวม: <b>${graze}</b> · Best Score: <b>${Number(bestScore).toLocaleString()}</b></p>
        <div class="result-actions">
          <button id="startBtn" class="start restart-btn" type="button"><span>↻</span> เล่นอีกครั้ง</button>
          <button id="menuBtn" class="menu-btn" type="button">กลับเมนู</button>
        </div>
      </div>
    `);
  }

  showPause(v) {
    this.pause.classList.toggle('hidden', !v);
  }

  // --- HUD setters -------------------------------------------------

  setBest(time, wave, score = 0) {
    if (this.el.best) this.el.best.textContent = Number(time).toFixed(1);
    if (this.el.bestWave) this.el.bestWave.textContent = wave;
    if (this.el.bestScore) this.el.bestScore.textContent = Math.round(score).toLocaleString();
  }

  setWave(n) {
    this.el.wave.textContent = n;
  }

  setBossVisible(v) {
    this.el.bossWrap.classList.toggle('hidden', !v);
  }

  setBossProgress(pct) {
    this.el.bossBarFill.style.width = `${pct}%`;
  }

  banner(n, subtitle, isBoss) {
    this.el.waveTitle.textContent = isBoss ? `BOSS WAVE ${n}` : `WAVE ${n}`;
    this.el.waveTitle.classList.toggle('boss-title', isBoss);
    this.el.waveSubtitle.textContent = subtitle;
    this.bannerEl.classList.add('wave-show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => this.bannerEl.classList.remove('wave-show'), 1800);
  }

  // --- Per-frame HUD update -------------------------------------------------

  update(s, players, mode) {
    this.updateTimer(s.elapsed);
    this.updateScores(s, players);
    this.updateSkillChips(s, players);
    this.updateLivesAndDownState(players, mode);
    this.updateCombo(s);
  }

  updateTimer(elapsed) {
    const total = Math.max(0, elapsed);
    const minutes = Math.floor(total / 60);
    const seconds = Math.floor(total % 60);
    const tenths = Math.floor((total % 1) * 10);
    this.el.time.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
  }

  updateScores(s, players) {
    if (this.el.graze) this.el.graze.textContent = s.grazeCount;
    if (this.el.score) this.el.score.textContent = Math.round(s.teamScore || 0).toLocaleString();
    if (this.el.p1Score) this.el.p1Score.textContent = Math.round(players[0].score || 0).toLocaleString();
    if (this.el.p2Score) this.el.p2Score.textContent = Math.round(players[1].score || 0).toLocaleString();
  }

  updateSkillChips(s, players) {
    const p1Skill = s.skill;
    this.updateSkillDisplay(players[0], SKILL_NAMES[p1Skill] || String(p1Skill).toUpperCase(), this.cooldownFor(p1Skill), 'skillName', 'skillStatus', 'skillVal', 'skillBarFill', 'skillChip');

    const p2Skill = s.skillP2;
    this.updateSkillDisplay(players[1], SKILL_NAMES[p2Skill] || String(p2Skill).toUpperCase(), this.cooldownFor(p2Skill), 'p2SkillName', 'p2SkillStatus', 'p2SkillVal', 'p2SkillBarFill', 'p2SkillChip');
  }

  updateLivesAndDownState(players, mode) {
    this.el.lives.textContent = players[0].down ? 'DOWN' : '❤️'.repeat(players[0].lives);

    this.el.p2Hud.classList.toggle('hidden', mode !== 'coop');
    this.el.p2ScoreChip?.classList.toggle('hidden', mode !== 'coop');
    this.el.p2SkillChip.classList.toggle('hidden', mode !== 'coop');
    this.el.p2Lives.textContent = players[1].down
      ? (players[1].reviveProgress > 0 ? `REVIVE ${Math.round((players[1].reviveProgress / 2) * 100)}%` : 'DOWN')
      : '❤️'.repeat(players[1].lives);

    if (!this.el.downBanner) return;
    const downPlayers = mode === 'coop' ? players.filter(p => p.down) : (players[0].down ? [players[0]] : []);
    if (!downPlayers.length) {
      this.el.downBanner.classList.add('hidden');
      return;
    }
    const both = mode === 'coop' && downPlayers.length === 2;
    this.el.downBanner.classList.remove('hidden');
    this.el.downBanner.classList.toggle('critical', both);
    this.el.downBanner.innerHTML = both
      ? '<b>ทั้งสองคน DOWN</b><small>ช่วยกันกลับเข้าสู่เกม</small>'
      : `<b>PLAYER ${downPlayers[0].id} DOWN</b><small>${mode === 'coop' ? 'เข้าไปใกล้เพื่อช่วยชุบ' : 'รอเริ่มรอบใหม่'}</small>`;
  }

  updateCombo(s) {
    if (s.combo >= 2) {
      this.el.comboChip.classList.remove('hidden');
      this.el.comboVal.textContent = `x${(1 + Math.min(s.combo, 10) * 0.12).toFixed(1)}`;
    } else {
      this.el.comboChip.classList.add('hidden');
    }
  }

  cooldownFor(skill) {
    if (skill === 'dash') return CONFIG.dash.cooldown;
    return CONFIG.skills[skill]?.cooldown ?? 5;
  }

  updateSkillDisplay(player, name, maxCd, nameId, statusId, valueId, barId, chipId) {
    const cd = Math.max(0, player.skillCooldown);
    const ready = cd <= 0;

    document.getElementById(nameId).textContent = name;
    document.getElementById(statusId).textContent = ready ? 'READY' : 'COOLDOWN';
    document.getElementById(valueId).textContent = ready ? 'CLICK' : `${cd.toFixed(1)}s`;

    const fill = document.getElementById(barId);
    fill.style.width = `${ready ? 100 : Math.max(0, Math.min(100, (1 - cd / maxCd) * 100))}%`;

    document.getElementById(chipId).classList.toggle('ready', ready);
  }
}
