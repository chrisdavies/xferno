// This implementation runs at roughly 200 fps, peak is around 215
import { render, Component } from 'inferno';
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

const store = createStore(initialState, reducer);

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

function Age({ age, dispatch }) {
  return (
    <>
      <button onClick={() => dispatch('ageInc')}>
        <span>{age}</span>
      </button>
      <span>
        {' fps: '}
        {fps()}
      </span>
    </>
  );
}

class Counter extends Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      count: 0,
    };
    this.timeout = undefined;
  }

  componentDidMount() {
    const me = this;
    const ms = 1;
    me.timeout = setTimeout(function tick() {
      me.props.dispatch('ageInc');
      me.timeout = setTimeout(tick, ms);
    }, ms);
    return () => {
      console.log('Cleared!!');
      clearTimeout(timeout);
    };
  }

  componentWillUnmount() {
    clearTimeout(this.timeout);
  }

  render() {
    const { count } = this.state;
    <button onClick={() => this.setState({ count: count + 1 })}>{count}</button>;
  }
}

function Name({ name, age, dispatch }) {
  return (
    <div>
      <h1>Your name is, {name}</h1>
      <div>
        <label>Enter your name</label>
        <input value={name} onInput={(e) => dispatch('setName', e.target.value)} />
      </div>
      <div>
        <label>Your age is</label>
        <Age age={age} dispatch={dispatch} />
      </div>
      <div>
        <label>Counter is ...</label>
        <Counter dispatch={dispatch} />
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer>
      <strong>This</strong> is the <em>footer</em>.
    </footer>
  );
}

class Main extends Component {
  constructor(props, context) {
    super(props, context);
    this.store = store;
    this.state = store.getState();
    this.unsubscribe = store.subscribe(() => {
      this.setState(store.getState());
    });
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  render() {
    return (
      <main>
        <h1>Xferno demo</h1>
        <Name name={this.state.name} age={this.state.age} dispatch={this.store.dispatch} />
        <Footer />
      </main>
    );
  }
}

render(<Main />, document.body);
