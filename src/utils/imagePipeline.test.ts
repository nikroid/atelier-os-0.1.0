import { describe, expect, it } from 'vitest';
import { computeScaledDimensions, VARIANT_SPECS } from './imagePipeline';

describe('imagePipeline', () => {
  it('scales down when longest side exceeds max', () => {
    const result = computeScaledDimensions(4000, 2000, VARIANT_SPECS.display.maxSide);
    expect(result.width).toBe(1600);
    expect(result.height).toBe(800);
  });

  it('keeps dimensions when already within max', () => {
    const result = computeScaledDimensions(200, 150, VARIANT_SPECS.thumb.maxSide);
    expect(result).toEqual({ width: 200, height: 150 });
  });

  it('original variant caps at 3000px', () => {
    const result = computeScaledDimensions(6000, 4000, VARIANT_SPECS.original.maxSide);
    expect(Math.max(result.width, result.height)).toBe(3000);
  });

  it('never returns zero dimensions', () => {
    const result = computeScaledDimensions(1, 10000, 300);
    expect(result.width).toBeGreaterThanOrEqual(1);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });
});
