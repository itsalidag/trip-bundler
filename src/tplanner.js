import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Polyline } from 'react-leaflet';
import { OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet/dist/leaflet.css';
import 'leaflet-geosearch/dist/geosearch.css';
import L from 'leaflet';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
});

const center = [41.9973, 21.4280]; // Skopje coordinates

const initialLocations = [
  { id: 1, name: "Location 1: Skopje", position: [41.9973, 21.4280], notes: ["Visit the Old Bazaar", "Explore Kale Fortress"], days: 2 },
  { id: 2, name: "Location 2: Matka Canyon", position: [41.9511, 21.2981], notes: ["Take a boat tour", "Hike the trails"], days: 1 },
  { id: 3, name: "Location 3: Ohrid", position: [41.1231, 20.8016], notes: ["Visit St. Naum Monastery", "Relax at Lake Ohrid"], days: 3 },
];

const provider = new OpenStreetMapProvider();

function MapEvents({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

function NumberedMarker({ position, number }) {
  const icon = L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: #3498db; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; justify-content: center; align-items: center; font-weight: bold; font-size: 14px;">${number}</div>`,
  });

  return <Marker position={position} icon={icon} />;
}

const TripPlanner = () => {
  const [locations, setLocations] = useState(initialLocations);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [route, setRoute] = useState([]);
  const mapRef = useRef(null);

  useEffect(() => {
    if (locations.length > 1) {
      fetchRoute();
    }
  }, [locations]);

  const fetchRoute = async () => {
    const waypoints = locations.map(loc => `${loc.position[1]},${loc.position[0]}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        setRoute(data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]));
      }
    } catch (error) {
      console.error("Error fetching route:", error);
    }
  };

  const onMapClick = (latlng) => {
    const newLocation = {
      id: Date.now(),
      name: `Location ${locations.length + 1}`,
      position: [latlng.lat, latlng.lng],
      notes: [],
      days: 1
    };
    setLocations(prev => [...prev, newLocation]);
    setSelectedLocation(newLocation);
  };

  const updateLocationName = (id, newName) => {
    setLocations(prev => prev.map(loc => 
      loc.id === id ? { ...loc, name: newName } : loc
    ));
  };

  const updateLocationNotes = (id, newNotes) => {
    setLocations(prev => prev.map(loc => 
      loc.id === id ? { ...loc, notes: newNotes } : loc
    ));
  };

  const updateLocationDays = (id, newDays) => {
    setLocations(prev => prev.map(loc => 
      loc.id === id ? { ...loc, days: parseInt(newDays) || 1 } : loc
    ));
  };

  const removeLocation = (id) => {
    setLocations(prev => prev.filter(loc => loc.id !== id));
    if (selectedLocation && selectedLocation.id === id) {
      setSelectedLocation(null);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const results = await provider.search({ query: searchQuery });
      if (results.length > 0) {
        const { x, y, label } = results[0];
        if (mapRef.current) {
          mapRef.current.setView([y, x], 13);
        }
        const newLocation = {
          id: Date.now(),
          name: `Location ${locations.length + 1}: ${label}`,
          position: [y, x],
          notes: [],
          days: 1
        };
        setLocations(prev => [...prev, newLocation]);
        setSelectedLocation(newLocation);
      }
    } catch (error) {
      console.error("Error searching for location:", error);
    }
  };

  const handleSave = () => {
    const htmlContent = `
      <html>
        <head>
          <title>Trip Plan</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            h1 { color: #2c3e50; }
            .location { margin-bottom: 20px; }
            .location h2 { color: #3498db; }
            ul { padding-left: 20px; }
          </style>
        </head>
        <body>
          <h1>Your Trip Plan</h1>
          ${locations.map((loc, index) => `
            <div class="location">
              <h2>${loc.name}</h2>
              <p>Days: ${loc.days}</p>
              <h3>Notes:</h3>
              <ul>
                ${loc.notes.map(note => `<li>${note}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trip_plan.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ flexGrow: 1, position: 'relative' }}>
        <MapContainer center={center} zoom={8} style={{ height: '100%', width: '100%' }} ref={mapRef}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapEvents onMapClick={onMapClick} />
          {locations.map((location, index) => (
            <NumberedMarker
              key={location.id}
              position={location.position}
              number={index + 1}
            />
          ))}
          {route.length > 0 && (
            <Polyline 
              positions={route}
              color="#3498db"
              weight={3}
              opacity={0.7}
            />
          )}
        </MapContainer>
        <div style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          zIndex: 1000,
          backgroundColor: 'white',
          padding: '0.5rem',
          borderRadius: '0.25rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                marginRight: '0.5rem', 
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '0.25rem',
                fontSize: '14px'
              }}
            />
            <button type="submit" style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: '14px'
            }}>
              Search
            </button>
          </form>
        </div>
      </div>
      <div style={{
        width: '33.333%',
        padding: '1rem',
        overflowY: 'auto',
        backgroundColor: '#f8f9fa',
        boxShadow: '-2px 0 5px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#2c3e50' }}>Trip Planner Online</h1>
        {locations.map((location, index) => (
          <div key={location.id} style={{
            marginBottom: '1rem',
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            padding: '1rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <input
                value={location.name}
                onChange={(e) => updateLocationName(location.id, e.target.value)}
                style={{ 
                  fontWeight: 'bold', 
                  padding: '0.5rem', 
                  width: '70%',
                  border: '1px solid #ccc',
                  borderRadius: '0.25rem',
                  fontSize: '14px'
                }}
              />
              <button
                onClick={() => removeLocation(location.id)}
                style={{
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.25rem',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Remove
              </button>
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '14px' }}>Days:</label>
              <input
                type="number"
                value={location.days}
                onChange={(e) => updateLocationDays(location.id, e.target.value)}
                min="1"
                style={{ 
                  padding: '0.5rem', 
                  width: '100%',
                  border: '1px solid #ccc',
                  borderRadius: '0.25rem',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '14px' }}>Notes:</label>
              <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem' }}>
                {location.notes.map((note, noteIndex) => (
                  <li key={noteIndex}>
                    <input
                      value={note}
                      onChange={(e) => {
                        const newNotes = [...location.notes];
                        newNotes[noteIndex] = e.target.value;
                        updateLocationNotes(location.id, newNotes);
                      }}
                      style={{ 
                        padding: '0.25rem', 
                        width: 'calc(100% - 20px)',
                        border: '1px solid #ccc',
                        borderRadius: '0.25rem',
                        fontSize: '14px',
                        marginBottom: '0.25rem'
                      }}
                    />
                  </li>
                ))}
              </ul>
              <button
                onClick={() => updateLocationNotes(location.id, [...location.notes, ""])}
                style={{
                  backgroundColor: '#2ecc71',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.25rem',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '14px',
                  marginTop: '0.5rem'
                }}
              >
                Add Note
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={handleSave}
          style={{
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            padding: '0.75rem 1rem',
            cursor: 'pointer',
            fontSize: '16px',
            width: '100%',
            marginTop: '1rem'
          }}
        >
          Save and Download Plan
        </button>
      </div>
    </div>
  );
};

export default TripPlanner;