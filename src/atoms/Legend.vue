<script setup>
import { isValidUserValue } from '../lib';
import Shape from './Shape.vue';

const props = defineProps({
    legendSet: {
        type: Array,
        default() {
            return []
        } 
    },
    config: {
        type: Object,
        default() {
            return {}
        }
    },
    id: {
        type: String,
        default: ''
    },
    clickable: {
        type: Boolean,
        default: true
    }
})

const emit = defineEmits(['clickMarker'])

function handleClick(legend, i) {
    emit('clickMarker', { legend, i})
}

</script>

<template>
    <div
        :id="id"
        :data-cy="config.cy"
        class="vue-data-ui-legend"
        :style="`background:${config.backgroundColor};font-size:${config.fontSize}px;color:${config.color};padding-bottom:${config.paddingBottom}px;padding-top:${config.paddingTop || 12}px;font-weight:${config.fontWeight}`"
    >
        <slot name="legendTitle" :titleSet="legendSet"></slot>
        <div v-for="(legend, i) in legendSet" :key="`legend_${i}`" :class="{ 'vue-data-ui-legend-item': true, 'active': clickable }">
            <svg @click="handleClick(legend, i)" v-if="legend.shape" :height="config.fontSize" :width="config.fontSize" viewBox="0 0 60 60" :style="`overflow: visible;opacity:${legend.opacity}`">
                <Shape
                    :shape="legend.shape"
                    :radius="30"
                    stroke="none"
                    :plot="{ x: 30, y: 30 }"
                    :fill="legend.color"
                />
                <slot name="legend-pattern" v-bind="{ legend, index: isValidUserValue(legend.absoluteIndex) ? legend.absoluteIndex : i}"/>
            </svg>
            <slot name="item" :legend="legend" :index="i"/>
        </div>
    
    </div>
</template>

<style scoped>
.vue-data-ui-legend {
    user-select:none;
    height: fit-content;
    width:100%;
    display: flex;
    align-items:center;
    flex-wrap: wrap;
    justify-content:center;
    column-gap: 18px;
}
.vue-data-ui-legend-item {
    user-select: none;
    display: flex;
    align-items:center;
    gap: 6px;
    height: fit-content;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.active {
    cursor: pointer;
}
</style>