import React, { useEffect } from 'react';
import { Alert, Space } from 'antd';
import VotingForm from './voting-form.js';
import { useTranslation } from 'react-i18next';
import { BEHAVIOR, COLOR_PALETTE } from './charts-info.js';
import Collapsible from '@educandu/educandu/components/collapsible.js';
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
  [COLOR_PALETTE.set2]: ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f', '#e5c494', '#b3b3b3']
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
    return chartType === 'barHorizontal' ? { responsive: true, indexAxis: 'y' } : { responsive: true };
  }
  switch (chartType) {
    case 'barHorizontal':
      return { responsive: true, indexAxis: 'y', scales: { x: scaleOpts } };
    case 'bar':
    case 'line':
      return { responsive: true, scales: { y: scaleOpts } };
    case 'radar':
    case 'polarArea':
      return { responsive: true, scales: { r: scaleOpts } };
    default:
      return { responsive: true };
  }
}

export default function ChartsDisplay({ content, input, canModifyInput, onInputChanged }) {
  const { t } = useTranslation('musikisum/educandu-plugin-charts');

  useEffect(() => {
    const handleResize = () => {
      window.requestAnimationFrame(() => {
        Object.values(ChartJS.instances).forEach(c => c.resize());
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
                  options={{ ...buildOptions('bar', content.axisMin ?? null, content.axisMax ?? null), plugins: { legend: { display: !multipleQuestions } } }}
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
