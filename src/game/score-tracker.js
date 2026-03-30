import { MAX_STRIKES } from '../constants.js';

export class ScoreTracker {
  constructor() {
    this.reset();
  }

  reset() {
    this.strikes = 0;
    this.hits = 0;
    this.homeRuns = 0;
    this.singles = 0;
    this.doubles = 0;
    this.triples = 0;
    this.outs = 0;
    this.fouls = 0;
    this.bestDistance = 0;
    this.totalPitches = 0;
  }

  addStrike() {
    this.strikes++;
  }

  addResult(outcome) {
    switch (outcome.type) {
      case 'HOME_RUN':
        this.hits++;
        this.homeRuns++;
        break;
      case 'TRIPLE':
        this.hits++;
        this.triples++;
        break;
      case 'DOUBLE':
        this.hits++;
        this.doubles++;
        break;
      case 'SINGLE':
        this.hits++;
        this.singles++;
        break;
      case 'OUT':
        this.outs++;
        break;
      case 'FOUL':
        this.fouls++;
        this.strikes++;
        break;
    }

    if (outcome.distanceFt && outcome.distanceFt > this.bestDistance) {
      this.bestDistance = outcome.distanceFt;
    }
  }

  isGameOver() {
    return this.strikes >= MAX_STRIKES;
  }
}
