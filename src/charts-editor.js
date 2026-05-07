import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Alert, Form, Select, Space, InputNumber, Upload, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { FORM_ITEM_LAYOUT } from '@educandu/educandu/domain/constants.js';
import { sectionEditorProps } from '@educandu/educandu/ui/default-prop-types.js';
import { CHART_TYPE, AXIS_CHART_TYPES } from './charts-info.js';

const CHART_TYPE_OPTIONS = [
  { value: CHART_TYPE.bar,           labelKey: 'chartTypeBar' },
  { value: CHART_TYPE.barHorizontal, labelKey: 'chartTypeBarHorizontal' },
  { value: CHART_TYPE.line,          labelKey: 'chartTypeLine' },
  { value: CHART_TYPE.pie,           labelKey: 'chartTypePie' },
  { value: CHART_TYPE.doughnut,      labelKey: 'chartTypeDoughnut' },
  { value: CHART_TYPE.radar,         labelKey: 'chartTypeRadar' },
  { value: CHART_TYPE.polarArea,     labelKey: 'chartTypePolarArea' }
];

function parseWorkbook(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (rows.length < 2) {
    return { chartData: null, error: 'parseErrorTooFewRows', warning: null };
  }
  if (!rows[0] || rows[0].length < 2) {
    return { chartData: null, error: 'parseErrorTooFewColumns', warning: null };
  }

  const datasetNames = rows[0].slice(1).map(String);
  const dataRows = rows.slice(1);
  const labels = dataRows.map(row => String(row[0] ?? ''));

  let hasEmptyCells = false;
  let hasTextCells = false;

  dataRows.forEach(row => {
    datasetNames.forEach((_, colIdx) => {
      const cell = row[colIdx + 1];
      if (typeof cell === 'number') {
        return;
      }
      if (typeof cell === 'string') {
        if (!isNaN(Number(cell))) {
          return;
        }
        hasTextCells = true;
      } else {
        hasEmptyCells = true;
      }
    });
  });

  const datasets = datasetNames.map((name, colIdx) => ({
    label: name,
    data: dataRows.map(row => {
      const cell = row[colIdx + 1];
      const num = Number(cell ?? 0);
      return isNaN(num) ? 0 : num;
    })
  }));

  const allZero = datasets.every(ds => ds.data.every(v => v === 0));
  if (allZero && (hasEmptyCells || hasTextCells)) {
    return { chartData: null, error: 'parseErrorNoData', warnings: [] };
  }

  const warnings = [];
  if (hasTextCells) {
    warnings.push('parseWarningTextCells');
  }
  if (hasEmptyCells) {
    warnings.push('parseWarningEmptyCells');
  }

  return { chartData: { labels, datasets }, error: null, warnings };
}

function getDataRange(chartData) {
  const allValues = chartData.datasets.flatMap(ds => ds.data);
  if (!allValues.length) {
    return null;
  }
  return { min: Math.min(...allValues), max: Math.max(...allValues) };
}

export default function ChartsEditor({ content, onContentChanged }) {
  const { t } = useTranslation('musikisum/educandu-plugin-charts');
  const { chartType, axisMin, axisMax, chartData } = content;
  const [uploadResult, setUploadResult] = useState(null);

  const updateContent = newValues => {
    onContentChanged({ ...content, ...newValues });
  };

  const handleFileUpload = file => {
    const reader = new FileReader();
    reader.onload = e => {
      const workbook = XLSX.read(e.target.result, { type: 'array' });
      const { chartData: parsed, error, warnings } = parseWorkbook(workbook);

      if (parsed) {
        updateContent({ chartData: parsed });
        setUploadResult({
          fileName: file.name,
          error: null,
          warnings,
          labelCount: parsed.labels.length,
          datasetCount: parsed.datasets.length
        });
      } else {
        setUploadResult({ fileName: file.name, error, warnings: [], labelCount: null, datasetCount: null });
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

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
        {uploadResult.warnings.map(key => (
          <Alert key={key} type="warning" showIcon message={t(key)} />
        ))}
      </Space>
    )
    : null;

  const axisFormItem = showAxisControls
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
          {dataRange
            ? <span style={{ color: '#888', fontSize: 12 }}>{t('dataRange', { min: dataRange.min, max: dataRange.max })}</span>
            : null}
        </Space>
      </Form.Item>
    )
    : null;

  return (
    <div className="EP_Musikisum_Charts_Editor">
      <Form labelAlign="left">
        <Form.Item label={t('chartType')} {...FORM_ITEM_LAYOUT}>
          <Select value={chartType} onChange={value => updateContent({ chartType: value })} style={{ width: 220 }}>
            {CHART_TYPE_OPTIONS.map(({ value, labelKey }) => (
              <Select.Option key={value} value={value}>{t(labelKey)}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label={t('dataFile')} {...FORM_ITEM_LAYOUT}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Upload accept=".xlsx,.xls,.ods,.csv" showUploadList={false} beforeUpload={handleFileUpload}>
              <Button icon={<UploadOutlined />}>{t('chooseFile')}</Button>
            </Upload>
            {uploadFeedback}
          </Space>
        </Form.Item>
        {axisFormItem}
      </Form>
    </div>
  );
}

ChartsEditor.propTypes = {
  ...sectionEditorProps
};
