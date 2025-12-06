import React, { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  LayersControl,
  Marker,
  Popup,
  Polyline,
  Circle,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Routing from "./Routing";
import { calculateDistance } from "../utils/distance";

const { BaseLayer, Overlay } = LayersControl;

// SVG MARKER GENERATOR
// This creates lightweight, colorful icons without needing external image files
const createSvgIcon = (color) => {
  return L.divIcon({
    className: "custom-svg-marker",
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="36px" height="36px" stroke="white" stroke-width="1.5" style="filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.4));">
             <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
           </svg>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

const Icons = {
  ANCHOR: createSvgIcon("#16a34a"), // Green
  TARGET: createSvgIcon("#dc2626"), // Red
  IN_RADIUS: createSvgIcon("#eab308"), // Gold/Yellow
  DEFAULT: createSvgIcon("#3b82f6"), // Blue
};

const RecenterMap = ({ schools }) => {
  const map = useMap();
  useEffect(() => {
    if (schools && schools.length > 0) {
      const bounds = L.latLngBounds(
        schools.map((s) => [s.latitude, s.longitude])
      );
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [schools, map]);
  return null;
};

const SchoolMap = ({
  schools,
  isMeasuring,
  anchorSchool,
  targetSchool,
  radius,
  onSchoolClick,
  distance,
}) => {
  const defaultCenter = [4.0511, 9.7679];

  // 1. FILTER VALID SCHOOLS
  const validSchools = useMemo(() => {
    return schools.filter((s) => s.latitude != null && s.longitude != null);
  }, [schools]);

  // 2. OPTIMIZED RADIUS CALCULATION
  // We identify which schools are inside the radius immediately.
  // Using a Set for O(1) lookups during render.
  const schoolsInRadiusIds = useMemo(() => {
    if (!isMeasuring || !anchorSchool || !radius) return new Set();

    const ids = new Set();
    validSchools.forEach((school) => {
      // Don't calculate for the anchor itself
      if (school.id === anchorSchool.id) return;

      const dist = calculateDistance(
        anchorSchool.latitude,
        anchorSchool.longitude,
        school.latitude,
        school.longitude
      );

      if (dist <= radius) {
        ids.add(school.id);
      }
    });
    return ids;
  }, [validSchools, anchorSchool, radius, isMeasuring]);

  return (
    <div className="h-[800px] w-full relative rounded-lg overflow-hidden shadow-lg border border-gray-200">
      <MapContainer center={defaultCenter} zoom={6} className="h-full w-full">
        <LayersControl position="topright">
          {/* Base Layers */}
          <BaseLayer checked name="Road Map">
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </BaseLayer>

          <BaseLayer name="Satellite">
            <TileLayer
              attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </BaseLayer>

          <BaseLayer name="Terrain">
            <TileLayer
              attribution="Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap"
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            />
          </BaseLayer>

          <RecenterMap schools={validSchools} />

          {/* RADIUS CIRCLE (Only when Anchor is set) */}
          {isMeasuring && anchorSchool && (
            <Circle
              center={[anchorSchool.latitude, anchorSchool.longitude]}
              radius={radius * 1000} // Leaflet uses meters, our input is km
              pathOptions={{
                color: "#eab308",
                fillColor: "#eab308",
                fillOpacity: 0.15,
                dashArray: "5, 10",
              }}
            />
          )}

          {/* POLYLINE (Anchor to Target) */}
          {isMeasuring && anchorSchool && targetSchool && (
            <Polyline
              positions={[
                [anchorSchool.latitude, anchorSchool.longitude],
                [targetSchool.latitude, targetSchool.longitude],
              ]}
              color="#dc2626"
              weight={3}
              dashArray="10, 10"
            />
          )}

          {/* ROAD (Anchor to Target) */}
          {isMeasuring && anchorSchool && targetSchool && (
            <Routing
              start={{
                lat: anchorSchool.latitude,
                lng: anchorSchool.longitude,
              }}
              end={{ lat: targetSchool.latitude, lng: targetSchool.longitude }}
            />
          )}

          {validSchools.map((school) => {
            const isAnchor = anchorSchool?.id === school.id;
            const isTarget = targetSchool?.id === school.id;
            const isInRadius = schoolsInRadiusIds.has(school.id);

            // Determine Icon Color
            let icon = Icons.DEFAULT;
            if (isMeasuring) {
              if (isAnchor) icon = Icons.ANCHOR;
              else if (isTarget) icon = Icons.TARGET;
              else if (isInRadius) icon = Icons.IN_RADIUS;
            }

            // Optimization: If measuring, dim irrelevant markers
            const opacity =
              isMeasuring && !isAnchor && !isTarget && !isInRadius ? 0.4 : 1.0;

            return (
              <Marker
                key={school.id}
                position={[school.latitude, school.longitude]}
                icon={icon}
                opacity={opacity}
                eventHandlers={{
                  click: () => onSchoolClick(school),
                }}
              >
                <Popup>
                  <div className="p-1 text-center">
                    <h3 className="font-bold text-gray-900 mb-1">
                      {school.name}
                    </h3>
                    <div className="text-xs text-gray-500 mb-2">
                      {school.region} - {school.division}
                    </div>

                    {isMeasuring ? (
                      <div className="font-bold text-sm">
                        {isAnchor && (
                          <span className="text-green-600">
                            ⚓ ANCHOR POINT
                          </span>
                        )}
                        {isTarget && (
                          <span className="text-red-600">
                            🎯 {distance} km from Anchor
                          </span>
                        )}
                        {isInRadius && !isTarget && (
                          <span className="text-yellow-600">
                            Within {radius}km Radius
                          </span>
                        )}
                      </div>
                    ) : (
                      <a
                        href={`/school/${school.id}`}
                        className="text-blue-600 hover:underline text-sm block font-semibold"
                      >
                        View Details & Needs Report →
                      </a>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </LayersControl>
      </MapContainer>

      {/* FLOATING INFO BOX */}
      {isMeasuring && (
        <div className="absolute top-40 left-4 z-[1000] bg-white p-4 shadow-xl rounded-lg border-l-4 border-blue-500 min-w-[300px]">
          <h4 className="font-bold text-gray-800 mb-2 flex items-center">
            <span className="text-xl mr-2">📏</span> Distance & Radius
          </h4>

          <div className="space-y-3">
            <div
              className={`p-2 rounded ${
                anchorSchool
                  ? "bg-green-50 border border-green-200"
                  : "bg-gray-100"
              }`}
            >
              <span className="text-xs font-bold text-gray-500 uppercase block">
                Start Point (Anchor)
              </span>
              <div className="font-semibold text-gray-800">
                {anchorSchool ? anchorSchool.name : "Select a school on map..."}
              </div>
            </div>

            {anchorSchool && (
              <div className="bg-yellow-50 border border-yellow-200 p-2 rounded">
                <span className="text-xs font-bold text-yellow-700 uppercase block">
                  Nearby Schools
                </span>
                <div className="font-semibold text-gray-800">
                  {schoolsInRadiusIds.size} schools found within {radius}km
                </div>
              </div>
            )}

            {targetSchool && (
              <div
                className={`p-2 rounded ${
                  targetSchool
                    ? "bg-red-50 border border-red-200"
                    : "bg-gray-100"
                }`}
              >
                <span className="text-xs font-bold text-gray-500 uppercase block">
                  End Point (Target)
                </span>
                <div className="font-semibold text-gray-800">
                  {targetSchool.name}
                </div>
              </div>
            )}

            {distance !== null && (
              <div className="text-center py-2 border-t mt-2">
                <span className="text-xs font-bold text-gray-400 block mb-1">
                  DISTANCE TO TARGET
                </span>
                <span className="text-3xl font-bold text-red-600">
                  {distance}
                </span>
                <span className="text-gray-600 ml-1">km</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolMap;
