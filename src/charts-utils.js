import * as XLSX from 'xlsx';
import uniqueId from '@educandu/educandu/utils/unique-id.js';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function parseChartWorkbook(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (rows.length < 2) {
    return { chartData: null, error: 'parseErrorTooFewRows', warnings: [] };
  }
  if (!rows[0] || rows[0].length < 1) {
    return { chartData: null, error: 'parseErrorTooFewColumns', warnings: [] };
  }

  let hasEmptyCells = false;
  let hasTextCells = false;

  const toNum = cell => {
    if (typeof cell === 'number') { return cell; }
    if (typeof cell === 'string' && !isNaN(Number(cell))) { return Number(cell); }
    if (typeof cell === 'undefined' || cell === null) { hasEmptyCells = true; return 0; }
    hasTextCells = true;
    return 0;
  };

  const topLeftCell = rows[0][0];
  const isTransposed = topLeftCell !== null && typeof topLeftCell !== 'undefined' && String(topLeftCell).trim() !== '';

  let datasets;
  let labels;

  if (isTransposed) {
    labels = rows[0].map(cell => String(cell ?? ''));
    const dataRows = rows.slice(1);
    if (!dataRows.length) {
      return { chartData: null, error: 'parseErrorTooFewRows', warnings: [] };
    }
    datasets = dataRows.map((row, i) => ({
      label: dataRows.length === 1 ? '' : String(i + 1),
      data: labels.map((_, colIdx) => toNum(row[colIdx]))
    }));
  } else {
    if (rows[0].length < 2) {
      return { chartData: null, error: 'parseErrorTooFewColumns', warnings: [] };
    }
    const datasetNames = rows[0].slice(1).map(String);
    const dataRows = rows.slice(1);
    labels = dataRows.map(row => String(row[0] ?? ''));
    datasets = datasetNames.map((name, colIdx) => ({
      label: name,
      data: dataRows.map(row => toNum(row[colIdx + 1]))
    }));
  }

  const allZero = datasets.every(ds => ds.data.every(v => v === 0));
  if (allZero && (hasEmptyCells || hasTextCells)) {
    return { chartData: null, error: 'parseErrorNoData', warnings: [] };
  }

  const warnings = [];
  if (hasTextCells) { warnings.push('parseWarningTextCells'); }
  if (hasEmptyCells) { warnings.push('parseWarningEmptyCells'); }

  return { chartData: { labels, datasets }, error: null, warnings };
}

export function parseVotingWorkbook(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (!rows.length) {
    return { questions: null, error: 'parseErrorTooFewRows' };
  }

  const colCount = rows.reduce((acc, row) => Math.max(acc, Array.isArray(row) ? row.length : 0), 0);
  if (colCount < 1) {
    return { questions: null, error: 'parseErrorTooFewColumns' };
  }

  const questions = [];
  for (let col = 0; col < colCount; col += 1) {
    const questionText = String(rows[0]?.[col] ?? '').trim();
    if (questionText) {
      const options = [];
      for (let row = 1; row < rows.length; row += 1) {
        const optionText = String(rows[row]?.[col] ?? '').trim();
        if (optionText) {
          options.push({ key: uniqueId.create(), text: optionText });
        }
      }
      if (options.length >= 1) {
        questions.push({ key: uniqueId.create(), text: questionText, options });
      }
    }
  }

  if (!questions.length) {
    return { questions: null, error: 'parseErrorNoData' };
  }

  return { questions, error: null };
}

export function parseVotingText(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const questions = [];
  let current = null;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      if (current && current.options.length >= 1) { questions.push(current); }
      current = { key: uniqueId.create(), text: line.slice(2).trim(), options: [] };
    } else if (current) {
      current.options.push({ key: uniqueId.create(), text: line });
    }
  }
  if (current && current.options.length >= 1) { questions.push(current); }

  if (!questions.length) { return { questions: null, error: 'parseErrorNoData' }; }
  return { questions, error: null };
}

export function readFile(file, onLoad, onError) {
  const reader = new FileReader();
  const isText = /\.(csv|txt)$/i.test(file.name);
  reader.onload = e => {
    const workbook = isText
      ? XLSX.read(e.target.result, { type: 'string' })
      : XLSX.read(e.target.result, { type: 'array' });
    onLoad(workbook);
  };
  reader.onerror = () => onError?.();
  if (isText) { reader.readAsText(file); } else { reader.readAsArrayBuffer(file); }
}

export function collectLatestVotes(documentInputs, votingId) {
  const latestVoteByUser = new Map();
  for (const input of documentInputs) {
    const userId = input.createdBy?._id ?? input.createdBy;
    if (userId && !latestVoteByUser.has(userId)) {
      for (const section of Object.values(input.sections)) {
        const vote = section.data?.[votingId];
        if (vote && typeof vote === 'object') {
          latestVoteByUser.set(userId, vote);
          break;
        }
      }
    }
  }
  return [...latestVoteByUser.values()];
}

export function getDataRange(chartData) {
  const allValues = chartData.datasets.flatMap(ds => ds.data);
  if (!allValues.length) { return null; }
  return {
    min: allValues.reduce((acc, v) => (v < acc ? v : acc), allValues[0]),
    max: allValues.reduce((acc, v) => (v > acc ? v : acc), allValues[0])
  };
}
