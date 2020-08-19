import { Notebook, NotebookActions } from '@jupyterlab/notebook';
import { IObservableList } from '@jupyterlab/observables';
import { ICellModel, Cell } from '@jupyterlab/cells';
import {ApplicationExtra, ApplicationState, EventTypes, NotebookProvenance} from './notebook-provenance';
import { toArray } from '@lumino/algorithm';
import {ActionFunction, Provenance} from "@visdesignlab/trrack";

/**
 * A notebook widget extension that adds a button to the toolbar.
 */
export class NotebookProvenanceTracker {
  // private _prevAction: string; //used in executeCell
  // private _prevPrevAction: string; //used in executeCell

  /**
   *
   */
  constructor(private notebookProvenance: NotebookProvenance) {
    this.trackActiveCell();
    this.notebookProvenance.notebook.model!.cells.changed.connect(this._onCellsChanged, this);
    this.trackCellExecution();
  }


  trackActiveCell(): any {
    console.log("trackActiveCell");
    const self = this;
    let prevActiveCellValue: string;
    let prevActiveCellIndex: number;
    const activeCellChangedListener = (notebook: Notebook) => {
      if (this.notebookProvenance.pauseTracking) {
        return;
      }
      console.log("activeCellChanged");

      if (typeof prevActiveCellValue !== 'undefined') {
        // Check if cell has changed
        const cell = notebook.model!.cells.get(prevActiveCellIndex);

        if (cell && prevActiveCellValue !== cell.value.text) {
          // if so add to prov
          let action = this.notebookProvenance.prov.addAction(
            cell.value.text,
            (state:ApplicationState) => {
              // state.activeCell = Number(cell.value.text);
              // @ts-ignore
              state.model = self.notebookProvenance.notebook.model.toJSON();
              state.modelWorkaround = !state.modelWorkaround;
              return state;
            }
          );

          console.log(action);

          // Promise.resolve(action
          //   .addEventType("changeActiveCell")
          //   .alwaysStoreState(true)
          //   .applyAction());
          this.notebookProvenance.pauseObserverExecution = true;
          action
            .addExtra({changedCellId: prevActiveCellIndex})
            .addEventType("changeActiveCell")
            .alwaysStoreState(true)
            .applyAction();
          this.notebookProvenance.pauseObserverExecution = false;
        }
      }

      let action = this.notebookProvenance.prov.addAction(
        "changeActiveCell to " + String(notebook.activeCellIndex),
        (state:ApplicationState) => {
          state.activeCell = notebook.activeCellIndex;

          // @ts-ignore
          return state;
        }
      );

      console.log(action);
      // Promise.resolve(action
      //   .addEventType("changeActiveCell")
      //   .alwaysStoreState(true)
      //   .applyAction());
      this.notebookProvenance.pauseObserverExecution = true;
      action
        .addExtra({changedCellId: this.notebookProvenance.notebook.activeCellIndex})
        .addEventType("changeActiveCell")
        .alwaysStoreState(true)
        .isEphemeral(true)
        .applyAction();
      this.notebookProvenance.pauseObserverExecution = false;
      // this._prevPrevAction = this._prevAction;
      // this._prevAction = "changeActiveCell";

      // the prevActiveCellIndex is used to find the cell that has last been active
      // the prevActiveCellValue is used to store the value of the newly clicked cell --> stores the value before potentially changing the cell value
      // so the value of the cell of PREVIOUS index is compared with the prevActiveCellVALUE when clicking a new cell
      prevActiveCellIndex = notebook.activeCellIndex;
      if (this.notebookProvenance.notebook.activeCell) {
        prevActiveCellValue = this.notebookProvenance.notebook.activeCell.model.value.text;
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


      console.log('Cell ran', obj.cell);
      let index = -1;
      // either notebook is missing model sometimes, test both
      if (self.notebookProvenance.notebook.model && self.notebookProvenance.notebook.model.cells) {
         index = toArray(self.notebookProvenance.notebook.model.cells.iter()).indexOf(obj.cell.model);
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

          if(self.notebookProvenance.notebook.model != null){
            state.model = self.notebookProvenance.notebook.model.toJSON();
          }
          state.modelWorkaround = !state.modelWorkaround;
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
      // this._prevPrevAction = this._prevAction;
      // this._prevAction = "executeCell";

    }, this);
  }


  /**
   * Handle a change in the cells list
   */
  private _onCellsChanged(
    list: IObservableList<ICellModel>,
    change: IObservableList.IChangedArgs<ICellModel>
  ): void {

    if (this.notebookProvenance.pauseTracking) {
      return;
    }

    const self = this;

    console.log("_onCellsChanged");
    console.log(change);

    let action;

    switch (change.type) {
      case 'add':

        action = this.notebookProvenance.prov.addAction(
          "addCell",
          (state:ApplicationState) => {

            // @ts-ignore
            state.model = self.notebookProvenance.notebook.model.toJSON();
            state.modelWorkaround = !state.modelWorkaround;
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

        console.log("Relations:", relationsAdd);

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
        // this._prevPrevAction = this._prevAction;
        // this._prevAction = "addCell";
        break;
      case 'remove':
        action = this.notebookProvenance.prov.addAction(
          "removeCell",
          (state:ApplicationState) => {

            // @ts-ignore
            state.model = self.notebookProvenance.notebook.model.toJSON();
            state.modelWorkaround = !state.modelWorkaround;
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
        // this._prevPrevAction = this._prevAction;
        // this._prevAction = "removeCell";
        break;
      case 'move':
        action = this.notebookProvenance.prov.addAction(
          "moveCell",
          (state:ApplicationState) => {

            // @ts-ignore
            state.model = self.notebookProvenance.notebook.model.toJSON();
            state.modelWorkaround = !state.modelWorkaround;
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

        console.log("Relations:", relations);
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
        // this._prevPrevAction = this._prevAction;
        // this._prevAction = "moveCell";
        break;
      case 'set': // caused by, e.g., change cell type
        action = this.notebookProvenance.prov.addAction(
          "setCell",
          (state:ApplicationState) => {

            // @ts-ignore
            state.model = self.notebookProvenance.notebook.model.toJSON();
            state.modelWorkaround = !state.modelWorkaround;
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
        // this._prevPrevAction = this._prevAction;
        // this._prevAction = "setCell";
        break;
      default:
        return;
    }
  }
}
