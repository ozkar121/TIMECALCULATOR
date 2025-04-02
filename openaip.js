import config from './config.js';

class OpenAIPClient {
    constructor() {
        this.baseUrl = config.OPENAIP_BASE_URL;
        this.apiKey = config.OPENAIP_API_KEY;
        this.cache = new Map();
    }

    // Get navaids within a bounding box
    async getNavaidsInBox(bounds) {
        const { north, south, east, west } = bounds;
        const cacheKey = `navaids-${north}-${south}-${east}-${west}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const response = await fetch(`${this.baseUrl}/navaids?bounds=${west},${south},${east},${north}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`OpenAIP API error: ${response.statusText}`);
            }

            const data = await response.json();
            this.cache.set(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Error fetching navaids:', error);
            return [];
        }
    }

    // Get airways between two points
    async getAirways(fromPoint, toPoint) {
        // Calculate a bounding box that includes both points with some margin
        const margin = 2; // degrees
        const bounds = {
            north: Math.max(fromPoint.lat, toPoint.lat) + margin,
            south: Math.min(fromPoint.lat, toPoint.lat) - margin,
            east: Math.max(fromPoint.lon, toPoint.lon) + margin,
            west: Math.min(fromPoint.lon, toPoint.lon) - margin
        };

        // Get all navaids in the bounding box
        const navaids = await this.getNavaidsInBox(bounds);
        
        // Process navaids to find potential airways
        return this.processNavaidsIntoAirways(navaids, fromPoint, toPoint);
    }

    // Process navaids into airways
    processNavaidsIntoAirways(navaids, fromPoint, toPoint) {
        // Group navaids by airway identifier
        const airwayGroups = new Map();
        
        navaids.forEach(navaid => {
            if (navaid.airways) {
                navaid.airways.forEach(airway => {
                    if (!airwayGroups.has(airway.identifier)) {
                        airwayGroups.set(airway.identifier, []);
                    }
                    airwayGroups.get(airway.identifier).push({
                        name: navaid.identifier,
                        lat: navaid.latitude,
                        lon: navaid.longitude,
                        type: navaid.type
                    });
                });
            }
        });

        // Convert groups into our airway format
        const airways = [];
        for (const [identifier, waypoints] of airwayGroups) {
            // Sort waypoints by distance from start point
            waypoints.sort((a, b) => {
                const distA = this.calculateDistance(fromPoint, a);
                const distB = this.calculateDistance(fromPoint, b);
                return distA - distB;
            });

            airways.push({
                id: identifier,
                name: `Airway ${identifier}`,
                waypoints
            });
        }

        return airways;
    }

    // Calculate distance between two points (Haversine formula)
    calculateDistance(point1, point2) {
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
}

// Create and export a singleton instance
const openAIPClient = new OpenAIPClient();
export default openAIPClient;
