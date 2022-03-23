// general imports, state
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';
import { WebMercatorViewport } from '@deck.gl/core';

// deck GL and helper function import
import DeckGL from '@deck.gl/react';
import { MapView, FlyToInterpolator } from '@deck.gl/core';
import { GeoJsonLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import {GPUGridLayer, HeatmapLayer} from '@deck.gl/aggregation-layers';
import { fitBounds } from '@math.gl/web-mercator';
import MapboxGLMap from 'react-map-gl';
import { DataFilterExtension, FillStyleExtension } from '@deck.gl/extensions';

// component, action, util, and config import
import { MapTooltipContent, Geocoder } from '../components';
import { setSelectionData } from '../actions';
import { scaleColor } from '../utils';
import { colors } from '../config';
import * as SVG from '../config/svg';

const MAPBOX_ACCESS_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

const getRightMargin = () => window.innerWidth * .15 < 250 ? 260 : window.innerWidth * .15 + 10;

const QueryFeaturesWorker = new Worker(`${process.env.PUBLIC_URL}/workers/queryRenderedFeaturesWorker.js`);
// component styling
const MapContainer = styled.div`
    position:absolute;
    left:0;
    top:0;
    width:100%;
    height:100%;
    transition: 250ms all;
    background:${colors.white};
    overflow:hidden;
    @media (max-width:600px) {
        div.mapboxgl-ctrl-geocoder {
            display:none;
        }
        width:100%;
    }
    @media (max-width:768px) {
        div.mapboxgl-ctrl-bottom-right {
            transform: translateY(-60px);
        }
        div.mapboxgl-ctrl-bottom-left {
            transform: translate(30px, -60px);
        }
    }
`

const HoverDiv = styled.div`
    background:${colors.white};
    padding:20px;
    color:${colors.black};
    box-shadow: 0px 0px 5px rgba(0,0,0,0.7);
    border-radius: 0 15px 15px 15px;
    h3 {
        margin:5px 0;
    }
    hr {
        margin: 5px 0;
    }
    max-width:50ch;
    line-height:1.5;
    table {
        border-collapse:collapse;
    }
    table tr:nth-of-type(even) {
        background:${colors.chicagoLightBlue};
    }
    table tr td {
        padding:2px 0;
    }
    table tr td:nth-of-type(1) {
        padding-right:10px;
    }
`

const MapButtonContainer = styled.div`
    position: absolute;
    right:${props => props.infoPanel ? `calc(${getRightMargin()}px)` : '0.75em'};
    bottom: 0;
    z-index: 10;
    transition: 250ms all;
    @media (max-width: 1000px) {
        right:${props => props.infoPanel ? '35%' : '0.75em'};
    }
    @media (max-width:768px) {
        bottom:100px;
    }
    @media (max-width: 400px) {
        transform:scale(0.75) translate(20%, 20%);
    }
    @media (max-width: 600px){
        right:0.75em;
    }
`

const NavInlineButtonGroup = styled.div`
    margin-bottom:10px;
    border-radius:4px;
    overflow:hidden;
    -moz-box-shadow: 0 0 2px rgba(0,0,0,.1);
    -webkit-box-shadow: 0 0 2px rgba(0,0,0,.1);
    box-shadow: 0 0 0 2px rgba(0,0,0,.1);
`

const NavInlineButton = styled.button`
    width:29px;
    height:29px;
    padding:5px;
    display:block;
    fill:rgb(60,60,60);
    background-color: ${props => props.isActive ? colors.lightblue : colors.buttongray};
    outline:none;
    border:none;
    transition:250ms all;
    cursor:pointer;
    :after {
        opacity: ${props => props.shareNotification ? 1 : 0};
        content:'Map Link Copied to Clipboard!';
        background:${colors.buttongray};
        -moz-box-shadow: 0 0 2px rgba(0,0,0,.1);
        -webkit-box-shadow: 0 0 2px rgba(0,0,0,.1);
        box-shadow: 0 0 0 2px rgba(0,0,0,.1);
        border-radius: 4px;
        position: absolute;
        transform:translate(-120%, -25%);
        padding:5px;
        width:150px;
        pointer-events:none;
        max-width:50vw;
        transition:250ms all;
    }
    svg {
        transition:250ms all;
        transform:${props => props.tilted ? 'rotate(30deg)' : 'none'};
    }
`

// const ShareURL = styled.input`
//     position:fixed;
//     left:110%;
// `

// const IndicatorBox = styled.div`
//     position:fixed;
//     border:1px dashed #FFCE00;
//     background:rgba(0,0,0,0.25);
//     z-index:5;
// `

const GeocoderContainer = styled.div`
    position:fixed;
    left:12em;
    top:7px;
    z-index:500;
    width:230px;
    height:45px;
    @media (max-width:600px) {
        display:none;
    }
`

const LogoContainer = styled.div`
    position:absolute;
    right:${props => props.infoPanel ? `calc(${getRightMargin()}px + 3.5em)` : '3.5em'};
    bottom:0.75em;
    zIndex:500;
    height:4em;
    background:white;
    padding:0.5em 1em;
    border:1px solid #00e59e;
    transition:250ms all;
    img {
        height:100%;
    }
    @media (max-width:768px) {
        bottom:initial;
        top:0;
        right:0;
    }
`

function debounce(func, wait, immediate) {
    var timeout;
    return function () {
        var context = this, args = arguments;
        var later = function () {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};

// //create your forceUpdate hook
// function useForceUpdate(){
//     const [, setValue] = useState(0); // integer state
//     return () => setValue(value => value + 1); // update the state to force render
// }

function MapSection({
    setViewStateFn=()=>{},
    bounds
}) {
    // fetch pieces of state from store    
    const {
        storedGeojson,
        panelState,
        mapParams,
        urlParams,
        centroids,
        columnNames,
        ranges,
        selectionData,
        filterValues,
    } = useSelector(state => state);

    // component state elements
    // hover and highlight geographibes
    const [hoverInfo, setHoverInfo] = useState({ x: null, y: null, object: null });
    // const [highlightGeog, setHighlightGeog] = useState([]);
    const [hoverGeog, setHoverGeog] = useState(null);
    const [zoom, setZoom] = useState(bounds.zoom);

    // map view location
    const [viewState, setViewState] = useState({
        latitude: +urlParams.lat || bounds.latitude,
        longitude: +urlParams.lon || bounds.longitude,
        zoom: +urlParams.z || bounds.zoom,
        bearing: 0,
        pitch: 0
    })
    useEffect(() => {
        setViewStateFn(setViewState)
    },[])

    // // share button notification
    // const [shared, setShared] = useState(false);

    // interaction states
    // const [multipleSelect, setMultipleSelect] = useState(false);
    // const [boxSelect, setBoxSelect] = useState(false);
    // const [boxSelectDims, setBoxSelectDims] = useState({});
    // const forceUpdate = useForceUpdate();
    // const [resetSelect, setResetSelect] = useState(null);
    // const [mobilityData, setMobilityData] = useState([]);

    const dispatch = useDispatch();


    const RunQueryWorker = async (params) => {
        QueryFeaturesWorker.postMessage(params);
        QueryFeaturesWorker.onmessage = (e) => {
            const result = e?.data;
            // console.log(result)
            if (result) {
                dispatch(setSelectionData(result))
            }
        }
    }

    var queryViewport = debounce((e) => {
        if (!!centroids && centroids.length) {
            const viewport = new WebMercatorViewport(e.viewState);
            const extent = [...viewport.unproject([0, 0]), ...viewport.unproject([viewport.width, viewport.height])];
            RunQueryWorker({
                storedGeojson,
                centroids,
                columnNames,
                extent,
                ranges,
                filterValues
            })

        }
    }, 250);

    useEffect(() => {
        if (!Object.keys(selectionData).length) {
            RunQueryWorker({
                storedGeojson,
                centroids,
                columnNames,
                extent: [-100, 100, 100, -100],
                ranges,
                filterValues
            })
        }
        // eslint-disable-next-line
    }, [centroids, storedGeojson, columnNames, ranges, selectionData, filterValues])

    useEffect(() => {
        if (deckRef.current.viewports) {
            queryViewport({ viewState: { ...deckRef.current.viewports[0] } })
        }
        // eslint-disable-next-line
    }, [filterValues])

    // let hidden = null;
    // let visibilityChange = null;
    // if (typeof document.hidden !== 'undefined') { // Opera 12.10 and Firefox 18 and later support 
    //     hidden = 'hidden';
    //     visibilityChange = 'visibilitychange';
    // } else if (typeof document.msHidden !== 'undefined') {
    //     hidden = 'msHidden';
    //     visibilityChange = 'msvisibilitychange';
    // } else if (typeof document.webkitHidden !== 'undefined') {
    //     hidden = 'webkitHidden';
    //     visibilityChange = 'webkitvisibilitychange';
    // }

    // shared view broadcast
    // useEffect(() => { 
    //     document.addEventListener(visibilityChange, () => {
    //         setBoxSelect(false);
    //         setMultipleSelect(false);
    //     });

    //     window.addEventListener('storage', () => {
    //         // When local storage changes, dump the list to
    //         // the console.
    //         const SHARED_GEOID =  localStorage.getItem('SHARED_GEOID').split(',').map(d => parseInt(d))

    //         if (SHARED_GEOID !== null) {
    //             setHighlightGeog(SHARED_GEOID); 
    //         }

    //         const SHARED_VIEW =  JSON.parse(localStorage.getItem('SHARED_VIEW'));

    //         if (SHARED_VIEW !== null && SHARED_VIEW.hasOwnProperty('latitude')) {
    //             setViewState({
    //                     longitude: SHARED_VIEW.longitude,
    //                     latitude: SHARED_VIEW.latitude,
    //                     zoom: SHARED_VIEW.zoom,
    //                     transitionDuration: 1000,
    //                     transitionInterpolator: new FlyToInterpolator()
    //                 })
    //         }
    //     });

    // },[])

    useEffect(() => {
        setViewState(view => ({
            ...view,
            latitude: +urlParams.lat || bounds.latitude,
            longitude: +urlParams.lon || bounds.longitude,
            zoom: +urlParams.z || bounds.zoom,
            bearing: 0,
            pitch: 0
        }));
    }, [urlParams])

    const GetMapView = () => {
        try {
            const currView = deckRef.current.deck.viewState.MapView
            return currView || { ...viewState }
        } catch {
            return { ...viewState }
        }
    }

    const mapRef = useRef(null);

    const deckRef = useRef({
        deck: {
            viewState: {
                MapView: {
                    ...viewState
                }
            }
        }
    });

    // const handleShare = async (params) => {
    // const shareData = {
    //     title: 'The US Covid Atlas',
    //     text: 'Near Real-Time Exploration of the COVID-19 Pandemic.',
    //     url: `${window.location.href.split('?')[0]}${getURLParams(params)}`,
    // }

    // try {
    //     await navigator.share(shareData)
    //   } catch(err) {
    //     let copyText = document.querySelector("#share-url");
    //     copyText.value = `${shareData.url}`;
    //     copyText.style.display = 'blockd'
    //     copyText.select();
    //     copyText.setSelectionRange(0, 99999);
    //     document.execCommand("copy");
    //     copyText.style.display = 'none';
    //     setShared(true)
    //     setTimeout(() => setShared(false), 5000);
    // }
    // }

    // const handleKeyDown = (e) => {
    //     if (e.target.selectionStart === undefined){
    //         if (e.ctrlKey) setMultipleSelect(true);
    //         if (e.shiftKey) setBoxSelect(true);
    //     }
    // }

    // const handleKeyUp = (e) => {
    //     if (e.target.selectionStart === undefined){
    //         if (!e.ctrlKey) setMultipleSelect(false);
    //         if (!e.shiftKey) setBoxSelect(false);
    //     }
    // }

    const handleMapClick = ({ x, y, object }) => {
        console.log(object)
        if (object && object.properties) {
            setHoverGeog(object.properties.geoid)
            setHoverInfo({ x, y, object: object.properties })
        } else {
            setHoverGeog(null)
            setHoverInfo({ x: null, y: null, object: null })
        }
    }

    const handleGeolocate = async () => {
        navigator.geolocation.getCurrentPosition(position => {
            setViewState({
                longitude: position.coords.longitude,
                latitude: position.coords.latitude,
                zoom: 14,
                transitionDuration: 1000,
                transitionInterpolator: new FlyToInterpolator()
            })
        })
    }

    const handleZoom = (zoom) => {
        const currMapView = GetMapView()
        setViewState({
            ...currMapView,
            zoom: currMapView.zoom + zoom,
            transitionDuration: 250,
            transitionInterpolator: new FlyToInterpolator()
        })
    }

    const resetTilt = () => {
        const currMapView = GetMapView()
        setViewState({
            ...currMapView,
            bearing: 0,
            pitch: 0,
            transitionDuration: 250,
            transitionInterpolator: new FlyToInterpolator()
        })
    }

    const handleGeocoder = useCallback(location => {
        if (location.center !== undefined) {
            let center = location.center;
            let zoom = 13;

            if (location.bbox) {
                let bounds = fitBounds({
                    width: window.innerWidth,
                    height: window.innerHeight,
                    bounds: [[location.bbox[0], location.bbox[1]], [location.bbox[2], location.bbox[3]]]
                })
                center = [bounds.longitude, bounds.latitude];
                zoom = bounds.zoom * .9;
            };

            setViewState({
                longitude: center[0],
                latitude: center[1],
                zoom: zoom,
                bearing: 0,
                pitch: 0,
                transitionDuration: 'auto',
                transitionInterpolator: new FlyToInterpolator()
            })
        }
    }, []);

    // on initial render, navigate to lon/lat if provided
    useEffect(() => {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        if (urlParams.has('lat') && urlParams.has('lon')) {
            const center = [+urlParams.get('lon'), +urlParams.get('lat')]
            handleGeocoder({
                center
            })
        }
        // eslint-disable-next-line
    }, [])

    const COLOR_SCALE = x => scaleColor(x,mapParams.bins, mapParams.colorScale);
    const REDLINING_COLOR_SCALE = {
        "A":[115, 169, 77],
        "B":[52, 172, 198],
        "C":[219, 207, 0],
        "D":[226, 77, 90],
    }
    const isVisible = (feature, filters) => {
        for (const property in filters) {
            if (typeof filters[property][0] === 'string') {
                if (!filters[property].includes(feature.properties[property])) return false;
            } else {
                if (feature.properties[property] < filters[property][0]
                    ||
                    feature.properties[property] > filters[property][1]) return false;
            }
        };
        return true;
    };
    const CONTOURS = [
        {threshold: [0,1], color: [0,0,0,25], strokeWidth: 0, zIndex:1}, // => Isoline for threshold 1
        {threshold: [1,4], color: [254,240,217], strokeWidth: 0, zIndex:2}, // => Isoline for threshold 1
        {threshold: [4,8], color: [253,204,138], strokeWidth: 0, zIndex:3}, // => Isoline for threshold 5
        {threshold: [8,10], color: [252,141,89], strokeWidth: 0, zIndex:4}, // => Isoline for threshold 5
        {threshold: [10,15], color: [227,74,51], strokeWidth: 0, zIndex:5}, // => Isoline for threshold 5
        {threshold: [15,200], color: [179,0,0], strokeWidth: 0, zIndex:6}, // => Isoline for threshold 5
      ];
    const AQ_COL = "weekend_median"
    const layers = [
        new GeoJsonLayer({
            id: 'choropleth',
            data: storedGeojson,
            pickable: true,
            stroked: false,
            filled: true,
            extruded: false,
            getFillColor: feature => {
                const val = mapParams.accessor(feature)
                if ([null, undefined].includes(val)) {
                    return [0, 0, 0, 0]
                } else {
                    return COLOR_SCALE(val)
                }
            },
            opacity: 1,
            // onHover: handleMapHover,
            onClick: handleMapClick,
            getFilterValue: d => isVisible(d, filterValues) ? 1 : 0,
            filterRange: [1, 1],
            extensions: [new DataFilterExtension({ filterSize: 1 })],
            updateTriggers: {
                getFillColor: [storedGeojson.type, mapParams.variableName, mapParams.bins, mapParams.colorScale],
                getFilterValue: filterValues
            },
            transitions: {
                getFillColor: 250
            },
        }),
        new GeoJsonLayer({
            id: 'parks',
            data: `${process.env.PUBLIC_URL}/geojson/parks.geojson`,
            pickable: false,
            stroked: false,
            filled: true,
            extruded: false,
            getFillColor: [0, 0, 0, 120],
            opacity: 1,

            // props added by FillStyleExtension
            fillPatternAtlas: `${process.env.PUBLIC_URL}/icons/park-pattern.png`,
            fillPatternMapping: {
                "dot": {
                    "x": 0,
                    "y": 0,
                    "width": 128,
                    "height": 128,
                    "mask": true
                }
            },
            getFillPattern: f => 'dot',
            getFillPatternScale: (19 - GetMapView().zoom) / 8,
            getFillPatternOffset: [0, 0],

            // Define extensions
            extensions: [new FillStyleExtension({ pattern: true })]
        }),
        new GeoJsonLayer({
            id: 'highlightLayer',
            data: storedGeojson,
            opacity: 0.8,
            material: false,
            pickable: false,
            stroked: true,
            filled: true,
            lineWidthScale: 5,
            getLineColor: d => d.properties.geoid === hoverGeog ? [65, 182, 230, 255] : [100, 100, 100, 0],
            getFillColor: d => d.properties.geoid === hoverGeog ? [65, 182, 230, 120] : [65, 182, 230, 0],
            getLineWidth: 1,
            lineWidthMinPixels: 3,
            updateTriggers: {
                getLineColor: [hoverGeog],
                getFillColor: [hoverGeog],
            },
            transitions: {
                getLineColor: 250,
                getFillColor: 250
            }
        }),
        new GeoJsonLayer({
            id: 'redlining areas',
            data: `${process.env.PUBLIC_URL}/geojson/redlining.geojson`,
            opacity: 1,
            material: false,
            pickable: false,
            stroked: false,
            filled: true,
            getFillColor: d => REDLINING_COLOR_SCALE[d.properties["holc_grade"]] || [0,0,0],
            visible: mapParams.overlay === 'redlining',
            // props added by FillStyleExtension
            fillPatternAtlas: `${process.env.PUBLIC_URL}/icons/redlining-pattern.png`,
            // fillPatternMask: true,
            fillPatternEnabled: true,
            fillPatternMapping: {
                "hatch": {
                    "x": 132,
                    "y": 4,
                    "width": 120,
                    "height": 120,
                    "mask": true
                }
            },
            getFillPattern: f => 'hatch',
            getFillPatternScale: 2,
            getFillPatternOffset: [0, 0],
            extensions: [new FillStyleExtension({ pattern: true })],
            updateTriggers: {
                visible: [mapParams.overlay],
            },
        }),
        new GeoJsonLayer({
            id: 'community areas',
            data: `${process.env.PUBLIC_URL}/geojson/community_areas.geojson`,
            opacity: 0.8,
            material: false,
            pickable: false,
            stroked: true,
            filled: false,
            lineWidthScale: 1,
            lineWidthMinPixels: 1,
            lineWidthMaxPixels: 4,
            getLineWidth: 1,
            getLineColor: [0, 0, 0, 255],
            visible: mapParams.overlay === 'community_areas',
            updateTriggers: {
                visible: [mapParams.overlay],
            },
        }),
        new GeoJsonLayer({
            id: 'community areas',
            data: `${process.env.PUBLIC_URL}/geojson/boundaries_wards_2015_.geojson`,
            opacity: 0.8,
            material: false,
            pickable: false,
            stroked: true,
            filled: false,
            lineWidthScale: 1,
            lineWidthMinPixels: 1,
            lineWidthMaxPixels: 4,
            getLineWidth: 1,
            getLineColor: [0, 0, 0, 255],
            visible: mapParams.overlay === 'wards',
            updateTriggers: {
                visible: [mapParams.overlay],
            },
        }),
        // new GPUGridLayer({
        //     id: 'contour',
        //     data: `${process.env.PUBLIC_URL}/aq_data/aq_data.json`,
        //     colorAggregation: 'MEAN',
        //     getPosition: feature => [feature.Longitude, feature.Latitude],
        //     getColorWeight: feature => feature[AQ_COL],
        //     cellSize: 2000,
        //     contours: CONTOURS
        // }),
        // new HeatmapLayer({
        //     id: 'heatmap1',
        //     data: `${process.env.PUBLIC_URL}/aq_data/aq_data.json`,
        //     aggregation: 'MEAN',
        //     colorRange: [
        //         [254,235,226],
        //         [252,197,192],
        //         [250,159,181],
        //         [247,104,161],
        //         [197,27,138],
        //         [122,1,119],
        //     ],
        //     getPosition: feature => [feature.Longitude, feature.Latitude],
        //     getWeight: feature => feature[AQ_COL],
        //     radiusPixels: 1.3 ** (zoom * 2),
        //     intensity: 0.75,
        //     colorDomain: [5,13]
        // }),
        // new HeatmapLayer({
        //     id: 'heatmap2',
        //     data: `${process.env.PUBLIC_URL}/aq_data/aq_data.json`,
        //     aggregation: 'MEAN',
        //     getPosition: feature => [feature.Longitude, feature.Latitude],
        //     getWeight: feature => feature[AQ_COL],
        //     radiusPixels: 1.65 ** (zoom),
        //     intensity: 0.75,
        //     colorDomain: [9, 11],
            
        // }),
        // new ScatterplotLayer({
        //     id: 'scatterplot-layer',
        //     data: `${process.env.PUBLIC_URL}/aq_data/aq_data.json`,
        //     pickable: false,
        //     opacity: 0.8,
        //     stroked: false,
        //     radiusUnits: 'pixels',
        //     radiusScale: 1,
        //     radiusMinPixels: 1,
        //     radiusMaxPixels: 100,
        //     getPosition: feature => [feature.Longitude, feature.Latitude],
        //     getRadius: d => zoom,
        //     getFillColor: d => [120, 0, 0],
        // }),
        // new TextLayer({
        //     id: 'text-layer',
        //     data: `${process.env.PUBLIC_URL}/aq_data/aq_data.json`,
        //     getPosition: feature => [feature.Longitude, feature.Latitude],
        //     getText: feature => `${Math.round(feature[AQ_COL]*10)/10}`,
        //     getSize: zoom ** 2,
        //     getAngle: 0,
        //     getTextAnchor: 'middle',
        //     getAlignmentBaseline: 'center',
        //     sizeScale: 0.15,
        //     background: true,
        //     backgroundPadding: [5,0,5,0],
        //     getPixelOffset: [0, -10],
        //     getBorderColor: [0,0,0],
        //     getBorderWidth: 1,
        // })
    ]


    const view = new MapView({ repeat: true });
    // const handleSelectionBoxStart = () => {
    //     setBoxSelect(true)
    // }

    // const listener = (e) => {

    //     setBoxSelectDims(prev => {
    //         let x;
    //         let y;
    //         let width;
    //         let height;

    //         if (e.clientX < prev.ox) {
    //             x = e.clientX;
    //             width = prev.ox - e.clientX
    //         } else {
    //             x = prev.x;
    //             width = e.clientX - prev.x
    //         }

    //         if (e.clientY < prev.oy) {
    //             y = e.clientY;
    //             height = prev.oy - e.clientY
    //         } else {
    //             y = prev.y;
    //             height = e.clientY - prev.y
    //         }

    //         return { ...prev, x, y, width, height }
    //     })
    // }

    // const touchListener = (e) => {
    //     // setX(e?.targetTouches[0]?.clientX-15)
    //     // setY(e?.targetTouches[0]?.clientY-15)
    //     // console.log(e)
    // }

    // const removeListeners = () => {
    //     window.removeEventListener('touchmove', touchListener)
    //     window.removeEventListener('touchend', removeListeners)
    //     window.removeEventListener('mousemove', listener)
    //     window.removeEventListener('mouseup', removeListeners)
    //     setBoxSelectDims({
    //         x:-50,
    //         y:-50,
    //         ox:0,
    //         oy:0,
    //         width:0,
    //         height:0
    //     })
    //     setBoxSelect(false)
    // }

    // const handleBoxSelect = (e) => {
    //     try {
    //         if (e.type === 'mousedown') {
    //             setBoxSelectDims({
    //                 x:e.pageX,
    //                 y:e.pageY,
    //                 ox:e.pageX,
    //                 oy:e.pageY,
    //                 width:0,
    //                 height:0
    //             });
    //             window.addEventListener('touchmove', touchListener);
    //             window.addEventListener('touchend', removeListeners);
    //             window.addEventListener('mousemove', listener);
    //             window.addEventListener('mouseup', removeListeners);
    //         } else {

    //             const {x, y, width, height } = boxSelectDims;

    //             let layerIds = ['choropleth'];

    //             let features = deckRef.current.pickObjects(
    //                     {
    //                         x, y: y-50, width, height, layerIds
    //                     }
    //                 )
    //             let GeoidList = [];
    //             for (let i=0; i<features.length; i++) {                    
    //             }
    //             setHighlightGeog(GeoidList); 
    //             window.localStorage.setItem('SHARED_GEOID', GeoidList);
    //             window.localStorage.setItem('SHARED_VIEW', JSON.stringify(GetMapView()));
    //             setBoxSelectDims({});
    //             removeListeners();
    //             setBoxSelect(false)
    //         }
    //     } catch {
    //         console.log('bad selection')
    //     }
    // }
    return (
        <MapContainer
            // onKeyDown={handleKeyDown}
            // onKeyUp={handleKeyUp}
            // onMouseDown={e => boxSelect ? handleBoxSelect(e) : null}
            // onMouseUp={e => boxSelect ? handleBoxSelect(e) : null}
            infoPanel={panelState.info}
        >
            {/* {
                // boxSelectDims.hasOwnProperty('x') && 
                true && 
                <IndicatorBox style={{
                    left:boxSelectDims.x, 
                    top:boxSelectDims.y, 
                    width: boxSelectDims.width,
                    height: boxSelectDims.height}}
                    />
            } */}
            <DeckGL
                layers={layers}
                ref={deckRef}
                initialViewState={viewState}
                controller={
                    {
                        dragRotate: true,
                        dragPan: true,
                        doubleClickZoom: true,
                        touchZoom: true,
                        touchRotate: true,
                        keyboard: true,
                        scrollZoom: true,
                        inertia: 100
                    }
                }
                views={view}
                pickingRadius={20}
                onViewStateChange={e => {
                    queryViewport(e)
                    if (e?.viewState?.zoom !== e?.oldViewState?.zoom) setZoom(e.viewState.zoom)
                    hoverInfo.object && handleMapClick({ x: null, y: null, object: null })
                }}
                onViewportLoad={queryViewport}

            >
                <MapboxGLMap
                    reuseMaps
                    ref={mapRef}
                    mapStyle={'mapbox://styles/csds-hiplab/ckmuv80qn2b6o17ltels6z7ub?fresh=true'}
                    preventStyleDiffing={true}
                    mapboxApiAccessToken={MAPBOX_ACCESS_TOKEN}
                    on
                >
                </MapboxGLMap >
            </DeckGL>
            <MapButtonContainer
                infoPanel={panelState.info}
            >
                {/* <NavInlineButtonGroup>
                    <NavInlineButton
                        title="Selection Box"
                        id="boxSelect"
                        isActive={boxSelect}
                        onClick={() => handleSelectionBoxStart()}
                    >
                        {SVG.selectRect}
                    </NavInlineButton>
                </NavInlineButtonGroup> */}
                <NavInlineButtonGroup>
                    <NavInlineButton
                        title="Geolocate"
                        id="geolocate"
                        onClick={() => handleGeolocate()}
                    >
                        {SVG.locate}
                    </NavInlineButton>
                </NavInlineButtonGroup>

                <NavInlineButtonGroup>
                    <NavInlineButton

                        title="Zoom In"
                        id="zoomIn"
                        onClick={() => handleZoom(0.5)}
                    >
                        {SVG.plus}
                    </NavInlineButton>
                    <NavInlineButton
                        title="Zoom Out"
                        id="zoomOut"
                        onClick={() => handleZoom(-0.5)}
                    >
                        {SVG.minus}
                    </NavInlineButton>
                    <NavInlineButton
                        title="Reset Tilt"
                        id="resetTilt"
                        tilted={deckRef.current?.deck.viewState?.MapView?.bearing !== 0 || deckRef.current?.deck.viewState?.MapView?.pitch !== 0}
                        onClick={() => resetTilt()}
                    >
                        {SVG.compass}
                    </NavInlineButton>
                </NavInlineButtonGroup>
                {/* <NavInlineButtonGroup>
                    <NavInlineButton
                        title="Share this Map"
                        id="shareButton"
                        shareNotification={shared}
                        // onClick={() => handleShare({mapParams, dataParams, currentData, coords: GetMapView(), lastDateIndex: dateIndices[currentData][dataParams.numerator]})}
                    >
                        {SVG.share}
                    </NavInlineButton>
                </NavInlineButtonGroup>
                <ShareURL type="text" value="" id="share-url" /> */}
            </MapButtonContainer>
            <GeocoderContainer>
                <Geocoder
                    id="Geocoder"
                    placeholder={"Search by location"}
                    API_KEY={MAPBOX_ACCESS_TOKEN}
                    onChange={handleGeocoder}
                    height={45}
                />
            </GeocoderContainer>

            {hoverInfo.object && (
                <HoverDiv style={{ position: 'absolute', zIndex: 1, pointerEvents: 'none', left: hoverInfo.x, top: hoverInfo.y }}>
                    <MapTooltipContent content={hoverInfo.object} />
                </HoverDiv>
            )}
            <LogoContainer infoPanel={panelState.info}>
                <a href="https://herop.ssd.uchicago.edu/" target="_blank" rel="noopener noreferrer">
                    <img src={`${process.env.PUBLIC_URL}/herop_dark_logo_teal.png`} alt="" />
                </a>
            </LogoContainer>
        </MapContainer>
    )
}

export default MapSection