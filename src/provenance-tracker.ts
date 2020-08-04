import { Notebook, NotebookActions } from '@jupyterlab/notebook';
// import { Action, ReversibleAction, IrreversibleAction } from '@visualstorytelling/provenance-core';
import { IObservableList } from '@jupyterlab/observables';
import { ICellModel, Cell } from '@jupyterlab/cells';
import {ApplicationExtra, ApplicationState, EventTypes, NotebookProvenance} from './notebook-provenance';
import { toArray } from '@lumino/algorithm';
import {ActionFunction} from "@visdesignlab/trrack";
import { stringify } from 'circular-json';

/**
 * A notebook widget extension that adds a button to the toolbar.
 */
export class NotebookProvenanceTracker {
  /**
   *
   */
  constructor(private notebookProvenance: NotebookProvenance) {

    this.trackActiveCell();

    // this.notebookProvenance.notebook.model.contentChanged.connect(() => {
    //   console.log(['contentChanged', arguments]);
    // });
    // fires when which cell is active is changed
    // this.notebookProvenance.notebook.activeCellChanged.connect(() => {
    //   console.log(['activeCellChanged', arguments]);
    // });
    this.notebookProvenance.notebook.model!.cells.changed.connect(this._onCellsChanged, this);

    this.trackCellExecution();

    // return new DisposableDelegate(() => {
    //   panel.content.model.cells.changed.disconnect(this._onCellsChanged);
    //   panel.content.activeCellChanged.disconnect(activeCellChangedListener);
    // });
  }

  trackActiveCell(): any {
    console.log("trackActiveCell");
    const self = this;
    let prevActiveCellIndex = this.notebookProvenance.notebook.activeCellIndex;
    let prevActiveCellValue: string;
    // if (this.notebookProvenance.notebook.activeCell) {
    //   prevActiveCellValue = this.notebookProvenance.notebook.activeCell.model.value.text;
    // }
    const activeCellChangedListener = (notebook: Notebook) => {
      if (this.notebookProvenance.pauseTracking) {
        return;
      }
      console.log("activeCellChanged");

      
      // @ts-ignore
      const activeCell = notebook.activeCell.model.value.text;
      if (typeof prevActiveCellValue !== 'undefined') {
        // Check if cell has changed
        const cell = notebook.model!.cells.get(prevActiveCellIndex);
        debugger
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
      action
        .addEventType("changeActiveCell")
        .alwaysStoreState(true)
        .applyAction();

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
          // @ts-ignore
          // state.cells = stringify(self.notebookProvenance.notebook.model.cells);

          // @ts-ignore
          // state.cells = self.notebookProvenance.notebook.model.cells.iter().clone();
          state.model = self.notebookProvenance.notebook.model.toJSON();
          state.modelWorkaround = !state.modelWorkaround;
          return state;
        }
      );

      console.log(action);

      this.notebookProvenance.pauseObserverExecution = true;
      action
        .addEventType("executeCell")
        .alwaysStoreState(true)
        .applyAction();
      this.notebookProvenance.pauseObserverExecution = false;

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

    // console.groupCollapsed('cells changed ->', change.type);
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
            // state.model = stringify(self.notebookProvenance.notebook.model.cells);
            // @ts-ignore
            // state.model = JSON.stringify(self.notebookProvenance.notebook.model.cells, refReplacer());
            return state;
          }
        );

        console.log(action);
        this.notebookProvenance.pauseObserverExecution = true;
        action
          .addEventType("addCell")
          .alwaysStoreState(true)
          .applyAction();
        this.notebookProvenance.pauseObserverExecution = false;
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
          .addEventType("removeCell")
          .alwaysStoreState(true)
          .applyAction();
        this.notebookProvenance.pauseObserverExecution = false;
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

        console.log(action);
        this.notebookProvenance.pauseObserverExecution = true;
        action
          .addEventType("moveCell")
          .alwaysStoreState(true)
          .applyAction();
        this.notebookProvenance.pauseObserverExecution = false;
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
          .addEventType("setCell")
          .alwaysStoreState(true)
          .applyAction();
        this.notebookProvenance.pauseObserverExecution = false;
        break;
      default:
        return;
    }

    // Promise.resolve(this.notebookProvenance.tracker.applyAction(action!, true)); // adds this action to the graph
    // console.groupEnd();
  }

}

export function findAction(actionName: string, args: any) {
  // const notebook: Notebook = args[0];
  // let action: Action;
  // switch (actionName) {
  //   case 'enableOutputScrolling':
  //     action = {
  //       do: 'enableOutputScrolling',
  //       doArguments: [notebook.activeCellIndex],
  //       undo: 'disableOutputScrolling',
  //       undoArguments: [notebook.activeCellIndex]
  //     };
  //     break;
  //   case 'disableOutputScrolling':
  //     action = {
  //       do: 'disableOutputScrolling',
  //       doArguments: [notebook.activeCellIndex],
  //       undo: 'enableOutputScrolling',
  //       undoArguments: [notebook.activeCellIndex]
  //     };
  //     break;
  //   case 'selectAll':
  //     action = {
  //       do: 'selectAll',
  //       doArguments: [],
  //       undo: 'deselectAll',
  //       undoArguments: []
  //     };
  //     break;
  //   case 'deselectAll':
  //     action = {
  //       do: 'deselectAll',
  //       doArguments: [],
  //       undo: 'selectAll',
  //       undoArguments: []
  //     };
  //     break;
  //   case 'selectAbove':
  //     action = {
  //       do: 'selectAbove',
  //       doArguments: [notebook.activeCellIndex],
  //       undo: 'deselectAll', // TODO instead of deselectAll the old selection should be stored and restored
  //       undoArguments: []
  //     };
  //     break;
  //   case 'selectBelow':
  //     action = {
  //       do: 'selectBelow',
  //       doArguments: [notebook.activeCellIndex],
  //       undo: 'deselectAll', // TODO instead of deselectAll the old selection should be stored and restored
  //       undoArguments: []
  //     };
  //     break;
  //   default:
  //     throw new Error('Unknown action name, no compatible provenance action available.');
  // }
  // return action;
}

function refReplacer() {
  let m = new Map();
  let v = new Map();
  var replacer: { (field: any, value: any): any; call?: any; };
  replacer = (field,value) => value;

  return function(field: string, value: any) {
    let p= m.get(this) + (Array.isArray(this) ? `[${field}]` : '.' + field);
    let isComplex= value===Object(value)

    if (isComplex) m.set(value, p);

    let pp = v.get(value)||'';
    let path = p.replace(/undefined\.\.?/,'');
    let val = pp ? `#REF:${pp[0]=='[' ? '$':'$.'}${pp}` : value;

    if(!pp && isComplex) v.set(value, path);

    return replacer.call(this, field, val)
  }
}

