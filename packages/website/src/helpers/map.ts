/* eslint-disable fp/no-mutation */
import { isEqual, mean, meanBy, minBy } from 'lodash';
import L, { LatLng, LatLngBounds, Polygon as LeafletPolygon } from 'leaflet';
import makeStyles from '@mui/styles/makeStyles';

import type { Point, SurveyPoints, Polygon, Position } from 'store/Sites/types';
import { CollectionDetails } from 'store/Collection/types';
import { spotter } from '../assets/spotter';
import { spotterSelected } from '../assets/spotterSelected';
import { spotterAnimation } from '../assets/spotterAnimation';
import { hobo } from '../assets/hobo';
import { hoboSelected } from '../assets/hoboSelected';

/**
 * Get the middle point of a polygon (average of all points). Returns the point itself if input isn't a polygon.
 */
export const getMiddlePoint = (point: Point | Polygon): Position => {
  if (point.type === 'Point') {
    return point.coordinates;
  }

  const coordArray = point.coordinates[0];
  const lngArray = coordArray.map((item) => item[0]);
  const latArray = coordArray.map((item) => item[1]);

  const lngMean = mean(lngArray);
  const latMean = mean(latArray);

  return [lngMean, latMean];
};

export const samePosition = (
  polygon1: Polygon | Point,
  polygon2: Polygon | Point,
) => {
  const coords1 =
    polygon1.type === 'Polygon'
      ? getMiddlePoint(polygon1)
      : polygon1.coordinates;
  const coords2 =
    polygon2.type === 'Polygon'
      ? getMiddlePoint(polygon2)
      : polygon2.coordinates;

  return isEqual(coords1, coords2);
};

export const getCollectionCenterAndBounds = (
  collection?: CollectionDetails,
): [LatLng | undefined, LatLngBounds | undefined] => {
  if (!collection) {
    return [undefined, undefined];
  }

  const coordinates = collection.sites.map((item) =>
    getMiddlePoint(item.polygon),
  );

  const center = new LatLng(
    meanBy(coordinates, (item) => item[1]),
    meanBy(coordinates, (item) => item[0]),
  );

  const bounds =
    coordinates.length > 1
      ? new LeafletPolygon(
          coordinates.map((item) => new LatLng(item[1], item[0])),
        ).getBounds()
      : undefined;

  return [center, bounds];
};

// TODO - Use geolib to calculate distance and other things
/**
 * Returns the distance between two points in radians
 */
export const radDistanceCalculator = (point1: Position, point2: Position) => {
  const [lng1, lat1] = point1;
  const [lng2, lat2] = point2;

  if (lat1 === lat2 && lng1 === lng2) {
    return 0;
  }

  const radLat1 = (Math.PI * lat1) / 180;
  const radlat2 = (Math.PI * lat2) / 180;
  const theta = lng1 - lng2;
  const radtheta = (Math.PI * theta) / 180;

  const dist =
    Math.sin(radLat1) * Math.sin(radlat2) +
    Math.cos(radLat1) * Math.cos(radlat2) * Math.cos(radtheta);

  return Math.acos(dist > 1 ? 1 : dist);
};

export const findClosestSurveyPoint = (
  sitePolygon?: Polygon | Point,
  points?: SurveyPoints[],
) => {
  if (!sitePolygon || !points) {
    return undefined;
  }

  const [siteLng, siteLat] =
    sitePolygon.type === 'Polygon'
      ? getMiddlePoint(sitePolygon)
      : sitePolygon.coordinates;

  const closestPoint = minBy(
    points.filter((item) => item.polygon),
    (point) => {
      const polygon = point.polygon as Polygon | Point;
      return radDistanceCalculator(
        [siteLng, siteLat],
        polygon.type === 'Point'
          ? polygon.coordinates
          : getMiddlePoint(polygon),
      );
    },
  );

  // if there is no closestPoint - return the first one by id.
  const resultingPoint = closestPoint || minBy(points, 'id');

  return {
    ...resultingPoint,
    id: resultingPoint?.id.toString(),
    name: resultingPoint?.name || undefined,
  };
};

