import json

def process_line(line):
    """Process a single line of the JSON file."""
    try:
        # Clean up the line
        line = line.strip()
        if line.endswith(','):
            line = line[:-1]
        if not line or line in '[]{}':
            return None
            
        # Parse the airport data
        airport = json.loads(line)
        return {
            'code': airport['code'],
            'name': airport['name'],
            'lat': float(airport['lat']),
            'lon': float(airport['lon']),
            'icao': airport.get('icao', '')
        }
    except:
        return None

# Initialize region files
regions = {}
region_files = {}

try:
    # Process the file line by line
    with open('airports.json', 'r') as f:
        for line in f:
            airport = process_line(line)
            if airport and 'code' in airport:
                first_letter = airport['code'][0].upper()
                
                # Initialize region if needed
                if first_letter not in regions:
                    regions[first_letter] = []
                    region_files[first_letter] = open(f'airports_{first_letter}.json', 'w')
                    region_files[first_letter].write('[')
                
                # Write airport to region file
                if len(regions[first_letter]) > 0:
                    region_files[first_letter].write(',')
                json.dump(airport, region_files[first_letter])
                regions[first_letter].append(airport['code'])

finally:
    # Close all region files
    for letter in region_files:
        region_files[letter].write(']')
        region_files[letter].close()

# Create index file
with open('airports_index.json', 'w') as f:
    json.dump({letter: f'airports_{letter}.json' for letter in regions}, f)

print('Created region files:', list(regions.keys()))
