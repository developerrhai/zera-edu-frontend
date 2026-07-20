// Global state objects
let usersDatabase = [];
let activeClassSessions = [];
let activeOTPCountdownInterval = null;
let currentActiveSession = null;
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
let myInquiriesList = [];
let adminInquiriesList = [];


const roleMenuRouteMatrices = {
    student: [
        { label: 'Find Teachers', icon: 'search', viewId: 'view-student-teachers' },
        { label: 'My Bookings', icon: 'calendar-check', viewId: 'view-student-profile' },
        { label: 'Attendance', icon: 'calendar-check-2', viewId: 'view-shared-attendance' },
        { label: 'Subscriptions', icon: 'zap', viewId: 'view-shared-subscriptions' },
        { label: 'Payments', icon: 'receipt', viewId: 'view-payment-history' },
        { label: 'Refer & Earn', icon: 'gift', viewId: 'view-refer-earn' },
        { label: 'Support Inquiries', icon: 'help-circle', viewId: 'view-shared-inquiries' },
    ],
    teacher: [
        { label: 'Manage Slots', icon: 'calendar-plus', viewId: 'view-teacher-slots' },
        { label: 'My Bookings', icon: 'briefcase', viewId: 'view-teacher-directory' },
        { label: 'Attendance', icon: 'calendar-check-2', viewId: 'view-shared-attendance' },
        { label: 'Subscriptions', icon: 'zap', viewId: 'view-shared-subscriptions' },
        { label: 'Payments', icon: 'receipt', viewId: 'view-payment-history' },
        { label: 'Refer & Earn', icon: 'gift', viewId: 'view-refer-earn' },
        { label: 'Support Inquiries', icon: 'help-circle', viewId: 'view-shared-inquiries' },
    ],
    admin: [
        { label: 'Dashboard', icon: 'layout-dashboard', viewId: 'view-admin-dashboard' },
        { label: 'User Management', icon: 'users', viewId: 'view-admin-users' },
        { label: 'All Bookings', icon: 'shield-alert', viewId: 'view-admin-bookings' },
        { label: 'Onboarding Queue', icon: 'user-plus', viewId: 'view-admin-onboarding' },
        { label: 'Attendance Monitor', icon: 'calendar-check-2', viewId: 'view-admin-attendance' },
        { label: 'Subscriptions', icon: 'credit-card', viewId: 'view-admin-subscriptions' },
        { label: 'Enquiries', icon: 'message-square', viewId: 'view-admin-enquiries' },
        { label: 'Inquiry Tickets', icon: 'help-circle', viewId: 'view-admin-inquiries' },
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

let recoveryEmail = '';
let recoveryOtpToken = '';
let recoveryResetToken = '';

function displayRecoveryWorkflow() {
    recoveryEmail = '';
    recoveryOtpToken = '';
    recoveryResetToken = '';
    document.getElementById('recovery-target-email').value = '';
    document.getElementById('recovery-otp').value = '';
    document.getElementById('recovery-new-password').value = '';
    
    document.getElementById('recovery-step-1').classList.remove('hidden');
    document.getElementById('recovery-step-2').classList.add('hidden');
    document.getElementById('recovery-step-3').classList.add('hidden');
    document.getElementById('recovery-subtitle').innerText = "Please follow the secure steps to reset your key.";
    document.getElementById('recovery-overlay-pane').classList.replace('hidden', 'flex');
}

function dismissRecoveryWorkflow() {
    document.getElementById('recovery-overlay-pane').classList.replace('flex', 'hidden');
}

function resetRecoveryStepTo1() {
    document.getElementById('recovery-otp').value = '';
    document.getElementById('recovery-step-1').classList.remove('hidden');
    document.getElementById('recovery-step-2').classList.add('hidden');
    document.getElementById('recovery-step-3').classList.add('hidden');
    document.getElementById('recovery-subtitle').innerText = "Please follow the secure steps to reset your key.";
}

async function processSystemRecoveryRequest() {
    const email = document.getElementById('recovery-target-email').value;
    if (!email) return triggerNotificationToast("Email is required.", "error");

    try {
        const data = await apiFetch('/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        recoveryEmail = email;
        recoveryOtpToken = data.otpToken;
        triggerNotificationToast(data.message || "OTP sent successfully", "success");
        
        // Move to Step 2
        document.getElementById('recovery-step-1').classList.add('hidden');
        document.getElementById('recovery-step-2').classList.remove('hidden');
        document.getElementById('recovery-subtitle').innerText = "Step 2: Enter the 6-digit OTP code sent to your email.";
    } catch (err) {
        console.error(err);
    }
}

async function processVerifyOtpRequest() {
    const otp = document.getElementById('recovery-otp').value;
    if (!otp || otp.length !== 6) return triggerNotificationToast("Please enter a valid 6-digit OTP code.", "error");

    try {
        const data = await apiFetch('/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: recoveryEmail,
                otp,
                otpToken: recoveryOtpToken
            })
        });
        
        recoveryResetToken = data.resetToken;
        triggerNotificationToast(data.message || "OTP verified successfully", "success");
        
        // Move to Step 3
        document.getElementById('recovery-step-2').classList.add('hidden');
        document.getElementById('recovery-step-3').classList.remove('hidden');
        document.getElementById('recovery-subtitle').innerText = "Step 3: Specify a new password to access your account.";
    } catch (err) {
        console.error(err);
    }
}

