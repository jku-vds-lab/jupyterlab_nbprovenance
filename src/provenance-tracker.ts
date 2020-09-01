import { Notebook, NotebookActions } from '@jupyterlab/notebook';
import { IObservableList } from '@jupyterlab/observables';
import { ICellModel, Cell } from '@jupyterlab/cells';
import {ApplicationState, NotebookProvenance} from './notebook-provenance';
import { toArray } from '@lumino/algorithm';
import {PartialJSONValue} from '@lumino/coreutils';

/**
 * A notebook widget extension that adds a button to the toolbar.
 */
export class NotebookProvenanceTracker {
  // the initial values are needed because in new notebooks the very first change would not be tracked otherwise
  public _prevActiveCellValue: string = "";
  public _prevActiveCellIndex: number = 0;
  public _prevModel: PartialJSONValue = Object();
  // public _prevValuesLoadedByProvenance: Boolean;



  /**
   *
   */
  constructor(private notebookProvenance: NotebookProvenance) {
    this.trackActiveCell();
    this.trackCellsChanged();
    this.trackCellExecution();
  }


  trackActiveCell(): any {
    // console.log("trackActiveCell");
    const activeCellChangedListener = (notebook: Notebook) => {
      if (this.notebookProvenance.pauseTracking) {
        return;
      }
      // console.log("activeCellChanged");

      ;
      this.trackCellValueChanged(notebook);


      let action = this.notebookProvenance.prov.addAction(
        "Active cell: " + String(notebook.activeCellIndex),
        (state: ApplicationState) => {
          state.cellValue = notebook.model!.cells.get(notebook.activeCellIndex).value.text; // save the NEW cells value
          state.moveToIndex = notebook.activeCellIndex;
          state.activeCell = notebook.activeCellIndex;
          return state;
        }
      );

      console.log(action);

      this.notebookProvenance.pauseObserverExecution = true;
      action
        .addExtra({changedCellId: this.notebookProvenance.notebook.activeCellIndex})
        .addEventType("Change active cell")
        .alwaysStoreState(true)
        .isEphemeral(true)
        .applyAction();
      this.notebookProvenance.pauseObserverExecution = false;

      // the prevActiveCellIndex is used to find the cell that has last been active
      // the prevActiveCellValue is used to store the value of the newly clicked cell --> stores the value before potentially changing the cell value
      // so the value of the cell of PREVIOUS index is compared with the prevActiveCellVALUE when clicking a new cell
      this._prevActiveCellIndex = notebook.activeCellIndex;
      // this._prevValuesLoadedByProvenance = false;
      if (notebook.model) {
        // @ts-ignore   _cellMap DOES exist
        let cell = notebook.model.cells._cellMap.values()[this._prevActiveCellIndex];
        if (cell.model) {
          this._prevActiveCellValue = cell.model.value.text;
        } else if (cell.value) {
          this._prevActiveCellValue = cell.value.text;
        }
      }
    };

    this.notebookProvenance.notebook.activeCellChanged.connect(activeCellChangedListener);
  }

  trackCellExecution(): any {
    const self = this;
    NotebookActions.executed.connect((_dummy, obj: { notebook: Notebook, cell: Cell }) => {
      if (this.notebookProvenance.pauseTracking) {
        return;
      }

      let notebook = self.notebookProvenance.notebook;

      if (notebook == null || notebook.model == null) {
        return;
      }

      ;
      // Track if cell value has been changed before adding e.g. adding a new cell
      this.trackCellValueChanged(notebook);


      // console.log('Cell ran', obj.cell);
      let index = -1;
      // either notebook is missing model sometimes, test both
      if (notebook.model && notebook.model.cells) {
        index = toArray(notebook.model.cells.iter()).indexOf(obj.cell.model);
      } else if (obj.notebook.model && obj.notebook.model.cells) {
        index = toArray(obj.notebook.model.cells.iter()).indexOf(obj.cell.model);
      } else {
        throw new Error('Unable to find cell in notebook');
      }

      let action = this.notebookProvenance.prov.addAction(
        "executeCell",
        (state: ApplicationState) => {
          state.model = notebook.model!.toJSON();
          this._prevModel = state.model;
          state.cellValue = notebook.model!.cells.get(notebook.activeCellIndex).value.text; // save the NEW cells value
          state.moveToIndex = notebook.activeCellIndex;
          state.activeCell = notebook.activeCellIndex;
          state.modelWorkaround = Date.now();
          return state;
        }
      );

      console.log(action);

      this.notebookProvenance.pauseObserverExecution = true;
      action
        .addExtra({changedCellId: index})
        .addEventType("executeCell")
        .alwaysStoreState(true)
        .applyAction();
      this.notebookProvenance.pauseObserverExecution = false;

      this._prevActiveCellIndex = this.notebookProvenance.notebook.activeCellIndex;
      // this._prevValuesLoadedByProvenance = false;
      if (notebook.model) {
        // @ts-ignore   _cellMap DOES exist
        let cell = notebook.model.cells._cellMap.values()[this._prevActiveCellIndex];
        if (cell.model) {
          this._prevActiveCellValue = cell.model.value.text;
        }
      }
    }, this);
  }


