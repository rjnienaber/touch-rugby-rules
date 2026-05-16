/* ============================================================
   Touch Rugby Rules — Application JavaScript
   ============================================================ */

(function () {
    'use strict';

    /* ----------------------------------------------------------
       Mobile nav toggle
    ---------------------------------------------------------- */
    const navToggle = document.getElementById('navToggle');
    const sidebar   = document.getElementById('sidebar');
    const overlay   = document.getElementById('overlay');

    function openNav() {
        sidebar.classList.add('open');
        overlay.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }

    function closeNav() {
        sidebar.classList.remove('open');
        overlay.classList.remove('visible');
        document.body.style.overflow = '';
    }

    navToggle.addEventListener('click', () =>
        sidebar.classList.contains('open') ? closeNav() : openNav()
    );
    overlay.addEventListener('click', closeNav);

    document.querySelectorAll('.sidebar-nav a').forEach(a =>
        a.addEventListener('click', () => { if (window.innerWidth <= 860) closeNav(); })
    );


    /* ----------------------------------------------------------
       Back-to-top button
    ---------------------------------------------------------- */
    const backToTop = document.getElementById('backToTop');

    window.addEventListener('scroll', () => {
        backToTop.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });

    backToTop.addEventListener('click', e => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });


    /* ----------------------------------------------------------
       Scroll spy — highlight active nav link
    ---------------------------------------------------------- */
    const navLinks = Array.from(document.querySelectorAll('.sidebar-nav a[href^="#"]'));

    const spyObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const id = '#' + entry.target.id;
            navLinks.forEach(link =>
                link.classList.toggle('active', link.getAttribute('href') === id)
            );
        });
    }, { rootMargin: '-15% 0px -75% 0px' });

    document.querySelectorAll('[id]').forEach(el => {
        if (navLinks.some(a => a.getAttribute('href') === '#' + el.id)) {
            spyObserver.observe(el);
        }
    });


    /* ----------------------------------------------------------
       Client-side search — filter + highlight
    ---------------------------------------------------------- */
    const searchInput = document.getElementById('searchInput');
    const searchNav   = document.getElementById('searchNav');
    const searchCount = document.getElementById('searchCount');
    const prevBtn     = document.getElementById('prevMatch');
    const nextBtn     = document.getElementById('nextMatch');
    const contentEl   = document.getElementById('content');

    let matches      = [];
    let activeIndex  = -1;
    let debounceTimer;

    function escRe(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /* Remove all highlight marks */
    function clearMarks() {
        contentEl.querySelectorAll('mark.sh').forEach(m =>
            m.replaceWith(document.createTextNode(m.textContent))
        );
        contentEl.normalize();
    }

    /* Restore everything hidden by a previous filter pass */
    function restoreAll() {
        contentEl.querySelectorAll('.main-section, .card, .rule, .ruling, .def-item').forEach(el => {
            el.style.display = '';
        });
    }

    /* ----------------------------------------------------------
       Filter phase — hide non-matching rules/definitions
    ---------------------------------------------------------- */
    function filterContent(re) {

        /* Rules section ---------------------------------------- */
        contentEl.querySelectorAll('#section-rules .card').forEach(card => {
            const directRules = Array.from(card.children).filter(c => c.classList.contains('rule'));

            /* Cards with no direct .rule children (e.g. mode-of-play intro):
               match/hide the whole card based on its full text. */
            if (directRules.length === 0) {
                re.lastIndex = 0;
                card.style.display = re.test(card.textContent) ? '' : 'none';
                return;
            }

            let cardHasMatch = false;
            let lastRuleVisible = null; // null = no rule seen yet
            const pendingRulings = [];  // .ruling elements before the first .rule

            Array.from(card.children).forEach(child => {
                /* Rule heading is always kept visible */
                if (child.classList.contains('rule-section-title')) return;

                if (child.classList.contains('rule')) {
                    re.lastIndex = 0;
                    const hasMatch = re.test(child.textContent);
                    child.style.display = hasMatch ? '' : 'none';
                    if (hasMatch) cardHasMatch = true;
                    lastRuleVisible = hasMatch;

                } else if (child.classList.contains('ruling')) {
                    if (lastRuleVisible === null) {
                        /* Leading ruling (before any rule) — decision deferred */
                        pendingRulings.push(child);
                    } else {
                        /* Ruling immediately follows a rule — show iff that rule matched */
                        child.style.display = lastRuleVisible ? '' : 'none';
                    }
                }
            });

            /* Leading rulings: show if at least one rule in the card matched */
            pendingRulings.forEach(r => { r.style.display = cardHasMatch ? '' : 'none'; });

            card.style.display = cardHasMatch ? '' : 'none';
        });

        /* Definitions section ---------------------------------- */
        const defSection = contentEl.querySelector('#section-definitions');
        if (defSection) {
            let defHasMatch = false;
            defSection.querySelectorAll('.def-item').forEach(item => {
                re.lastIndex = 0;
                const hasMatch = re.test(item.textContent);
                item.style.display = hasMatch ? '' : 'none';
                if (hasMatch) defHasMatch = true;
            });
            const defCard = defSection.querySelector('.card');
            if (defCard) defCard.style.display = defHasMatch ? '' : 'none';
        }

        /* Communication / Level 2 — filter individual cards by text match */
        ['#section-communication', '#section-level2'].forEach(id => {
            const sec = contentEl.querySelector(id);
            if (!sec) return;
            sec.querySelectorAll('.card').forEach(card => {
                re.lastIndex = 0;
                card.style.display = re.test(card.textContent) ? '' : 'none';
            });
        });

        /* Hide entire main-sections that have no visible cards */
        contentEl.querySelectorAll('.main-section').forEach(section => {
            /* Field of Play section has no filterable cards — always keep it */
            if (section.id === 'section-field') return;
            const hasVisible = Array.from(section.querySelectorAll('.card'))
                .some(c => c.style.display !== 'none');
            section.style.display = hasVisible ? '' : 'none';
        });
    }

    /* ----------------------------------------------------------
       Highlight phase — mark matching text in visible nodes only
    ---------------------------------------------------------- */
    function highlightVisible(query) {
        const re = new RegExp(escRe(query), 'gi');

        const walker = document.createTreeWalker(
            contentEl,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    const tag = node.parentElement && node.parentElement.tagName;
                    if (['SCRIPT', 'STYLE', 'MARK', 'INPUT'].includes(tag))
                        return NodeFilter.FILTER_REJECT;
                    if (!node.nodeValue.trim())
                        return NodeFilter.FILTER_SKIP;
                    /* Skip text inside hidden elements */
                    let el = node.parentElement;
                    while (el && el !== contentEl) {
                        if (el.style.display === 'none') return NodeFilter.FILTER_REJECT;
                        el = el.parentElement;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const textNodes = [];
        let n;
        while ((n = walker.nextNode())) textNodes.push(n);

        textNodes.forEach(textNode => {
            re.lastIndex = 0;
            if (!re.test(textNode.nodeValue)) return;

            re.lastIndex = 0;
            const frag = document.createDocumentFragment();
            let last = 0, m;

            while ((m = re.exec(textNode.nodeValue)) !== null) {
                if (m.index > last)
                    frag.appendChild(document.createTextNode(textNode.nodeValue.slice(last, m.index)));
                const mark = document.createElement('mark');
                mark.className = 'sh';
                mark.textContent = m[0];
                frag.appendChild(mark);
                matches.push(mark);
                last = re.lastIndex;
            }

            if (last < textNode.nodeValue.length)
                frag.appendChild(document.createTextNode(textNode.nodeValue.slice(last)));

            textNode.parentNode.replaceChild(frag, textNode);
        });
    }

    /* ----------------------------------------------------------
       Sync sidebar nav visibility to filtered content state
    ---------------------------------------------------------- */
    function syncNavVisibility() {
        const active = searchInput.value.trim().length >= 2;

        document.querySelectorAll('.sidebar-nav li').forEach(li => {
            if (li.classList.contains('nav-heading')) return; // handled below
            const a = li.querySelector('a[href^="#"]');
            if (!a) return;
            if (!active) { li.style.display = ''; return; }
            const target = document.getElementById(a.getAttribute('href').slice(1));
            if (!target || target.id === 'section-field') { li.style.display = ''; return; }
            li.style.display = target.style.display === 'none' ? 'none' : '';
        });

        /* Nav headings: visible if at least one non-section sibling li is visible */
        document.querySelectorAll('.sidebar-nav .nav-heading').forEach(heading => {
            if (!active) { heading.style.display = ''; return; }
            let el = heading.nextElementSibling;
            let anyVisible = false;
            while (el && !el.classList.contains('nav-heading')) {
                const a = el.querySelector('a');
                if (a && a.classList.contains('nav-section-link')) break;
                if (el.style.display !== 'none') { anyVisible = true; break; }
                el = el.nextElementSibling;
            }
            heading.style.display = anyVisible ? '' : 'none';
        });
    }


    /* ----------------------------------------------------------
       Main search entry point
    ---------------------------------------------------------- */
    function applySearch(query) {
        clearMarks();
        restoreAll();
        matches     = [];
        activeIndex = -1;

        if (!query || query.length < 2) {
            syncNavVisibility();
            renderSearchUI();
            return;
        }

        const re = new RegExp(escRe(query), 'gi');

        filterContent(re);
        highlightVisible(query);
        syncNavVisibility();

        if (matches.length > 0) goTo(0);
        renderSearchUI();
    }

    function goTo(index) {
        if (!matches.length) return;

        if (activeIndex >= 0 && activeIndex < matches.length)
            matches[activeIndex].classList.remove('sh-active');

        activeIndex = ((index % matches.length) + matches.length) % matches.length;
        matches[activeIndex].classList.add('sh-active');
        matches[activeIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        renderSearchUI();
    }

    function renderSearchUI() {
        if (matches.length > 0) {
            searchCount.textContent = `${activeIndex + 1} / ${matches.length}`;
            searchNav.style.display = 'flex';
        } else if (searchInput.value.trim().length >= 2) {
            searchCount.textContent = 'No results';
            searchNav.style.display = 'flex';
        } else {
            searchNav.style.display = 'none';
        }
    }

    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => applySearch(searchInput.value.trim()), 220);
    });

    searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            goTo(e.shiftKey ? activeIndex - 1 : activeIndex + 1);
        }
        if (e.key === 'Escape') {
            searchInput.value = '';
            clearMarks();
            restoreAll();
            syncNavVisibility();
            matches = [];
            searchNav.style.display = 'none';
        }
    });

    nextBtn.addEventListener('click', () => goTo(activeIndex + 1));
    prevBtn.addEventListener('click', () => goTo(activeIndex - 1));

}());
