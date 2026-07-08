// Global state objects
let usersDatabase = [];
let teachersProfileRegistry = [];
let onboardingPipelineQueue = [];
let systemActiveBookings = [];
let systemPaymentsLedger = [];
let activeAuthenticatedUser = null;
let selectedAuthenticationRoleScope = 'student';
let targetSelectedTeacherObject = null;
let systemAttendanceRecords = [];
let systemSubscriptionPlans = [];
let activeUserSubscription = null;
let adminUsersList = [];
let adminSubscribersList = [];
let adminEnquiriesList = [];
let adminAttendanceList = [];


const roleMenuRouteMatrices = {
    student: [
        { label: 'Find Teachers', icon: 'search', viewId: 'view-student-teachers' },
        { label: 'My Bookings', icon: 'calendar-check', viewId: 'view-student-profile' },
        { label: 'Attendance', icon: 'calendar-check-2', viewId: 'view-shared-attendance' },
        { label: 'Subscriptions', icon: 'zap', viewId: 'view-shared-subscriptions' },
        { label: 'Payments', icon: 'receipt', viewId: 'view-payment-history' },
        { label: 'Refer & Earn', icon: 'gift', viewId: 'view-refer-earn' },
    ],
    teacher: [
        { label: 'Manage Slots', icon: 'calendar-plus', viewId: 'view-teacher-slots' },
        { label: 'My Bookings', icon: 'briefcase', viewId: 'view-teacher-directory' },
        { label: 'Attendance', icon: 'calendar-check-2', viewId: 'view-shared-attendance' },
        { label: 'Subscriptions', icon: 'zap', viewId: 'view-shared-subscriptions' },
        { label: 'Payments', icon: 'receipt', viewId: 'view-payment-history' },
        { label: 'Refer & Earn', icon: 'gift', viewId: 'view-refer-earn' },
    ],
    admin: [
        { label: 'Dashboard', icon: 'layout-dashboard', viewId: 'view-admin-dashboard' },
        { label: 'User Management', icon: 'users', viewId: 'view-admin-users' },
        { label: 'All Bookings', icon: 'shield-alert', viewId: 'view-admin-bookings' },
        { label: 'Onboarding Queue', icon: 'user-plus', viewId: 'view-admin-onboarding' },
        { label: 'Attendance Monitor', icon: 'calendar-check-2', viewId: 'view-admin-attendance' },
        { label: 'Subscriptions', icon: 'credit-card', viewId: 'view-admin-subscriptions' },
        { label: 'Enquiries', icon: 'message-square', viewId: 'view-admin-enquiries' },
        { label: 'Payments', icon: 'receipt', viewId: 'view-payment-history' },
        { label: 'Settings', icon: 'settings', viewId: 'view-admin-settings' },
    ],
};

// Initialize app event bindings
document.addEventListener("DOMContentLoaded", () => {
    assignActiveScopeRole('student');
    if (window.lucide) {
        window.lucide.createIcons();
    }
});

function assignActiveScopeRole(role) {
    selectedAuthenticationRoleScope = role;
    document.querySelectorAll('.role-matrix-chip').forEach(c => c.className = "role-matrix-chip border border-slate-200 text-slate-500 py-2 rounded-xl font-bold text-xs flex flex-col items-center gap-1");
    document.getElementById(`chip-role-${role}`).className = "role-matrix-chip border-2 border-indigo-600 bg-indigo-50/50 text-indigo-700 py-2 rounded-xl font-bold text-xs flex flex-col items-center gap-1";
    
    const emailInput = document.getElementById('login-auth-email');
    if (role === 'admin') emailInput.value = "admin@zeraedu.com";
    else if (role === 'teacher') emailInput.value = "ananya@zeraedu.com";
    else emailInput.value = "kabir@zeraedu.com";
}

function displayRecoveryWorkflow() { document.getElementById('recovery-overlay-pane').classList.replace('hidden', 'flex'); }
function dismissRecoveryWorkflow() { document.getElementById('recovery-overlay-pane').classList.replace('flex', 'hidden'); }

async function processSystemRecoveryRequest() {
    const email = document.getElementById('recovery-target-email').value;
    if (!email) return triggerNotificationToast("Email is required.", "error");

    try {
        const data = await apiFetch('/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        triggerNotificationToast(data.message, "success");
        dismissRecoveryWorkflow();
    } catch (err) {
        console.error(err);
    }
}

async function executeAuthVerification(e) {
    e.preventDefault();
    const email = document.getElementById('login-auth-email').value;
    const password = document.getElementById('login-auth-key').value || 'password123';
    
    try {
        // Attempt login via API
        const loginRes = await fetch(`http://localhost:5000/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        let result = await loginRes.json();
        
        // If login returns unauthorized credentials fallback to register (matches frontend mocks logic)
        if (!loginRes.ok && result.error && result.error.includes("Invalid")) {
            const name = email.split('@')[0].toUpperCase();
            const registerRes = await fetch(`http://localhost:5000/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name, role: selectedAuthenticationRoleScope })
            });
            if (!registerRes.ok) {
                const regError = await registerRes.json();
                return triggerNotificationToast(regError.error, 'error');
            }
            result = await registerRes.json();
            triggerNotificationToast("Account auto-provisioned successfully.", "success");
        } else if (!loginRes.ok) {
            return triggerNotificationToast(result.error, 'error');
        }

        // Store tokens
        localStorage.setItem("accessToken", result.accessToken);
        localStorage.setItem("refreshToken", result.refreshToken);
        localStorage.removeItem("isDemoMode");
        activeAuthenticatedUser = result.user;
        
        launchIntegratedApplicationFrame();
    } catch (err) {
        console.warn("Could not connect to authentication gateway. Activating local demo mode fallback.", err);
        
        // Fallback demo mode logic
        localStorage.setItem("isDemoMode", "true");
        localStorage.setItem("accessToken", "demo-access-token");
        localStorage.setItem("refreshToken", "demo-refresh-token");
        
        let name = "Demo User";
        let role = selectedAuthenticationRoleScope;
        
        if (email === "admin@zeraedu.com") {
            name = "System Administrator";
            role = "admin";
        } else if (email === "ananya@zeraedu.com") {
            name = "Prof. Ananya Kulkarni";
            role = "teacher";
        } else if (email === "kabir@zeraedu.com") {
            name = "Kabir Mehta";
            role = "student";
        } else {
            name = email.split('@')[0].toUpperCase();
        }
        
        activeAuthenticatedUser = { name, email, role };
        triggerNotificationToast("Offline Demo Mode: Connected using pre-seeded local client data.", "info");
        launchIntegratedApplicationFrame();
    }
}

