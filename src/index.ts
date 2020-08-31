import { JupyterLab, JupyterFrontEndPlugin, ILayoutRestorer } from '@jupyterlab/application';
import '../style/index.css';
import { NotebookPanel, Notebook, INotebookTracker } from '@jupyterlab/notebook';
import { SideBar } from './side-bar';
import { NotebookProvenance } from './notebook-provenance';
import {Widget} from '@lumino/widgets';

/**
 * Initialization data for the jupyterlab_nbprovenance extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab_nbprovenance',
  autoStart: true,
  requires: [ILayoutRestorer, INotebookTracker],
  activate,
};

export default plugin;

export const notebookModelCache = new Map<Notebook, NotebookProvenance>();

function activate(app: JupyterLab, restorer: ILayoutRestorer, nbTracker: INotebookTracker): void {
  let provenanceView: Widget;
  nbTracker.widgetAdded.connect((_: INotebookTracker, nbPanel: NotebookPanel) => {
    // wait until the session with the notebook model is ready
    nbPanel.sessionContext.ready.then(() => {
      const notebook: Notebook = nbPanel.content;
      if (!notebookModelCache.has(notebook)) {
        notebookModelCache.set(notebook, new NotebookProvenance(notebook, nbPanel.context, provenanceView));
      }
    });
  });

  provenanceView = new SideBar(app.shell, nbTracker);
  provenanceView.id = 'nbprovenance-view';
  provenanceView.title.caption = 'Notebook Provenance';
  provenanceView.title.iconClass = 'jp-nbprovenanceIcon';
  restorer.add(provenanceView, 'nbprovenance_view');
  app.shell.add(provenanceView, 'right', {rank: 700}); // rank was chosen arbitrarily
}


