type GeoNamesPostalCodeResult = {
    postalCode?: string;
};

const GEONAMES_POSTAL_SEARCH_URL = "https://secure.geonames.org/postalCodeSearchJSON";
const USER_AGENT = "next-crm/1.0 (service-area-zip-generator-geonames)";
const MAX_ZIP_CODES = 20;
const GEONAMES_USERNAME = process.env.GEONAMES_USERNAME?.trim();

function normalizeZip(raw: string) {
    const value = raw.trim();
    if (!value) return null;
    return value.length > 20 ? value.slice(0, 20) : value;
}

function extractPostalCodes(text: string) {
    return text
        .split(/[;,/|]+/g)
        .map(normalizeZip)
        .filter((value): value is string => Boolean(value));
}

async function fetchPostalCodesFromGeoNames(placeName: string) {
    if (!GEONAMES_USERNAME) return [];

    const params = new URLSearchParams({
        placename: placeName,
        maxRows: String(MAX_ZIP_CODES),
        username: GEONAMES_USERNAME,
    });

    const response = await fetch(`${GEONAMES_POSTAL_SEARCH_URL}?${params.toString()}`, {
        headers: {
            "User-Agent": USER_AGENT,
            Accept: "application/json",
        },
        cache: "no-store",
    });

    const data = await response.json();
    console.log("[ZIP-GENERATOR] GeoNames postalCodeSearch response:", JSON.stringify(data, null, 2));

    if (!response.ok || !data || !Array.isArray(data.postalCodes)) {
        return [];
    }

    const zipSet = new Set<string>();
    for (const entry of data.postalCodes as GeoNamesPostalCodeResult[]) {
        const values = extractPostalCodes(String(entry?.postalCode ?? ""));
        for (const zip of values) {
            zipSet.add(zip);
            if (zipSet.size >= MAX_ZIP_CODES) {
                return Array.from(zipSet);
            }
        }
    }

    return Array.from(zipSet).slice(0, MAX_ZIP_CODES);
}

export async function getZipCodesForLocation(locationName: string) {
    const location = locationName.trim();
    if (!location) return [];
    if (!GEONAMES_USERNAME) {
        console.error("[ZIP-GENERATOR] Missing GEONAMES_USERNAME environment variable.");
        return [];
    }

    try {
        return await fetchPostalCodesFromGeoNames(location);
    } catch (error) {
        console.error("[ZIP-GENERATOR] Failed to fetch zip codes from GeoNames:", error);
        return [];
    }
}

export async function generateZipCodesForServiceArea(areaName: string) {
    return getZipCodesForLocation(areaName);
}
