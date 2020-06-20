import { Component } from 'inferno';
import { eq } from './eq';

/**
 * currentTracker tracks hook state for the currently rendering component.
 * When an xferno component is rendered, its hook state tracker becomes currentTracker.
 * When rendering is complete, the previous tracker, if any, is restored.
 */
let currentTracker;

class HookComponent extends Component {
  constructor(props, context) {
    super(props, context);
    // Used to generate sequential hook ids for this component
    // the sequenial requirement is why hooks can't be in conditionals.
    this.id = 0;

    // The list of hooks which have been instantiated for this component,
    // this is keyed by hook id. Hook instances are used to determine if
    // the hook value has changed, as well as to track cleanup requirements.
    this.hookInstances = [];

    // We use state to track: hook state for the useState hook, and to
    // track store state for the useSelector hook. Both mutate state,
    // simply as a slight optimization. useState stores its state in
    // this.state[hookId], and useSelector stores the Redux-like store
    // state in this.state.storeState.
    this.state = {};

    // Used to prevent us from accidentally using the wrong hook context.
    this.prevTracker;

    // Used if useSelector is ever invoked. We have a single Redux-like
    // store subscription per component, and we clean it up when we're done.
    this.unsubscribeFromStore = undefined;

    // If useRenderCache is called, this will be set to true, and we
    // will then only re-render if hooks change.
    this.isPure = false;

    // If isPure, this will be used to determine the result of
    // shouldComponentUpdate... see useRenderCache for more details.
    this.shouldUpdate = true;

    // If isPure, this will be the result of our render, if
    // shouldComponentUpdate is true. See useRenderCache for more details.
    this.renderResult = undefined;
  }

  componentWillUnmount() {
    // Clean our Redux subscription.
    if (this.unsubscribeFromStore) {
      this.unsubscribeFromStore();
    }

    // If any hooks have a dispose, we will clean them up.
    this.hookInstances.forEach((hook) => {
      return hook && hook.dispose && hook.dispose();
    });
  }

  nextId() {
    return this.id++;
  }

  getRenderCache() {
    if (!this.renderCache) {
      this.isPure = true;
      this.renderCache = () => !this.shouldUpdate;
    }
    return this.renderCache;
  }

  getStoreState() {
    if (!this.unsubscribeFromStore) {
      this.state.storeState = this.context.store.getState();
      this.unsubscribeFromStore = this.context.store.subscribe(() => {
        this.setState((s) => {
          s.storeState = this.context.store.getState();
          return s;
        });
      });
    }

    return this.state.storeState;
  }

  getDispatch() {
    return this.context.store.dispatch;
  }

  getHook(watchList) {
    const id = this.nextId();
    let hook = this.hookInstances[id];

    if (!hook || !eq(hook.watchList, watchList)) {
      if (hook && hook.dispose) {
        hook.dispose();
      }
      hook = {
        id,
        isNew: true,
        watchList,
        get value() {
          return hook.$value;
        },
        set value(value) {
          if (currentTracker.isPure) {
            currentTracker.shouldUpdate = currentTracker.shouldUpdate || !eq(value, hook.$value);
          }
          hook.$value = value;
        },
      };
      this.hookInstances[id] = hook;
    } else {
      hook.isNew = false;
    }

    return hook;
  }

  shouldComponentUpdate(nextProps, nextState, context) {
    if (!this.isPure) {
      return true;
    }

    this.shouldUpdate = !eq(this.props, nextProps);
    this.context = context;
    this.state = nextState;
    const renderResult = this.renderWith(nextProps, this.context);

    // We only want to set this.renderResult if we are updating. Because otherwise, it's
    // a boolean (bypassing the possibly expensive v-dom generation).
    if (this.shouldUpdate) {
      this.renderResult = renderResult;
    }

    return this.shouldUpdate;
  }

  render() {
    return this.renderResult || this.renderWith(this.props, this.context);
  }

  renderWith({ props, render }, context) {
    // When we begin a render pass, we need to reset our hook ids,
    // so that the sequence is consistent between render calls.
    this.id = 0;

    // Keep track of the previous hook state, in case we're doing
    // nested hook invocations.
    this.prevTracker = currentTracker;

    // Assign our global hook tracker, so all hook calls get
    // the correct context.
    currentTracker = this;

    try {
      return render(props, context);
    } finally {
      // Restore the hook state for whatever component invoked us.
      currentTracker = this.prevTracker;
    }
  }
}

/**
 * Create a hook-enabled inferno component.
 *
 * @param {FunctionalComponent} render The Inferno function component being wrapped.
 */
export function xferno(render) {
  return (props) => <HookComponent props={props} render={render} />;
}

/**
 * Returns a stateful value, and a function to update it.
 * @param {T|() => T} initialState - The initial state or a function which returns the initial state.
 * @returns {[T, (T|(T) => T)]} An array [state, setState]
 */
export function useState(initialState) {
  const hook = currentTracker.getHook();

  if (hook.isNew) {
    currentTracker.state[hook.id] =
      typeof initialState === 'function' ? initialState() : initialState;

    const component = currentTracker;
    hook.$setState = (setter) => {
      return component.setState((s) => {
        s[hook.id] = typeof setter === 'function' ? setter(s[hook.id]) : setter;
        return s;
      });
    };
  }

  hook.value = [currentTracker.state[hook.id], hook.$setState];
  return hook.value;
}

/**
 * Run the specified effect anytime watchList changes.
 * @param {function} fn - The effect to be run
 * @param {*} watchList - The value or array of values to be watched. fn will be re-run if this changes.
 */
export function useEffect(fn, watchList) {
  const hook = currentTracker.getHook(watchList);

  if (hook.isNew) {
    hook.dispose = fn();
  }
}

/**
 * Run the specified function any time watchList changes, memoize and return the result.
 * @param {() => T} fn - The function to be run
 * @param {*} watchList - The value or array of values to be watched. fn will be re-run if this changes.
 * @returns {T} the result of calling fn()
 */
export function useMemo(fn, watchList) {
  const hook = currentTracker.getHook(watchList);

  if (hook.isNew) {
    hook.value = fn();
  }

  return hook.value;
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
  const hook = currentTracker.getHook(watchList);

  if (hook.isNew) {
    const result = fn();
    hook.value = result.value;
    hook.dispose = result.dispose;
  }

  return hook.value;
}

/**
 * Get a subset of Redux (or similar state manager store) state.
 * @param {(TState) => TResult} fn - A function taking Redux state, and returning the desired subset.
 * @returns {TResult} the result of calling fn with the current Redux state.
 */
export function useSelector(fn) {
  const hook = currentTracker.getHook();
  hook.value = fn(currentTracker.getStoreState());
  return hook.value;
}

/**
 * Get the Redux (or similar state manager store) dispatch function.
 * @returns {Dispatch} The Redux (or Redux-like store) dispatch function.
 */
export function useDispatch() {
  return currentTracker.getDispatch();
}

/**
 * Get a function which can be used to bypass expensive rendering.
 * @returns {() => boolean} A function which returns true if the render result is already cached and can be skipped, otherwise false.
 */
export function useRenderCache() {
  return currentTracker.getRenderCache();
}
