import { eq } from './eq';

test('primitives, null, undefined, etc', async () => {
  expect(eq(null, undefined)).toBeFalsy();
  expect(eq(null, null)).toBeTruthy();
  expect(eq(undefined, undefined)).toBeTruthy();
  expect(eq('hello', 'hello')).toBeTruthy();
  expect(eq('hello', 'HELLO')).toBeFalsy();
  expect(eq(1, 2)).toBeFalsy();
  expect(eq(2, 2)).toBeTruthy();
});

test('arrays are shallow compared', async () => {
  const a = {};

  expect(eq([], [])).toBeTruthy();
  expect(eq([1, 2], [1, 2])).toBeTruthy();
  expect(eq([1, 2], [1, 2, 3])).toBeFalsy();
  expect(eq([1, 2], [1, 3])).toBeFalsy();
  expect(eq([a], [a])).toBeTruthy();
  expect(eq([{}], [{}])).toBeFalsy();
});

test('objects are shallow compared', async () => {
  const a = {};

  expect(eq(a, a)).toBeTruthy();
  expect(eq({ hello: 'world' }, { hello: 'world' })).toBeTruthy();
  expect(eq({ hello: 'world' }, { hello: 'worlds' })).toBeFalsy();
  expect(eq({ hello: 'world' }, { hi: 'world' })).toBeFalsy();
  expect(eq({ hello: 'world' }, {})).toBeFalsy();
});
