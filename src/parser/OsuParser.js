/**
 * @fileoverview OsuParser — parses .osu (osu! standard) beatmap files.
 *
 * Supports osu! file format v14 (current).
 * Sections parsed: [General], [Metadata], [Difficulty], [TimingPoints], [HitObjects]
 *
 * Reference: https://osu.ppy.sh/wiki/en/Client/File_formats/osu_(file_format)
 */

import { HitObjectType, SliderType } from '../utils/constants.js';

/**
 * @typedef {{
 *   general: Object,
 *   metadata: Object,
 *   difficulty: {
 *     hpDrainRate: number,
 *     circleSize: number,
 *     overallDifficulty: number,
 *     approachRate: number,
 *     sliderMultiplier: number,
 *     sliderTickRate: number,
 *   },
 *   timingPoints: TimingPoint[],
 *   hitObjects: RawHitObject[],
 *   audioUrl: string | null,
 *   version: number,
 * }} Beatmap
 *
 * @typedef {{
 *   time: number,
 *   beatLength: number,
 *   meter: number,
 *   sampleSet: number,
 *   sampleIndex: number,
 *   volume: number,
 *   uninherited: boolean,
 *   effects: number,
 *   bpm: number,         // populated for uninherited points
 *   velocity: number,    // slider velocity multiplier for inherited
 * }} TimingPoint
 *
 * @typedef {{
 *   x: number,
 *   y: number,
 *   time: number,
 *   type: number,
 *   hitSound: number,
 *   isCircle: boolean,
 *   isSlider: boolean,
 *   isSpinner: boolean,
 *   newCombo: boolean,
 *   comboSkip: number,
 *   // Slider extra
 *   curveType?: string,
 *   curvePoints?: Array<{x:number,y:number}>,
 *   slides?: number,
 *   length?: number,
 *   edgeSounds?: number[],
 *   edgeSets?: string[],
 *   // Spinner extra
 *   endTime?: number,
 *   // Hit extras
 *   hitSample?: string,
 * }} RawHitObject
 */

export class OsuParser {
  /**
   * Parse a .osu file string into a structured Beatmap object.
   * @param {string} text - Raw .osu file content
   * @param {string} [audioBaseUrl] - Base URL to resolve the audio file
   * @returns {Beatmap}
   */
  static parse(text, audioBaseUrl = '') {
    const lines   = text.split(/\r?\n/);
    const sections = OsuParser._splitSections(lines);

    const version = OsuParser._parseVersion(lines[0]);

    const general     = OsuParser._parseGeneral(sections['General'] ?? []);
    const metadata    = OsuParser._parseMetadata(sections['Metadata'] ?? []);
    const difficulty  = OsuParser._parseDifficulty(sections['Difficulty'] ?? []);
    const timingPoints = OsuParser._parseTimingPoints(sections['TimingPoints'] ?? []);
    const hitObjects  = OsuParser._parseHitObjects(sections['HitObjects'] ?? []);

    // Resolve audio URL
    let audioUrl = null;
    if (general.audioFilename && audioBaseUrl) {
      audioUrl = `${audioBaseUrl.replace(/\/$/, '')}/${general.audioFilename}`;
    }

    return { version, general, metadata, difficulty, timingPoints, hitObjects, audioUrl };
  }

  // ─────────────────────────────────────────────
  // SECTION SPLITTING
  // ─────────────────────────────────────────────