const useMarkerStyles = makeStyles({
  spotterIconWrapper: {},
  hoboIcon: {
    height: 'inherit',
    width: 'inherit',
  },
  spotterIconSteady: {
    height: 'inherit',
    width: 'inherit',
    position: 'relative',
    left: 0,
    right: 0,
    top: '-100%',
  },
  spotterIconBlinking: {
    width: 'inherit',
    height: 'inherit',
    WebkitAnimationName: 'pulse',
    WebkitAnimationDuration: '2s',
    WebkitAnimationIterationCount: 'infinite',
    animationName: 'pulse',
    animationDuration: '2s',
    animationIterationCount: 'infinite',
    transformOrigin: '50% 65%',
  },
});

export const buoyIcon = (iconUrl: string) =>
  new L.Icon({
    iconUrl,
    iconSize: [24, 27],
    iconAnchor: [12, 27],
    popupAnchor: [0, -28],
  });

export const useSensorIcon = (
  sensor: 'spotter' | 'hobo',
  selected: boolean,
  color: string,
) => {
  const classes = useMarkerStyles();
  const iconWidth = sensor === 'spotter' ? 15 : 20;
  const iconHeight = sensor === 'spotter' ? 15 : 20;
  return L.divIcon({
    iconSize: [iconWidth, iconHeight],
    iconAnchor: [iconWidth / 2, 0],
    html:
      sensor === 'spotter'
        ? `
          <div class=${classes.spotterIconBlinking}>
            ${spotterAnimation(color)}
          </div>
          <div class=${classes.spotterIconSteady}>
            ${selected ? spotterSelected(color) : spotter(color)}
          </div>
        `
        : `
          <div class=${classes.hoboIcon}>
            ${selected ? hoboSelected(color) : hobo(color)}
          </div>
        `,
    className: classes.spotterIconWrapper,
  });
};

export const useMarkerIcon = (
  hasSpotter: boolean,
  hasHobo: boolean,
  selected: boolean,
  color: string,
  iconUrl: string,
) => {
  const sensorIcon = useSensorIcon(
    hasSpotter ? 'spotter' : 'hobo',
    selected,
    color,
  );
  if (hasSpotter || hasHobo) return sensorIcon;
  return buoyIcon(iconUrl);
};

/**
 * Calculate the adjusted longitude for map display, handling wrap-around.
 * Ensures the map flies to the closest longitude copy (-360, 0, +360) to the current view.
 */
export const calculateAdjustedLng = (
  map: L.Map | null,
  targetLng: number,
): number => {
  if (!map) return targetLng;
  const currentCenter = map.getCenter();
  const mapLng = currentCenter.lng;
  let adjustedLng = targetLng;

  // Check if the difference requires wrapping around the date line
  const lngDiff = Math.abs(mapLng - targetLng);
  if (lngDiff > 180) {
    if (mapLng < 0 && targetLng > 0) {
      // Map center is west, target is east: Choose targetLng - 360
      adjustedLng = targetLng - 360;
    } else if (mapLng > 0 && targetLng < 0) {
      // Map center is east, target is west: Choose targetLng + 360
      adjustedLng = targetLng + 360;
    } else if (
      Math.abs(mapLng - (targetLng - 360)) <
      Math.abs(mapLng - (targetLng + 360))
    ) {
      // If map center/target have same sign OR one is 0, but diff > 180:
      // Determine which offset copy (-360 or +360) is closer. Choose -360.
      adjustedLng = targetLng - 360;
    } else {
      // If map center/target have same sign OR one is 0, but diff > 180:
      // Determine which offset copy (-360 or +360) is closer. Choose +360.
      adjustedLng = targetLng + 360;
    }
  }
  // If lngDiff <= 180, adjustedLng remains targetLng (no wrapping needed)

  return adjustedLng;
};
