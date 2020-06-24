import { useState, useEffect, useDisposable, useMemo, useDispatch, useSelector } from './xferno';
import { ReduxStoreProvider } from './redux-store-provider';
import * as util from 'inferno-test-utils';

function emit(eventName, node, eventArgs) {
  node.$EV[eventName](eventArgs);
}

test('renders using state', async () => {
  const Hello = ({ name }) => {
    const [count] = useState(42);
    return (
      <h1>
        Hi {name} {count}
      </h1>
    );
  };

  const rendered = util.renderIntoContainer(<Hello name="George" />);
  const [h1] = util.scryRenderedDOMElementsWithTag(rendered, 'h1');
  expect(h1.innerHTML).toMatchInlineSnapshot(`"Hi George 42"`);
});

test('ensures that props is not empty', async () => {
  const Hello = ({ name }) => {
    return <h1>Hey. {name || 'You are awesome.'}</h1>;
  };

  const rendered = util.renderIntoContainer(<Hello />);
  const [h1] = util.scryRenderedDOMElementsWithTag(rendered, 'h1');
  expect(h1.innerHTML).toMatchInlineSnapshot(`"Hey. You are awesome."`);
});

test('multiple useStates are allowed', async () => {
  const Hello = ({ name }) => {
    const [count, setState] = useState(42);
    const [lastName, setLastName] = useState('Cat');

    return (
      <>
        <h1 onClick={() => setState((x) => x + 1)}>
          Hi {name} {lastName} {count}
        </h1>
        <button onClick={() => setLastName(lastName + 't')}>add a t</button>
      </>
    );
  };

  const rendered = util.renderIntoContainer(<Hello name="George" />);
  const [h1] = util.scryRenderedDOMElementsWithTag(rendered, 'h1');
  const [btn] = util.scryRenderedDOMElementsWithTag(rendered, 'button');

  emit('onClick', h1);

  expect(h1.innerHTML).toMatchInlineSnapshot(`"Hi George Cat 43"`);

  emit('onClick', btn);

  expect(h1.innerHTML).toMatchInlineSnapshot(`"Hi George Catt 43"`);
});

test('dynamic component switching works', async () => {
  const childMap = {
    a({ name, setName }) {
      const [state] = useState('ahoy');
      return (
        <button onClick={() => setName('b')}>
          {state} {name}
        </button>
      );
    },
    b({ name, setName }) {
      const [state] = useState('there');
      return (
        <button onClick={() => setName('a')}>
          {state} {name}
        </button>
      );
    },
  };

  const Hello = () => {
    const [name, setName] = useState('a');
    const Child = childMap[name];

    return <Child name={name} setName={setName} />;
  };

  const rendered = util.renderIntoContainer(<Hello />);
  const [btn] = util.scryRenderedDOMElementsWithTag(rendered, 'button');

  expect(btn.innerHTML).toMatchInlineSnapshot(`"ahoy a"`);

  emit('onClick', btn);

  expect(btn.innerHTML).toMatchInlineSnapshot(`"there b"`);

  emit('onClick', btn);

  expect(btn.innerHTML).toMatchInlineSnapshot(`"ahoy a"`);
});

test('effects only run once', () => {
  const fx = jest.fn();
  const Hello = () => {
    const [count, setState] = useState(0);
    useEffect(fx);
    return <h1 onClick={() => setState(count + 1)}>Count is {count}</h1>;
  };

  const rendered = util.renderIntoContainer(<Hello />);
  const [h1] = util.scryRenderedDOMElementsWithTag(rendered, 'h1');

  emit('onClick', h1);

  expect(fx).toHaveBeenCalledTimes(1);
  expect(h1.innerHTML).toMatchInlineSnapshot(`"Count is 1"`);
});

test('effects are disposed when unmounted', () => {
  const dispose = jest.fn();
  const fx = jest.fn(() => dispose);

  const Child = () => {
    useEffect(fx);
    return <span>Child</span>;
  };

  const Hello = () => {
    const [count, setState] = useState(0);

    return (
      <h1 onClick={() => setState(count + 1)}>
        Count is {count}
        {count < 2 && <Child />}
      </h1>
    );
  };

  const rendered = util.renderIntoContainer(<Hello />);
  const [h1] = util.scryRenderedDOMElementsWithTag(rendered, 'h1');

  emit('onClick', h1);

  expect(fx).toHaveBeenCalledTimes(1);
  expect(dispose).not.toHaveBeenCalled();

  emit('onClick', h1);

  expect(dispose).toHaveBeenCalledTimes(1);
});

