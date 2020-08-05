import {
  ProvenanceGraph, // class
  ProvenanceNode, // type
  ProvenanceGraphTraverser, // class
  IProvenanceGraphTraverser, // interface
  IProvenanceGraph, // interface
  ActionFunctionRegistry, // class
  IActionFunctionRegistry, // interface
  IProvenanceTracker, // interface
  ProvenanceTracker, // class
  serializeProvenanceGraph, // function
  // restoreProvenanceGraph, // function
  // SerializedProvenanceGraph // type
} from '@visualstorytelling/provenance-core';
import {JupyterLab} from '@jupyterlab/application';
import {Notebook, NotebookModel} from '@jupyterlab/notebook';
import {ActionFunctions} from './action-functions';
// import { NotebookProvenanceTracker } from './provenance-tracker';
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
// import {initProvenance} from "@visdesignlab/trrack";
// import Provenance from "@visdesignlab/trrack/src/Interfaces/Provenance";

import { parse } from 'circular-json';


/**
 * interface representing the state of the application
 */
export interface ApplicationState {
  model: Object;
  modelWorkaround: boolean;
  activeCell: number;
};

export interface ApplicationExtra {
  nodeNum: number;
  nodeX: number;
  nodeY: number;
};

/**
 * Initial state
 */

const initialState: ApplicationState = {
  model: {},
  activeCell: 0,
  modelWorkaround: true
}

export type EventTypes = "changeActiveCell" | "executeCell" | "addCell" | "removeCell" | "moveCell" | "setCell";


/**
 * Model for a provenance graph.
 */
export class NotebookProvenance {
  private _traverser: IProvenanceGraphTraverser;
  private _registry: IActionFunctionRegistry;

  private _actionFunctions: ActionFunctions;
  private _tracker: IProvenanceTracker;
  private _nbtracker: NotebookProvenanceTracker;


  //initialize provenance with the first state
  private _prov: Provenance<ApplicationState, EventTypes, ApplicationExtra>;

  // instad of actionFunctions.pauseTracking just use a field here
  public pauseTracking: boolean = false;
  public pauseObserverExecution: boolean = false;

  // private _prov: string;


  constructor(private app: JupyterLab, public readonly notebook: Notebook, private sessionContext: ISessionContext) {
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

    this._registry = new ActionFunctionRegistry();
    this._actionFunctions = new ActionFunctions(this.notebook, this.sessionContext);



    // // get method names from the object (see https://stackoverflow.com/a/48051971)
    // let actionFunctionNames = Object.getPrototypeOf(this._actionFunctions);
    // Object.getOwnPropertyNames(actionFunctionNames)
    //   .filter((d) => d !== 'constructor')
    //   .map((name: string) => {
    //     // dynamically register all functions from the ActionFunctions class/object
    //     this._registry.register(name, (this._actionFunctions as any)[name], this._actionFunctions);
    //     // dynamically add all functions from the ActionFunctions as observers to the prov
    //
    //     this.prov.addObserver([name], (this._actionFunctions as any)[name]);
    //   });

    this.prov.addObserver(["modelWorkaround"], () => {
      // provVisUpdate()
      // console.log(this.prov.graph())
      console.log("model observer called");

      debugger

      this.pauseTracking = true;
      // let preserveCellIndex = this.notebook.activeCellIndex;


      // Tried to fix problem with runAndAdvance:
      // // @ts-ignore
      // let preserveModel = new NotebookModel();
      // // @ts-ignore
      // // let preserveNotebook = new Notebook();
      // // @ts-ignore
      // preserveModel.fromJSON(this.prov.current().getState().model); //get everything
      // // @ts-ignore
      // this.notebook.model.cells.dispose()
      // // @ts-ignore
      // this.notebook.model.cells.pushAll(preserveModel.cells);



      // console.log(this.notebook);

      if(!this.pauseObserverExecution){
        // @ts-ignore
        this.notebook.model.fromJSON(this.prov.current().getState().model); //This takes a LOT of time I think?
      }



      // console.log(this.notebook);



      // // @ts-ignore
      // this.notebook.model = Object.assign(preserveModel);
      // @ts-ignore
      // this.notebook.model.cells.dispose()
      // @ts-ignore
      // this.notebook.model.cells.push(preserveModel.cells);

      // let cells = parse(this.prov.current().getState().model);
      // @ts-ignore
      // this.notebook.model.cells.set(parse(this.prov.current().getState().model));


      // this.notebook.activeCellIndex = preserveCellIndex;
      // this.saveProvenanceGraph();
      this.pauseTracking = false;
      provVisUpdate(this._prov);

    });

    this.prov.addObserver(["activeCell"], () => {
      debugger

      // provVisUpdate()
      // console.log(this.prov.graph())
      console.log("activeCell observer called");
      this.pauseTracking = true;
      if(!this.pauseObserverExecution){
        // @ts-ignore
        this.notebook.model.fromJSON(this.prov.current().getState().model); //This is needed because otherwise sometimes when clicking on "addCell" won't change the state of the notebook
        this._actionFunctions.changeActiveCell(this.prov.current().getState().activeCell);
      }
      provVisUpdate(this._prov);
      this.pauseTracking = false;
    });

    // Call this when all the observers are defined.
    // This is optional and only used when you want to enable sharing and loading states from URL.
    // Refere documentation for advanced usage scenario.
    this.prov.done();

    this._nbtracker = new NotebookProvenanceTracker(this);
  }

  protected saveProvenanceGraph() {
    this.notebook.model!.metadata.set('provenance', this._prov.exportProvenanceGraph());
  }

  public get traverser(): IProvenanceGraphTraverser {
    return this._traverser;
  }

  public get tracker(): IProvenanceTracker {
    return this._tracker;
  }

  public get nbtracker(): NotebookProvenanceTracker {
    return this._nbtracker;
  }

  public get prov(): Provenance<ApplicationState, EventTypes, ApplicationExtra> {
    return this._prov;
  }



  // public get graph(): ProvenanceGraph {
  //     return this._graph as ProvenanceGraph;
  // }

  public get registry(): IActionFunctionRegistry {
    return this._registry;
  }
}