async function processPasswordResetSubmit() {
    const newPassword = document.getElementById('recovery-new-password').value;
    if (!newPassword || newPassword.length < 6) return triggerNotificationToast("Password must be at least 6 characters.", "error");

    try {
        const data = await apiFetch('/auth/reset-password-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: recoveryEmail,
                resetToken: recoveryResetToken,
                newPassword
            })
        });
        
        triggerNotificationToast(data.message || "Password updated successfully", "success");
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
        const loginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        let result = await loginRes.json();
        
        // If login returns unauthorized credentials fallback to register (matches frontend mocks logic)
        if (!loginRes.ok && result.error && result.error.includes("Invalid")) {
            const name = email.split('@')[0].toUpperCase();
            const registerRes = await fetch(`${API_BASE}/auth/register`, {
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
    
    if (viewId === 'view-admin-notifications') {
        fetchNotificationHistory();
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

            myInquiriesList = [
                { id: "inq_1", subject: "Subscription payment query", message: "My premium payment was processed but subscription is showing pending.", status: "resolved", adminReply: "This has been resolved. Your premium plan is now active.", createdAt: "2026-07-16T12:00:00.000Z", updatedAt: "2026-07-16T14:00:00.000Z" },
                { id: "inq_2", subject: "Rescheduling class with Dr. Rajesh", message: "Need to change timing of Tuesday morning slot to afternoon.", status: "pending", adminReply: null, createdAt: "2026-07-17T10:00:00.000Z", updatedAt: "2026-07-17T10:00:00.000Z" }
            ];

            adminInquiriesList = [
                { id: "inq_1", subject: "Subscription payment query", message: "My premium payment was processed but subscription is showing pending.", status: "resolved", adminReply: "This has been resolved. Your premium plan is now active.", userRole: "student", userName: "Kabir Mehta", userEmail: "kabir@zeraedu.com", createdAt: "2026-07-16T12:00:00.000Z", updatedAt: "2026-07-16T14:00:00.000Z" },
                { id: "inq_2", subject: "Rescheduling class with Dr. Rajesh", message: "Need to change timing of Tuesday morning slot to afternoon.", status: "pending", adminReply: null, userRole: "student", userName: "Kabir Mehta", userEmail: "kabir@zeraedu.com", createdAt: "2026-07-17T10:00:00.000Z", updatedAt: "2026-07-17T10:00:00.000Z" },
                { id: "inq_3", subject: "Tutor registration payout help", message: "How do I claim my monthly hours payout?", status: "in-progress", adminReply: "We are reviewing your payout profile details.", userRole: "teacher", userName: "Prof. Ananya Kulkarni", userEmail: "ananya@zeraedu.com", createdAt: "2026-07-17T11:00:00.000Z", updatedAt: "2026-07-17T11:30:00.000Z" }
            ];
        }

        renderStudentTeacherDirectoryGrid();
        renderStudentActiveBookingsTable();
        renderTeacherDynamicSlotsMatrix();
        renderTeacherAssignedBookingsTable();
        renderAdminCoreControlPanel();
        renderGlobalPaymentsLedger();

        const savedSessions = localStorage.getItem("demoActiveClassSessions");
        if (savedSessions) {
            activeClassSessions = JSON.parse(savedSessions);
        } else {
            activeClassSessions = [
                {
                    id: "sess_1",
                    studentId: 10,
                    studentName: "Kabir Mehta",
                    teacherId: 2,
                    teacherName: "Prof. Ananya Kulkarni",
                    subject: "Mathematics",
                    lectureNumber: 1,
                    status: "completed",
                    checkinVerifiedAt: "2026-07-20T09:00:00.000Z",
                    checkoutVerifiedAt: "2026-07-20T10:30:00.000Z",
                    createdAt: "2026-07-20T09:00:00.000Z"
                }
            ];
            localStorage.setItem("demoActiveClassSessions", JSON.stringify(activeClassSessions));
        }

        renderAttendanceLog();
        renderAttendanceCalendar();
        renderSubscriptionPlans();

        if (activeAuthenticatedUser.role === 'admin') {
            renderAdminUsersTable();
            renderAdminAttendanceMonitor();
            renderAdminSubscriptionOverview();
            renderAdminEnquiriesTable();
            renderAdminInquiryTable();
        }
        renderSharedInquiriesTable();
        renderClassSessionOTPPanel();
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

            const inqRes = await apiFetch('/v1/inquiries');
            adminInquiriesList = inqRes.inquiries;
        }

        if (activeAuthenticatedUser.role === 'student' || activeAuthenticatedUser.role === 'teacher') {
            const inqRes = await apiFetch('/v1/inquiries/my-inquiries');
            myInquiriesList = inqRes.inquiries;
        }

        // Fetch active class sessions
        try {
            const classSessRes = await apiFetch('/attendance/class-sessions');
            activeClassSessions = classSessRes.sessions;
        } catch (sessErr) {
            console.error("Failed to load active class sessions: ", sessErr);
            activeClassSessions = [];
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
            renderAdminInquiryTable();
        }
        renderSharedInquiriesTable();
        renderClassSessionOTPPanel();
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

    // Populate profile inputs if they exist in DOM
    const degreeInput = document.getElementById('teacher-profile-degree');
    if (degreeInput) {
        degreeInput.value = t.degree || '';
        document.getElementById('teacher-profile-exp').value = t.expYears || 0;
        document.getElementById('teacher-profile-subject').value = t.subject || '';
        document.getElementById('teacher-profile-std').value = t.standard || '';
        document.getElementById('teacher-profile-board').value = t.board || '';
        document.getElementById('teacher-profile-cost').value = t.cost || 0;
    }
}

async function updateTeacherProfileDetails(event) {
    event.preventDefault();
    const t = teachersProfileRegistry.find(x => x.userId === activeAuthenticatedUser.id);
    if (!t) return;

    const degree = document.getElementById('teacher-profile-degree').value;
    const expYears = parseInt(document.getElementById('teacher-profile-exp').value, 10);
    const subject = document.getElementById('teacher-profile-subject').value;
    const standard = document.getElementById('teacher-profile-std').value;
    const board = document.getElementById('teacher-profile-board').value;
    const cost = parseFloat(document.getElementById('teacher-profile-cost').value);

    try {
        await apiFetch(`/teachers/${t.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ degree, expYears, subject, standard, board, cost })
        });
        triggerNotificationToast("Faculty profile settings updated successfully.", "success");
        await synchronizePlatformStateMatrices();
    } catch (err) {
        console.error(err);
    }
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
                    <p class="text-xs text-slate-400 mt-1">${Array.isArray(plan.features) ? plan.features.join(', ') : (plan.features || '')}</p>
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
                    ${u.role === 'teacher' ? `
                        <label class="text-[10px] text-slate-400 mr-2 font-bold">Rank:
                            <input type="number" value="${u.displayOrder}" onchange="executeAdminTeacherOrderChange('${u.id}', this.value)" class="w-12 border rounded text-center p-0.5 bg-slate-50 text-slate-800 font-bold outline-none focus:bg-white focus:border-indigo-500">
                        </label>
                        <button onclick="executeAdminDeleteTeacher('${u.id}')" class="text-rose-600 font-bold hover:underline ml-2">
                            Remove
                        </button>
                    ` : `
                        <select onchange="executeAdminUserRoleChange('${u.id}', this.value)" class="bg-slate-50 border rounded p-1 text-[11px] font-bold text-slate-700 outline-none">
                            <option value="student" ${u.role === 'student' ? 'selected' : ''}>Student</option>
                            <option value="teacher" ${u.role === 'teacher' ? 'selected' : ''}>Teacher</option>
                            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                        <button onclick="executeAdminUserToggleActive('${u.id}', ${!u.isActive})" class="${u.isActive ? 'text-rose-600' : 'text-emerald-600'} font-bold hover:underline ml-2">
                            ${u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                    `}
                </td>
            </tr>
        `;
    });
}

function openAddTeacherModal() {
    document.getElementById('modal-add-teacher').classList.replace('hidden', 'flex');
}

function closeAddTeacherModal() {
    document.getElementById('modal-add-teacher').classList.replace('flex', 'hidden');
    document.getElementById('add-teacher-form').reset();
}

async function commitAddTeacherRequest(event) {
    event.preventDefault();
    const name = document.getElementById('add-teacher-name').value;
    const email = document.getElementById('add-teacher-email').value;
    const password = document.getElementById('add-teacher-password').value;
    const subject = document.getElementById('add-teacher-subject').value;
    const costPerHour = Number(document.getElementById('add-teacher-cost').value);

    try {
        await apiFetch('/admin/teachers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, subject, costPerHour })
        });
        triggerNotificationToast("Teacher registered and verified successfully.", "success");
        closeAddTeacherModal();
        await synchronizePlatformStateMatrices();
    } catch (err) {
        console.error(err);
    }
}

async function executeAdminTeacherOrderChange(userId, newOrderVal) {
    const val = parseInt(newOrderVal, 10);
    if (isNaN(val)) return;
    try {
        await apiFetch(`/admin/teachers/${userId}/display-order`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayOrder: val })
        });
        triggerNotificationToast("Teacher sorting weight updated.", "success");
        await synchronizePlatformStateMatrices();
    } catch (err) {
        console.error(err);
    }
}

