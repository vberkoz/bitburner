const API_ENDPOINT = 'API_GATEWAY_URL'; // Will be replaced by deploy script

// Helper functions for base64 encoding/decoding with UTF-8 support
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

// Encrypt message using Web Crypto API
async function encryptMessage(message) {
    const encoder = new TextEncoder(); // UTF-8 by default
    const data = encoder.encode(message);
    const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
    );
    const exportedKey = await crypto.subtle.exportKey('raw', key);
    
    return {
        encrypted: arrayBufferToBase64(encrypted),
        key: arrayBufferToBase64(exportedKey),
        iv: arrayBufferToBase64(iv)
    };
}

// Decrypt message
async function decryptMessage(encryptedData, keyData, ivData) {
    const encrypted = base64ToArrayBuffer(encryptedData);
    const keyBytes = base64ToArrayBuffer(keyData);
    const iv = base64ToArrayBuffer(ivData);
    
    const key = await crypto.subtle.importKey(
        'raw',
        keyBytes,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
    );
    
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
    );
    
    const decoder = new TextDecoder('utf-8'); // Explicitly UTF-8
    return decoder.decode(decrypted);
}

// Create secret
document.getElementById('createBtn')?.addEventListener('click', async () => {
    const message = document.getElementById('messageInput').value.trim();
    if (!message) {
        showError('Please enter a message');
        return;
    }

    const btn = document.getElementById('createBtn');
    const originalText = btn.textContent;
    
    try {
        btn.classList.add('loading');
        btn.textContent = 'Generate One-Time URL...';
        
        const { encrypted, key, iv } = await encryptMessage(message);
        
        const response = await fetch(`${API_ENDPOINT}/secrets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ encrypted, iv })
        });

        if (!response.ok) throw new Error('Failed to create secret');
        
        const { id } = await response.json();
        const url = `${window.location.origin}${window.location.pathname}?id=${id}&key=${encodeURIComponent(key)}`;
        
        document.getElementById('secretUrl').value = url;
        document.getElementById('result').classList.remove('hidden');
        document.getElementById('messageInput').value = '';
    } catch (error) {
        showError('Failed to create secret: ' + error.message);
    } finally {
        btn.classList.remove('loading');
        btn.textContent = originalText;
    }
});

// Copy URL
document.getElementById('copyBtn')?.addEventListener('click', async () => {
    const urlInput = document.getElementById('secretUrl');
    try {
        await navigator.clipboard.writeText(urlInput.value);
        document.getElementById('copyBtn').textContent = 'Copied!';
    } catch (err) {
        // Fallback for older browsers
        urlInput.select();
        document.execCommand('copy');
        document.getElementById('copyBtn').textContent = 'Copied!';
    }
    setTimeout(() => {
        document.getElementById('copyBtn').textContent = 'Copy';
    }, 2000);
});

// View secret
async function viewSecret() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const key = params.get('key');

    if (!id || !key) return;

    document.getElementById('createSection').classList.add('hidden');
    document.getElementById('viewSection').classList.remove('hidden');

    try {
        const response = await fetch(`${API_ENDPOINT}/secrets/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(response.status === 404 ? 'Secret not found or already viewed' : 'Failed to retrieve secret');
        }

        const { encrypted, iv } = await response.json();
        
        // Decode the key from URL (it's already decoded by URLSearchParams)
        const message = await decryptMessage(encrypted, key, iv);
        
        document.getElementById('messageDisplay').textContent = message;
        window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
        showError(error.message);
    }
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => errorDiv.classList.add('hidden'), 5000);
}

// Check if viewing a secret
if (window.location.search) {
    viewSecret();
}
