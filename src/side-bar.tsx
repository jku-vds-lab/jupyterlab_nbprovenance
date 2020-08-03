"use strict";

// import * as React from 'react';
// import * as ReactDOM from 'react-dom';
import { NotebookProvenance } from './notebook-provenance';
// import { ProvenanceTreeVisualizationReact } from '@visualstorytelling/provenance-tree-visualization-react';
import { LabShell } from "@jupyterlab/application";
import { NotebookPanel, Notebook, INotebookTracker } from '@jupyterlab/notebook';
import { notebookModelCache } from '.';
import { Widget } from "@lumino/widgets";
import { Message } from "@lumino/messaging";
import "./action-listener";
// import { ProvenanceGraphTraverser } from '@visualstorytelling/provenance-core';

import "../style/side-bar.css";
// import {initProvenance} from '@visdesignlab/trrack/src';


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
} from "@visdesignlab/trrack";

// import Scatterplot from "./scatterplot"

// import ReactDOM from 'react-dom'
import * as d3 from "d3"


// import {
//     // ProvVis,
//     // EventConfig,
//     // Config,
//     // ProvVisConfig,
//     ProvVisCreator
// } from "@visdesignlab/trrack-vis";



// Create function to pass to the ProvVis library for when a node is selected in the graph.
// For our purposes, were simply going to jump to the selected node.
let visCallback = function(newNode: NodeID) {
    // prov.goToNode(newNode);

    // Incase the state doesn't change and the observers arent called, updating the ProvVis here.
    // provVisUpdate();
};



/**
 * The main view for the notebook provenance.
 */
export class SideBar extends Widget {

    private notebookProvenance: NotebookProvenance | null = null;

    constructor(shell: LabShell, nbTracker: INotebookTracker) {
        super();

        this.addClass("jp-nbprovenance-view");

        nbTracker.widgetAdded.connect((_: INotebookTracker, nbPanel: NotebookPanel) => {
            // wait until the session with the notebook model is ready
            nbPanel.sessionContext.ready.then(() => {
                // update provenance information only for the current widget
                if (shell.currentWidget instanceof NotebookPanel && nbPanel === shell.currentWidget) {
                    const notebook: Notebook = nbPanel.content;
                    this.notebookProvenance = (notebookModelCache.has(notebook)) ? notebookModelCache.get(notebook)! : null;
                    this.update();
                }
            });
        });

        // Add a summary element to the panel
        this.summary = document.createElement("p");
        this.node.appendChild(this.summary);

        // Add the provenance div
        this.provtree = document.createElement("div");
        this.provtree.id = "ProvDiv";
        this.node.appendChild(this.provtree);

        this.summary.innerText = "wert ";
        //somehow, d3 doesn't do anything if I write it here

        // provVisUpdate();
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

    }

    /**
     * Called after the widget is attached to the DOM
     *
     * Make sure the widget is rendered, even if the model has not changed.
     */
    protected onAfterAttach(msg: Message): void {
        d3.select("#ProvDiv")
          .append("button")
          .text("undo")
          .on("click", () => {
              debugger
              // @ts-ignore
              this.notebookProvenance.prov.goBackOneStep();
          });
        this.update();
        // provVisUpdate();
    }
}


function provVisUpdate() {
    document.getElementById("ProvDiv")!;
    console.log("UPDATING THE VISUALIZATION");
    debugger
    // ProvVisCreator(
    //   document.getElementById("ProvDiv")!,
    //   this.notebookProvenance.prov,
    //   visCallback);
}