async function executeAdminDeleteTeacher(userId) {
    if (!confirm("Are you sure you want to completely remove this teacher account and profile?")) return;
    try {
        await apiFetch(`/admin/teachers/${userId}`, {
            method: 'DELETE'
        });
        triggerNotificationToast("Teacher account and profile removed.", "success");
        await synchronizePlatformStateMatrices();
    } catch (err) {
        console.error(err);
    }
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


// ─── Support Inquiries System ───

// Render user support inquiries list
function renderSharedInquiriesTable() {
    const tableBody = document.getElementById('shared-inquiries-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (!myInquiriesList || myInquiriesList.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center text-slate-400 font-medium">
                    <div class="flex flex-col items-center justify-center space-y-2">
                        <i data-lucide="inbox" class="w-8 h-8 text-slate-300"></i>
                        <span>No support tickets logged.</span>
                    </div>
                </td>
            </tr>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    myInquiriesList.forEach(inq => {
        let statusBadge = '';
        if (inq.status === 'pending') {
            statusBadge = '<span class="px-2 py-0.5 rounded-full font-black text-[10px] bg-amber-100 text-amber-800">Pending</span>';
        } else if (inq.status === 'in-progress') {
            statusBadge = '<span class="px-2 py-0.5 rounded-full font-black text-[10px] bg-blue-100 text-blue-800">In-Progress</span>';
        } else if (inq.status === 'resolved') {
            statusBadge = '<span class="px-2 py-0.5 rounded-full font-black text-[10px] bg-emerald-100 text-emerald-800">Resolved</span>';
        }

        const dateStr = new Date(inq.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });

        const replySection = inq.adminReply 
            ? `<div class="bg-indigo-50 border border-indigo-100 rounded-lg p-2.5 mt-2 text-[11px] font-medium text-slate-700 leading-relaxed shadow-sm">
                 <div class="flex items-center gap-1 text-[9px] font-black uppercase text-indigo-600 tracking-wider mb-1"><i data-lucide="message-square" class="w-3 h-3"></i> Admin Reply:</div>
                 ${inq.adminReply}
               </div>`
            : '<span class="text-slate-400 text-[11px] font-normal italic">Waiting for reply</span>';

        tableBody.innerHTML += `
            <tr class="border-b text-xs hover:bg-slate-50/55 transition-all">
                <td class="py-3 font-semibold text-slate-600 align-top whitespace-nowrap pr-2">${dateStr}</td>
                <td class="py-3 font-black text-slate-850 align-top pr-2">${inq.subject}</td>
                <td class="py-3 font-medium text-slate-600 max-w-[200px] align-top truncate" title="${inq.message}">${inq.message}</td>
                <td class="py-3 align-top pr-2">${statusBadge}</td>
                <td class="py-3 text-right align-top">${replySection}</td>
            </tr>
        `;
    });

    if (window.lucide) window.lucide.createIcons();
}

// Submit a new ticket
async function commitInquirySubmission(event) {
    event.preventDefault();
    const subject = document.getElementById('inquiry-subject').value;
    const message = document.getElementById('inquiry-message').value;

    if (!subject || !message) {
        return triggerNotificationToast("Subject and message are required.", "error");
    }

    try {
        if (localStorage.getItem("isDemoMode") === "true") {
            const mockInq = {
                id: "inq_" + Date.now(),
                subject,
                message,
                status: "pending",
                adminReply: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            myInquiriesList.unshift(mockInq);
            adminInquiriesList.unshift({
                ...mockInq,
                userRole: activeAuthenticatedUser.role,
                userName: activeAuthenticatedUser.name,
                userEmail: activeAuthenticatedUser.email
            });
            triggerNotificationToast("Ticket logged in demo simulation mode.", "success");
            document.getElementById('shared-inquiry-form').reset();
            renderSharedInquiriesTable();
            return;
        }

        const data = await apiFetch('/v1/inquiries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject, message })
        });

        triggerNotificationToast(data.message || "Support ticket transmitted successfully.", "success");
        document.getElementById('shared-inquiry-form').reset();
        await synchronizePlatformStateMatrices();
    } catch (err) {
        console.error(err);
    }
}

// Render admin tickets dashboard
function renderAdminInquiryTable() {
    const tableBody = document.getElementById('admin-inquiries-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const roleFilter = document.getElementById('admin-inq-role-filter').value;
    const statusFilter = document.getElementById('admin-inq-status-filter').value;

    let filtered = adminInquiriesList || [];

    if (roleFilter) {
        filtered = filtered.filter(inq => inq.userRole === roleFilter);
    }
    if (statusFilter) {
        filtered = filtered.filter(inq => inq.status === statusFilter);
    }

    // Update statistics stats count
    const totalCount = adminInquiriesList.length;
    const pendingCount = adminInquiriesList.filter(inq => inq.status === 'pending').length;
    const progressCount = adminInquiriesList.filter(inq => inq.status === 'in-progress').length;
    const resolvedCount = adminInquiriesList.filter(inq => inq.status === 'resolved').length;

    document.getElementById('admin-inq-stat-total').innerText = totalCount;
    document.getElementById('admin-inq-stat-pending').innerText = pendingCount;
    document.getElementById('admin-inq-stat-progress').innerText = progressCount;
    document.getElementById('admin-inq-stat-resolved').innerText = resolvedCount;

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="py-8 text-center text-slate-400 font-medium">
                    <div class="flex flex-col items-center justify-center space-y-2">
                        <i data-lucide="inbox" class="w-8 h-8 text-slate-300"></i>
                        <span>No matching support tickets found.</span>
                    </div>
                </td>
            </tr>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    filtered.forEach(inq => {
        let statusBadge = '';
        if (inq.status === 'pending') {
            statusBadge = '<span class="px-2 py-0.5 rounded-full font-black text-[10px] bg-amber-100 text-amber-800">Pending</span>';
        } else if (inq.status === 'in-progress') {
            statusBadge = '<span class="px-2 py-0.5 rounded-full font-black text-[10px] bg-blue-100 text-blue-800">In-Progress</span>';
        } else if (inq.status === 'resolved') {
            statusBadge = '<span class="px-2 py-0.5 rounded-full font-black text-[10px] bg-emerald-100 text-emerald-800">Resolved</span>';
        }

        const dateStr = new Date(inq.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });

        tableBody.innerHTML += `
            <tr class="border-b text-xs hover:bg-slate-50/50 transition-all">
                <td class="py-3 font-semibold text-slate-600 whitespace-nowrap pr-2">${dateStr}</td>
                <td class="py-3 font-black text-slate-900">${inq.userName} <span class="text-[10px] font-medium text-slate-400 block">${inq.userEmail}</span></td>
                <td class="py-3"><span class="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold uppercase tracking-wider">${inq.userRole}</span></td>
                <td class="py-3 font-black text-slate-800">${inq.subject}</td>
                <td class="py-3">${statusBadge}</td>
                <td class="py-3 text-right">
                    <button onclick="openAdminInquiryReplyModal('${inq.id}')" class="bg-indigo-600 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg shadow-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5 ml-auto"><i data-lucide="message-square" class="w-3.5 h-3.5"></i> View & Reply</button>
                </td>
            </tr>
        `;
    });

    if (window.lucide) window.lucide.createIcons();
}

function openAdminInquiryReplyModal(inquiryId) {
    const inq = adminInquiriesList.find(i => i.id === inquiryId);
    if (!inq) return;

    document.getElementById('reply-target-inquiry-id').value = inq.id;
    document.getElementById('modal-inq-user-meta').innerText = `${inq.userName} (${inq.userRole.toUpperCase()}) - ${inq.userEmail}`;
    document.getElementById('modal-inq-subject').innerText = inq.subject;
    document.getElementById('modal-inq-message').innerText = inq.message;
    document.getElementById('reply-inq-status').value = inq.status;
    document.getElementById('reply-inq-comment').value = inq.adminReply || '';

    const modal = document.getElementById('modal-admin-inquiry-reply');
    modal.classList.replace('hidden', 'flex');
}

function closeAdminInquiryReplyModal() {
    const modal = document.getElementById('modal-admin-inquiry-reply');
    modal.classList.replace('flex', 'hidden');
}

async function submitAdminInquiryReply(event) {
    event.preventDefault();
    const id = document.getElementById('reply-target-inquiry-id').value;
    const status = document.getElementById('reply-inq-status').value;
    const adminReply = document.getElementById('reply-inq-comment').value;

    try {
        if (localStorage.getItem("isDemoMode") === "true") {
            const inq = adminInquiriesList.find(i => i.id === id);
            if (inq) {
                inq.status = status;
                inq.adminReply = adminReply;
            }
            const myInq = myInquiriesList.find(i => i.id === id);
            if (myInq) {
                myInq.status = status;
                myInq.adminReply = adminReply;
            }
            triggerNotificationToast("Response updated in demo simulation.", "success");
            closeAdminInquiryReplyModal();
            renderAdminInquiryTable();
            return;
        }

        const data = await apiFetch(`/v1/inquiries/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, adminReply })
        });

        triggerNotificationToast(data.message || "Response updated successfully.", "success");
        closeAdminInquiryReplyModal();
        await synchronizePlatformStateMatrices();
    } catch (err) {
        console.error(err);
    }
}

// ─── OTP-Based Attendance System Functions ───

function renderClassSessionOTPPanel() {
    const studentCard = document.getElementById('student-class-session-card');
    const teacherCard = document.getElementById('teacher-class-session-card');
    const monitorCard = document.getElementById('class-sessions-monitor-card');

    if (!studentCard || !teacherCard || !monitorCard) return;

    // Reset visibility
    studentCard.classList.add('hidden');
    teacherCard.classList.add('hidden');
    monitorCard.classList.add('hidden');

    if (activeAuthenticatedUser.role === 'student') {
        studentCard.classList.remove('hidden');
        monitorCard.classList.remove('hidden');
        
        // Populate teacher select options
        const selectEl = document.getElementById('session-teacher-id');
        if (selectEl) {
            selectEl.innerHTML = '<option value="">Select Teacher</option>';
            teachersProfileRegistry.forEach(t => {
                selectEl.innerHTML += `<option value="${t.userId}">${t.name} (${t.subject})</option>`;
            });
        }

        // Restore UI based on current active session if it exists in state
        const ongoingSession = activeClassSessions.find(s => s.status === 'in-progress' || s.status === 'scheduled');
        if (ongoingSession) {
            currentActiveSession = ongoingSession;
            if (ongoingSession.status === 'scheduled') {
                document.getElementById('student-session-init-form').classList.add('hidden');
                document.getElementById('student-otp-display-zone').classList.remove('hidden');
                document.getElementById('student-session-inprogress-zone').classList.add('hidden');
                
                // Show standard countdown if expiry info is present
                if (ongoingSession.checkinOtpExpiry) {
                    const expiryTime = new Date(ongoingSession.checkinOtpExpiry).getTime();
                    const now = Date.now();
                    const secondsLeft = Math.max(0, Math.floor((expiryTime - now) / 1000));
                    if (secondsLeft > 0) {
                        startOTPCountdown(secondsLeft, 'student-otp-timer');
                    } else {
                        document.getElementById('student-otp-timer').innerText = "Expired";
                    }
                }
            } else if (ongoingSession.status === 'in-progress') {
                document.getElementById('student-session-init-form').classList.add('hidden');
                document.getElementById('student-otp-display-zone').classList.add('hidden');
                document.getElementById('student-session-inprogress-zone').classList.remove('hidden');
            }
        } else {
            // No active session
            document.getElementById('student-session-init-form').classList.remove('hidden');
            document.getElementById('student-otp-display-zone').classList.add('hidden');
            document.getElementById('student-session-inprogress-zone').classList.add('hidden');
            if (activeOTPCountdownInterval) {
                clearInterval(activeOTPCountdownInterval);
                activeOTPCountdownInterval = null;
            }
        }
    } else if (activeAuthenticatedUser.role === 'teacher') {
        teacherCard.classList.remove('hidden');
        monitorCard.classList.remove('hidden');

        // Populate scheduled and in-progress dropdowns
        const checkinSelect = document.getElementById('teacher-verify-checkin-id');
        const checkoutSelect = document.getElementById('teacher-verify-checkout-id');

        if (checkinSelect) {
            checkinSelect.innerHTML = '<option value="">Select Scheduled Session</option>';
            activeClassSessions.filter(s => s.status === 'scheduled').forEach(s => {
                checkinSelect.innerHTML += `<option value="${s.id}">${s.studentName} - Lecture #${s.lectureNumber} (${s.subject})</option>`;
            });
        }
        if (checkoutSelect) {
            checkoutSelect.innerHTML = '<option value="">Select In-Progress Session</option>';
            activeClassSessions.filter(s => s.status === 'in-progress').forEach(s => {
                checkoutSelect.innerHTML += `<option value="${s.id}">${s.studentName} - Lecture #${s.lectureNumber} (${s.subject})</option>`;
            });
        }
    }

    renderActiveSessionsTable();
}

