<script>
  import { onMount, onDestroy, setContext } from 'svelte';
  import { mapbox, key } from './mapbox.js';
  // import {fetchData} from "@flowmap.gl/examples-common";
  // import {Deck} from "@deck.gl/core";
  // import {getViewStateForLocations} from "@flowmap.gl/data";
  // import {FlowmapLayer} from "@flowmap.gl/layers";

  setContext(key, {
     getMap: () => map,
  });


  let mapboxContainer;
  let deckCanvas;
  let map;
  let deck;
  let flowmapData;
  const bbox = [[15.82,40.95],[45.64,56.03]]

  onMount(() => {
    map = new mapbox.Map({
      container: mapboxContainer,
      style: 'mapbox://styles/mapbox/satellite-streets-v11',
      center: [(bbox[0][0]+bbox[1][0])/2, (bbox[0][1]+bbox[1][1])/2],
      maxBounds: bbox,
      zoom: 4,
    });
    map.on('load', () => {
      const layers = map.getStyle().layers;
      console.log(layers)
      map.setPaintProperty('satellite', 'raster-opacity', 0.5)
      // for (const l of layers) {
      //     // console.log('setting opacity on', l.id )
      //   if (map.getPaintProperty(l.id, 'opacity')) {
      //     map.setPaintProperty(l.id, 'opacity', 0.5)
      //   }
      // }
      const firstLabelLayer = layers.find((layer) => layer.id.endsWith('-label'));

      Promise.all([
        // fetch('/data/country-outline.json').then(body => body.json()),
        fetch('/data/adm1-outlines.json').then(body => body.json()),
        fetch('/data/ukr-civharm-2022-04-10.json').then(body => body.json())
      ])
      .then(([countryOutline, civHarm]) => {
        map.addSource('country', {
          type: 'geojson',
          data: countryOutline
        });
        map.addLayer({
          id: 'country-line1',
          type: 'line',
          source: 'country',
          layout: {},
          paint: {
            'line-color': '#fff',
            'line-opacity': 1.0,
            'line-width': 3,
          },
        }, firstLabelLayer?.id);
        map.addLayer({
            id: 'country-line2',
            type: 'line',
            source: 'country',
            layout: {},
            paint: {
              'line-color': '#209ed3',
              'line-opacity': 1.0,
              'line-width': 2,
            },
          }, firstLabelLayer?.id
        );


        map.addSource('civ-harm', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: civHarm.map(d => ({
              type: 'Feature',
              geometry: {
                id: d.id,
                type: 'Point',
                coordinates: [d.longitude, d.latitude],
              }
            }))
          }
        });
        map.addLayer({
          id: 'civ-harm-points',
          type: 'circle',
          source: 'civ-harm',
          layout: {},
          paint: {
            'circle-color': '#f34',
            'circle-opacity': 1.0,
            'circle-radius': 5.0,
          },
        }, firstLabelLayer?.id);

      });
    });

  });

  onDestroy(() => {
    if (map) map.remove();
  });


</script>

<svelte:head>
  <link
      rel="stylesheet"
      href="https://unpkg.com/mapbox-gl/dist/mapbox-gl.css"
  />
</svelte:head>

<div class="container">
  <div bind:this={mapboxContainer} id="mapbox-container">
    {#if map}
      <slot />
    {/if}
  </div>
<!--  <canvas bind:this={deckCanvas} id="deck-canvas"></canvas>-->
</div>

<style>
  div.container {
    width: 100%;
    height: 100%;
  }
  div.container > * {
    position: absolute;
    width: 100%;
    height: 100%;
  }
  #mapbox-container {
    opacity: 0.75;
  }
  #deck-canvas {
    mix-blend-mode: screen;
  }
</style>
