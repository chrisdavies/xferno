import { Component } from 'inferno';

export function createStore(initialState, reducer) {
  const subscriptions = [];
  let state = initialState;

  return {
    getState: () => state,
    subscribe: (fn) => subscriptions.push(fn),
    dispatch: (...args) => {
      state = reducer(state, ...args);
      subscriptions.forEach((f) => f());
    },
  };
}

export class StoreProvider extends Component {
  constructor(props, ctx) {
    super(props, ctx);
    this.state = props.store.getState();
    this.dispatch = props.store.dispatch;
    props.store.subscribe(() => this.setState(store.getState()));
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
