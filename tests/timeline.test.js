import { describe, it, expect, beforeEach } from 'vitest';
import { Timeline } from '../src/engine/Timeline.js';
import { AR_TO_MS } from '../src/utils/constants.js';

describe('Timeline', () => {
  let timeline;
  let rawObjects;

  beforeEach(() => {
    timeline = new Timeline();
    
    // Create dummy objects with time
    rawObjects = [
      { time: 1000, state: 'waiting' },
      { time: 1500, state: 'waiting' },
      { time: 2000, state: 'waiting' },
    ];
    
    timeline.load(rawObjects, 5); // AR 5 -> 1200ms preempt
  });

  it('should calculate preempt time correctly', () => {
    expect(timeline.preemptMs).toBe(1200);
    
    timeline.load([], 10);
    expect(timeline.preemptMs).toBe(450); // AR 10 = 450ms
  });

  it('should return active objects within window', () => {
    // Current time: 0ms
    // Object 1 at 1000ms. Since preempt is 1200ms, it should be visible already at time 0.
    const activeAt0 = timeline.getActiveObjects(0);
    expect(activeAt0.length).toBe(1);
    expect(activeAt0[0].time).toBe(1000);

    // Current time: 500ms
    // Obj 1 (1000) and Obj 2 (1500) are visible (since 1500 - 1200 = 300)
    const activeAt500 = timeline.getActiveObjects(500);
    expect(activeAt500.length).toBe(2);

    // Current time: 2500ms
    // All objects should be considered expired (if miss window is e.g. 400ms)
    const activeAt2500 = timeline.getActiveObjects(2500);
    expect(activeAt2500.length).toBe(0);
  });

  it('should detect completion', () => {
    expect(timeline.isComplete()).toBe(false);

    rawObjects.forEach(o => o.state = 'done');
    expect(timeline.isComplete()).toBe(true);

    rawObjects[0].state = 'missed';
    expect(timeline.isComplete()).toBe(true);
  });
});
