import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Alert, Button, Form, Input, InputNumber, Radio, Select, Space, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import Info from '@educandu/educandu/components/info.js';
import { useService } from '@educandu/educandu/components/container-context.js';
import { useUser } from '@educandu/educandu/components/user-context.js';
import ObjectWidthSlider from '@educandu/educandu/components/object-width-slider.js';
import DocumentInputApiClient from '@educandu/educandu/api-clients/document-input-api-client.js';
import uniqueId from '@educandu/educandu/utils/unique-id.js';
import { FORM_ITEM_LAYOUT } from '@educandu/educandu/domain/constants.js';
import { sectionEditorProps } from '@educandu/educandu/ui/default-prop-types.js';
import { CHART_TYPE, AXIS_CHART_TYPES, BEHAVIOR, createDefaultVotingContent } from './charts-info.js';

const CHART_TYPE_OPTIONS = [
  { value: CHART_TYPE.bar,           labelKey: 'chartTypeBar' },
  { value: CHART_TYPE.barHorizontal, labelKey: 'chartTypeBarHorizontal' },
  { value: CHART_TYPE.line,          labelKey: 'chartTypeLine' },
  { value: CHART_TYPE.pie,           labelKey: 'chartTypePie' },
  { value: CHART_TYPE.doughnut,      labelKey: 'chartTypeDoughnut' },
  { value: CHART_TYPE.radar,         labelKey: 'chartTypeRadar' },
  { value: CHART_TYPE.polarArea,     labelKey: 'chartTypePolarArea' }
];

function parseChartWorkbook(workbook) {
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
    if (typeof cell === 'number') {return cell;}
    if (typeof cell === 'string' && !isNaN(Number(cell))) {return Number(cell);}
    if (typeof cell === 'undefined' || cell === null) { hasEmptyCells = true; return 0; }
    hasTextCells = true;
    return 0;
  };

  const topLeftCell = rows[0][0];
  const isTransposed = topLeftCell !== null && typeof topLeftCell !== 'undefined' && String(topLeftCell).trim() !== '';

  let datasets; let labels;

  if (isTransposed) {
    // Transponiertes Format: Zeile 0 = Labels, Zeilen 1+ = Datensätze
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
    // Standardformat: Spalte 0 = Labels, Zeile 0 = Datensatznamen
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
  if (hasTextCells) {warnings.push('parseWarningTextCells');}
  if (hasEmptyCells) {warnings.push('parseWarningEmptyCells');}

  return { chartData: { labels, datasets }, error: null, warnings };
}

function parseVotingWorkbook(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (!rows.length) {
    return { questions: null, error: 'parseErrorTooFewRows' };
  }

  const colCount = Math.max(...rows.map(row => Array.isArray(row) ? row.length : 0));
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

function parseVotingText(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const questions = [];
  let current = null;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      if (current && current.options.length >= 1) {questions.push(current);}
      current = { key: uniqueId.create(), text: line.slice(2).trim(), options: [] };
    } else if (current) {
      current.options.push({ key: uniqueId.create(), text: line });
    }
  }
  if (current && current.options.length >= 1) {questions.push(current);}

  if (!questions.length) {return { questions: null, error: 'parseErrorNoData' };}
  return { questions, error: null };
}

function readFile(file, onLoad) {
  const reader = new FileReader();
  const isText = /\.(csv|txt)$/i.test(file.name);
  reader.onload = e => {
    const workbook = isText
      ? XLSX.read(e.target.result, { type: 'string' })
      : XLSX.read(e.target.result, { type: 'array' });
    onLoad(workbook);
  };
  if (isText) {reader.readAsText(file);} else {reader.readAsArrayBuffer(file);}
}