  /**
   * Handle a change in the cells list
   */
  trackCellsChanged(): any {
    // the initial values are needed because in new notebooks the very first change would not be tracked otherwise
    // let prevActiveCellValue: string = "";
    // let prevActiveCellIndex: number = 0;
    const cellsChangedListener = (
      list: IObservableList<ICellModel>,
      change: IObservableList.IChangedArgs<ICellModel>) => {
      if (this.notebookProvenance.pauseTracking) {
        return;
      }

      const self = this;
      const notebook = self.notebookProvenance.notebook;
      let currentCell: ICellModel;
      if (notebook.model) {
        currentCell = notebook.model.cells.get(notebook.activeCellIndex);
      }

      // console.log("_onCellsChanged");
      // console.log(change);
      debugger;



      // Track if cell value has been changed before adding e.g. adding a new cell
      this.trackCellValueChanged(notebook, change);


      let action;
      let cellPositions;
      let length; // length of the cells array
      switch (change.type) {
        case 'add':
          action = this.notebookProvenance.prov.addAction(
            "Add cell",
            (state: ApplicationState) => {
              state.cellValue = currentCell.value.text;
              state.cellType = currentCell.type;
              state.moveToIndex = notebook.activeCellIndex;
              state.activeCell = notebook.activeCellIndex;
              if (notebook.model) {
                state.model = notebook.model.toJSON();
                this._prevModel = state.model;
                state.modelWorkaround = Date.now();
              }
              return state;
            }
          );


          // moved from change.oldIndex to change.newIndex
          // all in between are changed. If index is decreased(new index < old index), others are increased. If index is increased, others are decreased
          if (notebook.model) {
            length = notebook.model.cells.length - 1;
            cellPositions = new Array<number>(length);
            for (let i = 0; i < length; i++) {
              cellPositions[i] = i;
            }

            for (let i = change.newIndex; i < length; i++) {
              cellPositions[i] = i + 1;
            }
          }

          console.log(action);
          this.notebookProvenance.pauseObserverExecution = true;
          action
            .addExtra({
              changedCellId: change.newIndex,
              cellPositions: cellPositions
            })
            .addEventType("addCell")
            .alwaysStoreState(true)
            .applyAction();
          this.notebookProvenance.pauseObserverExecution = false;
          break;
        case 'remove':
          action = this.notebookProvenance.prov.addAction(
            "removeCell",
            (state: ApplicationState) => {
              state.cellValue = currentCell.value.text;
              state.cellType = currentCell.type;
              state.moveToIndex = notebook.activeCellIndex;
              state.activeCell = notebook.activeCellIndex;
              state.removeCellIndex = notebook.activeCellIndex;
              if (notebook.model) {
                state.model = notebook.model.toJSON();
                this._prevModel = state.model;
                state.modelWorkaround = Date.now();;
              }
              return state;
            }
          );


          ;
          if (notebook.model) {
            length = notebook.model.cells.length + 1; // because the remove has already decreased the size, but the size before that is needed
            cellPositions = new Array<number>(length);
            for (let i = 0; i < change.oldIndex; i++) {
              cellPositions[i] = i;
            }
            cellPositions[change.oldIndex] = -1;
            for (let i = change.oldIndex + 1; i < length; i++) {
              cellPositions[i] = i - 1;
            }
          }

          console.log(action);
          this.notebookProvenance.pauseObserverExecution = true;
          action
            .addExtra({
              changedCellId: change.newIndex,
              cellPositions: cellPositions
            })
            .addEventType("removeCell")
            .alwaysStoreState(true)
            .applyAction();
          this.notebookProvenance.pauseObserverExecution = false;
          break;
        case 'move':
          action = this.notebookProvenance.prov.addAction(
            "moveCell",
            (state: ApplicationState) => {
              state.cellValue = currentCell.value.text;
              state.cellType = currentCell.type;
              state.moveToIndex = notebook.activeCellIndex;
              state.activeCell = notebook.activeCellIndex;
              if (notebook.model) {
                state.model = notebook.model.toJSON();
                this._prevModel = state.model;
                state.modelWorkaround = Date.now();;
              }
              return state;
            }
          );

          // moved from change.oldIndex to change.newIndex
          // all in between are changed. If index is decreased(new index < old index), others are increased. If index is increased, others are decreased

          if (notebook.model) {
            cellPositions = new Array<number>(notebook.model.cells.length);
            for (let i = 0; i < notebook.model.cells.length; i++) {
              cellPositions[i] = i;
            }
            cellPositions[change.oldIndex] = change.newIndex;
            if (change.newIndex < change.oldIndex) {
              for (let i = change.newIndex; i < change.oldIndex; i++) {
                cellPositions[i] = i + 1;
              }
            } else {
              for (let i = change.oldIndex + 1; i <= change.newIndex; i++) {
                cellPositions[i] = i - 1;
              }
            }
          }

          console.log(action);
          this.notebookProvenance.pauseObserverExecution = true;
          action
            .addExtra({
              changedCellId: change.newIndex,
              cellPositions: cellPositions
            })
            .addEventType("moveCell")
            .alwaysStoreState(true)
            .applyAction();
          this.notebookProvenance.pauseObserverExecution = false;
          break;
        case 'set': // caused by, e.g., change cell type

          action = this.notebookProvenance.prov.addAction(
            "setCell",
            (state: ApplicationState) => {
              state.cellValue = currentCell.value.text;
              state.cellType = currentCell.type;
              state.moveToIndex = notebook.activeCellIndex;
              state.activeCell = notebook.activeCellIndex;
              if (notebook.model) {
                state.model = notebook.model.toJSON();
                this._prevModel = state.model;
                state.modelWorkaround = Date.now();;
              }
              return state;
            }
          );

          console.log(action);
          this.notebookProvenance.pauseObserverExecution = true;
          action
            .addExtra({changedCellId: change.newIndex})
            .addEventType("setCell")
            .alwaysStoreState(true)
            .applyAction();
          this.notebookProvenance.pauseObserverExecution = false;
          break;
        default:
          return;
      }

      this._prevActiveCellIndex = this.notebookProvenance.notebook.activeCellIndex;
      // this._prevValuesLoadedByProvenance = false;
      let cell;
      if (notebook.model) {
        // @ts-ignore _cellMap DOES exist
        cell = notebook.model.cells._cellMap.values()[this._prevActiveCellIndex];
        if (cell.model) {
          this._prevActiveCellValue = cell.model.value.text;
        }
      }
    };
    this.notebookProvenance.notebook.model!.cells.changed.connect(cellsChangedListener, this);
  }

