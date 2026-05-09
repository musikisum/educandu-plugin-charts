import React, { useState } from 'react';
import { Alert, Button, Form, Input, InputNumber, Radio, Space, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import Info from '@educandu/educandu/components/info.js';
import ObjectWidthSlider from '@educandu/educandu/components/object-width-slider.js';
import { useService } from '@educandu/educandu/components/container-context.js';
import DocumentInputApiClient from '@educandu/educandu/api-clients/document-input-api-client.js';
import { FORM_ITEM_LAYOUT } from '@educandu/educandu/domain/constants.js';
import { sectionEditorProps } from '@educandu/educandu/ui/default-prop-types.js';
import uniqueId from '@educandu/educandu/utils/unique-id.js';
import { BEHAVIOR } from './charts-info.js';
import { parseVotingWorkbook, parseVotingText, readFile, collectLatestVotes, MAX_UPLOAD_BYTES } from './charts-utils.js';

export default function VotingModeEditor({ content, context, onContentChanged }) {
  const { t } = useTranslation('musikisum/educandu-plugin-charts');
  const [uploadResult, setUploadResult] = useState(null);
  const [isLocking, setIsLocking] = useState(false);
  const [submissionCount, setSubmissionCount] = useState(null);
  const [isFetchingCount, setIsFetchingCount] = useState(false);
  const documentInputApiClient = useService(DocumentInputApiClient);

  const updateContent = newValues => onContentChanged({ ...content, ...newValues });

  const updateQuestion = (questionKey, changes) => {
    updateContent({
      questions: content.questions.map(q => q.key === questionKey ? { ...q, ...changes } : q)
    });
  };

  const handleFileUpload = file => {
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadResult({ fileName: file.name, error: 'parseErrorFileTooLarge' });
      return false;
    }
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
      reader.onerror = () => setUploadResult({ fileName: file.name, error: 'fileReadError' });
      reader.readAsText(file);
    } else {
      readFile(
        file,
        workbook => {
          const { questions, error } = parseVotingWorkbook(workbook);
          if (questions) {
            updateContent({ questions, votingId: uniqueId.create() });
            setUploadResult({ fileName: file.name, error: null, questionCount: questions.length });
          } else {
            setUploadResult({ fileName: file.name, error });
          }
        },
        () => setUploadResult({ fileName: file.name, error: 'fileReadError' })
      );
    }
    return false;
  };

  const handleFetchSubmissionCount = async () => {
    const documentId = window.location.pathname.match(/^\/docs\/([a-zA-Z0-9]+)\b/i)?.[1];
    if (!documentId) { return; }
    setIsFetchingCount(true);
    try {
      const { documentInputs } = await documentInputApiClient.getDocumentInputsByDocumentId(documentId);
      const latestVotes = collectLatestVotes(documentInputs, content.votingId);
      setSubmissionCount(latestVotes.length);
    } finally {
      setIsFetchingCount(false);
    }
  };

  const handleLockVoting = async () => {
    const documentId = window.location.pathname.match(/^\/docs\/([a-zA-Z0-9]+)\b/i)?.[1];
    if (!documentId) { return; }
    setIsLocking(true);
    try {
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
          <Upload accept=".xlsx,.xls,.ods,.csv,.txt" showUploadList={false} beforeUpload={handleFileUpload}>
            <Button icon={<UploadOutlined />}>{t('chooseFile')}</Button>
          </Upload>
          {uploadResult && (uploadResult.error
            ? <Alert type="error" showIcon message={t(uploadResult.error)} />
            : <Alert type="success" showIcon message={t('votingUploadSuccess', { fileName: uploadResult.fileName, questionCount: uploadResult.questionCount })} />
          )}
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
                {(question.multipleChoice ?? false) && (
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
                )}
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
}

const { content: contentPropType, context: contextPropType, onContentChanged: onContentChangedPropType } = sectionEditorProps;
VotingModeEditor.propTypes = {
  content: contentPropType,
  context: contextPropType,
  onContentChanged: onContentChangedPropType
};
