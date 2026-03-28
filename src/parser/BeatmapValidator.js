/**
 * @fileoverview Beatmap validator.
 */
export class BeatmapValidator {
  static validate(beatmap) {
    const errors = [];
    
    if (!beatmap.general) errors.push('Missing [General] section');
    if (!beatmap.hitObjects || beatmap.hitObjects.length === 0) {
      errors.push('No HitObjects found');
    }
    
    // Mode must be standard osu! (0)
    if (beatmap.general && beatmap.general.mode !== 0) {
      errors.push(`Unsupported mode: ${beatmap.general.mode}. Only Standard (0) is supported.`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
