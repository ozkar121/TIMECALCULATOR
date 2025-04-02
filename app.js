// Global variables
let map;
let markers = [];
let flightPath;
let selectedFrom = null;
let selectedTo = null;
let airports = [];

// Load airports data
async function loadAirports() {
  try {
    const response = await fetch('airports.json');
    airports = await response.json();
    console.log('Loaded airports:', airports.length);
    
    // Initialize autocomplete after loading airports
    setupAutocomplete('from-input', 'from-suggestions', (airport) => {
      selectedFrom = airport;
      updateFlightPath(false); // Don't calculate route yet
    });

    setupAutocomplete('to-input', 'to-suggestions', (airport) => {
      selectedTo = airport;
      updateFlightPath(false); // Don't calculate route yet
    });
  } catch (error) {
    console.error('Error loading airports:', error);
  }
}

// Update markers and flight path on map
async function updateFlightPath(calculateRoute = false) {
  // Clear existing markers and path
  markers.forEach(marker => map.removeLayer(marker));
  markers.length = 0;
  
  if (flightPath) {
    map.removeLayer(flightPath);
  }

  if (selectedFrom && selectedTo) {
    try {
      // Get airport data from our loaded airports
      const fromAirport = airports.find(a => a.code === selectedFrom.code);
      const toAirport = airports.find(a => a.code === selectedTo.code);
      
      if (!fromAirport || !toAirport) {
        throw new Error('Airport not found in database');
      }

      // Add airport markers
      const fromMarker = L.marker([fromAirport.lat, fromAirport.lon], {
        title: `${fromAirport.code} - ${fromAirport.name}`
      }).bindPopup(`
        <div class="text-sm">
          <p class="font-semibold">${fromAirport.name}</p>
          <p>${fromAirport.code} - ${fromAirport.icao || ''}</p>
          <p class="text-gray-600">Starting Point</p>
        </div>
      `);
      
      const toMarker = L.marker([toAirport.lat, toAirport.lon], {
        title: `${toAirport.code} - ${toAirport.name}`
      }).bindPopup(`
        <div class="text-sm">
          <p class="font-semibold">${toAirport.name}</p>
          <p>${toAirport.code} - ${toAirport.icao || ''}</p>
          <p class="text-gray-600">Destination</p>
        </div>
      `);
      
      markers.push(fromMarker, toMarker);
      fromMarker.addTo(map);
      toMarker.addTo(map);

      // Only fetch waypoints if we're calculating the route
      let pathCoordinates;
      if (calculateRoute) {
        // Try to find a route using airways
        const waypoints = await openAIPClient.getAirways(
          { lat: fromAirport.lat, lon: fromAirport.lon },
          { lat: toAirport.lat, lon: toAirport.lon }
        );
        console.log('Found waypoints:', waypoints);
        
        if (waypoints && waypoints.length > 0) {
          // Use airway route with waypoints from API
          const allPoints = [
            [fromAirport.lat, fromAirport.lon],
            ...waypoints.map(wp => [wp.lat, wp.lon]),
            [toAirport.lat, toAirport.lon]
          ];
          
          pathCoordinates = allPoints;
          
          // Add route information to the map
          const routeInfo = L.popup()
            .setLatLng(allPoints[Math.floor(allPoints.length / 2)])
            .setContent(`
              <div class="text-sm">
                <p class="font-semibold">Via Airways</p>
                <p class="text-gray-600">${waypoints.length} waypoints</p>
              </div>
            `);
          
          flightPath = L.polyline(pathCoordinates, {
            className: 'flight-path',
            color: '#3b82f6',
            weight: 3,
            opacity: 0.8
          }).addTo(map).bindPopup(routeInfo);

          // Add waypoint markers
          waypoints.forEach(wp => {
            const marker = L.marker([wp.lat, wp.lon], {
              title: wp.name,
              icon: L.divIcon({
                className: 'waypoint-marker',
                html: '<div class="w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>'
              })
            }).bindPopup(`
              <div class="text-sm">
                <p class="font-semibold">${wp.name}</p>
                <p class="text-gray-600">${wp.type || 'Waypoint'}</p>
              </div>
            `);
            markers.push(marker);
            marker.addTo(map);
          });
        }
      }

      // If no route calculated or no waypoints found, show direct route
      if (!pathCoordinates) {
        pathCoordinates = [[fromAirport.lat, fromAirport.lon], [toAirport.lat, toAirport.lon]];
        
        flightPath = L.polyline(pathCoordinates, {
          className: 'flight-path',
          color: '#3b82f6',
          weight: 2,
          dashArray: '5,10',
          opacity: 0.6
        }).addTo(map);
      }

      // Fit map bounds to show the entire route
      const bounds = L.latLngBounds(pathCoordinates);
      map.fitBounds(bounds, { padding: [50, 50] });
    } catch (error) {
      console.error('Error updating flight path:', error);
    }
  }
}

