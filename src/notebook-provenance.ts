import {INotebookModel, Notebook} from '@jupyterlab/notebook';
import {ActionFunctions} from './action-functions';
import {
  initProvenance,
  Provenance
} from '@visdesignlab/trrack';
import {NotebookProvenanceTracker} from './provenance-tracker'
import {provVisUpdate} from "./side-bar";
import {PartialJSONValue} from '@lumino/coreutils';
import {DocumentRegistry} from '@jupyterlab/docregistry';


/**
 * interface representing the state of the application
 */
export interface ApplicationState {
  model: PartialJSONValue;
  modelWorkaround: number; // only counting up could lead to a problem when working on parallel timelines. Veery rarely though.
  activeCell: number;
  cellValue: string;
  cellType: string;
  moveToIndex: number;
  removeCellIndex?: number;
};

export interface ApplicationExtra {
  changedCellId: number;
  cellPositions?: number[]; // Save the position changes. if 0 at index 0, then cell at 0 stays at 0. If 5 at index 0, then the cell has moved from position 0 to position 5 in this event
};

/**
 * Initial state
 */

const initialState: ApplicationState = {
  model: {},
  activeCell: 0,
  modelWorkaround: 0,
  cellValue: "",
  cellType: "code",
  moveToIndex: 0,
  removeCellIndex: 0
};

export type EventTypes = "Change active cell" | "executeCell" | "addCell" | "removeCell" | "moveCell" | "setCell" | "changeCellValue";
export const EventTypes = ["Change active cell", "executeCell", "addCell", "removeCell", "moveCell", "setCell", "changeCellValue"];


/**
 * Model for a provenance graph.
 */
export class NotebookProvenance {
  private _actionFunctions: ActionFunctions;
  private _nbtracker: NotebookProvenanceTracker;

  //initialize provenance with the first state
  private _prov: Provenance<ApplicationState, EventTypes, ApplicationExtra>;

  // instad of actionFunctions.pauseTracking just use a field here
  public pauseTracking: boolean = false;
  public pauseObserverExecution: boolean = false;


  // Why is this context not working like app, notebook, sessionContext?
  constructor(public readonly notebook: Notebook, private context: DocumentRegistry.IContext<INotebookModel>,private provenanceView: any) {
    this.init();
  }

  private init() {
    this._prov = initProvenance<ApplicationState, EventTypes, ApplicationExtra>(initialState, false);

    // this._prov = initProvenance<ApplicationState, EventTypes, ApplicationExtra>(initialState, true, true, {
    //   apiKey: "AIzaSyCVqzgH7DhN9roG9gaFqGMqh-zj3vd8tww",
    //   authDomain: "nbprovenance.firebaseapp.com",
    //   databaseURL: "https://nbprovenance.firebaseio.com",
    //   projectId: "nbprovenance",
    //   storageBucket: "nbprovenance.appspot.com",
    //   messagingSenderId: "814327140471",
    //   appId: "1:814327140471:web:31b23df7c94ff3dd00b672",
    //   measurementId: "G-Z6JK4BJ7KB"
    // });

    this.context.saveState.connect(this.saveProvenanceGraph,this);


    if (this.notebook.model!.metadata.has('provenance')) {
      const serGraph = this.notebook.model!.metadata.get('provenance');
      if (serGraph) {
        this._prov.importProvenanceGraph(serGraph.toString());
      }
    }

    this._actionFunctions = new ActionFunctions(this.notebook);

    this.prov.addObserver(["modelWorkaround"], () => {
      
      this.pauseTracking = true;
      if(!this.pauseObserverExecution){
        
        let state = this.prov.current().getState();
        this.notebook.model!.fromJSON(state.model);
        this._actionFunctions.cellValue(state.activeCell,state.cellValue)
        this._actionFunctions.changeActiveCell(state.activeCell);
        if(state.activeCell != state.moveToIndex){
          this._actionFunctions.moveCell(state.activeCell, state.moveToIndex);
        }else{
          this._actionFunctions.setCell(state.activeCell, state.cellType);
        }
      }
      this.pauseTracking = false;

      // Only update when it is visible --> performance
      if(this.provenanceView.isVisible){
        provVisUpdate(this._prov);
      }
    });

    this.prov.addObserver(["activeCell"], () => {
      // console.log("activeCell observer called");
      this.pauseTracking = true;
      if(!this.pauseObserverExecution){
        let state = this.prov.current().getState();
        this._actionFunctions.changeActiveCell(state.activeCell);
      }
      this.pauseTracking = false;

      debugger
      if(this.provenanceView.isVisible){
        provVisUpdate(this._prov);
      }
    });

    // Call this when all the observers are defined.
    // This is optional and only used when you want to enable sharing and loading states from URL.
    // Refer documentation for advanced usage scenario.
    this.prov.done();

    this._nbtracker = new NotebookProvenanceTracker(this);
  }

  protected saveProvenanceGraph() {
    console.log("Saving provenance graph in notebookfile");

    this.notebook.model!.metadata.set('provenance', this._prov.exportProvenanceGraph());
  }

  public get nbtracker(): NotebookProvenanceTracker {
    return this._nbtracker;
  }

  public get prov(): Provenance<ApplicationState, EventTypes, ApplicationExtra> {
    return this._prov;
  }
}
