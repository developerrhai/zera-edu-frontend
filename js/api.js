const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
    ? "http://localhost:5000/api" 
    : "https://api.zeraedu.com/api";

/**
 * Custom fetch client supporting automatic JWT authorization token injection
 * and sliding refresh session interception.
 */
async function apiFetch(endpoint, options = {}) {
    if (localStorage.getItem("isDemoMode") === "true") {
        console.log(`[Demo API Mock] ${options.method || 'GET'} ${endpoint}`);
        if (endpoint.startsWith('/auth/forgot-password')) {
            return { message: "Simulated password reset instructions sent to inbox." };
        }
        return { success: true };
    }

    const accessToken = localStorage.getItem("accessToken");
    
    options.headers = options.headers || {};
    if (accessToken) {
        options.headers["Authorization"] = `Bearer ${accessToken}`;
    }

    let response = await fetch(`${API_BASE}${endpoint}`, options);

    // If access token is expired, intercept and attempt token refresh automatically
    if (response.status === 401 && localStorage.getItem("refreshToken")) {
        try {
            const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken: localStorage.getItem("refreshToken") })
            });

            if (refreshRes.ok) {
                const data = await refreshRes.json();
                localStorage.setItem("accessToken", data.accessToken);
                localStorage.setItem("refreshToken", data.refreshToken);
                
                // Re-attempt original request with updated access credentials
                options.headers["Authorization"] = `Bearer ${data.accessToken}`;
                response = await fetch(`${API_BASE}${endpoint}`, options);
            } else {
                // Clear tokens and return to login page if refresh token is rejected
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                if (typeof executeEcosystemSignout === "function") {
                    executeEcosystemSignout();
                }
                triggerNotificationToast("Your login session has expired. Please sign in again.", "error");
                throw new Error("Session expired.");
            }
        } catch (err) {
            console.error("Token refresh process aborted: ", err);
            throw err;
        }
    }

    const data = await response.json();
    if (!response.ok) {
        triggerNotificationToast(data.error || "A system execution error occurred.", "error");
        throw new Error(data.error || "Request failed.");
    }

    return data;
}

/**
 * Global toast notification triggers
 */
function triggerNotificationToast(message, variant = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return alert(message); // Fallback if container is not mounted

    const element = document.createElement('div');
    element.className = `p-3 text-xs font-bold rounded-xl shadow-xl text-white transition-all transform flex items-center gap-2 ` +
        (variant === 'success' ? 'bg-emerald-600' : variant === 'error' ? 'bg-rose-600' : 'bg-slate-900');
    element.innerHTML = `<i data-lucide="bell" class="w-3.5 h-3.5"></i> <span>${message}</span>`;
    container.appendChild(element);
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
    
    setTimeout(() => { element.remove(); }, 3500);
}
