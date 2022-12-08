#!/bin/bash
#
# This script takes as input a file containing one URL per line.  For each URL,
# it runs the request logger and writes its output to DOMAIN.json.

script_dir=$(dirname "$0")
crawler="${script_dir}/run.js"
metamask_path="metamask-chrome-10.22.2"
destination="test_crawls"
logs="test_logs"
if [ $# != 1 ]
then
    >&2 echo "Usage: $0 FILE"
    exit 1
fi
file_name="$1"
while read url; do
  echo "Crawling ${url}."
  domain=$(echo "$url" | awk -F/ '{print $3}')
  "$crawler" \
    --interactive \
    --debug verbose \
    --metamask "$metamask_path" \
    --ancestors \
    --destination "$destination" \
    --url "$url" > "${logs}/${domain}.log"
done <"$file_name"
