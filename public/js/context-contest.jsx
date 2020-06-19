import { Component } from 'inferno';
import { xferno, useSelector, useDispatch, useRenderCache } from '../../src/xferno';

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
}

class CtxProvider extends Component {
  constructor(props, ctx) {
    super(props, ctx);
    this.state = props.initialState;
    this.dispatch = (...args) => this.setState((s) => props.reducer(s, ...args));
  }

  getChildContext() {
    return {
      state: this.state,
      dispatch: this.dispatch,
    };
  }

  render() {
    return this.props.children;
  }
}

let countC = 0;
const ChildC = xferno(() => {
  const cache = useRenderCache();
  return cache() || (
    <footer>
      I should not re-render, but I have {countC++} times.
    </footer>
  );
});

let countB = 0;
const ChildB = xferno(() => {
  const cache = useRenderCache();
  const age = useSelector((s) => s.age);
  const dispatch = useDispatch();

  return cache() || (
    <p>
      Age {age}. I have rendered {countB++} times.
      <button
        onClick={() => dispatch('ageInc')}
      >
        +
      </button>
    </p>
  );
});

let countA = 0;
const ChildA = xferno(() => {
  const cache = useRenderCache();
  const name = useSelector((s) => s.name);
  const dispatch = useDispatch();

  return cache() || (
    <div>
      <h1>Name "{name}" updated {countA++} times</h1>
      <input value={name} onInput={(e) => dispatch('setName', e.target.value)} />
      <ChildB />
      <ChildC />
    </div>
  );
});

export function ContextContest() {
  return (
    <CtxProvider initialState={initialState} reducer={reducer}>
      <ChildA debug={true} />
    </CtxProvider>
  );
}
