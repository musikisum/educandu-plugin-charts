import React from 'react';
import { Form, Radio } from 'antd';
import { useTranslation } from 'react-i18next';
import { useUser } from '@educandu/educandu/components/user-context.js';
import { FORM_ITEM_LAYOUT } from '@educandu/educandu/domain/constants.js';
import { sectionEditorProps } from '@educandu/educandu/ui/default-prop-types.js';
import { CHART_TYPE, createDefaultVotingContent } from './charts-info.js';
import ChartModeEditor from './chart-mode-editor.js';
import VotingModeEditor from './voting-mode-editor.js';

export default function ChartsEditor({ context, content, onContentChanged }) {
  const { t } = useTranslation('musikisum/educandu-plugin-charts');
  const user = useUser();

  const handleModeChange = newMode => {
    if (newMode === content.mode) { return; }
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
            <Radio.Button value="voting" disabled={!window.__initalState__?.room}>{t('modeVoting')}</Radio.Button>
          </Radio.Group>
        </Form.Item>
        {content.mode === 'chart'
          ? <ChartModeEditor content={content} onContentChanged={onContentChanged} />
          : <VotingModeEditor content={content} context={context} onContentChanged={onContentChanged} />}
      </Form>
    </div>
  );
}

ChartsEditor.propTypes = {
  ...sectionEditorProps
};
