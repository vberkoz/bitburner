// Check authentication
if (sessionStorage.getItem('authenticated') !== 'true') {
    window.location.href = 'login.html';
}

// Logout functionality
document.getElementById('logoutBtn')?.addEventListener('click', () => {
    sessionStorage.removeItem('authenticated');
    window.location.href = 'login.html';
});
