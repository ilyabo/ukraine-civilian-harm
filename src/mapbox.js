import mapbox from 'maplibre-gl';

// https://docs.mapbox.com/help/glossary/access-token/
mapbox.accessToken = MAPBOX_ACCESS_TOKEN;
mapbox.maptilerKey = MAPTILER_KEY;

const key = {};

export {mapbox, key};
