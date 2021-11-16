FROM jupyter/scipy-notebook:lab-3.1.13

WORKDIR /jupyterlab_nbprovenance
COPY . .

RUN npm ci
RUN npm run build

RUN jupyter labextension install --minimize=False

CMD ["jupyter", "lab"]