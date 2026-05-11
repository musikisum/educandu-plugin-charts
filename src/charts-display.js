import React, { useState, useEffect } from 'react';
import { BEHAVIOR, COLOR_PALETTE } from './charts-info.js';
import { useTranslation } from 'react-i18next';
import { Alert, Checkbox, Radio, Space } from 'antd';
import Collapsible from '@educandu/educandu/components/collapsible.js';
import { useUser } from '@educandu/educandu/components/user-context.js';
import { Bar, Line, Pie, Doughnut, Radar, PolarArea } from 'react-chartjs-2';
import { sectionDisplayProps } from '@educandu/educandu/ui/default-prop-types.js';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, RadialLinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

const PALETTES = {
  [COLOR_PALETTE.tableau]: ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#ff9da7'],
  [COLOR_PALETTE.set2]:    ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f', '#e5c494', '#b3b3b3']
};

const PIE_LIKE_TYPES = new Set(['pie', 'doughnut', 'polarArea']);

const CHART_COMPONENT = {
  bar: Bar,
  barHorizontal: Bar,
  line: Line,
  pie: Pie,
  doughnut: Doughnut,
  radar: Radar,
  polarArea: PolarArea
};

function buildChartJsData(chartData, chartType, colorPalette) {
  const colors = PALETTES[colorPalette] ?? PALETTES[COLOR_PALETTE.tableau];
  const isPieLike = PIE_LIKE_TYPES.has(chartType);

  return {
    labels: chartData.labels,
    datasets: chartData.datasets.map((ds, i) => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: isPieLike
        ? chartData.labels.map((_, j) => `${colors[j % colors.length]}cc`)
        : `${colors[i % colors.length]}cc`,
      borderColor: isPieLike
        ? chartData.labels.map((_, j) => colors[j % colors.length])
        : colors[i % colors.length],
      borderWidth: 1
    }))
  };
}

function buildOptions(chartType, axisMin, axisMax) {
  const scaleOpts = {};
  if (typeof axisMin === 'number') {
    scaleOpts.min = axisMin;
  }
  if (typeof axisMax === 'number') {
    scaleOpts.max = axisMax;
  }
  const hasCustomScale = Object.keys(scaleOpts).length > 0;
  if (!hasCustomScale) {
    return chartType === 'barHorizontal' ? { indexAxis: 'y' } : {};
  }
  switch (chartType) {
    case 'barHorizontal':
      return { indexAxis: 'y', scales: { x: scaleOpts } };
    case 'bar':
    case 'line':
      return { scales: { y: scaleOpts } };
    case 'radar':
    case 'polarArea':
      return { scales: { r: scaleOpts } };
    default:
      return {};
  }
}

