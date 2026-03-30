export const State = {
  TITLE: 'TITLE',
  WAITING: 'WAITING',
  PITCHING: 'PITCHING',
  SWING_EVAL: 'SWING_EVAL',
  BALL_IN_PLAY: 'BALL_IN_PLAY',
  RESULT: 'RESULT',
  GAME_OVER: 'GAME_OVER',
};

export class GameState {
  constructor() {
    this.state = State.TITLE;
    this._stateTime = 0;
    this._listeners = {};
  }

  get current() {
    return this.state;
  }

  get stateTime() {
    return this._stateTime;
  }

  transition(newState) {
    const old = this.state;
    this.state = newState;
    this._stateTime = 0;
    const cbs = this._listeners[newState];
    if (cbs) cbs.forEach(cb => cb(old));
  }

  on(state, cb) {
    if (!this._listeners[state]) this._listeners[state] = [];
    this._listeners[state].push(cb);
  }

  tick(dt) {
    this._stateTime += dt;
  }
}
