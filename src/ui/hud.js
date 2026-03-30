import { MAX_STRIKES, MS_TO_MPH, M_TO_FT } from '../constants.js';

export class HUD {
  constructor() {
    this._strikesEl = document.getElementById('hud-strikes');
    this._hitsEl = document.getElementById('hud-hits');
    this._hrEl = document.getElementById('hud-hr');
    this._bestEl = document.getElementById('hud-best');
    this._pitchInfoEl = document.getElementById('pitch-info');
    this._pitchInfoTimer = null;

    this._buildStrikeDots();
  }

  _buildStrikeDots() {
    this._strikesEl.innerHTML = '';
    this._dots = [];
    for (let i = 0; i < MAX_STRIKES; i++) {
      const dot = document.createElement('div');
      dot.className = 'strike-dot';
      this._strikesEl.appendChild(dot);
      this._dots.push(dot);
    }
  }

  update(score) {
    // Update strike dots
    for (let i = 0; i < MAX_STRIKES; i++) {
      this._dots[i].classList.toggle('active', i < score.strikes);
    }

    this._hitsEl.textContent = `HITS: ${score.hits}`;
    this._hrEl.textContent = `HR: ${score.homeRuns}`;
    this._bestEl.textContent = `BEST: ${Math.round(score.bestDistance)} ft`;
  }

  showPitchInfo(pitch) {
    this._pitchInfoEl.textContent = `${pitch.name}  ${Math.round(pitch.speedMph)} mph`;
    this._pitchInfoEl.classList.add('visible');
    clearTimeout(this._pitchInfoTimer);
    this._pitchInfoTimer = setTimeout(() => {
      this._pitchInfoEl.classList.remove('visible');
    }, 1500);
  }

  showResultOverlay(outcome, exitSpeed, launchAngle, distanceFt) {
    const typeEl = document.getElementById('result-type');
    const statsEl = document.getElementById('result-stats');
    const overlay = document.getElementById('result-overlay');

    typeEl.textContent = outcome.label;
    typeEl.className = '';

    switch (outcome.type) {
      case 'HOME_RUN': typeEl.classList.add('home-run'); break;
      case 'SINGLE':
      case 'DOUBLE':
      case 'TRIPLE': typeEl.classList.add('hit'); break;
      case 'OUT': typeEl.classList.add('out'); break;
      case 'FOUL': typeEl.classList.add('foul'); break;
      default: typeEl.classList.add('strike'); break;
    }

    const exitMph = Math.round(exitSpeed * MS_TO_MPH);
    const dist = Math.round(distanceFt);
    const angle = Math.round(launchAngle);

    statsEl.innerHTML = `Exit Velo: ${exitMph} mph<br>Launch Angle: ${angle}&deg;<br>Distance: ${dist} ft`;
    overlay.classList.remove('hidden');
  }

  hideResultOverlay() {
    document.getElementById('result-overlay').classList.add('hidden');
  }

  showStrikeFlash(label) {
    const typeEl = document.getElementById('result-type');
    const statsEl = document.getElementById('result-stats');
    const overlay = document.getElementById('result-overlay');

    typeEl.textContent = label;
    typeEl.className = 'strike';
    statsEl.innerHTML = '';
    overlay.classList.remove('hidden');
  }
}
