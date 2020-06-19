import { Component } from 'inferno';

export function createStore(initialState, reducer) {
  const subscriptions = [];
  let state = initialState;

  return {
    getState: () => state,
    subscribe: (fn) => {
      subscriptions.push(fn);
      return () => {
        const i = subscriptions.indexOf(fn);
        if (i >= 0) {
          subscriptions.splice(i, 1);
        }
      };
    },
    dispatch: (...args) => {
      state = reducer(state, ...args);
      subscriptions.forEach((f) => f());
    },
  };
}

export class StoreProvider extends Component {
  constructor(props, ctx) {
    super(props, ctx);
    this.childContext = { store: props.store };
  }

  getChildContext() {
    return this.childContext;
  }

  render() {
    return this.props.children;
  }
}