function startOTPCountdown(seconds, elementId) {
    if (activeOTPCountdownInterval) {
        clearInterval(activeOTPCountdownInterval);
    }

    let timeLeft = seconds;
    const timerEl = document.getElementById(elementId);
    
    function updateTimer() {
        if (timeLeft <= 0) {
            clearInterval(activeOTPCountdownInterval);
            if (timerEl) timerEl.innerText = "Expired";
            return;
        }
        const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const s = (timeLeft % 60).toString().padStart(2, '0');
        if (timerEl) timerEl.innerText = `${m}:${s}`;
        timeLeft--;
    }

    updateTimer();
    activeOTPCountdownInterval = setInterval(updateTimer, 1000);
}

// Student action: Generate Check-In OTP
async function handleGenerateCheckInOTP(e) {
    e.preventDefault();
    const subject = document.getElementById('session-subject').value;
    const teacherId = document.getElementById('session-teacher-id').value;
    const lectureNumber = parseInt(document.getElementById('session-lecture-number').value, 10);

    if (!subject || !teacherId || isNaN(lectureNumber)) {
        return triggerNotificationToast("Please fill all details.", "error");
    }

    try {
        if (localStorage.getItem("isDemoMode") === "true") {
            const mockSession = {
                id: "sess_" + Date.now(),
                studentId: 10,
                studentName: "Kabir Mehta",
                teacherId: 2,
                teacherName: teachersProfileRegistry.find(t => t.userId === teacherId || t.userId === Number(teacherId))?.name || "Teacher",
                subject,
                lectureNumber,
                status: "scheduled",
                checkinOtpExpiry: new Date(Date.now() + 300 * 1000).toISOString(),
                createdAt: new Date().toISOString()
            };
            activeClassSessions.unshift(mockSession);
            currentActiveSession = mockSession;
            localStorage.setItem("demoActiveClassSessions", JSON.stringify(activeClassSessions));
            
            // Show OTP display
            document.getElementById('student-session-init-form').classList.add('hidden');
            document.getElementById('student-otp-display-zone').classList.remove('hidden');
            document.getElementById('student-otp-value').innerText = "123456";
            
            startOTPCountdown(300, 'student-otp-timer');
            triggerNotificationToast("Demo Mode: OTP Generated (Use 123456 to verify).", "success");
            renderActiveSessionsTable();
            return;
        }

        const data = await apiFetch('/attendance/class-sessions/generate-checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject, teacherId, lectureNumber })
        });

        triggerNotificationToast("Check-in OTP generated successfully.", "success");
        await synchronizePlatformStateMatrices();
        
        // Show OTP value on screen
        document.getElementById('student-otp-value').innerText = data.otp;
    } catch (err) {
        console.error(err);
    }
}