async function launchIntegratedApplicationFrame() {
    document.getElementById('gatekeeper-layer').classList.add('hidden');
    document.getElementById('integrated-app-runtime').classList.remove('hidden');

    document.getElementById('app-badge-scope').innerText = `${activeAuthenticatedUser.role} Module`;
    document.getElementById('user-display-title').innerText = activeAuthenticatedUser.name;
    document.getElementById('user-display-subtitle').innerText = `${activeAuthenticatedUser.role} environment`;
    document.getElementById('user-avatar-chip').innerText = activeAuthenticatedUser.name.split(' ').map(n=>n[0]).join('');

    const menuContainer = document.getElementById('sidebar-menu-items');
    menuContainer.innerHTML = '';
    const associatedRoutes = roleMenuRouteMatrices[activeAuthenticatedUser.role];

    associatedRoutes.forEach((route, idx) => {
        const button = document.createElement('button');
        button.onclick = () => switchWorkspaceRouteView(route.viewId, button);
        button.className = `w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all ` +
            (idx === 0 ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800/60');
        button.innerHTML = `<i data-lucide="${route.icon}" class="w-4 h-4"></i> <span>${route.label}</span>`;
        menuContainer.appendChild(button);
    });

    switchWorkspaceRouteView(associatedRoutes[0].viewId);
    await synchronizePlatformStateMatrices();
}

function switchWorkspaceRouteView(viewId, activeBtnRef = null) {
    document.querySelectorAll('.domain-view-pane').forEach(p => p.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    if (activeBtnRef) {
        document.querySelectorAll('#sidebar-menu-items button').forEach(b => b.className = "w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all");
        activeBtnRef.className = "w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 text-white shadow-md transition-all";
    }
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function executeEcosystemSignout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    activeAuthenticatedUser = null;
    document.getElementById('integrated-app-runtime').classList.add('hidden');
    document.getElementById('gatekeeper-layer').classList.remove('hidden');
}

// Search and list verified teachers
function renderStudentTeacherDirectoryGrid() {
    const container = document.getElementById('faculty-cards-discovery-grid');
    if(!container) return;
    container.innerHTML = '';

    const stdVal = document.getElementById('filter-std').value;
    const timingVal = document.getElementById('filter-timing').value;
    const subVal = document.getElementById('filter-subject').value;
    const locVal = document.getElementById('filter-location').value;

    const visibleProfiles = teachersProfileRegistry.filter(t => {
        if (stdVal && t.standard !== stdVal) return false;
        if (timingVal && t.timingGroup !== timingVal) return false;
        if (subVal && t.subject !== subVal) return false;
        if (locVal && !t.slots.some(s => s.location === locVal)) return false;
        return true;
    });

    if(visibleProfiles.length === 0) {
        container.innerHTML = `<div class="col-span-full bg-slate-100 border border-dashed rounded-2xl p-8 text-center text-xs text-slate-400 font-bold">No available profiles match criteria matrices.</div>`;
        return;
    }

    visibleProfiles.forEach(t => {
        let starsLayout = '';
        for(let i=0; i<5; i++) starsLayout += `<i data-lucide="star" class="w-3.5 h-3.5 ${i < t.stars ? 'text-amber-400 fill-current' : 'text-slate-200'}"></i>`;

        const card = document.createElement('div');
        card.className = "bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3";
        card.innerHTML = `
            <div class="flex gap-3 items-start">
                <img src="${t.avatarUrl}" class="w-12 h-12 rounded-xl object-cover border bg-slate-100 flex-shrink-0">
                <div class="space-y-0.5 min-w-0">
                    <h4 class="font-black text-slate-900 text-xs truncate">${t.name}</h4>
                    <p class="text-[11px] text-slate-400 font-bold truncate">${t.degree}</p>
                    <div class="flex items-center gap-1 pt-0.5">${starsLayout} <span class="text-[10px] text-slate-400 font-bold">(${t.expYears} Yrs)</span></div>
                </div>
            </div>
            <div class="bg-slate-50 p-2 rounded-xl text-[10px] space-y-0.5 font-bold text-slate-600 border border-slate-100">
                <div class="flex justify-between"><span>Subject / Grade</span><span class="text-slate-900">${t.subject} (${t.standard})</span></div>
                <div class="flex justify-between"><span>Board Context</span><span class="text-slate-900">${t.board}</span></div>
                <div class="flex justify-between"><span>Service Limit</span><span class="text-indigo-600"><i data-lucide="map-pin" class="w-2.5 h-2.5 inline mr-0.5"></i>${t.mapRadiusKm} KM Radius</span></div>
                <div class="flex justify-between items-center pt-1 border-t border-slate-200 mt-1"><span>Rate Quote</span><span class="font-black text-emerald-600 text-xs">₹${t.cost}/Hr</span></div>
            </div>
            <div class="grid grid-cols-2 gap-2 pt-1">
                <button onclick="launchDetailedProfileModal('${t.id}')" class="border text-slate-700 font-bold text-[11px] py-2 rounded-lg flex items-center justify-center gap-1"><i data-lucide="user-search" class="w-3.5 h-3.5"></i> Profile / Video</button>
                <button onclick="launchDirectBookingWizard('${t.id}')" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] py-2 rounded-lg">Book Now</button>
            </div>
        `;
        container.appendChild(card);
    });
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function clearStudentSearchFilters() {
    document.getElementById('filter-std').value = '';
    document.getElementById('filter-timing').value = '';
    document.getElementById('filter-subject').value = '';
    document.getElementById('filter-location').value = '';
    renderStudentTeacherDirectoryGrid();
}

// Profile detail views modal
function launchDetailedProfileModal(teacherId) {
    const teacher = teachersProfileRegistry.find(t => t.id === teacherId);
    if(!teacher) return;
    targetSelectedTeacherObject = teacher;

    document.getElementById('modal-prof-fullname').innerText = teacher.name;
    document.getElementById('modal-prof-meta-specs').innerText = `${teacher.subject} • ${teacher.board}`;
    document.getElementById('modal-prof-degree').innerText = teacher.degree;
    document.getElementById('modal-prof-fees').innerText = `₹${teacher.cost} / Hour`;
    document.getElementById('modal-prof-std-scope').innerText = teacher.standard;
    document.getElementById('modal-prof-radius-scope').innerText = `Within ${teacher.mapRadiusKm} km operational radius (Google Maps Sync)`;
    document.getElementById('modal-prof-avatar-placeholder').innerHTML = `<img src="${teacher.avatarUrl}" class="w-full h-full object-cover">`;
    
    document.getElementById('modal-prof-youtube-iframe').src = teacher.youtubeUrl;

    const slotGrid = document.getElementById('modal-prof-slots-grid');
    slotGrid.innerHTML = '';
    teacher.slots.forEach(s => {
        slotGrid.innerHTML += `
            <div class="p-2 border rounded-xl bg-slate-50 text-[10px] font-bold text-slate-700">
                <div class="text-indigo-600">${s.day}</div>
                <div class="mt-0.5 font-mono">${s.time_window}</div>
                <div class="text-[9px] text-slate-400">${s.location}</div>
            </div>
        `;
    });

    document.getElementById('modal-prof-direct-book-btn').onclick = () => { dismissDetailedProfileModal(); launchDirectBookingWizard(teacherId); };
    document.getElementById('modal-profile-deep-dive').classList.replace('hidden', 'flex');
}

function dismissDetailedProfileModal() {
    document.getElementById('modal-prof-youtube-iframe').src = "";
    document.getElementById('modal-profile-deep-dive').classList.replace('flex', 'hidden');
}

// Update geographic radial bounds
async function updateTeacherMappingRadius() {
    const radius = document.getElementById('teacher-map-radius').value;
    const activeTeacher = teachersProfileRegistry.find(t => t.userId === activeAuthenticatedUser.id);
    if (!activeTeacher) return;

    try {
        await apiFetch(`/teachers/${activeTeacher.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mapRadiusKm: radius })
        });
        document.getElementById('map-api-radius-indicator').innerText = `RADIUS: ${radius}KM SYNCED`;
        triggerNotificationToast(`Google Maps API bounds set to localized ${radius} kilometer range.`, "info");
        await synchronizePlatformStateMatrices();
    } catch (err) {
        console.error(err);
    }
}

// Update youtube showcase preview video
async function saveTeacherYoutubeMediaAnchor() {
    const link = document.getElementById('teacher-yt-link').value;
    const activeTeacher = teachersProfileRegistry.find(t => t.userId === activeAuthenticatedUser.id);
    if(!activeTeacher) return;

    try {
        await apiFetch(`/teachers/${activeTeacher.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ youtubeUrl: link })
        });
        triggerNotificationToast("Portfolio YouTube lecture video path successfully mapped.", "success");
        await synchronizePlatformStateMatrices();
    } catch (err) {
        console.error(err);
    }
}

// Add new slot
async function handleTeacherSlotAddition(e) {
    e.preventDefault();
    const day = document.getElementById('slot-day').value;
    const time = document.getElementById('slot-time').value;
    const loc = document.getElementById('slot-loc').value;
    
    try {
        await apiFetch('/slots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ day, timeWindow: time, location: loc })
        });
        triggerNotificationToast("Availability matrix constraint added.", "success");
        document.getElementById('slot-creation-form').reset();
        await synchronizePlatformStateMatrices();
    } catch (err) {
        console.error(err);
    }
}