function VotingForm({ content, input, canModifyInput, onInputChanged }) {
  const { t } = useTranslation('musikisum/educandu-plugin-charts');
  const user = useUser();
  const savedData = input?.data?.[content.votingId] || {};
  const hasVoteData = Object.keys(savedData).length > 0;
  const isOwner = user?._id && user._id === content.ownerUserId;
  const ownerExcluded = isOwner && content.ownerVotes === false;
  const storageKey = user?._id ? `ep-charts-vote-${user._id}-${content.votingId}` : null;

  const [localVotes, setLocalVotes] = useState(savedData);

  useEffect(() => {
    const votes = input?.data?.[content.votingId];
    if (votes && typeof votes === 'object' && Object.keys(votes).length > 0) {
      setLocalVotes(votes);
    }
  }, [input, content.votingId]);

  useEffect(() => {
    if (!storageKey) { return; }
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          setLocalVotes(prev => Object.keys(prev).length > 0 ? prev : parsed);
        }
      }
    } catch {
      // storage unavailable
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) { return; }
    if (!content.isLocked && canModifyInput) { return; }
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // storage unavailable
    }
  }, [content.isLocked, canModifyInput, storageKey]);

  if (content.isLocked) {
    return <Alert type="info" showIcon message={t('votingWasClosed')} />;
  }

  // Nach educandus "Eingabe einreichen": canModifyInput wird false + input hat echte Serverdaten
  if (!canModifyInput && hasVoteData) {
    return (
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Alert type="success" showIcon message={t('votingSubmittedHint')} />
        {content.questions.map(question => (
          <div key={question.key}>
            <div className="EP_Musikisum_Charts_Display-questionText">{question.text}</div>
            {question.multipleChoice ?? false
              ? (
                <Checkbox.Group value={savedData[question.key] || []} disabled>
                  <Space direction="vertical">
                    {question.options.map(option => (
                      <Checkbox key={option.key} value={option.key}>{option.text}</Checkbox>
                    ))}
                  </Space>
                </Checkbox.Group>
              )
              : (
                <Radio.Group value={savedData[question.key] || null} disabled>
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

export default function ChartsDisplay({ content, input, canModifyInput, onInputChanged }) {
  const { t } = useTranslation('musikisum/educandu-plugin-charts');

  if (content.mode === 'voting') {
    const voteData = input?.data?.[content.votingId];
    const hasVoteData = typeof voteData === 'object' && voteData !== null && Object.keys(voteData).length > 0;

    if (content.isLocked && content.results) {
      const colors = PALETTES[content.colorPalette] ?? PALETTES[COLOR_PALETTE.tableau];
      const multipleQuestions = content.questions.length > 1;
      const maxOptions = content.questions.reduce((acc, q) => Math.max(acc, q.options.length), 1);
      const barThickness = Math.max(20, Math.min(80, Math.floor(300 / maxOptions)));
      const behavior = content.behavior ?? BEHAVIOR.static;
      const hasTitle = !!content.title;
      const useCollapsible = hasTitle || behavior !== BEHAVIOR.static;

      const lockedContent = (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {content.questions.map(question => {
            const questionResults = content.results[question.key] || {};
            const chartData = {
              labels: question.options.map(o => o.text),
              datasets: [{
                label: question.text,
                data: question.options.map(o => questionResults[o.key] || 0),
                backgroundColor: question.options.map((_, j) => `${colors[j % colors.length]}cc`),
                borderColor: question.options.map((_, j) => colors[j % colors.length]),
                borderWidth: 1,
                barThickness
              }]
            };
            return (
              <div key={question.key}>
                {multipleQuestions ? <div className="EP_Musikisum_Charts_Display-questionText">{question.text}</div> : null}
                <Bar
                  data={chartData}
                  options={{ plugins: { legend: { display: !multipleQuestions } } }}
                  />
              </div>
            );
          })}
        </Space>
      );

      return (
        <div className="EP_Musikisum_Charts_Display EP_Musikisum_Charts_Display--noInput">
          <div style={{ width: `${content.width ?? 100}%`, margin: '0 auto' }}>
            {useCollapsible
              ? (
                <Collapsible
                  title={content.title || null}
                  isCollapsible={behavior !== BEHAVIOR.static}
                  isCollapsed={behavior === BEHAVIOR.expandable}
                  >
                  {lockedContent}
                </Collapsible>
              )
              : lockedContent}
          </div>
        </div>
      );
    }
    const isRoomDocument = typeof window !== 'undefined' && !!window.__initalState__?.room;
    if (!isRoomDocument) {
      return (
        <div className="EP_Musikisum_Charts_Display EP_Musikisum_Charts_Display--noInput">
          <Alert type="warning" showIcon message={t('votingNotAvailable')} />
        </div>
      );
    }

    return (
      <div className={`EP_Musikisum_Charts_Display${!canModifyInput && !hasVoteData ? ' EP_Musikisum_Charts_Display-votingForm' : ''}`}>
        <VotingForm
          content={content}
          input={input}
          canModifyInput={canModifyInput}
          onInputChanged={onInputChanged}
          />
      </div>
    );
  }

  const { behavior, chartType, axisMin, axisMax, chartData } = content;
  const hasData = chartData.labels.length > 0 && chartData.datasets.length > 0;
  const ChartComponent = CHART_COMPONENT[chartType] || Bar;
  const options = buildOptions(chartType, axisMin, axisMax);
  const effectiveBehavior = behavior ?? BEHAVIOR.static;
  const hasTitle = !!content.title;
  const useCollapsible = hasTitle || effectiveBehavior !== BEHAVIOR.static;

  const chartContent = hasData
    ? <ChartComponent data={buildChartJsData(chartData, chartType, content.colorPalette)} options={options} />
    : <div className="EP_Musikisum_Charts_Display-empty">{t('noData')}</div>;

  return (
    <div className="EP_Musikisum_Charts_Display EP_Musikisum_Charts_Display--noInput">
      <div style={{ width: `${content.width ?? 100}%`, margin: '0 auto' }}>
        {useCollapsible
          ? (
            <Collapsible
              title={content.title || null}
              isCollapsible={effectiveBehavior !== BEHAVIOR.static}
              isCollapsed={effectiveBehavior === BEHAVIOR.expandable}
              >
              {chartContent}
            </Collapsible>
          )
          : chartContent}
      </div>
    </div>
  );
}

ChartsDisplay.propTypes = {
  ...sectionDisplayProps
};
