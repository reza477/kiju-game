import test from 'node:test';
import assert from 'node:assert/strict';
import {waitForBrowserCondition} from './helpers/browser-condition.mjs';

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

test('browser condition awaits an async false result before polling for true', async () => {
  let attempts = 0;
  const predicate = async expected => { await delay(5); return ++attempts === expected; };
  const page = {evaluate: (fn, argument) => fn(argument)};
  await waitForBrowserCondition(page, predicate, 3, {timeoutMs: 500, pollingMs: 1});
  assert.equal(attempts, 3);
});

test('a browser evaluation that never settles cannot outlive the Node deadline', async () => {
  let attempts = 0;
  const page = {evaluate: () => { attempts++; return new Promise(() => {}); }};
  const started = performance.now();
  await assert.rejects(waitForBrowserCondition(page, () => true, undefined, {timeoutMs: 30}), /Timed out after 30ms/);
  const elapsed = performance.now() - started;
  assert.ok(elapsed >= 20 && elapsed < 1000, `The 30ms deadline took ${elapsed}ms.`);
  assert.equal(attempts, 1);
});

test('navigation context destruction is retried without resetting the deadline', async () => {
  let attempts = 0;
  const page = {evaluate: async () => {
    attempts++;
    if (attempts === 1) throw new Error('Execution context was destroyed, most likely because of a navigation.');
    if (attempts === 2) throw new Error('Protocol error (Runtime.callFunctionOn): Cannot find context with specified id');
    return true;
  }};
  await waitForBrowserCondition(page, () => true, undefined, {timeoutMs: 500, pollingMs: 1});
  assert.equal(attempts, 3);
  page.evaluate = async () => { throw new Error('Execution context was destroyed'); };
  await assert.rejects(waitForBrowserCondition(page, () => true, undefined, {timeoutMs: 30, pollingMs: 1}), /Timed out after 30ms/);
});

test('predicate errors and a closed browser propagate without retry', async () => {
  for (const error of [new Error('Save verification failed'), new Error('Target page, context or browser has been closed')]) {
    let attempts = 0;
    const page = {evaluate: async () => { attempts++; throw error; }};
    await assert.rejects(waitForBrowserCondition(page, () => true), actual => actual === error);
    assert.equal(attempts, 1);
  }
});

test('a polling interval longer than the remaining budget cannot extend the wait', async () => {
  let attempts = 0;
  const page = {evaluate: async () => { attempts++; return false; }};
  const started = performance.now();
  await assert.rejects(waitForBrowserCondition(page, () => false, undefined, {timeoutMs: 30, pollingMs: 5000}), /Timed out after 30ms/);
  assert.ok(performance.now() - started < 1000);
  assert.equal(attempts, 1);
});
