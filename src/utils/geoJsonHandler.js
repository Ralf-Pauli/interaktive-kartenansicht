import L from "leaflet";
import {getLayerControl, toggleSidebar} from "@/utils/mapControls";
import {coronaStyle, onEachFeature, setCurrentLayer, style} from "@/utils/styling";

export const proxyURL = "https://corsproxy.io/?",
    baseURL = "https://nina.api.proxy.bund.dev/api31",
    germanMapDataURL = "https://raw.githubusercontent.com/Ralf-Pauli/Geojson_Files/main/landkreise.geojson",
    swissMapDataURL = "https://raw.githubusercontent.com/cividi/ch-municipalities/main/data/gemeinden.geojson";

let baseMaps = Array();

let titles = ["Allgemeine Warnmeldungen", "Coronawarnungen", "Unwetterwarnungen", "Flutwarnungen"],
    warningColors = ["#FB8C00", "#ff5900", "darkblue"];

let searchData = [];

export async function addCounties(map) {
    let mapData = await fetch(proxyURL + germanMapDataURL).then(value => value.json());
    await addCovidData(mapData);
    mapData.features.forEach(feature => {
        searchData.push({
            geometry: feature.geometry,
            properties: {
                name: feature.properties.GEN,
                id: feature.properties.AGS,
            }
        })
    })

    let countiesMap = L.geoJSON(mapData, {
        onEachFeature: onEachFeature,
        style: style,
        zIndex: 2,
    }).addTo(map);

    let coronaMap = L.geoJSON(mapData, {
        onEachFeature: onEachFeature,
        style: coronaStyle,
        zIndex: 2,
    });
    let empty = L.geoJSON(null, {style: style});

    let layerControl = getLayerControl();

    layerControl.addBaseLayer(empty, "Empty");
    layerControl.addBaseLayer(countiesMap, "Landkreise");
    layerControl.addBaseLayer(coronaMap, "Corona");

    baseMaps.push(empty, countiesMap, coronaMap);

    // baseMaps[Object.keys(baseMaps)[0]].bringToFront()
    setCurrentLayer(baseMaps[0]);
}

export async function addSwissCounties() {
    let swissMapData = await fetch(proxyURL + swissMapDataURL).then(value => value.json());
    let swissCountiesMap = L.geoJSON(swissMapData, {
        onEachFeature: onEachFeature,
        style: style,
        zIndex: 2,
    });
    getLayerControl().addBaseLayer(swissCountiesMap, "Swiss Landkreise")
    baseMaps.push(swissCountiesMap)
}

export async function addCovidData(mapData) {
    let covidData = await fetch(proxyURL + encodeURIComponent(baseURL + '/appdata/covid/covidmap/DE/covidmap.json')).then(value => value.json());
    mapData.features.forEach(feature => {
        let covid = covidData.mapData.find(value => value.rs === feature.properties.RS) || 0;
        feature.properties.cases = covid.cases;
        feature.properties.cases7Per100k = covid.cases7Per100k;
        feature.properties.cases_per_100k = covid.cases_per_100k;
        feature.properties.deaths = covid.deaths;
    });
}

export function addWarningGeoToMap(map, warningGeo) {
    for (let index in warningGeo.value) {
        let warningLayer = L.layerGroup();
        for (let warning of warningGeo.value[index]) {
            let warn = L.geoJSON(warning, {
                style: {
                    fillColor: warningColors[index],
                    weight: 2,
                    opacity: 1,
                    color: 'black',
                    dashArray: '3',
                    fillOpacity: 0.7
                },
                onEachFeature: function (feature, layer) {
                    if (layer.feature.geometry.type === "MultiPolygon" || layer.feature.geometry.type === "Polygon") {
                        layer.on({
                            mouseover: mouseover,
                            mouseout: function (feature, layer) {
                                warn.resetStyle(layer)
                            }, click: click
                        })
                    }
                },
            })
            warningLayer.addLayer(warn).addTo(map);
        }
        getLayerControl().addOverlay(warningLayer, titles[index])
    }
}

function mouseover(e) {
    let layer = e.target;
    layer.setStyle({
        weight: 3,
        opacity: 1,
        color: 'black',
        dashArray: '',
        fillOpacity: 0.7,
    });
    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }
}

function click(feature) {
    if (!document.getElementById("sidePanel").classList.contains("opened")) {
        toggleSidebar()
    }
    let currentWarning;
    allWarnings.value.forEach(warnType => {
        if (warnType.has(feature.target.feature.properties.warnId)) {
            currentWarning = warnType.get(feature.target.feature.properties.warnId)
            findWarning(currentWarning);
        }
    })
}

export function getSearchData(){
    return searchData;
}