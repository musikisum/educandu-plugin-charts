import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UploadOutlined } from '@ant-design/icons';
import uniqueId from '@educandu/educandu/utils/unique-id.js';
import { FORM_ITEM_LAYOUT } from '@educandu/educandu/domain/constants.js';
import { useService } from '@educandu/educandu/components/container-context.js';
import { sectionEditorProps } from '@educandu/educandu/ui/default-prop-types.js';
import { Alert, Button, Form, InputNumber, Radio, Space, Upload } from 'antd';
import DocumentInputApiClient from '@educandu/educandu/api-clients/document-input-api-client.js';
import VotingLockedEditor from './voting-locked-editor.js';
import {
  parseVotingWorkbook,
  parseVotingText,
  readFile,
  collectLatestVotes,
  MAX_UPLOAD_BYTES
} from './charts-utils.js';

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
    return <VotingLockedEditor content={content} onContentChanged={onContentChanged} />;
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
          {!!uploadResult && (
            uploadResult.error
              ? <Alert type="error" showIcon message={t(uploadResult.error)} />
              : <Alert type="success" showIcon message={t('votingUploadSuccess', { fileName: uploadResult.fileName, questionCount: uploadResult.questionCount })} />
          )}
        </Space>
      </Form.Item>
      {content.questions.length > 0 && (
        <Form.Item label={t('votingQuestions')} {...FORM_ITEM_LAYOUT}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {content.questions.map(question => {
              const isMultiple = question.multipleChoice ?? false;
              return (
                <div key={question.key} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ flex: '1 1 0', minWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {question.text}
                  </span>
                  <Radio.Group
                    size="small"
                    value={isMultiple}
                    onChange={e => updateQuestion(question.key, { multipleChoice: e.target.value, maxSelections: null })}
                    style={{ flexShrink: 0 }}
                    >
                    <Radio.Button value={false}>{t('votingSingleChoice')}</Radio.Button>
                    <Radio.Button value>{t('votingMultipleChoice')}</Radio.Button>
                  </Radio.Group>
                  <div style={{ flexShrink: 0, visibility: isMultiple ? 'visible' : 'hidden', display: 'flex', alignItems: 'center', gap: 4 }}>
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
                  </div>
                </div>
              );
            })}
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
VotingModeEditor.defaultProps = {
  content: null,
  context: null,
  onContentChanged: null
};
