/**
 * Pure helpers for journal entry dates, locations, and sort order.
 * Kept separate from Firebase/UI for unit testing.
 */

export function toDisplayText(value, fallback = "") {
    if (value === null || value === undefined) {
        return fallback;
    }
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    if (value instanceof Date) {
        return value.toISOString().slice(0, 19).replace("T", " ");
    }
    if (typeof value === "object" && typeof value.toDate === "function") {
        const date = value.toDate();
        if (date instanceof Date && !Number.isNaN(date.getTime())) {
            return date.toISOString().slice(0, 19).replace("T", " ");
        }
    }
    return fallback;
}

export function looksLikeGpsCoordinate(value) {
    if (typeof value !== "string") {
        return false;
    }
    return /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(value.trim());
}

export function canonicalizeStoredCaptureDate(raw) {
    const s = toDisplayText(raw, "").trim();
    if (!s) {
        return "";
    }
    if (/^\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}/.test(s)) {
        return s;
    }
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) {
        return `${m[1]} 00:00:00`;
    }
    return s;
}

export function extractTimeFromCanonical(canonical) {
    const s = (canonical || "").trim();
    const m = s.match(/^\d{4}-\d{2}-\d{2}\s+(.+)$/);
    if (m) {
        const t = m[1].trim();
        return t || "00:00:00";
    }
    return "00:00:00";
}

export function mergeCaptureDateFromEditor(editorValue, dateMode, previousCanonical) {
    const prev = canonicalizeStoredCaptureDate(previousCanonical);
    const v = (editorValue || "").trim();
    if (dateMode === "date-only") {
        if (!v) {
            return "";
        }
        const dm = v.match(/^(\d{4}-\d{2}-\d{2})/);
        if (!dm) {
            return v;
        }
        const timePart = prev ? extractTimeFromCanonical(prev) : "00:00:00";
        return `${dm[1]} ${timePart}`;
    }
    if (!v) {
        return "";
    }
    return v;
}

export function buildEntryLocationUpdate(trimmed, locationMode, coordsStored, cityStored) {
    const coords = toDisplayText(coordsStored, "").trim();
    const citySt = toDisplayText(cityStored, "").trim();
    if (locationMode === "gps") {
        if (!trimmed) {
            return { locationText: "", locationCoords: "", locationCityState: citySt };
        }
        if (looksLikeGpsCoordinate(trimmed)) {
            return { locationText: trimmed, locationCoords: trimmed, locationCityState: citySt };
        }
        return { locationText: trimmed, locationCoords: coords, locationCityState: citySt };
    }
    if (!trimmed) {
        return { locationText: "", locationCityState: "", locationCoords: coords };
    }
    return { locationText: trimmed, locationCityState: trimmed, locationCoords: coords };
}

export function getEntrySortTimestamp(entry) {
    const captureRaw = toDisplayText(entry?.captureDate, "").trim();
    if (captureRaw) {
        const normalized = captureRaw.includes("T") ? captureRaw : captureRaw.replace(" ", "T");
        const parsedMs = Date.parse(normalized);
        if (Number.isFinite(parsedMs)) {
            return parsedMs;
        }
    }
    const createdAtSeconds = entry?.createdAt?.seconds;
    if (Number.isFinite(createdAtSeconds)) {
        return createdAtSeconds * 1000;
    }
    return Number(entry?.orderIndex) || 0;
}

export function sortEntriesForViewer(entries, mode) {
    if (mode === "custom") {
        return [...entries].sort((a, b) => {
            const orderA = Number(a?.orderIndex) || 0;
            const orderB = Number(b?.orderIndex) || 0;
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            return String(a.id).localeCompare(String(b.id));
        });
    }
    const normalizedMode = mode === "earliest-first" ? "earliest-first" : "latest-first";
    const sorted = [...entries].sort((a, b) => {
        const tsA = getEntrySortTimestamp(a);
        const tsB = getEntrySortTimestamp(b);
        if (tsA === tsB) {
            const orderA = Number(a?.orderIndex) || 0;
            const orderB = Number(b?.orderIndex) || 0;
            return orderA - orderB;
        }
        return normalizedMode === "earliest-first" ? tsA - tsB : tsB - tsA;
    });
    return sorted;
}
