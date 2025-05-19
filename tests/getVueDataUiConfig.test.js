import { expect, test, describe } from "vitest";
import getVueDataUiConfig from "../src/getVueDataUiConfig";
import { useConfig } from "../src/useConfig";

describe('getVueDataUiConfig', () => {

    const components = [
        "heatmap",
        '3d_bar',
        'accordion',
        'age_pyramid',
        'annotator',
        'candlestick',
        'chestnut',
        'cursor',
        'dashboard',
        'digits',
        'donut',
        'donut_evolution',
        'dumbbell',
        'galaxy',
        'gauge',
        'kpi',
        'mini_loader',
        'molecule',
        'mood_radar',
        'nested_donuts',
        'onion',
        'quadrant',
        'quick_chart',
        'radar',
        'rating',
        'relation_circle',
        'rings',
        'scatter',
        'skeleton',
        'smiley',
        'spark_trend',
        'sparkbar',
        'sparkgauge',
        'sparkhistogram',
        'sparkline',
        'sparkstackbar',
        'strip_plot',
        'table',
        'table_heatmap',
        'table_sparkline',
        'thermometer',
        'tiremarks',
        'vertical_bar',
        'waffle',
        'wheel',
        'xy',
    ]

    components.forEach(component => {
        test(`returns vue_ui_${component} config`, () => {
            const expectedConfig = useConfig()[`vue_ui_${component}`]
            expect(getVueDataUiConfig(`vue_ui_${component}`)).not.toBeUndefined();
            expect(getVueDataUiConfig(`vue_ui_${component}`)).toStrictEqual(expectedConfig);
        })
    })
})