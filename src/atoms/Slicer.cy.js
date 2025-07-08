import { ref, reactive } from "vue";
import Slicer from "./Slicer.vue";

const ds = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1]

describe("<Slicer />", () => {
    function mountSlicer() {
        const FINAL_CONFIG = reactive({
            style: {
                chart: {
                    zoom: {
                        show: true,
                        color: "#42d392",
                        fontSize: 12,
                        useResetSlot: true,
                        highlightColor: "#3A3A3A",
                        startIndex: null,
                        endIndex: 5,
                        enableRangeHandles: true,
                        enableSelectionDrag: true,
                    },
                    backgroundColor: "#ecf0f1",
                    color: "#333",
                    layout: {
                        grid: {
                            xAxis: {
                                dataLabels: {
                                    values: ds.map((d,i) => {
                                        return `____ ${i} ____`
                                    }),
                                },
                            },
                        },
                    },
                },
            },
        });

        const maxLength = ref(ds.length);
        const slicerStep = ref(1);
        const slicer = reactive({ start: 0, end: ds.length });

        return cy.mount({
            components: { Slicer },
            setup() {
                return {
                    FINAL_CONFIG,
                    maxLength,
                    slicerStep,
                    slicer,
                    minimap: ds
                };
            },
            template: `
        <div style="background: #f8f9fa; padding: 10px;">
            <Slicer
                ref="slicerComponent"
                :key="'slicer_' + slicerStep"
                :background="FINAL_CONFIG.style.chart.zoom.color"
                :borderColor="FINAL_CONFIG.style.chart.backgroundColor"
                :fontSize="FINAL_CONFIG.style.chart.zoom.fontSize"
                :useResetSlot="FINAL_CONFIG.style.chart.zoom.useResetSlot"
                :labelLeft="FINAL_CONFIG.style.chart.layout.grid.xAxis.dataLabels.values[Number(slicer.start)] || ''"
                :labelRight="FINAL_CONFIG.style.chart.layout.grid.xAxis.dataLabels.values[Number(slicer.end) - 1] || ''"
                :textColor="FINAL_CONFIG.style.chart.color"
                :inputColor="FINAL_CONFIG.style.chart.zoom.color"
                :selectColor="FINAL_CONFIG.style.chart.zoom.highlightColor"
                :minimap="minimap"
                :max="maxLength"
                :min="0"
                :valueStart="slicer.start"
                :valueEnd="slicer.end"
                v-model:start="slicer.start"
                v-model:end="slicer.end"
                :refreshStartPoint="FINAL_CONFIG.style.chart.zoom.startIndex !== null ? FINAL_CONFIG.style.chart.zoom.startIndex : 0"
                :refreshEndPoint="FINAL_CONFIG.style.chart.zoom.endIndex !== null ? FINAL_CONFIG.style.chart.zoom.endIndex + 1 : maxLength"
                :enableRangeHandles="FINAL_CONFIG.style.chart.zoom.enableRangeHandles"
                :enableSelectionDrag="FINAL_CONFIG.style.chart.zoom.enableSelectionDrag"
            />
        </div>
    `,
        }).then(({ wrapper }) => {
            return wrapper
        })
    }

    it('shows start & end labels on hover', () => {
        mountSlicer();
        cy.get('[data-cy="slicer"]').trigger('mouseenter')
        cy.get('[data-cy="slicer-label-left"]').as('left').should('exist').and('be.visible').and('contain', '____ 0 ____')
        cy.get('[data-cy="slicer-label-right"]').as('right').should('exist').and('be.visible').and('contain', `____ ${ds.length-1} ____`)
        cy.get('[data-cy="slicer"]').trigger('mouseleave')
        cy.get('@right').should('not.be.visible')
        cy.get('@left').should('not.be.visible')
    });

    it("uses range handles and updates bounds", () => {
        mountSlicer().then((cmp) => {
            const slicer = cmp.vm.slicer;

            cy.get('[data-cy="slicer-handle-left"]')
                .invoke("val", 1)
                .trigger("input", { force: true });

            cy.get('[data-cy="slicer-handle-right"]')
                .invoke("val", 8)
                .trigger("input", { force: true });

            cy.wrap(slicer).should('have.property', 'start', 1);
            cy.wrap(slicer).should('have.property', 'end', 8);
            cy.get('[data-cy="slicer"]').trigger('mouseenter')
            cy.get('[data-cy="slicer-label-left"]').as('left').should('exist').and('be.visible').and('contain', '____ 1 ____')
            cy.get('[data-cy="slicer-label-right"]').as('right').should('exist').and('be.visible').and('contain', '____ 7 ____')
        });
    });

    it('drags selection and updates bounds from the minimap', () => {
        mountSlicer().then(cmp => {
            const slicer = cmp.vm.slicer;
            cy.get('[data-cy="slicer-handle-left"]')
                .invoke("val", 2)
                .trigger("input", { force: true });

            cy.get('[data-cy="slicer-handle-right"]')
                .invoke("val", 10)
                .trigger("input", { force: true });

            cy.wait(100)
            cy.get('[data-cy="slicer-minimap-selection-rect"]')
                .trigger('mousedown', { force: true })
                .trigger('mousemove', {force: true, clientX: 400 })

            cy.wrap(slicer).should('have.property', 'start', 3);
            cy.wrap(slicer).should('have.property', 'end', 11);
            cy.get('[data-cy="slicer-label-left"]').as('left').should('exist').and('be.visible').and('contain', '____ 3 ____')
            cy.get('[data-cy="slicer-label-right"]').as('right').should('exist').and('be.visible').and('contain', '____ 10 ____')
        })
    })

    it('drags selection and updates bounds from the range highlight', () => {
        mountSlicer().then(cmp => {
            const slicer = cmp.vm.slicer;
            cy.get('[data-cy="slicer-handle-left"]')
                .invoke("val", 2)
                .trigger("input", { force: true });

            cy.get('[data-cy="slicer-handle-right"]')
                .invoke("val", 10)
                .trigger("input", { force: true });

            cy.wait(100)
            cy.get('[data-cy="slicer-range-highlight"]')
                .trigger('mousedown', { force: true })
                .trigger('mousemove', {force: true, clientX: 400 })

            cy.wrap(slicer).should('have.property', 'start', 3);
            cy.wrap(slicer).should('have.property', 'end', 11);
            cy.get('[data-cy="slicer-label-left"]').as('left').should('exist').and('be.visible').and('contain', '____ 3 ____')
            cy.get('[data-cy="slicer-label-right"]').as('right').should('exist').and('be.visible').and('contain', '____ 10 ____')
        })
    })

    it('merges tooltips when they collide on the same index', () => {
        mountSlicer().then(cmp => {
            cy.get('[data-cy="slicer-handle-left"]')
                .invoke("val", 2)
                .trigger("input", { force: true });

            cy.get('[data-cy="slicer-handle-right"]')
            .invoke("val", 2)
            .trigger("input", { force: true });

            cy.wait(100)
            cy.get('[data-cy="slicer-range-highlight"]')
                .trigger('mousedown', { force: true })
                .trigger('mousemove', {force: true, clientX: 400 })

            cy.get('[data-cy="slicer-label-merged"]').should('be.visible').and('contain', '____ 3 ____')
            cy.get('[data-cy="slicer-label-left"]').should('not.be.visible')
            cy.get('[data-cy="slicer-label-right"]').should('not.be.visible')
        })
    })

    it('merges the two labels in a single tooltip when tooltips collide', () => {
        mountSlicer().then(cmp => {
            cy.get('[data-cy="slicer-handle-left"]')
                .invoke("val", 2)
                .trigger("input", { force: true });

            cy.get('[data-cy="slicer-handle-right"]')
            .invoke("val", 4)
            .trigger("input", { force: true });

            cy.wait(100)
            cy.get('[data-cy="slicer-range-highlight"]')
                .trigger('mousedown', { force: true })
                .trigger('mousemove', {force: true, clientX: 400 })

            cy.get('[data-cy="slicer-label-merged"]').should('be.visible').and('contain', '____ 3 ____ - ____ 4 ____');
            cy.get('[data-cy="slicer-label-left"]').should('not.be.visible')
            cy.get('[data-cy="slicer-label-right"]').should('not.be.visible')
        })
    })
});
