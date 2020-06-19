import { Component } from 'inferno';
import {
  xferno,
  useState,
  useEffect,
  useDisposable,
  useMemo,
  useDispatch,
  useSelector,
  useRenderCache,
} from './xferno';
import * as util from 'inferno-test-utils';

class TestProvider extends Component {
  getChildContext() {
    return { store: this.props.store };
  }

  render() {
    return this.props.children;
  }
}

function emit(eventName, node, eventArgs) {
  node.$EV[eventName](eventArgs);
}

test('renders using state', async () => {
  const Hello = xferno(({ name }) => {
    const [count] = useState(42);
    return (
      <h1>
        Hi {name} {count}
      </h1>
    );
  });

  const rendered = util.renderIntoContainer(<Hello name="George" />);
  const [h1] = util.scryRenderedDOMElementsWithTag(rendered, 'h1');
  expect(h1.innerHTML).toMatchInlineSnapshot(`"Hi George 42"`);
});

test('multiple useStates are allowed', async () => {
  const Hello = xferno(({ name }) => {
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
  });

  const rendered = util.renderIntoContainer(<Hello name="George" />);
  const [h1] = util.scryRenderedDOMElementsWithTag(rendered, 'h1');
  const [btn] = util.scryRenderedDOMElementsWithTag(rendered, 'button');

  emit('onClick', h1);

  expect(h1.innerHTML).toMatchInlineSnapshot(`"Hi George Cat 43"`);

  emit('onClick', btn);

  expect(h1.innerHTML).toMatchInlineSnapshot(`"Hi George Catt 43"`);
});

test('effects only run once', () => {
  const fx = jest.fn();
  const Hello = xferno(() => {
    const [count, setState] = useState(0);
    useEffect(fx);
    return <h1 onClick={() => setState(count + 1)}>Count is {count}</h1>;
  });

  const rendered = util.renderIntoContainer(<Hello />);
  const [h1] = util.scryRenderedDOMElementsWithTag(rendered, 'h1');

  emit('onClick', h1);

  expect(fx).toHaveBeenCalledTimes(1);
  expect(h1.innerHTML).toMatchInlineSnapshot(`"Count is 1"`);
});

test('effects are disposed when unmounted', () => {
  const dispose = jest.fn();
  const fx = jest.fn(() => dispose);

  const Child = xferno(() => {
    useEffect(fx);
    return <span>Child</span>;
  });

  const Hello = xferno(() => {
    const [count, setState] = useState(0);

    return (
      <h1 onClick={() => setState(count + 1)}>
        Count is {count}
        {count < 2 && <Child />}
      </h1>
    );
  });

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

  const Hello = xferno(() => {
    const [count, setState] = useState(0);
    const name = useDisposable(fx, count < 2);

    return <h1 onClick={() => setState(count + 1)}>Hello, {name}</h1>;
  });

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

  const Hello = xferno(() => {
    const [count, setState] = useState(0);
    const name = useMemo(() => fx(count), [Math.floor(count / 2)]);
    return <h1 onClick={() => setState(count + 1)}>{name}</h1>;
  });

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

  const Hello = xferno(() => {
    const dispatch = useDispatch();
    return <button onClick={() => dispatch('iwasclicked')}>Click me!</button>;
  });

  const Test = () => (
    <TestProvider store={{ dispatch: mockDispatch }}>
      <Hello />
    </TestProvider>
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

  const Hello = xferno(() => {
    const name = useSelector((s) => s.name);
    return <h1>{name}</h1>;
  });

  const Test = () => (
    <TestProvider store={store}>
      <Hello />
    </TestProvider>
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

  const Hello = xferno(() => {
    const name = useSelector((s) => s.name);
    return <h1>{name}</h1>;
  });

  const ShowHello = xferno(() => {
    const [show, setShow] = useState(true);
    return (
      <div>
        {show && <Hello />}
        <button onClick={() => setShow(false)}>Hide</button>
      </div>
    );
  });

  const Test = () => (
    <TestProvider store={store}>
      <ShowHello />
    </TestProvider>
  );

  const rendered = util.renderIntoContainer(<Test />);
  const [h1] = util.scryRenderedDOMElementsWithTag(rendered, 'h1');
  const [btn] = util.scryRenderedDOMElementsWithTag(rendered, 'button');

  expect(h1.innerHTML).toMatchInlineSnapshot(`"George"`);
  expect(unsubscribe).not.toHaveBeenCalled();

  emit('onClick', btn);

  expect(unsubscribe).toHaveBeenCalled();
});

test('renderCache and useSelector work together', () => {
  const ageCount = jest.fn();
  const nameCount = jest.fn();
  let state = { name: 'George', age: 100 };
  const subscriptions = [];

  const setState = (s) => {
    state = s;
    subscriptions.forEach((f) => f());
  };

  const store = {
    getState: () => state,
    subscribe: (fn) => subscriptions.push(fn),
  };

  const Age = xferno(() => {
    const cache = useRenderCache();
    const age = useSelector((s) => s.age);
    return (
      cache() || (
        <h2>
          {age}
          {ageCount()}
        </h2>
      )
    );
  });

  const Name = xferno(() => {
    const cache = useRenderCache();
    const name = useSelector((s) => s.name);
    return (
      cache() || (
        <>
          <h1>
            {name}
            {nameCount()}
          </h1>
          <Age />
        </>
      )
    );
  });

  const Test = () => (
    <TestProvider store={store}>
      <Name />
    </TestProvider>
  );

  const rendered = util.renderIntoContainer(<Test />);
  const [h1] = util.scryRenderedDOMElementsWithTag(rendered, 'h1');
  const [h2] = util.scryRenderedDOMElementsWithTag(rendered, 'h2');

  expect(h1.innerHTML).toMatchInlineSnapshot(`"George"`);
  expect(h2.innerHTML).toMatchInlineSnapshot(`"100"`);
  expect(ageCount).toHaveBeenCalledTimes(1);
  expect(nameCount).toHaveBeenCalledTimes(1);

  setState({ name: 'George Orwell', age: 100 });

  expect(h1.innerHTML).toMatchInlineSnapshot(`"George Orwell"`);
  expect(h2.innerHTML).toMatchInlineSnapshot(`"100"`);
  expect(ageCount).toHaveBeenCalledTimes(1);
  expect(nameCount).toHaveBeenCalledTimes(2);

  setState({ name: 'George Orwell', age: 128 });

  expect(h1.innerHTML).toMatchInlineSnapshot(`"George Orwell"`);
  expect(h2.innerHTML).toMatchInlineSnapshot(`"128"`);
  expect(ageCount).toHaveBeenCalledTimes(2);
  expect(nameCount).toHaveBeenCalledTimes(2);
});
