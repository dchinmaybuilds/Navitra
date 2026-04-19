import mapboxgl from 'mapbox-gl';
import { useEffect, useRef } from 'react';
import axios from 'axios';

const Map = ({ onData }) => {
	const mapContainer = useRef(null);
	const mapRef = useRef(null);
	const markerRef = useRef(null);
	const destinationMarkerRef = useRef(null);
	// Refs for marker interpolation
	const currentLngRef = useRef(72.8777);
	const currentLatRef = useRef(19.076);
	const targetLngRef = useRef(72.8777);
	const targetLatRef = useRef(19.076);
	// Ref for request animation frame
	const rafRef = useRef(null);
	const t = useRef(0.05);
	const socketRef = useRef(null);
	const timeoutRef = useRef(null);
	// Ref for destination
	const destinationLngRef = useRef(null);
	const destinationLatRef = useRef(null);
	const destinationCityRef = useRef(null);
	// Effect 1: Initialize map
	useEffect(() => {
		// Set Mapbox token
		mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

		// Create Map
		const bus = document.createElement('div');
		bus.className = 'bus-marker';

		mapRef.current = new mapboxgl.Map({
			container: mapContainer.current,
			style: 'mapbox://styles/mapbox/streets-v12',
			center: [72.8777, 19.076], // Mumbai
			zoom: 12,
		});

		// Add marker (bus)
		markerRef.current = new mapboxgl.Marker({ element: bus })
			.setLngLat([72.8777, 19.076])
			.addTo(mapRef.current);

		return () => mapRef.current.remove();
	}, []);
	// Effect 2: WebSockets
	useEffect(() => {
		const getDestination = async (lat, lon) => {
			const reverseGeocodingURL = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
			const response = await axios.get(reverseGeocodingURL);
			destinationCityRef.current = response.data.address.city;
		};
		const connect = () => {
			// Creating connection
			const socket = new WebSocket(import.meta.env.VITE_WS_URL);
			socketRef.current = socket; // For clean-up function
			socket.onopen = () => console.log('Connection opened');
			// Handling incoming messages
			socket.onmessage = async (event) => {
				const data = JSON.parse(event.data);
				if (data.type === 'init' && mapRef.current) {
					destinationLngRef.current = data.destination.lng;
					destinationLatRef.current = data.destination.lat;
					destinationMarkerRef.current = new mapboxgl.Marker({
						color: 'green',
					})
						.setLngLat([destinationLngRef.current, destinationLatRef.current])
						.addTo(mapRef.current);
					await getDestination(
						destinationLatRef.current,
						destinationLngRef.current,
					);
					onData({ type: 'init', destinationCity: destinationCityRef.current });
				} else {
					targetLngRef.current = data.lng;
					targetLatRef.current = data.lat;
					onData({
						type: data.type,
						eta: data.eta,
						network: data.network,
					});
				}
			};
			socket.onclose = () => {
				timeoutRef.current = setTimeout(connect, 3000);
			};
		};
		connect();
		// Cleanup function to close the connection
		return () => {
			socketRef.current?.close();
			clearTimeout(timeoutRef.current);
		};
	}, []);
	// Effect 3: To interpolate marker
	useEffect(() => {
		const animateMarker = () => {
			// Lerp formula
			currentLngRef.current =
				currentLngRef.current +
				(targetLngRef.current - currentLngRef.current) * t.current;
			currentLatRef.current =
				currentLatRef.current +
				(targetLatRef.current - currentLatRef.current) * t.current;
			rafRef.current = requestAnimationFrame(animateMarker);
			markerRef.current.setLngLat([
				currentLngRef.current,
				currentLatRef.current,
			]);
		};
		requestAnimationFrame(animateMarker);
		return () => {
			cancelAnimationFrame(rafRef.current);
		};
	}, []);
	return <div ref={mapContainer} style={{ width: '100%', height: '100vh' }} />;
};

export default Map;