test('use disposable is disposed of', () => {
  const dispose = jest.fn();
  const fx = jest.fn(() => ({ value: 'World', dispose }));

  const Hello = () => {
    const [count, setState] = useState(0);
    const name = useDisposable(fx, count < 2);

    return <h1 onClick={() => setState(count + 1)}>Hello, {name}</h1>;
  };

  const rendered = util.renderIntoContainer(<Hello />);
  const [h1] = util.scryRenderedDOMElementsWithTag(rendered, 'h1');

  expect(h1.innerHTML).toMatchInlineSnapshot(`"Hello, World"`);

  emit('onClick', h1);

  expect(fx).toHaveBeenCalledTimes(1);
  expect(dispose).not.toHaveBeenCalled();

  emit('onClick', h1);

  expect(dispose).toHaveBeenCalledTimes(1);
});

test('use memo is only called when its watch list changes', () => {
  const fx = jest.fn((count) => `Count is ${count}`);

  const Hello = () => {
    const [count, setState] = useState(0);
    const name = useMemo(() => fx(count), [Math.floor(count / 2)]);
    return <h1 onClick={() => setState(count + 1)}>{name}</h1>;
  };

  const rendered = util.renderIntoContainer(<Hello />);
  const [h1] = util.scryRenderedDOMElementsWithTag(rendered, 'h1');

  expect(h1.innerHTML).toMatchInlineSnapshot(`"Count is 0"`);

  emit('onClick', h1);

  expect(h1.innerHTML).toMatchInlineSnapshot(`"Count is 0"`);

  emit('onClick', h1);

  expect(h1.innerHTML).toMatchInlineSnapshot(`"Count is 2"`);

  expect(fx).toHaveBeenCalledTimes(2);
});

test('useDispatch dispatches to the contextual store', () => {
  const mockDispatch = jest.fn();

  const Hello = () => {
    const dispatch = useDispatch();
    return <button onClick={() => dispatch('iwasclicked')}>Click me!</button>;
  };

  const Test = () => (
    <ReduxStoreProvider store={{ dispatch: mockDispatch }}>
      <Hello />
    </ReduxStoreProvider>
  );

  const rendered = util.renderIntoContainer(<Test />);
  const [btn] = util.scryRenderedDOMElementsWithTag(rendered, 'button');

  expect(mockDispatch).not.toHaveBeenCalled();

  emit('onClick', btn);

  expect(mockDispatch).toHaveBeenCalledTimes(1);
  expect(mockDispatch).toHaveBeenCalledWith('iwasclicked');
});

test('useSelector retrieves the value from state, and redraws when the value changes', () => {
  let state = { name: 'George' };
  const subscriptions = [];
  const store = {
    getState: () => state,
    subscribe: (fn) => subscriptions.push(fn),
  };

  const Hello = () => {
    const name = useSelector((s) => s.name);
    return <h1>{name}</h1>;
  };

  const Test = () => (
    <ReduxStoreProvider store={store}>
      <Hello />
    </ReduxStoreProvider>
  );

  const rendered = util.renderIntoContainer(<Test />);
  const [h1] = util.scryRenderedDOMElementsWithTag(rendered, 'h1');

  expect(h1.innerHTML).toMatchInlineSnapshot(`"George"`);
  state = { name: 'George Orwell' };
  subscriptions.forEach((f) => f());
  expect(h1.innerHTML).toMatchInlineSnapshot(`"George Orwell"`);
});

test('components unsubscribe from stores when they are disposed', () => {
  let state = { name: 'George' };
  const subscriptions = [];
  const unsubscribe = jest.fn();
  const store = {
    getState: () => state,
    subscribe: (fn) => {
      subscriptions.push(fn);
      return unsubscribe;
    },
  };

  const Hello = () => {
    const name = useSelector((s) => s.name);
    return <h1>{name}</h1>;
  };

  const ShowHello = () => {
    const [show, setShow] = useState(true);
    return (
      <div>
        {show && <Hello />}
        <button onClick={() => setShow(false)}>Hide</button>
      </div>
    );
  };

  const Test = () => (
    <ReduxStoreProvider store={store}>
      <ShowHello />
    </ReduxStoreProvider>
  );

  const rendered = util.renderIntoContainer(<Test />);
  const [h1] = util.scryRenderedDOMElementsWithTag(rendered, 'h1');
  const [btn] = util.scryRenderedDOMElementsWithTag(rendered, 'button');

  expect(h1.innerHTML).toMatchInlineSnapshot(`"George"`);
  expect(unsubscribe).not.toHaveBeenCalled();

  emit('onClick', btn);

  expect(unsubscribe).toHaveBeenCalled();
});