// Student action: Cancel active session
async function handleCancelActiveSession() {
    if (!currentActiveSession) return;
    
    // Simply reset view on client side, state refresh will fetch correct DB state
    currentActiveSession = null;
    document.getElementById('student-session-init-form').classList.remove('hidden');
    document.getElementById('student-otp-display-zone').classList.add('hidden');
    document.getElementById('student-session-inprogress-zone').classList.add('hidden');
    
    if (activeOTPCountdownInterval) {
        clearInterval(activeOTPCountdownInterval);
        activeOTPCountdownInterval = null;
    }
    
    triggerNotificationToast("Session generation canceled.", "info");
    await synchronizePlatformStateMatrices();
}

// Student action: Generate Check-Out OTP
async function handleGenerateCheckOutOTP() {
    const ongoingSession = activeClassSessions.find(s => s.status === 'in-progress');
    if (!ongoingSession) {
        return triggerNotificationToast("No active session in progress found.", "error");
    }

    try {
        if (localStorage.getItem("isDemoMode") === "true") {
            // For checkout OTP countdown
            document.getElementById('student-session-inprogress-zone').classList.add('hidden');
            document.getElementById('student-otp-display-zone').classList.remove('hidden');
            document.getElementById('student-otp-label').innerText = "Class Check-Out Code";
            document.getElementById('student-otp-value').innerText = "654321";
            
            startOTPCountdown(600, 'student-otp-timer');
            triggerNotificationToast("Demo Mode: Checkout OTP Generated (Use 654321 to verify).", "success");
            return;
        }

        const data = await apiFetch('/attendance/class-sessions/generate-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: ongoingSession.id })
        });

        triggerNotificationToast("Check-out OTP generated successfully.", "success");
        
        // Render check-out screen
        document.getElementById('student-session-inprogress-zone').classList.add('hidden');
        document.getElementById('student-otp-display-zone').classList.remove('hidden');
        document.getElementById('student-otp-label').innerText = "Class Check-Out Code";
        document.getElementById('student-otp-value').innerText = data.otp;
        
        startOTPCountdown(600, 'student-otp-timer');
    } catch (err) {
        console.error(err);
    }
}

