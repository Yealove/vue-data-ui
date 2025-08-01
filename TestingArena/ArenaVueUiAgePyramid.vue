<script setup>
import { ref, computed, onMounted } from "vue";
import LocalVueUiAgePyramid from '../src/components/vue-ui-age-pyramid.vue';
import LocalVueDataUi from '../src/components/vue-data-ui.vue';
import Box from "./Box.vue";
import convertArrayToObject from "./convertModel";

const dataset = ref([
    ['2017', 5, 366538, 382762],
    ['2018', 4, 356873, 376705],
    ['2019', 3, 351707, 368670],
    ['2020', 2, 341042, 356678],
    ['2021', 1, 343026, 357351],
    ['2022', 0, 330929, 345538] 
]);

const alternateDataset = ref([
    ['2017', 5, 10, 9],
    ['2018', 4, 11, 10],
    ['2019', 3, 12, 11],
])

const alternateConfig = ref({
    style: {
        backgroundColor: '#CCCCCC',
            title: {
                text: 'Alternate'
            }
    }
})

const isPropsToggled = ref(false);
function toggleProps() {
    isPropsToggled.value = !isPropsToggled.value;
}

function alterDataset() {
    dataset.value.push([
        'ALT',
        1,
        Math.round(Math.random() * 300000) + 100000,
        Math.round(Math.random() * 300000) + 100000
    ])
}

