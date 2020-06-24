import { useSelector, useDispatch } from '../../src/xferno';

let countC = 0;
function ChildC({ name }) {
  return (
    <footer>
      I only re-render when "{name}" changes. (I've re-rendered {countC++} times).
    </footer>
  );
}

let countB = 0;
function Age({ age, dispatch }) {
  return (
    <p>
      Age {age}. I have rendered {countB++} times.
      <button onClick={() => dispatch('ageInc')}>+</button>
    </p>
  );
}

function ChildB() {
  const age = useSelector((s) => s.age);
  const dispatch = useDispatch();

  return <Age age={age} dispatch={dispatch} />;
}

let countA = 0;
function ChildA() {
  const name = useSelector((s) => s.name);
  const dispatch = useDispatch();

  return (
    <div>
      <h1>
        Name "{name}" updated {countA++} times
      </h1>
      <input value={name} onInput={(e) => dispatch('setName', e.target.value)} />
      <ChildB />
      <ChildC name={name} />
    </div>
  );
}

export function ContextContest() {
  return <ChildA debug={true} />;
}
