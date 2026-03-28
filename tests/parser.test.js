import { describe, it, expect } from 'vitest';
import { OsuParser } from '../src/parser/OsuParser.js';

describe('OsuParser', () => {
  it('should parse basic hit circles and metadata', () => {
    const rawOsu = `
osu file format v14

[General]
AudioFilename: audio.mp3
Mode: 0

[Metadata]
Title: Test Song
Artist: Test Artist

[Difficulty]
OverallDifficulty: 7
ApproachRate: 9

[TimingPoints]
0,500,4,1,0,100,1,0

[HitObjects]
256,192,1000,1,0,0:0:0:0:
300,100,1500,5,0,0:0:0:0:
`;

    const beatmap = OsuParser.parse(rawOsu);

    expect(beatmap.version).toBe(14);
    expect(beatmap.general.audioFilename).toBe('audio.mp3');
    expect(beatmap.general.mode).toBe(0);
    expect(beatmap.metadata.title).toBe('Test Song');
    expect(beatmap.difficulty.approachRate).toBe(9);
    
    expect(beatmap.hitObjects.length).toBe(2);
    expect(beatmap.hitObjects[0].isCircle).toBe(true);
    expect(beatmap.hitObjects[0].time).toBe(1000);
    
    // Type 5 = 1 (Circle) | 4 (New Combo)
    expect(beatmap.hitObjects[1].isCircle).toBe(true);
    expect(beatmap.hitObjects[1].newCombo).toBe(true);
  });

  it('should parse sliders', () => {
    const rawOsu = `
[HitObjects]
100,100,1000,2,0,B|200:200|300:100,1,100
`;
    const beatmap = OsuParser.parse(rawOsu);
    expect(beatmap.hitObjects.length).toBe(1);
    
    const slider = beatmap.hitObjects[0];
    expect(slider.isSlider).toBe(true);
    expect(slider.curveType).toBe('B');
    expect(slider.slides).toBe(1);
    expect(slider.length).toBe(100);
    expect(slider.curvePoints.length).toBe(2); // The piped points
    expect(slider.curvePoints[0].x).toBe(200);
  });
});
