// Firebase Configuration and Setup
// Add this file to all your HTML pages before your other JS files

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCI4uPT5pFpKHUUavGsX5OsmdPc5ovPFVA",
  authDomain: "todd-fc21e.firebaseapp.com",
  projectId: "todd-fc21e",
  storageBucket: "todd-fc21e.appspot.com", // ✅ Corrected
  messagingSenderId: "1049247804525",
  appId: "1:1049247804525:web:834887b062df13b6316364",
  measurementId: "G-BEJPDEKKLR"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.analytics();

// Initialize Firebase services
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

// Enable anonymous auth
auth.signInAnonymously().catch((error) => {
  console.error("Anonymous auth error:", error);
});

// Helper to generate a unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Upload and save a new Tod
async function createTod(blob, name, base) {
  try {
    const todId = generateId();
    const userId = auth.currentUser ? auth.currentUser.uid : 'anonymous';

    // Upload to Firebase Storage
    const imageRef = storage.ref().child(`tods/${todId}.png`);
    const uploadTask = await imageRef.put(blob);
    const imageUrl = await uploadTask.ref.getDownloadURL();

    // Save metadata to Firestore
    const todData = {
      id: todId,
      name,
      base,
      imageUrl,
      creatorId: userId,
      upvotes: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      timestamp: Date.now()
    };

    await db.collection('tods').doc(todId).set(todData);

    // Track creation for rate limiting
    await db.collection('userActivity').doc(userId).collection('creations').add({
      todId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      timestamp: Date.now()
    });

    return { success: true, todId };
  } catch (error) {
    console.error("Error creating Tod:", error);
    return { success: false, error: error.message };
  }
}

// Rate limit check (3 per minute)
async function checkFirebaseRateLimit() {
  try {
    const userId = auth.currentUser ? auth.currentUser.uid : 'anonymous';
    const oneMinuteAgo = Date.now() - 60000;

    const snapshot = await db.collection('userActivity')
      .doc(userId)
      .collection('creations')
      .where('timestamp', '>', oneMinuteAgo)
      .get();

    return snapshot.size < 3;
  } catch (error) {
    console.error("Error checking rate limit:", error);
    return true; // Allow if error
  }
}

// Load recent Tods
async function loadNewTodsFromFirebase(limit = 50) {
  try {
    const snapshot = await db.collection('tods')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    const tods = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      tods.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate() : new Date(data.timestamp)
      });
    });

    return tods;
  } catch (error) {
    console.error("Error loading new tods:", error);
    return [];
  }
}

// Load top Tods
async function loadTopTodsFromFirebase(limit = 20) {
  try {
    const snapshot = await db.collection('tods')
      .orderBy('upvotes', 'desc')
      .limit(limit)
      .get();

    const tods = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      let creatorName = 'Anonymous';

      if (data.creatorId) {
        const userDoc = await db.collection('users').doc(data.creatorId).get();
        if (userDoc.exists) {
          creatorName = userDoc.data().displayName || 'Anonymous';
        }
      }

      tods.push({
        id: doc.id,
        ...data,
        creator: creatorName,
        createdAt: data.createdAt ? data.createdAt.toDate() : new Date(data.timestamp)
      });
    }

    return tods;
  } catch (error) {
    console.error("Error loading top tods:", error);
    return [];
  }
}

// Toggle upvote
async function toggleUpvoteFirebase(todId, isUpvoted) {
  try {
    const userId = auth.currentUser ? auth.currentUser.uid : 'anonymous';
    const todRef = db.collection('tods').doc(todId);
    const upvoteRef = db.collection('upvotes').doc(`${userId}_${todId}`);

    await db.runTransaction(async (transaction) => {
      const todDoc = await transaction.get(todRef);
      if (!todDoc.exists) return;

      const currentUpvotes = todDoc.data().upvotes || 0;
      if (isUpvoted) {
        transaction.update(todRef, { upvotes: Math.max(0, currentUpvotes - 1) });
        transaction.delete(upvoteRef);
      } else {
        transaction.update(todRef, { upvotes: currentUpvotes + 1 });
        transaction.set(upvoteRef, {
          userId,
          todId,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error toggling upvote:", error);
    return { success: false, error: error.message };
  }
}

// Get user's upvoted Tods
async function getUserUpvotes() {
  try {
    const userId = auth.currentUser ? auth.currentUser.uid : 'anonymous';
    const snapshot = await db.collection('upvotes')
      .where('userId', '==', userId)
      .get();

    return snapshot.docs.map(doc => doc.data().todId);
  } catch (error) {
    console.error("Error getting user upvotes:", error);
    return [];
  }
}

// Real-time listeners
function listenToNewTods(callback) {
  return db.collection('tods')
    .orderBy('timestamp', 'desc')
    .limit(50)
    .onSnapshot(snapshot => {
      const tods = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        tods.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(data.timestamp)
        });
      });
      callback(tods);
    });
}

function listenToTopTods(callback) {
  return db.collection('tods')
    .orderBy('upvotes', 'desc')
    .limit(20)
    .onSnapshot(async snapshot => {
      const tods = [];
      for (const doc of snapshot.docs) {
        const data = doc.data();
        let creatorName = 'Anonymous';

        if (data.creatorId) {
          const userDoc = await db.collection('users').doc(data.creatorId).get();
          if (userDoc.exists) {
            creatorName = userDoc.data().displayName || 'Anonymous';
          }
        }

        tods.push({
          id: doc.id,
          ...data,
          creator: creatorName,
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(data.timestamp)
        });
      }
      callback(tods);
    });
}
