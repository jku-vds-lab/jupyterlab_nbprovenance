import {JupyterLab} from '@jupyterlab/application';
import {INotebookModel, Notebook, NotebookModel} from '@jupyterlab/notebook';
import {ActionFunctions} from './action-functions';
import {ISessionContext} from '@jupyterlab/apputils';
import {sessionContextDialogs} from '@jupyterlab/apputils';

import {
  initProvenance,
  // ProvenanceGraph,
  Provenance,
  ActionFunction,
  SubscriberFunction,
  NodeMetadata,
  NodeID,
  Diff,
  RootNode,
  StateNode,
  // ProvenanceNode,
  isStateNode,
  Nodes,
  CurrentNode,
  Artifacts,
  Extra
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
};

export interface ApplicationExtra {
  changedCellId: number;
  relations?: number[]; // Save the position changes. if 0 at index 0, then cell at 0 stays at 0. If 5 at index 0, then the cell has moved from position 0 to position 5 in this event
};

/**
 * Initial state
 */

const initialState: ApplicationState = {
  model: {},
  activeCell: 0,
  modelWorkaround: 0,
  cellValue: "",
  cellType: "code"
}

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

  // private _prov: string;


  // Why is this context not working like app, notebook, sessionContext?
  constructor(private app: JupyterLab, public readonly notebook: Notebook, private sessionContext: ISessionContext, private context: DocumentRegistry.IContext<INotebookModel>) {
    this.init(context);
  }

  private init(context: DocumentRegistry.IContext<INotebookModel>) {
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

    context.saveState.connect(this.saveProvenanceGraph,this);


    if (this.notebook.model!.metadata.has('provenance')) {
      const serGraph = this.notebook.model!.metadata.get('provenance');
      if (serGraph) {
        this._prov.importProvenanceGraph(serGraph.toString());
      } else {
        //this._graph = new ProvenanceGraph({ name: 'nbprovenance.default.graph', version: this.app.version });
      }
    } else {
      //this._graph = new ProvenanceGraph({ name: 'nbprovenance.default.graph', version: this.app.version });
    }

    // to check if it loaded: this.prov.graph()
    console.log("Graph at beginning:", this.prov.graph())

    this._actionFunctions = new ActionFunctions(this.notebook, this.sessionContext);

    this.prov.addObserver(["modelWorkaround"], () => {
      // provVisUpdate()
      // console.log(this.prov.graph())
      console.log("model observer called");
      this.pauseTracking = true;
      if(!this.pauseObserverExecution){
        debugger
        let state = this.prov.current().getState();
        // @ts-ignore
        this.notebook.model.fromJSON(state.model); //This takes a LOT of time I think?
        // @ts-ignore
        this.notebook.model.cells.get(state.activeCell).value.text = state.cellValue;
        this._actionFunctions.changeActiveCell(state.activeCell);
        this._actionFunctions.setCell(state.activeCell, state.cellType);
      }
      this.pauseTracking = false;
      provVisUpdate(this._prov);
    });

    this.prov.addObserver(["activeCell"], () => {
      console.log("activeCell observer called");
      this.pauseTracking = true;
      if(!this.pauseObserverExecution){
        debugger
        let state = this.prov.current().getState();
        // @ts-ignore
        //this.notebook.model.fromJSON(state.model); // This is needed because otherwise sometimes clicking on "addCell" won't change the state of the notebook
        // @ts-ignore
        // this.notebook.model.cells.get(state.activeCell).value.text = state.cellValue;
        this._actionFunctions.changeActiveCell(state.activeCell);
      }
      provVisUpdate(this._prov);
      this.pauseTracking = false;
    });

    // this.prov.addObserver(["cellType"], () => {
    //   console.log("cellType observer called");
    //   this.pauseTracking = true;
    //   if(!this.pauseObserverExecution){
    //     debugger
    //     let state = this.prov.current().getState();
    //     // @ts-ignore
    //     this.notebook.model.cells.get(state.activeCell).type = state.cellType;
    //     this._actionFunctions.setCell(state.activeCell, state.cellType);
    //   }
    //
    //   provVisUpdate(this._prov);
    //   this.pauseTracking = false;
    // });
    //
    // this.prov.addObserver(["cellValue"], () => {
    //   console.log("cellValue observer called");
    //   this.pauseTracking = true;
    //   if(!this.pauseObserverExecution){
    //     debugger
    //     let state = this.prov.current().getState();
    //     // @ts-ignore
    //     this.notebook.model.fromJSON(state.model);
    //     // @ts-ignore
    //     this.notebook.model.cells.get(state.activeCell).value.text = state.cellValue;
    //   }
    //   this.pauseTracking = false;
    //   provVisUpdate(this._prov);
    // });

    // Call this when all the observers are defined.
    // This is optional and only used when you want to enable sharing and loading states from URL.
    // Refere documentation for advanced usage scenario.
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

  // public save() {
  //
  //   console.log("SAVING     SAVING     SAVING");
  //   // this.notebookModelCache.get(this.notebook)
  // }


  // public get graph(): ProvenanceGraph {
  //     return this._graph as ProvenanceGraph;
  // }

}
