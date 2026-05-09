import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import {
  collectLatestVotes,
  getDataRange,
  parseChartWorkbook,
  parseVotingText
} from './charts-utils.js';

function makeWorkbook(data) {
  const ws = XLSX.utils.aoa_to_sheet(data);
  return { SheetNames: ['Sheet1'], Sheets: { Sheet1: ws } };
}

describe('parseChartWorkbook', () => {
  it('parses standard format (first col = labels, first row = dataset names)', () => {
    const wb = makeWorkbook([
      [null, 'Dataset1', 'Dataset2'],
      ['Jan', 10, 5],
      ['Feb', 20, 15]
    ]);
    const { chartData, error } = parseChartWorkbook(wb);
    expect(error).toBeNull();
    expect(chartData.labels).toStrictEqual(['Jan', 'Feb']);
    expect(chartData.datasets).toHaveLength(2);
    expect(chartData.datasets[0]).toStrictEqual({ label: 'Dataset1', data: [10, 20] });
    expect(chartData.datasets[1]).toStrictEqual({ label: 'Dataset2', data: [5, 15] });
  });

  it('returns parseErrorTooFewRows for single-row sheet', () => {
    const wb = makeWorkbook([[null, 'Dataset1']]);
    const { error } = parseChartWorkbook(wb);
    expect(error).toBe('parseErrorTooFewRows');
  });

  it('returns parseErrorTooFewColumns for single-column sheet', () => {
    const wb = makeWorkbook([[null], ['Jan'], ['Feb']]);
    const { error } = parseChartWorkbook(wb);
    expect(error).toBe('parseErrorTooFewColumns');
  });

  it('returns parseWarningEmptyCells when data cells are missing', () => {
    const wb = makeWorkbook([
      [null, 'Dataset1'],
      ['Jan', 10],
      ['Feb', null]
    ]);
    const { chartData, warnings } = parseChartWorkbook(wb);
    expect(chartData).not.toBeNull();
    expect(warnings).toContain('parseWarningEmptyCells');
  });

  it('returns parseErrorNoData when all cells are empty or text', () => {
    const wb = makeWorkbook([
      [null, 'Dataset1'],
      ['Jan', 'kein Wert'],
      ['Feb', 'auch nicht']
    ]);
    const { error } = parseChartWorkbook(wb);
    expect(error).toBe('parseErrorNoData');
  });
});

describe('parseVotingText', () => {
  it('parses text with multiple questions and options', () => {
    const text = '@@Frage 1?\nOption A\nOption B\n@@Frage 2?\nOption C\nOption D';
    const { questions, error } = parseVotingText(text);
    expect(error).toBeNull();
    expect(questions).toHaveLength(2);
    expect(questions[0].text).toBe('Frage 1?');
    expect(questions[0].options).toHaveLength(2);
    expect(questions[0].options[0].text).toBe('Option A');
  });

  it('returns parseErrorNoData for empty input', () => {
    const { error } = parseVotingText('');
    expect(error).toBe('parseErrorNoData');
  });

  it('ignores questions that have no options', () => {
    const { error } = parseVotingText('@@Frage ohne Optionen');
    expect(error).toBe('parseErrorNoData');
  });

  it('assigns unique keys to questions and options', () => {
    const text = '@@Frage?\nOption A\nOption B';
    const { questions } = parseVotingText(text);
    expect(questions[0].key).toBeTruthy();
    expect(questions[0].options[0].key).not.toBe(questions[0].options[1].key);
  });
});

describe('collectLatestVotes', () => {
  it('returns one vote per user (first occurrence wins)', () => {
    const inputs = [
      { createdBy: { _id: 'u1' }, sections: { s1: { data: { vid1: { q1: 'o1' } } } } },
      { createdBy: { _id: 'u1' }, sections: { s2: { data: { vid1: { q1: 'o2' } } } } },
      { createdBy: { _id: 'u2' }, sections: { s3: { data: { vid1: { q1: 'o2' } } } } }
    ];
    const votes = collectLatestVotes(inputs, 'vid1');
    expect(votes).toHaveLength(2);
    expect(votes[0]).toStrictEqual({ q1: 'o1' });
  });

  it('ignores inputs without matching votingId', () => {
    const inputs = [
      { createdBy: { _id: 'u1' }, sections: { s1: { data: { otherId: { q1: 'o1' } } } } }
    ];
    const votes = collectLatestVotes(inputs, 'vid1');
    expect(votes).toHaveLength(0);
  });

  it('handles string userId (non-populated createdBy)', () => {
    const inputs = [
      { createdBy: 'u1', sections: { s1: { data: { vid1: { q1: 'o1' } } } } }
    ];
    const votes = collectLatestVotes(inputs, 'vid1');
    expect(votes).toHaveLength(1);
  });
});

describe('getDataRange', () => {
  it('returns min and max across all datasets', () => {
    const chartData = { datasets: [{ data: [5, 10] }, { data: [1, 20] }] };
    expect(getDataRange(chartData)).toStrictEqual({ min: 1, max: 20 });
  });

  it('returns null for empty datasets array', () => {
    expect(getDataRange({ datasets: [] })).toBeNull();
  });

  it('returns null for datasets with no values', () => {
    expect(getDataRange({ datasets: [{ data: [] }] })).toBeNull();
  });
});
