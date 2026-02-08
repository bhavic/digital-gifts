import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import crypto from 'node:crypto';
import sgMail from '@sendgrid/mail';

// INLINED DATA: Prevents file loading errors in production
const stars = [
    { "id": "HR-7001", "displayName": "Asteria Prime", "raHours": 14.6601, "decDeg": -60.8339 },
    { "id": "HR-2491", "displayName": "Velorum Echo", "raHours": 8.1589, "decDeg": -47.3366 },
    { "id": "HR-8728", "displayName": "Nyx Beacon", "raHours": 22.1372, "decDeg": -46.9609 },
    { "id": "HR-3982", "displayName": "Orionis Lumen", "raHours": 10.1234, "decDeg": 11.9672 },
    { "id": "HR-1457", "displayName": "Selene Arc", "raHours": 4.5987, "decDeg": 16.5092 }
];

initializeApp();
const db = getFirestore();

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

function verifyShopifyWebhook(rawBody, hmacHeader) {
    const digest = crypto
        .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
        .update(rawBody, 'utf8')
        .digest('base64');
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader || ''));
}

async function assignUniqueStar(orderId) {
    const assignmentsRef = db.collection('starAssignments').doc(String(orderId));
    return db.runTransaction(async (tx) => {
        const existing = await tx.get(assignmentsRef);
        if (existing.exists) return existing.data();

        const used = await tx.get(db.collection('starAssignments'));
        const usedStarIds = new Set(used.docs.map((doc) => doc.data().star.id));
        const available = stars.find((star) => !usedStarIds.has(star.id));

        if (!available) {
            throw new Error('No stars available in catalog.');
        }

        const payload = {
            orderId,
            star: available,
            assignedAt: FieldValue.serverTimestamp()
        };
        tx.set(assignmentsRef, payload);
        return payload;
    });
}

function buildOrderSlug(orderId, starId) {
    return `star-${String(orderId).toLowerCase()}-${String(starId).toLowerCase()}`;
}

async function sendCertificateEmail({ toEmail, recipientName, certificatePageUrl, arUrl }) {
    await sgMail.send({
        to: toEmail,
        from: process.env.FROM_EMAIL,
        subject: 'Your Star Gift Page Is Ready ✨',
        html: `
      <h2>Hi ${recipientName}, your star page is live.</h2>
      <p>Open your private certificate page: <a href="${certificatePageUrl}">${certificatePageUrl}</a></p>
      <p>From that page, you can generate/download a PDF certificate anytime.</p>
      <p>AR reveal link: <a href="${arUrl}">${arUrl}</a></p>
    `
    });
}

export const shopifyOrderPaid = onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const hmacHeader = req.header('x-shopify-hmac-sha256');
    const rawBody = JSON.stringify(req.body);

    if (!verifyShopifyWebhook(rawBody, hmacHeader)) {
        res.status(401).send('Invalid signature');
        return;
    }

    try {
        const order = req.body;
        const orderId = order.id;
        const line = order.line_items?.[0] || {};
        const props = Object.fromEntries((line.properties || []).map((p) => [p.name, p.value]));

        const recipientName = props._Recipient_Name || order.customer?.first_name || 'Stargazer';
        const dedicationStarName = props._Star_Name || 'Asteria Prime';
        const personalMessage = props._Personal_Message || '';

        const assignment = await assignUniqueStar(orderId);
        const star = assignment.star;

        const uniqueId = `${orderId}-${star.id}`;
        const rootDomain = process.env.ROOT_DOMAIN || 'auragifts.online';
        const certificatePageUrl = `https://${rootDomain}/certificate-viewer/certificate-page.html?id=${uniqueId}`;
        const arUrl = `https://${rootDomain}/certificate-viewer/index.html?id=${uniqueId}`;

        await db.collection('registry').doc(uniqueId).set({
            uniqueId,
            orderId,
            slug: uniqueId, // slug is now same as uniqueId for simplicity
            recipientName,
            dedicationStarName,
            personalMessage,
            star,
            arUrl,
            certificatePageUrl,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            createdAt: FieldValue.serverTimestamp()
        });

        const customerEmail = order.email || order.customer?.email;
        if (customerEmail) {
            await sendCertificateEmail({ toEmail: customerEmail, recipientName, certificatePageUrl, arUrl });
        }

        res.status(200).json({ ok: true, uniqueId, certificatePageUrl, arUrl });
    } catch (error) {
        console.error(error);
        res.status(500).send('Webhook processing failed');
    }
});
