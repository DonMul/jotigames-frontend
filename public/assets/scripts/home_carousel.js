document.addEventListener('DOMContentLoaded', () => {
    const carousel = document.querySelector('[data-carousel]');
    if (!carousel) {
        return;
    }

    const track = carousel.querySelector('[data-carousel-track]');
    const prevButton = carousel.querySelector('[data-carousel-prev]');
    const nextButton = carousel.querySelector('[data-carousel-next]');

    if (!track || !prevButton || !nextButton) {
        return;
    }

    const logoImages = track.querySelectorAll('.game-card-logo[data-src]');

    const loadLogoImage = (image) => {
        if (!(image instanceof HTMLImageElement)) {
            return;
        }
        const source = image.dataset.src;
        if (!source || image.dataset.loaded === '1') {
            return;
        }
        image.src = source;
        image.dataset.loaded = '1';
    };

    const setupLazyLogos = () => {
        if (!logoImages.length) {
            return;
        }

        if (!('IntersectionObserver' in window)) {
            logoImages.forEach(loadLogoImage);
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) {
                        return;
                    }
                    loadLogoImage(entry.target);
                    observer.unobserve(entry.target);
                });
            },
            {
                root: null,
                rootMargin: '0px',
                threshold: 0.05,
            }
        );

        logoImages.forEach((image) => observer.observe(image));
    };

    const getScrollAmount = () => {
        const card = track.querySelector('.game-type-card');
        if (!card) {
            return 280;
        }
        const styles = getComputedStyle(track);
        const gapValue = styles.columnGap || styles.gap || '0';
        const gap = Number.parseFloat(gapValue) || 0;
        return card.getBoundingClientRect().width + gap;
    };

    let autoScrollId = null;

    const scrollPrev = () => {
        const maxScrollLeft = track.scrollWidth - track.clientWidth;
        if (track.scrollLeft <= 4) {
            track.scrollTo({ left: Math.max(0, maxScrollLeft), behavior: 'smooth' });
            return;
        }
        track.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
    };

    const scrollNext = () => {
        const maxScrollLeft = track.scrollWidth - track.clientWidth;
        if (track.scrollLeft >= maxScrollLeft - 4) {
            track.scrollTo({ left: 0, behavior: 'smooth' });
            return;
        }
        track.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
    };

    const hasOverflow = () => track.scrollWidth > track.clientWidth + 4;

    const startAutoScroll = () => {
        if (!hasOverflow()) {
            return;
        }
        if (autoScrollId) {
            return;
        }
        autoScrollId = window.setInterval(scrollNext, 3000);
    };

    const stopAutoScroll = () => {
        if (!autoScrollId) {
            return;
        }
        window.clearInterval(autoScrollId);
        autoScrollId = null;
    };

    const updateButtons = () => {
        if (!hasOverflow()) {
            prevButton.disabled = true;
            nextButton.disabled = true;
            return;
        }
        prevButton.disabled = false;
        nextButton.disabled = false;
    };

    prevButton.addEventListener('click', () => {
        scrollPrev();
    });

    nextButton.addEventListener('click', () => {
        scrollNext();
    });

    track.addEventListener('scroll', updateButtons, { passive: true });
    track.addEventListener('mouseenter', stopAutoScroll);
    track.addEventListener('mouseleave', startAutoScroll);
    track.addEventListener('focusin', stopAutoScroll);
    track.addEventListener('focusout', startAutoScroll);
    window.addEventListener('resize', updateButtons);

    setupLazyLogos();
    updateButtons();
    startAutoScroll();
});
