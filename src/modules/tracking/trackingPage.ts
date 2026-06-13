const getTrackingPageHtml = (token: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>TraceRider — Live Tracking</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; font-family: -apple-system, Roboto, sans-serif; }
    #status {
      position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
      background: #0E1F1C; color: #fff; padding: 8px 16px; border-radius: 999px;
      font-size: 13px; font-weight: 600; z-index: 1000; max-width: 90%; text-align: center;
    }
  </style>
</head>
<body>
  <div id="status">Loading ride...</div>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.5/socket.io.min.js"></script>

  <script>
    const TOKEN = ${JSON.stringify(token)};
    const statusEl = document.getElementById('status');

    const map = L.map('map', { zoomControl: true, attributionControl: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    const blueIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.6.0/images/marker-shadow.png',
      iconSize: [25, 41], iconAnchor: [12, 41]
    });
    const greenIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.6.0/images/marker-shadow.png',
      iconSize: [25, 41], iconAnchor: [12, 41]
    });
    const redIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.6.0/images/marker-shadow.png',
      iconSize: [25, 41], iconAnchor: [12, 41]
    });

    const STATUS_LABELS = {
      requested: "Waiting for a driver",
      driver_assigned: "Driver assigned",
      driver_arriving: "Driver is arriving",
      otp_verified: "OTP verified",
      in_progress: "Ride in progress",
      completed: "Ride completed",
      cancelled: "Ride cancelled"
    };

    let driverMarker = null;

    async function init() {
      try {
        const res = await fetch('/api/v1/tracking/' + TOKEN);
        const json = await res.json();

        if (!json.success) {
          statusEl.textContent = json.message || "Unable to load ride";
          return;
        }

        const data = json.data;
        statusEl.textContent = STATUS_LABELS[data.status] || data.status;

        const bounds = L.latLngBounds([data.pickupLat, data.pickupLng], [data.pickupLat, data.pickupLng]);
        L.marker([data.pickupLat, data.pickupLng], { icon: blueIcon }).addTo(map).bindPopup("Pickup");
        L.marker([data.dropLat, data.dropLng], { icon: greenIcon }).addTo(map).bindPopup("Drop");
        L.polyline(
          [[data.pickupLat, data.pickupLng], [data.dropLat, data.dropLng]],
          { color: '#16191A', weight: 3 }
        ).addTo(map);
        bounds.extend([data.dropLat, data.dropLng]);

        if (data.liveLocation) {
          driverMarker = L.marker([data.liveLocation.lat, data.liveLocation.lng], { icon: redIcon })
            .addTo(map)
            .bindPopup(data.driver ? data.driver.fullName + ' — ' + data.driver.vehicleNo : 'Driver');
          bounds.extend([data.liveLocation.lat, data.liveLocation.lng]);
        }

        map.fitBounds(bounds, { padding: [40, 40] });

        if (data.status === 'completed' || data.status === 'cancelled') return;

        const socket = io('/track', { auth: { token: TOKEN }, transports: ['websocket'] });

        socket.on('server:driver_location', (payload) => {
          if (!driverMarker) {
            driverMarker = L.marker([payload.lat, payload.lng], { icon: redIcon }).addTo(map);
          } else {
            driverMarker.setLatLng([payload.lat, payload.lng]);
          }
        });

        socket.on('connect_error', () => {
          statusEl.textContent = "Live updates unavailable";
        });
      } catch (err) {
        statusEl.textContent = "Unable to load ride";
      }
    }

    init();
  </script>
</body>
</html>
`;

export { getTrackingPageHtml };