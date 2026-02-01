/**
 * Firebase Configuration and Functions for Digital Bouquet
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project (or use existing)
 * 3. Add a web app to your project
 * 4. Copy your config values below
 * 5. Enable Firestore Database in test mode
 */

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCNn5LjHyPpHt5akTmdiRGSuhujXzE0fRg",
    authDomain: "bouquet-project-f3347.firebaseapp.com",
    projectId: "bouquet-project-f3347",
    storageBucket: "bouquet-project-f3347.firebasestorage.app",
    messagingSenderId: "1043423036163",
    appId: "1:1043423036163:web:eab0442ab381122e629f36"
};

// Firebase state
let db = null;
let firebaseInitialized = false;

// Initialize Firebase
async function initFirebase() {
    if (firebaseInitialized) return true;

    // Check if config is set
    if (firebaseConfig.apiKey === "YOUR_API_KEY") {
        console.warn('Firebase not configured. Using localStorage fallback.');
        return false;
    }

    try {
        // Dynamically import Firebase modules
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js');
        const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');

        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        firebaseInitialized = true;
        console.log('Firebase initialized successfully');
        return true;
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        return false;
    }
}

// Generate a short unique ID
function generateBouquetId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 8; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

// Save bouquet to Firebase (or localStorage fallback)
async function saveBouquet(bouquetData) {
    const id = generateBouquetId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const data = {
        id: id,
        flowers: bouquetData.flowers,
        wrapper: bouquetData.wrapper,
        letter: bouquetData.letter,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString()
    };

    // Try Firebase first
    const fbInitialized = await initFirebase();

    if (fbInitialized && db) {
        try {
            const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
            await setDoc(doc(db, 'bouquets', id), data);
            console.log('Bouquet saved to Firebase:', id);
            return { success: true, id: id };
        } catch (error) {
            console.error('Firebase save failed:', error);
        }
    }

    // Fallback to localStorage
    try {
        const bouquets = JSON.parse(localStorage.getItem('savedBouquets') || '{}');
        bouquets[id] = data;
        localStorage.setItem('savedBouquets', JSON.stringify(bouquets));
        console.log('Bouquet saved to localStorage:', id);
        return { success: true, id: id };
    } catch (error) {
        console.error('localStorage save failed:', error);
        return { success: false, error: error.message };
    }
}

// Get bouquet from Firebase (or localStorage fallback)
async function getBouquet(id) {
    // Try Firebase first
    const fbInitialized = await initFirebase();

    if (fbInitialized && db) {
        try {
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
            const docRef = doc(db, 'bouquets', id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();

                // Check if expired
                if (new Date(data.expiresAt) < new Date()) {
                    return { success: false, error: 'expired' };
                }

                return { success: true, data: data };
            }
        } catch (error) {
            console.error('Firebase fetch failed:', error);
        }
    }

    // Fallback to localStorage
    try {
        const bouquets = JSON.parse(localStorage.getItem('savedBouquets') || '{}');
        const data = bouquets[id];

        if (data) {
            // Check if expired
            if (new Date(data.expiresAt) < new Date()) {
                return { success: false, error: 'expired' };
            }

            return { success: true, data: data };
        }
    } catch (error) {
        console.error('localStorage fetch failed:', error);
    }

    return { success: false, error: 'not_found' };
}

// Get shareable URL
function getShareUrl(id) {
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
    return `${baseUrl}/view.html?id=${id}`;
}

// Export functions
window.FirebaseService = {
    init: initFirebase,
    saveBouquet: saveBouquet,
    getBouquet: getBouquet,
    getShareUrl: getShareUrl,
    generateId: generateBouquetId
};
