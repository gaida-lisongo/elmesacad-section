"use client";

import { useMemo } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from "react-leaflet";
import type { PresenceRowView } from "@/actions/titulairePresences";
import "leaflet/dist/leaflet.css";

export type PresenceMapMarker = {
  id: string;
  lat: number;
  lng: number;
  matricule: string;
  status: PresenceRowView["status"];
  statusLabel: string;
};

type Props = {
  markers: PresenceMapMarker[];
  statusOptions: Array<{ value: PresenceRowView["status"]; label: string }>;
  onStatusChange: (id: string, status: PresenceRowView["status"]) => void;
};

/**
 * Carte OSM : pastille + étiquette (matricule, statut). Clic → popup pour changer le statut.
 */
export default function PresenceLocationsMap({ markers, statusOptions, onStatusChange }: Props) {
  const mode = useMemo(() => {
    if (markers.length === 0) return null;
    if (markers.length === 1) {
      const m = markers[0];
      return { type: "center" as const, center: [m.lat, m.lng] as [number, number], zoom: 14 };
    }
    const b = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]));
    return { type: "bounds" as const, bounds: b };
  }, [markers]);

  if (!mode) return null;

  const pathOptions = {
    color: "#ffffff",
    weight: 2,
    fillColor: "#082b1c",
    fillOpacity: 0.92,
  };

  const markersLayer = (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((m) => (
        <CircleMarker
          key={m.id}
          center={[m.lat, m.lng]}
          radius={10}
          pathOptions={pathOptions}
        >
          <Tooltip
            permanent
            direction="top"
            offset={[0, -10]}
            opacity={1}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[10px] shadow-sm"
          >
            <div className="max-w-[9rem] text-center font-mono leading-tight text-gray-900">
              <div className="font-semibold">{m.matricule}</div>
              <div className="text-gray-600">{m.statusLabel}</div>
            </div>
          </Tooltip>
          <Popup>
            <div className="min-w-[10rem] space-y-2 text-gray-900">
              <p className="font-mono text-xs font-semibold">{m.matricule}</p>
              <div>
                <label className="mb-0.5 block text-[10px] font-medium text-gray-600">Statut</label>
                <select
                  value={m.status}
                  onChange={(e) =>
                    onStatusChange(m.id, e.target.value as PresenceRowView["status"])
                  }
                  className="w-full rounded border border-gray-300 bg-white px-1.5 py-1 text-xs"
                >
                  {statusOptions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-gray-500">Pensez à enregistrer en bas de page.</p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );

  return (
    <div className="presence-map h-[min(380px,55vh)] w-full min-h-[260px] overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      {mode.type === "bounds" ? (
        <MapContainer
          bounds={mode.bounds}
          boundsOptions={{ padding: [36, 36], maxZoom: 16 }}
          style={{ height: "100%", width: "100%", minHeight: 260 }}
          scrollWheelZoom={false}
          className="z-0"
        >
          {markersLayer}
        </MapContainer>
      ) : (
        <MapContainer
          center={mode.center}
          zoom={mode.zoom}
          style={{ height: "100%", width: "100%", minHeight: 260 }}
          scrollWheelZoom={false}
          className="z-0"
        >
          {markersLayer}
        </MapContainer>
      )}
    </div>
  );
}