// Invoice creation dialog
function launchDirectBookingWizard(teacherId) {
    const teacher = teachersProfileRegistry.find(t => t.id === teacherId);
    if(!teacher) return;
    targetSelectedTeacherObject = teacher;

    document.getElementById('wizard-tutor-identity').innerText = `Primary Endpoint Node: ${teacher.name}`;
    const selector = document.getElementById('wizard-slot-selector');
    selector.innerHTML = '';
    
    if (teacher.slots.length === 0) {
        selector.innerHTML = `<option value="">No Slots Available (Already Booked)</option>`;
    } else {
        teacher.slots.forEach(s => {
            selector.innerHTML += `<option value="${s.id}">${s.day} (${s.time_window}) [${s.location}]</option>`;
        });
    }

    document.getElementById('wizard-calc-base').innerText = `₹${teacher.cost}`;
    document.getElementById('wizard-calc-tax').innerText = `₹${(teacher.cost * 0.18).toFixed(2)}`;
    document.getElementById('wizard-calc-total').innerText = `₹${(teacher.cost * 1.18).toFixed(2)}`;
    document.getElementById('modal-invoice-allocation-wizard').classList.replace('hidden', 'flex');
}

function dismissAllocationWizardModal() { document.getElementById('modal-invoice-allocation-wizard').classList.replace('flex', 'hidden'); }

// Record booking creation and payment stub
async function commitAccountAllocationPayment() {
    const selector = document.getElementById('wizard-slot-selector');
    if(!selector.value) return triggerNotificationToast("No available slot selection vector.", "error");

    const slotId = Number(selector.value);
    const idempotencyKey = "key_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

    try {
        await apiFetch('/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                teacherProfileId: targetSelectedTeacherObject.id,
                slotId,
                idempotencyKey
            })
        });

        triggerNotificationToast("Booking allocation handshake cleared.", "success");
        dismissAllocationWizardModal();
        await synchronizePlatformStateMatrices();
    } catch (err) {
        console.error(err);
    }
}

