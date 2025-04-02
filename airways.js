import openAIPClient from './openaip.js';

// Cache for airways data
let airwaysCache = new Map();

// Find airways between two points
async function findConnectingAirways(fromCode, toCode, fromPoint, toPoint) {
  // Create cache key
  const cacheKey = `${fromCode}-${toCode}`;
  
  // Check cache first
  if (airwaysCache.has(cacheKey)) {
    return airwaysCache.get(cacheKey);
  }

  try {
    // Get airways from OpenAIP
    const airways = await openAIPClient.getAirways(fromPoint, toPoint);
    
    // Cache the results
    airwaysCache.set(cacheKey, airways);
    return airways;
  } catch (error) {
    console.error('Error finding airways:', error);
    return [];
  }
}

// Calculate total distance of a route using waypoints
function calculateRouteDistance(waypoints) {
  let totalDistance = 0;
  
  for (let i = 0; i < waypoints.length - 1; i++) {
    const wp1 = waypoints[i];
    const wp2 = waypoints[i + 1];
    totalDistance += calculateDistance(wp1, wp2);
  }
  
  return totalDistance;
}

// Calculate distance between two points
function calculateDistance(point1, point2) {
  const R = 6371; // Earth's radius in km
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLon = (point2.lon - point1.lon) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Find the best route between two airports
async function findBestRoute(fromAirport, toAirport) {
  const airways = await findConnectingAirways(
    fromAirport.code,
    toAirport.code,
    { lat: fromAirport.lat, lon: fromAirport.lon },
    { lat: toAirport.lat, lon: toAirport.lon }
  );

  if (airways.length === 0) {
    return null;
  }

  // Find the airway with the shortest total distance
  let bestRoute = null;
  let shortestDistance = Infinity;

  for (const airway of airways) {
    const distance = calculateRouteDistance(airway.waypoints);
    if (distance < shortestDistance) {
      shortestDistance = distance;
      bestRoute = airway;
    }
  }

  return bestRoute ? {
    name: bestRoute.name,
    airwayId: bestRoute.id,
    waypoints: bestRoute.waypoints
  } : null;
}

export { findBestRoute, calculateRouteDistance };