  static _splitSections(lines) {
    const sections = {};
    let currentSection = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//')) continue;

      const sectionMatch = trimmed.match(/^\[(.+)\]$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1];
        sections[currentSection] = [];
      } else if (currentSection) {
        sections[currentSection].push(trimmed);
      }
    }
    return sections;
  }

  static _parseVersion(firstLine) {
    const match = (firstLine ?? '').match(/osu file format v(\d+)/);
    return match ? parseInt(match[1]) : 14;
  }

  // ─────────────────────────────────────────────
  // [General]
  // ─────────────────────────────────────────────

  static _parseGeneral(lines) {
    const kv = OsuParser._parseKeyValue(lines);
    return {
      audioFilename:     kv['AudioFilename'] ?? null,
      audioLeadIn:       parseInt(kv['AudioLeadIn'] ?? '0'),
      previewTime:       parseInt(kv['PreviewTime'] ?? '-1'),
      countdown:         parseInt(kv['Countdown'] ?? '0'),
      sampleSet:         kv['SampleSet'] ?? 'Normal',
      stackLeniency:     parseFloat(kv['StackLeniency'] ?? '0.7'),
      mode:              parseInt(kv['Mode'] ?? '0'),
      letterboxInBreaks: kv['LetterboxInBreaks'] === '1',
      widescreenStoryboard: kv['WidescreenStoryboard'] === '1',
    };
  }

  // ─────────────────────────────────────────────
  // [Metadata]
  // ─────────────────────────────────────────────

  static _parseMetadata(lines) {
    const kv = OsuParser._parseKeyValue(lines);
    return {
      title:         kv['Title'] ?? '',
      titleUnicode:  kv['TitleUnicode'] ?? '',
      artist:        kv['Artist'] ?? '',
      artistUnicode: kv['ArtistUnicode'] ?? '',
      creator:       kv['Creator'] ?? '',
      version:       kv['Version'] ?? '',
      source:        kv['Source'] ?? '',
      tags:          (kv['Tags'] ?? '').split(' ').filter(Boolean),
      beatmapId:     parseInt(kv['BeatmapID'] ?? '0'),
      beatmapSetId:  parseInt(kv['BeatmapSetID'] ?? '-1'),
    };
  }

  // ─────────────────────────────────────────────
  // [Difficulty]
  // ─────────────────────────────────────────────

  static _parseDifficulty(lines) {
    const kv = OsuParser._parseKeyValue(lines);
    return {
      hpDrainRate:       parseFloat(kv['HPDrainRate'] ?? '5'),
      circleSize:        parseFloat(kv['CircleSize'] ?? '4'),
      overallDifficulty: parseFloat(kv['OverallDifficulty'] ?? '5'),
      approachRate:      parseFloat(kv['ApproachRate'] ?? kv['OverallDifficulty'] ?? '5'),
      sliderMultiplier:  parseFloat(kv['SliderMultiplier'] ?? '1.4'),
      sliderTickRate:    parseFloat(kv['SliderTickRate'] ?? '1'),
    };
  }

  // ─────────────────────────────────────────────
  // [TimingPoints]
  // ─────────────────────────────────────────────

  static _parseTimingPoints(lines) {
    const points = [];
    let lastBpm = 120;

    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length < 2) continue;

      const time       = parseFloat(parts[0]);
      const beatLength = parseFloat(parts[1]);
      const meter      = parseInt(parts[2] ?? '4');
      const sampleSet  = parseInt(parts[3] ?? '0');
      const sampleIndex = parseInt(parts[4] ?? '0');
      const volume     = parseInt(parts[5] ?? '100');
      const uninherited = parts[6]?.trim() === '1';
      const effects    = parseInt(parts[7] ?? '0');

      let bpm = lastBpm;
      let velocity = 1;

      if (uninherited) {
        bpm = beatLength > 0 ? 60000 / beatLength : lastBpm;
        lastBpm = bpm;
      } else {
        // Inherited: beatLength is negative slider velocity multiplier
        velocity = beatLength < 0 ? -100 / beatLength : 1;
      }

      points.push({ time, beatLength, meter, sampleSet, sampleIndex, volume, uninherited, effects, bpm, velocity });
    }
    return points;
  }

  // ─────────────────────────────────────────────
  // [HitObjects]
  // ─────────────────────────────────────────────

  static _parseHitObjects(lines) {
    const objects = [];

    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length < 4) continue;

      const x        = parseInt(parts[0]);
      const y        = parseInt(parts[1]);
      const time     = parseInt(parts[2]);
      const type     = parseInt(parts[3]);
      const hitSound = parseInt(parts[4] ?? '0');

      const isCircle  = !!(type & HitObjectType.CIRCLE);
      const isSlider  = !!(type & HitObjectType.SLIDER);
      const isSpinner = !!(type & HitObjectType.SPINNER);
      const newCombo  = !!(type & HitObjectType.NEW_COMBO);
      const comboSkip = (type & HitObjectType.COMBO_COLOR) >> 4;

      const obj = { x, y, time, type, hitSound, isCircle, isSlider, isSpinner, newCombo, comboSkip };

      if (isSlider && parts.length >= 8) {
        const curvePart  = parts[5];
        const slides     = parseInt(parts[6] ?? '1');
        const length     = parseFloat(parts[7] ?? '0');
        const edgeSounds = parts[8]?.split('|').map(Number) ?? [];
        const edgeSets   = parts[9]?.split('|') ?? [];

        const [curveTypeChar, ...rawPoints] = curvePart.split('|');
        const curveType   = curveTypeChar ?? SliderType.BEZIER;
        const curvePoints = rawPoints.map((p) => {
          const [px, py] = p.split(':').map(Number);
          return { x: px, y: py };
        });

        Object.assign(obj, { curveType, curvePoints, slides, length, edgeSounds, edgeSets });
      }

      if (isSpinner && parts.length >= 6) {
        obj.endTime = parseInt(parts[5]);
      }

      obj.hitSample = parts[parts.length - 1] ?? '';

      objects.push(obj);
    }

    return objects;
  }

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  static _parseKeyValue(lines) {
    const result = {};
    for (const line of lines) {
      const idx = line.indexOf(':');
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      result[key] = val;
    }
    return result;
  }

  /**
   * Get BPM at a specific time (uses timing points).
   * @param {TimingPoint[]} timingPoints
   * @param {number} time
   * @returns {number}
   */
  static getBpmAt(timingPoints, time) {
    let bpm = 120;
    for (const tp of timingPoints) {
      if (tp.time > time) break;
      if (tp.uninherited) bpm = tp.bpm;
    }
    return bpm;
  }

  /**
   * Get slider velocity multiplier at a specific time.
   * @param {TimingPoint[]} timingPoints
   * @param {number} time
   * @returns {number}
   */
  static getVelocityAt(timingPoints, time) {
    let velocity = 1;
    for (const tp of timingPoints) {
      if (tp.time > time) break;
      if (!tp.uninherited) velocity = tp.velocity;
    }
    return velocity;
  }
}
