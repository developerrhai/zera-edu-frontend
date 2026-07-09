const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
    ? "http://localhost:5000/api" 
    : "http://65.2.70.49:5000/api";

document.addEventListener("DOMContentLoaded", () => {
    loadTutors();

    // 1. Setup Lead Capture Callback Request Form Submission
    const callbackForm = document.querySelector('#search-tutors form');
    if (callbackForm) {
        callbackForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const inputs = callbackForm.querySelectorAll('input, select, textarea');
            const studentName = inputs[0].value.trim();
            const parentName = inputs[1].value.trim();
            const contactNumber = inputs[2].value.trim();
            const email = inputs[3].value.trim();
            const address = inputs[4].value.trim();
            const board = inputs[5].value;
            const standard = inputs[6].value;
            const schoolName = inputs[7].value.trim();

            if (!studentName || !parentName || !contactNumber || !address) {
                alert("Please fill out all required fields marked with *");
                return;
            }

            const data = { studentName, parentName, contactNumber, email, address, board, standard, schoolName };

            try {
                const response = await fetch(`${API_BASE}/enquiries/callback`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (result.success) {
                    alert(result.message);
                    callbackForm.reset();
                } else {
                    alert('Validation Error: ' + result.error);
                }
            } catch (err) {
                alert('Could not connect to ZERA EDU server gateway. Please try again.');
            }
        });
    }

    // 2. Setup Contact Form Submission
    const contactForm = document.querySelector('#contact form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inputs = contactForm.querySelectorAll('input, select, textarea');
            const fullName = inputs[0].value.trim();
            const email = inputs[1].value.trim();
            const phoneNumber = inputs[2].value.trim();
            const inquiryType = inputs[3].value;
            const message = inputs[4].value.trim();

            if (!fullName || !email || !message) {
                alert("Please fill out all required fields marked with *");
                return;
            }

            const data = { fullName, email, phoneNumber, inquiryType, message };

            try {
                const response = await fetch(`${API_BASE}/enquiries/contact`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (result.success) {
                    alert(result.message);
                    contactForm.reset();
                } else {
                    alert('Validation Error: ' + result.error);
                }
            } catch (err) {
                alert('Could not connect to ZERA EDU server gateway. Please try again.');
            }
        });
    }

    // 3. Setup Tutor directory search button action handler
    const searchBar = document.getElementById('search-bar');
    if (searchBar) {
        const searchBtn = searchBar.querySelector('button');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const location = searchBar.querySelector('input').value.trim();
                const board = searchBar.querySelectorAll('select')[0].value;
                const standard = searchBar.querySelectorAll('select')[1].value;
                
                const subjectSelect = searchBar.querySelectorAll('select')[2];
                const subject = subjectSelect ? Array.from(subjectSelect.selectedOptions).map(o => o.value).filter(v => v !== "").join(',') : '';
                
                const timingGroup = searchBar.querySelectorAll('select')[3].value;
                const pricing = searchBar.querySelectorAll('select')[4].value;
                const experience = searchBar.querySelectorAll('select')[5].value;

                // Map pricing parameters to boundaries
                let minCost = '', maxCost = '';
                if (pricing === '200-400') { minCost = 200; maxCost = 400; }
                else if (pricing === '400-800') { minCost = 400; maxCost = 800; }
                else if (pricing === '800+') { minCost = 800; }

                // Map experience parameters to boundaries
                let minExp = '';
                if (experience === '0-2') minExp = 0;
                else if (experience === '3-5') minExp = 3;
                else if (experience === '5-10') minExp = 5;
                else if (experience === '10+') minExp = 10;

                loadTutors({ location, board, standard, subject, timingGroup, minCost, maxCost, minExp });
            });
        }
    }
});

/**
 * Fetch verified teachers matching search criteria and update Tutor Grid
 */
async function loadTutors(filters = {}) {
    const tutorContainer = document.querySelector('.lg\\:col-span-8.space-y-6');
    if (!tutorContainer) return;

    const params = new URLSearchParams();
    Object.keys(filters).forEach(k => {
        if (filters[k] !== undefined && filters[k] !== '') {
            params.append(k, filters[k]);
        }
    });

    try {
        const res = await fetch(`${API_BASE}/teachers?${params.toString()}`);
        const data = await res.json();
        
        if (data.success) {
            const header = tutorContainer.firstElementChild;
            tutorContainer.innerHTML = '';
            tutorContainer.appendChild(header);

            if (data.teachers.length === 0) {
                const emptyCard = document.createElement('div');
                emptyCard.className = "bg-white p-8 rounded-2xl border text-center text-slate-400 font-bold text-xs";
                emptyCard.innerText = "No verified tutors match the current search filters.";
                tutorContainer.appendChild(emptyCard);
                return;
            }

            data.teachers.forEach(t => {
                let starsLayout = '';
                for (let i = 0; i < 5; i++) {
                    starsLayout += `<i data-lucide="star" class="w-3.5 h-3.5 ${i < t.stars ? 'text-amber-400 fill-current' : 'text-slate-200'}"></i>`;
                }

                const card = document.createElement('div');
                card.className = "bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-5 hover:border-indigo-300 transition-colors relative overflow-hidden";
                
                const initials = t.name.split(' ').map(n => n[0]).join('');
                
                card.innerHTML = `
                    <div class="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-black text-xl shrink-0 overflow-hidden">
                        <img src="${t.avatarUrl}" class="w-full h-full object-cover" onerror="this.style.display='none'">
                        <span>${initials}</span>
                    </div>
                    <div class="flex-grow">
                        <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
                            <h4 class="text-lg font-black text-slate-900">${t.name} <i data-lucide="badge-check" class="w-4 h-4 text-emerald-500 inline"></i></h4>
                            <span class="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">Exp: ${t.expYears} Years</span>
                        </div>
                        <p class="text-sm font-bold text-indigo-600 mb-2">${t.subject} • ${t.board} • ${t.standard}</p>
                        
                        <div class="flex flex-wrap items-center gap-4 text-xs text-slate-500 mb-4">
                            <span class="flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3 text-rose-500"></i> ${t.slots[0] ? t.slots[0].location : 'Wakad, Pune'}</span>
                            <span class="flex items-center gap-1"><i data-lucide="graduation-cap" class="w-3.5 h-3.5 text-indigo-500"></i> ${t.degree}</span>
                            <div class="flex items-center gap-0.5">${starsLayout}</div>
                        </div>
                        <div class="flex gap-2">
                            <a href="app.html" class="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">Book Session (₹${t.cost}/hr)</a>
                        </div>
                    </div>
                `;
                tutorContainer.appendChild(card);
            });

            if (window.lucide) {
                window.lucide.createIcons();
            }
        }
    } catch (err) {
        console.error("Failed to load tutors directory:", err);
    }
}
