(function () {
    "use strict";

    var header = document.querySelector(".site-header");
    var navToggle = document.querySelector(".nav-toggle");
    var siteNav = document.getElementById("site-nav");
    var yearEl = document.getElementById("year");
    var toast = document.getElementById("toast");
    var form = document.getElementById("contact-form");
    var formStatus = document.getElementById("form-status");
    var revealEls = document.querySelectorAll(".reveal");
    var VISITOR_NAME_KEY = "sh_visitor_name";

    function normalizeVisitorApiValue(raw) {
        if (typeof raw === "number" && !isNaN(raw)) return raw;
        if (typeof raw === "string") {
            var p = parseInt(raw, 10);
            return !isNaN(p) ? p : null;
        }
        return null;
    }

    /** يزيد عند كل فتح/تحميل للصفحة؛ يُستخدم كاحتياط إذا تعذّر الاتصال بالـ API */
    function bumpLocalVisitShadow() {
        try {
            var n = parseInt(localStorage.getItem("sh_site_visitors_shadow") || "0", 10);
            if (isNaN(n) || n < 0) n = 0;
            n += 1;
            localStorage.setItem("sh_site_visitors_shadow", String(n));
            return n;
        } catch (ignore) {
            return 1;
        }
    }

    /** طلب hit إلى CountAPI — يزيد العداد العالمي عند كل زيارة (تحميل صفحة). */
    function buildVisitorCountAfterHit() {
        var localAfterBump = bumpLocalVisitShadow();
        var url =
            "https://api.countapi.xyz/hit/sweetiehooradam121/sitevisits?cb=" +
            String(Date.now());
        return fetch(url, {
            method: "GET",
            cache: "no-store",
            mode: "cors",
            credentials: "omit"
        })
            .then(function (r) {
                if (!r.ok) throw new Error("bad");
                return r.json();
            })
            .then(function (j) {
                var raw = j && (j.value !== undefined && j.value !== null ? j.value : j.count);
                var v = normalizeVisitorApiValue(raw);
                if (v != null) {
                    try {
                        localStorage.setItem("sh_site_visitors_last", String(v));
                    } catch (ignore) {}
                }
                return v;
            })
            .catch(function () {
                return null;
            })
            .then(function (v) {
                if (v != null) return v;
                var last = null;
                try {
                    var s = localStorage.getItem("sh_site_visitors_last");
                    var n = parseInt(s, 10);
                    if (!isNaN(n) && n > 0) last = n;
                } catch (ignore2) {}
                if (last != null) {
                    return Math.max(last, localAfterBump);
                }
                return localAfterBump;
            });
    }

    var visitorCountPromise =
        document.readyState === "loading"
            ? new Promise(function (resolve) {
                  document.addEventListener("DOMContentLoaded", function onReady() {
                      document.removeEventListener("DOMContentLoaded", onReady);
                      resolve(buildVisitorCountAfterHit());
                  });
              })
            : buildVisitorCountAfterHit();



    window.addEventListener("pageshow", function (ev) {
        if (!ev.persisted) return;
        buildVisitorCountAfterHit().then(function (v) {
            var el = document.getElementById("stat-site-visitors");
            if (!el || v == null) return;
            el.setAttribute("data-count", String(v));
            el.textContent = String(v);
        });
    });

    if (yearEl) {
        yearEl.textContent = String(new Date().getFullYear());
    }

    (function initHeaderWordCloud() {
        var cloud = document.querySelector(".header-word-cloud");
        if (!cloud) return;
        var phrase = "sweety hua";
        var n = 54;
        var g = 0.618033988749895;
        var i;
        for (i = 0; i < n; i++) {
            var span = document.createElement("span");
            span.textContent = phrase;
            var x = ((i * g * 1.73) % 1) * 97 + 1.5;
            var y = ((i * g * g * 2.11) % 1) * 82 + 6;
            var rot = ((i * 11) % 29) - 14;
            var fs = 0.5 + ((i * 3) % 7) * 0.052;
            var alpha = 0.085 + ((i * 5) % 5) * 0.028;
            span.style.left = x + "%";
            span.style.top = y + "%";
            span.style.transform = "translate(-50%, -50%) rotate(" + rot + "deg)";
            span.style.fontSize = fs + "rem";
            span.style.color = "rgba(41, 37, 36, " + alpha + ")";
            cloud.appendChild(span);
        }
    })();

    function setToast(message) {
        if (!toast) return;
        toast.textContent = message;
        toast.removeAttribute("hidden");
        toast.classList.add("is-visible");
        window.clearTimeout(setToast._t);
        setToast._t = window.setTimeout(function () {
            toast.classList.remove("is-visible");
            window.setTimeout(function () {
                toast.setAttribute("hidden", "");
            }, 350);
        }, 3200);
    }

    function getVisitorName() {
        try {
            return (localStorage.getItem(VISITOR_NAME_KEY) || "").trim();
        } catch (err) {
            return "";
        }
    }

    function setVisitorName(name) {
        try {
            localStorage.setItem(VISITOR_NAME_KEY, String(name || "").trim());
        } catch (err) {}
    }

    function applyVisitorWelcome(name) {
        var welcomeEl = document.getElementById("hero-welcome");
        if (!welcomeEl || !name) return;
        welcomeEl.textContent = "أهلاً بك يا " + name + "!";
        welcomeEl.removeAttribute("hidden");
    }

    function closeVisitorNameModal() {
        var o = document.getElementById("visitor-name-overlay");
        var m = document.getElementById("visitor-name-modal");
        if (o) {
            o.classList.remove("is-visible");
            o.setAttribute("aria-hidden", "true");
        }
        if (m) {
            m.classList.remove("is-open");
            m.setAttribute("aria-hidden", "true");
        }
    }

    function openVisitorNameModal() {
        var o = document.getElementById("visitor-name-overlay");
        var m = document.getElementById("visitor-name-modal");
        var input = document.getElementById("visitor-name-input");
        if (!o || !m || !input) return;
        o.classList.add("is-visible");
        o.setAttribute("aria-hidden", "false");
        m.classList.add("is-open");
        m.setAttribute("aria-hidden", "false");
        window.setTimeout(function () {
            input.focus();
        }, 70);
    }

    function closeCheckoutChannelModal() {
        var o = document.getElementById("checkout-channel-overlay");
        var m = document.getElementById("checkout-channel-modal");
        if (!o || !m) return;
        o.classList.remove("is-visible");
        m.classList.remove("is-open");
        o.setAttribute("aria-hidden", "true");
        m.setAttribute("aria-hidden", "true");
        document.body.classList.remove("checkout-channel-open");
    }

    function openCheckoutChannelModal() {
        closeMobileNav();
        var o = document.getElementById("checkout-channel-overlay");
        var m = document.getElementById("checkout-channel-modal");
        if (!o || !m) return;
        o.classList.add("is-visible");
        m.classList.add("is-open");
        o.setAttribute("aria-hidden", "false");
        m.setAttribute("aria-hidden", "false");
        document.body.classList.add("checkout-channel-open");
    }

    function markOrderFeedbackHandled() {
        try {
            sessionStorage.setItem("sh_order_feedback_done", "1");
        } catch (ignore) {}
    }

    function shouldSkipOrderFeedback() {
        try {
            return sessionStorage.getItem("sh_order_feedback_done") === "1";
        } catch (ignore2) {
            return false;
        }
    }

    function resetSiteFeedbackModal() {
        var qb = document.getElementById("site-feedback-question-block");
        var th = document.getElementById("site-feedback-thanks");
        if (qb) qb.removeAttribute("hidden");
        if (th) th.setAttribute("hidden", "");
    }

    function closeSiteFeedbackModal() {
        var o = document.getElementById("site-feedback-overlay");
        var m = document.getElementById("site-feedback-modal");
        if (!o || !m) return;
        o.classList.remove("is-visible");
        m.classList.remove("is-open");
        o.setAttribute("aria-hidden", "true");
        m.setAttribute("aria-hidden", "true");
        document.body.classList.remove("site-feedback-open");
        resetSiteFeedbackModal();
    }

    function openSiteFeedbackModal() {
        if (shouldSkipOrderFeedback()) return;
        var o = document.getElementById("site-feedback-overlay");
        var m = document.getElementById("site-feedback-modal");
        if (!o || !m) return;
        closeMobileNav();
        resetSiteFeedbackModal();
        o.classList.add("is-visible");
        m.classList.add("is-open");
        o.setAttribute("aria-hidden", "false");
        m.setAttribute("aria-hidden", "false");
        document.body.classList.add("site-feedback-open");
    }

    function scheduleSiteFeedbackModal(delayMs) {
        if (shouldSkipOrderFeedback()) return;
        var d = typeof delayMs === "number" ? delayMs : 800;
        window.setTimeout(function () {
            if (shouldSkipOrderFeedback()) return;
            openSiteFeedbackModal();
        }, d);
    }

    (function wireSiteFeedbackModal() {
        var o = document.getElementById("site-feedback-overlay");
        var y = document.getElementById("site-feedback-yes");
        var n = document.getElementById("site-feedback-no");
        var s = document.getElementById("site-feedback-skip");
        var c = document.getElementById("site-feedback-close");
        var th = document.getElementById("site-feedback-thanks");
        var qb = document.getElementById("site-feedback-question-block");
        var msg = document.getElementById("site-feedback-thanks-msg");

        function showThanks(text) {
            markOrderFeedbackHandled();
            if (msg) msg.textContent = text;
            if (qb) qb.setAttribute("hidden", "");
            if (th) th.removeAttribute("hidden");
        }

        if (o) {
            o.addEventListener("click", function () {
                markOrderFeedbackHandled();
                closeSiteFeedbackModal();
            });
        }
        if (y) {
            y.addEventListener("click", function () {
                showThanks("يسعدنا جداً — شكراً لثقتكم، ونعمل دائماً على تحسين تجربة التصفّح.");
            });
        }
        if (n) {
            n.addEventListener("click", function () {
                showThanks("نشكر صراحتك — سنأخذ ذلك بعين الاعتبار لتطوير الموقع.");
            });
        }
        if (s) {
            s.addEventListener("click", function () {
                markOrderFeedbackHandled();
                closeSiteFeedbackModal();
            });
        }
        if (c) {
            c.addEventListener("click", function () {
                closeSiteFeedbackModal();
            });
        }
    })();

    (function initVisitorWelcome() {
        var formEl = document.getElementById("visitor-name-form");
        var inputEl = document.getElementById("visitor-name-input");
        var overlayEl = document.getElementById("visitor-name-overlay");
        if (!formEl || !inputEl || !overlayEl) return;

        var savedName = getVisitorName();
        if (savedName) {
            applyVisitorWelcome(savedName);
            setToast("مرحبًا بعودتك يا " + savedName);
        }
        openVisitorNameModal();

        overlayEl.addEventListener("click", function (e) {
            if (e.target === overlayEl) {
                inputEl.focus();
            }
        });

        formEl.addEventListener("submit", function (e) {
            e.preventDefault();
            var name = (inputEl.value || "").trim();
            if (!name) {
                setToast("يرجى كتابة الاسم أولاً");
                inputEl.focus();
                return;
            }
            setVisitorName(name);
            applyVisitorWelcome(name);
            closeVisitorNameModal();
            setToast("أهلًا " + name + "، نورت الموقع");
        });
    })();

    var ratingConfirmPending = null;

    function closeRatingConfirmModal(choice) {
        var o = document.getElementById("rating-confirm-overlay");
        var m = document.getElementById("rating-confirm-modal");
        var hadPending = typeof ratingConfirmPending === "function";
        if (hadPending) {
            var res = ratingConfirmPending;
            ratingConfirmPending = null;
            res(choice === true);
        }
        if (o && (hadPending || o.classList.contains("is-visible"))) {
            o.classList.remove("is-visible");
            o.setAttribute("aria-hidden", "true");
        }
        if (m && (hadPending || m.classList.contains("is-open"))) {
            m.classList.remove("is-open");
            m.setAttribute("aria-hidden", "true");
        }
        document.body.classList.remove("rating-confirm-open");
    }

    function requestRatingSendConfirm(stars, cardTitle) {
        return new Promise(function (resolve) {
            var o = document.getElementById("rating-confirm-overlay");
            var m = document.getElementById("rating-confirm-modal");
            var q = document.getElementById("rating-confirm-question");
            if (!o || !m || !q) {
                resolve(
                    window.confirm(
                        "هل تؤكد إرسال تقييم «" +
                            stars +
                            " من 5» لبطاقة «" +
                            cardTitle +
                            "»؟"
                    )
                );
                return;
            }
            ratingConfirmPending = resolve;
            q.textContent =
                "هل تريد إرسال تقييم «" + stars + " من 5» لبطاقة «" + cardTitle + "»؟";
            o.classList.add("is-visible");
            m.classList.add("is-open");
            o.setAttribute("aria-hidden", "false");
            m.setAttribute("aria-hidden", "false");
            document.body.classList.add("rating-confirm-open");
            window.setTimeout(function () {
                var yesBtn = document.getElementById("rating-confirm-yes");
                if (yesBtn) yesBtn.focus();
            }, 80);
        });
    }

    (function wireRatingConfirmModal() {
        var yes = document.getElementById("rating-confirm-yes");
        var no = document.getElementById("rating-confirm-no");
        var o = document.getElementById("rating-confirm-overlay");
        if (yes) {
            yes.addEventListener("click", function () {
                closeRatingConfirmModal(true);
            });
        }
        if (no) {
            no.addEventListener("click", function () {
                closeRatingConfirmModal(false);
            });
        }
        if (o) {
            o.addEventListener("click", function (e) {
                if (e.target === o) {
                    closeRatingConfirmModal(false);
                }
            });
        }
    })();

    var coffeeMomentTriggerEl = null;

    function updateCoffeeMomentPriceDisplay() {
        var bagFieldset = document.getElementById("coffee-bag-fieldset");
        var priceEl = document.getElementById("coffee-moment-price");
        if (!bagFieldset || !priceEl) return;
        var c = bagFieldset.querySelector('input[name="coffee-grind-bag"]:checked');
        if (!c) return;
        var p = Number(c.getAttribute("data-price"));
        priceEl.textContent = isNaN(p) ? "—" : p.toFixed(2);
    }

    function announceCoffeeGrindSelection() {
        var bagFieldset = document.getElementById("coffee-bag-fieldset");
        var grindLive = document.getElementById("coffee-grind-live");
        if (!bagFieldset || !grindLive) return;
        var c = bagFieldset.querySelector('input[name="coffee-grind-bag"]:checked');
        if (!c) return;
        var lab = c.closest("label");
        var w = lab ? lab.querySelector(".coffee-bag-weight") : null;
        grindLive.textContent = w ? "الكمية المختارة للطحن: " + w.textContent.trim() : "";
        updateCoffeeMomentPriceDisplay();
        applyStockStateToUI();
    }

    function closeCoffeeMomentModal() {
        var o = document.getElementById("coffee-moment-overlay");
        var m = document.getElementById("coffee-moment-modal");
        if (!o || !m || !m.classList.contains("is-open")) return;
        o.classList.remove("is-visible");
        m.classList.remove("is-open");
        o.setAttribute("aria-hidden", "true");
        m.setAttribute("aria-hidden", "true");
        document.body.classList.remove("coffee-moment-open");
        if (coffeeMomentTriggerEl) {
            coffeeMomentTriggerEl.focus();
            coffeeMomentTriggerEl = null;
        }
    }

    function openCoffeeMomentModal() {
        var o = document.getElementById("coffee-moment-overlay");
        var m = document.getElementById("coffee-moment-modal");
        var btn = document.getElementById("coffee-moment-open");
        if (!o || !m) return;
        coffeeMomentTriggerEl = btn || null;
        o.classList.add("is-visible");
        m.classList.add("is-open");
        o.setAttribute("aria-hidden", "false");
        m.setAttribute("aria-hidden", "false");
        document.body.classList.add("coffee-moment-open");
        window.setTimeout(function () {
            var c = document.getElementById("coffee-moment-close");
            if (c) c.focus();
            announceCoffeeGrindSelection();
        }, 80);
    }

    (function wireCoffeeMomentModal() {
        var openBtn = document.getElementById("coffee-moment-open");
        var o = document.getElementById("coffee-moment-overlay");
        var closeBtn = document.getElementById("coffee-moment-close");
        if (openBtn) {
            openBtn.addEventListener("click", function () {
                openCoffeeMomentModal();
            });
        }
        if (closeBtn) {
            closeBtn.addEventListener("click", function () {
                closeCoffeeMomentModal();
            });
        }
        if (o) {
            o.addEventListener("click", function (e) {
                if (e.target === o) {
                    closeCoffeeMomentModal();
                }
            });
        }
        var bagFieldset = document.getElementById("coffee-bag-fieldset");
        if (bagFieldset) {
            bagFieldset.addEventListener("change", function (e) {
                if (e.target && e.target.name === "coffee-grind-bag") {
                    announceCoffeeGrindSelection();
                }
            });
        }
    })();

    function closeMobileNav() {
        if (!header || !navToggle) return;
        header.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
    }

    if (navToggle && siteNav && header) {
        navToggle.addEventListener("click", function () {
            var open = !header.classList.contains("is-open");
            header.classList.toggle("is-open", open);
            navToggle.setAttribute("aria-expanded", open ? "true" : "false");
        });

        siteNav.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", closeMobileNav);
        });
    }

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            closeCoffeeMomentModal();
            closeRatingConfirmModal(false);
            closeSiteFeedbackModal();
            closeCheckoutChannelModal();
            closeInventoryAdminModal();
            closeInventoryAuthModal(null);
            closeMobileNav();
            closeCart();
        }
    });

    var observer = new IntersectionObserver(
        function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        },
        { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    revealEls.forEach(function (el) {
        observer.observe(el);
    });

    function animateCount(el, target, duration) {
        var start = 0;
        var startTime = null;

        function frame(now) {
            if (!startTime) startTime = now;
            var p = Math.min((now - startTime) / duration, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            var val = Math.round(start + (target - start) * eased);
            el.textContent = String(val);
            if (p < 1) requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
    }

    var statsSection = document.getElementById("stats");
    if (statsSection) {
        var statsDone = false;
        var statsObs = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting || statsDone) return;
                    statsDone = true;
                    var visitorEl = document.getElementById("stat-site-visitors");
                    visitorCountPromise
                        .then(function (v) {
                            if (!visitorEl) return;
                            if (v != null) {
                                visitorEl.setAttribute("data-count", String(v));
                                return;
                            }
                            var fb = parseInt(
                                visitorEl.getAttribute("data-visitor-fallback"),
                                10
                            );
                            if (!isNaN(fb) && fb > 0) {
                                visitorEl.setAttribute("data-count", String(fb));
                            }
                        })
                        .finally(function () {
                            statsSection.querySelectorAll(".stat-value").forEach(function (node) {
                                var n = parseInt(node.getAttribute("data-count"), 10);
                                if (!isNaN(n)) animateCount(node, n, 1400);
                            });
                            statsObs.disconnect();
                        });
                });
            },
            { threshold: 0.35 }
        );
        statsObs.observe(statsSection);
    }

    function consumeContactPrefill() {
        try {
            var prefill = sessionStorage.getItem("sh_contact_prefill");
            if (!prefill) return;
            var preMsg = document.getElementById("message");
            if (preMsg && !preMsg.value.trim()) {
                preMsg.value = prefill;
            }
            sessionStorage.removeItem("sh_contact_prefill");
        } catch (ignore) {}
    }

    function applyContactCheckoutMode() {
        try {
            var mode = sessionStorage.getItem("sh_contact_mode");
            if (!mode) return;
            sessionStorage.removeItem("sh_contact_mode");
            var sec = document.getElementById("contact");
            if (!sec || mode !== "email") return;
            sec.classList.add("contact-mode-email");
            window.setTimeout(function () {
                sec.scrollIntoView({ behavior: "smooth", block: "start" });
                var ta = document.getElementById("message");
                if (ta) ta.focus();
            }, 200);
        } catch (ignore2) {}
    }

    consumeContactPrefill();
    applyContactCheckoutMode();

    function onProductInterestClick(btn) {
        var name = btn.getAttribute("data-name") || "هذا المنتج";
        setToast("تم تسجيل اهتمامك بـ: " + name + " — تواصل معنا لإتمام الطلب");
        var line = "أرغب بالاستفسار عن: " + name;
        var msg = document.getElementById("message");
        if (msg && !msg.value.trim()) {
            msg.value = line;
        }
        var contactEl = document.getElementById("contact");
        if (contactEl) {
            contactEl.scrollIntoView({ behavior: "smooth" });
        } else {
            try {
                sessionStorage.setItem("sh_contact_prefill", line);
            } catch (ignore2) {}
            window.location.href = "index.html#contact";
        }
    }

    function wireProductInterestButtons() {
        document.querySelectorAll(".product-interest").forEach(function (btn) {
            if (btn.getAttribute("data-interest-bound") === "1") return;
            btn.setAttribute("data-interest-bound", "1");
            btn.addEventListener("click", function () {
                onProductInterestClick(btn);
            });
        });
    }

    wireProductInterestButtons();

    if (form && formStatus) {
        form.addEventListener("submit", function (e) {
            e.preventDefault();
            var name = document.getElementById("name");
            var email = document.getElementById("email");
            var message = document.getElementById("message");
            var submitBtn = form.querySelector('button[type="submit"]');
            if (!name || !email || !message) return;

            if (!name.value.trim() || !email.value.trim() || !message.value.trim()) {
                formStatus.textContent = "يرجى تعبئة جميع الحقول.";
                return;
            }

            var action = form.getAttribute("action") || "";
            if (action.indexOf("YOUR_FORM_ID") !== -1) {
                formStatus.textContent =
                    "يُرجى تعيين رابط Formspree في النموذج: استبدل YOUR_FORM_ID في ملف index.html بمعرّف نموذجك.";
                return;
            }

            if (submitBtn) submitBtn.disabled = true;
            formStatus.textContent = "جاري الإرسال…";

            fetch(action, {
                method: "POST",
                body: new FormData(form),
                headers: { Accept: "application/json" }
            })
                .then(function (res) {
                    if (res.ok) {
                        formStatus.textContent = "شكراً لك! تم إرسال رسالتك بنجاح.";
                        setToast("تم استلام رسالتك — شكراً لتواصلك مع سويتي حور");
                        form.reset();
                        scheduleSiteFeedbackModal(650);
                        return;
                    }
                    return res.json().then(function (data) {
                        var err = (data && (data.error || data.errors)) || "";
                        throw new Error(typeof err === "string" ? err : JSON.stringify(err));
                    });
                })
                .catch(function () {
                    formStatus.textContent =
                        "تعذّر إرسال الرسالة. تحقق من رابط Formspree والاتصال بالإنترنت ثم أعد المحاولة.";
                })
                .finally(function () {
                    if (submitBtn) submitBtn.disabled = false;
                });
        });
    }

    var CART_KEY = "sh_cart_v1";
    var STOCK_KEY = "sh_stock_status_v1";
    var CUSTOM_SWEETS_KEY = "sh_custom_sweets_v1";
    var INVENTORY_REGISTRY_KEY = "sh_inventory_registry_v1";
    var INVENTORY_ADMIN_PASSWORD = "326476843";
    var INVENTORY_2FA_SESSION_KEY = "sh_inventory_admin_2fa_ok";
    var INVENTORY_ADMIN_PHONE = "+972507209096";
    var API_BASE_FROM_WINDOW =
        typeof window !== "undefined" && typeof window.SWETTY_API_BASE === "string"
            ? window.SWETTY_API_BASE.trim()
            : "";
    var AUTO_API_BASE =
        typeof window !== "undefined" && window.location && /^https?:/i.test(window.location.protocol)
            ? window.location.origin
            : "";
    var OTP_API_BASE = API_BASE_FROM_WINDOW || AUTO_API_BASE || "http://localhost:8787";
    var INVENTORY_API_BASE = OTP_API_BASE;
    var INVENTORY_FALLBACK_CODE_KEY = "sh_inventory_fallback_code";
    var sharedInventorySyncTimer = null;
    var sharedInventorySyncMs = 20000;
    var inventoryAuthResolver = null;
    var inventoryAuthContext = null;
    var stockState = loadStockState();
    var inventoryRegistry = loadInventoryRegistry();
    var cartToggle = document.getElementById("cart-toggle");
    var cartDrawer = document.getElementById("cart-drawer");
    var cartOverlay = document.getElementById("cart-overlay");
    var cartClose = document.getElementById("cart-close");
    var cartLines = document.getElementById("cart-lines");
    var cartBadge = document.getElementById("cart-badge");
    var cartTotalEl = document.getElementById("cart-total-value");
    var cartClear = document.getElementById("cart-clear");
    var cartCheckout = document.getElementById("cart-checkout");

    function loadStockState() {
        try {
            var raw = localStorage.getItem(STOCK_KEY);
            var data = raw ? JSON.parse(raw) : {};
            return data && typeof data === "object" ? data : {};
        } catch (err) {
            return {};
        }
    }

    function saveStockState(next) {
        stockState = next && typeof next === "object" ? next : {};
        try {
            localStorage.setItem(STOCK_KEY, JSON.stringify(stockState));
        } catch (err) {}
    }

    function loadCustomSweets() {
        try {
            var raw = localStorage.getItem(CUSTOM_SWEETS_KEY);
            var arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr : [];
        } catch (err) {
            return [];
        }
    }

    function saveCustomSweets(items) {
        try {
            localStorage.setItem(CUSTOM_SWEETS_KEY, JSON.stringify(items));
        } catch (err) {}
    }

    function loadInventoryRegistry() {
        try {
            var raw = localStorage.getItem(INVENTORY_REGISTRY_KEY);
            var data = raw ? JSON.parse(raw) : {};
            return data && typeof data === "object" ? data : {};
        } catch (err) {
            return {};
        }
    }

    function saveInventoryRegistry(next) {
        inventoryRegistry = next && typeof next === "object" ? next : {};
        try {
            localStorage.setItem(INVENTORY_REGISTRY_KEY, JSON.stringify(inventoryRegistry));
        } catch (err) {}
    }

    function fetchJson(url, opts) {
        return fetch(url, opts || {}).then(function (res) {
            return res
                .json()
                .catch(function () {
                    return {};
                })
                .then(function (data) {
                    if (!res.ok) {
                        var e = new Error("http_" + String(res.status));
                        e.status = res.status;
                        e.payload = data || {};
                        throw e;
                    }
                    return data || {};
                });
        });
    }

    function loadSharedInventoryState(opts) {
        var options = opts || {};
        return fetchJson(INVENTORY_API_BASE + "/api/inventory")
            .then(function (data) {
                if (!data || !data.ok) return;
                var remoteSweets = Array.isArray(data.customSweets) ? data.customSweets : [];
                var remoteStock = data.stockState && typeof data.stockState === "object" ? data.stockState : {};
                saveCustomSweets(remoteSweets);
                saveStockState(remoteStock);
                injectCustomSweetsToGrid(remoteSweets);
                registerDiscoveredProducts();
                bindAddToCartButtons();
                wireProductInterestButtons();
                applyStockStateToUI();
                renderInventoryStockList();
            })
            .catch(function () {
                if (options.notifyError) {
                    setToast("تعذّر تحديث المخزون من السيرفر حالياً");
                }
            });
    }

    function startSharedInventorySync() {
        if (sharedInventorySyncTimer) return;
        sharedInventorySyncTimer = window.setInterval(function () {
            loadSharedInventoryState();
        }, sharedInventorySyncMs);
        document.addEventListener("visibilitychange", function () {
            if (!document.hidden) loadSharedInventoryState();
        });
    }

    function bindAddToCartButtons() {
        document.querySelectorAll(".add-to-cart").forEach(function (btn) {
            if (btn.getAttribute("data-cart-bound") === "1") return;
            btn.setAttribute("data-cart-bound", "1");
            btn.addEventListener("click", function () {
                var id = btn.getAttribute("data-id");
                var name = btn.getAttribute("data-name");
                var price = btn.getAttribute("data-price");
                addCartItem(id, name, price);
            });
        });
    }

    function slugifyArabicSafe(str) {
        return String(str || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^\u0600-\u06FFa-z0-9-]/g, "")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
    }

    function injectCustomSweetsToGrid(itemsFromRemote) {
        var grid = document.querySelector(".products-detail-section .products-grid");
        if (!grid) return;
        grid.querySelectorAll('.product-card[data-custom-admin="1"]').forEach(function (node) {
            node.remove();
        });
        var items = Array.isArray(itemsFromRemote) ? itemsFromRemote : loadCustomSweets();
        items.forEach(function (it) {
            if (!it || !it.id || !it.name) return;
            if (grid.querySelector('.add-to-cart[data-id="' + it.id + '"]')) return;
            var card = document.createElement("article");
            card.className = "product-card";
            card.setAttribute("data-custom-admin", "1");
            var desc = it.desc && String(it.desc).trim() ? String(it.desc).trim() : "منتج مضاف من لوحة الإدارة.";
            var imageSrc =
                it.image && String(it.image).trim()
                    ? String(it.image).trim()
                    : "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&q=80";
            var price = Number(it.price);
            card.innerHTML =
                '<div class="product-media">' +
                '<img src="" alt="" width="400" height="280" loading="lazy">' +
                "</div>" +
                '<div class="product-body">' +
                "<h3></h3>" +
                '<p class="product-desc"></p>' +
                '<div class="product-footer product-footer--stack">' +
                '<span class="price" dir="ltr"></span>' +
                '<div class="product-actions">' +
                '<button type="button" class="btn btn-small btn-primary add-to-cart">أضف للسلة</button>' +
                '<button type="button" class="btn btn-small btn-outline product-interest">مهتم</button>' +
                "</div>" +
                "</div>" +
                "</div>";
            var titleEl = card.querySelector("h3");
            var descEl = card.querySelector(".product-desc");
            var priceEl = card.querySelector(".price");
            var imgEl = card.querySelector(".product-media img");
            var addBtn = card.querySelector(".add-to-cart");
            var interestBtn = card.querySelector(".product-interest");
            if (titleEl) titleEl.textContent = it.name;
            if (descEl) descEl.textContent = desc;
            if (priceEl) priceEl.innerHTML = price.toFixed(2) + " <small>شيكل</small>";
            if (imgEl) {
                imgEl.src = imageSrc;
                imgEl.alt = it.name;
            }
            if (addBtn) {
                addBtn.setAttribute("data-id", it.id);
                addBtn.setAttribute("data-name", it.name);
                addBtn.setAttribute("data-price", String(price));
            }
            if (interestBtn) {
                interestBtn.setAttribute("data-name", it.name);
            }
            grid.appendChild(card);
        });
    }

    function registerDiscoveredProducts() {
        var map = loadInventoryRegistry();
        document.querySelectorAll(".add-to-cart[data-id]").forEach(function (btn) {
            var id = (btn.getAttribute("data-id") || "").trim();
            var name = (btn.getAttribute("data-name") || "").trim();
            if (!id || !name) return;
            map[id] = name;
        });
        document.querySelectorAll('input[name="coffee-grind-bag"][data-id]').forEach(function (input) {
            var id = (input.getAttribute("data-id") || "").trim();
            var name = (input.getAttribute("data-name") || "").trim();
            if (!id || !name) return;
            map[id] = name;
        });
        loadCustomSweets().forEach(function (it) {
            if (!it || !it.id || !it.name) return;
            map[it.id] = it.name;
        });
        loadCart().forEach(function (it) {
            if (!it || !it.id || !it.name) return;
            map[it.id] = it.name;
        });
        saveInventoryRegistry(map);
        return map;
    }

    function collectInventoryItems() {
        var map = registerDiscoveredProducts();
        return map;
    }

    function ensureInventoryAdminUI() {
        var tools = document.querySelector(".header-tools");
        if (tools && !document.getElementById("inventory-admin-open")) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "inventory-admin-trigger";
            btn.id = "inventory-admin-open";
            btn.setAttribute("aria-haspopup", "dialog");
            btn.setAttribute("aria-controls", "inventory-admin-modal");
            btn.setAttribute("title", "إدارة المنتجات");
            btn.setAttribute("aria-label", "إدارة المنتجات والمخزون");
            btn.innerHTML =
                '<svg class="inventory-admin-icon" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="m21.67 18.17-1.53-1.32c.13-.68.13-1.37 0-2.05l1.53-1.32a.5.5 0 0 0 .11-.63l-1.45-2.5a.5.5 0 0 0-.6-.22l-1.92.77a7.1 7.1 0 0 0-1.77-1.03l-.29-2.05a.5.5 0 0 0-.5-.42h-2.9a.5.5 0 0 0-.49.42l-.29 2.05c-.63.23-1.22.58-1.77 1.03l-1.92-.77a.5.5 0 0 0-.6.22l-1.45 2.5a.5.5 0 0 0 .11.63l1.53 1.32a6.7 6.7 0 0 0 0 2.05l-1.53 1.32a.5.5 0 0 0-.11.63l1.45 2.5a.5.5 0 0 0 .6.22l1.92-.77c.55.45 1.14.8 1.77 1.03l.29 2.05a.5.5 0 0 0 .49.42h2.9a.5.5 0 0 0 .5-.42l.29-2.05c.63-.23 1.22-.58 1.77-1.03l1.92.77a.5.5 0 0 0 .6-.22l1.45-2.5a.5.5 0 0 0-.11-.63ZM12 15.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"/></svg>';
            var navBtn = tools.querySelector(".nav-toggle");
            if (navBtn) {
                tools.insertBefore(btn, navBtn);
            } else {
                tools.appendChild(btn);
            }
        }
        if (!document.getElementById("inventory-admin-modal")) {
            var wrap = document.createElement("div");
            wrap.innerHTML =
                '<div class="inventory-admin-overlay" id="inventory-admin-overlay" aria-hidden="true"></div>' +
                '<div class="inventory-admin-modal" id="inventory-admin-modal" role="dialog" aria-modal="true" aria-labelledby="inventory-admin-title" aria-hidden="true">' +
                '<button type="button" class="inventory-admin-close" id="inventory-admin-close" aria-label="إغلاق">×</button>' +
                '<h2 id="inventory-admin-title">إدارة المنتجات والمخزون</h2>' +
                '<p class="inventory-admin-desc">أضف حلويات جديدة أو حدّد المنتجات المنتهية ليُمنع طلبها تلقائياً.</p>' +
                '<form id="inventory-add-form" class="inventory-add-form">' +
                "<h3>إضافة حلوى جديدة</h3>" +
                '<label for="inventory-add-name">اسم الحلوى</label>' +
                '<input type="text" id="inventory-add-name" name="name" placeholder="مثال: شوكولاتة بندق" required>' +
                '<label for="inventory-add-price">السعر (شيكل)</label>' +
                '<input type="number" id="inventory-add-price" name="price" min="0" step="0.01" placeholder="مثال: 3.50" required>' +
                '<label for="inventory-add-desc">وصف مختصر (اختياري)</label>' +
                '<textarea id="inventory-add-desc" name="desc" rows="2" placeholder="نكهة مميزة وتغليف أنيق"></textarea>' +
                '<label for="inventory-add-image">رابط الصورة (اختياري)</label>' +
                '<input type="url" id="inventory-add-image" name="image" placeholder="https://example.com/sweet.jpg" inputmode="url">' +
                '<button type="submit" class="btn btn-primary btn-block">إضافة للحلويات</button>' +
                "</form>" +
                '<div class="inventory-stock-block">' +
                "<h3>حالة المخزون</h3>" +
                '<p class="inventory-stock-note">فعّل خيار «نفد المخزون» لإيقاف زر الطلب.</p>' +
                '<div class="inventory-stock-list" id="inventory-stock-list"></div>' +
                "</div>" +
                "</div>";
            while (wrap.firstChild) {
                document.body.appendChild(wrap.firstChild);
            }
        }
        ensureInventoryAuthUI();
    }

    function applyStockStateToUI() {
        document.querySelectorAll(".add-to-cart[data-id]").forEach(function (btn) {
            var id = btn.getAttribute("data-id");
            var soldOut = !!stockState[id];
            btn.disabled = soldOut;
            btn.classList.toggle("is-out-of-stock", soldOut);
            btn.textContent = soldOut ? "نفد المخزون" : "أضف للسلة";
        });
        var coffeeAddBtn = document.getElementById("coffee-add-to-cart");
        if (coffeeAddBtn) {
            var c = document.querySelector('input[name="coffee-grind-bag"]:checked');
            var soldOut = !!(c && stockState[c.getAttribute("data-id") || ""]);
            coffeeAddBtn.disabled = soldOut;
            coffeeAddBtn.classList.toggle("is-out-of-stock", soldOut);
            coffeeAddBtn.textContent = soldOut ? "نفد المخزون" : "أضف للسلة";
        }
    }

    function renderInventoryStockList() {
        var list = document.getElementById("inventory-stock-list");
        if (!list) return;
        var items = collectInventoryItems();
        var ids = Object.keys(items).sort(function (a, b) {
            return items[a].localeCompare(items[b], "ar");
        });
        if (ids.length === 0) {
            list.innerHTML = '<p class="inventory-stock-note">لا توجد عناصر لإدارتها في هذه الصفحة.</p>';
            return;
        }
        list.innerHTML = "";
        ids.forEach(function (id) {
            var row = document.createElement("div");
            row.className = "inventory-stock-row";
            var canDelete = id.indexOf("sweet-custom-") === 0;
            row.innerHTML =
                '<span class="inventory-stock-name"></span>' +
                '<span class="inventory-stock-actions">' +
                '<span class="inventory-stock-toggle"><input type="checkbox" data-stock-id="' +
                id +
                '"> نفد من المخزون</span>' +
                (canDelete
                    ? '<button type="button" class="inventory-delete-btn" data-delete-id="' +
                      id +
                      '">حذف من المخزن</button>'
                    : "") +
                "</span>";
            row.querySelector(".inventory-stock-name").textContent = items[id];
            var cb = row.querySelector('input[type="checkbox"]');
            cb.checked = !!stockState[id];
            list.appendChild(row);
        });
    }

    function closeInventoryAdminModal() {
        var o = document.getElementById("inventory-admin-overlay");
        var m = document.getElementById("inventory-admin-modal");
        if (!o || !m) return;
        o.classList.remove("is-visible");
        m.classList.remove("is-open");
        o.setAttribute("aria-hidden", "true");
        m.setAttribute("aria-hidden", "true");
        document.body.classList.remove("inventory-admin-open");
    }

    function openInventoryAdminModal() {
        var o = document.getElementById("inventory-admin-overlay");
        var m = document.getElementById("inventory-admin-modal");
        if (!o || !m) return;
        closeMobileNav();
        renderInventoryStockList();
        loadSharedInventoryState({ notifyError: true });
        o.classList.add("is-visible");
        m.classList.add("is-open");
        o.setAttribute("aria-hidden", "false");
        m.setAttribute("aria-hidden", "false");
        document.body.classList.add("inventory-admin-open");
    }

    function ensureInventoryAuthUI() {
        if (document.getElementById("inventory-auth-modal")) return;
        var wrap = document.createElement("div");
        wrap.innerHTML =
            '<div class="inventory-auth-overlay" id="inventory-auth-overlay" aria-hidden="true"></div>' +
            '<div class="inventory-auth-modal" id="inventory-auth-modal" role="dialog" aria-modal="true" aria-labelledby="inventory-auth-title" aria-hidden="true">' +
            '<h2 id="inventory-auth-title">تحقق الإدارة</h2>' +
            '<p class="inventory-auth-desc" id="inventory-auth-desc">أدخل بيانات التحقق للمتابعة.</p>' +
            '<label for="inventory-auth-input" class="inventory-auth-label" id="inventory-auth-label">القيمة المطلوبة</label>' +
            '<input type="password" id="inventory-auth-input" class="inventory-auth-input" autocomplete="one-time-code" inputmode="numeric" maxlength="24">' +
            '<p class="inventory-auth-hint" id="inventory-auth-hint" hidden></p>' +
            '<div class="inventory-auth-actions">' +
            '<button type="button" class="btn btn-primary btn-block" id="inventory-auth-submit">متابعة</button>' +
            '<button type="button" class="btn btn-ghost btn-block" id="inventory-auth-resend" hidden>إعادة إرسال الكود</button>' +
            '<button type="button" class="btn btn-outline btn-block" id="inventory-auth-cancel">إلغاء</button>' +
            "</div>" +
            "</div>";
        while (wrap.firstChild) {
            document.body.appendChild(wrap.firstChild);
        }
    }

    function closeInventoryAuthModal(result) {
        var o = document.getElementById("inventory-auth-overlay");
        var m = document.getElementById("inventory-auth-modal");
        if (o) {
            o.classList.remove("is-visible");
            o.setAttribute("aria-hidden", "true");
        }
        if (m) {
            m.classList.remove("is-open");
            m.setAttribute("aria-hidden", "true");
        }
        if (typeof inventoryAuthResolver === "function") {
            var r = inventoryAuthResolver;
            inventoryAuthResolver = null;
            r(result || null);
        }
        inventoryAuthContext = null;
    }

    function openInventoryAuthModal(cfg) {
        ensureInventoryAuthUI();
        var o = document.getElementById("inventory-auth-overlay");
        var m = document.getElementById("inventory-auth-modal");
        var t = document.getElementById("inventory-auth-title");
        var d = document.getElementById("inventory-auth-desc");
        var l = document.getElementById("inventory-auth-label");
        var input = document.getElementById("inventory-auth-input");
        var hint = document.getElementById("inventory-auth-hint");
        var resend = document.getElementById("inventory-auth-resend");
        if (!o || !m || !input || !t || !d || !l || !hint || !resend) {
            return Promise.resolve(null);
        }
        inventoryAuthContext = cfg || {};
        t.textContent = cfg && cfg.title ? cfg.title : "تحقق الإدارة";
        d.textContent = cfg && cfg.desc ? cfg.desc : "أدخل بيانات التحقق للمتابعة.";
        l.textContent = cfg && cfg.label ? cfg.label : "القيمة المطلوبة";
        input.type = cfg && cfg.mask ? "password" : "text";
        input.inputMode = cfg && cfg.numeric ? "numeric" : "text";
        input.maxLength = cfg && cfg.maxLength ? cfg.maxLength : 24;
        input.value = "";
        hint.textContent = cfg && cfg.hint ? cfg.hint : "";
        if (cfg && cfg.hint) hint.removeAttribute("hidden");
        else hint.setAttribute("hidden", "");
        resend.hidden = !(cfg && cfg.showResend);
        o.classList.add("is-visible");
        o.setAttribute("aria-hidden", "false");
        m.classList.add("is-open");
        m.setAttribute("aria-hidden", "false");
        window.setTimeout(function () {
            input.focus();
        }, 70);
        return new Promise(function (resolve) {
            inventoryAuthResolver = resolve;
        });
    }

    function hasAdminSessionAccess() {
        try {
            return sessionStorage.getItem("sh_inventory_admin_ok") === "1";
        } catch (err) {
            return false;
        }
    }

    function setAdminSessionAccess(ok) {
        try {
            if (ok) {
                sessionStorage.setItem("sh_inventory_admin_ok", "1");
            } else {
                sessionStorage.removeItem("sh_inventory_admin_ok");
                sessionStorage.removeItem(INVENTORY_2FA_SESSION_KEY);
            }
        } catch (err) {}
    }

    function postJson(url, payload) {
        return fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload || {})
        }).then(function (res) {
            return res
                .json()
                .catch(function () {
                    return {};
                })
                .then(function (data) {
                    if (!res.ok) {
                        var e = new Error("http_" + String(res.status));
                        e.status = res.status;
                        e.payload = data || {};
                        throw e;
                    }
                    return data || {};
                });
        });
    }

    function startInventoryOtpSms() {
        return postJson(OTP_API_BASE + "/api/admin-otp/start", {
            phone: INVENTORY_ADMIN_PHONE
        });
    }

    function checkInventoryOtpSms(code) {
        return postJson(OTP_API_BASE + "/api/admin-otp/check", {
            phone: INVENTORY_ADMIN_PHONE,
            code: String(code || "").trim()
        });
    }

    function generateFourDigitCode() {
        return String(Math.floor(1000 + Math.random() * 9000));
    }

    function createLocalFallbackCode() {
        var code = generateFourDigitCode();
        try {
            sessionStorage.setItem(INVENTORY_FALLBACK_CODE_KEY, code);
        } catch (err) {}
        return code;
    }

    function validateLocalFallbackCode(entered) {
        var saved = "";
        try {
            saved = sessionStorage.getItem(INVENTORY_FALLBACK_CODE_KEY) || "";
        } catch (err) {}
        return !!saved && String(entered || "").trim() === saved;
    }

    function requestInventorySecondFactor() {
        try {
            if (sessionStorage.getItem(INVENTORY_2FA_SESSION_KEY) === "1") return Promise.resolve(true);
        } catch (err) {}
        var smsAvailable = true;
        var initialHint = "إذا لم يصلك الكود، اضغط إعادة إرسال.";
        return startInventoryOtpSms()
            .then(function () {
                setToast("تم إرسال كود التحقق عبر رسالة SMS");
                return true;
            })
            .catch(function (errStart) {
                smsAvailable = false;
                var apiError = String((errStart && errStart.payload && errStart.payload.error) || "");
                if (apiError === "max_attempts_reached" || (errStart && errStart.status === 429)) {
                    setToast("محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة");
                    return false;
                }
                if (apiError === "invalid_phone") {
                    setToast("رقم الهاتف غير صالح في إعدادات التحقق");
                    return false;
                }
                var fallbackCode = createLocalFallbackCode();
                initialHint =
                    "تعذّر إرسال SMS الآن. استخدم الكود الاحتياطي المؤقت: " + fallbackCode;
                setToast("تعذّر إرسال SMS. تم تفعيل كود احتياطي مؤقت");
                return true;
            })
            .then(function (canProceed) {
                if (!canProceed) return false;
                return openInventoryAuthModal({
                    title: "التحقق الثنائي",
                    desc: "أدخل كود التحقق المكوّن من 4 خانات.",
                    label: "كود التحقق",
                    hint: initialHint,
                    numeric: true,
                    mask: false,
                    maxLength: 6,
                    showResend: true
                }).then(function (entered) {
                    if (entered === null) return false;
                    if (!smsAvailable) {
                        if (!validateLocalFallbackCode(entered)) {
                            setToast("كود غير صحيح");
                            return false;
                        }
                        try {
                            sessionStorage.setItem(INVENTORY_2FA_SESSION_KEY, "1");
                        } catch (errLocal) {}
                        return true;
                    }
                    return checkInventoryOtpSms(entered)
                        .then(function (resCheck) {
                            if (!resCheck || !resCheck.ok || resCheck.approved !== true) {
                                setToast("كود التحقق غير صحيح");
                                return false;
                            }
                            try {
                                sessionStorage.setItem(INVENTORY_2FA_SESSION_KEY, "1");
                            } catch (err4) {}
                            return true;
                        })
                        .catch(function (errCheck) {
                            var checkError = String(
                                (errCheck && errCheck.payload && errCheck.payload.error) || ""
                            );
                            if (checkError === "invalid_or_expired_code" || (errCheck && errCheck.status === 401)) {
                                setToast("كود غير صحيح أو منتهي الصلاحية");
                            } else if (checkError === "max_attempts_reached" || (errCheck && errCheck.status === 429)) {
                                setToast("تم تجاوز عدد المحاولات المسموح");
                            } else {
                                setToast("تعذّر التحقق من الكود. حاول مرة أخرى");
                            }
                            return false;
                        });
                });
            });
    }

    function requestInventoryPassword() {
        if (hasAdminSessionAccess()) return Promise.resolve(true);
        return openInventoryAuthModal({
            title: "دخول الإدارة",
            desc: "أدخل كلمة المرور للمتابعة.",
            label: "كلمة المرور",
            numeric: true,
            mask: true,
            maxLength: 24,
            showResend: false
        }).then(function (entered) {
            if (entered === null) return false;
            if (String(entered).trim() !== INVENTORY_ADMIN_PASSWORD) {
                setToast("كلمة المرور غير صحيحة");
                setAdminSessionAccess(false);
                return false;
            }
            return requestInventorySecondFactor().then(function (ok2) {
                if (!ok2) {
                    setAdminSessionAccess(false);
                    return false;
                }
                setAdminSessionAccess(true);
                return true;
            });
        });
    }

    function loadCart() {
        try {
            var raw = localStorage.getItem(CART_KEY);
            var arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr : [];
        } catch (e) {
            return [];
        }
    }

    function saveCart(items) {
        try {
            localStorage.setItem(CART_KEY, JSON.stringify(items));
        } catch (e) {}
    }

    function cartItemCount(items) {
        return items.reduce(function (n, it) {
            return n + (it.qty || 0);
        }, 0);
    }

    function cartTotals(items) {
        var sub = items.reduce(function (sum, it) {
            return sum + (Number(it.price) || 0) * (Number(it.qty) || 0);
        }, 0);
        return Math.round(sub * 100) / 100;
    }

    function openCart() {
        if (!cartDrawer || !cartOverlay) return;
        cartDrawer.classList.add("is-open");
        cartOverlay.classList.add("is-visible");
        cartOverlay.setAttribute("aria-hidden", "false");
        cartDrawer.setAttribute("aria-hidden", "false");
        if (cartToggle) cartToggle.setAttribute("aria-expanded", "true");
        document.body.classList.add("cart-open");
    }

    function closeCart() {
        if (!cartDrawer || !cartOverlay) return;
        cartDrawer.classList.remove("is-open");
        cartOverlay.classList.remove("is-visible");
        cartOverlay.setAttribute("aria-hidden", "true");
        cartDrawer.setAttribute("aria-hidden", "true");
        if (cartToggle) cartToggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("cart-open");
    }

    function renderCart() {
        var items = loadCart();
        if (!cartLines || !cartBadge || !cartTotalEl) return;

        if (items.length === 0) {
            cartLines.innerHTML =
                '<p class="cart-empty">السلة فارغة. أضف منتجات من صفحات الحلويات أو الهدايا، أو طحن القهوة من الصفحة الرئيسية.</p>';
            cartBadge.textContent = "0";
            cartBadge.hidden = true;
            cartTotalEl.textContent = "0.00";
            return;
        }

        cartBadge.hidden = false;
        var count = cartItemCount(items);
        cartBadge.textContent = count > 99 ? "99+" : String(count);
        cartTotalEl.textContent = cartTotals(items).toFixed(2);

        cartLines.innerHTML = "";
        items.forEach(function (it) {
            var row = document.createElement("div");
            row.className = "cart-line";
            row.setAttribute("data-id", it.id);
            var sub = ((Number(it.price) || 0) * (Number(it.qty) || 0)).toFixed(2);
            row.innerHTML =
                '<div class="cart-line-name"></div>' +
                '<div class="cart-line-meta"></div>' +
                '<div class="cart-line-qty">' +
                '<button type="button" class="cart-qty-btn" data-cart-delta="-1" aria-label="تقليل الكمية">−</button>' +
                '<span><span class="visually-hidden">الكمية</span>' +
                String(it.qty) +
                "</span>" +
                '<button type="button" class="cart-qty-btn" data-cart-delta="1" aria-label="زيادة الكمية">+</button>' +
                '<button type="button" class="cart-remove" data-cart-remove="1">حذف</button>' +
                "</div>";
            row.querySelector(".cart-line-name").textContent = it.name;
            row.querySelector(".cart-line-meta").textContent = sub + " شيكل";
            cartLines.appendChild(row);
        });
    }

    function addCartItem(id, name, price) {
        var items = loadCart();
        var p = Number(price);
        if (!id || !name || isNaN(p)) return;
        if (!inventoryRegistry[id]) {
            inventoryRegistry[id] = name;
            saveInventoryRegistry(inventoryRegistry);
        }
        if (stockState[id]) {
            setToast("هذا المنتج غير متوفر حالياً");
            return;
        }
        var found = null;
        for (var i = 0; i < items.length; i++) {
            if (items[i].id === id) {
                found = items[i];
                break;
            }
        }
        if (found) {
            found.qty = (found.qty || 0) + 1;
        } else {
            items.push({ id: id, name: name, price: p, qty: 1 });
        }
        saveCart(items);
        renderCart();
        setToast("تمت الإضافة إلى السلة: " + name);
    }

    function updateCartQty(id, delta) {
        var items = loadCart();
        var idx = -1;
        for (var j = 0; j < items.length; j++) {
            if (items[j].id === id) {
                idx = j;
                break;
            }
        }
        if (idx === -1) return;
        items[idx].qty = (items[idx].qty || 0) + delta;
        if (items[idx].qty <= 0) {
            items.splice(idx, 1);
        }
        saveCart(items);
        renderCart();
    }

    function removeCartLine(id) {
        var items = loadCart().filter(function (x) {
            return x.id !== id;
        });
        saveCart(items);
        renderCart();
    }

    function buildCartMessage(items) {
        var lines = ["طلب من الموقع (سلة مشتريات):", ""];
        items.forEach(function (it) {
            var sub = ((Number(it.price) || 0) * (Number(it.qty) || 0)).toFixed(2);
            lines.push("- " + it.name + " × " + it.qty + " — " + sub + " شيكل");
        });
        lines.push("");
        lines.push("الإجمالي التقريبي: " + cartTotals(items).toFixed(2) + " شيكل");
        return lines.join("\n");
    }

    if (cartLines) {
        cartLines.addEventListener("click", function (e) {
            var line = e.target.closest(".cart-line");
            if (!line) return;
            var id = line.getAttribute("data-id");
            if (!id) return;
            if (e.target.closest("[data-cart-remove]")) {
                removeCartLine(id);
                return;
            }
            var deltaBtn = e.target.closest("[data-cart-delta]");
            if (deltaBtn) {
                var d = parseInt(deltaBtn.getAttribute("data-cart-delta"), 10);
                if (!isNaN(d)) updateCartQty(id, d);
            }
        });
    }

    if (cartToggle && cartDrawer) {
        cartToggle.addEventListener("click", function () {
            closeMobileNav();
            if (cartDrawer.classList.contains("is-open")) {
                closeCart();
            } else {
                openCart();
            }
        });
    }

    if (cartClose) {
        cartClose.addEventListener("click", closeCart);
    }

    if (cartOverlay) {
        cartOverlay.addEventListener("click", closeCart);
    }

    if (cartClear) {
        cartClear.addEventListener("click", function () {
            if (loadCart().length === 0) return;
            saveCart([]);
            renderCart();
            setToast("تم تفريغ السلة");
        });
    }

    var checkoutChOverlay = document.getElementById("checkout-channel-overlay");
    var checkoutChWhatsapp = document.getElementById("checkout-ch-whatsapp");
    var checkoutChEmail = document.getElementById("checkout-ch-email");
    var checkoutChCancel = document.getElementById("checkout-ch-cancel");
    var WA_ORDER_NUMBER = "972507209096";
    var pendingCheckoutItems = null;

    function clearCartForNewOrderStart() {
        saveCart([]);
        renderCart();
        closeCart();
    }

    function runEmailCheckoutWithCartMessage(msg) {
        try {
            sessionStorage.setItem("sh_contact_prefill", msg);
            sessionStorage.setItem("sh_contact_mode", "email");
        } catch (err) {}
        var onHome = !!document.getElementById("contact");
        closeCheckoutChannelModal();
        closeCart();
        saveCart([]);
        renderCart();
        if (onHome) {
            try {
                var ta = document.getElementById("message");
                if (ta) ta.value = msg;
                sessionStorage.removeItem("sh_contact_prefill");
            } catch (e2) {}
            try {
                sessionStorage.removeItem("sh_contact_mode");
            } catch (e3) {}
            var sec = document.getElementById("contact");
            if (sec) {
                sec.classList.add("contact-mode-email");
                sec.scrollIntoView({ behavior: "smooth", block: "start" });
                window.setTimeout(function () {
                    var m2 = document.getElementById("message");
                    if (m2) m2.focus();
                }, 450);
            }
            setToast("تم ضبط النموذج لإرسال الطلب بالبريد — أُفرغت السلة");
        } else {
            window.location.href = "index.html#contact";
        }
    }

    if (checkoutChOverlay) {
        checkoutChOverlay.addEventListener("click", closeCheckoutChannelModal);
    }
    if (checkoutChCancel) {
        checkoutChCancel.addEventListener("click", closeCheckoutChannelModal);
    }
    if (checkoutChWhatsapp) {
        checkoutChWhatsapp.addEventListener("click", function () {
            var items = pendingCheckoutItems || loadCart();
            if (items.length === 0) {
                setToast("السلة فارغة");
                closeCheckoutChannelModal();
                return;
            }
            var msg = buildCartMessage(items);
            var url = "https://wa.me/" + WA_ORDER_NUMBER + "?text=" + encodeURIComponent(msg);
            window.open(url, "_blank", "noopener,noreferrer");
            closeCheckoutChannelModal();
            pendingCheckoutItems = null;
            setToast("تم فتح واتساب — أرسل الطلب من المحادثة — أُفرغت السلة");
            scheduleSiteFeedbackModal(750);
        });
    }
    if (checkoutChEmail) {
        checkoutChEmail.addEventListener("click", function () {
            var items = pendingCheckoutItems || loadCart();
            if (items.length === 0) {
                setToast("السلة فارغة");
                closeCheckoutChannelModal();
                return;
            }
            var msg = buildCartMessage(items);
            pendingCheckoutItems = null;
            runEmailCheckoutWithCartMessage(msg);
        });
    }

    if (cartCheckout) {
        cartCheckout.addEventListener("click", function () {
            var items = loadCart();
            if (items.length === 0) {
                setToast("السلة فارغة — أضف منتجات أولاً");
                return;
            }
            pendingCheckoutItems = items.slice();
            clearCartForNewOrderStart();
            openCheckoutChannelModal();
            setToast("تم تصفير السلة والبدء بطلب جديد");
        });
    }

    ensureInventoryAdminUI();
    injectCustomSweetsToGrid();
    wireProductInterestButtons();
    registerDiscoveredProducts();

    bindAddToCartButtons();

    var coffeeAddToCartBtn = document.getElementById("coffee-add-to-cart");
    if (coffeeAddToCartBtn) {
        coffeeAddToCartBtn.addEventListener("click", function () {
            var bagFieldset = document.getElementById("coffee-bag-fieldset");
            if (!bagFieldset) return;
            var c = bagFieldset.querySelector('input[name="coffee-grind-bag"]:checked');
            if (!c) return;
            var id = c.getAttribute("data-id");
            var name = c.getAttribute("data-name");
            var price = c.getAttribute("data-price");
            addCartItem(id, name, price);
        });
    }

    (function wireInventoryAdmin() {
        var openBtn = document.getElementById("inventory-admin-open");
        var closeBtn = document.getElementById("inventory-admin-close");
        var overlay = document.getElementById("inventory-admin-overlay");
        var stockList = document.getElementById("inventory-stock-list");
        var addForm = document.getElementById("inventory-add-form");

        if (openBtn) {
            openBtn.addEventListener("click", function () {
                requestInventoryPassword().then(function (ok) {
                    if (!ok) return;
                    openInventoryAdminModal();
                });
            });
        }
        if (closeBtn) {
            closeBtn.addEventListener("click", function () {
                closeInventoryAdminModal();
            });
        }
        if (overlay) {
            overlay.addEventListener("click", function (e) {
                if (e.target === overlay) {
                    closeInventoryAdminModal();
                }
            });
        }
        var authOverlay = document.getElementById("inventory-auth-overlay");
        var authSubmit = document.getElementById("inventory-auth-submit");
        var authCancel = document.getElementById("inventory-auth-cancel");
        var authResend = document.getElementById("inventory-auth-resend");
        var authInput = document.getElementById("inventory-auth-input");
        if (authOverlay) {
            authOverlay.addEventListener("click", function (e) {
                if (e.target === authOverlay) closeInventoryAuthModal(null);
            });
        }
        if (authCancel) {
            authCancel.addEventListener("click", function () {
                closeInventoryAuthModal(null);
            });
        }
        if (authSubmit) {
            authSubmit.addEventListener("click", function () {
                if (!authInput) return;
                closeInventoryAuthModal(authInput.value || "");
            });
        }
        if (authInput) {
            authInput.addEventListener("keydown", function (e) {
                if (e.key === "Enter") {
                    e.preventDefault();
                    closeInventoryAuthModal(authInput.value || "");
                }
            });
        }
        if (authResend) {
            authResend.addEventListener("click", function () {
                startInventoryOtpSms()
                    .then(function () {
                        var hintEl = document.getElementById("inventory-auth-hint");
                        if (hintEl) {
                            hintEl.textContent = "تمت إعادة إرسال SMS. أدخل الكود الجديد.";
                            hintEl.removeAttribute("hidden");
                        }
                        setToast("تمت إعادة إرسال كود التحقق عبر SMS");
                    })
                    .catch(function () {
                        var fallbackCode = createLocalFallbackCode();
                        var hintEl = document.getElementById("inventory-auth-hint");
                        if (hintEl) {
                            hintEl.textContent =
                                "تعذّر إرسال SMS الآن. استخدم الكود الاحتياطي: " + fallbackCode;
                            hintEl.removeAttribute("hidden");
                        }
                        setToast("تعذّر إرسال SMS. تم إنشاء كود احتياطي");
                    });
            });
        }
        if (stockList) {
            stockList.addEventListener("change", function (e) {
                var cb = e.target.closest('input[type="checkbox"][data-stock-id]');
                if (!cb) return;
                var id = cb.getAttribute("data-stock-id");
                if (!id) return;
                var next = loadStockState();
                if (cb.checked) {
                    next[id] = true;
                } else {
                    delete next[id];
                }
                saveStockState(next);
                applyStockStateToUI();
                fetchJson(INVENTORY_API_BASE + "/api/inventory/stock", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ stockState: next })
                }).catch(function () {
                    setToast("تعذّر مزامنة المخزون الآن، تم حفظه محلياً");
                });
            });
            stockList.addEventListener("click", function (e) {
                var delBtn = e.target.closest("button[data-delete-id]");
                if (!delBtn) return;
                var id = (delBtn.getAttribute("data-delete-id") || "").trim();
                if (!id) return;
                var ok = window.confirm("هل تريد حذف هذا المنتج من المخزن؟");
                if (!ok) return;
                delBtn.disabled = true;
                fetchJson(INVENTORY_API_BASE + "/api/inventory/sweets/" + encodeURIComponent(id), {
                    method: "DELETE"
                })
                    .then(function (data) {
                        var remoteList = Array.isArray(data.customSweets) ? data.customSweets : [];
                        var remoteStock = data.stockState && typeof data.stockState === "object" ? data.stockState : {};
                        saveCustomSweets(remoteList);
                        saveStockState(remoteStock);
                        injectCustomSweetsToGrid(remoteList);
                        bindAddToCartButtons();
                        wireProductInterestButtons();
                        renderInventoryStockList();
                        applyStockStateToUI();
                        setToast("تم حذف المنتج من المخزن");
                    })
                    .catch(function () {
                        delBtn.disabled = false;
                        setToast("تعذّر حذف المنتج من السيرفر");
                    });
            });
        }
        if (addForm) {
            addForm.addEventListener("submit", function (e) {
                e.preventDefault();
                var nameInput = document.getElementById("inventory-add-name");
                var priceInput = document.getElementById("inventory-add-price");
                var descInput = document.getElementById("inventory-add-desc");
                var imageInput = document.getElementById("inventory-add-image");
                if (!nameInput || !priceInput) return;
                var name = (nameInput.value || "").trim();
                var price = Number(priceInput.value);
                var desc = descInput ? (descInput.value || "").trim() : "";
                var image = imageInput ? (imageInput.value || "").trim() : "";
                if (!name) {
                    setToast("أدخل اسم الحلوى أولاً");
                    return;
                }
                if (isNaN(price) || price <= 0) {
                    setToast("أدخل سعراً صحيحاً");
                    return;
                }
                var baseSlug = slugifyArabicSafe(name);
                var id = "sweet-custom-" + (baseSlug || "item") + "-" + String(Date.now());
                var list = loadCustomSweets();
                var exists = list.some(function (it) {
                    return it && it.id === id;
                });
                if (exists) {
                    id = id + "-" + String(Date.now()).slice(-4);
                }
                list.push({
                    id: id,
                    name: name,
                    price: price,
                    desc: desc,
                    image: image
                });
                fetchJson(INVENTORY_API_BASE + "/api/inventory/sweets", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: id,
                        name: name,
                        price: price,
                        desc: desc,
                        image: image
                    })
                })
                    .then(function (data) {
                        var remoteList = Array.isArray(data.customSweets) ? data.customSweets : list;
                        saveCustomSweets(remoteList);
                        injectCustomSweetsToGrid(remoteList);
                        wireProductInterestButtons();
                        bindAddToCartButtons();
                        renderInventoryStockList();
                        applyStockStateToUI();
                        addForm.reset();
                        setToast("تمت إضافة الحلوى الجديدة للجميع");
                    })
                    .catch(function () {
                        saveCustomSweets(list);
                        injectCustomSweetsToGrid(list);
                        wireProductInterestButtons();
                        bindAddToCartButtons();
                        renderInventoryStockList();
                        applyStockStateToUI();
                        addForm.reset();
                        setToast("تعذّر رفعها للسيرفر، تم حفظها محلياً فقط");
                    });
            });
        }
    })();

    applyStockStateToUI();
    renderCart();
    loadSharedInventoryState();
    startSharedInventorySync();

    function getContactFormspreeAction() {
        var f = document.getElementById("contact-form");
        if (!f) return "";
        return (f.getAttribute("action") || "").trim();
    }

    function postFeatureRatingToFormspree(cardTitle, stars) {
        var action = getContactFormspreeAction();
        if (!action || action.indexOf("formspree.io") === -1 || action.indexOf("YOUR_FORM_ID") !== -1) {
            return Promise.reject(new Error("formspree"));
        }
        var t = new Date().toISOString();
        var sectionAr = "لماذا نحن";
        var fd = new FormData();
        fd.append("_subject", "[Swetty Huar] تقييم البطاقة: " + cardTitle + " — " + stars + "/5");
        fd.append("name", "تقييم: " + cardTitle + " (" + stars + "/5)");
        fd.append("email", "hursweety@gmail.com");
        fd.append("rating_section_ar", sectionAr);
        fd.append("rating_card_ar", cardTitle);
        fd.append("rating_score", String(stars));
        fd.append("rating_out_of", "5");
        fd.append("rating_site_name", "Swetty Huar");
        fd.append("rating_time_utc", t);
        fd.append(
            "message",
            "ملخص التقييم (من موقع Swetty Huar)\n" +
                "────────────────────────\n" +
                "القسم (لماذا نحن) : " +
                sectionAr +
                "\n" +
                "البطاقة          : " +
                cardTitle +
                "\n" +
                "التقييم          : " +
                stars +
                " من 5\n" +
                "التوقيت (UTC)    : " +
                t +
                "\n" +
                "────────────────────────"
        );
        return fetch(action, {
            method: "POST",
            body: fd,
            headers: { Accept: "application/json" }
        }).then(function (res) {
            if (!res.ok) throw new Error("status");
        });
    }

    (function initFeatureRatings() {
        var why = document.getElementById("why");
        if (!why) return;
        why.querySelectorAll(".feature-card").forEach(function (card) {
            var main = card.querySelector(".feature-card-main");
            var panel = card.querySelector(".feature-rating-panel");
            if (!main || !panel) return;
            var result = panel.querySelector(".feature-rating-result");
            var starBtns = panel.querySelectorAll(".feature-star-btn");
            var titleEl = card.querySelector(".feature-card-main h3");
            var cardTitle = titleEl ? titleEl.textContent.trim() : "بطاقة";

            function setExpanded(exp) {
                main.setAttribute("aria-expanded", exp ? "true" : "false");
                if (exp) {
                    panel.removeAttribute("hidden");
                    panel.setAttribute("aria-hidden", "false");
                } else {
                    panel.setAttribute("hidden", "");
                    panel.setAttribute("aria-hidden", "true");
                }
            }

            function togglePanel() {
                var isOpen = !panel.hasAttribute("hidden");
                setExpanded(!isOpen);
            }

            main.addEventListener("click", togglePanel);
            main.addEventListener("keydown", function (e) {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    togglePanel();
                }
            });

            starBtns.forEach(function (btn) {
                btn.addEventListener("click", function (e) {
                    e.stopPropagation();
                    var val = parseInt(btn.getAttribute("data-value"), 10);
                    if (isNaN(val)) return;
                    requestRatingSendConfirm(val, cardTitle).then(function (ok) {
                        if (!ok) {
                            if (result) {
                                result.textContent = "تم إلغاء الإرسال.";
                            }
                            return;
                        }
                        starBtns.forEach(function (b) {
                            var v = parseInt(b.getAttribute("data-value"), 10);
                            var on = v <= val;
                            b.classList.toggle("is-active", on);
                            b.setAttribute("aria-pressed", on ? "true" : "false");
                        });
                        if (result) {
                            result.textContent = "جاري إرسال التقييم…";
                        }
                        postFeatureRatingToFormspree(cardTitle, val)
                            .then(function () {
                                if (result) {
                                    result.textContent =
                                        "شكراً — أُرسل التقييم (" +
                                        val +
                                        "/5) إلى بريد الموقع بشكل مرتب.";
                                }
                                setToast("تم إرسال تقييمك");
                            })
                            .catch(function () {
                                if (result) {
                                    result.textContent =
                                        "تعذّر الإرسال — يمكنك المحاولة لاحقاً بعد التحقق من الاتصال.";
                                }
                                setToast("تعذّر إرسال التقييم");
                            });
                    });
                });
            });
        });
    })();
})();
