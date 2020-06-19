// This implementation runs at roughly 200 fps
import { render } from 'inferno';
import {
  xferno,
  useState,
  useEffect,
  useSelector,
  useDispatch,
  useRenderCache,
  ReduxStoreProvider,
} from '../../src';
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

const store = createStore(reducer, initialState);

function useInterval(fn, ms) {
  useEffect(() => {
    let timeout = setTimeout(function tick() {
      fn();
      timeout = setTimeout(tick, ms);
    }, ms);
    return () => {
      console.log('Cleared!!');
      clearTimeout(timeout);
    };
  });
}

function fpsTracker() {
  let time = Date.now();
  let renderCount = 0;
  let fps = 0;

  return () => {
    ++renderCount;

    if (renderCount > 20) {
      const now = Date.now();
      const s = (now - time) / 1000;
      fps = (renderCount / s).toFixed(2);
      time = now;
      renderCount = 0;
    }

    return fps;
  };
}

const fps = fpsTracker();

const Age = xferno(() => {
  const cache = useRenderCache();
  const age = useSelector((s) => s.age);
  const dispatch = useDispatch();

  useInterval(() => dispatch('ageInc'), 1);

  return (
    cache() || (
      <>
        <button onClick={() => dispatch('ageInc')}>
          <span>{age}</span>
        </button>
        <span>
          {' fps: '}
          {fps()}
        </span>
      </>
    )
  );
});

const Counter = xferno(() => {
  const cache = useRenderCache();
  const [count, setState] = useState(0);

  return cache() || <button onClick={() => setState(count + 1)}>{count}</button>;
});

const Name = xferno(() => {
  const cache = useRenderCache();
  const name = useSelector((s) => s.name);
  const dispatch = useDispatch();

  return (
    cache() || (
      <div>
        <h1>Your name is, {name}</h1>
        <div>
          <label>Enter your name</label>
          <input value={name} onInput={(e) => dispatch('setName', e.target.value)} />
        </div>
        <div>
          <label>Your age is</label>
          <Age />
        </div>
        <div>
          <label>Counter is ...</label>
          <Counter />
        </div>
      </div>
    )
  );
});

const Footer = xferno(() => {
  const cache = useRenderCache();

  return (
    cache() || (
      <footer>
        <strong>This</strong> is the <em>footer</em>.
      </footer>
    )
  );
});

function Main() {
  return (
    <ReduxStoreProvider store={store}>
      <main>
        <h1>Xferno demo</h1>
        <Name />
        <Footer />
      </main>
    </ReduxStoreProvider>
  );
}

render(<Main />, document.body);
