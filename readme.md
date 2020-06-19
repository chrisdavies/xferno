# xferno

React hooks for [infernojs](https://infernojs.org/).

## Quick example

```js
import { xferno, useState } from 'xferno';

const Counter = xferno(() => {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>{count}</button>
  );
});

```

## Installation

```
npm install --save xferno
```

## Usage

Components which use hooks *must* be wrapped in a call to `xferno`. Otherwise, the hooks will have undefined behavior.

The following "primitive" hooks are built into xferno. Custom hooks can be composed from these.

- useState
- useEffect
- useMemo
- useDisposable
- useSelector
- useDispatch
- useRenderCache

These each work similarly to the React equivalents. (Some of these have no React equivalents, though, so... keep reading.)

### useState

```js
import { xferno, useState } from 'xferno';

const Password = xferno(() => {
  // state can be a primitive for an object, etc. setState can be called
  // with a callback setState((s) => s) or with the new value for state
  // setState({ password: 'hoi' })
  const [state, setState] = useState({ password: '' });

  return (
    <input
      type="password"
      value={state.password}
      onInput={(e) => setState((s) => ({ ...s, password: e.target.value }))}
    />
  );
});
```

### useEffect

`useEffect` can be called with no arguments, in which case it will be invoked only once
for the entire life of the component. If it is given a second argument, the effect function
will be invoked any time the second argument changes. If the effect function returns a
function, that function will be invoked when the component is disposed or before the
effect re-runs, which ever comes first.

```js
import { xferno, useState, useEffect } from 'xferno';

const Clock = xferno(() => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    let timeout = setTimeout(function tick() {
      setTime(new Date());
      timeout = setTimeout(tick, 1000);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [setTime]);

  return (
    <h1>{time.toString()}</h1>
  );
});
```

### useMemo

`useMemo` is used to memoize an expensive operation. If no second argument is passed,
it will only run once (when the component first initializes) otherwise, it will re-evaluate
any time the second argument changes.


```js
import { xferno, useMemo } from 'xferno';

const Fanci = xferno((props) => {
  const name = useMemo(() => {
    return reallyExpensiveCalculationFor(props.name);
  }, props.name);

  return (
    <h1>{name}</h1>
  );
});
```

### useDisposable

`useDisposable` is like a combination of useEffect and useMemo. It allows the caller to return
a value which can be consumed by the component, but also which is cleaned up any time the first
argument is re-invoked or whenever the component is destroyed.

The first argument is a function which must return an object with a value property and a dispose function.

```js
import { xferno, useDisposable } from 'xferno';

const Video = xferno((props) => {
  const url = useDisposable(() => {
    const value = URL.createObjectURL(props.file);
    return {
      value,
      dispose: () => URL.revokeObjectURL(value),
    };
  }, props.file);

  return (
    <video src={url}></video>
  );
});
```

### useSelector

`useSelector` provides a convenient mechanism for extracting a subset of Redux state for your component.

It is used in conjunction with Redux or a similarly shaped state store.

It is expected that `context.store` is a Redux (or similar) store, with `dispatch`, `subscribe`, and `getState` methods.

You can create your own component which provides this context, or you can use `ReduxStoreProvider`to provide it (as detailed further down).

```js
import { xferno, useSelector } from 'xferno';

const Hello = xferno(() => {
  // Assuming we have Redux state that looks something like { name: 'World' }
  const name = useSelector((s) => s.name);

  return (
    <h1>Hello, {name}</h1>
  );
});
```

### useDispatch

`useDispatch` provides the Redux dispatch function to your component.

This has the same requirements regarding Redux / store as `useSelector`.

```js
import { xferno, useSelector, useDispatch } from 'xferno';

const ReduxCounter = xferno(() => {
  // Assuming we have Redux state that looks something like { count: 0 }
  const count = useSelector((s) => s.count);
  const dispatch = useDispatch();

  return (
    <button
      onClick={() => dispatch({ type: 'INC' })}
    >
      {count}
    </button>
  );
});
```

### useRenderCache

`useRenderCache` provides a mechanism for your component to avoid expensive rendering when it's not necessary.
It does this by shallow-diffing props, state, and any values returned from useSelector, and only rerenders when
one or more of those things have changed.

Let's take the `useDispatch` example from above, and avoid VDOM operations if nothing has changed.


```js
import { xferno, useSelector, useDispatch, useRenderCache } from 'xferno';

const ReduxCounter = xferno(() => {
  const cache = useRenderCache(); // <- This line is new
  const count = useSelector((s) => s.count);
  const dispatch = useDispatch();

  // Note the use of cache() here
  return cache() || (
    <button
      onClick={() => dispatch({ type: 'INC' })}
    >
      {count}
    </button>
  );
});
```

## ReduxStoreProvider

If you want to use Redux (or something similar), you need to provide the Redux store to the useSelector and useDispatch hooks.

To do this, you can use `ReduxStoreProvider` somewhere near the root of your application.

```jsx
import { ReduxStoreProvider } from 'xferno';

// ... reducer, initial state, etc omitted for brevity...

const store = createStore(reducer, initialValue);

function Main() {
  return (
    <ReduxStoreProvider store={store}>
      <OtherComponentsHere />
    </ReduxStoreProvider>
  );
}
```

## License

MIT