// Teacher action: Verify Check-In
async function handleVerifyCheckInOTP(e) {
    e.preventDefault();
    const sessionId = document.getElementById('teacher-verify-checkin-id').value;
    const otp = document.getElementById('teacher-verify-checkin-otp').value;

    if (!sessionId || !otp) {
        return triggerNotificationToast("Please select session and enter OTP.", "error");
    }

    try {
        if (localStorage.getItem("isDemoMode") === "true") {
            const sess = activeClassSessions.find(s => s.id === sessionId);
            if (sess) {
                if (otp !== "123456") {
                    return triggerNotificationToast("Demo Mode: Incorrect OTP. (Use 123456)", "error");
                }
                sess.status = 'in-progress';
                sess.checkinVerifiedAt = new Date().toISOString();
                localStorage.setItem("demoActiveClassSessions", JSON.stringify(activeClassSessions));
                triggerNotificationToast("Demo Mode: Check-in verified. Class starts!", "success");
                document.getElementById('teacher-verify-checkin-otp').value = '';
                await synchronizePlatformStateMatrices();
            }
            return;
        }

        await apiFetch('/attendance/class-sessions/verify-checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, otp })
        });

        triggerNotificationToast("Check-in verified successfully. Class in progress!", "success");
        document.getElementById('teacher-verify-checkin-otp').value = '';
        await synchronizePlatformStateMatrices();
    } catch (err) {
        console.error(err);
    }
}

