import React from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { lightColors, darkColors } from '../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Location {
  latitude: number;
  longitude: number;
  label?: string;
  isMe?: boolean;
  photoUrl?: string; // Profile photo URL
}

interface MapWebViewProps {
  markers?: Location[];
  center?: { latitude: number; longitude: number };
  zoom?: number;
  height?: number;
  apiKey: string;
  isDark?: boolean;
}

export const MapWebView: React.FC<MapWebViewProps> = ({
  markers = [],
  center,
  zoom = 4,
  height = 300,
  apiKey,
  isDark = false,
}) => {
  const colors = isDark ? darkColors : lightColors;
  
  // Calculate center from markers if not provided
  const mapCenter = center || (markers.length > 0
    ? {
        latitude: markers.reduce((sum, m) => sum + m.latitude, 0) / markers.length,
        longitude: markers.reduce((sum, m) => sum + m.longitude, 0) / markers.length,
      }
    : { latitude: 28.6139, longitude: 77.2090 }); // Default: Delhi

  // If we have markers, use a reasonable zoom
  const actualZoom = markers.length > 0 ? Math.max(zoom, 10) : zoom;

  // Create markers JavaScript with photo overlays
  const markersJS = markers.map((marker, index) => {
    const borderColor = marker.isMe ? '#22C55E' : '#EC4899';
    const label = marker.label || (marker.isMe ? 'You' : 'Partner');
    const initial = label.charAt(0).toUpperCase();
    
    // If photo URL exists, use it; otherwise show initial
    const hasPhoto = marker.photoUrl && marker.photoUrl.length > 0;
    
    return `
      // Create custom overlay for marker ${index}
      var PhotoOverlay${index} = function(position, map, photoUrl, borderColor, initial, hasPhoto) {
        this.position = position;
        this.map = map;
        this.photoUrl = photoUrl;
        this.borderColor = borderColor;
        this.initial = initial;
        this.hasPhoto = hasPhoto;
        this.div = null;
        this.setMap(map);
      };
      
      PhotoOverlay${index}.prototype = new google.maps.OverlayView();
      
      PhotoOverlay${index}.prototype.onAdd = function() {
        var div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.width = '48px';
        div.style.height = '48px';
        div.style.borderRadius = '50%';
        div.style.border = '3px solid ' + this.borderColor;
        div.style.backgroundColor = '#1F2937';
        div.style.overflow = 'hidden';
        div.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        div.style.cursor = 'pointer';
        div.style.transform = 'translate(-50%, -50%)';
        
        if (this.hasPhoto) {
          var img = document.createElement('img');
          img.src = this.photoUrl;
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'cover';
          img.onerror = function() {
            div.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#374151;color:#9CA3AF;font-size:18px;font-weight:700;">' + this.initial + '</div>';
          }.bind(this);
          div.appendChild(img);
        } else {
          div.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#374151;color:#9CA3AF;font-size:18px;font-weight:700;">' + this.initial + '</div>';
        }
        
        this.div = div;
        var panes = this.getPanes();
        panes.overlayMouseTarget.appendChild(div);
      };
      
      PhotoOverlay${index}.prototype.draw = function() {
        var overlayProjection = this.getProjection();
        var position = overlayProjection.fromLatLngToDivPixel(this.position);
        this.div.style.left = position.x + 'px';
        this.div.style.top = position.y + 'px';
      };
      
      PhotoOverlay${index}.prototype.onRemove = function() {
        if (this.div) {
          this.div.parentNode.removeChild(this.div);
          this.div = null;
        }
      };
      
      new PhotoOverlay${index}(
        new google.maps.LatLng(${marker.latitude}, ${marker.longitude}),
        map,
        "${marker.photoUrl || ''}",
        "${borderColor}",
        "${initial}",
        ${hasPhoto}
      );
    `;
  }).join('\n');

  // Fit bounds if multiple markers
  const fitBoundsJS = markers.length > 1 ? `
    var bounds = new google.maps.LatLngBounds();
    ${markers.map(m => `bounds.extend({ lat: ${m.latitude}, lng: ${m.longitude} });`).join('\n')}
    map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
    google.maps.event.addListenerOnce(map, 'bounds_changed', function() {
      if (map.getZoom() > 15) {
        map.setZoom(15);
      }
    });
  ` : '';

  // Dark mode map styles
  const darkMapStyles = isDark ? `
    { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#255763" }] },
    { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#023e58" }] },
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body, #map { width: 100%; height: 100%; }
          .gm-style-iw { background: white !important; }
          .gm-style-iw-d { overflow: hidden !important; }
          .gm-ui-hover-effect { display: none !important; }
          /* Hide Google branding and labels */
          .gm-style-cc { display: none !important; }
          .gmnoprint { display: none !important; }
          a[href^="https://maps.google.com/maps"] { display: none !important; }
          a[href^="http://maps.google.com/maps"] { display: none !important; }
          .gm-style a[title="Report errors in the road map or imagery to Google"] { display: none !important; }
          a[title="Open this area in Google Maps (opens a new window)"] { display: none !important; }
          div[style*="position: absolute"][style*="bottom: 0"] { display: none !important; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          function initMap() {
            var map = new google.maps.Map(document.getElementById('map'), {
              center: { lat: ${mapCenter.latitude}, lng: ${mapCenter.longitude} },
              zoom: ${actualZoom},
              disableDefaultUI: true,
              zoomControl: false,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false,
              gestureHandling: 'greedy',
              styles: [
                ${darkMapStyles}
                { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
                { featureType: "poi.business", stylers: [{ visibility: "off" }] },
                { featureType: "transit", stylers: [{ visibility: "off" }] },
                { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
                { featureType: "administrative", elementType: "labels", stylers: [{ visibility: "simplified" }] }
              ]
            });
            
            // Hide Google logo after map loads
            google.maps.event.addListenerOnce(map, 'tilesloaded', function() {
              var elements = document.querySelectorAll('.gm-style-cc, .gmnoprint, a[title*="Google"]');
              elements.forEach(function(el) { el.style.display = 'none'; });
            });
            
            ${markersJS}
            ${fitBoundsJS}
          }
        </script>
        <script async defer
          src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap">
        </script>
      </body>
    </html>
  `;

  return (
    <View style={[styles.container, { height, backgroundColor: colors.backgroundAlt }]}>
      <WebView
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        startInLoadingState
        renderLoading={() => (
          <View style={[styles.loading, { backgroundColor: colors.backgroundAlt }]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        cacheEnabled={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MapWebView;
