import json

def process_airport_line(line):
    """Process a single line containing an airport object."""
    try:
        # Remove trailing comma if present
        line = line.strip()
        if line.endswith(','):
            line = line[:-1]
            
        # Skip empty lines and array brackets
        if not line or line in '[{]}':
            return None
            
        # Parse the line as JSON
        airport = json.loads(line)
        
        if (airport.get('code') and 
            airport.get('name') and 
            airport.get('lat') and 
            airport.get('lon')):
            
            lat = round(float(airport['lat']), 4)
            lon = round(float(airport['lon']), 4)
            
            if lat == 0 and lon == 0:
                return None
                
            return {
                'code': airport['code'],
                'name': airport['name'],
                'lat': lat,
                'lon': lon,
                'icao': airport.get('icao', '')
            }
    except (ValueError, TypeError, json.JSONDecodeError):
        return None
    return None

# Process the file line by line
optimized_airports = []
with open('airports.json', 'r') as f:
    for line in f:
        airport = process_airport_line(line)
        if airport:
            optimized_airports.append(airport)

# Write the optimized data
with open('airports_optimized.json', 'w') as f:
    f.write('[\n')
    for i, airport in enumerate(optimized_airports):
        if i > 0:
            f.write(',\n')
        json.dump(airport, f, separators=(',', ':'))
    f.write('\n]')

print(f'Optimized airports: {len(optimized_airports)}')
