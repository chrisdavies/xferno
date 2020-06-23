// This implementation runs at roughly 200 fps
import { render } from 'inferno';
import { useEffect, useSelector, useDispatch, ReduxStoreProvider } from '../../src';
import { fps, mem, store } from './perf-helper';

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

function Stats() {
  const fpsStat = fps();
  const memStat = mem();

  return (
    <table class="bench-stats">
      <tr>
        <th>Stat</th>
        <th>Avg</th>
        <th>Max</th>
      </tr>
      <tr>
        <td>FPS</td>
        <td>{fpsStat.avg}</td>
        <td>{fpsStat.max}</td>
      </tr>
      <tr>
        <td>Mem</td>
        <td>{memStat.avg}MB</td>
        <td>{memStat.max}MB</td>
      </tr>
    </table>
  );
}

function Color({ val, children }) {
  const colors = [
    'GreenYellow',
    'SpringGreen',
    'MediumSpringGreen',
    'LightGreen',
    'PaleGreen',
    'DarkSeaGreen',
    'MediumAquamarine',
    'MediumSeaGreen',
    'SeaGreen',
    'ForestGreen',
    'Green',
    'DarkGreen',
  ];

  return <span style={{ color: colors[val % colors.length] }}>{children}</span>;
}

function NestedCell({ val }) {
  return <span>{val}</span>;
}

function Cell({ val, i }) {
  return i % 10 === 0 ? (
    <div>
      <NestedCell val={val} />
    </div>
  ) : (
    <Color val={val}>
      <NestedCell val={val} />
    </Color>
  );
}

function Arr() {
  const arr = useSelector((s) => s.arr);
  const dispatch = useDispatch();

  useInterval(() => dispatch('incSome'), 1);

  return (
    <>
      {arr.map((val, i) => (
        <Cell val={val} i={i} key={i} />
      ))}
      <Stats />
    </>
  );
}

function Main() {
  return (
    <ReduxStoreProvider store={store}>
      <main>
        <h1>Xferno perf (hooks)</h1>
        <Arr />
      </main>
    </ReduxStoreProvider>
  );
}

render(<Main />, document.body);