// Initialize map
function initializeMap() {
  map = L.map('map').setView([39.8283, -98.5795], 4);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: ' OpenStreetMap contributors'
  }).addTo(map);
}

// Calculate button click handler
document.getElementById("calculate-btn").addEventListener("click", async () => {
  if (!selectedFrom || !selectedTo) {
    document.getElementById("results").innerHTML = "<p class='text-red-500 dark:text-red-400'>Please select both airports.</p>";
    return;
  }

  const speed = parseFloat(document.getElementById("speed-input").value);
  const extra = parseFloat(document.getElementById("extra-minutes").value);

  try {
    // Update the map with waypoints
    await updateFlightPath(true);
    
    // Get the current route information
    const fromAirport = airports.find(a => a.code === selectedFrom.code);
    const toAirport = airports.find(a => a.code === selectedTo.code);
    
    // Calculate distance and time
    const waypoints = await openAIPClient.getAirways(
      { lat: fromAirport.lat, lon: fromAirport.lon },
      { lat: toAirport.lat, lon: toAirport.lon }
    );

    let distance, routeType, waypointText;
    if (waypoints && waypoints.length > 0) {
      // Calculate distance along waypoint route
      distance = calculateRouteDistance([
        { lat: fromAirport.lat, lon: fromAirport.lon },
        ...waypoints,
        { lat: toAirport.lat, lon: toAirport.lon }
      ]);
      routeType = 'Via Airways';
      waypointText = [
        fromAirport.code,
        ...waypoints.map(wp => wp.name),
        toAirport.code
      ].join(' → ');
    } else {
      // Calculate direct distance
      distance = haversine(fromAirport.lat, fromAirport.lon, toAirport.lat, toAirport.lon);
      routeType = 'Direct Route';
      waypointText = `${fromAirport.code} → ${toAirport.code}`;
    }

    const nm = distance / 1.852;
    const time = (nm / speed * 60) + extra;
    const hours = Math.floor(time / 60);
    const minutes = Math.round(time % 60);

    document.getElementById("results").innerHTML = `
      <div class="space-y-2">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">From</p>
            <p class="font-semibold">${fromAirport.name}</p>
            <p class="text-sm">${fromAirport.code} - ${fromAirport.icao || ''}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">To</p>
            <p class="font-semibold">${toAirport.name}</p>
            <p class="text-sm">${toAirport.code} - ${toAirport.icao || ''}</p>
          </div>
        </div>
        <div class="border-t dark:border-gray-600 my-4"></div>
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Route Type</p>
          <p class="font-semibold">${routeType}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${waypointText}</p>
        </div>
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Distance</p>
          <p class="font-semibold">${distance.toFixed(1)} km / ${nm.toFixed(1)} NM</p>
        </div>
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Estimated Flight Time</p>
          <p class="font-semibold text-xl">${hours}h ${minutes}m</p>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error calculating route:', error);
    document.getElementById("results").innerHTML = `
      <div class="text-red-500 dark:text-red-400">
        <p>Error calculating route. Please try again.</p>
        <p class="text-sm mt-2">Error details: ${error.message}</p>
      </div>
    `;
  }
});

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
  initializeMap();
  loadAirports();
});

// Add custom styles for waypoint markers
const style = document.createElement('style');
style.textContent = `
  .waypoint-marker {
    background: transparent;
    border: none;
  }
`;
document.head.appendChild(style);

// Save custom airports to localStorage
const saveCustomAirports = () => {
  const defaultAirportCodes = new Set(airports.filter(a => a.icao?.startsWith('K') || a.icao?.startsWith('MM') || a.icao === 'EGLL').map(a => a.code));
  const customAirports = airports.filter(a => !defaultAirportCodes.has(a.code));
  localStorage.setItem('customAirports', JSON.stringify(customAirports));
};

// Initialize dark mode from localStorage or system preference
function initializeDarkMode() {
  const darkModeEnabled = localStorage.getItem('darkMode') === 'true' ||
    (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  if (darkModeEnabled) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// Calculate total distance along a path of coordinates
function calculatePathDistance(coordinates) {
  let totalDistance = 0;
  
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lat1, lon1] = coordinates[i];
    const [lat2, lon2] = coordinates[i + 1];
    totalDistance += haversine(lat1, lon1, lat2, lon2);
  }
  
  return totalDistance;
}

// Filter airports based on search query
function filterAirports(query) {
  const q = query.toLowerCase();
  return airports.filter(airport => 
    airport.code.toLowerCase().includes(q) ||
    airport.name.toLowerCase().includes(q)
  );
}

// Show suggestions for input field
function showSuggestions(input, suggestionsDiv) {
  const query = input.value.trim();
  const matches = filterAirports(query);
  
  if (query.length === 0 || matches.length === 0) {
    suggestionsDiv.classList.add('hidden');
    return;
  }

  suggestionsDiv.innerHTML = matches
    .map(airport => `
      <div class="suggestion-item p-2 hover:bg-gray-100 dark:hover:bg-gray-700" data-code="${airport.code}">
        <div class="font-semibold">${airport.code} - ${airport.icao}</div>
        <div class="text-sm text-gray-600 dark:text-gray-400">${airport.name}</div>
      </div>
    `)
    .join('');

  suggestionsDiv.classList.remove('hidden');
}

// Set up autocomplete for input field
function setupAutocomplete(inputId, suggestionsId, onSelect) {
  const input = document.getElementById(inputId);
  const suggestionsDiv = document.getElementById(suggestionsId);

  input.addEventListener('input', () => {
    showSuggestions(input, suggestionsDiv);
  });

  suggestionsDiv.addEventListener('click', (e) => {
    const item = e.target.closest('.suggestion-item');
    if (item) {
      const code = item.dataset.code;
      const airport = airports.find(a => a.code === code);
      input.value = `${airport.code} - ${airport.name}`;
      suggestionsDiv.classList.add('hidden');
      onSelect(airport);
    }
  });

  // Hide suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !suggestionsDiv.contains(e.target)) {
      suggestionsDiv.classList.add('hidden');
    }
  });
}

// Handle adding new airport
document.getElementById('add-airport-form').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const newAirport = {
    code: document.getElementById('new-code').value.toUpperCase(),
    icao: document.getElementById('new-icao').value.toUpperCase(),
    name: document.getElementById('new-name').value,
    lat: parseFloat(document.getElementById('new-lat').value),
    lon: parseFloat(document.getElementById('new-lon').value)
  };

  // Validate airport code is unique
  if (airports.some(a => a.code === newAirport.code)) {
    alert('An airport with this code already exists!');
    return;
  }

  // Add new airport
  airports.push(newAirport);
  saveCustomAirports();
  
  // Reset form
  e.target.reset();
  
  // Reinitialize map with new airport
  initializeMap();
  
  // Show success message
  alert('Airport added successfully!');
});

// Dark mode toggle
document.getElementById('theme-toggle').addEventListener('click', () => {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('darkMode', isDark);
});

function toRadians(deg) {
  return deg * Math.PI / 180;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Function to find the best route using airways
function findBestRoute(fromCode, toCode) {
  // This function should return a route object with the following properties:
  // - name: The name of the airway
  // - airwayId: The ID of the airway
  // - waypoints: An array of waypoints along the airway, each with lat, lon, and name properties
  // For demonstration purposes, a simple route is returned
  return {
    name: 'Airway 123',
    airwayId: 'AWY123',
    waypoints: [
      { lat: 39.8283, lon: -98.5795, name: 'Waypoint 1' },
      { lat: 40.7128, lon: -74.0060, name: 'Waypoint 2' },
      { lat: 41.8781, lon: -87.6298, name: 'Waypoint 3' }
    ]
  };
}

// Function to calculate the distance along a route
function calculateRouteDistance(waypoints) {
  let totalDistance = 0;
  
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [lat1, lon1] = [waypoints[i].lat, waypoints[i].lon];
    const [lat2, lon2] = [waypoints[i + 1].lat, waypoints[i + 1].lon];
    totalDistance += haversine(lat1, lon1, lat2, lon2);
  }
  
  return totalDistance;
}
