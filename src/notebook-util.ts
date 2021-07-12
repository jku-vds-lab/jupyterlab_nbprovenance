import { Notebook } from "@jupyterlab/notebook";
import { PartialJSONValue } from "@lumino/coreutils";

// Utility functions for Jupyter Notebook
export class NotebookUtil {

    // exports the cells of a notebook as JSON data
    public static exportModel(notebook: Notebook): PartialJSONValue {
        let model: any = notebook.model!.toJSON();
        return { cells: model.cells };
    }

    // import the cells of a notebook from JSON data
    public static importModel(notebook: Notebook, impModel: any) {
        let cmodel: any = notebook.model!.toJSON();
        cmodel.cells = impModel.cells;
        (cmodel.cells as any[]).forEach(c => { if (typeof c.execution_count === "object") { c.execution_count = null; } });
        notebook.model!.fromJSON(cmodel);
    }
}
