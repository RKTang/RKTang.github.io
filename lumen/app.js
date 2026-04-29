import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
    deleteObject,
    getDownloadURL,
    getStorage,
    ref,
    uploadBytes
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import * as exifr from "https://cdn.jsdelivr.net/npm/exifr/dist/full.esm.mjs";

const firebaseConfig = window.LUMEN_FIREBASE_CONFIG || null;
const hasFirebaseConfig = firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "REPLACE_ME";

const dom = {
    signInBtn: document.getElementById("sign-in-btn"),
    signOutBtn: document.getElementById("sign-out-btn"),
    authStatus: document.getElementById("auth-status"),
    newAlbumForm: document.getElementById("new-album-form"),
    newAlbumTitle: document.getElementById("new-album-title"),
    newAlbumVisibility: document.getElementById("new-album-visibility"),
    albumListEmpty: document.getElementById("album-list-empty"),
    albumList: document.getElementById("album-list"),
    activeAlbumTitle: document.getElementById("active-album-title"),
    activeAlbumVisibility: document.getElementById("active-album-visibility"),
    albumControls: document.getElementById("album-controls"),
    albumVisibilitySelect: document.getElementById("album-visibility-select"),
    saveAlbumSettings: document.getElementById("save-album-settings"),
    shareUrlText: document.getElementById("share-url-text"),
    photoUploadInput: document.getElementById("photo-upload-input"),
    albumViewState: document.getElementById("album-view-state"),
    entryGrid: document.getElementById("entry-grid"),
    entryTemplate: document.getElementById("entry-template")
};

let app = null;
let auth = null;
let db = null;
let storage = null;
let currentUser = null;
let activeAlbum = null;
let unsubscribeEntries = null;
let unsubscribeAlbums = null;
let isOwnerViewing = false;

if (!hasFirebaseConfig) {
    dom.authStatus.textContent = "Firebase is not configured yet. Update lumen/firebase-config.js to start.";
    dom.signInBtn.disabled = true;
} else {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    initialize();
}

function initialize() {
    dom.signInBtn.addEventListener("click", handleSignIn);
    dom.signOutBtn.addEventListener("click", handleSignOut);
    dom.newAlbumForm.addEventListener("submit", handleCreateAlbum);
    dom.saveAlbumSettings.addEventListener("click", handleSaveAlbumSettings);
    dom.photoUploadInput.addEventListener("change", handleUploadPhotos);

    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        await ensureUserDoc(user);
        updateAuthUI();
        subscribeAlbumList();
        await tryOpenAlbumFromUrl();
    });
}

async function handleSignIn() {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        dom.authStatus.textContent = `Sign-in failed: ${error.message}`;
    }
}

async function handleSignOut() {
    await signOut(auth);
    clearAlbumView();
}

async function ensureUserDoc(user) {
    if (!user) {
        return;
    }
    const userRef = doc(db, "users", user.uid);
    await setDoc(
        userRef,
        {
            uid: user.uid,
            displayName: user.displayName || "",
            email: user.email || "",
            createdAt: serverTimestamp()
        },
        { merge: true }
    );
}

function updateAuthUI() {
    const loggedIn = Boolean(currentUser);
    dom.signInBtn.hidden = loggedIn;
    dom.signOutBtn.hidden = !loggedIn;
    dom.newAlbumForm.hidden = !loggedIn;
    dom.authStatus.textContent = loggedIn
        ? `Signed in as ${currentUser.displayName || currentUser.email}`
        : "Sign in to create private/public albums.";
}

function subscribeAlbumList() {
    if (unsubscribeAlbums) {
        unsubscribeAlbums();
    }

    dom.albumList.innerHTML = "";

    const albumsRef = collection(db, "albums");
    const watchers = [];

    if (currentUser) {
        watchers.push(
            onSnapshot(query(albumsRef, where("ownerUid", "==", currentUser.uid)), (snapshot) => {
                renderAlbumList(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })), true);
            })
        );
    }

    watchers.push(
        onSnapshot(query(albumsRef, where("visibility", "==", "public")), (snapshot) => {
            renderAlbumList(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })), false);
        })
    );

    unsubscribeAlbums = () => watchers.forEach((fn) => fn());
}