const model = ref([
    { key: 'responsive', def: false, type: 'checkbox'},
    { key: 'userOptions.show', def: true, type: 'checkbox'},
    { key: 'userOptions.buttons.pdf', def: true, type: 'checkbox' },
    { key: 'userOptions.buttons.csv', def: true, type: 'checkbox' },
    { key: 'userOptions.buttons.img', def: true, type: 'checkbox' },
    { key: 'userOptions.buttons.table', def: true, type: 'checkbox' },
    { key: 'userOptions.buttons.fullscreen', def: true, type: 'checkbox' },
    { key: 'userOptions.position', def: 'right', type: 'select', options: ['left', 'right']},
    { key: 'userOptions.showOnChartHover', def: true, type: 'checkbox'},
    { key: 'userOptions.keepStateOnChartLeave', def: true, type: 'checkbox'},

    { key: 'userOptions.print.scale', def: 2, type: 'number', min: 1, max: 5},
    { key: 'userOptions.print.allowTaint', def: true, type: 'checkbox'},
    { key: 'userOptions.print.useCORS', def: true, type: 'checkbox'},
    { key: 'userOptions.print.backgroundColor', def: '#FFFFFF' },
    
    { key: 'style.backgroundColor', def: '#FFFFFF20', type: 'color'},
    { key: 'style.color', def: '#1A1A1A', type: 'color'},
    { key: 'style.fontFamily', def: 'inherit', type: 'text'},
    { key: 'style.height', def: 200, type: 'number', min: 200, max: 1000},
    { key: 'style.width', def: 500, type: 'number', min: 200, max: 1000},
    { key: 'style.layout.padding.top', def: 36, type: 'number', min: 0, max: 100},
    { key: 'style.layout.padding.right', def: 24, type: 'number', min: 0, max: 100},
    { key: 'style.layout.padding.bottom', def: 48, type: 'number', min: 0, max: 100},
    { key: 'style.layout.padding.left', def: 24, type: 'number', min: 0, max: 100},
    { key: 'style.layout.grid.show', def: true, type: 'checkbox'},
    { key: 'style.layout.grid.stroke', def: '#e1e5e8', type: 'color'},
    { key: 'style.layout.grid.strokeWidth', def: 1, type: 'number', min: 0, max: 12},
    { key: 'style.layout.dataLabels.sideTitles.show', def: true, type: 'checckbox'},
    { key: 'style.layout.dataLabels.sideTitles.fontSize', def: 18, type: 'number', min: 8, max: 48},
    { key: 'style.layout.dataLabels.sideTitles.color', def: '#1A1A1A', type: 'color'},
    { key: 'style.layout.dataLabels.sideTitles.useSideColor', def: true, type: 'checkbox'},
    { key: 'style.layout.dataLabels.sideTitles.bold', def: true, type: 'checkbox'},
    { key: 'style.layout.dataLabels.sideTitles.offsetY', def: 0, type: 'number', min: -100, max: 100},
    { key: 'style.layout.dataLabels.xAxis.show', def: true, type:'checkbox'},
    { key: 'style.layout.dataLabels.xAxis.fontSize', def: 12, type: 'number', min: 8, max: 48},
    { key: 'style.layout.dataLabels.xAxis.color', def: '#1A1A1A', type: 'color'},
    { key: 'style.layout.dataLabels.xAxis.bold', def: false, type: 'checkbox'},
    { key: 'style.layout.dataLabels.xAxis.scale', def: 1000, type: 'range', min: 100, max: 10000},
    { key: 'style.layout.dataLabels.xAxis.translation', def: 'in thousands', type: 'text'},
    { key: 'style.layout.dataLabels.yAxis.show', def: true, type: 'checkbox'},
    { key: 'style.layout.dataLabels.yAxis.display', def: 'age', type: 'select', options: ['age', 'year']},
    { key: 'style.layout.dataLabels.yAxis.fontSize', def: 12, type: 'number', min: 8, max: 48},
    { key: 'style.layout.dataLabels.yAxis.color', def: '#1A1A1A', type: 'color'},
    { key: 'style.layout.dataLabels.yAxis.bold', def: false, type: 'checkbox'},
    { key: 'style.layout.dataLabels.yAxis.showEvery', def: 5, type: 'range', min: 1, max: 100},
    { key: 'style.layout.centerSlit.width', def: 20, type: 'number', min: 0, max: 100},
    { key: 'style.layout.bars.gap', def: 2, type: 'number', min: 0, max: 24},
    { key: 'style.layout.bars.borderRadius', def: 2, type: 'number', min: 0, max: 24},
    { key: 'style.layout.bars.left.color', def: '#DC3912', type: 'color'},
    { key: 'style.layout.bars.right.color', def: '#3366CC', type: 'color'},
    { key: 'style.layout.bars.gradient.show', def: true, type: 'checkbox'},
    { key: 'style.layout.bars.gradient.underlayer', def: '#FFFFFF', type: 'color'},
    { key: 'style.layout.bars.gradient.intensity', def: 60, type: 'range', min: 0, max: 100},
    { key: 'style.layout.bars.gradient.shiftHue', def: 0.05, type: 'number', min:0, max: 1, step: 0.01},
    { key: 'style.highlighter.color', def: '#1A1A1A', type: 'color'},
    { key: 'style.highlighter.opacity', def: 5, type: 'range', min: 0, max: 100},
    { key: 'style.title.text', def: 'Lorem ipsum dolor sit amet', type: 'text'},
    { key: 'style.title.color', def: '#1A1A1A', type: 'color'},
    { key: 'style.title.fontSize', def: 20, type: 'number', min: 8, max: 48},
    { key: 'style.title.bold', def: true, type: 'checkbox'},
    { key: 'style.title.subtitle.color', def: '#CCCCCC', type: 'color'},
    { key: 'style.title.subtitle.text', def: 'Lorem ipsum sit amet', type: 'text' },
    { key: 'style.title.subtitle.fontSize', def: 16, type: 'number', min: 8, max: 48},
    { key: 'style.title.subtitle.bold', def: false, type: 'checkbox'},

    { key: 'style.tooltip.show', def: true, type: 'checkbox'},
    { key: 'style.tooltip.backgroundColor', def:'#FFFFFF', type: 'color'},
    { key: 'style.tooltip.color', def: '#1A1A1A', type: 'color'},
    { key: 'style.tooltip.fontSize', def: 14, type: 'number', min: 8, max: 48},
    { key: 'style.tooltip.roundingValue', def: 2, type: 'number', min: 0, max: 12},
    { key: 'style.tooltip.backgroundOpacity', def: 100, type: 'range', min: 0, max: 100},
    { key: 'style.tooltip.position', def: 'center', type: 'select', options: ['left', 'center', 'right']},
    { key: 'style.tooltip.offsetY', def: 24, type: 'number', min: 0, max: 48 },

    { key: 'translations.age', def: 'age', type: 'text'},
    { key: 'translations.male', def: 'male', type: 'text'},
    { key: 'translations.female', def: 'female', type: 'text'},
    { key: 'translations.total', def: 'total', type: 'text'},
    { key: 'translations.year', def: 'year', type: 'text'},
    { key: 'table.show', def: false, type: 'checkbox'},
    { key: 'table.responsiveBreakpoint', def: 400, type: 'number', min: 300, max: 800},
    { key: 'table.th.backgroundColor', def: '#FFFFFF', type: 'color'},
    { key: 'table.th.color', def: '#1A1A1A', type: 'color'},
    { key: 'table.th.outline', def: 'none', type: 'text'},
    { key: 'table.td.backgroundColor', def: '#FFFFFF', type: 'color'},
    { key: 'table.td.color', def: '#1A1A1A', type: 'color'},
    { key: 'table.td.outline', def: 'none', type: 'text'}
])

