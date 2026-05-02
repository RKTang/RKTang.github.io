import test from "node:test";
import assert from "node:assert/strict";
import {
    canonicalizeStoredCaptureDate,
    mergeCaptureDateFromEditor,
    buildEntryLocationUpdate,
    sortEntriesForViewer,
    getEntrySortTimestamp,
    normalizeCaptureDateForStorage
} from "./journal-logic.js";

test("canonicalizeStoredCaptureDate adds midnight for date-only ISO", () => {
    assert.equal(canonicalizeStoredCaptureDate("2025-08-09"), "2025-08-09 00:00:00");
});

test("mergeCaptureDateFromEditor keeps prior time in date-only mode", () => {
    assert.equal(
        mergeCaptureDateFromEditor("2025-01-15", "date-only", "2024-06-01 14:30:45"),
        "2025-01-15 14:30:45"
    );
});

test("mergeCaptureDateFromEditor uses full string in date-time mode", () => {
    assert.equal(
        mergeCaptureDateFromEditor("2025-01-15 09:00:01", "date-time", "2024-06-01 00:00:00"),
        "2025-01-15 09:00:01"
    );
});

test("normalizeCaptureDateForStorage converts display slash to space", () => {
    assert.equal(normalizeCaptureDateForStorage("2025-07-19 / 18:21:04"), "2025-07-19 18:21:04");
    assert.equal(normalizeCaptureDateForStorage("2025-07-19  18:21:04"), "2025-07-19  18:21:04");
});

test("mergeCaptureDateFromEditor normalizes slash in date-time mode", () => {
    assert.equal(
        mergeCaptureDateFromEditor("2025-01-15 / 09:00:01", "date-time", ""),
        "2025-01-15 09:00:01"
    );
});

test("buildEntryLocationUpdate keeps coords for freeform text in gps mode", () => {
    const out = buildEntryLocationUpdate("grandma's house", "gps", "43.5, -79.6", "Toronto, ON");
    assert.equal(out.locationText, "grandma's house");
    assert.equal(out.locationCoords, "43.5, -79.6");
    assert.equal(out.locationCityState, "Toronto, ON");
});

test("buildEntryLocationUpdate updates coords when value looks like GPS", () => {
    const out = buildEntryLocationUpdate("44.0, -80.0", "gps", "43.5, -79.6", "");
    assert.equal(out.locationCoords, "44.0, -80.0");
    assert.equal(out.locationText, "44.0, -80.0");
});

test("sortEntriesForViewer custom uses orderIndex then id", () => {
    const entries = [
        { id: "b", orderIndex: 1 },
        { id: "a", orderIndex: 0 },
        { id: "c", orderIndex: 1 }
    ];
    const sorted = sortEntriesForViewer(entries, "custom");
    assert.deepEqual(
        sorted.map((e) => e.id),
        ["a", "b", "c"]
    );
});

test("sortEntriesForViewer latest-first orders by captureDate", () => {
    const entries = [
        { id: "old", captureDate: "2025-01-01 12:00:00", orderIndex: 0 },
        { id: "new", captureDate: "2025-06-01 12:00:00", orderIndex: 1 }
    ];
    const sorted = sortEntriesForViewer(entries, "latest-first");
    assert.deepEqual(
        sorted.map((e) => e.id),
        ["new", "old"]
    );
});

test("getEntrySortTimestamp falls back to createdAt seconds", () => {
    const ts = getEntrySortTimestamp({ captureDate: "", createdAt: { seconds: 1700000000 } });
    assert.equal(ts, 1700000000 * 1000);
});
