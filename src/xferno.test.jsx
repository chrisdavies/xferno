import { xferno, useState, useEffect, useDisposable, useMemo } from './xferno';
import * as util from 'inferno-test-utils';

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

test('updates state', async () => {
  const Hello = xferno(({ name }) => {
    const [count, setState] = useState(42);
    return (
      <h1 onClick={() => setState((x) => x + 1)}>
        Hi {name} {count}
      </h1>
    );
  });

  const rendered = util.renderIntoContainer(<Hello name="George" />);
  const [h1] = util.scryRenderedDOMElementsWithTag(rendered, 'h1');

  emit('onClick', h1);

  expect(h1.innerHTML).toMatchInlineSnapshot(`"Hi George 43"`);
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
