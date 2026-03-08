// Hardcoded credentials
const CREDENTIALS = {
    password: 'bitburner2024' // Change this to your desired password
};

// Check if already logged in
if (sessionStorage.getItem('authenticated') === 'true') {
    window.location.href = 'index.html';
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('error');
    const loginBtn = document.getElementById('loginBtn');
    
    errorDiv.classList.add('hidden');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (password === CREDENTIALS.password) {
        sessionStorage.setItem('authenticated', 'true');
        window.location.href = 'index.html';
    } else {
        errorDiv.textContent = 'Invalid password';
        errorDiv.classList.remove('hidden');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
    }
});
