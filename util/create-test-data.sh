#!/usr/bin/env bash
################################################################################
# Author: sbassett@wikimedia.org
# License: Apache 2 <https://opensource.org/licenses/Apache-2.0>
# Usage:
#   Creates a smaller set of test data from vendor-provided json file
################################################################################
set -euo pipefail

# check dependencies
bins=("wc" "echo" "jq" "sqlite3")
for bin in "${bins[@]}"; do
    if [[ -z $(which $bin) ]]; then
        printf "dependency '$bin' does not appear to be installed - exiting.\n"
        exit 1
    fi
done

# validate arguments - two expected - path of vendor file, number of lines
if ([ -z ${1+x} ] || ([ ! -d "$1" ] && [ ! -f "$1" ]) || [ -z ${2+x} ] || ! [[ "$2" =~ ^[0-9]+$ ]]); then
	printf "Two arguments required: {file path} and {number of lines of data}.  Exiting.\n"
	exit 1
fi

# set variable
readonly vendor_file_path="$1"
readonly file_total_lines=$(wc -l < "$vendor_file_path")
readonly data_total_lines="$2"

vendor_file_data=""
as_num=12345
ip_num='1.2.3.4'

for ((i=1;i<($data_total_lines + 1);i++));
do
	# randomly select test data lines
	rval=$[ ($RANDOM % $file_total_lines) + 1]
	new_obj=$(sed ${rval}'!d;q' "$vendor_file_path")
	new_obj=$(echo "$new_obj" | jq '.ip = "'"$ip_num"'" | .as.number = "'"$as_num"'"')

	as_num=$((as_num+1))
	# stackoverflow.com/a/43196141
    ip_hex=$(printf '%.2X%.2X%.2X%.2X\n' `echo $ip_num | sed -e 's/\./ /g'`)
    next_ip_hex=$(printf %.8X `echo $(( 0x$ip_hex + 1 ))`)
    ip_num=$(printf '%d.%d.%d.%d\n' `echo $next_ip_hex | sed -r 's/(..)/0x\1 /g'`)

	if [ "$i" != 1 ]; then
		vendor_file_data="$vendor_file_data,"$'\n'"$new_obj"
	else
		vendor_file_data="$new_obj"
	fi
done

echo "[$vendor_file_data]" | jq -c .
