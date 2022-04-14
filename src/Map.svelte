<script>
  import DoubleRangeSlider from './DoubleRangeSlider.svelte';
  import { onMount, onDestroy, setContext } from 'svelte';
  import { mapbox, key } from './mapbox.js';
  import * as d3 from 'd3';

  setContext(key, {
     getMap: () => map,
  });

  const _formatDate = d3.timeFormat('%B %e');
  // const formatDate = d => {
  //   const s = _formatDate(d);
  //   return `${s}${s.endsWith('1') ? 'st' : s.endsWith('2') ? 'nd' : s.endsWith('3') ? 'rd' : 'th'}`;
  // }
  const formatDate = _formatDate;
  const parseDate = d3.timeParse('%m/%d/%Y');

  let start;
  let end;
  let timeExtent;
  function toTime(x) {
    const [a,b] = timeExtent.map(d => d.getTime());
    return a + x * (b - a);
  }

  let mapboxContainer;
  let deckCanvas;
  let map;
  let civHarmData;
  let civHarmDataById;

  const bbox = [[16.82,39.0],[45.64,56.03]]

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
        fetch('/data/ukr-civharm-2022-04-14.json').then(body => body.json())
      ])
      .then(([countryOutline, civHarm]) => {
        civHarmData = civHarm.map(d => ({
          ...d,
          date: parseDate(d.date)
        }));
        timeExtent = d3.extent(civHarmData, d => d.date);
        civHarmDataById = civHarmData.reduce((m,d) => { m.set(d.id, d); return m; }, new Map());

        map.addSource('civ-harm', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          },
          // filter: ["==", ["get", "featureclass"], "cape"],
          cluster: true,
          clusterMaxZoom: 14, // Max zoom to cluster points on
          clusterRadius: 50  // Radius of each cluster when clustering points (defaults to 50)
        });
        updateTimeFilter();



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



        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'civ-harm',
          filter: ['==', 'cluster', true],
          // filter: ['has', 'point_count'],
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
          filter: ['==', 'cluster', true],
          // filter: ['has', 'point_count'],
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
          // filter: ['!', ['has', 'point_count']],
          filter: ['!=', 'cluster', true],
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

        let popup;
        // map.on('close-popup', () => {
        //   if (popup) {
        //     popup.remove();
        //     popup = undefined;
        //   }
        // });

        map.on('click', 'unclustered-point', (e) => {
          map.getCanvas().style.cursor = 'pointer';
          const coordinates = e.features[0].geometry.coordinates.slice();
          const d = civHarmDataById.get(e.features[0].properties.id);

          popup = new mapbox.Popup()
            .setLngLat(coordinates)
            .setHTML(`
            <div class="tooltip">
            <table>
              <tr><th>Date</th><td>${formatDate(d.date)}</td></tr>
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
          // map.fire('close-popup')
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

  function updateTimeFilter() {
    // console.log(start, end)
    if (map) {
      const startTime = toTime(start);
      const endTime = toTime(end);
      map.getSource('civ-harm').setData({
        type: 'FeatureCollection',
        features: civHarmData
          .filter(d => {
            const t = d.date.getTime();
            return startTime <= t && t <= endTime;
          })
        .map(d => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [d.longitude, d.latitude],
          },
          properties: {
            id: d.id,
          }
        }))
      })
      // const filters = ['>=', 'date', toTime(start)];
      // map.setFilter('unclustered-point', filters);
      // map.setFilter('clusters', filters);
      // map.setFilter('cluster-count', filters);
    }
  }

  $: start, updateTimeFilter();
  $: end, updateTimeFilter();


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


<div class="time-slider-box">
  {#if timeExtent}
  <div class="labels">
    <div class="label">{formatDate(toTime(start))}</div>
    <div class="spacer"/>
    <div class="label">{formatDate(toTime(end))}</div>
  </div>
  <DoubleRangeSlider bind:start bind:end />
  {/if}
</div>

<style>
  .time-slider-box {
    position: absolute;
    color: #fff;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 20px 30px 40px 30px;
    background: rgba(20,20,30,0.75);
    box-shadow: 0px 0px 1px 1px rgba(100,100,120,0.75);
  }
  .time-slider-box .labels {
    color: #fff;
    margin-bottom: 5px;
    display: flex;
    font-size: 14px;
    text-shadow: 0 0 3px #000;
  }
  .time-slider-box .labels .label {
    background: rgba(0,0,0,0.4);
  }
  .time-slider-box .labels .spacer {
    flex-grow: 1;
  }

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
