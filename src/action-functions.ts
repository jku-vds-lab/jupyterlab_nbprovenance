import { CellType } from '@jupyterlab/nbformat';
import { NotebookActions, Notebook } from '@jupyterlab/notebook';

/**
 * Define available action functions that are calling the NotebookActions
 *
 * All functions of these class are automatically registered in the
 * `ActionFunctionRegistry` object in `NotebookProvenance`.
 *
 * Be aware that renaming function names will break existing provenance graphs!
 */
export class ActionFunctions {
    public pauseTracking: boolean = false;

    constructor(private notebook: Notebook) { }



    public async moveCell(fromIndex: number, toIndex: number) {
        console.log('moved cell to index', fromIndex, toIndex);

        this.pauseTracking = true;
        this.notebook.model!.cells.move(fromIndex, toIndex);
        this.pauseTracking = false;

        return null;
    }

    public async setCell(index: number, cellType: string) {
        console.log('set cell at index', index, cellType);
        this.pauseTracking = true;
        NotebookActions.changeCellType(this.notebook, cellType as CellType);
        this.pauseTracking = false;

        return null;
    }

    public async changeActiveCell(index: number) {
        console.log('change active cell to index', index);

        this.pauseTracking = true;
        this.notebook.activeCellIndex = index;
        this.pauseTracking = false;

        return null;
    }

    public async cellValue(index: number, value: string) {
        const cell = this.notebook.model!.cells.get(index);
        if (cell) {
            cell.value.text = value;
        }
    }
}
