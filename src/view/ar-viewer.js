import { raDecToAltAz, guidanceDelta } from '../shared/celestialMath.js';

// Get star ID from URL
function getStarId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || 'demo-hr-7001';
}

// Fetch star data from registry (mock for now)
async function fetchStarData(uniqueId) {
    // In production, fetch from Firebase/API
    const mock = {
        uniqueId,
        recipientName: 'Your Recipient',
        dedicationStarName: 'Asteria Prime',
        star: {
            id: 'HR-7001',
            displayName: 'Asteria Prime',
            raHours: 14.6601,
            decDeg: -60.8339
        }
    };
    return mock;
}

// State
let starData = null;
let userLocation = null;
let deviceHeading = 0;
let devicePitch = 0;

// DOM Elements
const starNameEl = document.getElementById('starName');
const coordinatesEl = document.getElementById('coordinates');
const arrowEl = document.getElementById('arrow');
const directionEl = document.getElementById('direction');
const altDisplayEl = document.getElementById('altDisplay');
const azDisplayEl = document.getElementById('azDisplay');
const starEntity = document.getElementById('starEntity');
const starLabel = document.getElementById('starLabel');

// Request device orientation permission (iOS)
async function requestOrientationPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceOrientationEvent.requestPermission();
            return permission === 'granted';
        } catch (e) {
            console.error('Orientation permission denied:', e);
            return false;
        }
    }
    return true; // Non-iOS or doesn't require permission
}

// Get user's GPS location
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            (err) => reject(err),
            { enableHighAccuracy: true }
        );
    });
}

// Handle device orientation
function handleOrientation(event) {
    // Alpha = compass heading (0-360)
    // Beta = front-back tilt (-180 to 180)
    // Gamma = left-right tilt (-90 to 90)

    if (event.webkitCompassHeading !== undefined) {
        // iOS
        deviceHeading = event.webkitCompassHeading;
    } else if (event.alpha !== null) {
        // Android - alpha is relative to arbitrary start, need absolute
        deviceHeading = (360 - event.alpha) % 360;
    }

    devicePitch = event.beta || 0;

    updateGuidance();
}

// Calculate and display guidance
function updateGuidance() {
    if (!starData || !userLocation) return;

    const { star } = starData;
    const now = new Date();

    // Calculate star position
    const { altitudeDeg, azimuthDeg } = raDecToAltAz({
        raHours: star.raHours,
        decDeg: star.decDeg,
        latDeg: userLocation.lat,
        lonDeg: userLocation.lon,
        date: now
    });

    // Update displays
    altDisplayEl.textContent = `Alt: ${altitudeDeg.toFixed(1)}°`;
    azDisplayEl.textContent = `Az: ${azimuthDeg.toFixed(1)}°`;

    // Calculate guidance delta
    const { azDiff, altDiff } = guidanceDelta(azimuthDeg, altitudeDeg, deviceHeading, devicePitch);

    // Update arrow rotation
    const arrowRotation = Math.atan2(azDiff, altDiff) * (180 / Math.PI);
    arrowEl.style.transform = `rotate(${arrowRotation}deg)`;

    // Update direction text
    const distance = Math.sqrt(azDiff * azDiff + altDiff * altDiff);
    if (distance < 10) {
        directionEl.textContent = '✨ Star found! Look here!';
        directionEl.className = 'text-green-400 text-sm mt-2 font-bold';
        starEntity.setAttribute('visible', 'true');
    } else if (altitudeDeg < 0) {
        directionEl.textContent = 'Star is below the horizon';
        directionEl.className = 'text-red-400 text-sm mt-2';
        starEntity.setAttribute('visible', 'false');
    } else {
        directionEl.textContent = `Turn ${Math.abs(azDiff).toFixed(0)}° ${azDiff > 0 ? 'right' : 'left'}`;
        directionEl.className = 'text-white text-sm mt-2';
        starEntity.setAttribute('visible', 'false');
    }

    // Position star entity in A-Frame scene
    // Convert Alt/Az to Cartesian for A-Frame
    const azRad = (azimuthDeg - deviceHeading) * (Math.PI / 180);
    const altRad = altitudeDeg * (Math.PI / 180);
    const distance3D = 10; // Fixed distance for visual

    const x = distance3D * Math.cos(altRad) * Math.sin(azRad);
    const y = distance3D * Math.sin(altRad);
    const z = -distance3D * Math.cos(altRad) * Math.cos(azRad);

    starEntity.setAttribute('position', `${x} ${y} ${z}`);
}

// Initialize
async function boot() {
    try {
        const uniqueId = getStarId();

        // Fetch star data
        starData = await fetchStarData(uniqueId);
        starNameEl.textContent = starData.dedicationStarName;
        starLabel.setAttribute('value', starData.dedicationStarName);
        coordinatesEl.textContent = `RA ${starData.star.raHours.toFixed(2)}h · Dec ${starData.star.decDeg.toFixed(2)}°`;

        // Request permissions
        await requestOrientationPermission();

        // Get location
        directionEl.textContent = 'Getting your location...';
        userLocation = await getUserLocation();

        // Start orientation tracking
        window.addEventListener('deviceorientation', handleOrientation, true);

        // Start update loop
        setInterval(updateGuidance, 100);

        directionEl.textContent = 'Point your camera at the sky';

    } catch (error) {
        console.error('Boot error:', error);
        directionEl.textContent = `Error: ${error.message}`;
        directionEl.className = 'text-red-400 text-sm mt-2';
    }
}

boot();