// Teacher action: Verify Check-Out
async function handleVerifyCheckOutOTP(e) {
    e.preventDefault();
    const sessionId = document.getElementById('teacher-verify-checkout-id').value;
    const otp = document.getElementById('teacher-verify-checkout-otp').value;

    if (!sessionId || !otp) {
        return triggerNotificationToast("Please select session and enter OTP.", "error");
    }

    try {
        if (localStorage.getItem("isDemoMode") === "true") {
            const sess = activeClassSessions.find(s => s.id === sessionId);
            if (sess) {
                if (otp !== "654321") {
                    return triggerNotificationToast("Demo Mode: Incorrect OTP. (Use 654321)", "error");
                }
                sess.status = 'completed';
                sess.checkoutVerifiedAt = new Date().toISOString();
                
                // Add mock attendance record
                systemAttendanceRecords.unshift({
                    id: Date.now(),
                    studentName: sess.studentName,
                    teacherName: sess.teacherName,
                    date: new Date().toISOString().split('T')[0],
                    status: "Present",
                    remarks: `In-person attendance. Lecture #${sess.lectureNumber}. Subject: ${sess.subject}. Status: COMPLETED`
                });

                localStorage.setItem("demoActiveClassSessions", JSON.stringify(activeClassSessions));
                triggerNotificationToast("Demo Mode: Check-out verified. Attendance logged!", "success");
                document.getElementById('teacher-verify-checkout-otp').value = '';
                await synchronizePlatformStateMatrices();
            }
            return;
        }

        const data = await apiFetch('/attendance/class-sessions/verify-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, otp })
        });

        if (data.warning) {
            triggerNotificationToast(data.warning, "warning");
        } else {
            triggerNotificationToast("Check-out verified successfully. Class completed and attendance logged!", "success");
        }
        document.getElementById('teacher-verify-checkout-otp').value = '';
        await synchronizePlatformStateMatrices();
    } catch (err) {
        console.error(err);
    }
}

