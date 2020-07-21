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

// import {ProvenanceGraph} from '@visdesignlab/provenance-lib-core';

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
} from '@visdesignlab/provenance-lib-core';


import {NotebookProvenanceTracker} from './provenance-tracker'
// import {initProvenance} from "@visdesignlab/provenance-lib-core";
// import Provenance from "@visdesignlab/trrack/src/Interfaces/Provenance";

// import { parse } from 'circular-json';


/**
 * interface representing the state of the application
 */
export interface NodeState {
  model: Object;
  activeCell: number;
};

export interface NodeExtra {
  nodeNum: number;
  nodeX: number;
  nodeY: number;
};

/**
 * Initial state
 */

const initialState: NodeState = {
  model: {},
  activeCell: 0
}

type EventTypes = "changeActiveCell" | "changeCells" ;


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
  private _prov: Provenance<NodeState, EventTypes, NodeExtra>;

  // private _prov: string;


  constructor(private app: JupyterLab, public readonly notebook: Notebook, private sessionContext: ISessionContext) {
    this.init();
  }

  private init() {
    this._prov = initProvenance<NodeState, EventTypes, NodeExtra>(initialState, false);


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
      // @ts-ignore
      // this.notebook.model.cells.set(JSON.parse(this.prov.current().getState().cells));
      // let cells = JSON.parse(this.prov.current().getState().cells);
      // this.notebook.model.cells.pushAll(this.prov.current().getState().cells);
      this.notebook.model.fromJSON(this.prov.current().getState().model);
      debugger
    });

    this.prov.addObserver(["activeCell"], () => {
      // provVisUpdate()
      console.log(this.prov.graph())
      console.log("activeCell observer called");
      this._actionFunctions.changeActiveCell(this.prov.current().getState().activeCell);
    });

    this._nbtracker = new NotebookProvenanceTracker(this);
  }

  protected onNodeAdded(node: ProvenanceNode) {
    // @ts-ignore
    this.notebook.model!.metadata.set('provenance', serializeProvenanceGraph(this._graph as ProvenanceGraph));
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

  public get prov(): Provenance<NodeState, EventTypes, NodeExtra> {
    return this._prov;
  }

  public get pauseTracking() {
    return this._actionFunctions.pauseTracking;
  }

  // public get graph(): ProvenanceGraph {
  //     return this._graph as ProvenanceGraph;
  // }

  public get registry(): IActionFunctionRegistry {
    return this._registry;
  }
}
