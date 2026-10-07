import { test, expect } from '@playwright/test';
import { expandedSequence } from '../src/lib/sequence';

test('boomerang cycles join without a repeated or a missing frame', () => {
  expect(expandedSequence(4, 2)).toEqual([0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1]);
});
