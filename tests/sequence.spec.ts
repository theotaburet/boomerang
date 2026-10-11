import { test, expect } from '@playwright/test';
import { cyclesForDuration, expandedSequence, fitRect } from '../src/lib/sequence';

test('boomerang cycles join without a repeated or a missing frame', () => {
  expect(expandedSequence(4, 2)).toEqual([0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1]);
});

test('cycle count fills the duration and is never below one', () => {
  expect(cyclesForDuration(4, 15, 2)).toBe(5); // 30 frames over 6-frame cycles
  expect(cyclesForDuration(4, 1, 1)).toBe(1);
});

test('fitRect letterboxes with contain and crops with cover', () => {
  const inner = { x: 10, y: 10, w: 80, h: 80 };
  expect(fitRect(64, 32, 100, 100, 10, 'contain')).toEqual({ dx: 10, dy: 30, dw: 80, dh: 40, inner });
  expect(fitRect(64, 32, 100, 100, 10, 'cover')).toEqual({ dx: -30, dy: 10, dw: 160, dh: 80, inner });
});