const testCustomTooltip = ref(false);

const themeOptions = ref([
    "",
    "hack",
    "zen",
    "concrete",
    "default",
    "celebration",
    "celebrationNight"
])

const currentTheme = ref(themeOptions.value[6])

const config = computed(() => {
    const c = convertArrayToObject(model.value)
    if(testCustomTooltip.value) {
        return {
            ...c,
            style: {
                ...c.style,
                tooltip: {
                    ...c.style.tooltip,
                    customFormat: ({ datapoint }) => {
                        // console.log({datapoint})
                        return 'test'
                    }
                }
            }
        }
    } else {
        return {
            ...c,
            style: {
                ...c.style,
                layout: {
                    ...c.style.layout,
                    dataLabels: {
                        ...c.style.layout.dataLabels,
                        xAxis: {
                            ...c.style.layout.dataLabels.xAxis,
                            formatter: ({value, config}) => {
                                // console.log(config)
                                return `X | ${value}`
                            }
                        },
                        yAxis: {
                            ...c.style.layout.dataLabels.yAxis,
                            formatter: ({value}) => {
                                return `Y | ${value}`
                            }
                        },
                    }
                }
            },
            theme: currentTheme.value
        }
    }
});

const step = ref(0);

const local= ref(null);
const build = ref(null);

function toggleTable() {
    local.value.toggleTable();
    build.value.toggleTable();
}

onMounted(async () => {
    if (build.value) {
        const img = await build.value.getImage();
        console.log(img)
    }
})

</script>

