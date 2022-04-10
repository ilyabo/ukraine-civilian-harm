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
      map.setPaintProperty('satellite', 'raster-opacity', 0.5)

      const firstLabelLayer = layers.find((layer) => layer.id.endsWith('-label'));

      Promise.all([
        fetch('/data/country-outline.json').then(body => body.json()),
        // fetch('/data/adm1-outlines.json').then(body => body.json()),
        fetch('/data/ukr-civharm-2022-04-10.json').then(body => body.json())
      ])
      .then(([countryOutline, civHarm]) => {
        map.addSource('country', {
          type: 'geojson',
          data: countryOutline
        });
        let beforeId = firstLabelLayer?.id;
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
        }, beforeId);
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
          }, beforeId
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
          },
          cluster: true,
          clusterMaxZoom: 14, // Max zoom to cluster points on
          clusterRadius: 50  // Radius of each cluster when clustering points (defaults to 50)
        });
        // map.addLayer({
        //   id: 'civ-harm-points',
        //   type: 'circle',
        //   source: 'civ-harm',
        //   layout: {},
        //   paint: {
        //     'circle-color': '#f34',
        //     'circle-opacity': 1.0,
        //     'circle-radius': 5.0,
        //   },
        // }, firstLabelLayer?.id);
        //


        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'civ-harm',
          filter: ['has', 'point_count'],
          paint: {
            // Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
            // with three steps to implement three types of circles:
            //   * Blue, 20px circles when point count is less than 100
            //   * Yellow, 30px circles when point count is between 100 and 750
            //   * Pink, 40px circles when point count is greater than or equal to 750
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#51bbd6',  50,
              '#f1f075',  100,
              '#f28cb1'
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              20,
              100,
              30,
              750,
              40
            ],
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff'

          }
        }, beforeId);

        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'civ-harm',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12
          }
        });

        map.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: 'civ-harm',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': '#11b4da',
            'circle-radius': 10,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff'
          }
        }, beforeId);

        // inspect a cluster on click
        map.on('click', 'clusters', (e) => {
          const features = map.queryRenderedFeatures(e.point, {
            layers: ['clusters']
          });
          const clusterId = features[0].properties.cluster_id;
          map.getSource('civ-harm').getClusterExpansionZoom(
            clusterId,
            (err, zoom) => {
              if (err) return;

              map.easeTo({
                center: features[0].geometry.coordinates,
                zoom: zoom + 1
              });
            }
          );
        });

        // When a click event occurs on a feature in
        // the unclustered-point layer, open a popup at
        // the location of the feature, with
        // description HTML from its properties.
        map.on('click', 'unclustered-point', (e) => {
          const coordinates = e.features[0].geometry.coordinates.slice();
          // const mag = e.features[0].properties.mag;

          // Ensure that if the map is zoomed out such that
          // multiple copies of the feature are visible, the
          // popup appears over the copy being pointed to.
          while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
          }

          new mapbox.Popup()
          .setLngLat(coordinates)
          .setHTML(
                  `magnitude: ${1}`
          )
          .addTo(map);
        });

        map.on('mouseenter', 'clusters', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'clusters', () => {
          map.getCanvas().style.cursor = '';
        });

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