const albumMap = new Map();
function renderAlbumList(albums, ownedQuery) {
    for (const album of albums) {
        albumMap.set(album.id, {
            ...albumMap.get(album.id),
            ...album,
            _ownedMatch: ownedQuery ? true : albumMap.get(album.id)?._ownedMatch || false
        });
    }
    const merged = Array.from(albumMap.values()).sort((a, b) => {
        const aTs = a.updatedAt?.seconds || 0;
        const bTs = b.updatedAt?.seconds || 0;
        return bTs - aTs;
    });

    dom.albumList.innerHTML = "";
    dom.albumListEmpty.hidden = merged.length > 0;
    dom.albumListEmpty.textContent = currentUser
        ? "No albums yet. Create your first one."
        : "Sign in to create albums, or open a public album by shared link.";

    merged.forEach((album) => {
        const card = document.createElement("div");
        card.className = "album-item";
        if (activeAlbum?.id === album.id) {
            card.classList.add("active");
        }
        const owned = currentUser && album.ownerUid === currentUser.uid;
        card.innerHTML = `
            <p class="album-item-title">${escapeHtml(album.title || "Untitled album")}</p>
            <p class="muted">${owned ? "Owned by you" : "Public album"} · ${album.visibility || "private"}</p>
            <button type="button">${activeAlbum?.id === album.id ? "Opened" : "Open album"}</button>
        `;
        card.querySelector("button").addEventListener("click", () => openAlbum(album.id));
        dom.albumList.appendChild(card);
    });
}

