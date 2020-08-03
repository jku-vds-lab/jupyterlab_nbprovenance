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
import {Notebook} from '@jupyterlab/notebook';
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
// import {initProvenance} from "@visdesignlab/trrack";
// import Provenance from "@visdesignlab/trrack/src/Interfaces/Provenance";

// import { parse } from 'circular-json';


/**
 * interface representing the state of the application
 */
export interface ApplicationState {
  model: Object;
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
  activeCell: 0
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



    debugger
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
    //     debugger
    //     this.prov.addObserver([name], (this._actionFunctions as any)[name]);
    //   });

    this.prov.addObserver(["model"], () => {
      // provVisUpdate()
      console.log(this.prov.graph())
      debugger
      console.log("model observer called");
      this.pauseTracking = true;
      // @ts-ignore
      this.notebook.model.fromJSON(this.prov.current().getState().model);
      this.pauseTracking = false;
      debugger

      this.saveProvenanceGraph();
    });

    this.prov.addObserver(["activeCell"], () => {
      // provVisUpdate()
      console.log(this.prov.graph())
      console.log("activeCell observer called");
      this.pauseTracking = true;
      this._actionFunctions.changeActiveCell(this.prov.current().getState().activeCell)
      this.pauseTracking = false;

      let saveProvGraph = this._prov.exportProvenanceGraph();
      debugger
    });

    // Call this when all the observers are defined.
    // This is optional and only used when you want to enable sharing and loading states from URL.
    // Refere documentation for advanced usage scenario.
    this.prov.done();

    this._nbtracker = new NotebookProvenanceTracker(this);
  }

  protected saveProvenanceGraph() {
    debugger
    // @ts-ignore
    this.notebook.model!.metadata.set('provenance', this._prov.exportProvenanceGraph());
    // console.log('node added to graph', node);
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
