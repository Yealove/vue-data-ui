import Tooltip from './Tooltip.vue'

describe('<Tooltip />', () => {

  beforeEach(() => {
    cy.mount(Tooltip, {
      props: {
        content: `<div data-cy="tooltip-content">Content</div>`,
        show: true,
        disableSmoothing: true,
        smooth: false
      },
      slots: {
        default: {
          render: () => 'Default slot'
        },
        ['tooltip-before']: {
          render: () => 'Slot before'
        },
        ['tooltip-after']: {
          render: () => 'Slot after'
        },
      }
    })
  })

  it('renders all contents', () => {
    cy.contains('Default slot')
    cy.contains('Content')
    cy.contains('Slot before')
    cy.contains('Slot after')
  })

  it('follows the mouse', () => {
    cy.get('body').trigger('mousemove', { clientX: 200, clientY: 200, force: true})
    cy.get('[data-cy="tooltip"]').should('have.css', 'top', '0px')
    cy.get('[data-cy="tooltip"]').should('have.css', 'left', '0px')
    cy.get('[data-cy="tooltip"]').should('have.css', 'transform', 'matrix(1, 0, 0, 1, 200, 224)')
  })
})