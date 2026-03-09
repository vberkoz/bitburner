const API_ENDPOINT = 'https://api.bitburner.vberkoz.com';

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

// Password hashing function
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return arrayBufferToBase64(hash);
}

// Encrypt message using Web Crypto API
async function encryptMessage(message) {
    const encoder = new TextEncoder();
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
    
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(decrypted);
}

// Word and character counter
const messageInput = document.getElementById('messageInput');
const charCount = document.getElementById('charCount');
const wordCount = document.getElementById('wordCount');

if (messageInput) {
    messageInput.addEventListener('input', () => {
        const text = messageInput.value;
        const chars = text.length;
        const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
        
        charCount.textContent = `${chars} character${chars !== 1 ? 's' : ''}`;
        wordCount.textContent = `${words} word${words !== 1 ? 's' : ''}`;
    });
}

// Custom select dropdown for expiration
const selectTrigger = document.getElementById('selectTrigger');
const selectOptions = document.getElementById('selectOptions');
const expirationInput = document.getElementById('expirationTime');
const selectedValue = document.getElementById('selectedValue');

if (selectTrigger) {
    selectTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        selectTrigger.classList.toggle('active');
        selectOptions.classList.toggle('active');
    });

    document.addEventListener('click', () => {
        selectTrigger.classList.remove('active');
        selectOptions.classList.remove('active');
    });

    const options = selectOptions.querySelectorAll('.select-option');
    options.forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const value = option.getAttribute('data-value');
            const text = option.querySelector('span').textContent;
            
            options.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            
            expirationInput.value = value;
            selectedValue.textContent = text;
            
            selectTrigger.classList.remove('active');
            selectOptions.classList.remove('active');
        });
    });
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
        
        const password = document.getElementById('passwordInput').value;
        const expirationHours = parseInt(document.getElementById('expirationTime').value);
        
        // Hash password if provided
        let passwordHash = null;
        if (password) {
            passwordHash = await hashPassword(password);
        }
        
        const { encrypted, key, iv } = await encryptMessage(message);
        
        const requestBody = {
            encrypted,
            iv,
            ttl: expirationHours * 3600
        };
        
        if (passwordHash) {
            requestBody.passwordHash = passwordHash;
        }
        
        const response = await fetch(`${API_ENDPOINT}/secrets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) throw new Error('Failed to create secret');
        
        const { id } = await response.json();
        const url = `${window.location.origin}${window.location.pathname}?id=${id}&key=${encodeURIComponent(key)}`;
        
        document.getElementById('secretUrl').value = url;
        document.getElementById('result').classList.remove('hidden');
        document.getElementById('messageInput').value = '';
        document.getElementById('passwordInput').value = '';
        
        // Reset counters
        if (charCount) charCount.textContent = '0 characters';
        if (wordCount) wordCount.textContent = '0 words';
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
        urlInput.select();
        document.execCommand('copy');
        document.getElementById('copyBtn').textContent = 'Copied!';
    }
    setTimeout(() => {
        document.getElementById('copyBtn').textContent = 'Copy';
    }, 2000);
});

// View secret
async function viewSecret(providedPassword = null) {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const key = params.get('key');

    if (!id || !key) return;

    document.getElementById('createSection').classList.add('hidden');
    document.getElementById('viewSection').classList.remove('hidden');

    try {
        // First, check if password is required
        const checkResponse = await fetch(`${API_ENDPOINT}/secrets/${id}`);
        
        if (!checkResponse.ok) {
            throw new Error(checkResponse.status === 404 ? 'Secret not found or already viewed' : 'Failed to retrieve secret');
        }
        
        const secretData = await checkResponse.json();
        
        // If password is required and not provided, show password prompt
        if (secretData.passwordHash && !providedPassword) {
            document.getElementById('passwordPrompt').classList.remove('hidden');
            document.getElementById('messageContent').classList.add('hidden');
            return;
        }
        
        // If password is required, verify it
        if (secretData.passwordHash) {
            const providedHash = await hashPassword(providedPassword);
            if (providedHash !== secretData.passwordHash) {
                document.getElementById('passwordError').classList.remove('hidden');
                return;
            }
        }
        
        // Delete the secret and retrieve it
        const response = await fetch(`${API_ENDPOINT}/secrets/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(response.status === 404 ? 'Secret not found or already viewed' : 'Failed to retrieve secret');
        }

        const { encrypted, iv } = await response.json();
        
        const message = await decryptMessage(encrypted, key, iv);
        
        document.getElementById('passwordPrompt').classList.add('hidden');
        document.getElementById('messageContent').classList.remove('hidden');
        document.getElementById('messageDisplay').textContent = message;
        window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
        showError(error.message);
    }
}

// Unlock button handler
document.getElementById('unlockBtn')?.addEventListener('click', async () => {
    const password = document.getElementById('viewPasswordInput').value;
    if (!password) {
        document.getElementById('passwordError').classList.remove('hidden');
        const errorSpan = document.getElementById('passwordError').querySelector('span');
        if (errorSpan) errorSpan.textContent = 'Please enter a password';
        return;
    }
    
    document.getElementById('passwordError').classList.add('hidden');
    await viewSecret(password);
});

function showError(message) {
    const errorDiv = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.textContent = message;
    } else {
        errorDiv.textContent = message;
    }
    errorDiv.classList.remove('hidden');
    setTimeout(() => errorDiv.classList.add('hidden'), 5000);
}

// Social sharing buttons
document.getElementById('shareTwitter')?.addEventListener('click', () => {
    const url = document.getElementById('secretUrl').value;
    const text = 'I sent you a secure one-time message via Bitburner';
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
});

document.getElementById('shareFacebook')?.addEventListener('click', () => {
    const url = document.getElementById('secretUrl').value;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
});

document.getElementById('shareLinkedIn')?.addEventListener('click', () => {
    const url = document.getElementById('secretUrl').value;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
});

document.getElementById('shareEmail')?.addEventListener('click', () => {
    const url = document.getElementById('secretUrl').value;
    const subject = 'Secure Message from Bitburner';
    const body = `I've sent you a secure one-time message. Click the link below to view it:\n\n${url}\n\nNote: This link will only work once and will expire.`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});

// Check if viewing a secret
if (window.location.search) {
    viewSecret();
}
