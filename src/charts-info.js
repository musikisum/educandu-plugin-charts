import joi from 'joi';
import React from 'react';
import { BarChartOutlined } from '@ant-design/icons';
import cloneDeep from '@educandu/educandu/utils/clone-deep.js';
import { PLUGIN_GROUP } from '@educandu/educandu/domain/constants.js';

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

class ChartsInfo {
  static typeName = 'musikisum/educandu-plugin-charts';

  getDisplayName(t) {
    return t('musikisum/educandu-plugin-charts:name');
  }

  getIcon() {
    return <BarChartOutlined />;
  }

  getGroups() {
    return [PLUGIN_GROUP.mostUsed, PLUGIN_GROUP.other];
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
      chartType: CHART_TYPE.bar,
      axisMin: null,
      axisMax: null,
      chartData: {
        labels: [],
        datasets: []
      }
    };
  }

  validateContent(content) {
    const schema = joi.object({
      mode: joi.string().valid('chart').required(),
      chartType: joi.string().valid(...Object.values(CHART_TYPE)).required(),
      axisMin: joi.number().allow(null).optional(),
      axisMax: joi.number().allow(null).optional(),
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

    joi.attempt(content, schema, { abortEarly: false, convert: false, noDefaults: true });
  }

  cloneContent(content) {
    return cloneDeep(content);
  }

  redactContent(content) {
    return cloneDeep(content);
  }

  getCdnResources() {
    return [];
  }
}

export default ChartsInfo;
