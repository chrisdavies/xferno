import { render } from 'inferno';
import { xferno, useState, useEffect, useMemo } from '../../src/xferno';
import { ContextContest } from './context-contest';

function useTimeout(fn, ms) {
  const [state, setState] = useState(fn());

  useEffect(() => {
    let timeout = setTimeout(function tick() {
      setState(fn());
      timeout = setTimeout(tick, ms);
    }, ms);
    return () => {
      console.log('Cleared!!');
      clearTimeout(timeout);
    };
  });

  return state;
}

const Counter = xferno(() => {
  const [count, setCount] = useState(0);
  const everyFifth = useMemo(() => count, Math.floor(count / 5));

  return (
    <div>
      <h1>Count: {count}</h1>
      <p>Every fifth numer: {everyFifth}</p>
      <button onClick={() => setCount(count + 1)}>
        +
      </button>
    </div>
  );
});

const Clock = xferno(() => {
  const time = useTimeout(() => new Date().toLocaleTimeString(), 1000);

  return (
    <h1>It is now {time}</h1>
  );
});

const HidableClock = xferno(() => {
  const [show, setShow] = useState(false);
  const toggleClock = () => setShow((s) => !s);

  return (
    <div>
      <button onClick={toggleClock}>{show ? 'Hide' : 'Show'} clock</button>
      {show && <Clock />}
    </div>
  )
});

function Main() {
  return (
    <main>
      <h1>Xferno demo</h1>
      <Counter />
      <HidableClock />
      <ContextContest />
    </main>
  );
}

render(<Main />, document.body);
