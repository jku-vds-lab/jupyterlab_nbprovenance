import { ProvenanceGraph, ProvenanceNode, ProvenanceGraphTraverser, IProvenanceGraphTraverser, IProvenanceGraph, ActionFunctionRegistry, IActionFunctionRegistry } from '@visualstorytelling/provenance-core';
import { JupyterLab } from '@jupyterlab/application';
import { Notebook } from '@jupyterlab/notebook';
import { ActionFunctions } from './action-functions';

/**
 * Model for a provenance graph.
 */
export class NotebookProvenance {

    private _traverser: IProvenanceGraphTraverser;
    private _registry: IActionFunctionRegistry;
    private _graph: IProvenanceGraph;
    private _actionFunctions: ActionFunctions;

    constructor(private app: JupyterLab, public readonly notebook: Notebook) {
        this.init();
    }

    private init() {
        this._graph = new ProvenanceGraph({ name: 'nbprovenance.default.graph', version: this.app.info.version });
        this._graph.on('nodeAdded', (node: ProvenanceNode) => this.onNodeAdded(node));

        this._actionFunctions = new ActionFunctions(this.notebook);
        this._registry = new ActionFunctionRegistry();
        this._registry.register('addCell', this._actionFunctions.addCell, this._actionFunctions);
        this._registry.register('removeCell', this._actionFunctions.removeCell, this._actionFunctions);
        this._registry.register('moveCell', this._actionFunctions.moveCell, this._actionFunctions);
        this._registry.register('setCell', this._actionFunctions.setCell, this._actionFunctions);
        this._registry.register('changeActiveCell', this._actionFunctions.changeActiveCell, this._actionFunctions);

        this._traverser = new ProvenanceGraphTraverser(this._registry, this.graph);
    }

    protected onNodeAdded(node: ProvenanceNode) {
        console.log('node added to graph', node);
    }

    public get traverser(): IProvenanceGraphTraverser {
        return this._traverser;
    }

    public get pauseTracking() {
        return this._actionFunctions.pauseTracking;
    }

    public get graph(): ProvenanceGraph {
        return this._graph as ProvenanceGraph;
    }

    public get registry(): IActionFunctionRegistry {
        return this._registry;
    }
}
