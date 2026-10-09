import { test, expect } from '@playwright/test';
import { cyclesForDuration, expandedSequence } from '../src/lib/sequence';

test('boomerang cycles join without a repeated or a missing frame', () => {
  expect(expandedSequence(4, 2)).toEqual([0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1]);
});

test('cycle count fills the duration and is never below one', () => {
  expect(cyclesForDuration(4, 15, 2)).toBe(5); // 30 frames over 6-frame cycles
  expect(cyclesForDuration(4, 1, 1)).toBe(1);
});
