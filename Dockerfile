FROM jupyter/scipy-notebook:lab-3.1.13

WORKDIR /jupyterlab_nbprovenance
COPY package.json package-lock.json ./
RUN npm ci
# VOLUME /jupyterlab_nbprovenance/node_modules

# allow npm prepare commands as root
# ENV npm_config_unsafe_perm=true

COPY . .
RUN npm run build
RUN jupyter labextension install --minimize=False
