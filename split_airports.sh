#!/bin/bash

# Create a directory for the split files
mkdir -p airport_data

# Initialize the index file
echo "{" > airport_data/index.json

# Process the airports.json file
first_letter=""
current_file=""

while IFS= read -r line; do
    # Skip empty lines and brackets
    if [[ "$line" =~ ^[[:space:]]*[\[\],]*[[:space:]]*$ ]]; then
        continue
    fi
    
    # Extract the airport code
    if [[ "$line" =~ \"code\":\"([A-Za-z0-9]+)\" ]]; then
        code="${BASH_REMATCH[1]}"
        letter="${code:0:1}"
        letter="${letter^^}"  # Convert to uppercase
        
        # If this is a new letter, start a new file
        if [ "$letter" != "$first_letter" ]; then
            # Close previous file if exists
            if [ ! -z "$current_file" ]; then
                echo "]" >> "$current_file"
                # Add to index
                echo "\"$first_letter\": \"airports_$first_letter.json\"," >> airport_data/index.json
            fi
            
            # Start new file
            first_letter="$letter"
            current_file="airport_data/airports_$letter.json"
            echo "[" > "$current_file"
            first_in_file=true
        fi
        
        # Add comma if not first item
        if [ "$first_in_file" = true ]; then
            first_in_file=false
        else
            echo "," >> "$current_file"
        fi
        
        # Write the airport entry
        echo "$line" >> "$current_file"
    fi
done < airports.json

# Close the last file
if [ ! -z "$current_file" ]; then
    echo "]" >> "$current_file"
    # Add last entry to index
    echo "\"$first_letter\": \"airports_$first_letter.json\"" >> airport_data/index.json
fi

# Close the index file
echo "}" >> airport_data/index.json

# Create a small initial dataset
head -n 100 airports.json > airport_data/initial.json
