/**
 * @file serviceAreaZips.js
 * Static lookup table of US zip codes within Intermountain Healthcare's
 * service footprint: Utah (UT), Idaho (ID), Nevada (NV), Wyoming (WY),
 * Montana (MT), Colorado (CO), Kansas (KS).
 *
 * NOTE: In production this would contain the full ~20,000 zip code set
 * sourced from the SimpleMaps US zip code database or USPS data, filtered
 * to the 7 service states. We use a representative ~50-zip sample here
 * for the hackathon demo. The Set gives O(1) .has() lookup performance.
 */

/**
 * Set of zip codes covered by Intermountain Healthcare's service area.
 * Using a JS Set for O(1) membership testing on every form submission.
 * @type {Set<string>}
 */
export const SERVICE_AREA_ZIPS = new Set([
  // Utah — major population centers
  '84101', // Salt Lake City (downtown)
  '84102', // Salt Lake City (east side)
  '84103', // Salt Lake City (avenues)
  '84104', // Salt Lake City (west)
  '84105', // Salt Lake City (sugarhouse)
  '84106', // Salt Lake City (millcreek area)
  '84107', // Murray
  '84108', // Salt Lake City (east)
  '84109', // Millcreek
  '84111', // Salt Lake City (central)
  '84117', // Holladay
  '84120', // West Valley City
  '84121', // Cottonwood Heights
  '84403', // Ogden
  '84404', // Ogden (north)
  '84601', // Provo
  '84604', // Provo (east)
  '84321', // Logan
  '84770', // St. George
  '84780', // St. George (east)
  '84532', // Moab

  // Idaho — major population centers
  '83201', // Pocatello
  '83202', // Pocatello (south)
  '83401', // Idaho Falls
  '83402', // Idaho Falls (east)
  '83642', // Meridian
  '83702', // Boise (downtown)
  '83704', // Boise (north)
  '83709', // Boise (southwest)
  '83301', // Twin Falls
  '83686', // Nampa
  '83814', // Coeur d'Alene

  // Nevada — Intermountain presence areas
  '89101', // Las Vegas (downtown)
  '89102', // Las Vegas (west)
  '89103', // Las Vegas (south)
  '89119', // Las Vegas (southeast)
  '89501', // Reno (downtown)
  '89502', // Reno (south)

  // Wyoming — major population centers
  '82001', // Cheyenne
  '82009', // Cheyenne (east)
  '82601', // Casper
  '82701', // Newcastle
  '82801', // Sheridan

  // Montana — major population centers
  '59101', // Billings
  '59102', // Billings (west)
  '59401', // Great Falls
  '59601', // Helena
  '59801', // Missoula

  // Colorado — northern Colorado / Intermountain adjacent areas
  '80521', // Fort Collins
  '80525', // Fort Collins (south)
  '80301', // Boulder
  '80631', // Greeley
  '80501', // Longmont

  // Kansas — western Kansas service communities
  '67801', // Dodge City
  '67901', // Liberal
  '66801', // Emporia
  '67501', // Hutchinson
  '66442', // Junction City
]);

/**
 * Returns true if the given zip code falls within Intermountain Healthcare's
 * geographic service area. Drives the deterministic routing decision —
 * out-of-area requests are automatically routed to mail delivery.
 *
 * @param {string} zip - 5-digit US zip code
 * @returns {boolean} true if zip is in the service area
 */
export function isInServiceArea(zip) {
  return SERVICE_AREA_ZIPS.has(String(zip).trim());
}
