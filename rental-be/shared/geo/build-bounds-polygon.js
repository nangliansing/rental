// shared/geo/build-bounds-polygon.js
export const buildBoundsPolygon = ({ northEast, southWest }) => {
    return {
        type: "Polygon",
        coordinates: [
            [
                [southWest.lng, southWest.lat],
                [northEast.lng, southWest.lat],
                [northEast.lng, northEast.lat],
                [southWest.lng, northEast.lat],
                [southWest.lng, southWest.lat],
            ],
        ],
    };
};