import { xferno, useSelector, useDispatch, useRenderCache } from '../../src/xferno';

let countC = 0;
const ChildC = xferno(() => {
  const cache = useRenderCache();
  return cache() || <footer>I should not re-render, but I have {countC++} times.</footer>;
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
        <ChildC />
      </div>
    )
  );
});

export function ContextContest() {
  return <ChildA debug={true} />;
}
