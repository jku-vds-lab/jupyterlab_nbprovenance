"use strict";
import {ApplicationExtra, ApplicationState, EventTypes, NotebookProvenance} from './notebook-provenance';
import { LabShell } from "@jupyterlab/application";
import { NotebookPanel, Notebook, INotebookTracker } from '@jupyterlab/notebook';
import { notebookModelCache } from '.';
import { Widget } from "@lumino/widgets";
import { Message } from "@lumino/messaging";
import "../style/side-bar.css";
import
{
    Provenance,
    NodeID
} from "@visdesignlab/trrack";

import {
  EventConfig,
  ProvVisConfig,
  ProvVisCreator
} from "@visdesignlab/trrack-vis";

import {
    symbol,
    symbolCircle,
    symbolCross,
    // symbolDiamond,
    // symbolSquare,
    // symbolStar,
    symbolTriangle,
    // symbolWye
} from "d3-shape";
import * as React from "react";
import {style} from "typestyle";



let notebookProvenance: NotebookProvenance | null;
let eventConfig: EventConfig<any>;

/**
 * The main view for the notebook provenance.
 */
export class SideBar extends Widget {
  constructor(shell: LabShell, nbTracker: INotebookTracker) {
    super();

    this.addClass("jp-nbprovenance-view");

    nbTracker.widgetAdded.connect((_: INotebookTracker, nbPanel: NotebookPanel) => {
      // wait until the session with the notebook model is ready
      nbPanel.sessionContext.ready.then(() => {
        // update provenance information only for the current widget
        if (shell.currentWidget instanceof NotebookPanel && nbPanel === shell.currentWidget) {
          const notebook: Notebook = nbPanel.content;
          notebookProvenance = (notebookModelCache.has(notebook)) ? notebookModelCache.get(notebook)! : null;

          this.summary.innerText = "Provenance of " + (notebookProvenance!.notebook.parent! as NotebookPanel).context.path;
          if(notebookProvenance){
            eventConfig = createEventConfig(notebookProvenance.prov);
          }
          this.update();
        }
      });
    });

    let topBar = document.createElement("div");
    this.node.appendChild(topBar);

    // Add a summary element to the topBar
    this.summary = document.createElement("p");
    this.summary.setAttribute("className","notebookTitle")
    topBar.appendChild(this.summary);

    // just testing FontAwesome
    // let image = document.createElement("i");
    // image.className = "fas fa-arrows-alt";
    // image.setAttribute("style","color: red")
    // topBar.appendChild(image);

    // Add the provenance div
    this.provtree = document.createElement("div");
    this.provtree.id = "ProvDiv";
    this.node.appendChild(this.provtree);
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
    console.log("onUpdateRequest");

    if(notebookProvenance){
      provVisUpdate(notebookProvenance.prov);
    }
  }

  /**
   * A message handler invoked on a `'before-show'` message.
   *
   * #### Notes
   * The default implementation of this handler is a no-op.
   */
  protected onBeforeShow(msg: Message): void {
    console.log("onBeforeShow");
    if(notebookProvenance){
      provVisUpdate(notebookProvenance.prov);
    }
  }
}



// Create function to pass to the ProvVis library for when a node is selected in the graph.
// In this case: jump to clicked node
let visCallback = function(newNode: NodeID) {
    if(notebookProvenance){
      notebookProvenance.prov.goToNode(newNode);
      // Incase the state doesn't change and the observers aren't called, updating the ProvVis here.
      provVisUpdate(notebookProvenance.prov);
    }
};

export function provVisUpdate(prov: Provenance<ApplicationState, EventTypes, ApplicationExtra>) {
  console.log("UPDATING THE VISUALIZATION");
  let config: ProvVisConfig = {
    cellsVisArea: 50,
    eventConfig: eventConfig,
    // maxNumberOfCells: notebookProvenance!.notebook.model!.cells.length
  };

  ProvVisCreator(
    document.getElementById("ProvDiv")!,
    prov,
    visCallback,
    true,
    true,
    prov.graph().root,
    config
  );
}


