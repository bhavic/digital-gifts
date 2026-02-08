function getLookupKeys() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    const host = window.location.hostname;
    const subdomain = host.split('.')[0];

    return { id, subdomain };
}

async function fetchRegistryRecord({ id, subdomain }) {
    // Replace with production API endpoint that resolves by ID or subdomain slug.
    // Example: `/api/registry?slug=${subdomain}`
    const mock = {
        uniqueId: id || 'demo-hr-7001',
        slug: subdomain || 'demo',
        recipientName: 'Your Recipient',
        dedicationStarName: 'Asteria Prime',
        personalMessage: 'May this star remind you how bright your dreams are.',
        star: { raHours: 14.6601, decDeg: -60.8339 },
        arUrl: `${window.location.origin}/view?id=${encodeURIComponent(id || 'demo-hr-7001')}`
    };

    return mock;
}

function populateCertificate(record) {
    document.getElementById('certStarName').textContent = record.dedicationStarName || record.star?.displayName || 'Named Star';
    document.getElementById('certRecipient').textContent = record.recipientName || 'Recipient';
    document.getElementById('certMessage').textContent = record.personalMessage || '';
    document.getElementById('certCoords').textContent = `RA ${record.star?.raHours ?? '--'}h · Dec ${record.star?.decDeg ?? '--'}°`;

    const arLink = document.getElementById('certArLink');
    arLink.href = record.arUrl || '#';
    arLink.textContent = record.arUrl || '--';
}

async function boot() {
    const keys = getLookupKeys();
    const record = await fetchRegistryRecord(keys);
    populateCertificate(record);
}

document.getElementById('downloadPdf').addEventListener('click', () => {
    window.print();
});

boot().catch((error) => {
    console.error(error);
});
