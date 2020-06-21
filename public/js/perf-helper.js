import { createStore } from './redux-like';

const initialState = {
  name: 'Context',
  age: 3,
};

const actions = {
  ageInc: (s) => ({ ...s, age: s.age + 1 }),
  setName: (s, name) => ({ ...s, name }),
};

const reducer = (state, action, ...args) => {
  const handler = actions[action];
  if (handler) {
    return handler(state, ...args);
  }
  console.warn('Unknown action,', action);
  return state || initialState;
};

function fpsTracker() {
  let time = Date.now();
  let renderCount = 0;
  let fps = 0;
  let avgNum = 0;
  let avgDenom = 0;

  return () => {
    ++renderCount;

    if (renderCount > 20) {
      const now = Date.now();
      const s = (now - time) / 1000;
      fps = renderCount / s;
      time = now;
      renderCount = 0;
      avgNum += fps;
      ++avgDenom;
    }

    return (avgNum / avgDenom).toFixed(2);
  };
}

export const store = createStore(reducer, initialState);

export const fps = fpsTracker();
