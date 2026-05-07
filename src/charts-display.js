import React from 'react';
import { Bar, Line, Pie, Doughnut, Radar, PolarArea } from 'react-chartjs-2';
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
import { useTranslation } from 'react-i18next';
import { sectionDisplayProps } from '@educandu/educandu/ui/default-prop-types.js';

ChartJS.register(CategoryScale, LinearScale, RadialLinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

const COLORS = [
  'rgba(54, 162, 235, 0.8)',
  'rgba(255, 99, 132, 0.8)',
  'rgba(75, 192, 192, 0.8)',
  'rgba(255, 206, 86, 0.8)',
  'rgba(153, 102, 255, 0.8)',
  'rgba(255, 159, 64, 0.8)'
];

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

function buildChartJsData(chartData, chartType) {
  const isPieLike = PIE_LIKE_TYPES.has(chartType);

  return {
    labels: chartData.labels,
    datasets: chartData.datasets.map((ds, i) => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: isPieLike
        ? chartData.labels.map((_, j) => COLORS[j % COLORS.length])
        : COLORS[i % COLORS.length],
      borderColor: isPieLike
        ? chartData.labels.map((_, j) => COLORS[j % COLORS.length].replace('0.8', '1'))
        : COLORS[i % COLORS.length].replace('0.8', '1'),
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

export default function ChartsDisplay({ content }) {
  const { t } = useTranslation('musikisum/educandu-plugin-charts');
  const { chartType, axisMin, axisMax, chartData } = content;

  const hasData = chartData.labels.length > 0 && chartData.datasets.length > 0;
  const ChartComponent = CHART_COMPONENT[chartType] || Bar;
  const options = buildOptions(chartType, axisMin, axisMax);

  return (
    <div className="EP_Musikisum_Charts_Display">
      {hasData
        ? <ChartComponent data={buildChartJsData(chartData, chartType)} options={options} />
        : <div className="EP_Musikisum_Charts_Display-empty">{t('noData')}</div>}
    </div>
  );
}

ChartsDisplay.propTypes = {
  ...sectionDisplayProps
};
