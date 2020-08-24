import { Notebook, NotebookActions } from '@jupyterlab/notebook';
import { IObservableList } from '@jupyterlab/observables';
import { ICellModel, Cell } from '@jupyterlab/cells';
import {ApplicationExtra, ApplicationState, EventTypes, NotebookProvenance} from './notebook-provenance';
import { toArray } from '@lumino/algorithm';
import {ActionFunction, Provenance} from "@visdesignlab/trrack";
import {PartialJSONValue} from '@lumino/coreutils';

/**
 * A notebook widget extension that adds a button to the toolbar.
 */
export class NotebookProvenanceTracker {
  // the initial values are needed because in new notebooks the very first change would not be tracked otherwise
  private _prevActiveCellValue: string = "";
  private _prevActiveCellIndex: number = 0;
  private _prevModel: PartialJSONValue = Object();

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
    const self = this;
    const activeCellChangedListener = (notebook: Notebook) => {
      if (this.notebookProvenance.pauseTracking) {
        return;
      }
      // console.log("activeCellChanged");

      debugger
      this.trackCellValueChanged(notebook);



      let action = this.notebookProvenance.prov.addAction(
        "Active cell: " + String(notebook.activeCellIndex),
        (state:ApplicationState) => {
          state.cellValue = notebook.model!.cells.get(notebook.activeCellIndex).value.text; // save the NEW cells value
          state.moveToIndex = notebook.activeCellIndex;
          state.activeCell = notebook.activeCellIndex;
          // @ts-ignore
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
      debugger
      // @ts-ignore
      let cell = notebook.model.cells._cellMap.values()[this._prevActiveCellIndex]
      if (cell.model) {
        this._prevActiveCellValue = cell.model.value.text;
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
      debugger
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
      // let action: ReversibleAction;
      // let iaction: IrreversibleAction;
      //
      // switch (obj.cell.model.type) {
      //   case 'markdown':
      //   case 'raw':
      //     action = {
      //       do: 'cellOutputs',
      //       doArguments: [index, []],
      //       undo: 'clearOutputs',
      //       undoArguments: [index]
      //     };
      //     // Promise.resolve(this.notebookProvenance.tracker.applyAction(action, true));
      //     break;
      //   case 'code':
      //     iaction = {
      //       do: 'executeCell',
      //       doArguments: [index],
      //     };
      //     // Promise.resolve(this.notebookProvenance.tracker.applyAction(iaction, true));
      //     break;
      //   default:
      //     break;
      // }

      let action = this.notebookProvenance.prov.addAction(
        "executeCell",
        (state:ApplicationState) => {

          if(notebook.model != null){
            state.model = notebook.model.toJSON();
            this._prevModel = state.model;
          }
          state.cellValue = notebook.model!.cells.get(notebook.activeCellIndex).value.text; // save the NEW cells value
          state.moveToIndex = notebook.activeCellIndex;
          state.activeCell = notebook.activeCellIndex;
          state.modelWorkaround++;
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
      // @ts-ignore
      let cell = notebook.model.cells._cellMap.values()[this._prevActiveCellIndex]
      if (cell.model) {
        this._prevActiveCellValue = cell.model.value.text;
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
      change: IObservableList.IChangedArgs<ICellModel>) =>
    {
      if (this.notebookProvenance.pauseTracking) {
        return;
      }



      const self = this;
      const notebook = self.notebookProvenance.notebook;
      // @ts-ignore
      const currentCell = notebook.model.cells.get(notebook.activeCellIndex);

      // console.log("_onCellsChanged");
      // console.log(change);

      debugger
      // Track if cell value has been changed before adding e.g. adding a new cell
      this.trackCellValueChanged(notebook, change);


      let action;
      switch (change.type) {
        case 'add':
          action = this.notebookProvenance.prov.addAction(
            "Add cell",
            (state:ApplicationState) => {
              state.cellValue = currentCell.value.text;
              state.cellType = currentCell.type;
              state.moveToIndex = notebook.activeCellIndex;
              state.activeCell = notebook.activeCellIndex;
              // @ts-ignore
              state.model = self.notebookProvenance.notebook.model.toJSON();
              this._prevModel = state.model;
              state.modelWorkaround++;
              return state;
            }
          );


          // moved from change.oldIndex to change.newIndex
          // all in between are changed. If index is decreased(new index < old index), others are increased. If index is increased, others are decreased
          // @ts-ignore
          let length = self.notebookProvenance.notebook.model.cells.length-1;
          let relationsAdd = new Array<number>(length);
          // @ts-ignore
          for(let i=0;i<length;i++){
            relationsAdd[i] = i;
          }

          for(let i=change.newIndex;i<length;i++){
            relationsAdd[i] = i+1;
          }

          // console.log("Relations:", relationsAdd);

          console.log(action);
          this.notebookProvenance.pauseObserverExecution = true;
          action
            .addExtra({
              changedCellId: change.newIndex,
              relations: relationsAdd
            })
            .addEventType("addCell")
            .alwaysStoreState(true)
            .applyAction();
          this.notebookProvenance.pauseObserverExecution = false;
          break;
        case 'remove':
          action = this.notebookProvenance.prov.addAction(
            "removeCell",
            (state:ApplicationState) => {
              state.cellValue = currentCell.value.text;
              state.cellType = currentCell.type;
              state.moveToIndex = notebook.activeCellIndex;
              state.activeCell = notebook.activeCellIndex;
              state.removeCellIndex = notebook.activeCellIndex;
              // @ts-ignore
              state.model = self.notebookProvenance.notebook.model.toJSON();
              this._prevModel = state.model;
              state.modelWorkaround++;
              return state;
            }
          );

          console.log(action);
          this.notebookProvenance.pauseObserverExecution = true;
          action
            .addExtra({changedCellId: change.newIndex})
            .addEventType("removeCell")
            .alwaysStoreState(true)
            .applyAction();
          this.notebookProvenance.pauseObserverExecution = false;
          break;
        case 'move':
          action = this.notebookProvenance.prov.addAction(
            "moveCell",
            (state:ApplicationState) => {
              state.cellValue = currentCell.value.text;
              state.cellType = currentCell.type;
              state.moveToIndex = notebook.activeCellIndex;
              state.activeCell = notebook.activeCellIndex;
              // @ts-ignore
              state.model = self.notebookProvenance.notebook.model.toJSON();
              this._prevModel = state.model;
              state.modelWorkaround++;
              return state;
            }
          );

          // moved from change.oldIndex to change.newIndex
          // all in between are changed. If index is decreased(new index < old index), others are increased. If index is increased, others are decreased
          // @ts-ignore
          let relations = new Array<number>(self.notebookProvenance.notebook.model.cells.length);
          // @ts-ignore
          for(let i=0;i<self.notebookProvenance.notebook.model.cells.length;i++){
            relations[i] = i;
          }
          relations[change.oldIndex] = change.newIndex;
          if(change.newIndex < change.oldIndex){
            for(let i=change.newIndex;i<change.oldIndex;i++){
              relations[i] = i+1;
            }
          }else{
            for(let i=change.oldIndex+1;i<=change.newIndex;i++){
              relations[i] = i-1;
            }
          }

          // console.log("Relations:", relations);
          console.log(action);
          this.notebookProvenance.pauseObserverExecution = true;
          action
            .addExtra({
              changedCellId: change.newIndex,
              relations: relations
            })
            .addEventType("moveCell")
            .alwaysStoreState(true)
            .applyAction();
          this.notebookProvenance.pauseObserverExecution = false;
          break;
        case 'set': // caused by, e.g., change cell type

          action = this.notebookProvenance.prov.addAction(
            "setCell",
            (state:ApplicationState) => {
              state.cellValue = currentCell.value.text;
              state.cellType = currentCell.type;
              state.moveToIndex = notebook.activeCellIndex;
              state.activeCell = notebook.activeCellIndex;
              // @ts-ignore
              state.model = self.notebookProvenance.notebook.model.toJSON();
              this._prevModel = state.model;
              state.modelWorkaround++;
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
      // @ts-ignore
      let cell = notebook.model.cells._cellMap.values()[this._prevActiveCellIndex]
      if (cell.model) {
        this._prevActiveCellValue = cell.model.value.text;
      }
    };
    this.notebookProvenance.notebook.model!.cells.changed.connect(cellsChangedListener, this);
  }

  trackCellValueChanged(notebook: Notebook, change?: IObservableList.IChangedArgs<ICellModel>) {
    // Check if cell has changed

    // let cell: ICellModel = notebook.model!.cells.get(this._prevActiveCellIndex); // this is the cell that was active BEFORE changing active cell;

    // when removing, jupyterlab first calls changeActiveCell where the cellOrder of model.cells does NOT contain the current cell anymore,
    // the cell map on the other hand DOES still contain the cell ==> this solution needed instead of notebook.model!.cells.get(this._prevActiveCellIndex);

    // @ts-ignore
    let cell = notebook.model.cells._cellMap.values()[this._prevActiveCellIndex];
    if(change != null){
      debugger
      if(change.type == "move"){
        cell = change.newValues[0]; // this is the cell that was active BEFORE changing active cell, but at a different location now
      }
      if(change.type == "remove"){
        debugger
        this._prevActiveCellValue;
      }
    }

    if (cell && this._prevActiveCellValue !== cell.value.text) {
      // if so add to prov
      let action = this.notebookProvenance.prov.addAction(
        "Cell value: "+cell.value.text,
        (state:ApplicationState) => {
          // @ts-ignore
          state.cellValue = cell.value.text;
          debugger
          // state.cellType = cell.type;
          // @ts-ignore
          // state.model = self.notebookProvenance.notebook.model.toJSON();
          // this._prevModel = state.model;
          // if(self._prevModel != null){
            state.model = this._prevModel;
          // }else{
          //   // If there has not been a saved model yet
          //   // @ts-ignore
          //   state.model = notebook.model.toJSON();
          //   this._prevModel = state.model;
          // }
          state.modelWorkaround++;
          return state;
        }
      );

      // // console.log(action);

      this.notebookProvenance.pauseObserverExecution = true;
      action
        .addExtra({changedCellId: this._prevActiveCellIndex})
        .addEventType("changeCellValue")
        .alwaysStoreState(true)
        .applyAction();
      this.notebookProvenance.pauseObserverExecution = false;
    }
  }

}
