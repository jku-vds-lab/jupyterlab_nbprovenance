import { JupyterLab, JupyterFrontEndPlugin, ILayoutRestorer } from '@jupyterlab/application';
import '../style/index.css';
import { NotebookPanel, Notebook, INotebookTracker } from '@jupyterlab/notebook';
import { SideBar } from './side-bar';
import { NotebookProvenance } from './notebook-provenance';

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
  nbTracker.widgetAdded.connect((_: INotebookTracker, nbPanel: NotebookPanel) => {
    // wait until the session with the notebook model is ready
    nbPanel.sessionContext.ready.then(() => { // TODO: check if sessionContext is really the equivalent of session ... "ClientSession to SessionContext"
      const notebook: Notebook = nbPanel.content;
      if (!notebookModelCache.has(notebook)) {
        notebookModelCache.set(notebook, new NotebookProvenance(app, notebook, nbPanel.sessionContext));
      }
    });
  });

  const provenanceView = new SideBar(app.shell, nbTracker);
  provenanceView.id = 'nbprovenance-view';
  provenanceView.title.caption = 'Notebook Provenance';
  provenanceView.title.iconClass = 'jp-nbprovenanceIcon';

  // @ts-ignore
  restorer.add(provenanceView, 'nbprovenance_view');

  // Rank has been chosen somewhat arbitrarily
  // app.shell.addToLeftArea(provenanceView, { rank: 700 }); // this has been reworked
  // @ts-ignore
  app.shell.add(provenanceView, 'right', {rank: 400});
}
