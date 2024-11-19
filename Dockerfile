ARG BASE_URL=/

FROM node:22
ARG BASE_URL
WORKDIR /src

COPY web/package.json /src
COPY web/package-lock.json /src
RUN npm ci

COPY web /src
RUN npm run build -- --base=${BASE_URL}

FROM rocker/r-ver:latest
ARG BASE_URL

RUN R -e 'install.packages("pak", repos = sprintf("https://r-lib.github.io/p/pak/stable/%s/%s/%s", .Platform$pkgType, R.Version()$os, R.Version()$arch))'

COPY DESCRIPTION /src/DESCRIPTION
RUN R -e 'pak::local_install_deps("/src")'

COPY NAMESPACE /src
COPY R /src/R
COPY inst /src/inst
RUN R -e 'pak::local_install("/src")'

COPY --from=0 /src/dist /static

COPY --chmod=755 <<EOF /usr/local/bin/rrq.dashboard
#!/usr/bin/env Rscript
rrq.dashboard:::main()
EOF

ENV BASE_URL=${BASE_URL}
CMD exec rrq.dashboard --static=/static --base-path=${BASE_URL}
EXPOSE 8888
