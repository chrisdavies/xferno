import { createStore } from './redux-like';

const arr = new Array(5000);
arr.fill(0);

const initialState = {
  index: 0,
  arr,
};

const actions = {
  incSome(state) {
    const arr = [...state.arr];
    const blockLen = Math.min(50, arr.length / 3);
    const blockStart = (state.index + 1) % arr.length;
    for (let x = 0; x < blockLen; ++x) {
      const i = (blockStart + x) % arr.length;
      ++arr[i];
    }

    return {
      ...state,
      index: blockStart,
      arr,
    };
  },
};

const reducer = (state, action, ...args) => {
  const handler = actions[action];
  if (handler) {
    return handler(state, ...args);
  }
  console.warn('Unknown action,', action);
  return state || initialState;
};

export const store = createStore(reducer, initialState);

function stat(fn, ctx) {
  const sampleRate = 20;
  let avgNum = 0;
  let avgDenom = 0;
  let renderCount = 0;
  let max = 0;

  return () => {
    ++renderCount;

    if (renderCount > sampleRate) {
      const result = fn(renderCount, ctx);
      avgNum += result;
      max = Math.max(max, result);
      ++avgDenom;
      renderCount = 0;
    }

    return {
      max: max.toFixed(2),
      avg: avgDenom ? (avgNum / avgDenom).toFixed(2) : '---',
    };
  };
}

export const mem = stat(() => performance.memory.usedJSHeapSize / (1024 * 1024));

export const fps = stat(
  (renderCount, ctx) => {
    const { time } = ctx;
    const now = Date.now();
    const s = (now - time) / 1000;
    const result = renderCount / s;
    ctx.time = now;
    return result;
  },
  {
    time: Date.now(),
  },
);
