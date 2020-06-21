// This implementation runs at roughly 200 fps
import { render } from 'inferno';
import {
  useState,
  useEffect,
  useSelector,
  useDispatch,
  useRenderCache,
  ReduxStoreProvider,
} from '../../src';
import { fps, store } from './perf-helper';

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

function Age() {
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
}

function Counter() {
  const cache = useRenderCache();
  const [count, setState] = useState(0);

  return cache() || <button onClick={() => setState(count + 1)}>{count}</button>;
}

function Name() {
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
}

function Footer() {
  const cache = useRenderCache();

  return (
    cache() || (
      <footer>
        <strong>This</strong> is the <em>footer</em>.
      </footer>
    )
  );
}

function Main() {
  return (
    <ReduxStoreProvider store={store}>
      <main>
        <h1>Xferno perf (hooks)</h1>
        <Name />
        <Footer />
      </main>
    </ReduxStoreProvider>
  );
}

render(<Main />, document.body);
