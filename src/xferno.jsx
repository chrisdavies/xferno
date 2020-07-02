import { Component } from 'inferno';
import { eq } from './eq';
import * as inferno from 'inferno';
import { VNodeFlags } from 'inferno-vnode-flags';

const emptyProps = {};

/**
 * currentComponent tracks hook state for the currently rendering component.
 * When an xferno component is rendered, its hook state tracker becomes currentComponent.
 * When rendering is complete, the previous tracker, if any, is restored.
 */
let currentComponent;

function renderChild(component, { child, childProps }, context) {
  // Push ourselves onto the hook stack
  const prevTracker = currentComponent;
  currentComponent = component;

  try {
    return child(childProps || emptyProps, context);
  } finally {
    // Pop ourselves off of the hook stack
    currentComponent = prevTracker;
  }
}

function createTracker(component) {
  // Used to generate sequential hook ids for this component
  // the sequenial requirement is why hooks can't be in conditionals.
  let nextId = 0;

  // The list of hooks which have been instantiated for this component,
  // this is keyed by hook id. Hook instances are used to determine if
  // the hook value has changed, as well as to track cleanup requirements.
  const hookInstances = [];

  // Used if useSelector is ever invoked. We have a single Redux-like
  // store subscription per component, and we clean it up when we're done.
  let unsubscribeFromStore = undefined;

  // Determines whether or not the component should update.
  let shouldUpdate = true;

  // Setup the component's state so we can use it for useState and useSelector.
  component.state = {};

  function nextHook(watchList) {
    const id = nextId++;
    let hook = hookInstances[id];

    if (hook && eq(hook.watchList, watchList)) {
      hook.isNew = false;
      return hook;
    }

    if (hook && hook.dispose) {
      hook.dispose();
    }

    hook = {
      id,
      isNew: true,
      watchList,
    };

    hookInstances[id] = hook;
    return hook;
  }

  const tracker = {
    // We pre-render in shouldComponentUpdate, in order to avoid v-dom diffs.
    // This is the result of that render, and will be our return value from our
    // render.
    renderResult: undefined,

    /**
     * Get the state of the Redux store (context.store.getState()). This
     * has a side-effect of ensuring that we are subscribed to the store
     * so that we re-render if one of our subscriptions changes, even if
     * a parent component's shouldComponentUpdate returns false.
     */
    getStoreState() {
      if (!unsubscribeFromStore) {
        const store = component.context.store;
        component.state.storeState = store.getState();
        unsubscribeFromStore = store.subscribe(() => {
          component.setState((s) => {
            s.storeState = store.getState();
            return s;
          });
        });
      }

      return component.state.storeState;
    },

    /**
     * Get the next hook in the hook sequence.
     * @param {*} watchList An item which is used to determine if the hook needs to be re-initialized
     */
    getHook(watchList, fn) {
      const hook = nextHook(watchList);
      const value = hook.value;
      fn(hook);
      shouldUpdate = shouldUpdate || !eq(hook.value, value);
      return hook.value;
    },

    shouldComponentUpdate(nextProps, nextState, context) {
      // We'll always update if the child props change.
      shouldUpdate = !eq(component.props.childProps, nextProps.childProps);

      // This ensures that any calls to useState will get the latest state.
      component.state = nextState;

      // When we begin a render pass, we need to reset our hook ids,
      // so that the sequence is consistent between render calls.
      nextId = 0;

      // We cache the result of the render, so that we don't *double* render.
      const renderResult = renderChild(component, nextProps, context);

      // We only want to set this.renderResult if we are updating. Because otherwise, it's
      // a boolean (bypassing the possibly expensive v-dom generation).
      if (shouldUpdate) {
        tracker.renderResult = renderResult;
      }

      return shouldUpdate;
    },

    dispose() {
      // Clean our Redux subscription.
      if (unsubscribeFromStore) {
        unsubscribeFromStore();
      }

      // If any hooks have a dispose, we will clean them up.
      hookInstances.forEach((hook) => {
        return hook && hook.dispose && hook.dispose();
      });
    },
  };

  return tracker;
}

class HookComponent extends Component {
  constructor(props, context) {
    super(props, context);
  }

  dispose() {
    if (this.tracker) {
      this.tracker.dispose();
    }
    this.state = undefined;
    this.tracker = undefined;
  }

  componentWillReceiveProps({ child }) {
    // We're switching components, so we need to do a full reset...
    if (child !== this.props.child) {
      this.dispose();
    }
  }

  componentWillUnmount() {
    this.dispose();
  }