// Renders class sessions table
function renderActiveSessionsTable() {
    const tableBody = document.getElementById('class-sessions-rendering-table');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const partnerHeader = document.getElementById('session-partner-header');
    if (partnerHeader) {
        partnerHeader.innerText = activeAuthenticatedUser.role === 'student' ? 'Teacher' : 'Student';
    }

    if (activeClassSessions.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="py-4 text-center text-slate-400 font-bold">
                    No in-person lectures logged for today.
                </td>
            </tr>
        `;
        return;
    }

    activeClassSessions.forEach(s => {
        let badgeClass = "bg-amber-100 text-amber-800";
        if (s.status === "completed") badgeClass = "bg-green-100 text-green-800";
        if (s.status === "in-progress") badgeClass = "bg-blue-100 text-blue-800";
        if (s.status === "auto-completed") badgeClass = "bg-red-100 text-red-800";

        const partnerName = activeAuthenticatedUser.role === 'student' ? s.teacherName : s.studentName;
        const checkinTimeStr = s.checkinVerifiedAt ? new Date(s.checkinVerifiedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--';
        const checkoutTimeStr = s.checkoutVerifiedAt ? new Date(s.checkoutVerifiedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--';

        tableBody.innerHTML += `
            <tr class="text-xs border-b">
                <td class="py-3 font-bold text-slate-900">${s.subject}</td>
                <td class="py-3">Lec ${s.lectureNumber}</td>
                <td class="py-3">${partnerName}</td>
                <td class="py-3 font-mono">${checkinTimeStr}</td>
                <td class="py-3 font-mono">${checkoutTimeStr}</td>
                <td class="py-3 text-right">
                    <span class="px-2 py-0.5 rounded-full font-black text-[10px] uppercase ${badgeClass}">
                        ${s.status}
                    </span>
                </td>
            </tr>
        `;
    });
}


// --- PUSH NOTIFICATION ADMIN LOGIC ---

function togglePushTargetSpecificId() {
    const type = document.getElementById('push-target-type').value;
    const container = document.getElementById('push-target-id-container');
    const input = document.getElementById('push-target-id');
    
    if (type === 'single') {
        container.classList.remove('hidden');
        input.setAttribute('required', 'true');
    } else {
        container.classList.add('hidden');
        input.removeAttribute('required');
    }
}

async function sendPushNotification(event) {
    event.preventDefault();
    
    const type = document.getElementById('push-target-type').value;
    const title = document.getElementById('push-title').value;
    const body = document.getElementById('push-body').value;
    const targetId = document.getElementById('push-target-id').value;
    
    const token = localStorage.getItem('accessToken');
    if (!token) return triggerNotificationToast('Unauthorized. Session missing.', 'error');
    
    let endpoint = 'http://localhost:5000/api/notifications/send-bulk';
    let payload = { title, body };
    
    if (type === 'single') {
        endpoint = 'http://localhost:5000/api/notifications/send-single';
        payload.userId = targetId;
    }
    
    try {
        triggerNotificationToast('Transmitting push broadcast...', 'info');
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Transmission failed.');
        }
        
        triggerNotificationToast(`Success! Sent: ${data.data.successCount}, Failed: ${data.data.failureCount}`, 'success');
        document.getElementById('admin-push-notification-form').reset();
        togglePushTargetSpecificId();
        fetchNotificationHistory();
        
    } catch (error) {
        console.error('Push Error:', error);
        triggerNotificationToast('Error: ' + error.message, 'error');
    }
}

async function fetchNotificationHistory() {
    const tbody = document.getElementById('admin-notifications-table-body');
    if (!tbody) return;
    
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    
    try {
        const response = await fetch('http://localhost:5000/api/notifications/history', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch history');
        
        tbody.innerHTML = '';
        
        if (data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-slate-400 font-bold">No dispatch history found.</td></tr>';
            return;
        }
        
        data.data.forEach(item => {
            const date = new Date(item.created_at).toLocaleString();
            let targetLabel = item.target_type.toUpperCase();
            if (item.target_type === 'single') targetLabel = 'SINGLE (ID: ' + JSON.parse(item.target_criteria).userId + ')';
            
            let statusBadge = item.status === 'sent' 
                ? '<span class="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">SENT</span>' 
                : '<span class="bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">FAILED</span>';
                
            tbody.innerHTML += `
                <tr>
                    <td class="py-3">${date}</td>
                    <td class="py-3 font-bold text-slate-900">${item.title}</td>
                    <td class="py-3"><span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold text-[10px]">${targetLabel}</span></td>
                    <td class="py-3 text-right font-mono text-[10px]">
                        <span class="text-emerald-600 font-bold">${item.success_count}</span> / 
                        <span class="text-rose-600 font-bold">${item.failure_count}</span>
                    </td>
                    <td class="py-3 text-right">${statusBadge}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('History Fetch Error:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-rose-500 font-bold">Failed to load dispatch history.</td></tr>';
    }
}
