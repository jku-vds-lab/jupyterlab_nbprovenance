# JupyterLab Notebook Provenance

 ![npm (scoped)](https://img.shields.io/npm/v/jku-icg/trrack-notebook-vis)

An extension for JupyterLab (v2+) to track interaction provenance in Jupyter notebooks.  
The provenance information is stored using the provenance tracking library [trrack]((https://github.com/visdesignlab/trrack)).

this extension does
vis by blurb
TODO

## Install

Install [JupyterLab](http://jupyterlab.readthedocs.io/en/latest/getting_started/installation.html) if you haven't already.

To install the extension from the terminal, type:

```sh
jupyter labextension install @jku-icg/jupyterlab_nbprovenance
```

## Development

1. Prepare Environment (optional)

    ```sh
    # Create
    conda create --name notebook_provenance python=3.8.5

    # Enable
    conda activate notebook_provenance

    #Install requirements (jupyterlab)
    conda install jupyterlab
    ```

1. Clone this repo, `cd` into the folder
1. Then build the extension

    ```sh
    yarn install
    yarn build
    ```

1. Install the extension

    ```sh
    jupyter labextension install --minimize=False # install the current directory as an extension
    ```

    Disabling the minifier is optional, but minimizig the code is not necessary locally and it reduces the build time.

1. Start JuypterLab in watch mode

    ```sh
    jupyter lab --watch
    ```

1. Make Code changes
1. Rebuild the extension with `yarn build` or watch for file changes and built automatically with `yarn watch`  
    JupyterLab updates itself, due to the `--watch` parameter
1. Refresh the JupyterLab in your browser to load the updated files

Also see the [JuypterLab Extension Developer Guide](https://jupyterlab.readthedocs.io/en/stable/developer/extension_dev.html#extension-authoring).

## Attributions

This extension uses icons by [fontawesome.com](https://fontawesome.com/), available under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
