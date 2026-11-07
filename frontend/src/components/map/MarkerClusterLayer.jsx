import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { LeafletProvider, extendContext, useLeafletContext } from '@react-leaflet/core';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

/**
 * Mount a Leaflet marker cluster group as the layer container for React-Leaflet
 * children. Keeping plugin lifecycle hooks here avoids the hook-order bug in
 * react-leaflet-cluster 2.0.0 while preserving normal Marker and Popup usage.
 */
export default function MarkerClusterLayer({ children, ...options }) {
  const parentContext = useLeafletContext();
  const clusterGroupRef = useRef(null);

  if (clusterGroupRef.current === null) {
    clusterGroupRef.current = L.markerClusterGroup(options);
  }

  const clusterGroup = clusterGroupRef.current;
  const clusterContext = useMemo(
    () => extendContext(parentContext, { layerContainer: clusterGroup }),
    [parentContext, clusterGroup],
  );

  useEffect(() => {
    const container = parentContext.layerContainer || parentContext.map;
    container.addLayer(clusterGroup);
    return () => container.removeLayer(clusterGroup);
  }, [parentContext, clusterGroup]);

  return <LeafletProvider value={clusterContext}>{children}</LeafletProvider>;
}
