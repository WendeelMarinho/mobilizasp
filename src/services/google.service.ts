// src/services/google.service.ts

import axios from 'axios';
import { config } from '../config.js';

const GMAPS = 'https://maps.googleapis.com/maps/api';

export type LatLng = { lat: number; lng: number };

export async function geocode(address: string): Promise<LatLng | null> {
  const apiKey = (config as any).maps?.apiKey || config.google.apiKey;
  if (!apiKey) return null;
  
  const url = `${GMAPS}/geocode/json`;
  const { data } = await axios.get(url, {
    params: { address, key: apiKey, region: 'br' },
    timeout: 10000
  });
  const res = data?.results?.[0]?.geometry?.location;
  if (!res) return null;
  return { lat: res.lat, lng: res.lng };
}

export async function placesBusStopsNearby(center: LatLng, radius = 500): Promise<any[]> {
  const apiKey = (config as any).maps?.apiKey || config.google.apiKey;
  if (!apiKey) return [];
  
  const url = `${GMAPS}/place/nearbysearch/json`;
  const { data } = await axios.get(url, {
    params: {
      key: apiKey,
      location: `${center.lat},${center.lng}`,
      radius,
      type: 'bus_station',
      language: 'pt-BR'
    },
    timeout: 10000
  });
  return data?.results ?? [];
}

export async function directionsTransit(origin: string | LatLng, destination: string | LatLng) {
  const apiKey = (config as any).maps?.apiKey || config.google.apiKey;
  if (!apiKey) throw new Error('Google Maps API key não configurada');
  
  const url = `${GMAPS}/directions/json`;

  const toParam = (v: string | LatLng) =>
    typeof v === 'string' ? v : `${v.lat},${v.lng}`;

  const { data } = await axios.get(url, {
    params: {
      key: apiKey,
      origin: toParam(origin),
      destination: toParam(destination),
      mode: 'transit',
      transit_mode: 'bus',
      language: 'pt-BR',
      region: 'br'
    },
    timeout: 15000
  });

  return data;
}
