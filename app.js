// Major world airports data
let airports = [
  // US Airports
  { code: "ATL", icao: "KATL", name: "Hartsfield-Jackson Atlanta International Airport", lat: 33.6367, lon: -84.4281 },
  { code: "LAX", icao: "KLAX", name: "Los Angeles International Airport", lat: 33.9425, lon: -118.4081 },
  { code: "ORD", icao: "KORD", name: "O'Hare International Airport", lat: 41.9786, lon: -87.9048 },
  { code: "LHR", icao: "EGLL", name: "London Heathrow Airport", lat: 51.4700, lon: -0.4543 },
  { code: "JFK", icao: "KJFK", name: "John F. Kennedy International Airport", lat: 40.6413, lon: -73.7781 },
  { code: "DFW", icao: "KDFW", name: "Dallas/Fort Worth International Airport", lat: 32.8968, lon: -97.0380 },
  { code: "DEN", icao: "KDEN", name: "Denver International Airport", lat: 39.8561, lon: -104.6737 },
  { code: "SFO", icao: "KSFO", name: "San Francisco International Airport", lat: 37.6188, lon: -122.3750 },
  { code: "SEA", icao: "KSEA", name: "Seattle-Tacoma International Airport", lat: 47.4502, lon: -122.3088 },
  { code: "MIA", icao: "KMIA", name: "Miami International Airport", lat: 25.7932, lon: -80.2906 },
  // Mexican Airports
  { code: "MEX", icao: "MMMX", name: "Benito Juárez International Airport", lat: 19.4363, lon: -99.0721 },
  { code: "CUN", icao: "MMUN", name: "Cancún International Airport", lat: 21.0365, lon: -86.8771 },
  { code: "GDL", icao: "MMGL", name: "Guadalajara International Airport", lat: 20.5218, lon: -103.3111 },
  { code: "MTY", icao: "MMMY", name: "Monterrey International Airport", lat: 25.7785, lon: -100.1067 },
  { code: "TIJ", icao: "MMTJ", name: "Tijuana International Airport", lat: 32.5411, lon: -116.9700 },
  { code: "SJD", icao: "MMSD", name: "Los Cabos International Airport", lat: 23.1518, lon: -109.7215 },
  { code: "CJS", icao: "MMCS", name: "Ciudad Juárez International Airport", lat: 31.6361, lon: -106.4289 },
  { code: "MID", icao: "MMMD", name: "Mérida International Airport", lat: 20.9370, lon: -89.6577 },
  { code: "BJX", icao: "MMLO", name: "Guanajuato International Airport", lat: 20.9935, lon: -101.4815 },
  { code: "HMO", icao: "MMHO", name: "Hermosillo International Airport", lat: 29.0959, lon: -111.0479 }
];

// Load custom airports from localStorage
const loadCustomAirports = () => {
  const customAirports = JSON.parse(localStorage.getItem('customAirports') || '[]');
  airports = [...airports, ...customAirports];
};

// Save custom airports to localStorage
const saveCustomAirports = () => {
  const defaultAirportCodes = new Set(airports.slice(0, 20).map(a => a.code));
  const customAirports = airports.filter(a => !defaultAirportCodes.has(a.code));
  localStorage.setItem('customAirports', JSON.stringify(customAirports));
};

let map, flightPath;
let selectedFrom = null;
let selectedTo = null;
const markers = [];

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

// Initialize map
function initializeMap() {
  map = L.map('map').setView([39.8283, -98.5795], 4); // Center on USA

  // Add tile layer with conditional dark mode
  const isDark = document.documentElement.classList.contains('dark');
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: ' OpenStreetMap contributors'
  }).addTo(map);

  // Clear existing markers
  markers.forEach(marker => map.removeLayer(marker));
  markers.length = 0;

  // Add airport markers
  airports.forEach(airport => {
    const marker = L.marker([airport.lat, airport.lon], {
      title: `${airport.code} - ${airport.name}`
    });
    markers.push(marker);
    marker.addTo(map);
  });
}

// Update flight path on map
function updateFlightPath() {
  if (flightPath) {
    map.removeLayer(flightPath);
  }

  if (selectedFrom && selectedTo) {
    flightPath = L.polyline(
      [[selectedFrom.lat, selectedFrom.lon], [selectedTo.lat, selectedTo.lon]],
      { className: 'flight-path', color: '#3b82f6', weight: 2 }
    ).addTo(map);

    // Fit map bounds to show both airports
    const bounds = L.latLngBounds(
      [selectedFrom.lat, selectedFrom.lon],
      [selectedTo.lat, selectedTo.lon]
    );
    map.fitBounds(bounds, { padding: [50, 50] });
  }
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

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
  // Load custom airports first
  loadCustomAirports();
  
  initializeDarkMode();
  initializeMap();

  setupAutocomplete('from-input', 'from-suggestions', (airport) => {
    selectedFrom = airport;
    updateFlightPath();
  });

  setupAutocomplete('to-input', 'to-suggestions', (airport) => {
    selectedTo = airport;
    updateFlightPath();
  });
});

document.getElementById("calculate-btn").addEventListener("click", () => {
  if (!selectedFrom || !selectedTo) {
    document.getElementById("results").innerHTML = "<p class='text-red-500 dark:text-red-400'>Please select both airports.</p>";
    return;
  }

  const speed = parseFloat(document.getElementById("speed-input").value);
  const extra = parseFloat(document.getElementById("extra-minutes").value);

  const distance = haversine(selectedFrom.lat, selectedFrom.lon, selectedTo.lat, selectedTo.lon);
  const nm = distance / 1.852;
  const time = (nm / speed * 60) + extra;
  const hours = Math.floor(time / 60);
  const minutes = Math.round(time % 60);

  document.getElementById("results").innerHTML = `
    <div class="space-y-2">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">From</p>
          <p class="font-semibold">${selectedFrom.name}</p>
          <p class="text-sm">${selectedFrom.code} - ${selectedFrom.icao}</p>
        </div>
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">To</p>
          <p class="font-semibold">${selectedTo.name}</p>
          <p class="text-sm">${selectedTo.code} - ${selectedTo.icao}</p>
        </div>
      </div>
      <div class="border-t dark:border-gray-600 my-4"></div>
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
});
