let subCabanaInterval;
let currentSubCabanaIndex = 0;

function scrollSubCabana(direction) {
    const carousel = document.getElementById('subCabanaCarousel');
    if (!carousel) return;
    const slides = carousel.querySelectorAll('.sub-cabana-slide');
    const total = slides.length;
    if (total <= 1) return;

    currentSubCabanaIndex = (currentSubCabanaIndex + direction + total) % total;
    goToSubCabana(currentSubCabanaIndex);
    resetSubCabanaAutoScroll();
}

function goToSubCabana(index) {
    const carousel = document.getElementById('subCabanaCarousel');
    if (!carousel) return;
    const slides = carousel.querySelectorAll('.sub-cabana-slide');
    if (index < 0 || index >= slides.length) return;

    currentSubCabanaIndex = index;
    const slideWidth = slides[0].offsetWidth;
    carousel.scrollTo({ left: slideWidth * index, behavior: 'smooth' });

    updateSubCabanaIndicators(index);
    resetSubCabanaAutoScroll();
}

function updateSubCabanaIndicators(index) {
    const indicators = document.querySelectorAll('#subCabanaIndicators .indicator');
    indicators.forEach((ind, i) => {
        ind.classList.toggle('active', i === index);
    });
}

function startSubCabanaAutoScroll() {
    clearInterval(subCabanaInterval);
    const carousel = document.getElementById('subCabanaCarousel');
    if (carousel && carousel.querySelectorAll('.sub-cabana-slide').length > 1) {
        subCabanaInterval = setInterval(() => {
            scrollSubCabana(1);
        }, 5000); // 5 seconds interval
    }
}

function resetSubCabanaAutoScroll() {
    startSubCabanaAutoScroll();
}

// Keep track of scroll position and update indicator accordingly
document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('scroll', (e) => {
        if (e.target.id === 'subCabanaCarousel') {
            clearTimeout(e.target.scrollTimeout);
            e.target.scrollTimeout = setTimeout(() => {
                const slides = e.target.querySelectorAll('.sub-cabana-slide');
                if (slides.length > 0) {
                    const slideWidth = slides[0].offsetWidth;
                    const index = Math.round(e.target.scrollLeft / slideWidth);
                    if (index !== currentSubCabanaIndex) {
                        currentSubCabanaIndex = index;
                        updateSubCabanaIndicators(index);
                        resetSubCabanaAutoScroll();
                    }
                }
            }, 100);
        }
    }, true);
});
