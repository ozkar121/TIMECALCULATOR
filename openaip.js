class OpenAIPClient {
    constructor() {
        this.baseUrl = 'https://api.openaip.net/api/v1';
        this.apiKey = '5516225dce93df6452489774ee5a3bd3';
        this.cache = new Map();
    }

    async getAirways(fromPoint, toPoint) {
        // Calculate a bounding box that includes both points with some margin
        const margin = 2; // degrees
        const bounds = {
            north: Math.max(fromPoint.lat, toPoint.lat) + margin,
            south: Math.min(fromPoint.lat, toPoint.lat) - margin,
            east: Math.max(fromPoint.lon, toPoint.lon) + margin,
            west: Math.min(fromPoint.lon, toPoint.lon) - margin
        };

        // Create cache key for this request
        const cacheKey = `airways-${bounds.north}-${bounds.south}-${bounds.east}-${bounds.west}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // Fetch navaids in the bounding box
            const response = await fetch(`${this.baseUrl}/navaids/search?bbox=${bounds.west},${bounds.south},${bounds.east},${bounds.north}`, {
                headers: {
                    'X-API-Key': this.apiKey,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`OpenAIP API error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            const navaids = data.features || [];

            // Process navaids into waypoints
            const waypoints = navaids.map(navaid => ({
                lat: navaid.geometry.coordinates[1],
                lon: navaid.geometry.coordinates[0],
                name: navaid.properties.name || navaid.properties.ident,
                type: navaid.properties.type,
                ident: navaid.properties.ident
            }));

            // Sort waypoints by distance from start to end
            const sortedWaypoints = this.sortWaypointsByRoute(waypoints, fromPoint, toPoint);
            
            // Cache the result
            this.cache.set(cacheKey, sortedWaypoints);
            
            return sortedWaypoints;
        } catch (error) {
            console.error('Error fetching airways:', error);
            return [];
        }
    }

    sortWaypointsByRoute(waypoints, fromPoint, toPoint) {
        // Filter waypoints that are roughly along the route
        const directDistance = this.calculateDistance(fromPoint, toPoint);
        const maxDeviation = directDistance * 0.3; // Allow 30% deviation from direct route

        const filteredWaypoints = waypoints.filter(wp => {
            const distanceViaPoint = 
                this.calculateDistance(fromPoint, wp) +
                this.calculateDistance(wp, toPoint);
            return distanceViaPoint <= directDistance + maxDeviation;
        });

        // Sort waypoints by their total path distance
        return filteredWaypoints.sort((a, b) => {
            const distanceViaA = 
                this.calculateDistance(fromPoint, a) +
                this.calculateDistance(a, toPoint);
            const distanceViaB = 
                this.calculateDistance(fromPoint, b) +
                this.calculateDistance(b, toPoint);
            return distanceViaA - distanceViaB;
        });
    }

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
