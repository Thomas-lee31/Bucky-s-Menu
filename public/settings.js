class SettingsApp {
    constructor() {
        this.apiUrl = window.location.origin;
        this.currentUser = null;
        this.accessToken = null;
        this.settings = null;
        this.init();
    }

    async init() {
        this.bindEvents();
        // Initial auth check - will retry if Supabase isn't ready yet
        await this.checkAuth();
    }

    async checkAuth() {
        // Wait for Supabase to be ready
        if (!window.supabase) {
            setTimeout(() => this.checkAuth(), 200);
            return;
        }

        try {
            console.log('🔍 Checking authentication state...');

            // First check for stored access token
            const storedToken = localStorage.getItem('supabase_access_token');
            if (storedToken) {
                console.log('✅ Found stored access token, verifying...');
                this.accessToken = storedToken;
                const verified = await this.verifyUser();
                if (verified) {
                    console.log('🔧 Settings Debug Info:');
                    console.log('  - apiUrl:', this.apiUrl);
                    console.log('  - currentUser:', this.currentUser);
                    console.log('  - accessToken present:', !!this.accessToken);
                    return;
                }
            }

            // If no stored token or verification failed, check Supabase session
            const { data: { session }, error } = await window.supabase.auth.getSession();

            if (error) {
                console.error('❌ Error getting session:', error);
                this.showAuthRequired();
                return;
            }

            if (session) {
                console.log('✅ Found Supabase session, verifying...');
                this.accessToken = session.access_token;
                localStorage.setItem('supabase_access_token', this.accessToken);
                await this.verifyUser();
            } else {
                console.log('❌ No session found');
                this.showAuthRequired();
            }
        } catch (error) {
            console.error('❌ Auth check failed:', error);
            this.showAuthRequired();
        }
    }

    async verifyUser() {
        try {
            console.log('🔍 Verifying user with backend...');
            const response = await fetch(`${this.apiUrl}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                console.log('✅ User verified:', this.currentUser.email);
                await this.showSettings();
                return true;
            } else {
                console.log('❌ Backend verification failed, clearing auth');
                localStorage.removeItem('supabase_access_token');
                this.showAuthRequired();
                return false;
            }
        } catch (error) {
            console.error('❌ User verification failed:', error);
            localStorage.removeItem('supabase_access_token');
            this.showAuthRequired();
            return false;
        }
    }

    showAuthRequired() {
        document.getElementById('auth-required').classList.remove('hidden');
        document.getElementById('settings-dashboard').classList.add('hidden');
    }

    async showSettings() {
        document.getElementById('auth-required').classList.add('hidden');
        document.getElementById('settings-dashboard').classList.remove('hidden');

        // Show user info
        document.getElementById('user-email').textContent = this.currentUser.email;

        // Load and display settings
        await this.loadSettings();
    }

    async loadSettings() {
        try {
            console.log('📥 Loading settings...');
            console.log('  - URL:', `${this.apiUrl}/api/settings`);
            console.log('  - Has token:', !!this.accessToken);

            this.showLoading(true);

            const response = await fetch(`${this.apiUrl}/api/settings`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            console.log('  - Response status:', response.status);
            console.log('  - Response OK:', response.ok);

            if (response.ok) {
                this.settings = await response.json();
                console.log('  - Settings loaded:', this.settings);
                this.populateSettingsForm();
            } else {
                const errorText = await response.text();
                console.error('  - Error response:', errorText);
                this.showToast(`Failed to load settings: ${response.status}`, 'error');
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.showToast('Failed to load settings', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    populateSettingsForm() {
        const settings = this.settings;

        // Set notification toggle
        document.getElementById('email-notifications').checked = settings.emailNotifications;
    }

    bindEvents() {
        // Sign out button
        document.getElementById('signout-btn').addEventListener('click', () => {
            this.handleSignOut();
        });

        // Save settings button
        document.getElementById('save-settings').addEventListener('click', () => {
            this.saveSettings();
        });
    }

    async saveSettings() {
        try {
            console.log('💾 Save Settings Debug:');
            console.log('  - apiUrl:', this.apiUrl);
            console.log('  - currentUser:', this.currentUser);
            console.log('  - accessToken present:', !!this.accessToken);

            this.showLoading(true);

            // Collect form data - just the notification toggle for now
            const formData = {
                emailNotifications: document.getElementById('email-notifications').checked
            };
            console.log('  - formData:', formData);

            const url = `${this.apiUrl}/api/settings`;
            console.log('  - Request URL:', url);

            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                this.settings = await response.json();
                this.showToast('Notification settings saved!', 'success');
            } else {
                const error = await response.json();
                this.showToast(error.error || 'Failed to save settings', 'error');
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showToast('Failed to save settings', 'error');
        } finally {
            this.showLoading(false);
        }
    }


    async handleSignOut() {
        try {
            if (this.accessToken) {
                await fetch(`${this.apiUrl}/api/auth/signout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                });
            }

            if (window.supabase) {
                await window.supabase.auth.signOut();
            }

            // Redirect to home
            window.location.href = '/';
        } catch (error) {
            console.error('Sign out error:', error);
            // Still redirect even if there's an error
            window.location.href = '/';
        }
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
        }, 5000);
    }
}

// Initialize the app
const settingsApp = new SettingsApp();
window.settingsApp = settingsApp;