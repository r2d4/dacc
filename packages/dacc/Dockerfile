FROM alpine:3.20 AS base

FROM base AS protoc-downloader
RUN apk add --no-cache curl unzip
ENV PROTOC_VERSION=28.0
ENV PLATFORM="linux-aarch_64"
RUN curl -OL https://github.com/protocolbuffers/protobuf/releases/download/v${PROTOC_VERSION}/protoc-${PROTOC_VERSION}-${PLATFORM}.zip
RUN unzip protoc-${PROTOC_VERSION}-${PLATFORM}.zip -d /usr/local

FROM base AS buildkit-proto-def
WORKDIR /app
RUN apk add --no-cache git
RUN git clone --depth 1 https://github.com/moby/buildkit.git /app/github.com/moby/buildkit
RUN mv /app/github.com/moby/buildkit/vendor /vendor

FROM base AS protoc-compiler
COPY --from=protoc-downloader /usr/local/bin/protoc /usr/local/bin/protoc
COPY --from=protoc-downloader /usr/local/include/google /usr/local/include/google
COPY --from=buildkit-proto-def /app/ /app/
COPY --from=buildkit-proto-def /vendor/ /vendor/
RUN apk add --no-cache npm nodejs
RUN npm install -g ts-proto @bufbuild/protoc-gen-es
RUN <<EOF
#!/bin/sh
set -e
mkdir -p /app/out/es
protoc \
    -I/app/ -I/vendor \
    --es_out=/app/out/es \
    --es_opt=target=ts \
    --es_opt=json_types=true \
    $(find /app/github.com/moby/buildkit -name "ops.proto" -print) github.com/gogo/protobuf/gogoproto/gogo.proto
EOF

FROM scratch AS output
COPY --from=protoc-compiler /app/out /