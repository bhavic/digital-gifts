import { describe, it } from 'node:test';
import assert from 'node:assert';
import { julianDate, gmst, localSiderealTime, raDecToAltAz, guidanceDelta } from '../src/shared/celestialMath.js';

describe('celestialMath', () => {
    it('julianDate returns correct JD for J2000 epoch', () => {
        const j2000 = new Date('2000-01-01T12:00:00Z');
        const jd = julianDate(j2000);
        assert.ok(Math.abs(jd - 2451545.0) < 0.0001, `Expected ~2451545, got ${jd}`);
    });

    it('gmst returns value in 0-360 range', () => {
        const theta = gmst(new Date());
        assert.ok(theta >= 0 && theta < 360, `GMST out of range: ${theta}`);
    });

    it('localSiderealTime adds longitude correctly', () => {
        const date = new Date('2024-01-01T00:00:00Z');
        const lst0 = localSiderealTime(date, 0);
        const lst90 = localSiderealTime(date, 90);
        const diff = (lst90 - lst0 + 360) % 360;
        assert.ok(Math.abs(diff - 90) < 0.001, `Expected 90 deg difference, got ${diff}`);
    });

    it('raDecToAltAz returns valid altAz for Polaris from Northern latitude', () => {
        // Polaris: RA ~2.5h, Dec ~89.3°
        const result = raDecToAltAz({
            raHours: 2.5,
            decDeg: 89.3,
            latDeg: 40,
            lonDeg: -74,
            date: new Date('2024-06-15T22:00:00Z')
        });
        // Polaris should always be high in the sky from lat 40N
        assert.ok(result.altitudeDeg > 30, `Polaris altitude too low: ${result.altitudeDeg}`);
        assert.ok(result.azimuthDeg >= 0 && result.azimuthDeg < 360, `Azimuth out of range: ${result.azimuthDeg}`);
    });

    it('guidanceDelta computes correct horizontal difference', () => {
        const { azDiff, altDiff } = guidanceDelta(90, 45, 80, 40);
        assert.strictEqual(azDiff, 10);
        assert.strictEqual(altDiff, 5);
    });

    it('guidanceDelta wraps correctly across 360/0 boundary', () => {
        const { azDiff } = guidanceDelta(10, 0, 350, 0);
        assert.strictEqual(azDiff, 20);
    });
});
