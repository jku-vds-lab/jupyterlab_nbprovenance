import { Toolbar, ToolbarButton } from "@jupyterlab/apputils";
import { Panel } from "@lumino/widgets";
import "../style/cell-view.css";
import { undoIcon, redoIcon } from "@jupyterlab/ui-components";
import { isChildNode, Provenance } from "@visdesignlab/trrack";
import { EventType, IApplicationExtra, IApplicationState } from "./notebook-provenance";
import { Notebook } from "@jupyterlab/notebook";



export class CellView extends Panel {

    // ui elements
    private cellList: Panel;
    private undoButton: ToolbarButton;
    private redoButton: ToolbarButton;

    // data
    private notebook: Notebook;
    private prov: Provenance<IApplicationState, EventType, IApplicationExtra>;

    constructor() {
        super();

        this.addClass("np-cellview");

        // add toolbar
        let toolbar = new Toolbar();
        toolbar.addClass("np-cellviewtoolbar");
        this.addWidget(toolbar);

        // add undo redo buttons
        this.undoButton = new ToolbarButton({
            icon: undoIcon,
            onClick: () => this.prov.goToNode(this.getUndoNode()!)
        });

        this.redoButton = new ToolbarButton({
            icon: redoIcon,
            onClick: () => this.prov.goToNode(this.getRedoNode()!)
        });

        toolbar.addItem("undo", this.undoButton);
        toolbar.addItem("redo", this.redoButton);

        // add cell list
        this.cellList = new Panel();
        this.cellList.addClass("np-cellviewlist");
        this.addWidget(this.cellList);
    }

    /**
     * Set notebook and provenance properties, then update view
     */
    setup(notebook: Notebook, prov: Provenance<IApplicationState, EventType, IApplicationExtra>) {
        this.notebook = notebook;
        this.prov = prov;
        this.prov.addGlobalObserver(() => this.update());
        this.update();
    }

    /**
     * Handle update request. Generate cell list and setup undo/redo buttons.
     */
    onUpdateRequest() {
        if (!this.isVisible || !this.prov) { return; }

        // clear list
        while (this.cellList.node.firstChild) { this.cellList.node.firstChild.remove(); }

        // create cell list
        this.prov.state.model.cells.forEach((c, i) => {
            let cell = document.createElement("div");
            cell.className = "np-cellviewcell";
            cell.addEventListener("click", () => this.notebook.activeCellIndex = i);
            cell.style.height = this.notebook.widgets[i].node.offsetHeight.toString() + "px";

            this.cellList.node.appendChild(cell);

            // highlight active cell
            if (this.notebook.activeCellIndex === i) {
                cell.classList.add("np-selectedcell");
            }
        });

        // setup undo redo buttons
        this.undoButton.node.firstElementChild?.toggleAttribute("disabled", this.getUndoNode() === null ? true : false);
        this.redoButton.node.firstElementChild?.toggleAttribute("disabled", this.getRedoNode() === null ? true : false);
    }

    /**
     * Find the last non-ephemeral node where the active cell has changed
     * @returns the node id to jump to or null if none exists
     */
    getUndoNode(): string | null {
        if (!isChildNode(this.prov.current)) { return null; }

        // search for node upwards in the tree
        let node = this.prov.graph.nodes[this.prov.current.parent];
        while (isChildNode(node) && (node.metadata.changedCellId !== this.notebook.activeCellIndex || node.actionType === "Ephemeral")) {
            node = this.prov.graph.nodes[node.parent];
        }

        return node.metadata.changedCellId === this.notebook.activeCellIndex ? node.id : this.prov.current.parent;
    }

    /**
     * Find the next non-ephemeral node where the active cell will change
     * @returns the node id to jump to or null if none exists
     */
    getRedoNode(): string | null {
        if (!this.prov.current.children || this.prov.current.children.length === 0) { return null; }

        // search for node downwards in the tree
        let node = this.prov.graph.nodes[this.prov.current.children[this.prov.current.children.length - 1]];
        while (node.children.length > 0 && (node.metadata.changedCellId !== this.notebook.activeCellIndex || node.actionType === "Ephemeral")) {
            node = this.prov.graph.nodes[node.children[node.children.length - 1]];
        }

        return node.metadata.changedCellId === this.notebook.activeCellIndex ? node.id : null;
    }
}
