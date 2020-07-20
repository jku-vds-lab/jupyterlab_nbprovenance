"use strict";

// import * as React from 'react';
// import * as ReactDOM from 'react-dom';
// import { NotebookProvenance } from './notebook-provenance-visdesignlab';
// import { ProvenanceTreeVisualizationReact } from '@visualstorytelling/provenance-tree-visualization-react';
import { LabShell } from "@jupyterlab/application";
// import { NotebookPanel, Notebook, INotebookTracker } from '@jupyterlab/notebook';
// import { notebookModelCache } from '.';
import { Widget } from "@lumino/widgets";
import { Message } from "@lumino/messaging";
import "./action-listener";
// import { ProvenanceGraphTraverser } from '@visualstorytelling/provenance-core';

import "../style/side-bar.css";
// import {initProvenance} from '@visdesignlab/provenance-lib-core/src';


import
{
    initProvenance,
    ProvenanceGraph,
    Provenance,
    ActionFunction,
    SubscriberFunction,
    NodeMetadata,
    NodeID,
    Diff,
    RootNode,
    StateNode,
    ProvenanceNode,
    isStateNode,
    Nodes,
    CurrentNode,
    Artifacts,
    Extra
} from "@visdesignlab/provenance-lib-core";

// import Scatterplot from "./scatterplot"

// import ReactDOM from 'react-dom'
// import * as d3 from "d3"

// import {
//     ProvVis,
//     EventConfig,
//     Config,
//     ProvVisConfig,
//     ProvVisCreator
// } from "@visdesignlab/provvis";


// import {
//     ProvVis,
//     EventConfig,
//     Config,
//     ProvVisConfig,
//     ProvVisCreator
// } from "../ProvVis/provvis";



// copy from example just to try it out
/**
 * interface representing the state of the application
 */
// tslint:disable-next-line:interface-name
export interface INodeState {
    selectedCell: string;
}

/**
 * Initial state
 */

const initialState: INodeState = {
    selectedCell: "none"
};

type EventTypes = "select cell" | "hover cell";

// initialize provenance with the first state
let prov = initProvenance<INodeState, EventTypes, string>(initialState, false);


/**
 * Function called when a cell is selected. Applies an action to provenance.
 */
let selectCellUpdate = function(newSelected: string) {
    let action = prov.addAction(
      newSelected + " Selected",
      (state: INodeState) => {
          state.selectedCell = newSelected;
          return state;
      }
    );

    action
      .addEventType("select cell")
      .applyAction();
};


// /**
//  * Observer for when the selected node state is changed. Calls selectNode in scatterplot to update vis.
//  */
// prov.addObserver(["selectedNode"], () => {
//     scatterplot.selectNode(prov.current().getState().selectedNode);
//
//     console.log("select obs called")
//
//     provVisUpdate()
//
// });

// Setup ProvVis once initially
// provVisUpdate();



// Create function to pass to the ProvVis library for when a node is selected in the graph.
// For our purposes, were simply going to jump to the selected node.
let visCallback = function(newNode: NodeID) {
    prov.goToNode(newNode);

    // Incase the state doesn't change and the observers arent called, updating the ProvVis here.
    // provVisUpdate();
};









/**
 * The main view for the notebook provenance.
 */
export class SideBar extends Widget {
    constructor(shell: LabShell) {
        super();

        this.addClass("jp-nbprovenance-view");


        // Add a summary element to the panel
        this.summary = document.createElement("p");
        this.node.appendChild(this.summary);

        // Add the provenance div
        this.provtree = document.createElement("div");
        this.provtree.className = "ProvDiv";
        this.node.appendChild(this.provtree);


        // tslint:disable-next-line:no-debugger

        // tslint:disable-next-line:no-unused-expression
        prov;


        selectCellUpdate("thisIsTheNewSelect");


        // tslint:disable-next-line:no-unused-expression
        prov;

        provVisUpdate();
    }

    /**
     * The summary text element associated with the widget.
     */
    readonly summary: HTMLParagraphElement;

    /**
     * The summary text element associated with the widget.
     */
    readonly provtree: HTMLDivElement;

    /**
     * Handle update requests for the widget.
     */
    async onUpdateRequest(msg: Message): Promise<void> {
        this.summary.innerText = "Überschrift";
    }

    /**
     * Called after the widget is attached to the DOM
     *
     * Make sure the widget is rendered, even if the model has not changed.
     */
    protected onAfterAttach(msg: Message): void {
        this.update();
    }
}


function provVisUpdate() {
    document.getElementById("ProvDiv")!;
    console.log("UPDATING THE VISUALIZATION");
    // ProvVisCreator(
    //   document.getElementById("ProvDiv")!,
    //   prov,
    //   visCallback);
}
