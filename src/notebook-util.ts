import { Notebook } from "@jupyterlab/notebook";
import { INBCell, INBModel } from "./notebook-provenance";
import { ICellModel } from "@jupyterlab/cells";
import { findIndex } from "@lumino/algorithm";

/**
 * Utility functions for Jupyter Notebook
 */
export class NotebookUtil {

    /**
     * Export the cells of a notebook as JSON data
     */
    public static exportModel(notebook: Notebook): INBModel {
        let model: any = notebook.model!.toJSON();
        return { cells: model.cells };
    }

    /**
     * Export a cell of a notebook as JSON data
     */
    public static exportCell(notebook: Notebook, index: number): INBCell {
        return notebook.model!.cells.get(index).toJSON() as INBCell;
    }

    /**
     * Import the cells of a notebook from JSON data
     */
    public static importModel(notebook: Notebook, impModel: INBModel) {
        // we need the metadata of the notebook and only the cells of the imported model
        let cmodel: any = notebook.model!.toJSON();
        cmodel.cells = impModel.cells;
        // an empty execution count is exported as an empty object, which the import function complains about
        (cmodel.cells as any[]).forEach(c => { if (typeof c.execution_count === "object") { c.execution_count = null; } });
        notebook.model!.fromJSON(cmodel);
    }

    /**
     * Get the index of a cell
     */
    public static getCellIndex(notebook: Notebook, cell: ICellModel): number {
        let index = -1;
        if (notebook.model && notebook.model.cells) {
            index = findIndex(notebook.model.cells, c => c === cell);
        } else {
            throw new Error("Unable to find cell in notebook");
        }
        return index;
    }
}
