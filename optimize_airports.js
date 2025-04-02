const fs = require('fs');

// Read the original airports.json
const airports = require('./airports.json');

// Keep only the essential fields we need
const optimizedAirports = airports.map(airport => ({
    code: airport.code,
    name: airport.name,
    lat: parseFloat(airport.lat || 0).toFixed(4), // Reduce precision to 4 decimal places
    lon: parseFloat(airport.lon || 0).toFixed(4), // Reduce precision to 4 decimal places
    icao: airport.icao || ''
}));

// Filter out invalid airports
const validAirports = optimizedAirports.filter(airport => 
    airport.code && 
    airport.name && 
    airport.lat !== "0.0000" && 
    airport.lon !== "0.0000"
);

// Write the optimized data
fs.writeFileSync(
    'airports_optimized.json',
    JSON.stringify(validAirports),
    'utf8'
);
