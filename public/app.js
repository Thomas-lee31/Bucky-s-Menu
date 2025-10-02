class BuckyMenuApp {
    constructor() {
        this.apiUrl = window.location.hostname === 'localhost'
            ? ''
            : 'https://buckys-menu-api.onrender.com'; // Update with your Render URL
        this.searchTimeout = null;
        this.currentUser = null;
        this.accessToken = null;
        this.supabase = null;
        this.init();
    }

    async init() {
        this.bindEvents();
        this.checkAuthOnLoad();
    }

    async checkAuthOnLoad() {
        // Check URL parameters for auth callbacks
        const urlParams = new URLSearchParams(window.location.search);
        const authSuccess = urlParams.get('auth');
        const authError = urlParams.get('error');

        if (authSuccess === 'success') {
            this.showToast('Successfully signed in!', 'success');
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (authError) {
            this.showToast(`Authentication error: ${decodeURIComponent(authError)}`, 'error');
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Wait for Supabase client to be initialized
        if (window.supabase && window.supabase.auth) {
            await this.restoreSession();
        } else {
            // Wait a bit and try again
            setTimeout(() => this.checkAuthOnLoad(), 200);
        }
    }

    async restoreSession() {
        try {
            console.log('🔍 Checking for existing Supabase session...');

            // Get current session from Supabase
            const { data: { session }, error } = await window.supabase.auth.getSession();

            if (error) {
                console.error('❌ Error getting session:', error);
                this.clearAuth();
                return;
            }

            if (session) {
                console.log('✅ Found existing session, restoring...');

                // Restore access token
                this.accessToken = session.access_token;
                localStorage.setItem('supabase_access_token', this.accessToken);

                // Get user info from our backend
                console.log('🔍 Verifying user with backend...');
                const userResponse = await fetch(`${this.apiUrl}/api/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                });

                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    console.log('✅ User verified, signing in:', userData.user.email);
                    this.setCurrentUser(userData.user);
                } else {
                    console.log('❌ Backend verification failed, clearing auth');
                    this.clearAuth();
                }
            } else {
                console.log('ℹ️ No existing session found');
                // No session, make sure we show auth forms
                this.clearAuth();
            }
        } catch (error) {
            console.error('❌ Error restoring session:', error);
            this.clearAuth();
        }
    }

    async verifyAndLoadUser() {
        try {
            this.showLoading(true);
            const response = await fetch(`${this.apiUrl}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.setCurrentUser(data.user);
            } else {
                // Token is invalid, clear it
                this.clearAuth();
            }
        } catch (error) {
            console.error('Error verifying user:', error);
            this.clearAuth();
        } finally {
            this.showLoading(false);
        }
    }

    setCurrentUser(user) {
        this.currentUser = user;

        // Update navbar
        document.getElementById('navbar-email').textContent = user.email;
        document.getElementById('navbar-user').classList.remove('hidden');
        document.getElementById('navbar-auth').classList.add('hidden');

        // Show dashboard, hide auth
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');

        // Load user's subscriptions
        this.loadSubscriptions();
    }

    clearAuth() {
        this.currentUser = null;
        this.accessToken = null;
        localStorage.removeItem('supabase_access_token');

        // Update navbar
        document.getElementById('navbar-user').classList.add('hidden');
        document.getElementById('navbar-auth').classList.remove('hidden');

        // Clear Supabase session too (but only if client is ready)
        if (window.supabase && window.supabase.auth && window.supabase.auth.signOut) {
            try {
                window.supabase.auth.signOut();
            } catch (error) {
                console.log('Note: Could not sign out from Supabase (client may not be ready)');
            }
        }

        // Hide dashboard, show auth
        document.getElementById('dashboard').classList.add('hidden');
        document.getElementById('auth-section').classList.remove('hidden');
    }

    bindEvents() {
        // Navbar events
        document.getElementById('navbar-signin').addEventListener('click', () => {
            this.scrollToAuth();
        });

        document.getElementById('navbar-signout').addEventListener('click', () => {
            this.handleSignOut();
        });

        // Auth tabs
        document.getElementById('signin-tab').addEventListener('click', () => {
            this.switchAuthTab('signin');
        });

        document.getElementById('signup-tab').addEventListener('click', () => {
            this.switchAuthTab('signup');
        });

        // Auth forms
        document.getElementById('signin-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignIn();
        });

        document.getElementById('signup-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignUp();
        });

        // Google auth buttons
        document.getElementById('google-signin').addEventListener('click', () => {
            this.handleGoogleAuth();
        });

        document.getElementById('google-signup').addEventListener('click', () => {
            this.handleGoogleAuth();
        });

        // Food search autocomplete
        const foodSearch = document.getElementById('food-search');
        foodSearch.addEventListener('input', (e) => {
            const query = e.target.value.trim();

            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }

            if (query.length >= 2) {
                this.searchTimeout = setTimeout(() => {
                    this.searchFoods(query);
                }, 300);
            } else {
                this.clearSearchResults();
            }
        });

        // Hide search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.clearSearchResults();
            }
        });

        // Menu loading
        const loadMenuBtn = document.getElementById('load-menu');
        loadMenuBtn.addEventListener('click', () => {
            this.loadTodaysMenu();
        });
    }

    switchAuthTab(tab) {
        const signinTab = document.getElementById('signin-tab');
        const signupTab = document.getElementById('signup-tab');
        const signinForm = document.getElementById('signin-form');
        const signupForm = document.getElementById('signup-form');

        if (tab === 'signin') {
            signinTab.classList.add('active');
            signupTab.classList.remove('active');
            signinForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
        } else {
            signinTab.classList.remove('active');
            signupTab.classList.add('active');
            signinForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
        }
    }

    async handleSignUp() {
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm').value;

        if (password !== confirmPassword) {
            this.showToast('Passwords do not match', 'error');
            return;
        }

        try {
            this.showLoading(true);

            // Use Supabase client for authentication
            if (window.supabase) {
                const { data, error } = await window.supabase.auth.signUp({
                    email: email,
                    password: password
                });

                if (error) {
                    this.showToast(error.message, 'error');
                    return;
                }

                if (data.session) {
                    // User is signed in immediately (email confirmation disabled)
                    this.accessToken = data.session.access_token;
                    localStorage.setItem('supabase_access_token', this.accessToken);

                    // Get user info from our backend
                    const userResponse = await fetch(`${this.apiUrl}/api/auth/me`, {
                        headers: {
                            'Authorization': `Bearer ${this.accessToken}`
                        }
                    });

                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        this.setCurrentUser(userData.user);
                        this.showToast('Account created and signed in!', 'success');
                    }
                } else {
                    // Email confirmation required
                    this.showToast('Account created! Please check your email for verification.', 'success');
                    this.switchAuthTab('signin');
                    document.getElementById('signin-email').value = email;
                }
            } else {
                this.showToast('Authentication service not available', 'error');
            }
        } catch (error) {
            console.error('Sign up error:', error);
            this.showToast('Sign up failed', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handleSignIn() {
        const email = document.getElementById('signin-email').value;
        const password = document.getElementById('signin-password').value;

        try {
            this.showLoading(true);

            // Use Supabase client for authentication
            if (window.supabase) {
                const { data, error } = await window.supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) {
                    this.showToast(error.message, 'error');
                    return;
                }

                if (data.session) {
                    this.accessToken = data.session.access_token;
                    localStorage.setItem('supabase_access_token', this.accessToken);

                    // Get user info from our backend
                    const userResponse = await fetch(`${this.apiUrl}/api/auth/me`, {
                        headers: {
                            'Authorization': `Bearer ${this.accessToken}`
                        }
                    });

                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        this.setCurrentUser(userData.user);
                        this.showToast('Sign in successful!', 'success');
                    }
                }
            } else {
                this.showToast('Authentication service not available', 'error');
            }
        } catch (error) {
            console.error('Sign in error:', error);
            this.showToast('Sign in failed', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    handleGoogleAuth() {
        // Redirect to Google OAuth
        window.location.href = `${this.apiUrl}/api/auth/google`;
    }

    async handleSignOut() {
        try {
            if (this.accessToken) {
                this.showLoading(true);
                await fetch(`${this.apiUrl}/api/auth/signout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                });
            }

            this.clearAuth();
            this.showToast('Signed out successfully', 'success');
        } catch (error) {
            console.error('Sign out error:', error);
            this.clearAuth();
        } finally {
            this.showLoading(false);
        }
    }

    async searchFoods(query) {
        try {
            this.showLoading(true);
            const response = await fetch(`${this.apiUrl}/api/foods/search?q=${encodeURIComponent(query)}`);
            const foods = await response.json();

            this.displaySearchResults(foods);
        } catch (error) {
            console.error('Error searching foods:', error);
            this.showToast('Error searching foods', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displaySearchResults(foods) {
        const resultsContainer = document.getElementById('search-results');

        if (foods.length === 0) {
            resultsContainer.innerHTML = '<div class="search-result-item">No foods found</div>';
            resultsContainer.classList.remove('hidden');
            return;
        }

        const resultsHtml = foods.map(food => {
            const subscribeButton = this.currentUser
                ? `<button class="subscribe-btn" onclick="app.subscribeToFood('${food.foodId}', '${food.name.replace(/'/g, "\\'")}')">Subscribe</button>`
                : `<button class="subscribe-btn" onclick="app.promptSignIn('${food.name}')">Sign in to Subscribe</button>`;

            return `
                <div class="search-result-item" data-food-id="${food.foodId}" data-food-name="${food.name}">
                    <div class="food-info">
                        <span class="food-name clickable" onclick="app.viewFoodHistory('${food.foodId}')" title="View history for ${food.name}">${food.name}</span>
                        <span class="appearance-count">${food.totalAppearances} appearances</span>
                    </div>
                    ${subscribeButton}
                </div>
            `;
        }).join('');

        resultsContainer.innerHTML = resultsHtml;
        resultsContainer.classList.remove('hidden');
    }

    clearSearchResults() {
        const resultsContainer = document.getElementById('search-results');
        resultsContainer.innerHTML = '';
        resultsContainer.classList.add('hidden');
    }

    async subscribeToFood(foodId, foodName) {
        if (!this.currentUser) {
            this.showToast('Please sign in to subscribe to foods', 'error');
            return;
        }

        try {
            this.showLoading(true);
            const response = await fetch(`${this.apiUrl}/api/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: JSON.stringify({
                    foodId: foodId,
                    foodName: foodName
                })
            });

            if (response.ok) {
                this.showToast(`Successfully subscribed to ${foodName}!`, 'success');
                this.clearSearchResults();
                document.getElementById('food-search').value = '';
                this.loadSubscriptions();
            } else if (response.status === 409) {
                this.showToast('You are already subscribed to this food', 'warning');
            } else {
                const error = await response.json();
                this.showToast(error.error || 'Error subscribing to food', 'error');
            }
        } catch (error) {
            console.error('Error subscribing:', error);
            this.showToast('Error subscribing to food', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loadSubscriptions() {
        if (!this.currentUser) {
            return;
        }

        try {
            this.showLoading(true);
            const response = await fetch(`${this.apiUrl}/api/subscriptions`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
            const subscriptions = await response.json();

            this.displaySubscriptions(subscriptions);
        } catch (error) {
            console.error('Error loading subscriptions:', error);
            this.showToast('Error loading subscriptions', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displaySubscriptions(subscriptions) {
        const subscriptionsList = document.getElementById('subscriptions-list');

        if (subscriptions.length === 0) {
            subscriptionsList.innerHTML = '<p class="empty-state">You have no active subscriptions yet.</p>';
            return;
        }

        const subscriptionsHtml = subscriptions.map(sub => `
            <div class="subscription-item">
                <div class="subscription-info">
                    <span class="food-name clickable" onclick="app.viewFoodHistory('${sub.foodId}')" title="View history for ${sub.foodName}">${sub.foodName}</span>
                    <span class="subscription-date">Subscribed: ${new Date(sub.createdAt).toLocaleDateString()}</span>
                </div>
                <button class="unsubscribe-btn" onclick="app.unsubscribeFromFood('${sub.foodId}', '${sub.foodName.replace(/'/g, "\\'")}')">
                    Unsubscribe
                </button>
            </div>
        `).join('');

        subscriptionsList.innerHTML = subscriptionsHtml;
    }

    async unsubscribeFromFood(foodId, foodName) {
        if (!this.currentUser) {
            this.showToast('Please sign in to manage subscriptions', 'error');
            return;
        }

        try {
            this.showLoading(true);
            const response = await fetch(`${this.apiUrl}/api/unsubscribe`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: JSON.stringify({
                    foodId: foodId
                })
            });

            if (response.ok) {
                this.showToast(`Successfully unsubscribed from ${foodName}`, 'success');
                this.loadSubscriptions();
            } else {
                const error = await response.json();
                this.showToast(error.error || 'Error unsubscribing', 'error');
            }
        } catch (error) {
            console.error('Error unsubscribing:', error);
            this.showToast('Error unsubscribing', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loadTodaysMenu() {
        const diningHall = document.getElementById('dining-hall-filter').value;
        const meal = document.getElementById('meal-filter').value;

        let url = `${this.apiUrl}/api/menu/today`;
        const params = [];

        if (diningHall) params.push(`diningHall=${encodeURIComponent(diningHall)}`);
        if (meal) params.push(`meal=${encodeURIComponent(meal)}`);

        if (params.length > 0) {
            url += '?' + params.join('&');
        }

        try {
            this.showLoading(true);
            const response = await fetch(url);
            const menuItems = await response.json();

            this.displayMenu(menuItems);
        } catch (error) {
            console.error('Error loading menu:', error);
            this.showToast('Error loading menu', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayMenu(menuItems) {
        const menuList = document.getElementById('menu-list');

        if (menuItems.length === 0) {
            menuList.innerHTML = '<p class="empty-state">No menu items found for the selected filters.</p>';
            return;
        }

        // Group by dining hall and meal
        const grouped = {};
        menuItems.forEach(item => {
            const key = `${item.diningHall}-${item.meal}`;
            if (!grouped[key]) {
                grouped[key] = {
                    diningHall: item.diningHall,
                    meal: item.meal,
                    items: []
                };
            }
            grouped[key].items.push(item);
        });

        let menuHtml = '';
        Object.values(grouped).forEach(group => {
            const diningHallName = this.formatDiningHall(group.diningHall);
            const mealName = this.formatMeal(group.meal);

            menuHtml += `
                <div class="menu-group">
                    <h3>${diningHallName} - ${mealName}</h3>
                    <div class="menu-items">
                        ${group.items.map(item => `
                            <div class="menu-item">
                                <span class="food-name clickable" onclick="app.viewFoodHistory('${item.foodId}')" title="View history for ${item.name}">${item.name}</span>
                                ${this.currentUser ? `<button class="subscribe-btn small" onclick="app.subscribeToFood('${item.foodId}', '${item.name.replace(/'/g, "\\'")}')">Subscribe</button>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        menuList.innerHTML = menuHtml;
    }

    formatDiningHall(diningHall) {
        return diningHall
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    formatMeal(meal) {
        return meal.charAt(0).toUpperCase() + meal.slice(1);
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (show) {
            loading.classList.remove('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 4000);
    }

    viewFoodHistory(foodId) {
        window.open(`/food-history.html?foodId=${encodeURIComponent(foodId)}`, '_blank');
    }

    promptSignIn(foodName) {
        this.showToast(`Sign in to subscribe to ${foodName} and get notifications when it's available!`, 'info');
        this.scrollToAuth();
    }

    scrollToAuth() {
        const authSection = document.getElementById('auth-section');
        if (authSection) {
            authSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

// Initialize the app
const app = new BuckyMenuApp();
window.app = app;