/* ============================================================
   Touch Rugby Rules — Application JavaScript
   ============================================================ */

(function () {
    'use strict';

    /* ----------------------------------------------------------
       Sticky top bar height → --topbar-h (used for scroll offsets)
    ---------------------------------------------------------- */
    const topbar = document.querySelector('.topbar');

    function syncTopbarHeight() {
        document.documentElement.style.setProperty('--topbar-h', topbar.offsetHeight + 'px');
    }
    syncTopbarHeight();
    if ('ResizeObserver' in window) new ResizeObserver(syncTopbarHeight).observe(topbar);


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
       Anchor ids the markup doesn't have: referee call groups and the
       first definition of each letter (for the sidebar), plus every
       definition, call and cribsheet row (so a search result can be
       opened exactly where it is)
    ---------------------------------------------------------- */
    function slug(str) {
        return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    function giveId(el, base) {
        if (el.id) return;
        let id = base, n = 2;
        while (document.getElementById(id)) id = base + '-' + n++;
        el.id = id;
    }

    document.querySelectorAll('#section-communication .comm-group-title').forEach(title => {
        title.id = 'comm-' + slug(title.textContent);
    });

    const seenLetters = new Set();
    document.querySelectorAll('#section-definitions .def-item').forEach(item => {
        const letter = item.querySelector('.def-term').textContent.trim().charAt(0).toUpperCase();
        if (seenLetters.has(letter)) return;
        seenLetters.add(letter);
        item.id = 'def-' + letter.toLowerCase();
    });

    document.querySelectorAll('#section-definitions .def-item').forEach(item =>
        giveId(item, 'term-' + slug(item.querySelector('.def-term').textContent)));

    document.querySelectorAll('#section-communication .comm-item').forEach(item =>
        giveId(item, 'call-' + slug(item.querySelector('.comm-call').textContent)));

    document.querySelectorAll('#section-penalties .pen-item').forEach(item =>
        giveId(item, 'pen-' + slug(item.querySelector('.pen-action').firstChild.textContent)));


    /* ----------------------------------------------------------
       Section views — one section at a time, chosen by the URL hash
    ---------------------------------------------------------- */
    const phone       = window.matchMedia('(max-width: 860px)');
    const sections    = Array.from(document.querySelectorAll('.main-section'));
    const tabs        = Array.from(document.querySelectorAll('.tab'));
    const sidebar     = document.getElementById('sidebar');
    const subnav      = document.getElementById('subnav');
    const subnavTitle = document.getElementById('subnavTitle');
    const jumpSelect  = document.getElementById('jumpSelect');
    const DEFAULT_SECTION = 'section-rules';

    let currentSection = null;
    let spyObserver    = null;

    const isSearching = () => document.body.classList.contains('searching');

    /* The things listed in the sidebar for a section */
    function subItems(section) {
        if (section.id === 'section-definitions') {
            return Array.from(section.querySelectorAll('.def-item[id^="def-"]'))
                .map(el => ({ id: el.id, label: el.id.slice(4).toUpperCase() }));
        }
        if (section.id === 'section-communication') {
            return Array.from(section.querySelectorAll('.comm-group-title'))
                .map(el => ({ id: el.id, label: el.textContent.trim() }));
        }
        return Array.from(section.querySelectorAll(':scope > .card[id]'))
            .map(card => {
                const title = card.querySelector('.rule-section-title');
                if (!title) return null;
                const badge = title.querySelector('.rule-num-badge');
                const num   = badge ? badge.textContent.trim() : '';
                const text  = title.textContent.replace(/\s+/g, ' ').trim().slice(num.length).trim();
                return { id: card.id, label: num ? `${num}. ${text}` : text };
            })
            .filter(Boolean);
    }

    function buildSubnav(section) {
        const items = subItems(section);
        document.body.classList.toggle('no-subnav', items.length === 0);

        subnavTitle.textContent = section.querySelector('h1').textContent;
        subnav.className = section.id === 'section-definitions' ? 'subnav-letters' : '';
        subnav.innerHTML = '';
        jumpSelect.innerHTML = '';
        jumpSelect.add(new Option('Jump to…', ''));

        items.forEach(item => {
            const li = document.createElement('li');
            const a  = document.createElement('a');
            a.href = '#' + item.id;
            a.textContent = item.label;
            li.appendChild(a);
            subnav.appendChild(li);
            jumpSelect.add(new Option(item.label, item.id));
        });

        watchScroll(items);
    }

    /* Scroll spy — highlight the sidebar link for what's on screen */
    function keepInView(link) {
        const l = link.getBoundingClientRect();
        const s = sidebar.getBoundingClientRect();
        if (l.top < s.top + 40) sidebar.scrollTop -= s.top + 40 - l.top;
        else if (l.bottom > s.bottom - 40) sidebar.scrollTop += l.bottom - (s.bottom - 40);
    }

    function watchScroll(items) {
        if (spyObserver) spyObserver.disconnect();
        const links = Array.from(subnav.querySelectorAll('a'));

        spyObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const href = '#' + entry.target.id;
                links.forEach(link => {
                    const on = link.getAttribute('href') === href;
                    link.classList.toggle('active', on);
                    if (on && sidebar.offsetParent) keepInView(link);
                });
                jumpSelect.value = entry.target.id;
            });
        }, { rootMargin: '-20% 0px -70% 0px' });

        items.forEach(item => spyObserver.observe(document.getElementById(item.id)));
    }

    function setSection(section) {
        if (section === currentSection) return false;
        currentSection = section;
        sections.forEach(s => s.classList.toggle('is-current', s === section));
        tabs.forEach(t => t.classList.toggle('active', t.getAttribute('href') === '#' + section.id));
        buildSubnav(section);
        return true;
    }

    /* Show whatever the hash points at: a section, or anything inside one
       (e.g. #rule-13 or #r13-12-1). No hash = home tiles on a phone,
       the Rules section on desktop. */
    function route(scroll = true, instant = false) {
        const id      = decodeURIComponent(location.hash.slice(1));
        const target  = id ? document.getElementById(id) : null;
        const section = target ? target.closest('.main-section') : null;

        if (!section) {
            document.body.classList.toggle('view-home', phone.matches);
            setSection(document.getElementById(DEFAULT_SECTION));
            if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
            return;
        }

        /* Following a link to something the current search has hidden */
        if (isSearching() && !target.offsetParent) {
            searchInput.value = '';
            clearSearch(false);
        }

        document.body.classList.remove('view-home');
        const switched = setSection(section);
        if (!scroll) return;

        if (target === section && !isSearching()) {
            window.scrollTo({ top: 0, behavior: 'instant' });
        } else {
            target.scrollIntoView({ behavior: switched || instant ? 'instant' : 'smooth', block: 'start' });
        }
    }

    function navigateTo(id) {
        if (location.hash === '#' + id) route();
        else location.hash = id;
    }

    window.addEventListener('hashchange', () => route());
    phone.addEventListener('change', () => route(false));

    jumpSelect.addEventListener('change', () => {
        if (jumpSelect.value) navigateTo(jumpSelect.value);
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
        contentEl.querySelectorAll('.main-section, .card, .rule, .ruling, .def-item, .pen-item').forEach(el => {
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

        /* Tap or Rollball cribsheet — filter individual rows */
        const penSection = contentEl.querySelector('#section-penalties');
        if (penSection) {
            let penHasMatch = false;
            penSection.querySelectorAll('.pen-item').forEach(item => {
                re.lastIndex = 0;
                const hasMatch = re.test(item.textContent);
                item.style.display = hasMatch ? '' : 'none';
                if (hasMatch) penHasMatch = true;
            });
            penSection.querySelector('.card').style.display = penHasMatch ? '' : 'none';
        }

        /* Field / Communication / Level 2 / Positioning — filter individual cards by text match */
        ['#section-field', '#section-communication', '#section-level2', '#section-positioning'].forEach(id => {
            const sec = contentEl.querySelector(id);
            if (!sec) return;
            sec.querySelectorAll('.card').forEach(card => {
                re.lastIndex = 0;
                card.style.display = re.test(card.textContent) ? '' : 'none';
            });
        });

        /* Hide entire main-sections that have no visible cards */
        contentEl.querySelectorAll('.main-section').forEach(section => {
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
                    if (['SCRIPT', 'STYLE', 'MARK', 'INPUT', 'SELECT', 'OPTION'].includes(tag))
                        return NodeFilter.FILTER_REJECT;
                    if (node.parentElement.closest('.section-bar, .search-hint'))
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
       Main search entry point — while a query is active every
       section with a match is shown at once
    ---------------------------------------------------------- */
    function applySearch(query) {
        if (!query || query.length < 2) { clearSearch(true); return; }

        clearMarks();
        restoreAll();
        matches     = [];
        activeIndex = -1;
        document.body.classList.add('searching');

        const re = new RegExp(escRe(query), 'gi');

        filterContent(re);
        highlightVisible(query);

        tabs.forEach(tab => {
            const section = document.querySelector(tab.getAttribute('href'));
            tab.classList.toggle('tab-empty', section.style.display === 'none');
        });

        if (matches.length > 0) goTo(0);
        else window.scrollTo({ top: 0, behavior: 'instant' });
        renderSearchUI();
    }

    /* Leave search mode. With land = true, go to where the selected
       match was so the reader keeps their place. */
    function clearSearch(land) {
        if (!isSearching()) { renderSearchUI(); return; }

        const active  = matches[activeIndex];
        const landing = land && active ? active.parentElement.closest('[id]') : null;

        clearMarks();
        restoreAll();
        matches     = [];
        activeIndex = -1;
        document.body.classList.remove('searching');
        tabs.forEach(tab => tab.classList.remove('tab-empty'));
        renderSearchUI();

        if (landing) navigateTo(landing.id);
        else if (land) route();
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
            clearTimeout(debounceTimer);
            searchInput.value = '';
            clearSearch(true);
        }
    });

    /* Clicking a search result leaves search and opens that item in its
       section. A link inside a result (e.g. a rule number) goes to the
       link's target instead. */
    const RESULT = '.rule, .def-item, .pen-item, .comm-item, .assess-item, .card';

    function flash(el) {
        el.classList.remove('flash');
        void el.offsetWidth;            // restart the animation
        el.classList.add('flash');
        el.addEventListener('animationend', () => el.classList.remove('flash'), { once: true });
    }

    contentEl.addEventListener('click', e => {
        if (!isSearching()) return;
        if (e.target.closest('button, input, select, textarea')) return;
        if (String(window.getSelection())) return;   // selecting text, not clicking

        const link = e.target.closest('a[href^="#"]');
        const result = e.target.closest(RESULT);
        const dest = link ? document.getElementById(link.getAttribute('href').slice(1))
                          : result && result.closest('[id]');
        if (!dest) return;

        e.preventDefault();
        clearTimeout(debounceTimer);
        searchInput.value = '';
        clearSearch(false);
        navigateTo(dest.id);
        flash(dest);
    });

    nextBtn.addEventListener('click', () => goTo(activeIndex + 1));
    prevBtn.addEventListener('click', () => goTo(activeIndex - 1));


    /* ----------------------------------------------------------
       Tap or Rollball cribsheet — outcome filter buttons
    ---------------------------------------------------------- */
    const penFilterBtns = document.querySelectorAll('.pen-filter-btn');

    penFilterBtns.forEach(btn => btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        penFilterBtns.forEach(b => b.classList.toggle('active', b === btn));
        document.querySelectorAll('#section-penalties .pen-item').forEach(item => {
            item.classList.toggle('pen-hidden', filter !== 'all' && !item.classList.contains('pen-' + filter));
        });
    }));


    route();
    /* The browser's own jump to the URL fragment can land after the first
       route() — settle the position again once everything has loaded */
    window.addEventListener('load', () => route(true, true));

}());
