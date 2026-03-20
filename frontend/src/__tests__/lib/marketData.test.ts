import { describe, it, expect } from 'vitest';
import { formatLargeUsd, formatPercent, formatBtcPrice } from '../../lib/marketData.js';

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
