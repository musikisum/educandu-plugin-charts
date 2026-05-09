import { beforeEach, describe, expect, it } from 'vitest';
import ChartsInfo from './charts-info.js';

describe('charts-info', () => {
  let sut;

  beforeEach(() => {
    sut = new ChartsInfo();
  });

  describe('getDefaultContent', () => {
    it('returns chart mode with bar type and empty data', () => {
      const result = sut.getDefaultContent();
      expect(result.mode).toBe('chart');
      expect(result.chartType).toBe('bar');
      expect(result.chartData).toStrictEqual({ labels: [], datasets: [] });
    });
  });

  describe('validateContent', () => {
    it('accepts minimal valid chart content', () => {
      expect(() => sut.validateContent({
        mode: 'chart',
        chartType: 'bar',
        chartData: { labels: [], datasets: [] }
      })).not.toThrow();
    });

    it('accepts chart content with valid axis range', () => {
      expect(() => sut.validateContent({
        mode: 'chart',
        chartType: 'line',
        axisMin: 0,
        axisMax: 100,
        chartData: { labels: ['Jan'], datasets: [{ label: 'A', data: [50] }] }
      })).not.toThrow();
    });

    it('rejects chart content when axisMin >= axisMax', () => {
      expect(() => sut.validateContent({
        mode: 'chart',
        chartType: 'bar',
        axisMin: 10,
        axisMax: 5,
        chartData: { labels: [], datasets: [] }
      })).toThrow();
    });

    it('accepts valid voting content', () => {
      expect(() => sut.validateContent({
        mode: 'voting',
        votingId: 'abc123',
        questions: [
          { key: 'q1', text: 'Question?', options: [{ key: 'o1', text: 'A' }, { key: 'o2', text: 'B' }] }
        ],
        isLocked: false,
        results: null
      })).not.toThrow();
    });

    it('accepts voting content with empty questions array (initial state)', () => {
      expect(() => sut.validateContent({
        mode: 'voting',
        votingId: 'abc',
        questions: [],
        isLocked: false,
        results: null
      })).not.toThrow();
    });

    it('rejects voting content without votingId', () => {
      expect(() => sut.validateContent({
        mode: 'voting',
        questions: [{ key: 'q1', text: 'Q?', options: [{ key: 'o1', text: 'A' }] }],
        isLocked: false,
        results: null
      })).toThrow();
    });
  });

  describe('cloneContent', () => {
    it('deep clones chart content without mutation', () => {
      const original = { mode: 'chart', chartType: 'bar', chartData: { labels: ['Jan'], datasets: [] }, axisMin: null, axisMax: null };
      const clone = sut.cloneContent(original);
      clone.chartData.labels.push('Feb');
      expect(original.chartData.labels).toStrictEqual(['Jan']);
    });

    it('resets lock state, results and generates a new votingId for voting content', () => {
      const original = {
        mode: 'voting',
        votingId: 'original-id',
        questions: [{ key: 'q1', text: 'Q?', options: [{ key: 'o1', text: 'A' }] }],
        isLocked: true,
        results: { q1: { o1: 5 } }
      };
      const clone = sut.cloneContent(original);
      expect(clone.isLocked).toBe(false);
      expect(clone.results).toBeNull();
      expect(clone.votingId).not.toBe('original-id');
    });

    it('preserves questions when cloning voting content', () => {
      const original = {
        mode: 'voting',
        votingId: 'vid',
        questions: [{ key: 'q1', text: 'Q?', options: [{ key: 'o1', text: 'A' }] }],
        isLocked: false,
        results: null
      };
      const clone = sut.cloneContent(original);
      expect(clone.questions).toStrictEqual(original.questions);
    });
  });
});
