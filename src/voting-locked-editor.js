import React from 'react';
import { useTranslation } from 'react-i18next';
import Info from '@educandu/educandu/components/info.js';
import { BEHAVIOR, COLOR_PALETTE } from './charts-info.js';
import { Alert, Form, Input, InputNumber, Radio, Space } from 'antd';
import { FORM_ITEM_LAYOUT } from '@educandu/educandu/domain/constants.js';
import { sectionEditorProps } from '@educandu/educandu/ui/default-prop-types.js';
import ObjectWidthSlider from '@educandu/educandu/components/object-width-slider.js';

export default function VotingLockedEditor({ content, onContentChanged }) {
  const { t } = useTranslation('musikisum/educandu-plugin-charts');
  const updateContent = newValues => onContentChanged({ ...content, ...newValues });
  const axisMin = content.axisMin ?? null;
  const axisMax = content.axisMax ?? null;
  const axisRangeInvalid = axisMin !== null && axisMax !== null && axisMin >= axisMax;
  return (
    <React.Fragment>
      <Alert type="info" showIcon message={t('votingLockedHint')} style={{ marginBottom: 16 }} />
      <Form.Item label={t('colorPalette')} {...FORM_ITEM_LAYOUT}>
        <Radio.Group
          value={content.colorPalette ?? COLOR_PALETTE.tableau}
          onChange={e => updateContent({ colorPalette: e.target.value })}
        >
          <Radio.Button value={COLOR_PALETTE.tableau}>{t('colorPaletteTableau')}</Radio.Button>
          <Radio.Button value={COLOR_PALETTE.set2}>{t('colorPaletteSet2')}</Radio.Button>
        </Radio.Group>
      </Form.Item>
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
        </Space>
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

const { content: contentPropType, onContentChanged: onContentChangedPropType } = sectionEditorProps;
VotingLockedEditor.propTypes = {
  content: contentPropType,
  onContentChanged: onContentChangedPropType
};
VotingLockedEditor.defaultProps = {
  content: null,
  onContentChanged: null
};