// State synchronization mapping
async function synchronizePlatformStateMatrices() {
    if (!activeAuthenticatedUser) return;

    if (localStorage.getItem("isDemoMode") === "true") {
        // Populate mock database
        teachersProfileRegistry = [
            {
                id: "1",
                userId: 2,
                name: "Prof. Ananya Kulkarni",
                subject: "Mathematics",
                board: "ICSE Framework",
                standard: "Grade 12",
                timingGroup: "Evening",
                mapRadiusKm: 5,
                youtubeUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                cost: 650,
                expYears: 8,
                stars: 5,
                degree: "M.Sc. Mathematics (IIT Bombay)",
                avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
                slots: [
                    { id: 1, day: "Monday", time_window: "04:00 PM - 06:00 PM", location: "Online Virtual" },
                    { id: 2, day: "Wednesday", time_window: "05:00 PM - 07:00 PM", location: "Offline Center" }
                ]
            },
            {
                id: "2",
                userId: 3,
                name: "Dr. Rajesh Kapoor",
                subject: "Physics",
                board: "CBSE Framework",
                standard: "Grade 10",
                timingGroup: "Morning",
                mapRadiusKm: 3,
                youtubeUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                cost: 800,
                expYears: 12,
                stars: 4,
                degree: "Ph.D. in High Energy Particle Physics",
                avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80",
                slots: [
                    { id: 3, day: "Tuesday", time_window: "10:00 AM - 12:00 PM", location: "Online Virtual" }
                ]
            },
            {
                id: "3",
                userId: 4,
                name: "Dr. Vikram Malhotra",
                subject: "Chemistry",
                board: "CBSE Framework",
                standard: "Grade 12",
                timingGroup: "Morning",
                mapRadiusKm: 10,
                youtubeUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                cost: 700,
                expYears: 15,
                stars: 5,
                degree: "Ph.D. in Organic Chemistry (NCL Pune)",
                avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
                slots: [
                    { id: 4, day: "Thursday", time_window: "09:00 AM - 11:00 AM", location: "Online Virtual" }
                ]
            }
        ];

        systemActiveBookings = [
            { id: 1, ref_code: "ZERA-101", studentId: 10, studentName: "Kabir Mehta", teacherName: "Prof. Ananya Kulkarni", slotInfo: "Friday (02:00 PM - 04:00 PM)", location: "Online Virtual", status: "Pending Completion", date: "2026-07-08" },
            { id: 2, ref_code: "ZERA-102", studentId: 10, studentName: "Kabir Mehta", teacherName: "Dr. Rajesh Kapoor", slotInfo: "Wednesday (10:00 AM - 12:00 PM)", location: "Online Virtual", status: "Completed", date: "2026-07-08" },
            { id: 3, ref_code: "ZERA-103", studentId: 11, studentName: "Rohan Sharma", teacherName: "Dr. Vikram Malhotra", slotInfo: "Thursday (09:00 AM - 11:00 AM)", location: "Online Virtual", status: "Cancelled", date: "2026-07-08" }
        ];

        systemPaymentsLedger = [
            { id: 1, transaction_id: "TXN_9921", amount: 650.00, gateway_method: "UPI Razorpay API", status: "settled", created_at: "2026-07-08T10:00:00.000Z" },
            { id: 2, transaction_id: "TXN_8812", amount: 800.00, gateway_method: "UPI Razorpay API", status: "settled", created_at: "2026-07-08T11:00:00.000Z" },
            { id: 3, transaction_id: "TXN_7761", amount: 3999.00, gateway_method: "Card Payment", status: "settled", created_at: "2026-07-08T12:00:00.000Z" }
        ];

        systemAttendanceRecords = [
            { id: 1, studentName: "Kabir Mehta", teacherName: "Prof. Ananya Kulkarni", date: "2026-07-08", status: "Present", remarks: "Completed academic node connection." },
            { id: 2, studentName: "Kabir Mehta", teacherName: "Prof. Ananya Kulkarni", date: "2026-07-07", status: "Absent", remarks: "Student was away." }
        ];

        systemSubscriptionPlans = [
            { id: 1, name: "Standard Academic Hub", price: 1999.00, billing_cycle: "Monthly", features: "Up to 3 hours of online sessions per week, Standard matching priorities, Email support vectors" },
            { id: 2, name: "Premium Unlimited Matrix", price: 3999.00, billing_cycle: "Monthly", features: "Unlimited online & offline sessions, 24/7 dedicated support priority, Google Maps radius override access" }
        ];

        activeUserSubscription = {
            planName: "Premium Unlimited Matrix",
            price: 3999.00,
            billingCycle: "Monthly",
            status: "Active",
            end_date: "2026-08-08"
        };

        if (activeAuthenticatedUser.role === 'admin') {
            setTimeout(() => {
                const bEl = document.getElementById('stat-billings'); if (bEl) bEl.innerText = "₹5,449";
                const rEl = document.getElementById('stat-revenue'); if (rEl) rEl.innerText = "₹817";
                const tEl = document.getElementById('stat-tutors'); if (tEl) tEl.innerText = "3 Nodes";
                const qEl = document.getElementById('stat-queue'); if (qEl) qEl.innerText = "1 Node";
            }, 50);

            onboardingPipelineQueue = [
                { id: 5, name: "Dr. Smita Patil", email: "smita@zeraedu.com", subject: "Biology", degree: "Ph.D. in Botany", cost_per_hour: 550, experience_years: 6 }
            ];

            adminUsersList = [
                { id: 1, name: "System Administrator", email: "admin@zeraedu.com", role: "admin", is_active: 1 },
                { id: 10, name: "Kabir Mehta", email: "kabir@zeraedu.com", role: "student", is_active: 1 },
                { id: 11, name: "Rohan Sharma", email: "rohan@zeraedu.com", role: "student", is_active: 1 },
                { id: 12, name: "Priya Deshmukh", email: "priya@zeraedu.com", role: "student", is_active: 1 },
                { id: 2, name: "Prof. Ananya Kulkarni", email: "ananya@zeraedu.com", role: "teacher", is_active: 1 },
                { id: 3, name: "Dr. Rajesh Kapoor", email: "rajesh@zeraedu.com", role: "teacher", is_active: 1 },
                { id: 4, name: "Dr. Vikram Malhotra", email: "vikram@zeraedu.com", role: "teacher", is_active: 1 }
            ];

            adminSubscribersList = [
                { studentName: "Kabir Mehta", email: "kabir@zeraedu.com", planName: "Premium Unlimited Matrix", status: "Active", startDate: "2026-07-08" },
                { studentName: "Rohan Sharma", email: "rohan@zeraedu.com", planName: "Standard Academic Hub", status: "Active", startDate: "2026-07-08" }
            ];

            adminEnquiriesList = [
                { id: 1, type: "callback", student_name: "Amit Sharma", parent_name: "Vijay Sharma", contact_number: "9876543210", email: "vijay@gmail.com", address: "Aundh Road, Pune", board: "CBSE", standard: "Class 11-12", status: "new" },
                { id: 2, type: "callback", student_name: "Sunita Patel", parent_name: "Karan Patel", contact_number: "9988776655", email: "karan@patel.com", address: "Wakad Main Road, Pune", board: "ICSE", standard: "Class 9-10", status: "contacted" },
                { id: 3, type: "contact", student_name: "Ramesh Kulkarni", email: "ramesh@gmail.com", contact_number: "9890123456", inquiry_type: "Billing & Payments", message: "I wanted to check what card networks are accepted for the Academic Pro plan.", status: "resolved" }
            ];

            adminAttendanceList = systemAttendanceRecords;
        }

        renderStudentTeacherDirectoryGrid();
        renderStudentActiveBookingsTable();
        renderTeacherDynamicSlotsMatrix();
        renderTeacherAssignedBookingsTable();
        renderAdminCoreControlPanel();
        renderGlobalPaymentsLedger();

        renderAttendanceLog();
        renderAttendanceCalendar();
        renderSubscriptionPlans();

        if (activeAuthenticatedUser.role === 'admin') {
            renderAdminUsersTable();
            renderAdminAttendanceMonitor();
            renderAdminSubscriptionOverview();
            renderAdminEnquiriesTable();
        }
        return;
    }

    try {
        // Fetch directory profiles
        const teachersRes = await apiFetch('/teachers');
        teachersProfileRegistry = teachersRes.teachers;

        // Fetch bookings list
        const bookingsRes = await apiFetch('/bookings');
        systemActiveBookings = bookingsRes.bookings;

        // Fetch transaction ledgers
        const paymentsRes = await apiFetch('/payments');
        systemPaymentsLedger = paymentsRes.payments;

        // Fetch attendance logs
        const attendanceRes = await apiFetch('/attendance');
        systemAttendanceRecords = attendanceRes.attendance;

        // Fetch subscriptions & plans
        const plansRes = await apiFetch('/subscriptions/plans');
        systemSubscriptionPlans = plansRes.plans;

        const mySubRes = await apiFetch('/subscriptions/my');
        activeUserSubscription = mySubRes.subscription;

        // Populate administrative stats
        if (activeAuthenticatedUser.role === 'admin') {
            const dashRes = await apiFetch('/admin/dashboard');
            document.getElementById('stat-billings').innerText = `₹${dashRes.stats.totalBillings.toLocaleString()}`;
            document.getElementById('stat-revenue').innerText = `₹${dashRes.stats.retentionFee.toLocaleString()}`;
            document.getElementById('stat-tutors').innerText = `${dashRes.stats.totalTutors} Node`;
            document.getElementById('stat-queue').innerText = `${dashRes.stats.queueCount} Node`;

            const onboardingRes = await apiFetch('/admin/onboarding');
            onboardingPipelineQueue = onboardingRes.queue;

            const usersRes = await apiFetch('/admin/users');
            adminUsersList = usersRes.users;

            const subsRes = await apiFetch('/admin/subscriptions/overview');
            adminSubscribersList = subsRes.subscribers;

            const enquiriesRes = await apiFetch('/enquiries');
            adminEnquiriesList = enquiriesRes.enquiries;

            const attendanceAllRes = await apiFetch('/attendance');
            adminAttendanceList = attendanceAllRes.attendance;
        }

        renderStudentTeacherDirectoryGrid();
        renderStudentActiveBookingsTable();
        renderTeacherDynamicSlotsMatrix();
        renderTeacherAssignedBookingsTable();
        renderAdminCoreControlPanel();
        renderGlobalPaymentsLedger();

        renderAttendanceLog();
        renderAttendanceCalendar();
        renderSubscriptionPlans();

        if (activeAuthenticatedUser.role === 'admin') {
            renderAdminUsersTable();
            renderAdminAttendanceMonitor();
            renderAdminSubscriptionOverview();
            renderAdminEnquiriesTable();
        }
    } catch (err) {
        console.error("State synchronization failed: ", err);
    }
}


