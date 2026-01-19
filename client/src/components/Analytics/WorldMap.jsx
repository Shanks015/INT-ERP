import { useState } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Country name normalization map (database name -> TopoJSON name)
const COUNTRY_NAME_MAP = {
    'USA': 'United States of America',
    'UK': 'United Kingdom',
    'HUNGARY': 'Hungary',
    'Hungary': 'Hungary',
    'UKRAINE': 'Ukraine',
    'Ukraine': 'Ukraine',
    'South KOREA': 'South Korea',
    'Crotia': 'Croatia',
    'Srilanka': 'Sri Lanka',
    'Malayasia': 'Malaysia',
    'Newzealand': 'New Zealand',
    'Russia': 'Russia',
    'Turkey': 'Turkey'
};

// Normalize country name for matching
const normalizeCountryName = (name) => {
    if (!name) return '';
    // Check direct mapping first
    if (COUNTRY_NAME_MAP[name]) return COUNTRY_NAME_MAP[name];
    // Return trimmed name
    return name.trim();
};

const WorldMap = ({ data }) => {
    const [tooltipContent, setTooltipContent] = useState('');
    const [hoveredCountry, setHoveredCountry] = useState(null);
    const [position, setPosition] = useState({ coordinates: [0, 0], zoom: 1 });

    // Create a map of country data by country name
    const countryDataMap = {};
    if (data.countryDistribution) {
        data.countryDistribution.forEach(item => {
            const normalizedName = normalizeCountryName(item.name);
            countryDataMap[normalizedName] = item.value;
        });
    }

    // Find max value for color scaling
    const maxValue = data.countryDistribution
        ? Math.max(...data.countryDistribution.map(d => d.value))
        : 1;

    // Get color based on value (heat map)
    const getCountryColor = (countryName) => {
        const value = countryDataMap[countryName];
        if (!value) return 'oklch(var(--b3))'; // Base color for countries with no data

        const intensity = value / maxValue;

        // Generate color from light to dark primary color
        if (intensity > 0.7) return 'oklch(var(--p))'; // Dark primary
        if (intensity > 0.4) return 'oklch(var(--s))'; // Secondary
        if (intensity > 0.2) return 'oklch(var(--a))'; // Accent
        return 'oklch(var(--in))'; // Info (lightest)
    };

    const handleCountryClick = (geo) => {
        const countryName = geo.properties.name;
        const value = countryDataMap[countryName];

        if (value) {
            console.log(`Clicked on ${countryName}: ${value} records`);
            // Future: Filter records by this country
        }
    };

    const handleZoomIn = () => {
        if (position.zoom >= 4) return;
        setPosition(pos => ({ ...pos, zoom: pos.zoom * 1.5 }));
    };

    const handleZoomOut = () => {
        if (position.zoom <= 1) return;
        setPosition(pos => ({ ...pos, zoom: pos.zoom / 1.5 }));
    };

    const handleReset = () => {
        setPosition({ coordinates: [0, 0], zoom: 1 });
    };

    const handleMoveEnd = (position) => {
        setPosition(position);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card bg-base-200 shadow-sm relative"
        >
            <div className="card-body">
                <h3 className="card-title text-lg">Interactive World Map</h3>
                <p className="text-sm text-base-content/70 mb-4">
                    Hover over countries to see statistics. Darker colors indicate more records.
                </p>

                {/* Tooltip */}
                {hoveredCountry && (
                    <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10 bg-base-100 px-4 py-2 rounded-lg shadow-lg border border-base-300">
                        <div className="text-sm font-semibold">{hoveredCountry}</div>
                        <div className="text-xs text-base-content/70">
                            {countryDataMap[hoveredCountry] || 0} records
                        </div>
                    </div>
                )}

                <div className="w-full h-[600px] border border-base-300 rounded-lg overflow-hidden bg-base-100 relative">
                    {/* Zoom Controls - Inside Map */}
                    <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
                        <button
                            onClick={handleZoomIn}
                            className="btn btn-sm btn-circle btn-primary"
                            title="Zoom In"
                            disabled={position.zoom >= 4}
                        >
                            <ZoomIn size={16} />
                        </button>
                        <button
                            onClick={handleZoomOut}
                            className="btn btn-sm btn-circle btn-primary"
                            title="Zoom Out"
                            disabled={position.zoom <= 1}
                        >
                            <ZoomOut size={16} />
                        </button>
                        <button
                            onClick={handleReset}
                            className="btn btn-sm btn-circle btn-ghost"
                            title="Reset View"
                        >
                            <Maximize2 size={16} />
                        </button>
                    </div>

                    <ComposableMap
                        projectionConfig={{
                            scale: 147
                        }}
                        style={{
                            width: '100%',
                            height: '100%'
                        }}
                    >
                        <ZoomableGroup
                            zoom={position.zoom}
                            center={position.coordinates}
                            onMoveEnd={handleMoveEnd}
                        >
                            <Geographies geography={geoUrl}>
                                {({ geographies }) => {
                                    return geographies.map((geo) => {
                                        const countryName = geo.properties.name;
                                        const hasData = countryDataMap[countryName];

                                        return (
                                            <Geography
                                                key={geo.rsmKey}
                                                geography={geo}
                                                onMouseEnter={() => {
                                                    setHoveredCountry(countryName);
                                                }}
                                                onMouseLeave={() => {
                                                    setHoveredCountry(null);
                                                }}
                                                onClick={() => handleCountryClick(geo)}
                                                style={{
                                                    default: {
                                                        fill: getCountryColor(countryName),
                                                        stroke: 'oklch(var(--bc) / 0.2)',
                                                        strokeWidth: 0.5,
                                                        outline: 'none',
                                                        transition: 'all 0.2s'
                                                    },
                                                    hover: {
                                                        fill: hasData ? 'oklch(var(--p))' : 'oklch(var(--b2))',
                                                        stroke: 'oklch(var(--bc) / 0.5)',
                                                        strokeWidth: 1,
                                                        outline: 'none',
                                                        cursor: hasData ? 'pointer' : 'default'
                                                    },
                                                    pressed: {
                                                        fill: 'oklch(var(--pf))',
                                                        outline: 'none'
                                                    }
                                                }}
                                            />
                                        );
                                    });
                                }}
                            </Geographies>
                        </ZoomableGroup>
                    </ComposableMap>
                </div>

                {/* Legend */}
                <div className="mt-4 flex items-center gap-4 text-xs">
                    <span className="text-base-content/70">Heat Map:</span>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'oklch(var(--in))' }}></div>
                        <span>Low</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'oklch(var(--a))' }}></div>
                        <span>Medium</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'oklch(var(--s))' }}></div>
                        <span>High</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'oklch(var(--p))' }}></div>
                        <span>Highest</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default WorldMap;
