import VueUiStackbar from "./vue-ui-stackbar.vue";
import { components } from "../../cypress/fixtures/vdui-components";
import { testCommonFeatures } from "../../cypress/fixtures";

const { dataset, config } = components.find(c => c.name === 'VueUiStackbar');

describe('<VueUiStackbar />', () => {

    function commonTest() {
        testCommonFeatures({
            userOptions: true,
            title: true,
            subtitle: true,
            slicer: true,
            table: true,
            legend: true,
            tooltipCallback: () => {
                cy.get('[data-cy="tooltip-trap"]').first().trigger('mouseenter');
            }
        });

        cy.log('axes');
        cy.get('[data-cy="line-axis-x"]').should('exist');
        cy.get('[data-cy="line-axis-y"]').should('exist');
        cy.get('[data-cy="axis-label-x"]').should('exist').and('be.visible').and('contain', config.style.chart.grid.x.axisName.text)
        cy.get('[data-cy="axis-label-y"]').should('exist').and('be.visible').and('contain', config.style.chart.grid.y.axisName.text)

        cy.log('scale labels');
        cy.get('[data-cy="scale-line-y"]').should('exist').and('have.length', 9);
        cy.get('[data-cy="scale-label-y"]').as('yLabels').should('exist').and('be.visible').and('have.length', 9);
        cy.get('@yLabels').first().contains(-60)
        cy.get('@yLabels').last().contains(100)

        cy.log('time labels');
        cy.get('[data-cy="time-label"]').as('timeLabels').should('exist').and('be.visible').and('have.length', Math.max(...dataset.map(d => d.series.length)));
        cy.get('@timeLabels').each((label, i) => {
            cy.wrap(label).as('label');
            cy.get('@label').contains(i);
        });

        cy.log('total labels');
        cy.get('[data-cy="label-total"]').should('exist').and('be.visible').and('have.length', Math.max(...dataset.map(d => d.series.length)));

        cy.log('datapoint labels');
        cy.get('[data-cy="label-datapoint"]').should('exist').and('be.visible');
    }

    it('renders vertically', () => {
        cy.mount(VueUiStackbar, {
            props: {
                dataset,
                config
            }
        }).then(() => {
            commonTest();
        });
    });

    it('renders horizontally', () => {
        cy.mount(VueUiStackbar, {
            props: {
                dataset,
                config: { ...config, orientation: 'horizontal' }
            }
        }).then(() => {
            commonTest();
        });
    });
});