  getHook(watchList, fn) {
    if (!this.tracker) {
      this.tracker = createTracker(this);
    }
    return this.tracker.getHook(watchList, fn);
  }

  /**
   * We do some tomfoolery to determine if we really need to re-render. We need
   * to run the hooks in order to know if re-rendering is necessary, and the
   * hooks only run when we *render* the child. So we actually need to render
   * the child.
   */
  shouldComponentUpdate(nextProps, nextState, context) {
    if (!this.tracker) {
      return true;
    }

    return this.tracker.shouldComponentUpdate(nextProps, nextState, context);
  }

  render() {
    return this.tracker ? this.tracker.renderResult : renderChild(this, this.props, this.context);
  }
}

/**
 * These inferno exports are required in order for xferno to be
 * compatible with babel-plugin-inferno.
 */
export const createVNode = inferno.createVNode;
export const normalizeProps = inferno.normalizeProps;
export const createTextVNode = inferno.createTextVNode;
export const createFragment = inferno.createFragment;

/**
 * Here, we override inferno's createComponentVNode if the node being created
 * is a functional component. In that case we wrap it in our HookComponent.
 */
export function createComponentVNode(flags, type, props, key, ref) {
  if (type.prototype instanceof inferno.Component) {
    return inferno.createComponentVNode(flags, type, props, key, ref);
  }

  return inferno.createComponentVNode(
    VNodeFlags.ComponentUnknown,
    HookComponent,
    { child: type, childProps: props },
    key,
    ref,
  );
}

/**
 * Returns a stateful value, and a function to update it.
 * @param {T|() => T} initialState - The initial state or a function which returns the initial state.
 * @returns {[T, (T|(T) => T)]} An array [state, setState]
 */
export function useState(initialState) {
  return currentComponent.getHook(0, (hook) => {
    if (hook.isNew) {
      currentComponent.state[hook.id] =
        typeof initialState === 'function' ? initialState() : initialState;

      const component = currentComponent;
      hook.$setState = (setter) => {
        const s = component.state;
        const state = s[hook.id];
        const nextState = typeof setter === 'function' ? setter(s[hook.id]) : setter;
        // Exit early if the state is unchanged. This means we don't
        // really support state mutation.
        if (state === nextState) {
          return;
        }
        // We mutate here, purely as a micro optimization, probably not necessary, but
        // the way we've written this, it's fine.
        return component.setState((s) => {
          s[hook.id] = nextState;
          return s;
        });
      };
    }

    hook.value = [currentComponent.state[hook.id], hook.$setState];
  });
}

/**
 * Run the specified effect anytime watchList changes.
 * @param {function} fn - The effect to be run
 * @param {*} watchList - The value or array of values to be watched. fn will be re-run if this changes.
 */
export function useEffect(fn, watchList) {
  return currentComponent.getHook(watchList, (hook) => {
    if (hook.isNew) {
      hook.dispose = fn();
    }
  });
}

/**
 * Run the specified function any time watchList changes, memoize and return the result.
 * @param {() => T} fn - The function to be run
 * @param {*} watchList - The value or array of values to be watched. fn will be re-run if this changes.
 * @returns {T} the result of calling fn()
 */
export function useMemo(fn, watchList) {
  return currentComponent.getHook(watchList, (hook) => {
    if (hook.isNew) {
      hook.value = fn();
    }
  });
}

/**
 * Run the specified function any time watchList changes, memoize and return result.value.
 * The return result's dispose function will be called whenever fn is reinvoked and / or
 * when the component is disposed.
 * @param {() => { value: T, dispose: function }} fn - The function which will return the disposable value
 * @param {*} watchList - The value or array of values to be watched. fn will be re-run if this changes.
 * @returns {T} the .value property of result of calling fn()
 */
export function useDisposable(fn, watchList) {
  return currentComponent.getHook(watchList, (hook) => {
    if (hook.isNew) {
      const result = fn();
      hook.value = result.value;
      hook.dispose = result.dispose;
    }
  });
}

/**
 * Get a subset of Redux (or similar state manager store) state.
 * @param {(TState) => TResult} fn - A function taking Redux state, and returning the desired subset.
 * @returns {TResult} the result of calling fn with the current Redux state.
 */
export function useSelector(fn) {
  return currentComponent.getHook(0, (hook) => {
    hook.value = fn(currentComponent.tracker.getStoreState());
  });
}

/**
 * Get the Redux (or similar state manager store) dispatch function.
 * @returns {Dispatch} The Redux (or Redux-like store) dispatch function.
 */
export function useDispatch() {
  return currentComponent.context.store.dispatch;
}
