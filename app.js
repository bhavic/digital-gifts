const canvas = document.getElementById("starfield");
const ctx = canvas.getContext("2d");
const mouse = { x: 0.5, y: 0.5 };

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

const stars = Array.from({ length: 260 }, () => ({
    x: Math.random(),
    y: Math.random(),
    z: Math.random() * 0.8 + 0.2,
    size: Math.random() * 1.8 + 0.4
}));

window.addEventListener("mousemove", (event) => {
    mouse.x = event.clientX / window.innerWidth;
    mouse.y = event.clientY / window.innerHeight;
});

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach((star) => {
        const parallaxX = (mouse.x - 0.5) * 40 * star.z;
        const parallaxY = (mouse.y - 0.5) * 40 * star.z;
        const x = star.x * canvas.width + parallaxX;
        const y = star.y * canvas.height + parallaxY;
        ctx.beginPath();
        ctx.arc(x, y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.5 + star.z * 0.5})`;
        ctx.fill();
    });
    requestAnimationFrame(draw);
}
draw();

const recipientInput = document.getElementById("recipientInput");
const recipientPreview = document.getElementById("recipientPreview");
recipientInput.addEventListener("input", () => {
    recipientPreview.textContent = recipientInput.value.trim() || "Your Recipient";
});

const plans = {
    digital: {
        label: "Digital Certificate",
        price: 499,
        variantId: "gid://shopify/ProductVariant/41033103605832"
    },
    ar: {
        label: "Digital + AR Reveal",
        price: 999,
        variantId: "gid://shopify/ProductVariant/41033103638600"
    }
};

const frameAddon = {
    label: "Physical Framed Certificate",
    price: 499,
    variantId: "gid://shopify/ProductVariant/41033117139016"
};

let selectedPlan = "digital";

const selectedPlanText = document.getElementById("selectedPlanText");
const totalPrice = document.getElementById("totalPrice");
const frameAddonCheckbox = document.getElementById("frameAddon");
const buyButton = document.getElementById("buyNow");
const buyStatus = document.getElementById("buyStatus");
const selectPlanButtons = document.querySelectorAll(".select-plan");

function updateSummary() {
    const plan = plans[selectedPlan];
    const addon = frameAddonCheckbox.checked ? frameAddon.price : 0;
    const total = plan.price + addon;

    selectedPlanText.textContent = `Selected Plan: ${plan.label} (INR ${plan.price})${addon ? ` + Frame (INR ${frameAddon.price})` : ""}`;
    totalPrice.textContent = `Total: INR ${total}`;
}

selectPlanButtons.forEach((button) => {
    button.addEventListener("click", () => {
        selectedPlan = button.closest(".plan-card").dataset.plan;
        updateSummary();
        document.getElementById("plans").scrollIntoView({ behavior: "smooth", block: "center" });
    });
});

frameAddonCheckbox.addEventListener("change", updateSummary);
updateSummary();

function loadMediaConfig() {
    const globalConfig = window.SHOPIFY_HOMEPAGE_MEDIA;
    if (Array.isArray(globalConfig)) {
        return globalConfig;
    }

    const configNode = document.getElementById("shopifyMediaConfig");
    if (!configNode) {
        return [];
    }

    try {
        return JSON.parse(configNode.textContent);
    } catch {
        return [];
    }
}

function renderGallery() {
    const galleryGrid = document.getElementById("galleryGrid");
    const mediaItems = loadMediaConfig();

    if (!mediaItems.length) {
        galleryGrid.innerHTML = '<p class="text-slate-400">No media configured yet. Add Shopify file URLs in the JSON config.</p>';
        return;
    }

    galleryGrid.innerHTML = mediaItems
        .map((item) => {
            const title = item.title || "Showcase";
            if (item.type === "video") {
                return `
          <article class="bg-slate-900/70 border border-slate-700 rounded-xl overflow-hidden">
            <video controls class="w-full h-52 object-cover" src="${item.url}"></video>
            <p class="p-3 text-sm">${title}</p>
          </article>
        `;
            }
            return `
        <article class="bg-slate-900/70 border border-slate-700 rounded-xl overflow-hidden">
          <img loading="lazy" class="w-full h-52 object-cover" src="${item.url}" alt="${title}" />
          <p class="p-3 text-sm">${title}</p>
        </article>
      `;
        })
        .join("");
}

renderGallery();

const shopifyClient = ShopifyBuy.buildClient({
    domain: 'auragifts.online',
    storefrontAccessToken: 'a7d907b446eab147330ecd0afb875470'
});

async function buyNow() {
    const plan = plans[selectedPlan];
    const recipient = recipientInput.value.trim();

    if (!recipient) {
        buyStatus.textContent = "Please enter a Recipient Name first.";
        buyStatus.classList.add("text-red-400");
        recipientInput.focus();
        return;
    }

    buyStatus.textContent = "Connecting to Secure Checkout...";
    buyStatus.classList.remove("text-red-400");

    try {
        const checkout = await shopifyClient.checkout.create();

        const lineItemsToAdd = [
            {
                variantId: plan.variantId,
                quantity: 1,
                customAttributes: [
                    { key: "_Recipient_Name", value: recipient },
                    { key: "_Star_Name", value: "Asteria Prime" }, // Default or from input
                    { key: "_Personal_Message", value: "A gift from the heavens." }
                ]
            }
        ];

        if (frameAddonCheckbox.checked) {
            lineItemsToAdd.push({
                variantId: frameAddon.variantId,
                quantity: 1
            });
        }

        await shopifyClient.checkout.addLineItems(checkout.id, lineItemsToAdd);

        buyStatus.textContent = "Redirecting to Payment...";
        window.location.href = checkout.webUrl;
    } catch (error) {
        console.error("Shopify Error:", error);
        buyStatus.textContent = "Checkout Error: " + error.message;
        buyStatus.classList.add("text-red-400");
    }
}

buyButton.addEventListener("click", buyNow);
