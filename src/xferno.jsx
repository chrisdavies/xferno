import { Component } from 'inferno';
import { eq } from './eq';
import * as inferno from 'inferno';
import { VNodeFlags } from 'inferno-vnode-flags';

const emptyProps = {};

/**
 * currentTracker tracks hook state for the currently rendering component.
 * When an xferno component is rendered, its hook state tracker becomes currentTracker.
 * When rendering is complete, the previous tracker, if any, is restored.
 */
let currentTracker;

class HookComponent extends Component {
  constructor(props, context) {
    super(props, context);
    this.reset();
  }

  reset() {
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

    // Used if useSelector is ever invoked. We have a single Redux-like
    // store subscription per component, and we clean it up when we're done.
    this.unsubscribeFromStore = undefined;

    // Determines whether or not the component should update.
    this.shouldUpdate = true;

    // We pre-render in shouldComponentUpdate, in order to avoid v-dom diffs.
    // This is the result of that render, and will be our return value from our
    // render.
    this.renderResult = undefined;
  }

  componentWillReceiveProps({ child }) {
    if (child !== this.props.child) {
      this.dispose();
      this.reset();
    }
  }

  dispose() {
    // Clean our Redux subscription.
    if (this.unsubscribeFromStore) {
      this.unsubscribeFromStore();
    }

    // If any hooks have a dispose, we will clean them up.
    this.hookInstances.forEach((hook) => {
      return hook && hook.dispose && hook.dispose();
    });
  }

  componentWillUnmount() {
    this.dispose();
  }

  nextId() {
    return this.id++;
  }

  /**
   * Get the state of the Redux store (context.store.getState()). This
   * has a side-effect of ensuring that we are subscribed to the store
   * so that we re-render if one of our subscriptions changes, even if
   * a parent component's shouldComponentUpdate returns false.
   */
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

  /**
   * Get the Redux dispatch out of the context.
   */
  getDispatch() {
    return this.context.store.dispatch;
  }

  /**
   * Get the next hook in the hook sequence.
   * @param {*} watchList An item which is used to determine if the hook needs to be re-initialized
   */
  getHook(watchList) {
    const id = this.nextId();
    let hook = this.hookInstances[id];
    let value;

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
      get value() {
        return value;
      },
      set value(v) {
        currentTracker.shouldUpdate = currentTracker.shouldUpdate || !eq(v, value);
        value = v;
      },
    };

    this.hookInstances[id] = hook;
    return hook;
  }

  /**
   * We do some tomfoolery to determine if we really need to re-render. We need
   * to run the hooks in order to know if re-rendering is necessary, and the
   * hooks only run when we *render* the child. So we actually need to render
   * the child.
   */
  shouldComponentUpdate(nextProps, nextState, context) {
    // We'll always update if the child props change.
    this.shouldUpdate = !eq(this.props.childProps, nextProps.childProps);

    // This ensures that any calls to useState will get the latest state.
    this.state = nextState;

    // We cache the result of the render, so that we don't *double* render.
    const renderResult = this.renderWith(nextProps, context);

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

  renderWith({ childProps, child }, context) {
    // Push ourselves onto the hook stack
    const prevTracker = currentTracker;
    currentTracker = this;

    // When we begin a render pass, we need to reset our hook ids,
    // so that the sequence is consistent between render calls.
    this.id = 0;

    try {
      return child(childProps || emptyProps, context);
    } finally {
      // Pop ourselves off of the hook stack
      currentTracker = prevTracker;
    }
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
export const createComponentVNode = (flags, type, props, key, ref) => {
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
};

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
