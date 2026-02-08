const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export function julianDate(date = new Date()) {
    return date.getTime() / 86400000 + 2440587.5;
}

export function gmst(date = new Date()) {
    const jd = julianDate(date);
    const t = (jd - 2451545.0) / 36525;
    let theta =
        280.46061837 +
        360.98564736629 * (jd - 2451545) +
        0.000387933 * t * t -
        (t * t * t) / 38710000;
    theta %= 360;
    return theta < 0 ? theta + 360 : theta;
}

export function localSiderealTime(date, longitudeDeg) {
    return (gmst(date) + longitudeDeg + 360) % 360;
}

export function raHoursToDegrees(raHours) {
    return raHours * 15;
}

export function raDecToAltAz({ raHours, decDeg, latDeg, lonDeg, date = new Date() }) {
    const lstDeg = localSiderealTime(date, lonDeg);
    const haDeg = (lstDeg - raHoursToDegrees(raHours) + 360) % 360;

    const ha = haDeg * DEG;
    const dec = decDeg * DEG;
    const lat = latDeg * DEG;

    const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
    const alt = Math.asin(sinAlt);

    const cosAz = (Math.sin(dec) - Math.sin(alt) * Math.sin(lat)) / (Math.cos(alt) * Math.cos(lat));
    let az = Math.acos(Math.min(1, Math.max(-1, cosAz)));

    if (Math.sin(ha) > 0) {
        az = 2 * Math.PI - az;
    }

    return {
        altitudeDeg: alt * RAD,
        azimuthDeg: az * RAD,
        hourAngleDeg: haDeg,
        lstDeg
    };
}

export function guidanceDelta(targetAzDeg, targetAltDeg, headingDeg, cameraPitchDeg = 0) {
    const azDiff = ((targetAzDeg - headingDeg + 540) % 360) - 180;
    const altDiff = targetAltDeg - cameraPitchDeg;
    return { azDiff, altDiff };
}
