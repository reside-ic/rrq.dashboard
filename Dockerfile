FROM node:22
WORKDIR /src

COPY web/package.json /src
COPY web/package-lock.json /src
RUN npm ci

COPY web /src
RUN npm run build

FROM rocker/r-ver:latest

RUN R -e 'install.packages("pak", repos = sprintf("https://r-lib.github.io/p/pak/stable/%s/%s/%s", .Platform$pkgType, R.Version()$os, R.Version()$arch))'

COPY DESCRIPTION /src/DESCRIPTION
RUN R -e 'pak::local_install_deps("/src")'

COPY . /src
RUN R -e 'pak::local_install("/src")'

COPY --from=0 /src/build/static /static
COPY --from=0 /src/build/index.html /static/index.html

COPY --chmod=755 <<EOF /usr/local/bin/rrq.dashboard
#!/usr/bin/env Rscript
rrq.dashboard:::main()
EOF

CMD ["rrq.dashboard", "--static=/static"]
EXPOSE 8888
