'use client'

import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, Tooltip, Popup } from 'react-leaflet'
import L from 'leaflet'

export type CentroMapa = {
  id:       string
  slug:     string
  name:     string
  city:     string
  lat:      number
  lng:      number
  urgentes: string[]
}

const PIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32"><path d="M12 0C5.4 0 0 5.4 0 12c0 8 12 20 12 20S24 20 24 12C24 5.4 18.6 0 12 0z" fill="#af101a"/><circle cx="12" cy="11" r="4" fill="#fff"/></svg>`

const markerIcon = L.divIcon({
  html:            PIN_SVG,
  className:       '',
  iconSize:        [24, 32],
  iconAnchor:      [12, 32],
  popupAnchor:     [0, -34],
  tooltipAnchor:   [14, -16],
})

type Props = {
  centros: CentroMapa[]
}

export default function Mapa({ centros }: Props) {
  return (
    <MapContainer
      center={[4.65, -74.08]}
      zoom={11}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {centros.map(c => (
        <Marker key={c.id} position={[c.lat, c.lng]} icon={markerIcon}>
          {/* Hover tooltip — visible on desktop */}
          <Tooltip direction="right" offset={[4, -16]}>
            <strong>{c.name}</strong>
            {c.urgentes.length > 0 && (
              <div style={{ color: '#af101a', fontSize: '12px', marginTop: '2px' }}>
                Urgente: {c.urgentes.slice(0, 3).join(', ')}
              </div>
            )}
          </Tooltip>
          {/* Tap popup — visible on mobile */}
          <Popup>
            <div style={{ minWidth: '160px' }}>
              <strong style={{ display: 'block', marginBottom: '4px' }}>{c.name}</strong>
              <span style={{ color: '#5b403d', fontSize: '12px' }}>{c.city}</span>
              {c.urgentes.length > 0 && (
                <div style={{ color: '#af101a', fontSize: '12px', marginTop: '4px' }}>
                  Urgente: {c.urgentes.slice(0, 3).join(', ')}
                </div>
              )}
              <a
                href={`/c/${c.slug}`}
                style={{
                  display: 'block',
                  marginTop: '8px',
                  color: '#af101a',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                Ver detalles →
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