// Render dynamic tables
function renderStudentActiveBookingsTable() {
    const body = document.getElementById('student-bookings-execution-table');
    if(!body) return; body.innerHTML = '';
    
    systemActiveBookings.forEach(b => {
        let badgeClass = "bg-amber-100 text-amber-800";
        if (b.status === "Completed") badgeClass = "bg-green-100 text-green-800";
        if (b.status === "Cancelled") badgeClass = "bg-rose-100 text-rose-800";

        body.innerHTML += `
            <tr class="border-b text-xs">
                <td class="py-3 font-bold text-slate-900">${b.teacherName}</td>
                <td class="py-3 font-mono">${b.slotInfo}</td>
                <td class="py-3"><span class="px-2 py-0.5 bg-slate-100 rounded">${b.location}</span></td>
                <td class="py-3"><span class="px-2 py-0.5 rounded-full font-black text-[10px] ${badgeClass}">${b.status}</span></td>
                <td class="py-3 text-right space-x-1">
                    ${b.status === 'Pending Completion' ? `
                        <button onclick="triggerStudentCompletionMarker('${b.bookingId}')" class="bg-slate-900 text-white font-bold text-[10px] px-2 py-1 rounded">Mark Complete</button>
                        <button onclick="openTutorSubstitutionWidget('${b.bookingId}')" class="border border-indigo-200 text-indigo-600 text-[10px] px-2 py-1 rounded font-bold hover:bg-indigo-50">Replace</button>
                    ` : `<span class="text-slate-400 font-bold">-</span>`}
                </td>
            </tr>
        `;
    });
}