  trackCellValueChanged(notebook: Notebook, change?: IObservableList.IChangedArgs<ICellModel>) {
    // sometimes in between actions the model is null. e.g. wehen execute+addbelow is clicked, during the execute the model is null
    if (notebook.model == null) {
      return;
    }
    // Check if cell has changed

    // let cell: ICellModel = notebook.model!.cells.get(this._prevActiveCellIndex); // this is the cell that was active BEFORE changing active cell;

    // when removing, jupyterlab first calls changeActiveCell where the cellOrder of model.cells does NOT contain the current cell anymore,
    // the cell map on the other hand DOES still contain the cell ==> this solution needed instead of notebook.model!.cells.get(this._prevActiveCellIndex);

    // Problem: When the previous-values are loaded by an observer call beacuse of switching to a node, then this order of Cells does not fit anymore
    // ==> notebook.model!.cells.get(this._prevActiveCellIndex) after all
    // try the get-variant first, if it is null it means the remove problem exists ==> try the other variant



    let cell: ICellModel;
    if (notebook.model) {
      cell = notebook.model.cells.get(this._prevActiveCellIndex);
      // if(cell == null){
      //   // @ts-ignore _cellMap DOES exist
      //   cell = notebook.model.cells._cellMap.values()[this._prevActiveCellIndex];
      // }
    } else {
      return;
    }

    debugger
    if (change != null) {
      if (change.type == "move") {
        cell = change.newValues[0]; // this is the cell that was active BEFORE changing active cell, but at a different location now
      }
      if (change.type == "remove") {
        // return; // do not track cell changes when removing: they are tracked by changeActiveCell already every time
        cell = change.oldValues[0];
      }
    }



    if (cell && this._prevActiveCellValue != cell.value.text) {
      // if so add to prov

      let action = this.notebookProvenance.prov.addAction(
        "Cell value: " + cell.value.text,
        (state: ApplicationState) => {
          state.cellValue = cell.value.text;
          debugger
          if(change && change.type == "remove"){
            this._prevActiveCellIndex = change.oldIndex; // otherwise the index is one too low
            state.activeCell = change.oldIndex;
            state.moveToIndex = change.oldIndex;
          }else{
            this._prevActiveCellValue = state.cellValue; // otherwise e.g. execute+addCell will add a changeCellValue-action two times
          }
          state.model = this._prevModel;
          // e.g. when switching activeCell after changing content and then writing content in the new cell this line is needed to preserve the model that would have existed
          // test: add cell, change content, click cell above, change content, execute without creating new cell, then click undo ==> problem
          if (notebook.model) {
            this._prevModel = notebook.model.toJSON();
            state.modelWorkaround = Date.now();;
          }
          return state;
        }
      );

      this.notebookProvenance.pauseObserverExecution = true;
      let index = this._prevActiveCellIndex;
      if(change && change.type == "remove"){
        index = change.oldIndex;
      }
      action
        .addExtra({changedCellId: index})
        .addEventType("changeCellValue")
        .alwaysStoreState(true)
        .applyAction();
      this.notebookProvenance.pauseObserverExecution = false;
    }
  }
}

