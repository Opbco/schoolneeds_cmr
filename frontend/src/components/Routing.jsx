import { useEffect } from "react";
import L from "leaflet";
import "leaflet-routing-machine";
import { useMap } from "react-leaflet";

const Routing = ({ start, end }) => {
  const map = useMap(); // ✅ get the map instance from context

  useEffect(() => {
    if (!map) return;

    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(start.lat, start.lng),
        L.latLng(end.lat, end.lng)
      ],
      routeWhileDragging: true,
    }).addTo(map);

    return () => map.removeControl(routingControl); // cleanup
  }, [map, start, end]);

  return null;
};

export default Routing;