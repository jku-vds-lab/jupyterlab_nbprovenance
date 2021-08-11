// prov-tree.spec.js created with Cypress
/// <reference types="cypress" />

describe('Provenance Tree', () => {
    before('jupyter successfully opens', () => {
        // token can be set in jupyter_notebook_config.py
        cy.visit('http://localhost:8888/?token=test')
    })

    beforeEach('create new notebook', () => {
        // close all tabs
        cy.get('.lm-MenuBar-itemLabel.p-MenuBar-itemLabel').contains('File').click()
        cy.get('.lm-Menu-itemLabel.p-Menu-itemLabel').contains('Close All Tabs').click()

        // open new notebook
        //cy.get('[title="New Launcher"').click()
        cy.get('[data-category="Notebook"]').click()
        cy.wait(1000)

        // rename notebook
        cy.get('.jp-DirListing-item.jp-mod-selected.jp-mod-running').rightclick()
        cy.get('[data-command="filebrowser:rename"]').click()
        cy.focused().type('test' + Date.now() + '{enter}')
    })

    it('build tree', () => {
        // get first cell and write to it
        cy.get('.jp-Notebook-cell').last().find('textarea').first().focus()
        cy.focused().type('test')

        // add cells
        addCell('raw', 'test')
        addCell('markdown', 'test')

        // click node in prov graph
        clickNode(6)

        // add another cell and execute it
        addCell('code', '1 + 2')
        executeCell()
    })

    afterEach('delete notebook', () => {
        // delete the current notebook
        cy.get('.jp-DirListing-item.jp-mod-selected.jp-mod-running').rightclick()
        cy.get('[data-command="filebrowser:delete"]').click()
        cy.focused().click()
    })

    // select the type of the active cell
    function selectCellType(type) {
        cy.get('select').filter('[aria-label="Cell type"]').select(type)
    }

    // add new cell, set type and content
    function addCell(type, content) {
        cy.get('[title="Insert a cell below"]').click()
        // focus on last cell (might not be the one that was inserted)
        cy.get('.jp-Notebook-cell').last().find('textarea').last().focus()
        cy.focused().should('have.prop', 'nodeName', 'TEXTAREA')
        cy.focused().type(content).should('contain.value', content)
        selectCellType(type)
    }

    // click node in prov graph
    function clickNode(index) {
        cy.get('[transform="translate(0, ' + (index * 50) + ')"]').find('path').first().click()
    }

    // execute active cell
    function executeCell() {
        cy.get('[title="Run the selected cells and advance"]').click()
    }
})
