import { useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

// world-atlas v2 countries-50m (Natural Earth 1:50m), served from our own origin
// (client/public/countries-50m.json) instead of a runtime CDN fetch — the map loads
// reliably, quickly and browser-cached, with no external dependency.
const geoUrl = `${import.meta.env.BASE_URL}countries-50m.json`;

// DB country spellings -> the exact world-atlas (Natural Earth) "name", so colors
// land on the right country. Keys are the trimmed, UPPERCASED database value; only
// TRUE variants need an entry (pure casing differences are handled by the
// case-insensitive match below). Multiple variants of one country SUM in the map.
const COUNTRY_CANONICAL = {
    'USA': 'United States of America',
    'US': 'United States of America',
    'U.S.': 'United States of America',
    'U.S.A.': 'United States of America',
    'UNITED STATES': 'United States of America',
    'UK': 'United Kingdom',
    'U.K.': 'United Kingdom',
    'ENGLAND': 'United Kingdom',
    'BRITAIN': 'United Kingdom',
    'GREAT BRITAIN': 'United Kingdom',
    'CROTIA': 'Croatia',
    'SRILANKA': 'Sri Lanka',
    'MALAYASIA': 'Malaysia',
    'NEWZEALAND': 'New Zealand',
    'CZECH REPUBLIC': 'Czechia',
    'CZECH': 'Czechia',
    'UAE': 'United Arab Emirates',
    'U.A.E.': 'United Arab Emirates',
    'UZBEKISTHAN': 'Uzbekistan',
    'KAZAKISTHAN': 'Kazakhstan',
    'KRYGYSTHAN': 'Kyrgyzstan',
    'LATUNIA': 'Latvia'
};

// Reduce the distribution to { UPPER_TOPONAME: { value, displayName } }, resolving
// each DB country to its map country and summing rows that resolve to the same one
// (e.g. 'USA' + 'United States' + 'United States of America' -> one United States).
const buildCountryData = (countryDistribution) => {
    const byUpper = {};
    let maxValue = 0;
    (countryDistribution || []).forEach(({ name, value }) => {
        const raw = (name || '').trim();
        if (!raw) return;
        const topoName = COUNTRY_CANONICAL[raw.toUpperCase()] || raw;
        const key = topoName.toUpperCase();
        const entry = byUpper[key] || (byUpper[key] = { value: 0, displayName: topoName });
        entry.value += value;
        if (entry.value > maxValue) maxValue = entry.value;
    });
    return { byUpper, maxValue };
};

const WorldMap = ({ data }) => {
    const [hoveredCountry, setHoveredCountry] = useState(null);
    const [position, setPosition] = useState({ coordinates: [0, 0], zoom: 1 });

    const { byUpper, maxValue } = useMemo(
        () => buildCountryData(data?.countryDistribution),
        [data?.countryDistribution]
    );

    // Color bands over the value range (base colour for countries with no records).
    const getCountryColor = (countryName) => {
        const entry = byUpper[countryName.toUpperCase()];
        if (!entry) return 'oklch(var(--b3))';

        const intensity = entry.value / (maxValue || 1);
        if (intensity > 0.7) return 'oklch(var(--p))'; // Dark primary (highest)
        if (intensity > 0.4) return 'oklch(var(--s))'; // Secondary
        if (intensity > 0.2) return 'oklch(var(--a))'; // Accent
        return 'oklch(var(--in))'; // Info (lightest)
    };

    const handleCountryClick = (geo) => {
        const value = byUpper[geo.properties.name.toUpperCase()]?.value;
        if (value) {
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
                            {byUpper[hoveredCountry.toUpperCase()]?.value || 0} records
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
                                        const hasData = countryName.toUpperCase() in byUpper;

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