function createEventConfig<E extends string>(prov: Provenance<unknown, string, unknown>): EventConfig<E> {
  console.log("Create eventConfig");

  // function createRemoveSymbol() {
  //   // return "m1.00089,11.4262l11.3951,-10.42531l12.10485,11.07455l12.10484,-11.07455l11.39521,10.42531l-12.10485,11.07464l12.10485,11.07464l-11.39521,10.42541l-12.10484,-11.07465l-12.10485,11.07465l-11.3951,-10.42541l12.10474,-11.07464l-12.10474,-11.07464z";
  //   return "M10.19 7.5L15 12.31L12.31 15L7.5 10.19L2.69 15L0 12.31L4.81 7.5L0 2.69L2.69 0L7.5 4.81L12.31 0L15 2.69L10.19 7.5Z";
  // }
  //
  // function createMoveSymbol(){
  //
  //   return "M352.201 425.775l-79.196 79.196c-9.373 9.373-24.568 9.373-33.941 0l-79.196-79.196c-15.119-15.119-4.411-40.971 16.971-40.97h51.162L228 284H127.196v51.162c0 21.382-25.851 32.09-40.971 16.971L7.029 272.937c-9.373-9.373-9.373-24.569 0-33.941L86.225 159.8c15.119-15.119 40.971-4.411 40.971 16.971V228H228V127.196h-51.23c-21.382 0-32.09-25.851-16.971-40.971l79.196-79.196c9.373-9.373 24.568-9.373 33.941 0l79.196 79.196c15.119 15.119 4.411 40.971-16.971 40.971h-51.162V228h100.804v-51.162c0-21.382 25.851-32.09 40.97-16.971l79.196 79.196c9.373 9.373 9.373 24.569 0 33.941L425.773 352.2c-15.119 15.119-40.971 4.411-40.97-16.971V284H284v100.804h51.23c21.382 0 32.09 25.851 16.971 40.971z";
  // }
  // let transform = "scale (0.035) translate (-200,-200)";

  // function changeSymbol(current: boolean){
  //   return <path
  //     strokeWidth={30}
  //     className={style({
  //       fill: current ? 'rgb(88, 22, 22)' : 'white',
  //       stroke: 'rgb(88, 22, 22)'
  //     })}
  //     transform="scale (0.035) translate (-200,-200)"
  //     d="M0 352a160 160 0 0 0 160 160h64a160 160 0 0 0 160-160V224H0zM176 0h-16A160 160 0 0 0 0 160v32h176zm48 0h-16v192h176v-32A160 160 0 0 0 224 0z"
  //   />
  // }

  function changeSymbol(current: boolean){
    return <path
      strokeWidth={2}
      className={style({
        fill: current ? 'rgb(88, 22, 22)' : 'white',
        stroke: 'rgb(88, 22, 22)'
      })}
      d={symbol().type(symbolCircle)()!}
    />
  }

  function executeSymbol(current: boolean){
    return <path
      strokeWidth={30}
      className={style({
        fill: current ? 'rgb(88, 22, 22)' : 'white',
        stroke: 'rgb(88, 22, 22)'
      })}
      transform="scale (0.035) translate (-250,-250)"
      d="M471.99 334.43L336.06 256l135.93-78.43c7.66-4.42 10.28-14.2 5.86-21.86l-32.02-55.43c-4.42-7.65-14.21-10.28-21.87-5.86l-135.93 78.43V16c0-8.84-7.17-16-16.01-16h-64.04c-8.84 0-16.01 7.16-16.01 16v156.86L56.04 94.43c-7.66-4.42-17.45-1.79-21.87 5.86L2.15 155.71c-4.42 7.65-1.8 17.44 5.86 21.86L143.94 256 8.01 334.43c-7.66 4.42-10.28 14.21-5.86 21.86l32.02 55.43c4.42 7.65 14.21 10.27 21.87 5.86l135.93-78.43V496c0 8.84 7.17 16 16.01 16h64.04c8.84 0 16.01-7.16 16.01-16V339.14l135.93 78.43c7.66 4.42 17.45 1.8 21.87-5.86l32.02-55.43c4.42-7.65 1.8-17.43-5.86-21.85z"
    />
  }

  function addSymbol(current: boolean){
    return <path
      strokeWidth={2}
      className={style({
        fill: current ? 'rgb(88, 22, 22)' : 'white',
        stroke: 'rgb(88, 22, 22)'
      })}
      d={symbol().type(symbolCross).size(125)()!}
    />
  }

  function removeSymbol(current: boolean){
    return <path
      strokeWidth={30}
      className={style({
        fill: current ? 'rgb(88, 22, 22)' : 'white',
        stroke: 'rgb(88, 22, 22)'
      })}
      transform="scale (0.035) translate (-220,-220)"
      d="M432 32H312l-9.4-18.7A24 24 0 0 0 281.1 0H166.8a23.72 23.72 0 0 0-21.4 13.3L136 32H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16zM53.2 467a48 48 0 0 0 47.9 45h245.8a48 48 0 0 0 47.9-45L416 128H32z"
    />
  }

  function moveSymbol(current: boolean){
    return <path
      strokeWidth={30}
      className={style({
        fill: current ? 'rgb(88, 22, 22)' : 'white',
        stroke: 'rgb(88, 22, 22)'
      })}
      transform="scale (0.035) translate (-260,-260)"
      d="M352.201 425.775l-79.196 79.196c-9.373 9.373-24.568 9.373-33.941 0l-79.196-79.196c-15.119-15.119-4.411-40.971 16.971-40.97h51.162L228 284H127.196v51.162c0 21.382-25.851 32.09-40.971 16.971L7.029 272.937c-9.373-9.373-9.373-24.569 0-33.941L86.225 159.8c15.119-15.119 40.971-4.411 40.971 16.971V228H228V127.196h-51.23c-21.382 0-32.09-25.851-16.971-40.971l79.196-79.196c9.373-9.373 24.568-9.373 33.941 0l79.196 79.196c15.119 15.119 4.411 40.971-16.971 40.971h-51.162V228h100.804v-51.162c0-21.382 25.851-32.09 40.97-16.971l79.196 79.196c9.373 9.373 9.373 24.569 0 33.941L425.773 352.2c-15.119 15.119-40.971 4.411-40.97-16.971V284H284v100.804h51.23c21.382 0 32.09 25.851 16.971 40.971z"
    />
  }

  function setSymbol(current: boolean){
    return <path
      strokeWidth={2}
      className={style({
        fill: current ? 'rgb(88, 22, 22)' : 'white',
        stroke: 'rgb(88, 22, 22)'
      })}
      d={symbol().type(symbolTriangle).size(100)()!}
    />
  }

  function changeCellValueSymbol(current: boolean){
    return <path
      strokeWidth={30}
      className={style({
        fill: current ? 'rgb(88, 22, 22)' : 'white',
        stroke: 'rgb(88, 22, 22)'
      })}
      transform="scale (0.035) translate (-260,-260)"
      d="M402.6 83.2l90.2 90.2c3.8 3.8 3.8 10 0 13.8L274.4 405.6l-92.8 10.3c-12.4 1.4-22.9-9.1-21.5-21.5l10.3-92.8L388.8 83.2c3.8-3.8 10-3.8 13.8 0zm162-22.9l-48.8-48.8c-15.2-15.2-39.9-15.2-55.2 0l-35.4 35.4c-3.8 3.8-3.8 10 0 13.8l90.2 90.2c3.8 3.8 10 3.8 13.8 0l35.4-35.4c15.2-15.3 15.2-40 0-55.2zM384 346.2V448H64V128h229.8c3.2 0 6.2-1.3 8.5-3.5l40-40c7.6-7.6 2.2-20.5-8.5-20.5H48C21.5 64 0 85.5 0 112v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V306.2c0-10.7-12.9-16-20.5-8.5l-40 40c-2.2 2.3-3.5 5.3-3.5 8.5z"
    />
  }

  let conf: EventConfig<E> = {};
  for (let j of EventTypes) {
    conf[j] = {}
  }

  // change
  conf[EventTypes[0]].backboneGlyph = changeSymbol(false);
  conf[EventTypes[0]].currentGlyph = changeSymbol(true);
  conf[EventTypes[0]].bundleGlyph = conf[EventTypes[0]].backboneGlyph;
  conf[EventTypes[0]].regularGlyph = conf[EventTypes[0]].backboneGlyph;
  conf[EventTypes[0]].description = "The active cell has been changed"

  // execute
  conf[EventTypes[1]].backboneGlyph = executeSymbol(false);
  conf[EventTypes[1]].currentGlyph = executeSymbol(true);
  conf[EventTypes[1]].bundleGlyph = conf[EventTypes[1]].backboneGlyph;
  conf[EventTypes[1]].regularGlyph = conf[EventTypes[1]].backboneGlyph;
  conf[EventTypes[1]].description = "A cell has been executed"

  // add
  conf[EventTypes[2]].backboneGlyph = addSymbol(false);
  conf[EventTypes[2]].currentGlyph = addSymbol(true);
  conf[EventTypes[2]].bundleGlyph = conf[EventTypes[2]].backboneGlyph;
  conf[EventTypes[2]].regularGlyph = conf[EventTypes[2]].backboneGlyph;
  conf[EventTypes[2]].description = "A new cell has been added"

  // remove
  conf[EventTypes[3]].backboneGlyph = removeSymbol(false);
  conf[EventTypes[3]].currentGlyph = removeSymbol(true);
  conf[EventTypes[3]].bundleGlyph = conf[EventTypes[3]].backboneGlyph;
  conf[EventTypes[3]].regularGlyph = conf[EventTypes[3]].backboneGlyph;
  conf[EventTypes[3]].description = "A cell has been removed"

  // move
  conf[EventTypes[4]].backboneGlyph = moveSymbol(false);
  conf[EventTypes[4]].currentGlyph = moveSymbol(true);
  conf[EventTypes[4]].bundleGlyph = conf[EventTypes[4]].backboneGlyph;
  conf[EventTypes[4]].regularGlyph = conf[EventTypes[4]].backboneGlyph;
  conf[EventTypes[4]].description = "A cell has been moved"

  // set
  conf[EventTypes[5]].backboneGlyph = setSymbol(false);
  conf[EventTypes[5]].currentGlyph = setSymbol(true);
  conf[EventTypes[5]].bundleGlyph = conf[EventTypes[5]].backboneGlyph;
  conf[EventTypes[5]].regularGlyph = conf[EventTypes[5]].backboneGlyph;
  conf[EventTypes[5]].description = "The type of a cell has been changed"

  // changeCellValue
  conf[EventTypes[6]].backboneGlyph = changeCellValueSymbol(false);
  conf[EventTypes[6]].currentGlyph = changeCellValueSymbol(true);
  conf[EventTypes[6]].bundleGlyph = conf[EventTypes[6]].backboneGlyph;
  conf[EventTypes[6]].regularGlyph = conf[EventTypes[6]].backboneGlyph;
  conf[EventTypes[6]].description = "The value of a cell has been changed"

  return conf;
}
