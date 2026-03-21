/**
 * @fileoverview Choropleth map of the 7-state Intermountain Healthcare service area.
 * States are shaded by total request volume. City dots represent individual request
 * locations with size scaled to request count.
 */

import { useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps';

/** TopoJSON source — US states from the public us-atlas CDN */
const GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

/**
 * FIPS codes for the 7 IHC service-area states.
 * Keyed by FIPS → state abbreviation for label lookup.
 */
const SERVICE_STATES = {
  '49': 'UT',
  '16': 'ID',
  '32': 'NV',
  '08': 'CO',
  '30': 'MT',
  '56': 'WY',
  '20': 'KS',
};

const SERVICE_STATE_SET = new Set(Object.keys(SERVICE_STATES));

/** Approximate center coordinates [lng, lat] for state abbreviation labels */
const STATE_LABEL_COORDS = {
  UT: [-111.5, 39.5],
  ID: [-114.5, 44.5],
  NV: [-116.8, 39.0],
  CO: [-105.5, 39.0],
  MT: [-109.6, 46.8],
  WY: [-107.5, 43.0],
  KS: [-98.4, 38.5],
};

/** Brand colors */
const BRAND = {
  none:    '#f0f1fe',   // periwinkle-50
  low:     '#c5caf9',   // periwinkle-200
  medium:  '#8b95f4',   // periwinkle-400
  high:    '#6B2FD9',   // brand-purple
  outside: '#e5e7eb',   // gray-200
  border:  '#ffffff',
  navy:    '#1A1A4E',
};

/** Map total request count for a state to a fill color */
function stateFill(count) {
  if (count === 0) return BRAND.none;
  if (count <= 10)  return BRAND.low;
  if (count <= 30)  return BRAND.medium;
  return BRAND.high;
}

/** Map a city's total requests to a dot radius (px) */
function dotRadius(total) {
  if (total <= 2)  return 4;
  if (total <= 7)  return 6;
  if (total <= 15) return 8;
  return 10;
}

/** Map a city flag to a dot fill color */
function dotColor(flag) {
  if (flag === 'high_demand') return '#F5C518';  // brand-yellow
  if (flag === 'underserved') return '#A8B4F8';   // brand-periwinkle-400
  return '#6B2FD9';                               // brand-purple
}

/**
 * Choropleth map of the 7 IHC service-area states with city request dots.
 *
 * @param {{ cityData: Array }} props
 * @param {Array}  props.cityData - rows from mockGeoData.summary with lat/lng
 * @returns {JSX.Element}
 */
export default function ChoroplethMap({ cityData = [] }) {
  const [tooltip, setTooltip] = useState(null); // { x, y, content }

  // Aggregate total requests per state for choropleth shading
  const stateTotals = {};
  cityData.forEach((row) => {
    if (!stateTotals[row.state]) stateTotals[row.state] = 0;
    stateTotals[row.state] += row.totalRequestCount;
  });

  // Only include cities in the 7 service-area states for dots
  const serviceCities = cityData.filter((r) =>
    Object.values(SERVICE_STATES).includes(r.state) && r.lat && r.lng
  );

  return (
    <div className="relative select-none">
      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 bg-brand-navy-500 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-[180px]"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          {tooltip.content}
        </div>
      )}

      <ComposableMap
        projection="geoAlbersUsa"
        projectionConfig={{ scale: 900, center: [-96, 38] }}
        style={{ width: '100%', height: 'auto' }}
        viewBox="0 0 800 500"
      >
        <ZoomableGroup zoom={1}>
          {/* State fills */}
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const isService = SERVICE_STATE_SET.has(geo.id);
                const abbr = SERVICE_STATES[geo.id];
                const count = abbr ? (stateTotals[abbr] ?? 0) : 0;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={isService ? stateFill(count) : BRAND.outside}
                    stroke={BRAND.border}
                    strokeWidth={0.8}
                    style={{
                      default: { outline: 'none', opacity: isService ? 1 : 0.35 },
                      hover: { outline: 'none', opacity: isService ? 0.85 : 0.35 },
                      pressed: { outline: 'none' },
                    }}
                    onMouseEnter={(e) => {
                      if (!isService) return;
                      setTooltip({
                        x: e.nativeEvent.offsetX,
                        y: e.nativeEvent.offsetY,
                        content: `${abbr} — ${count} total requests`,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })
            }
          </Geographies>

          {/* State abbreviation labels */}
          {Object.entries(STATE_LABEL_COORDS).map(([abbr, [lng, lat]]) => (
            <Marker key={`label-${abbr}`} coordinates={[lng, lat]}>
              <text
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  fill: BRAND.navy,
                  fontFamily: 'system-ui, sans-serif',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                {abbr}
              </text>
            </Marker>
          ))}

          {/* City dots */}
          {serviceCities.map((city) => (
            <Marker
              key={city.zip}
              coordinates={[city.lng, city.lat]}
              onMouseEnter={(e) => {
                setTooltip({
                  x: e.nativeEvent.offsetX,
                  y: e.nativeEvent.offsetY,
                  content: `${city.city}, ${city.state}\n${city.totalRequestCount} total · ${city.requestCount30d} (30d)${city.flag ? `\n⚑ ${city.flag.replace('_', ' ')}` : ''}`,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Outer ring for flagged cities */}
              {city.flag && (
                <circle
                  r={dotRadius(city.totalRequestCount) + 3}
                  fill="none"
                  stroke={dotColor(city.flag)}
                  strokeWidth={1.5}
                  opacity={0.6}
                />
              )}
              <circle
                r={dotRadius(city.totalRequestCount)}
                fill={dotColor(city.flag)}
                stroke="#fff"
                strokeWidth={1}
                style={{ cursor: 'pointer' }}
              />
            </Marker>
          ))}
        </ZoomableGroup>
      </ComposableMap>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 px-1">
        {/* State fill scale */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="font-medium text-gray-700 mr-1">State volume:</span>
          {[
            { bg: BRAND.none,   label: '0' },
            { bg: BRAND.low,    label: '1–10' },
            { bg: BRAND.medium, label: '11–30' },
            { bg: BRAND.high,   label: '31+' },
          ].map((item) => (
            <span key={item.label} className="flex items-center gap-1">
              <span
                className="inline-block w-4 h-4 rounded border border-gray-200"
                style={{ backgroundColor: item.bg }}
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </span>
          ))}
        </div>

        {/* Dot meaning */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="font-medium text-gray-700">City dots:</span>
          {[
            { color: '#6B2FD9', label: 'Normal' },
            { color: '#F5C518', label: 'High demand' },
            { color: '#A8B4F8', label: 'Underserved' },
          ].map((item) => (
            <span key={item.label} className="flex items-center gap-1">
              <span
                className="inline-block w-3 h-3 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </span>
          ))}
        </div>

        <span className="text-xs text-gray-400 italic ml-auto">Dot size = request volume</span>
      </div>
    </div>
  );
}
