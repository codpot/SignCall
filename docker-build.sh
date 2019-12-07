#!/bin/bash
docker stop signcall
docker rm signcall
docker rmi signcall
docker build -t signcall .
docker run -d -p 443:443 --name signcall signcall
