import joi from 'joi';
import React from 'react';
import ChartIcon from './chart-icon.js';
import uniqueId from '@educandu/educandu/utils/unique-id.js';
import cloneDeep from '@educandu/educandu/utils/clone-deep.js';
import { PLUGIN_GROUP } from '@educandu/educandu/domain/constants.js';

export const BEHAVIOR = {
  static: 'static',
  expandable: 'expandable',
  collapsible: 'collapsible'
};

export const CHART_TYPE = {
  bar: 'bar',
  barHorizontal: 'barHorizontal',
  line: 'line',
  pie: 'pie',
  doughnut: 'doughnut',
  radar: 'radar',
  polarArea: 'polarArea'
};

export const AXIS_CHART_TYPES = new Set([
  'bar', 'barHorizontal', 'line', 'radar', 'polarArea'
]);

export const COLOR_PALETTE = {
  tableau: 'tableau',
  set2: 'set2'
};

const chartSchema = joi.object({
  mode: joi.string().valid('chart').required(),
  behavior: joi.string().valid(...Object.values(BEHAVIOR)).optional(),
  title: joi.string().allow('').optional(),
  width: joi.number().min(0).max(100).optional(),
  chartType: joi.string().valid(...Object.values(CHART_TYPE)).required(),
  axisMin: joi.number().allow(null).optional(),
  axisMax: joi.number().allow(null).optional(),
  colorPalette: joi.string().valid(...Object.values(COLOR_PALETTE)).optional(),
  chartData: joi.object({
    labels: joi.array().items(joi.string().allow('')).required(),
    datasets: joi.array().items(joi.object({
      label: joi.string().allow('').required(),
      data: joi.array().items(joi.number()).required()
    })).required()
  }).required()
}).custom((value, helpers) => {
  if (value.axisMin !== null && value.axisMax !== null && value.axisMin >= value.axisMax) {
    return helpers.error('any.invalid');
  }
  return value;
});

const votingSchema = joi.object({
  mode: joi.string().valid('voting').required(),
  behavior: joi.string().valid(...Object.values(BEHAVIOR)).optional(),
  title: joi.string().allow('').optional(),
  width: joi.number().min(0).max(100).optional(),
  votingId: joi.string().required(),
  ownerUserId: joi.string().allow(null).optional(),
  ownerVotes: joi.boolean().optional(),
  questions: joi.array().items(joi.object({
    key: joi.string().required(),
    text: joi.string().allow('').required(),
    multipleChoice: joi.boolean().optional(),
    maxSelections: joi.number().integer().min(2).allow(null).optional(),
    options: joi.array().items(joi.object({
      key: joi.string().required(),
      text: joi.string().allow('').required()
    })).min(1).required()
  })).required(),
  colorPalette: joi.string().valid(...Object.values(COLOR_PALETTE)).optional(),
  axisMin: joi.number().allow(null).optional(),
  axisMax: joi.number().allow(null).optional(),
  isLocked: joi.boolean().required(),
  results: joi.object().allow(null).required()
});

export function createDefaultVotingContent(ownerUserId = null) {
  return {
    mode: 'voting',
    behavior: BEHAVIOR.static,
    title: '',
    width: 100,
    votingId: uniqueId.create(),
    ownerUserId,
    ownerVotes: true,
    colorPalette: COLOR_PALETTE.tableau,
    axisMin: null,
    axisMax: null,
    questions: [],
    isLocked: false,
    results: null
  };
}

class ChartsInfo {
  static typeName = 'musikisum/educandu-plugin-charts';
  allowsInput = true;

  getDisplayName(t) {
    return t('musikisum/educandu-plugin-charts:name');
  }

  getIcon() {
    return <ChartIcon />;
  }

  getGroups() {
    return [PLUGIN_GROUP.textImage, PLUGIN_GROUP.userInput, PLUGIN_GROUP.other];
  }

  async resolveDisplayComponent() {
    return (await import('./charts-display.js')).default;
  }

  async resolveEditorComponent() {
    return (await import('./charts-editor.js')).default;
  }

  getDefaultContent() {
    return {
      mode: 'chart',
      behavior: BEHAVIOR.static,
      title: '',
      width: 100,
      chartType: CHART_TYPE.bar,
      axisMin: null,
      axisMax: null,
      colorPalette: COLOR_PALETTE.tableau,
      chartData: {
        labels: [],
        datasets: []
      }
    };
  }

  validateContent(content) {
    const schema = content?.mode === 'voting' ? votingSchema : chartSchema;
    joi.attempt(content, schema, { abortEarly: false, convert: false, noDefaults: true });
  }

  cloneContent(content) {
    if (content.mode !== 'voting') {return cloneDeep(content);}
    return {
      ...cloneDeep(content),
      votingId: uniqueId.create(),
      isLocked: false,
      results: null
    };
  }

  redactContent(content) {
    return cloneDeep(content);
  }

  getCdnResources() {
    return [];
  }
}

export default ChartsInfo;
