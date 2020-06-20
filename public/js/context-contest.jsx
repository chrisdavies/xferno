import { xferno, useSelector, useDispatch, useRenderCache } from '../../src/xferno';

let countC = 0;
const ChildC = xferno(({ name }) => {
  const cache = useRenderCache();
  return (
    cache() || (
      <footer>
        I only re-render when "{name}" changes. (I've re-rendered {countC++} times).
      </footer>
    )
  );
});

let countB = 0;
const ChildB = xferno(() => {
  const cache = useRenderCache();
  const age = useSelector((s) => s.age);
  const dispatch = useDispatch();

  return (
    cache() || (
      <p>
        Age {age}. I have rendered {countB++} times.
        <button onClick={() => dispatch('ageInc')}>+</button>
      </p>
    )
  );
});

let countA = 0;
const ChildA = xferno(() => {
  const cache = useRenderCache();
  const name = useSelector((s) => s.name);
  const dispatch = useDispatch();

  return (
    cache() || (
      <div>
        <h1>
          Name "{name}" updated {countA++} times
        </h1>
        <input value={name} onInput={(e) => dispatch('setName', e.target.value)} />
        <ChildB />
        <ChildC name={name} />
      </div>
    )
  );
});

export function ContextContest() {
  return <ChildA debug={true} />;
}
