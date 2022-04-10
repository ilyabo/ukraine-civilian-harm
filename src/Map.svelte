<script>
  import { onMount, onDestroy, setContext } from 'svelte';
  import { mapbox, key } from './mapbox.js';

  setContext(key, {
     getMap: () => map,
  });


  let mapboxContainer;
  let deckCanvas;
  let map;
  let civHarmDataById;

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
      map.loadImage('./explosion.png', (error, image) => {
        if (error) throw error;
        // add image to the active style and make it SDF-enabled
        map.addImage('explosion', image, { sdf: true });
      });

      const beforeId = (layers.find((layer) => layer.id.endsWith('-label')))?.id;

      Promise.all([
        fetch('/data/country-outline.json').then(body => body.json()),
        // fetch('/data/adm1-outlines.json').then(body => body.json()),
        fetch('/data/ukr-civharm-2022-04-10.json').then(body => body.json())
      ])
      .then(([countryOutline, civHarm]) => {
        civHarmDataById = civHarm.reduce((m,d) => { m.set(d.id, d); return m; }, new Map());

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
                type: 'Point',
                coordinates: [d.longitude, d.latitude],
              },
              properties: {
                id: d.id,
              }
            }))
          },
          cluster: true,
          clusterMaxZoom: 14, // Max zoom to cluster points on
          clusterRadius: 50  // Radius of each cluster when clustering points (defaults to 50)
        });



        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'civ-harm',
          filter: ['has', 'point_count'],
          paint: {
            // Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
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
          type: 'symbol',
          source: 'civ-harm',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'icon-color': '#11b4da',
            'icon-halo-color': '#fff',
            'icon-halo-width': 4,
            'icon-halo-blur': 1,
          },
          layout: {
            'icon-image': 'explosion',
            'icon-size': 1,
            'icon-allow-overlap': true,
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
          const d = civHarmDataById.get(e.features[0].properties.id);

          // Ensure that if the map is zoomed out such that
          // multiple copies of the feature are visible, the
          // popup appears over the copy being pointed to.
          // while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          //   coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
          // }

          new mapbox.Popup()
          .setLngLat(coordinates)
          .setHTML(`
          <div class="tooltip">
          <table>
            <tr><th>Date</th><td>${d.date}</td></tr>
            <tr><th>Location</th><td>${d.location}</td></tr>
            <tr><th>Description</th><td>${d.description}</td></tr>
            <tr><th>Sources</th><td>
                ${d.sources?.map((s,i) =>
                  `<a href="${s.path}" target="_blank">${`Source #${i+1}`}</a>`
                ).join(' ')}
            </td></tr>
            ${d.filters?.map(f => `<tr><th>${f.key}</th><td>${f.value}</td></tr>`).join('')}
          </table></div>
          `)
          .addTo(map);
        });
        map.on('mouseenter', 'unclustered-point', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'unclustered-point', () => {
          map.getCanvas().style.cursor = '';
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
  <link rel="stylesheet" href="https://unpkg.com/mapbox-gl/dist/mapbox-gl.css" />
</svelte:head>

<div class="container">
  <div bind:this={mapboxContainer} id="mapbox-container">
    {#if map}
      <slot />
    {/if}
  </div>
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

</style>
