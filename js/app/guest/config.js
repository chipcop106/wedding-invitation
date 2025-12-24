export const configLoader = (() => {
    /**
     * @type {object|null}
     */
    let currentConfig = null;

    /**
     * Get query parameter value
     * @param {string} name
     * @returns {string|null}
     */
    const getQueryParam = (name) => {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    };

    /**
     * Load config from JSON file
     * @param {string} gender - 'male' or 'female'
     * @returns {Promise<object>}
     */
    const loadConfig = async (gender = "male") => {
        try {
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            const response = await fetch("./config.json", {
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(
                    `Failed to load config: ${response.statusText}`
                );
            }
            const allConfigs = await response.json();
            const config = allConfigs[gender] || allConfigs.male;
            currentConfig = config;
            return config;
        } catch (error) {
            if (error.name === "AbortError") {
                console.warn("Config loading timed out, using defaults");
            } else {
                console.warn("Error loading config, using defaults:", error);
            }
            // Return default config if loading fails
            return currentConfig || {};
        }
    };

    /**
     * Apply config to HTML elements
     * @param {object} config
     * @returns {void}
     */
    const applyConfig = (config) => {
        if (!config || !document.body) {
            return;
        }

        // Double-check DOM is ready
        if (document.readyState === "loading") {
            console.warn("DOM not ready, skipping config application");
            return;
        }

        // Helper function to safely set innerHTML
        const safeSetInnerHTML = (element, value) => {
            // Multiple null checks
            if (!element) {
                return false;
            }
            if (!value) {
                return false;
            }
            // Verify element is still in DOM and is a valid element
            try {
                if (!document.body || !document.body.contains(element)) {
                    console.warn(
                        "Element not in DOM, skipping innerHTML update"
                    );
                    return false;
                }
                // Final check - verify element is still valid
                if (element.nodeType !== Node.ELEMENT_NODE) {
                    console.warn("Element is not a valid element node");
                    return false;
                }
                element.innerHTML = value;
                return true;
            } catch (error) {
                console.warn("Failed to set innerHTML:", error, element);
                return false;
            }
        };

        // Update title
        if (config.title) {
            document.title = config.title;
            const ogTitle = document.querySelector('meta[property="og:title"]');
            if (ogTitle) ogTitle.setAttribute("content", config.title);
        }

        // Update couple names
        const coupleNameElements = document.querySelectorAll(
            '[data-config="coupleNames"]'
        );
        coupleNameElements.forEach((el) => {
            el.textContent = config.coupleNames || "";
        });

        // Update wedding date
        const weddingDateElements = document.querySelectorAll(
            '[data-config="weddingDate"]'
        );
        weddingDateElements.forEach((el) => {
            el.textContent = config.weddingDate || "";
        });

        // Update wedding time
        if (config.weddingTime) {
            const body = document.body;
            body.setAttribute("data-time", config.weddingTime);
        }

        // Update groom information
        if (config.groom) {
            const groomName = document.querySelector(
                '[data-config="groom.name"]'
            );
            if (groomName) groomName.textContent = config.groom.name || "";

            const groomRelation = document.querySelector(
                '[data-config="groom.relation"]'
            );
            if (groomRelation)
                groomRelation.textContent = config.groom.relation || "";

            const groomFather = document.querySelector(
                '[data-config="groom.father"]'
            );
            if (groomFather)
                groomFather.textContent = config.groom.father || "";

            const groomMother = document.querySelector(
                '[data-config="groom.mother"]'
            );
            if (groomMother)
                groomMother.textContent = config.groom.mother || "";
        }

        // Update bride information
        if (config.bride) {
            const brideName = document.querySelector(
                '[data-config="bride.name"]'
            );
            if (brideName) brideName.textContent = config.bride.name || "";

            const brideRelation = document.querySelector(
                '[data-config="bride.relation"]'
            );
            if (brideRelation)
                brideRelation.textContent = config.bride.relation || "";

            const brideFather = document.querySelector(
                '[data-config="bride.father"]'
            );
            if (brideFather)
                brideFather.textContent = config.bride.father || "";

            const brideMother = document.querySelector(
                '[data-config="bride.mother"]'
            );
            if (brideMother)
                brideMother.textContent = config.bride.mother || "";
        }

        // Update wedding ceremony/reception
        if (config.wedding) {
            if (config.wedding.ceremony && config.wedding.ceremony.enabled) {
                const ceremonyTitle = document.querySelector(
                    '[data-config="wedding.ceremony.title"]'
                );
                if (ceremonyTitle)
                    ceremonyTitle.textContent =
                        config.wedding.ceremony.title || "";

                const ceremonyTime = document.querySelector(
                    '[data-config="wedding.ceremony.time"]'
                );
                if (ceremonyTime)
                    ceremonyTime.textContent =
                        config.wedding.ceremony.time || "";

                const ceremonySection = document.querySelector(
                    '[data-config-section="wedding.ceremony"]'
                );
                if (ceremonySection) ceremonySection.classList.remove("d-none");
            } else {
                const ceremonySection = document.querySelector(
                    '[data-config-section="wedding.ceremony"]'
                );
                if (ceremonySection) ceremonySection.classList.add("d-none");
            }

            if (config.wedding.reception && config.wedding.reception.enabled) {
                const receptionTitle = document.querySelector(
                    '[data-config="wedding.reception.title"]'
                );
                if (receptionTitle)
                    receptionTitle.textContent =
                        config.wedding.reception.title || "";

                const receptionTime = document.querySelector(
                    '[data-config="wedding.reception.time"]'
                );
                if (receptionTime)
                    receptionTime.textContent =
                        config.wedding.reception.time || "";

                const receptionSection = document.querySelector(
                    '[data-config-section="wedding.reception"]'
                );
                if (receptionSection)
                    receptionSection.classList.remove("d-none");
            } else {
                const receptionSection = document.querySelector(
                    '[data-config-section="wedding.reception"]'
                );
                if (receptionSection) receptionSection.classList.add("d-none");
            }
        }

        // Update location
        if (config.location) {
            const address = document.querySelector(
                '[data-config="location.address"]'
            );
            if (address) address.textContent = config.location.address || "";

            const googleMapsLink = document.querySelector(
                '[data-config="location.googleMapsUrl"]'
            );
            if (googleMapsLink && config.location.googleMapsUrl) {
                googleMapsLink.setAttribute(
                    "href",
                    config.location.googleMapsUrl
                );
            }
        }

        // Update dresscode colors
        if (config.dresscode && config.dresscode.colors) {
            const dresscodeCircles = document.querySelectorAll(
                '[data-config="dresscode.color"]'
            );
            dresscodeCircles.forEach((circle, index) => {
                if (config.dresscode.colors[index]) {
                    circle.style.backgroundColor =
                        config.dresscode.colors[index];
                }
            });
        }

        // Update gift information
        if (config.gift) {
            if (config.gift.transfer) {
                const transferName = document.querySelector(
                    '[data-config="gift.transfer.name"]'
                );
                if (transferName)
                    transferName.textContent = config.gift.transfer.name || "";

                const transferBank = document.querySelector(
                    '[data-config="gift.transfer.bank"]'
                );
                if (transferBank)
                    transferBank.textContent = config.gift.transfer.bank || "";

                const transferAccount = document.querySelector(
                    '[data-config="gift.transfer.account"]'
                );
                if (transferAccount) {
                    transferAccount.textContent =
                        config.gift.transfer.account || "";
                    const copyButton = transferAccount
                        .closest(".d-flex")
                        ?.querySelector("button[data-copy]");
                    if (copyButton) {
                        copyButton.setAttribute(
                            "data-copy",
                            config.gift.transfer.account
                        );
                    }
                }
            }

            if (config.gift.qrcode) {
                const qrcodeName = document.querySelector(
                    '[data-config="gift.qrcode.name"]'
                );
                if (qrcodeName)
                    qrcodeName.textContent = config.gift.qrcode.name || "";

                const qrcodeImage = document.querySelector(
                    '[data-config="gift.qrcode.image"]'
                );
                if (qrcodeImage && config.gift.qrcode.image) {
                    qrcodeImage.setAttribute(
                        "data-src",
                        config.gift.qrcode.image
                    );
                    qrcodeImage.setAttribute(
                        "src",
                        "./assets/images/placeholder.webp"
                    );
                }
            }

            if (config.gift.physical) {
                const physicalName = document.querySelector(
                    '[data-config="gift.physical.name"]'
                );
                if (physicalName)
                    physicalName.textContent = config.gift.physical.name || "";

                const physicalPhone = document.querySelector(
                    '[data-config="gift.physical.phone"]'
                );
                if (physicalPhone) {
                    physicalPhone.textContent =
                        config.gift.physical.phone || "";
                    const copyButton = physicalPhone
                        .closest(".d-flex")
                        ?.querySelector("button[data-copy]");
                    if (copyButton) {
                        copyButton.setAttribute(
                            "data-copy",
                            config.gift.physical.phone
                        );
                    }
                }

                const physicalAddress = document.querySelector(
                    '[data-config="gift.physical.address"]'
                );
                if (physicalAddress) {
                    physicalAddress.textContent =
                        config.gift.physical.address || "";
                    const copyButton = physicalAddress
                        .closest(".d-flex")
                        ?.querySelector("button[data-copy]");
                    if (copyButton) {
                        copyButton.setAttribute(
                            "data-copy",
                            config.gift.physical.address
                        );
                    }
                }
            }
        }

        // Update messages
        if (config.messages) {
            try {
                const invitationMsg = document.querySelector(
                    '[data-config="messages.invitation"]'
                );
                if (invitationMsg && config.messages.invitation) {
                    // Re-query to ensure element still exists
                    const currentElement = document.querySelector(
                        '[data-config="messages.invitation"]'
                    );
                    if (currentElement === invitationMsg) {
                        safeSetInnerHTML(
                            invitationMsg,
                            config.messages.invitation
                        );
                    }
                }

                const dresscodeMsg = document.querySelector(
                    '[data-config="messages.dresscode"]'
                );
                if (dresscodeMsg && config.messages.dresscode) {
                    // Re-query to ensure element still exists
                    const currentElement = document.querySelector(
                        '[data-config="messages.dresscode"]'
                    );
                    if (currentElement === dresscodeMsg) {
                        safeSetInnerHTML(
                            dresscodeMsg,
                            config.messages.dresscode
                        );
                    }
                }
            } catch (error) {
                console.warn("Error updating messages:", error);
            }

            const giftMsg = document.querySelector(
                '[data-config="messages.gift"]'
            );
            if (giftMsg && config.messages.gift) {
                giftMsg.textContent = config.messages.gift;
            }

            const closingMsg = document.querySelector(
                '[data-config="messages.closing"]'
            );
            if (closingMsg && config.messages.closing) {
                closingMsg.textContent = config.messages.closing;
            }

            const greetingMsg = document.querySelector(
                '[data-config="messages.greeting"]'
            );
            if (greetingMsg && config.messages.greeting) {
                greetingMsg.textContent = config.messages.greeting;
            }
        }
    };

    /**
     * Initialize config loader
     * @returns {Promise<object>}
     */
    const init = async () => {
        try {
            // Wait for DOM to be ready
            if (document.readyState === "loading") {
                await new Promise((resolve) => {
                    if (document.readyState === "loading") {
                        document.addEventListener("DOMContentLoaded", resolve);
                    } else {
                        resolve();
                    }
                });
            }

            const gender = getQueryParam("gender") || "male";
            const validGender = ["male", "female"].includes(
                gender.toLowerCase()
            )
                ? gender.toLowerCase()
                : "male";

            const config = await loadConfig(validGender);
            // Only apply config if we got valid data and DOM is ready
            if (config && Object.keys(config).length > 0 && document.body) {
                applyConfig(config);
            }
            return config;
        } catch (error) {
            console.warn("Config initialization failed:", error);
            return {};
        }
    };

    /**
     * Get current config
     * @returns {object|null}
     */
    const getConfig = () => currentConfig;

    return {
        init,
        getConfig,
        loadConfig,
        applyConfig,
    };
})();
