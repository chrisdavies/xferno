export function createStore(reducer, initialState) {
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
