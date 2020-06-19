import { Component } from "inferno";

let trackerStack = [];
let currentTracker;

function eq(a, b) {
  if (a === b) {
    return true;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => x === b[i]);
  }

  if (typeof a === "object" && typeof b === "object") {
    return eq(Object.values(a), Object.values(b));
  }

  return false;
}

class HookComponent extends Component {
  constructor(props, context) {
    super(props, context);
    this.id = 0;
    this.hookInstances = [];

    // If useRenderCache is called, this will be set to true, and we
    // will then only re-render if hooks change.
    this.isPure = false;

    // If isPure, this will be used to determine the result of
    // shouldComponentUpdate...
    this.shouldUpdate = true;

    // If isPure, this will be the result of our render, if
    // shouldComponentUpdate is true.
    this.renderResult;
  }

  componentWillUnmount() {
    this.hookInstances.forEach((hook) => {
      return hook && hook.dispose && hook.dispose();
    });
  }

  beginRender() {
    this.id = 0;
    if (currentTracker) {
      trackerStack.push(currentTracker);
    }
    currentTracker = this;
  }

  endRender() {
    currentTracker = trackerStack.pop();
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

  getHook(watchList) {
    const id = this.nextId();
    let hook = this.hookInstances[id];

    if (!hook || !eq(hook.watchList, watchList)) {
      if (hook && hook.dispose) {
        hook.dispose();
      }
      hook = {
        isNew: true,
        watchList,
        get value() {
          return hook.$value;
        },
        set value(value) {
          if (currentTracker.isPure) {
            currentTracker.shouldUpdate =
              currentTracker.shouldUpdate || !eq(value, hook.$value);
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

    this.shouldUpdate =
      !eq(this.props, nextProps) || !eq(this.state, nextState);
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

  renderWith(props, context) {
    this.beginRender();
    try {
      return props.render(props.props, context);
    } finally {
      this.endRender();
    }
  }
}

export function xferno(render) {
  return (props) => <HookComponent props={props} render={render} />;
}

export function useState(fn) {
  const hook = currentTracker.getHook();

  if (hook.isNew) {
    currentTracker.state = {
      value: typeof fn === "function" ? fn(currentTracker.props) : fn,
    };

    const component = currentTracker;
    hook.$setState = (setter) => {
      return component.setState((s) => ({
        value: typeof setter === "function" ? setter(s.value) : setter,
      }));
    };
  }

  hook.value = [currentTracker.state.value, hook.$setState];
  return hook.value;
}

export function useEffect(fn, watchList) {
  const hook = currentTracker.getHook(watchList);

  if (hook.isNew) {
    hook.dispose = fn();
  }
}

export function useMemo(fn, watchList) {
  const hook = currentTracker.getHook(watchList);

  if (hook.isNew) {
    hook.value = fn();
  }

  return hook.value;
}

export function useDisposable(fn, watchList) {
  const hook = currentTracker.getHook(watchList);

  if (hook.isNew) {
    const result = fn();
    hook.value = result.value;
    hook.dispose = result.dispose;
  }

  return hook.value;
}

export function useSelector(fn) {
  const hook = currentTracker.getHook();
  hook.value = fn(currentTracker.context.state);
  return hook.value;
}

export function useDispatch() {
  return currentTracker.context.dispatch;
}

export function useRenderCache() {
  return currentTracker.getRenderCache();
}
