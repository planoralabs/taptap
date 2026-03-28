import { describe, it, expect, beforeEach } from 'vitest';
import { ScoreEngine } from '../src/engine/ScoreEngine.js';

describe('ScoreEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new ScoreEngine();
    engine.configure({ od: 5, hp: 5, totalObjects: 10 });
  });

  it('should register a GREAT hit correctly', () => {
    const result = engine.registerHit(10, 0, 0); // 10ms error
    
    expect(result.label).toBe('300');
    expect(engine.combo).toBe(1);
    expect(engine.n300).toBe(1);
    expect(engine.score).toBeGreaterThan(0);
  });

  it('should reset combo on MISS', () => {
    engine.registerHit(10, 0, 0);
    expect(engine.combo).toBe(1);
    
    const missResult = engine.registerMiss(0, 0);
    expect(missResult.label).toBe('MISS');
    expect(engine.combo).toBe(0);
    expect(engine.nMiss).toBe(1);
  });

  it('should calculate accuracy correctly', () => {
    engine.registerHit(10, 0, 0); // 300
    engine.registerHit(10, 0, 0); // 300
    engine.registerHit(120, 0, 0); // 100 (assuming OD 5 allows 100 at 120ms)
    engine.registerMiss(0, 0); // Miss

    // Accuracy = (300*2 + 100*0 + 50*1 + 0*1) / (300*4) * 100
    // = 650 / 1200 * 100 = 54.166%
    expect(engine.accuracy).toBeCloseTo(54.17, 2);
    expect(engine.grade).toBe('D');
  });

  it('should grant SS for perfect play', () => {
    for(let i=0; i<10; i++) engine.registerHit(5, 0, 0);
    expect(engine.grade).toBe('SS');
    expect(engine.accuracy).toBe(100);
  });
});
