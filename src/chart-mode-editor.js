import React, { useState } from 'react';
import { Alert, Button, Form, Input, InputNumber, Radio, Select, Space, Upload } from 'antd';
import { useTranslation } from 'react-i18next';
import { UploadOutlined } from '@ant-design/icons';
import Info from '@educandu/educandu/components/info.js';
import { CHART_TYPE, AXIS_CHART_TYPES, BEHAVIOR, COLOR_PALETTE } from './charts-info.js';
import { FORM_ITEM_LAYOUT } from '@educandu/educandu/domain/constants.js';
import { sectionEditorProps } from '@educandu/educandu/ui/default-prop-types.js';
import ObjectWidthSlider from '@educandu/educandu/components/object-width-slider.js';
import { parseChartWorkbook, parseChartText, readFile, getDataRange, MAX_UPLOAD_BYTES } from './charts-utils.js';

const renderLines = text => text.split('\n').map((line, i, arr) => (
  <React.Fragment key={i}>{line}{i < arr.length - 1 ? <br /> : null}</React.Fragment>
));

const CHART_TYPE_OPTIONS = [
  { value: CHART_TYPE.bar, labelKey: 'chartTypeBar' },
  { value: CHART_TYPE.barHorizontal, labelKey: 'chartTypeBarHorizontal' },
  { value: CHART_TYPE.line, labelKey: 'chartTypeLine' },
  { value: CHART_TYPE.pie, labelKey: 'chartTypePie' },
  { value: CHART_TYPE.doughnut, labelKey: 'chartTypeDoughnut' },
  { value: CHART_TYPE.radar, labelKey: 'chartTypeRadar' },
  { value: CHART_TYPE.polarArea, labelKey: 'chartTypePolarArea' }
];

export default function ChartModeEditor({ content, onContentChanged }) {
  const { t } = useTranslation('musikisum/educandu-plugin-charts');
  const [uploadResult, setUploadResult] = useState(null);

  const updateContent = newValues => onContentChanged({ ...content, ...newValues });

  const handleFileUpload = file => {
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadResult({ fileName: file.name, error: 'parseErrorFileTooLarge', warnings: [] });
      return false;
    }
    if (/\.txt$/i.test(file.name)) {
      const reader = new FileReader();
      reader.onload = e => {
        const { chartData, error, warnings } = parseChartText(e.target.result);
        if (chartData) {
          updateContent({ chartData });
          setUploadResult({ fileName: file.name, error: null, warnings, labelCount: chartData.labels.length, datasetCount: chartData.datasets.length });
        } else {
          setUploadResult({ fileName: file.name, error, warnings: [] });
        }
      };
      reader.onerror = () => setUploadResult({ fileName: file.name, error: 'fileReadError', warnings: [] });
      reader.readAsText(file);
    } else {
      readFile(
        file,
        workbook => {
          const { chartData, error, warnings } = parseChartWorkbook(workbook);
          if (chartData) {
            updateContent({ chartData });
            setUploadResult({ fileName: file.name, error: null, warnings, labelCount: chartData.labels.length, datasetCount: chartData.datasets.length });
          } else {
            setUploadResult({ fileName: file.name, error, warnings: [] });
          }
        },
        () => setUploadResult({ fileName: file.name, error: 'fileReadError', warnings: [] })
      );
    }
    return false;
  };

  const { chartType, axisMin, axisMax, chartData } = content;
  const showAxisControls = AXIS_CHART_TYPES.has(chartType);
  const dataRange = showAxisControls ? getDataRange(chartData) : null;
  const axisRangeInvalid = axisMin !== null && axisMax !== null && axisMin >= axisMax;
  const dataFileTooltip = (
    <span>
      {renderLines(t('dataFileInfoSpreadsheet'))}
      <br />
      {renderLines(t('dataFileInfoText'))}
    </span>
  );

  return (
    <React.Fragment>
      <Form.Item label={t('chartType')} {...FORM_ITEM_LAYOUT}>
        <Select value={chartType} onChange={value => updateContent({ chartType: value })} style={{ width: 220 }}>
          {CHART_TYPE_OPTIONS.map(({ value, labelKey }) => (
            <Select.Option key={value} value={value}>{t(labelKey)}</Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item label={<Info tooltip={dataFileTooltip}>{t('dataFile')}</Info>} {...FORM_ITEM_LAYOUT}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Upload accept=".xlsx,.xls,.ods,.csv,.txt" showUploadList={false} beforeUpload={handleFileUpload}>
            <Button icon={<UploadOutlined />}>{t('chooseFile')}</Button>
          </Upload>
          {!!uploadResult && (
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
          )}
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
              {!!dataRange && <span style={{ color: '#888', fontSize: 12 }}>{t('dataRange', { min: dataRange.min, max: dataRange.max })}</span>}
            </Space>
          </Form.Item>
        )
        : null}
      <Form.Item label={t('colorPalette')} {...FORM_ITEM_LAYOUT}>
        <Radio.Group
          value={content.colorPalette ?? COLOR_PALETTE.tableau}
          onChange={e => updateContent({ colorPalette: e.target.value })}
          >
          <Radio.Button value={COLOR_PALETTE.tableau}>{t('colorPaletteTableau')}</Radio.Button>
          <Radio.Button value={COLOR_PALETTE.set2}>{t('colorPaletteSet2')}</Radio.Button>
        </Radio.Group>
      </Form.Item>
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
}

const { content: contentPropType, onContentChanged: onContentChangedPropType } = sectionEditorProps;
ChartModeEditor.propTypes = {
  content: contentPropType,
  onContentChanged: onContentChangedPropType
};
ChartModeEditor.defaultProps = {
  content: null,
  onContentChanged: null
};
