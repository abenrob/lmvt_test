//Globals that we can change later.
var symbolType = 'lat';
var strokeColor = 'rgba(20,20,20,.7)';
var fillOpacity = .7;
var x_max = 2;
var x_min = -7;
var y_max = 59;
var y_min = 49;
var y_range = y_max - y_min;
var scrapeThreshold = .7;

// debug object for viewing pbf details
var debug = {};

function getTileRef(zoom){
  var tileref;
  if (zoom < 7) { tileref = 'uk_grid15000'; }
  else if (zoom < 9) { tileref = 'uk_grid10000'; }
  else if (zoom < 11) { tileref = 'uk_grid5000'; }
  else if (zoom < 13) { tileref = 'uk_grid1000'; }
  else if (zoom < 20) { tileref = 'uk_grid500'; }
  else { tileref = 'none'; }
  return tileref;
}

function getColor(coordType, coordVal, opacity){
  opacity === null || opacity === "" ? 1 : opacity;
  if (coordType === 'lat'){
    var minVal = y_min;
    var maxVal = y_max;
  } else if (coordType === 'lng'){
    var minVal = x_min;
    var maxVal = x_max;
  }

  var fullRange = maxVal - minVal;
  var actRange = coordVal - minVal;

  var colorScale = coordType === 'lat' ? d3.interpolateSpectral(actRange / fullRange) : d3.interpolateYlGnBu(actRange / fullRange);
  var rgb = d3.rgb(colorScale)
  return 'rgba('+rgb.r+','+rgb.g+','+rgb.b+','+opacity+')';
}

function styleFeatures(feature) {
  //console.log(feature);
  var coordVal = feature.properties[symbolType];
  var style = {};
  style.color = getColor(symbolType, coordVal, fillOpacity);
  style.outline = {
    color: 'rgba(0,0,0,.2)',
    size: 0.25
  };
  return style;
}

function filterFeatures(feature) {
  var show;
  var yVal = scrapeThreshold * y_range + y_min;
  //console.log(feature.properties.lat,scrapeThreshold,yVal);
  return feature.properties.lat > yVal ? false : true;
}

function updateTiles(){
  var layer = pbfSource.getLayers().vectile;
  if (layer){
    layer.setStyle(layer.style);
    layer.clearLayerFeatureHash();
    pbfSource.setFilter(pbfSource.options.filter,'vectile');
    pbfSource.redraw();
  }
};

var map = L.map('map').setView([54.5,-4], 6); // scot
$('#mapref > .zoomref').text('Zoom: 6');
$('#mapref > .tileref').text(' MVT: ' + getTileRef(6));

L.tileLayer('https://api.mapbox.com/styles/v1/abenrob/cit4epkof00832xqrlzp80poz/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYWJlbnJvYiIsImEiOiJEYmh3WWNJIn0.fus8CLBKPBHDvSxiayhJyg').addTo(map);


var pbfSource = new L.TileLayer.MVTSource({
  url: "http://localhost:3333/ukgrid/{z}/{x}/{y}.mvt",
  debug: false,
  clickableLayers: false,

  getIDForLayerFeature: function(feature) {
    return feature.properties.id;
  },

  /**
   * The filter function gets called when iterating though each vector tile feature (vtf). You have access
   * to every property associated with a given feature (the feature, and the layer). You can also filter
   * based of the context (each tile that the feature is drawn onto).
   *
   * Returning false skips over the feature and it is not drawn.
   *
   * @param feature
   * @returns {boolean}
   */
  filter: function(feature, context){
    return filterFeatures(feature);
  },

  /**
   * When we want to link events between layers, like clicking on a label and a
   * corresponding polygon freature, this will return the corresponding mapping
   * between layers. This provides knowledge of which other feature a given feature
   * is linked to.
   *
   * @param layerName  the layer we want to know the linked layer from
   * @returns {string} returns corresponding linked layer
   */
  layerLink: function(layerName) {
    if (layerName.indexOf('_label') > -1) {
      return layerName.replace('_label', '');
    }
    return layerName + '_label';
  },

  /**
   * Specify which features should have a certain z index (integer).  Lower numbers will draw on 'the bottom'.
   *
   * @param feature - the PBFFeature that contains properties
   */
  layerOrdering: function(feature) {
    //This only needs to be done for each type, not necessarily for each feature. But we'll start here.
    if (feature && feature.properties) {
      feature.properties.zIndex = feature.properties.population > 100 ? 10 : 5;
    }
  },

  style: function(feature){
    return styleFeatures(feature);
  },

  onClick: function(evt) {
    console.log(evt.feature.properties);
  }
});

debug.mvtSource = pbfSource;

//Add layer
map.addLayer(pbfSource);


map.on('zoomend', function(evt){
  var zoom = evt.target._zoom;
  $('#mapref > .zoomref').text('Zoom: ' + zoom);
  $('#mapref > .tileref').text(' MVT: ' + getTileRef(zoom));
});

$('#toggle').on('click', function(evt){
  symbolType = symbolType === 'lat' ? 'lng' : 'lat';
  updateTiles();
})

new Dragdealer('opacity-slider', {
  x: .7,
  animationCallback: function(x, y) {
    $('#opacity-slider .value').text(Math.round(x * 100));
    fillOpacity = x;
    updateTiles();
  }
});
new Dragdealer('scrape-slider', {
  x: 1,
  animationCallback: function(x, y) {
    scrapeThreshold = x;
    var threshToLat = x * y_range + y_min;
    $('#scrape-slider .value').text(threshToLat);
    updateTiles();
  }
});
