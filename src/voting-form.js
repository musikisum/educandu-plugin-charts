import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { Alert, Checkbox, Radio, Space } from 'antd';
import { useUser } from '@educandu/educandu/components/user-context.js';
import { sectionDisplayProps } from '@educandu/educandu/ui/default-prop-types.js';

export default function VotingForm({ content, input, canModifyInput, onInputChanged }) {
  const { t } = useTranslation('musikisum/educandu-plugin-charts');
  const user = useUser();
  const savedData = input?.data?.[content.votingId] || {};
  const hasVoteData = Object.keys(savedData).length > 0;
  const isOwner = user?._id && user._id === content.ownerUserId;
  const ownerExcluded = isOwner && content.ownerVotes === false;
  const storageKey = user?._id ? `ep-charts-vote-${user._id}-${content.votingId}` : null;
  const submittedFlagKey = user?._id ? `ep-charts-submitted-${user._id}-${content.votingId}` : null;

  const [localVotes, setLocalVotes] = useState(savedData);
  const [hasBeenSubmitted, setHasBeenSubmitted] = useState(() => {
    if (!submittedFlagKey) { return false; }
    try {
      return !!window.sessionStorage.getItem(submittedFlagKey);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const votes = input?.data?.[content.votingId];
    if (votes && typeof votes === 'object' && Object.keys(votes).length > 0) {
      setLocalVotes(votes);
      return;
    }
    if (!storageKey || !canModifyInput || hasBeenSubmitted) { return; }
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          setLocalVotes(parsed);
          if (onInputChanged) {
            onInputChanged({ [content.votingId]: parsed });
          }
        }
      }
    } catch {
      // storage unavailable
    }
  }, [input, content.votingId, storageKey, onInputChanged, canModifyInput, hasBeenSubmitted]);

  useEffect(() => {
    if (!storageKey) { return; }
    if (!content.isLocked && canModifyInput && !hasBeenSubmitted) { return; }
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // storage unavailable
    }
  }, [content.isLocked, canModifyInput, storageKey, hasBeenSubmitted]);

  useEffect(() => {
    if (hasBeenSubmitted || !submittedFlagKey) { return; }
    if (!canModifyInput && hasVoteData) {
      setHasBeenSubmitted(true);
      try {
        window.sessionStorage.setItem(submittedFlagKey, '1');
      } catch {
        // storage unavailable
      }
    }
  }, [canModifyInput, hasVoteData, submittedFlagKey, hasBeenSubmitted]);

  if (content.isLocked) {
    return <Alert type="info" showIcon message={t('votingWasClosed')} />;
  }

  if (hasBeenSubmitted || (!canModifyInput && hasVoteData)) {
    const displayData = hasVoteData ? savedData : localVotes;
    return (
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Alert type="success" showIcon message={t('votingSubmittedHint')} />
        {content.questions.map(question => (
          <div key={question.key}>
            <div className="EP_Musikisum_Charts_Display-questionText">{question.text}</div>
            {question.multipleChoice ?? false
              ? (
                <Checkbox.Group value={displayData[question.key] || []} disabled>
                  <Space direction="vertical">
                    {question.options.map(option => (
                      <Checkbox key={option.key} value={option.key}>{option.text}</Checkbox>
                    ))}
                  </Space>
                </Checkbox.Group>
              )
              : (
                <Radio.Group value={displayData[question.key] || null} disabled>
                  <Space direction="vertical">
                    {question.options.map(option => (
                      <Radio key={option.key} value={option.key}>{option.text}</Radio>
                    ))}
                  </Space>
                </Radio.Group>
              )}
          </div>
        ))}
      </Space>
    );
  }

  if (!canModifyInput) {
    return <Alert type="warning" showIcon message={t('votingNotAvailable')} />;
  }

  if (ownerExcluded) {
    return <Alert type="info" showIcon message={t('votingOwnerExcluded')} />;
  }

  const handleVote = (questionKey, optionKey) => {
    if (content.isLocked) { return; }
    const newVotes = { ...localVotes, [questionKey]: optionKey };
    setLocalVotes(newVotes);
    onInputChanged({ [content.votingId]: newVotes });
    if (storageKey) {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(newVotes));
      } catch {
        // storage unavailable
      }
    }
  };

  const handleCheckboxVote = (questionKey, checkedValues) => {
    if (content.isLocked) { return; }
    const newVotes = { ...localVotes, [questionKey]: checkedValues };
    setLocalVotes(newVotes);
    onInputChanged({ [content.votingId]: newVotes });
    if (storageKey) {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(newVotes));
      } catch {
        // storage unavailable
      }
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {content.questions.map(question => {
        const isMultiple = question.multipleChoice ?? false;
        const currentValues = localVotes[question.key] || [];
        const maxReached = isMultiple && question.maxSelections !== null
          && currentValues.length >= question.maxSelections;

        return (
          <div key={question.key}>
            <div className="EP_Musikisum_Charts_Display-questionText">{question.text}</div>
            {isMultiple
              ? (
                <Checkbox.Group
                  value={currentValues}
                  onChange={values => handleCheckboxVote(question.key, values)}
                >
                  <Space direction="vertical">
                    {question.options.map(option => (
                      <Checkbox
                        key={option.key}
                        value={option.key}
                        disabled={maxReached ? !currentValues.includes(option.key) : null}
                      >
                        {option.text}
                      </Checkbox>
                    ))}
                  </Space>
                </Checkbox.Group>
              )
              : (
                <Radio.Group
                  value={localVotes[question.key] || null}
                  onChange={e => handleVote(question.key, e.target.value)}
                >
                  <Space direction="vertical">
                    {question.options.map(option => (
                      <Radio key={option.key} value={option.key}>{option.text}</Radio>
                    ))}
                  </Space>
                </Radio.Group>
              )}
          </div>
        );
      })}
    </Space>
  );
}

const { content: contentPropType, input: inputPropType, canModifyInput: canModifyInputPropType, onInputChanged: onInputChangedPropType } = sectionDisplayProps;
VotingForm.propTypes = {
  content: contentPropType,
  input: inputPropType,
  canModifyInput: canModifyInputPropType,
  onInputChanged: onInputChangedPropType
};
VotingForm.defaultProps = {
  content: null,
  input: null,
  canModifyInput: false,
  onInputChanged: null
};
