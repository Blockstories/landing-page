import { describe, it, expect } from 'vitest';
import { formatLargeUsd, formatPercent, formatBtcPrice, pricesToSvgPath } from '../../lib/marketData.js';

describe('formatLargeUsd', () => {
  it('returns em dash for null', () => {
    expect(formatLargeUsd(null)).toBe('—');
  });
  it('formats trillions with 2 decimal places', () => {
    expect(formatLargeUsd(3_420_000_000_000)).toBe('$3.42T');
  });
  it('formats billions rounded to whole number', () => {
    expect(formatLargeUsd(218_000_000_000)).toBe('$218B');
  });
  it('formats millions with 1 decimal place', () => {
    expect(formatLargeUsd(1_200_000)).toBe('$1.2M');
  });
});

describe('formatPercent', () => {
  it('returns em dash for null', () => {
    expect(formatPercent(null)).toBe('—');
  });
  it('formats positive with up arrow and plus sign', () => {
    expect(formatPercent(2.4)).toBe('▲ +2.4%');
  });
  it('formats negative with down arrow and ASCII hyphen-minus', () => {
    expect(formatPercent(-1.1)).toBe('▼ -1.1%');
  });
  it('formats zero without arrow', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });
});

describe('formatBtcPrice', () => {
  it('returns em dash for null', () => {
    expect(formatBtcPrice(null)).toBe('—');
  });
  it('formats price with dollar sign and comma separator', () => {
    expect(formatBtcPrice(94280)).toBe('$94,280');
  });
  it('rounds to whole number', () => {
    expect(formatBtcPrice(94280.9)).toBe('$94,281');
  });
});

describe('pricesToSvgPath', () => {
  it('returns empty strings for empty array', () => {
    const result = pricesToSvgPath([]);
    expect(result.line).toBe('');
    expect(result.fill).toBe('');
  });

  it('returns empty strings for single-price array', () => {
    const result = pricesToSvgPath([50000]);
    expect(result.line).toBe('');
    expect(result.fill).toBe('');
  });

  it('maps two prices to correct start and end x positions', () => {
    const result = pricesToSvgPath([100, 200]);
    // x(0) = 0, x(1) = 200
    expect(result.line).toMatch(/^M 0\.00,/);
    expect(result.line).toMatch(/L 200\.00,/);
  });

  it('maps flat prices to y=20 (center)', () => {
    const result = pricesToSvgPath([50000, 50000, 50000]);
    // All y values should be 20.00 when min === max
    const points = result.line.replace('M ', '').split(' L ');
    points.forEach(pt => {
      expect(pt.split(',')[1]).toBe('20.00');
    });
  });

  it('fill path closes at bottom corners', () => {
    const result = pricesToSvgPath([100, 200]);
    expect(result.fill).toContain('L 200,40 L 0,40 Z');
  });

  it('fill path starts with same points as line path', () => {
    const result = pricesToSvgPath([100, 200]);
    const linePoints = result.line.replace('M ', '');
    expect(result.fill.startsWith('M ' + linePoints)).toBe(true);
  });
});