async function triggerStudentCompletionMarker(bookingId) {
    try {
        await apiFetch(`/bookings/${bookingId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: "Completed" })
        });
        triggerNotificationToast("Verified as completed.", "success");
        await synchronizePlatformStateMatrices();
    } catch (err) {
        console.error(err);
    }
}

function openTutorSubstitutionWidget(bookingId) {
    document.getElementById('swap-target-booking-id').value = bookingId;
    const selector = document.getElementById('swap-faculty-selector'); 
    selector.innerHTML = '';
    teachersProfileRegistry.forEach(t => { 
        selector.innerHTML += `<option value="${t.id}">${t.name} (${t.subject})</option>`; 
    });
    document.getElementById('modal-substitute-switchboard').classList.replace('hidden', 'flex');
}

async function commitTutorSubstitutionSwap() {
    const bId = document.getElementById('swap-target-booking-id').value;
    const tId = document.getElementById('swap-faculty-selector').value;

    try {
        await apiFetch(`/bookings/${bId}/swap`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newTeacherProfileId: tId })
        });
        document.getElementById('modal-substitute-switchboard').classList.replace('flex', 'hidden');
        triggerNotificationToast("Substitution routing reconfigured.", "success");
        await synchronizePlatformStateMatrices();
    } catch (err) {
        console.error(err);
    }
}

function renderTeacherDynamicSlotsMatrix() {
    const body = document.getElementById('teacher-slots-rendering-table');
    if(!body) return; body.innerHTML = '';
    const t = teachersProfileRegistry.find(x => x.userId === activeAuthenticatedUser.id);
    if(!t) return;
    t.slots.forEach(s => {
        body.innerHTML += `<tr><td class="py-2.5 font-bold">${s.day}</td><td class="py-2.5 font-mono">${s.time_window}</td><td><span class="bg-slate-100 px-2 py-0.5 rounded text-[10px]">${s.location}</span></td><td class="text-right"><button onclick="purgeTeacherSingleSlot('${t.id}','${s.id}')" class="text-rose-600 font-bold">Revoke</button></td></tr>`;
    });
}

async function purgeTeacherSingleSlot(tId, sId) {
    try {
        await apiFetch(`/slots/${sId}`, {
            method: 'DELETE'
        });
        triggerNotificationToast("Slot flushed.", "info");
        await synchronizePlatformStateMatrices();
    } catch (err) {
        console.error(err);
    }
}

function renderTeacherAssignedBookingsTable() {
    const body = document.getElementById('teacher-bookings-execution-table');
    if(!body) return; body.innerHTML = '';
    const t = teachersProfileRegistry.find(x => x.userId === activeAuthenticatedUser.id);
    if(!t) return;
    
    systemActiveBookings.forEach(b => {
        let badgeClass = "bg-amber-100 text-amber-800";
        if (b.status === "Completed") badgeClass = "bg-green-100 text-green-800";
        if (b.status === "Cancelled") badgeClass = "bg-rose-100 text-rose-800";

        body.innerHTML += `
            <tr class="text-xs border-b">
                <td class="py-3 font-bold">${b.studentName}</td>
                <td class="py-3 font-mono">${b.slotInfo}</td>
                <td>${b.location}</td>
                <td><span class="px-2 py-0.5 rounded font-black text-[10px] ${badgeClass}">${b.status}</span></td>
                <td class="text-right">
                    ${b.status === 'Pending Completion' ? `
                        <button onclick="triggerTeacherUpdateStatus('${b.bookingId}', 'Completed')" class="bg-slate-900 text-white px-2 py-1 rounded font-bold text-[10px]">Toggle Status</button>
                    ` : `<span class="text-slate-400 font-bold">-</span>`}
                </td>
            </tr>`;
    });
}

async function triggerTeacherUpdateStatus(bookingId, status) {
    try {
        await apiFetch(`/bookings/${bookingId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        triggerNotificationToast("Status update committed.", "info");
        await synchronizePlatformStateMatrices();
    } catch (err) {
        console.error(err);
    }
}

function renderAdminCoreControlPanel() {
    const globalTable = document.getElementById('admin-global-bookings-table-body') || document.getElementById('admin-global-bookings-table-body-override');
    if(globalTable) {
        globalTable.innerHTML = '';
        systemActiveBookings.forEach(b => {
            globalTable.innerHTML += `
                <tr class="text-xs border-b">
                    <td class="py-2.5 font-mono text-indigo-600">${b.refCode}</td>
                    <td class="font-bold">${b.studentName}</td>
                    <td class="font-bold">${b.teacherName}</td>
                    <td class="font-mono">${b.slotInfo}</td>
                    <td>${b.status}</td>
                    <td class="text-right">
                        <button onclick="executeAdminBookingToggle('${b.bookingId}', '${b.status}')" class="bg-slate-900 text-white font-bold text-[10px] px-2 py-1 rounded">Switch</button>
                    </td>
                </tr>`;
        });
    }

    const onboardingTable = document.getElementById('admin-onboarding-table-body') || document.getElementById('admin-onboarding-table-body-page');
    if(onboardingTable) {
        onboardingTable.innerHTML = '';
        onboardingPipelineQueue.forEach(q => {
            onboardingTable.innerHTML += `
                <tr class="text-xs border-b">
                    <td class="py-3 font-bold">${q.tutorName}</td>
                    <td>${q.specializations}</td>
                    <td class="text-emerald-600 font-black">₹${q.costQuote}/hr</td>
                    <td>${q.credentials}</td>
                    <td class="text-right space-x-1">
                        ${q.status === 'pending' ? `
                            <button onclick="handleAdminOnboardingDecision('${q.queueId}', 'approved')" class="bg-indigo-600 text-white font-bold text-[10px] px-2 py-1 rounded hover:bg-indigo-700">Approve</button>
                            <button onclick="handleAdminOnboardingDecision('${q.queueId}', 'rejected')" class="bg-rose-600 text-white font-bold text-[10px] px-2 py-1 rounded hover:bg-rose-700">Reject</button>
                        ` : `<span class="capitalize text-slate-400 font-bold">${q.status}</span>`}
                    </td>
                </tr>
            `;
        });
    }
}

async function executeAdminBookingToggle(bookingId, currentStatus) {
    const nextStatus = currentStatus === "Completed" ? "Pending Completion" : "Completed";
    try {
        await apiFetch(`/bookings/${bookingId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: nextStatus })
        });
        await synchronizePlatformStateMatrices();
    } catch (err) {
        console.error(err);
    }
}

async function handleAdminOnboardingDecision(qId, status) {
    try {
        await apiFetch(`/admin/onboarding/${qId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        triggerNotificationToast(`Teacher application ${status}.`, "success");
        await synchronizePlatformStateMatrices();
    } catch (err) {
        console.error(err);
    }
}

function renderGlobalPaymentsLedger() {
    const body = document.getElementById('payment-history-table-body');
    if(!body) return; body.innerHTML = '';
    systemPaymentsLedger.forEach(p => {
        body.innerHTML += `<tr class="text-xs border-b"><td class="py-3 font-bold text-slate-400">#${p.id}</td><td class="font-bold">${p.userScope}</td><td class="text-emerald-600 font-black">₹${p.amount}</td><td>${p.gatewayMethod}</td><td class="text-slate-500">${new Date(p.timestamp).toLocaleDateString()}</td><td class="text-right"><span class="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded border">SETTLED</span></td></tr>`;
    });
}

// ── Attendance Rendering & Calendar ─────────────────────────────────────────
let calendar = null;

function renderAttendanceLog() {
    const body = document.querySelector('#view-shared-attendance tbody');
    if(!body) return;
    body.innerHTML = '';
    
    let total = 0;
    let present = 0;
    let absent = 0;
    let excused = 0;
    
    systemAttendanceRecords.forEach((a, idx) => {
        total++;
        if (a.status === 'Present') present++;
        else if (a.status === 'Absent') absent++;
        else if (a.status === 'Excused') excused++;
        
        let badgeClass = "bg-green-100 text-green-700";
        if (a.status === 'Absent') badgeClass = "bg-red-100 text-red-700";
        if (a.status === 'Excused') badgeClass = "bg-amber-100 text-amber-700";

        body.innerHTML += `
            <tr class="text-xs">
                <td class="p-3">${new Date(a.date).toLocaleDateString()}</td>
                <td>Lec ${idx + 1}</td>
                <td>Mathematics</td>
                <td>${a.teacherName}</td>
                <td>09:00 AM</td>
                <td>
                    <span class="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">
                        OTP VERIFIED
                    </span>
                </td>
                <td>Device Core</td>
                <td>
                    <span class="${badgeClass} px-3 py-1 rounded-full text-xs font-bold">
                        ${a.status.toUpperCase()}
                    </span>
                </td>
            </tr>
        `;
    });
    
    // Render summary cards
    const totalLecturesEl = document.querySelector('#view-shared-attendance .grid .bg-indigo-50 .text-3xl');
    const presentEl = document.querySelector('#view-shared-attendance .grid .bg-green-50 .text-3xl');
    const absentEl = document.querySelector('#view-shared-attendance .grid .bg-red-50 .text-3xl');
    const pendingEl = document.querySelector('#view-shared-attendance .grid .bg-yellow-50 .text-3xl');
    const percentEl = document.querySelector('#view-shared-attendance .grid .bg-cyan-50 .text-3xl');

    if (totalLecturesEl) totalLecturesEl.innerText = total;
    if (presentEl) presentEl.innerText = present;
    if (absentEl) absentEl.innerText = absent;
    if (pendingEl) pendingEl.innerText = excused;
    if (percentEl) {
        const percent = total > 0 ? Math.round((present / total) * 100) : 0;
        percentEl.innerText = `${percent}%`;
    }
}

function renderAttendanceCalendar() {
    const calendarEl = document.getElementById("attendance-calendar");
    if (!calendarEl || !window.FullCalendar) return;

    const events = systemAttendanceRecords.map(a => ({
        title: a.status,
        start: a.date,
        color: a.status === 'Present' ? '#16a34a' : a.status === 'Absent' ? '#dc2626' : '#eab308'
    }));

    if (calendar) {
        calendar.removeAllEvents();
        calendar.addEventSource(events);
    } else {
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            height: 650,
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,listMonth'
            },
            events: events
        });
        
        const openCalendarBtn = document.getElementById("openCalendarBtn");
        if (openCalendarBtn) {
            openCalendarBtn.onclick = () => {
                calendar.render();
                calendarEl.scrollIntoView({ behavior: "smooth" });
            };
        }
    }
}

// ── Subscription Viewport Rendering ─────────────────────────────────────────
function renderSubscriptionPlans() {
    const container = document.querySelector('#view-shared-subscriptions .grid');
    if(!container) return;
    container.innerHTML = '';

    // Add standard Core Access plan card
    const isStandardActive = !activeUserSubscription;
    container.innerHTML += `
        <div class="bg-white border ${isStandardActive ? 'border-2 border-indigo-600' : ''} rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
            ${isStandardActive ? '<div class="absolute top-3 right-3 text-[9px] bg-indigo-600 text-white font-extrabold uppercase px-2 py-0.5 rounded">ACTIVE</div>' : ''}
            <div>
                <span class="text-[9px] bg-slate-100 text-slate-500 font-extrabold tracking-widest uppercase px-2 py-0.5 rounded">Standard Node</span>
                <h4 class="text-base font-black text-slate-900 mt-2">Core Access Pay</h4>
                <p class="text-xs text-slate-400 mt-1">Pay-as-you-go basic sandbox pipeline framework mapping structures.</p>
            </div>
            <div class="text-2xl font-black text-slate-900">₹0 <span class="text-xs text-slate-400 font-medium">/ Base Registration</span></div>
            <button class="w-full ${isStandardActive ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'} font-bold text-xs py-2 rounded-xl" disabled>
                ${isStandardActive ? 'Active Standard Node' : 'Standard Core Active'}
            </button>
        </div>
    `;

    // Render plans fetched from db
    systemSubscriptionPlans.forEach(plan => {
        const isActive = activeUserSubscription && activeUserSubscription.planId === plan.id;
        
        container.innerHTML += `
            <div class="bg-white border-2 ${isActive ? 'border-emerald-600' : 'border-slate-200'} rounded-2xl p-5 shadow-md space-y-4 relative">
                ${isActive ? '<div class="absolute top-3 right-3 text-[9px] bg-emerald-600 text-white font-extrabold uppercase px-2 py-0.5 rounded">ACTIVE</div>' : ''}
                <div>
                    <span class="text-[9px] bg-indigo-50 text-indigo-600 font-extrabold tracking-widest uppercase px-2 py-0.5 rounded">PRO LEVEL</span>
                    <h4 class="text-base font-black text-slate-900 mt-2">${plan.name}</h4>
                    <p class="text-xs text-slate-400 mt-1">${plan.features.join(', ')}</p>
                </div>
                <div class="text-2xl font-black text-indigo-600">₹${plan.price.toLocaleString()} <span class="text-xs text-slate-400 font-medium">/ ${plan.billingCycle}</span></div>
                <button onclick="commitSubscribeRequest(${plan.id})" ${isActive ? 'disabled' : ''} class="w-full ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-600 text-white'} font-bold text-xs py-2 rounded-xl shadow-md">
                    ${isActive ? 'Subscription Active' : 'Subscribe Now'}
                </button>
            </div>
        `;
    });
}

async function commitSubscribeRequest(planId) {
    try {
        const result = await apiFetch('/subscriptions/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId })
        });

        if (result.success) {
            triggerNotificationToast(`Successfully subscribed to ${result.subscription.planName}!`, "success");
            await synchronizePlatformStateMatrices();
        }
    } catch (err) {
        console.error(err);
    }
}

