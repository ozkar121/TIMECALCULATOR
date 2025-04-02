#!/bin/bash

# Create a temporary file for processing
echo "[" > airports_temp.json

# Extract only the fields we need and format them
grep -o '{[^}]*}' airports.json | \
while read -r line; do
    # Extract code, name, lat, lon, and icao using grep and sed
    code=$(echo "$line" | grep -o '"code":"[^"]*"' | sed 's/"code":"\([^"]*\)"/\1/')
    name=$(echo "$line" | grep -o '"name":"[^"]*"' | sed 's/"name":"\([^"]*\)"/\1/')
    lat=$(echo "$line" | grep -o '"lat":"[^"]*"' | sed 's/"lat":"\([^"]*\)"/\1/')
    lon=$(echo "$line" | grep -o '"lon":"[^"]*"' | sed 's/"lon":"\([^"]*\)"/\1/')
    icao=$(echo "$line" | grep -o '"icao":"[^"]*"' | sed 's/"icao":"\([^"]*\)"/\1/')
    
    # Only output if we have all required fields
    if [ ! -z "$code" ] && [ ! -z "$name" ] && [ ! -z "$lat" ] && [ ! -z "$lon" ]; then
        echo "{\"code\":\"$code\",\"name\":\"$name\",\"lat\":\"$lat\",\"lon\":\"$lon\",\"icao\":\"$icao\"}," >> airports_temp.json
    fi
done

# Remove the last comma and close the array
sed -i '' '$ s/,$//' airports_temp.json
echo "]" >> airports_temp.json

# Move to final location
mv airports_temp.json airports_optimized.json