<template>
    <button @click="toggleTable">TOGGLE TABLE</button>
    <div style="margin: 12px 0; color: white">
        Theme:
        <select v-model="currentTheme" @change="step += 1">
            <option v-for="opt in themeOptions">{{ opt }}</option>
        </select>
    </div>
    <div style="margin: 12px 0">
        <input type="checkbox" v-model="testCustomTooltip" id="custom-tooltip" />
        <label for="custom-tooltip" style="color:#CCCCCC">Test custom tooltip</label>
    </div>
    <button @click="toggleProps">TOGGLE PROPS: {{ isPropsToggled }}</button>
    <button @click="alterDataset">ALTER DATASET</button>

    <div style="width: 600px; height: 600px; resize: both; overflow: auto; background: white">
        <LocalVueUiAgePyramid :key="`responsive_${step}`" :dataset="dataset" :config="{
            ...config,
            responsive: true
        }">
        <template #chart-background>
            <div style="width: 100%; height: 100%; background: radial-gradient(at top left, red, white)"/>
        </template>
        <template #watermark="{ isPrinting }">
            <div v-if="isPrinting" style="font-size: 100px; opacity: 0.1; transform: rotate(-10deg)">
                WATERMARK
            </div>
        </template>     
        <template #source>
            <div style="width:100%;font-size:10px;text-align:left">
                SOURCE: Lorem ipsum dolor sit, amet consectetur adipisicing elit. Tenetur, molestiae perspiciatis nam quae libero, deserunt in aperiam unde officia sint saepe laboriosam ducimus aspernatur labore! Sapiente aspernatur corrupti quis ad.
            </div>
        </template>
    </LocalVueUiAgePyramid>
    </div>

    <Box comp="VueUiAgePyramid" :dataset="dataset">
        <template #title>VueUiAgePyramid</template>

        <template #local>
            <LocalVueUiAgePyramid :dataset="isPropsToggled ? alternateDataset : dataset" :config="isPropsToggled ? alternateConfig : config" :key="`local_${step}`" ref="local">
                <template #optionPdf>
                    PRINT PDF
                </template>
                <template #svg="{ svg }">
                    <circle :cx="svg.width / 2" :cy="svg.height / 2" :r="30" fill="#42d392" />
                    <text :x="svg.width / 2" :y="svg.height / 2" text-anchor="middle">#SVG</text>
                </template>
                <template #legend="{ legend }">
                    #LEGEND
                    <div style="font-size: 8px">
                        {{ legend }}
                    </div>
                </template>
                <template #tooltip-before="{ datapoint, seriesIndex, series, config, bars, lines, plots }">
                    #BEFORE {{ series.name }}
                </template>
                <template #tooltip-after="{ datapoint, seriesIndex, series, config, bars, lines, plots }">
                    #AFTER {{ series.name }}
                </template>
            </LocalVueUiAgePyramid>
        </template>

        <template #VDUI-local>
            <LocalVueDataUi component="VueUiAgePyramid" :dataset="isPropsToggled ? alternateDataset : dataset" :config="isPropsToggled ? alternateConfig : config" :key="`VDUI-lodal_${step}`" ref="build">
                <template #svg="{ svg }">
                    <circle :cx="svg.width / 2" :cy="svg.height / 2" :r="30" fill="#42d392" />
                    <text :x="svg.width / 2" :y="svg.height / 2" text-anchor="middle">#SVG</text>
                </template>
                <template #legend="{ legend }">
                    #LEGEND
                    <div style="font-size: 8px">
                        {{ legend }}
                    </div>
                </template>
                <template #tooltip-before="{ datapoint, seriesIndex, series, config, bars, lines, plots }">
                    #BEFORE {{ series.name }}
                </template>
                <template #tooltip-after="{ datapoint, seriesIndex, series, config, bars, lines, plots }">
                    #AFTER {{ series.name }}
                </template>
            </LocalVueDataUi>
        </template>

        <template #build>
            <VueUiAgePyramid :dataset="isPropsToggled ? alternateDataset : dataset" :config="isPropsToggled ? alternateConfig : config" :key="`build_${step}`">
                <template #svg="{ svg }">
                    <circle :cx="svg.width / 2" :cy="svg.height / 2" :r="30" fill="#42d392" />
                    <text :x="svg.width / 2" :y="svg.height / 2" text-anchor="middle">#SVG</text>
                </template>
                <template #legend="{ legend }">
                    #LEGEND
                    <div style="font-size: 8px">
                        {{ legend }}
                    </div>
                </template>
                <template #tooltip-before="{ datapoint, seriesIndex, series, config, bars, lines, plots }">
                    #BEFORE {{ series.name }}
                </template>
                <template #tooltip-after="{ datapoint, seriesIndex, series, config, bars, lines, plots }">
                    #AFTER {{ series.name }}
                </template>
            </VueUiAgePyramid>
        </template>

        <template #VDUI-build>
            <VueDataUi component="VueUiAgePyramid" :dataset="isPropsToggled ? alternateDataset : dataset" :config="isPropsToggled ? alternateConfig : config" :key="`VDUI-build_${step}`">
                <template #svg="{ svg }">
                    <circle :cx="svg.width / 2" :cy="svg.height / 2" :r="30" fill="#42d392" />
                    <text :x="svg.width / 2" :y="svg.height / 2" text-anchor="middle">#SVG</text>
                </template>
                <template #legend="{ legend }">
                    #LEGEND
                    <div style="font-size: 8px">
                        {{ legend }}
                    </div>
                </template>
                <template #tooltip-before="{ datapoint, seriesIndex, series, config, bars, lines, plots }">
                    #BEFORE {{ series.name }}
                </template>
                <template #tooltip-after="{ datapoint, seriesIndex, series, config, bars, lines, plots }">
                    #AFTER {{ series.name }}
                </template>
            </VueDataUi>
        </template>

        <template #knobs>
            <div
                style="display: flex; flex-direction: row; flex-wrap:wrap; align-items:center; width: 100%; color: #CCCCCC; gap:24px;">
                <div v-for="knob in model">
                    <label style="font-size: 10px">{{ knob.key }}</label>
                    <div
                        style="display:flex; flex-direction:row; flex-wrap: wrap; align-items:center; gap:6px; height: 40px">
                        <input v-if="!['none', 'select'].includes(knob.type)" :step="knob.step" :type="knob.type" :min="knob.min ?? 0"
                            :max="knob.max ?? 0" v-model="knob.def" @change="step += 1">
                        <select v-if="knob.type === 'select'" v-model="knob.def" @change="step += 1">
                            <option v-for="opt in knob.options">{{ opt }}</option>
                        </select>
                    </div>
                </div>
            </div>
        </template>

        <template #config>
            {{ config }}
        </template>
    </Box>
</template>