function collectLatestVotes(documentInputs, votingId) {
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

function getDataRange(chartData) {
  const allValues = chartData.datasets.flatMap(ds => ds.data);
  if (!allValues.length) {return null;}
  return { min: Math.min(...allValues), max: Math.max(...allValues) };
}

export default function ChartsEditor({ context, content, onContentChanged }) {
  const { t } = useTranslation('musikisum/educandu-plugin-charts');
  const [uploadResult, setUploadResult] = useState(null);
  const [isLocking, setIsLocking] = useState(false);
  const [submissionCount, setSubmissionCount] = useState(null);
  const [isFetchingCount, setIsFetchingCount] = useState(false);
  const user = useUser();
  const documentInputApiClient = useService(DocumentInputApiClient);

  const updateContent = newValues => {
    onContentChanged({ ...content, ...newValues });
  };

  const updateQuestion = (questionKey, changes) => {
    updateContent({
      questions: content.questions.map(q => q.key === questionKey ? { ...q, ...changes } : q)
    });
  };

  const handleModeChange = newMode => {
    if (newMode === content.mode) {return;}
    if (newMode === 'voting') {
      onContentChanged(createDefaultVotingContent(user?._id));
    } else {
      onContentChanged({
        mode: 'chart',
        chartType: CHART_TYPE.bar,
        axisMin: null,
        axisMax: null,
        chartData: { labels: [], datasets: [] }
      });
    }
    setUploadResult(null);
    setSubmissionCount(null);
  };

  const handleChartFileUpload = file => {
    readFile(file, workbook => {
      const { chartData, error, warnings } = parseChartWorkbook(workbook);
      if (chartData) {
        updateContent({ chartData });
        setUploadResult({ fileName: file.name, error: null, warnings, labelCount: chartData.labels.length, datasetCount: chartData.datasets.length });
      } else {
        setUploadResult({ fileName: file.name, error, warnings: [] });
      }
    });
    return false;
  };

  const handleVotingFileUpload = file => {
    const isTxt = /\.txt$/i.test(file.name);
    if (isTxt) {
      const reader = new FileReader();
      reader.onload = e => {
        const { questions, error } = parseVotingText(e.target.result);
        if (questions) {
          updateContent({ questions, votingId: uniqueId.create() });
          setUploadResult({ fileName: file.name, error: null, questionCount: questions.length });
        } else {
          setUploadResult({ fileName: file.name, error });
        }
      };
      reader.readAsText(file);
    } else {
      readFile(file, workbook => {
        const { questions, error } = parseVotingWorkbook(workbook);
        if (questions) {
          updateContent({ questions, votingId: uniqueId.create() });
          setUploadResult({ fileName: file.name, error: null, questionCount: questions.length });
        } else {
          setUploadResult({ fileName: file.name, error });
        }
      });
    }
    return false;
  };

  const handleFetchSubmissionCount = async () => {
    setIsFetchingCount(true);
    try {
      const documentId = window.location.pathname.match(/^\/docs\/([a-zA-Z0-9]+)\b/i)?.[1];
      const { documentInputs } = await documentInputApiClient.getDocumentInputsByDocumentId(documentId);
      const latestVotes = collectLatestVotes(documentInputs, content.votingId);
      setSubmissionCount(latestVotes.length);
    } finally {
      setIsFetchingCount(false);
    }
  };

  const handleLockVoting = async () => {
    setIsLocking(true);
    try {
      const documentId = window.location.pathname.match(/^\/docs\/([a-zA-Z0-9]+)\b/i)?.[1];
      const { documentInputs } = await documentInputApiClient.getDocumentInputsByDocumentId(documentId);

      const allVotes = collectLatestVotes(documentInputs, content.votingId);

      const results = {};
      for (const question of content.questions) {
        results[question.key] = {};
        for (const option of question.options) {
          results[question.key][option.key] = allVotes.filter(v => {
            const vote = v[question.key];
            return Array.isArray(vote) ? vote.includes(option.key) : vote === option.key;
          }).length;
        }
      }

      onContentChanged({ ...content, isLocked: true, results });
    } finally {
      setIsLocking(false);
    }
  };

  const renderChartEditor = () => {
    const { chartType, axisMin, axisMax, chartData } = content;
    const showAxisControls = AXIS_CHART_TYPES.has(chartType);
    const dataRange = showAxisControls ? getDataRange(chartData) : null;
    const axisRangeInvalid = axisMin !== null && axisMax !== null && axisMin >= axisMax;

    const uploadFeedback = uploadResult
      ? (
        <Space direction="vertical" style={{ width: '100%' }}>
          {uploadResult.error
            ? <Alert type="error" showIcon message={t(uploadResult.error)} />
            : (
              <Alert
                type="success"
                showIcon
                message={t('uploadSuccess', { fileName: uploadResult.fileName, labelCount: uploadResult.labelCount, datasetCount: uploadResult.datasetCount })}
                />
            )}
          {(uploadResult.warnings || []).map(key => (
            <Alert key={key} type="warning" showIcon message={t(key)} />
          ))}
        </Space>
      )
      : null;

    return (
      <React.Fragment>
        <Form.Item label={t('chartType')} {...FORM_ITEM_LAYOUT}>
          <Select value={chartType} onChange={value => updateContent({ chartType: value })} style={{ width: 220 }}>
            {CHART_TYPE_OPTIONS.map(({ value, labelKey }) => (
              <Select.Option key={value} value={value}>{t(labelKey)}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label={t('dataFile')} {...FORM_ITEM_LAYOUT}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Upload accept=".xlsx,.xls,.ods,.csv,.txt" showUploadList={false} beforeUpload={handleChartFileUpload}>
              <Button icon={<UploadOutlined />}>{t('chooseFile')}</Button>
            </Upload>
            {uploadFeedback}
          </Space>
        </Form.Item>
        {showAxisControls
          ? (
            <Form.Item
              label={t('valueAxis')}
              {...FORM_ITEM_LAYOUT}
              validateStatus={axisRangeInvalid ? 'error' : ''}
              help={axisRangeInvalid ? t('axisRangeError') : null}
              >
              <Space align="center">
                <span>{t('min')}:</span>
                <InputNumber
                  placeholder={t('auto')}
                  value={axisMin}
                  onChange={v => updateContent({ axisMin: v })}
                  style={{ width: 90 }}
                  />
                <span>{t('max')}:</span>
                <InputNumber
                  placeholder={t('auto')}
                  value={axisMax}
                  onChange={v => updateContent({ axisMax: v })}
                  style={{ width: 90 }}
                  />
                {dataRange ? <span style={{ color: '#888', fontSize: 12 }}>{t('dataRange', { min: dataRange.min, max: dataRange.max })}</span> : null}
              </Space>
            </Form.Item>
          )
          : null}
        <Form.Item label={t('behavior')} {...FORM_ITEM_LAYOUT}>
          <Radio.Group
            value={content.behavior ?? BEHAVIOR.static}
            onChange={e => updateContent({ behavior: e.target.value })}
            >
            <Radio.Button value={BEHAVIOR.expandable}>{t('behavior_expandable')}</Radio.Button>
            <Radio.Button value={BEHAVIOR.collapsible}>{t('behavior_collapsible')}</Radio.Button>
            <Radio.Button value={BEHAVIOR.static}>{t('behavior_static')}</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item label={t('title')} {...FORM_ITEM_LAYOUT}>
          <Input
            value={content.title ?? ''}
            onChange={e => updateContent({ title: e.target.value })}
            />
        </Form.Item>
        <Form.Item label={<Info tooltip={t('common:widthInfo')}>{t('common:width')}</Info>} {...FORM_ITEM_LAYOUT}>
          <ObjectWidthSlider value={content.width ?? 100} onChange={value => updateContent({ width: value })} />
        </Form.Item>
      </React.Fragment>
    );
  };

  const renderVotingEditor = () => {
    if (content.isLocked) {
      return (
        <React.Fragment>
          <Alert type="info" showIcon message={t('votingLockedHint')} style={{ marginBottom: 16 }} />
          <Form.Item label={t('behavior')} {...FORM_ITEM_LAYOUT}>
            <Radio.Group
              value={content.behavior ?? BEHAVIOR.static}
              onChange={e => updateContent({ behavior: e.target.value })}
              >
              <Radio.Button value={BEHAVIOR.expandable}>{t('behavior_expandable')}</Radio.Button>
              <Radio.Button value={BEHAVIOR.collapsible}>{t('behavior_collapsible')}</Radio.Button>
              <Radio.Button value={BEHAVIOR.static}>{t('behavior_static')}</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item label={t('title')} {...FORM_ITEM_LAYOUT}>
            <Input
              placeholder={t('votingResultsTitle')}
              value={content.title ?? ''}
              onChange={e => updateContent({ title: e.target.value })}
              />
          </Form.Item>
          <Form.Item label={<Info tooltip={t('common:widthInfo')}>{t('common:width')}</Info>} {...FORM_ITEM_LAYOUT}>
            <ObjectWidthSlider value={content.width ?? 100} onChange={value => updateContent({ width: value })} />
          </Form.Item>
        </React.Fragment>
      );
    }

    let uploadFeedback = null;
    if (uploadResult) {
      uploadFeedback = uploadResult.error
        ? <Alert type="error" showIcon message={t(uploadResult.error)} />
        : <Alert type="success" showIcon message={t('votingUploadSuccess', { fileName: uploadResult.fileName, questionCount: uploadResult.questionCount })} />;
    }

    return (
      <React.Fragment>
        <Form.Item label={t('ownerVotes')} {...FORM_ITEM_LAYOUT}>
          <Radio.Group
            value={content.ownerVotes}
            onChange={e => updateContent({ ownerVotes: e.target.value })}
            >
            <Radio.Button value>{t('ownerVotesYes')}</Radio.Button>
            <Radio.Button value={false}>{t('ownerVotesNo')}</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item label={t('dataFile')} {...FORM_ITEM_LAYOUT}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Upload accept=".xlsx,.xls,.ods,.csv,.txt" showUploadList={false} beforeUpload={handleVotingFileUpload}>
              <Button icon={<UploadOutlined />}>{t('chooseFile')}</Button>
            </Upload>
            {uploadFeedback}
          </Space>
        </Form.Item>
        {content.questions.length > 0 && (
          <Form.Item label={t('votingQuestions')} {...FORM_ITEM_LAYOUT}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {content.questions.map(question => (
                <Space key={question.key} wrap>
                  <span style={{ minWidth: 140, display: 'inline-block' }}>{question.text}</span>
                  <Radio.Group
                    size="small"
                    value={question.multipleChoice ?? false}
                    onChange={e => updateQuestion(question.key, { multipleChoice: e.target.value, maxSelections: null })}
                    >
                    <Radio.Button value={false}>{t('votingSingleChoice')}</Radio.Button>
                    <Radio.Button value>{t('votingMultipleChoice')}</Radio.Button>
                  </Radio.Group>
                  {question.multipleChoice ?? false
                    ? (
                      <Space size="small">
                        <span>{t('votingMaxSelections')}:</span>
                        <InputNumber
                          size="small"
                          min={2}
                          max={question.options.length}
                          value={question.maxSelections}
                          onChange={v => updateQuestion(question.key, { maxSelections: v ?? null })}
                          placeholder={t('votingNoLimit')}
                          style={{ width: 90 }}
                          />
                      </Space>
                    )
                    : null}
                </Space>
              ))}
            </Space>
          </Form.Item>
        )}
        <Form.Item label={t('votingSubmissions')} {...FORM_ITEM_LAYOUT}>
          <Space>
            <Button loading={isFetchingCount} disabled={context.isPreview} onClick={handleFetchSubmissionCount}>
              {t('votingRefreshCount')}
            </Button>
            {submissionCount !== null && (
              <span>{t('votingSubmissionCount', { count: submissionCount })}</span>
            )}
          </Space>
        </Form.Item>
        <Form.Item {...FORM_ITEM_LAYOUT}>
          <Button type="primary" danger loading={isLocking} disabled={context.isPreview} onClick={handleLockVoting}>
            {t('votingLockButton')}
          </Button>
        </Form.Item>
      </React.Fragment>
    );
  };

  return (
    <div className="EP_Musikisum_Charts_Editor">
      <Form labelAlign="left">
        <Form.Item label={t('mode')} {...FORM_ITEM_LAYOUT}>
          <Radio.Group
            value={content.mode}
            onChange={e => handleModeChange(e.target.value)}
            disabled={content.mode === 'voting' && content.isLocked}
            >
            <Radio.Button value="chart">{t('modeChart')}</Radio.Button>
            <Radio.Button value="voting">{t('modeVoting')}</Radio.Button>
          </Radio.Group>
        </Form.Item>
        {content.mode === 'chart' ? renderChartEditor() : renderVotingEditor()}
      </Form>
    </div>
  );
}

ChartsEditor.propTypes = {
  ...sectionEditorProps
};
