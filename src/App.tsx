import { useEffect, useRef, useState } from 'react'

import reactLogo from './assets/react.svg'
import './App.css'

import { MapManager, type MapMarker } from "@arenarium/maps";
import { MaplibreProvider, MaplibreLightStyle } from "@arenarium/maps/maplibre";
import "@arenarium/maps/dist/style.css";

import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

function Pin() {
  return (
    <div style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: 'blue' }}></div>
  )
}

function Tooltip({ id }: { id: string }) {
  return (
    <div style={{ width: 96, height: 64, borderRadius: 12, backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 'bold' }}>
      {id}
    </div>
  )
}

function Popup({ id }: { id: string }) {
  return (
    <div style={{ width: 156, height: 128, borderRadius: 16, backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 'bold' }}>
      <a href="https://react.dev" target="_blank">
        <img src={reactLogo} className="logo react" alt="React logo" />
      </a>
      <div>
        {id}
      </div>
    </div>
  )
}

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapManager = useRef<MapManager>(null);
  const map = useRef<maplibregl.Map>(null);

  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);

  const markerRefs = useRef<MapMarker[]>([]);
  const pinRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tooltipRefs = useRef<(HTMLDivElement | null)[]>([]);
  const popupRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (map.current) return; // initialize map only once
    if (mapContainer.current == null) return;

    const mapProvider = new MaplibreProvider(maplibregl.Map, maplibregl.Marker, {
      container: mapContainer.current,
      style: MaplibreLightStyle,
      center: { lat: 51.505, lng: -0.09 },
      zoom: 8,
    });

    mapManager.current = new MapManager(import.meta.env.VITE_API_KEY, mapProvider);
    map.current = mapProvider.getMap();
    map.current.on("click", onMapClick);
  }, []);

  useEffect(() => {
    if (!mapMarkers.length) return;
    console.log("Updating markers", mapMarkers);
    mapManager.current?.updateMarkers(mapMarkers);
  }, [mapMarkers]);

  const onUpdate = async () => {
    if (!map.current) return;
    const bounds = map.current.getBounds();
    const markers = new Array<MapMarker>();

    const centers = [
      { lat: 51.505, lng: -0.09 },
      { lat: 45, lng: 22 },
      { lat: 52.52, lng: 13.409 },
      { lat: 48.8566, lng: 2.3522 },
    ];
    const radius = 10;
    const count = 64;
    const limit = 64;

    let randomPrev = 1;
    const random = () => {
      const val = (randomPrev * 16807) % 2147483647;
      randomPrev = val;
      return val / 2147483647;
    };

    let cnt = 0;

    for (let i = 0; i < count; i++) {
      const index = Math.floor(random() * count);
      const distance = radius / (count - index);
      const center = centers[index % centers.length];

      const lat = center.lat + distance * (-1 + random() * 2);
      const lng = center.lng + distance * (-1 + random() * 2);
      if (lat < bounds._sw.lat || bounds._ne.lat < lat || lng < bounds._sw.lng || bounds._ne.lng < lng) continue;
      if (cnt++ >= limit) break;

      markers.push({
        id: i.toString(),
        rank: i,
        lat: lat,
        lng: lng,
        tooltip: {
          style: {
            height: 64,
            width: 96,
            margin: 8,
            radius: 12,
          },
          body: getTooltipBody,
        },
        pin: {
          style: {
            height: 16,
            width: 16,
            radius: 8,
          },
          body: getPinBody,
        },
        popup: {
          style: {
            height: 128,
            width: 156,
            margin: 8,
            radius: 16,
          },
          body: getPopupBody,
        },
      });
    }

    pinRefs.current = new Array(markers.length).fill(null);
    tooltipRefs.current = new Array(markers.length).fill(null);
    popupRefs.current = new Array(markers.length).fill(null);
    markerRefs.current = markers;

    setMapMarkers(markers);
  };

  const onRemove = () => {
    if (!mapManager.current) return;
    mapManager.current.removeMarkers();
  };

  const onMapClick = () => {
    if (!mapManager.current) return;
    mapManager.current.hidePopup();
  };

  const getPinBody = async (id: string) => {
    const index = markerRefs.current.findIndex(m => m.id === id);
    const element = pinRefs.current[index];
    if (!element) throw new Error("Pin element not found");
    return element;
  };

  const getTooltipBody = async (id: string) => {
    const index = markerRefs.current.findIndex(m => m.id === id);
    const element = tooltipRefs.current[index];
    if (!element) throw new Error("Tooltip element not found");
    element.addEventListener("click", (e) => onTooltipClick(e, id));
    return element;
  };

  const getPopupBody = async (id: string) => {
    const index = markerRefs.current.findIndex(m => m.id === id);
    const element = popupRefs.current[index];
    if (!element) throw new Error("Popup element not found");
    return element;
  };

  const onTooltipClick = (event: Event, id: string) => {
    console.log("Tooltip clicked", id);
    event.stopPropagation();
    mapManager.current?.showPopup(id);
  }

  return (
    <>
      <div className='map' ref={mapContainer}></div>
      {mapMarkers.map((marker, index) => (
        <div key={marker.id}>
          <div ref={(el) => { pinRefs.current[index] = el }}>
            <Pin key={marker.id} />
          </div>
          <div ref={(el) => { tooltipRefs.current[index] = el }}>
            <Tooltip key={marker.id} id={marker.id} />
          </div>
          <div ref={(el) => { popupRefs.current[index] = el }}>
            <Popup key={marker.id} id={marker.id} />
          </div>
        </div>
      ))}
      <div className='buttons'>
        <button className="button" onClick={onUpdate}> Update Markers </button>
        <button className="button" onClick={onRemove}> Remove Markers </button>
      </div>
    </>
  )
}

export default App
