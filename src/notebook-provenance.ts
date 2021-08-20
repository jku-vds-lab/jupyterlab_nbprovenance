import { INotebookModel, Notebook} from "@jupyterlab/notebook";
import {
  initProvenance,
  Provenance
} from "@visdesignlab/trrack";
import {NotebookProvenanceTracker} from "./provenance-tracker";
import {DocumentRegistry} from "@jupyterlab/docregistry";
import { NotebookUtil } from "./notebook-util";


/**
 * interface representing the state of the application
 */
export interface IApplicationState {
  model: INBModel;
  activeCell: number;
}

export interface IApplicationExtra {
  changedCellId: number;
  cellPositions?: number[]; // Save the position changes. if 0 at index 0, then cell at 0 stays at 0. If 5 at index 0, then the cell has moved from position 0 to position 5 in this event
}

/**
 * interface representing the model of a notebook
 */
export interface INBModel {
  cells: Array<INBCell>;
}

/**
 * interface representing a cell of a notebook
 */
export interface INBCell {
  source: string;
}

/**
 * Initial state
 */
const initialState: IApplicationState = {
  model: { cells: [] },
  activeCell: 0
};

/**
 * EventType Enum covering all events that can happen in a notebook
 */
export enum EventType {
  activeCell = "activeCell",
  executeCell = "executeCell",
  addCell = "addCell",
  removeCell = "removeCell",
  moveCell = "moveCell",
  setCell = "setCell",
  changeCellValue = "changeCellValue"
}

/**
 * Model for a provenance graph.
 */
export class NotebookProvenance {
  private _nbtracker: NotebookProvenanceTracker;

  // initialize provenance with the first state
  private _prov: Provenance<IApplicationState, EventType, IApplicationExtra>;

  // instad of actionFunctions.pauseTracking just use a field here
  public pauseTracking: boolean = false;
  public pauseObserverExecution: boolean = false;


  // Why is this context not working like app, notebook, sessionContext?
  constructor(public readonly notebook: Notebook, private context: DocumentRegistry.IContext<INotebookModel>) {
    this.init();
  }

  private init() {

    // load initial state
    if (!this.notebook.model!.metadata.has("provenance")) {
      initialState.model = NotebookUtil.exportModel(this.notebook);
      initialState.activeCell = this.notebook.activeCellIndex;
    }

    // initialize trrack provenance tracker
    this._prov = initProvenance<IApplicationState, EventType, IApplicationExtra>(initialState);

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

    // callback for saving the notebook
    this.context.saveState.connect(this.saveProvenanceGraph, this);

    // load existing provenance graph
    if (this.notebook.model!.metadata.has("provenance")) {
      const serGraph = this.notebook.model!.metadata.get("provenance");
      if (serGraph) {
        this._prov.importProvenanceGraph(serGraph.toString());
      }
    }

    // observer for state.model
    this.prov.addObserver(state => state.model, model => {
      if (!this.pauseObserverExecution) {
        this.pauseTracking = true;

        // import the model to the notebook
        NotebookUtil.importModel(this.notebook, model!);

        // make sure active cell is correct, import may have changed it
        this.notebook.activeCellIndex = this.prov.getState(this.prov.current).activeCell;
        this.pauseTracking = false;

        // register cell change listeners
        this._nbtracker.registerCellListeners();
      }
    });

    // observer for state.activeCell
    this.prov.addObserver(state => state.activeCell, activeCell => {
      if (!this.pauseObserverExecution) {
        this.pauseTracking = true;
        // set active cell in notebook
        this.notebook.activeCellIndex = activeCell!;
        this.pauseTracking = false;
      }
    });

    // Call this when all the observers are defined.
    // This is optional and only used when you want to enable sharing and loading states from URL.
    // Refer documentation for advanced usage scenario.
    this.prov.done();

    this._nbtracker = new NotebookProvenanceTracker(this);
  }

  /**
   * Export the provenance data as JSON and store as metadata in notebook
   */
  protected saveProvenanceGraph() {
    console.log("Saving provenance graph in notebookfile");

    // apply any pending changes before save
    this.nbtracker.applyCellValueChange();

    // console.log(this._prov.exportProvenanceGraph()); // DEBUG
    this.notebook.model!.metadata.set("provenance", this.prov.exportProvenanceGraph());
  }

  public get nbtracker(): NotebookProvenanceTracker {
    return this._nbtracker;
  }

  public get prov(): Provenance<IApplicationState, EventType, IApplicationExtra> {
    return this._prov;
  }
}