// ── Admin Subsystem Rendering Functions ──────────────────────────────────────

function renderAdminUsersTable() {
    const body = document.getElementById('admin-users-table-body');
    if (!body) return;
    body.innerHTML = '';

    const filterVal = document.getElementById('admin-user-role-filter').value;
    const filteredUsers = adminUsersList.filter(u => !filterVal || u.role === filterVal);

    if (filteredUsers.length === 0) {
        body.innerHTML = `<tr><td colspan="6" class="py-4 text-center text-slate-400 font-bold">No registered personas match the selected filters.</td></tr>`;
        return;
    }

    filteredUsers.forEach(u => {
        let badgeClass = "bg-indigo-50 text-indigo-700";
        if (u.role === 'admin') badgeClass = "bg-rose-50 text-rose-700 border border-rose-200";
        if (u.role === 'teacher') badgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-200";

        body.innerHTML += `
            <tr class="text-xs border-b">
                <td class="py-3 font-mono font-bold text-slate-400">#${u.id}</td>
                <td class="py-3 font-bold text-slate-900">${u.name}</td>
                <td class="py-3 font-mono text-slate-500">${u.email}</td>
                <td class="py-3"><span class="px-2 py-0.5 rounded-full font-extrabold text-[10px] uppercase ${badgeClass}">${u.role}</span></td>
                <td class="py-3 text-slate-500">${new Date(u.createdAt).toLocaleDateString()}</td>
                <td class="py-3 text-right space-x-1">
                    <select onchange="executeAdminUserRoleChange(${u.id}, this.value)" class="bg-slate-50 border rounded p-1 text-[11px] font-bold text-slate-700 outline-none">
                        <option value="student" ${u.role === 'student' ? 'selected' : ''}>Student</option>
                        <option value="teacher" ${u.role === 'teacher' ? 'selected' : ''}>Teacher</option>
                        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                    <button onclick="executeAdminUserToggleActive(${u.id}, ${!u.isActive})" class="${u.isActive ? 'text-rose-600' : 'text-emerald-600'} font-bold hover:underline ml-2">
                        ${u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                </td>
            </tr>
        `;
    });
}