async function handleCreateAlbum(event) {
    event.preventDefault();
    if (!currentUser) {
        return;
    }
    const title = dom.newAlbumTitle.value.trim();
    if (!title) {
        return;
    }
    const visibility = dom.newAlbumVisibility.value;
    const albumRef = await addDoc(collection(db, "albums"), {
        ownerUid: currentUser.uid,
        title,
        visibility,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    dom.newAlbumForm.reset();
    await openAlbum(albumRef.id);
}

async function tryOpenAlbumFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const albumId = params.get("album");
    if (albumId) {
        await openAlbum(albumId);
    }
}

async function openAlbum(albumId) {
    const albumRef = doc(db, "albums", albumId);
    const albumSnap = await getDoc(albumRef);
    if (!albumSnap.exists()) {
        dom.albumViewState.textContent = "Album not found.";
        return;
    }

    const album = { id: albumSnap.id, ...albumSnap.data() };
    const isOwner = currentUser && album.ownerUid === currentUser.uid;
    if (album.visibility !== "public" && !isOwner) {
        dom.albumViewState.textContent = "This album is private. Sign in as the owner to view.";
        return;
    }

    activeAlbum = album;
    isOwnerViewing = Boolean(isOwner);
    dom.activeAlbumTitle.textContent = album.title || "Untitled album";
    dom.activeAlbumVisibility.hidden = false;
    dom.activeAlbumVisibility.textContent = album.visibility || "private";
    dom.albumViewState.textContent = "";
    dom.albumControls.hidden = !isOwnerViewing;
    dom.albumVisibilitySelect.value = album.visibility || "private";
    dom.shareUrlText.textContent = `Share URL: ${window.location.origin}${window.location.pathname}?album=${album.id}`;
    history.replaceState(null, "", `?album=${album.id}`);

    subscribeEntries(album.id);
    subscribeAlbumList();
}

function subscribeEntries(albumId) {
    if (unsubscribeEntries) {
        unsubscribeEntries();
    }
    const entriesRef = collection(db, "albums", albumId, "entries");
    unsubscribeEntries = onSnapshot(query(entriesRef, orderBy("orderIndex", "asc")), (snapshot) => {
        renderEntries(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    });
}

function renderEntries(entries) {
    dom.entryGrid.innerHTML = "";
    if (!entries.length) {
        dom.albumViewState.textContent = isOwnerViewing
            ? "No photos yet. Upload one or more images to start this album."
            : "No photos in this album yet.";
    }

    entries.forEach((entry) => {
        const node = dom.entryTemplate.content.firstElementChild.cloneNode(true);
        const img = node.querySelector(".entry-image");
        const storyEl = node.querySelector(".entry-story");
        const locEl = node.querySelector(".entry-location");
        const dateEl = node.querySelector(".entry-date");
        const metaEl = node.querySelector(".entry-meta");
        const saveBtn = node.querySelector(".entry-save");
        const delBtn = node.querySelector(".entry-delete");

        img.src = entry.photoUrl;
        img.alt = entry.storyText ? `Album entry: ${entry.storyText}` : "Album entry";
        storyEl.value = entry.storyText || "";
        locEl.value = entry.locationText || "";
        dateEl.value = entry.captureDate || "";
        metaEl.textContent = `Entry ID: ${entry.id}`;

        const disabled = !isOwnerViewing;
        storyEl.disabled = disabled;
        locEl.disabled = disabled;
        dateEl.disabled = disabled;
        saveBtn.hidden = disabled;
        delBtn.hidden = disabled;

        saveBtn.addEventListener("click", async () => {
            await updateDoc(doc(db, "albums", activeAlbum.id, "entries", entry.id), {
                storyText: storyEl.value.trim(),
                locationText: locEl.value.trim(),
                captureDate: dateEl.value.trim(),
                updatedAt: serverTimestamp()
            });
            await touchAlbumUpdatedAt(activeAlbum.id);
        });

        delBtn.addEventListener("click", async () => {
            if (!confirm("Delete this photo entry?")) {
                return;
            }
            await deleteDoc(doc(db, "albums", activeAlbum.id, "entries", entry.id));
            if (entry.storagePath) {
                try {
                    await deleteObject(ref(storage, entry.storagePath));
                } catch (_error) {
                    // ignore storage delete failures so metadata delete still succeeds
                }
            }
            await touchAlbumUpdatedAt(activeAlbum.id);
        });

        dom.entryGrid.appendChild(node);
    });
}

async function handleSaveAlbumSettings() {
    if (!activeAlbum || !isOwnerViewing) {
        return;
    }
    const visibility = dom.albumVisibilitySelect.value;
    await updateDoc(doc(db, "albums", activeAlbum.id), {
        visibility,
        updatedAt: serverTimestamp()
    });
    activeAlbum.visibility = visibility;
    dom.activeAlbumVisibility.textContent = visibility;
}

async function handleUploadPhotos(event) {
    if (!activeAlbum || !isOwnerViewing || !currentUser) {
        return;
    }
    const files = Array.from(event.target.files || []);
    if (!files.length) {
        return;
    }

    const existingEntries = await getDocs(collection(db, "albums", activeAlbum.id, "entries"));
    let orderIndex = existingEntries.size;

    for (const file of files) {
        const metadata = await extractMetadata(file);
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `users/${currentUser.uid}/albums/${activeAlbum.id}/${Date.now()}-${safeName}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        const photoUrl = await getDownloadURL(storageRef);

        await addDoc(collection(db, "albums", activeAlbum.id, "entries"), {
            ownerUid: currentUser.uid,
            photoUrl,
            storagePath,
            storyText: "",
            locationText: metadata.locationText,
            captureDate: metadata.captureDate,
            orderIndex: orderIndex++,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    }

    await touchAlbumUpdatedAt(activeAlbum.id);
    dom.photoUploadInput.value = "";
}

async function extractMetadata(file) {
    let captureDate = "";
    let locationText = "";
    try {
        const parsed = await exifr.parse(file, {
            gps: true,
            tiff: true,
            ifd0: true,
            exif: true
        });
        if (parsed?.DateTimeOriginal instanceof Date) {
            captureDate = parsed.DateTimeOriginal.toISOString().slice(0, 19).replace("T", " ");
        } else if (parsed?.CreateDate instanceof Date) {
            captureDate = parsed.CreateDate.toISOString().slice(0, 19).replace("T", " ");
        }
        if (typeof parsed?.latitude === "number" && typeof parsed?.longitude === "number") {
            locationText = `${parsed.latitude.toFixed(6)}, ${parsed.longitude.toFixed(6)}`;
        }
    } catch (_error) {
        // ignore parse errors and rely on filename fallback
    }

    if (!captureDate) {
        const match = file.name.match(/PXL_(\d{8})_(\d{6})/);
        if (match) {
            const day = match[1];
            const time = match[2];
            captureDate = `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)} ${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}`;
        }
    }

    return {
        captureDate: captureDate || "",
        locationText: locationText || ""
    };
}

async function touchAlbumUpdatedAt(albumId) {
    await updateDoc(doc(db, "albums", albumId), { updatedAt: serverTimestamp() });
}

function clearAlbumView() {
    activeAlbum = null;
    isOwnerViewing = false;
    if (unsubscribeEntries) {
        unsubscribeEntries();
        unsubscribeEntries = null;
    }
    dom.activeAlbumTitle.textContent = "Open an album";
    dom.activeAlbumVisibility.hidden = true;
    dom.albumControls.hidden = true;
    dom.entryGrid.innerHTML = "";
    dom.albumViewState.textContent = "Select an album to view entries, or open a shared public link.";
}

function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#39;");
}
