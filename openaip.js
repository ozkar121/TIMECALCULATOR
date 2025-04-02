class OpenAIPClient {
    constructor() {
        this.baseUrl = 'https://api.openaip.net/api/v1';
        this.apiKey = '5516225dce93df6452489774ee5a3bd3';
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
            const response = await fetch(`${this.baseUrl}/navaids/search?bbox=${west},${south},${east},${north}`, {
                headers: {
                    'X-API-Key': this.apiKey,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`OpenAIP API error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            this.cache.set(cacheKey, data.features || []);
            return data.features || [];
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

        try {
            // Get all navaids in the bounding box
            const navaids = await this.getNavaidsInBox(bounds);
            console.log('Fetched navaids:', navaids);
            
            // Process navaids to find potential airways
            return this.processNavaidsIntoAirways(navaids, fromPoint, toPoint);
        } catch (error) {
            console.error('Error getting airways:', error);
            return [];
        }
    }

    // Process navaids into airways
    processNavaidsIntoAirways(navaids, fromPoint, toPoint) {
        // Group navaids by airway identifier
        const airwayGroups = new Map();
        
        navaids.forEach(navaid => {
            const props = navaid.properties;
            if (props.airways && Array.isArray(props.airways)) {
                props.airways.forEach(airway => {
                    if (!airwayGroups.has(airway)) {
                        airwayGroups.set(airway, []);
                    }
                    airwayGroups.get(airway).push({
                        name: props.name || props.ident,
                        lat: navaid.geometry.coordinates[1],
                        lon: navaid.geometry.coordinates[0],
                        type: props.type
                    });
                });
            }
        });

        console.log('Airway groups:', airwayGroups);

        // Convert groups into our airway format
        const airways = [];
        for (const [identifier, waypoints] of airwayGroups) {
            // Only include airways with at least 2 waypoints
            if (waypoints.length >= 2) {
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