async function executeAdminUserRoleChange(userId, newRole) {
    try {
        if (localStorage.getItem("isDemoMode") === "true") {
            const user = adminUsersList.find(u => u.id === userId);
            if (user) {
                user.role = newRole;
                triggerNotificationToast(`Demo Mode: User role updated to ${newRole}.`, "success");
                // Re-render
                renderAdminUsersTable();
            }
            return;
        }
        await apiFetch(`/admin/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole })
        });
        triggerNotificationToast("User authorization updated.", "success");
        await synchronizePlatformStateMatrices();
    } catch (err) {
        console.error(err);
    }
}

async function executeAdminUserToggleActive(userId, activeState) {
    try {
        await apiFetch(`/admin/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: activeState })
        });
        triggerNotificationToast("User status flag reconfigured.", "info");
        await synchronizePlatformStateMatrices();
    } catch (err) {
        console.error(err);
    }
}

function renderAdminAttendanceMonitor() {
    const body = document.getElementById('admin-attendance-table-body');
    if (!body) return;
    body.innerHTML = '';

    if (adminAttendanceList.length === 0) {
        body.innerHTML = `<tr><td colspan="6" class="py-4 text-center text-slate-400 font-bold">No global attendance logs recorded.</td></tr>`;
        return;
    }

    adminAttendanceList.forEach((a, idx) => {
        let badgeClass = "bg-green-100 text-green-700";
        if (a.status === 'Absent') badgeClass = "bg-red-100 text-red-700";
        if (a.status === 'Excused') badgeClass = "bg-amber-100 text-amber-700";

        body.innerHTML += `
            <tr class="text-xs border-b">
                <td class="py-3">${new Date(a.date).toLocaleDateString()}</td>
                <td class="py-3 font-bold text-slate-900">${a.studentName}</td>
                <td class="py-3 font-bold text-slate-900">${a.teacherName}</td>
                <td class="py-3">Lec ${idx + 1}</td>
                <td class="py-3"><span class="bg-green-50 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">OTP VERIFIED</span></td>
                <td class="py-3"><span class="px-2 py-0.5 rounded font-black text-[10px] ${badgeClass}">${a.status.toUpperCase()}</span></td>
            </tr>
        `;
    });
}

function renderAdminSubscriptionOverview() {
    const plansGrid = document.getElementById('admin-subscription-plans-grid');
    if (plansGrid) {
        plansGrid.innerHTML = '';
        systemSubscriptionPlans.forEach(p => {
            plansGrid.innerHTML += `
                <div class="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
                    <div>
                        <span class="text-[9px] bg-indigo-50 text-indigo-600 font-extrabold tracking-widest uppercase px-2 py-0.5 rounded">PLAN ENGINE</span>
                        <h4 class="text-base font-black text-slate-900 mt-2">${p.name}</h4>
                        <p class="text-xs text-slate-400 mt-1">${p.features.join(', ')}</p>
                    </div>
                    <div class="text-2xl font-black text-indigo-600">₹${p.price.toLocaleString()} <span class="text-xs text-slate-400 font-medium">/ ${p.billingCycle}</span></div>
                    <button onclick="triggerNotificationToast('Editing plans restricted in this scope version.', 'info')" class="w-full bg-slate-100 text-slate-700 font-bold text-xs py-2 rounded-xl">
                        Modify Configs
                    </button>
                </div>
            `;
        });
    }

    const subTable = document.getElementById('admin-subscribers-table-body');
    if (subTable) {
        subTable.innerHTML = '';
        if (adminSubscribersList.length === 0) {
            subTable.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-slate-400 font-bold">No active subscribers in cluster.</td></tr>`;
            return;
        }

        adminSubscribersList.forEach(s => {
            const isExpired = new Date(s.endDate) < new Date();
            const badgeClass = isExpired ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800";
            subTable.innerHTML += `
                <tr class="text-xs border-b">
                    <td class="py-3 font-bold text-slate-900">${s.userName}</td>
                    <td class="py-3 font-semibold text-indigo-600">${s.planName}</td>
                    <td class="py-3">₹${s.price} / ${s.billingCycle}</td>
                    <td class="py-3 text-slate-500">${new Date(s.endDate).toLocaleDateString()}</td>
                    <td class="py-3 text-right">
                        <span class="px-2 py-0.5 rounded font-black text-[10px] ${badgeClass}">${s.status.toUpperCase()}</span>
                    </td>
                </tr>
            `;
        });
    }
}

function renderAdminEnquiriesTable() {
    const body = document.getElementById('admin-enquiries-table-body');
    if (!body) return;
    body.innerHTML = '';

    if (adminEnquiriesList.length === 0) {
        body.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-slate-400 font-bold">No prospective lead callback requests.</td></tr>`;
        return;
    }

    adminEnquiriesList.forEach(e => {
        let statusBadge = "bg-amber-100 text-amber-800";
        if (e.status === 'contacted') statusBadge = "bg-indigo-100 text-indigo-800";
        if (e.status === 'resolved') statusBadge = "bg-green-100 text-green-800";

        body.innerHTML += `
            <tr class="text-xs border-b">
                <td class="py-3">
                    <div class="font-bold text-slate-900">${e.student_name || 'Anonymous User'}</div>
                    ${e.parent_name ? `<div class="text-[10px] text-slate-400 font-bold">Parent: ${e.parent_name}</div>` : ''}
                </td>
                <td class="py-3">
                    <div class="font-mono text-slate-800">${e.contact_number || '--'}</div>
                    <div class="text-[10px] text-slate-400 font-mono">${e.email || '--'}</div>
                </td>
                <td class="py-3 font-medium text-slate-700">${e.standard || '--'} / ${e.board || '--'}</td>
                <td class="py-3 text-slate-500 max-w-[150px] truncate" title="${e.address || ''}">${e.address || '--'}</td>
                <td class="py-3 text-right space-x-1 flex justify-end items-center gap-1.5 h-12">
                    <span class="px-2 py-0.5 rounded font-black text-[10px] ${statusBadge}">${e.status.toUpperCase()}</span>
                    ${e.status !== 'resolved' ? `
                        <select onchange="updateEnquiryStatus(${e.id}, this.value)" class="bg-slate-50 border text-[10px] rounded p-1 font-bold outline-none text-slate-600">
                            <option value="">Move Tiers</option>
                            <option value="contacted">Mark Contacted</option>
                            <option value="resolved">Mark Resolved</option>
                        </select>
                    ` : ''}
                </td>
            </tr>
        `;
    });
}

async function updateEnquiryStatus(enquiryId, statusVal) {
    if (!statusVal) return;
    try {
        await apiFetch(`/enquiries/${enquiryId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: statusVal })
        });
        triggerNotificationToast("Enquiry pipeline state updated.", "success");
        await synchronizePlatformStateMatrices();
    } catch (err) {
        console.error(err);
    }
}

