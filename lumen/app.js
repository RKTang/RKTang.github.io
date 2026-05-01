import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    linkWithPopup,
    signInWithPopup,
    signInAnonymously,
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
    guestSignInBtn: document.getElementById("guest-sign-in-btn"),
    linkAccountBtn: document.getElementById("link-account-btn"),
    signOutBtn: document.getElementById("sign-out-btn"),
    authStatus: document.getElementById("auth-status"),
    newAlbumForm: document.getElementById("new-album-form"),
    newAlbumTitle: document.getElementById("new-album-title"),
    albumListEmpty: document.getElementById("album-list-empty"),
    albumList: document.getElementById("album-list"),
    sharedSidebarSection: document.getElementById("shared-sidebar-section"),
    sharedListEmpty: document.getElementById("shared-list-empty"),
    sharedAlbumList: document.getElementById("shared-album-list"),
    activeAlbumTitle: document.getElementById("active-album-title"),
    activeAlbumOwner: document.getElementById("active-album-owner"),
    activeAlbumVisibility: document.getElementById("active-album-visibility"),
    albumControls: document.getElementById("album-controls"),
    albumVisibilitySelect: document.getElementById("album-visibility-select"),
    albumLocationDisplay: document.getElementById("album-location-display"),
    albumDateDisplay: document.getElementById("album-date-display"),
    albumEntrySort: document.getElementById("album-entry-sort"),
    albumBackgroundColor: document.getElementById("album-background-color"),
    albumViewerColumns: document.getElementById("album-viewer-columns"),
    albumSettingsDropdown: document.getElementById("album-settings-dropdown"),
    albumSettingsStatus: document.getElementById("album-settings-status"),
    copyShareUrlBtn: document.getElementById("copy-share-url"),
    photoDropZone: document.getElementById("photo-drop-zone"),
    photoSelectBtn: document.getElementById("photo-select-btn"),
    photoUploadInput: document.getElementById("photo-upload-input"),
    albumViewState: document.getElementById("album-view-state"),
    backToListBtn: document.getElementById("back-to-list-btn"),
    saveSharedBtn: document.getElementById("save-shared-btn"),
    ownerViewModeToggle: document.getElementById("owner-view-mode-toggle"),
    showViewerModeBtn: document.getElementById("show-viewer-mode"),
    showEditorModeBtn: document.getElementById("show-editor-mode"),
    viewerSectionTitle: document.getElementById("viewer-section-title"),
    editorSectionTitle: document.getElementById("editor-section-title"),
    entryGridViewer: document.getElementById("entry-grid-viewer"),
    ownerEditorSection: document.getElementById("owner-editor-section"),
    entryGridEditor: document.getElementById("entry-grid-editor"),
    entryEditorTemplate: document.getElementById("entry-editor-template"),
    viewerModal: document.getElementById("viewer-modal"),
    viewerModalCard: document.getElementById("viewer-modal-card"),
    viewerModalFlip: document.querySelector("#viewer-modal-card .modal-flip"),
    viewerModalTitle: document.getElementById("viewer-modal-title"),
    viewerModalBackTitle: document.getElementById("viewer-modal-back-title"),
    viewerModalImage: document.getElementById("viewer-modal-image"),
    viewerModalStory: document.getElementById("viewer-modal-story"),
    viewerModalLocation: document.getElementById("viewer-modal-location"),
    viewerModalDate: document.getElementById("viewer-modal-date")
};

let app = null;
let auth = null;
let db = null;
let storage = null;
let currentUser = null;
let activeAlbum = null;
let unsubscribeEntries = null;
let unsubscribeAlbums = null;
let unsubscribeSharedAlbums = null;
let isOwnerViewing = false;
let isGuestSignInAvailable = true;
let albumSettingsSaveTimer = null;
let albumSettingsStatusTimer = null;
const entryAutoSaveTimers = new Map();

if (!hasFirebaseConfig) {
    setAuthStatus("Firebase is not configured yet. Update lumen/firebase-config.js to start.", "error");
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
    dom.guestSignInBtn.addEventListener("click", handleGuestSignIn);
    dom.linkAccountBtn.addEventListener("click", handleLinkAccount);
    dom.signOutBtn.addEventListener("click", handleSignOut);
    dom.newAlbumForm.addEventListener("submit", handleCreateAlbum);
    dom.backToListBtn.addEventListener("click", handleBackToList);
    dom.saveSharedBtn.addEventListener("click", handleSaveSharedAlbum);
    dom.copyShareUrlBtn.addEventListener("click", handleCopyShareUrl);
    dom.photoUploadInput.addEventListener("change", handleUploadPhotos);
    dom.photoSelectBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        dom.photoUploadInput.click();
    });
    dom.photoDropZone.addEventListener("click", () => dom.photoUploadInput.click());
    dom.photoDropZone.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            dom.photoUploadInput.click();
        }
    });
    dom.photoDropZone.addEventListener("dragover", (event) => {
        event.preventDefault();
        dom.photoDropZone.classList.add("is-drag-over");
    });
    dom.photoDropZone.addEventListener("dragleave", () => {
        dom.photoDropZone.classList.remove("is-drag-over");
    });
    dom.photoDropZone.addEventListener("drop", (event) => {
        event.preventDefault();
        dom.photoDropZone.classList.remove("is-drag-over");
        const files = Array.from(event.dataTransfer?.files || []);
        if (!files.length) {
            return;
        }
        handleUploadPhotos({ target: { files } });
    });
    dom.albumVisibilitySelect.addEventListener("change", () => {
        setShareLinkVisibility(dom.albumVisibilitySelect.value, isOwnerViewing);
        queueAlbumSettingsAutoSave();
    });
    dom.albumLocationDisplay.addEventListener("change", () => {
        queueAlbumSettingsAutoSave();
    });
    dom.albumDateDisplay.addEventListener("change", () => {
        queueAlbumSettingsAutoSave();
    });
    dom.albumEntrySort.addEventListener("change", () => {
        if (activeAlbum?.id) {
            subscribeEntries(activeAlbum.id);
        }
        queueAlbumSettingsAutoSave();
    });
    dom.albumViewerColumns.addEventListener("change", () => {
        applyViewerColumns(dom.albumViewerColumns.value);
        queueAlbumSettingsAutoSave();
    });
    dom.albumBackgroundColor.addEventListener("input", handleAlbumBackgroundInput);
    dom.albumBackgroundColor.addEventListener("change", queueAlbumSettingsAutoSave);
    document.querySelectorAll(".album-bg-swatch").forEach((btn) => {
        btn.addEventListener("click", () => {
            const raw = btn.dataset.color;
            dom.albumBackgroundColor.value = normalizeColor(raw || "#f1ece4");
            handleAlbumBackgroundInput();
            queueAlbumSettingsAutoSave();
        });
    });
    dom.showViewerModeBtn.addEventListener("click", () => setOwnerViewMode("viewer"));
    dom.showEditorModeBtn.addEventListener("click", () => setOwnerViewMode("editor"));
    setupViewerModalInteractions();

    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        await ensureUserDoc(user);
        updateAuthUI();
        subscribeAlbumList();
        subscribeSharedAlbumList();
        await tryOpenAlbumFromUrl();
    });
}

async function handleSignIn() {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        const friendly = getAuthErrorMessage(error, "sign-in");
        if (friendly) {
            setAuthStatus(friendly.message, friendly.type);
        }
    }
}

async function handleSignOut() {
    await signOut(auth);
    clearAlbumView();
}

async function handleGuestSignIn() {
    try {
        await signInAnonymously(auth);
    } catch (error) {
        const code = error?.code || "";
        const anonDisabled =
            code === "auth/admin-restricted-operation" || code === "auth/operation-not-allowed";
        if (anonDisabled) {
            isGuestSignInAvailable = false;
            updateAuthUI();
            setAuthStatus("Guest mode is disabled in Firebase Auth. Use Google sign-in.", "error");
            return;
        }
        const friendly = getAuthErrorMessage(error, "guest-sign-in");
        if (friendly) {
            setAuthStatus(friendly.message, friendly.type);
        }
    }
}

async function handleLinkAccount() {
    if (!currentUser || !currentUser.isAnonymous) {
        return;
    }
    const provider = new GoogleAuthProvider();
    try {
        await linkWithPopup(currentUser, provider);
        const linkedUser = auth.currentUser || currentUser;
        const preferredName = getPreferredOwnerDisplayName(linkedUser);
        if (preferredName) {
            await backfillOwnerDisplayName(linkedUser.uid, preferredName);
        }
        setAuthStatus("Guest account linked to Google.", "success");
    } catch (error) {
        const friendly = getAuthErrorMessage(error, "link-account");
        if (friendly) {
            setAuthStatus(friendly.message, friendly.type);
        }
    }
}

function setAuthStatus(message, type = "info") {
    dom.authStatus.textContent = message;
    dom.authStatus.classList.remove("is-error", "is-success", "is-info");
    dom.authStatus.classList.add(
        type === "error" ? "is-error" : type === "success" ? "is-success" : "is-info"
    );
}

function getAuthErrorMessage(error, action) {
    const code = error?.code || "";
    if (code === "auth/popup-closed-by-user") {
        if (action === "link-account") {
            return { message: "Link account canceled.", type: "info" };
        }
        return { message: "Sign-in canceled.", type: "info" };
    }
    if (code === "auth/popup-blocked") {
        return { message: "Popup blocked by browser. Allow popups and try again.", type: "error" };
    }
    if (code === "auth/network-request-failed") {
        return { message: "Network error. Check your connection and try again.", type: "error" };
    }
    return { message: `Authentication failed. ${error?.message || "Please try again."}`, type: "error" };
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

function getPreferredOwnerDisplayName(user) {
    const best = toDisplayText(user?.displayName || user?.email, "").trim();
    if (best) {
        return best;
    }
    if (user?.isAnonymous) {
        return "Guest";
    }
    return "";
}

async function backfillOwnerDisplayName(ownerUid, ownerDisplayName) {
    if (!ownerUid || !ownerDisplayName) {
        return;
    }
    const ownerAlbums = await getDocs(query(collection(db, "albums"), where("ownerUid", "==", ownerUid)));
    await Promise.all(
        ownerAlbums.docs.map(async (albumDoc) => {
            const data = albumDoc.data() || {};
            const existing = toDisplayText(data.ownerDisplayName, "").trim();
            if (existing === ownerDisplayName) {
                return;
            }
            await updateDoc(doc(db, "albums", albumDoc.id), { ownerDisplayName });
        })
    );
}

function updateAuthUI() {
    const loggedIn = Boolean(currentUser);
    const isGuest = Boolean(currentUser?.isAnonymous);
    dom.signInBtn.hidden = loggedIn;
    dom.guestSignInBtn.hidden = loggedIn || !isGuestSignInAvailable;
    dom.linkAccountBtn.hidden = !isGuest;
    dom.signOutBtn.hidden = !loggedIn;
    dom.newAlbumForm.hidden = !loggedIn;
    if (!loggedIn) {
        setAuthStatus(
            isGuestSignInAvailable
                ? "Sign in with Google or continue as guest to create albums."
                : "Sign in with Google to create albums.",
            "info"
        );
        return;
    }

    if (isGuest) {
        setAuthStatus("Signed in as Guest. Link account to keep long-term access.", "info");
        return;
    }

    setAuthStatus(`Signed in as ${currentUser.displayName || currentUser.email}`, "success");
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
    } else {
        dom.albumListEmpty.hidden = false;
    }

    unsubscribeAlbums = () => watchers.forEach((fn) => fn());
}

function subscribeSharedAlbumList() {
    if (unsubscribeSharedAlbums) {
        unsubscribeSharedAlbums();
        unsubscribeSharedAlbums = null;
    }
    dom.sharedAlbumList.innerHTML = "";
    dom.sharedListEmpty.hidden = false;
    dom.sharedSidebarSection.hidden = !currentUser;
    if (!currentUser) {
        return;
    }
    const sharedRef = collection(db, "users", currentUser.uid, "sharedAlbums");
    unsubscribeSharedAlbums = onSnapshot(sharedRef, async (snapshot) => {
        const docs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        await renderSharedAlbumList(docs);
    });
}

const albumMap = new Map();

function iconSvgLock() {
    return `<svg class="icon-svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V11a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm-3 8V6a3 3 0 016 0v3H9z"/></svg>`;
}

function iconSvgGlobe() {
    return `<svg class="icon-svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1 2.05h2V6h-2V4.05zM4.5 10h2.06a12.9 12.9 0 000 4H4.5a8.04 8.04 0 010-4zm3.07 0h4.86v4H7.57a10.9 10.9 0 010-4zm4.86-2H7.57a8.04 8.04 0 011.58-2.8A10.9 10.9 0 0112.43 8zm2 0V5.2A10.9 10.9 0 0116.86 8h-2.43zm2.43 0h2.06a8.04 8.04 0 010 4h-2.06a12.9 12.9 0 000-4zm0 6a8.04 8.04 0 01-2.07 4H18a8.04 8.04 0 002-4zm-4.5 4h-2.43v2.8a10.9 10.9 0 012.43-2.8zm-2 0H9.15a10.9 10.9 0 012.43 2.8V16zm-2.43-2H6.5a8.04 8.04 0 01-1.58-2.8h2.43a12.9 12.9 0 000 2.8zm5.43 0h2.43a12.9 12.9 0 000-2.8h2.43A8.04 8.04 0 0116.86 14h-2.43z"/></svg>`;
}

function iconSvgTrash() {
    return `<svg class="icon-svg" viewBox="0 0 448 512" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M170.5 51.6L151.5 80H40c-22.1 0-40 17.9-40 40s17.9 40 40 40h16l21.2 339.4c1.3 20.6 18.4 36.6 39 36.6h215.6c20.6 0 37.7-16 39-36.6L392 160h16c22.1 0 40-17.9 40-40s-17.9-40-40-40H296.5l-19-28.4C269.9 40.3 257.2 32 243.6 32h-39.1c-13.6 0-26.3 8.3-34 19.6zM177.9 467c-10.7-.4-19.1-9.4-18.7-20.1l8-208c.4-10.7 9.4-19.1 20.1-18.7s19.1 9.4 18.7 20.1l-8 208c-.4 10.5-9 18.7-19.5 18.7zm92.2-208l8 208c.4 10.7-8 19.7-18.7 20.1-10.5 0-19.1-8.2-19.5-18.7l-8-208c-.4-10.7 8-19.7 18.7-20.1s19.7 8 20.1 18.7z"/></svg>`;
}

function visibilityIconMarkup(visibility) {
    const isPublic = (visibility || "private").toLowerCase() === "public";
    const label = isPublic ? "Public album" : "Private album";
    const svg = isPublic ? iconSvgGlobe() : iconSvgLock();
    return `<span class="album-visibility-icon" title="${label}" aria-label="${label}">${svg}</span>`;
}

function setActiveAlbumVisibilityPill(visibility) {
    const isPublic = (visibility || "private").toLowerCase() === "public";
    dom.activeAlbumVisibility.innerHTML = visibilityIconMarkup(visibility);
    dom.activeAlbumVisibility.setAttribute("aria-label", isPublic ? "Public album" : "Private album");
}

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
        const card = document.createElement("li");
        card.className = "album-item";
        if (activeAlbum?.id === album.id) {
            card.classList.add("active");
        }
        const owned = currentUser && album.ownerUid === currentUser.uid;
        const rawTitle = album.title || "Untitled album";
        const titleHtml = escapeHtml(rawTitle);
        const visHtml = visibilityIconMarkup(album.visibility);
        const deleteLabel = escapeHtml(`Delete album ${rawTitle}`);
        const deleteBtnHtml = owned
            ? `<button type="button" class="album-item-delete" aria-label="${deleteLabel}" title="Delete album">${iconSvgTrash()}</button>`
            : "";
        card.innerHTML = `
            <div class="album-item-inner">
                <button type="button" class="album-item-open">
                    <span class="album-item-text">
                        <span class="album-item-title-row">
                            <span class="album-item-title">${titleHtml}</span>
                            ${visHtml}
                        </span>
                    </span>
                </button>
                ${deleteBtnHtml}
            </div>
        `;
        card.querySelector(".album-item-open").addEventListener("click", () => openAlbum(album.id));
        const del = card.querySelector(".album-item-delete");
        if (del) {
            del.addEventListener("click", (event) => {
                event.stopPropagation();
                handleDeleteAlbum(album.id);
            });
        }
        dom.albumList.appendChild(card);
    });
}

async function renderSharedAlbumList(sharedItems) {
    dom.sharedAlbumList.innerHTML = "";
    if (!sharedItems.length) {
        dom.sharedListEmpty.hidden = false;
        return;
    }
    const loadedAlbums = await Promise.all(
        sharedItems.map(async (item) => {
            try {
                const snap = await getDoc(doc(db, "albums", item.albumId || item.id));
                if (!snap.exists()) {
                    return null;
                }
                const data = snap.data() || {};
                return { id: snap.id, ...data };
            } catch (_error) {
                return null;
            }
        })
    );
    const albums = loadedAlbums.filter(Boolean);
    dom.sharedListEmpty.hidden = albums.length > 0;
    albums.forEach((album) => {
        const card = document.createElement("li");
        card.className = "album-item";
        if (activeAlbum?.id === album.id) {
            card.classList.add("active");
        }
        const titleHtml = escapeHtml(album.title || "Untitled album");
        const visHtml = visibilityIconMarkup(album.visibility);
        card.innerHTML = `
            <div class="album-item-inner">
                <button type="button" class="album-item-open">
                    <span class="album-item-text">
                        <span class="album-item-title-row">
                            <span class="album-item-title">${titleHtml}</span>
                            ${visHtml}
                        </span>
                    </span>
                </button>
            </div>
        `;
        card.querySelector(".album-item-open").addEventListener("click", () => openAlbum(album.id));
        dom.sharedAlbumList.appendChild(card);
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
    const albumRef = await addDoc(collection(db, "albums"), {
        ownerUid: currentUser.uid,
        ownerDisplayName: currentUser.displayName || currentUser.email || "",
        title,
        visibility: "private",
        viewerColumns: 3,
        locationDisplayMode: "city-state",
        dateDisplayMode: "date-time",
        entrySortMode: "latest-first",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    dom.newAlbumForm.reset();
    await openAlbum(albumRef.id);
}

function handleAlbumBackgroundInput() {
    updateAlbumBgSwatchSelection();
    if (activeAlbum && isOwnerViewing) {
        applyAlbumBackground(dom.albumBackgroundColor.value);
    }
}

function updateAlbumBgSwatchSelection() {
    const current = normalizeColor(dom.albumBackgroundColor.value || "#f1ece4").toLowerCase();
    document.querySelectorAll(".album-bg-swatch").forEach((btn) => {
        const hex = normalizeColor(btn.dataset.color || "").toLowerCase();
        btn.classList.toggle("is-selected", hex === current);
        btn.setAttribute("aria-pressed", hex === current ? "true" : "false");
    });
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
    document.body.classList.toggle("viewer-only", !isOwnerViewing);
    dom.backToListBtn.hidden = false;
    dom.saveSharedBtn.hidden = !currentUser || isOwnerViewing;

    const ownerName = await resolveAlbumOwnerName(album, isOwner);
    if (isOwner) {
        const existingOwnerLabel = toDisplayText(album.ownerDisplayName, "").trim();
        const normalizedOwnerLabel = toDisplayText(ownerName, "").trim();
        if (normalizedOwnerLabel && existingOwnerLabel !== normalizedOwnerLabel) {
            updateDoc(doc(db, "albums", album.id), { ownerDisplayName: normalizedOwnerLabel }).catch(() => {});
            album.ownerDisplayName = normalizedOwnerLabel;
        }
    }
    dom.activeAlbumTitle.textContent = album.title || "Untitled album";
    dom.activeAlbumOwner.hidden = false;
    dom.activeAlbumOwner.textContent = `By ${ownerName}`;
    dom.activeAlbumVisibility.hidden = false;
    setActiveAlbumVisibilityPill(album.visibility);
    dom.albumViewState.textContent = "";
    dom.albumControls.hidden = !isOwnerViewing;
    dom.ownerEditorSection.hidden = !isOwnerViewing;
    dom.ownerViewModeToggle.hidden = !isOwnerViewing;
    if (isOwnerViewing) {
        setOwnerViewMode("editor");
        if (dom.albumSettingsDropdown) {
            dom.albumSettingsDropdown.open = true;
        }
    } else {
        document.body.classList.remove("owner-mode-editor", "owner-mode-viewer");
    }
    dom.albumVisibilitySelect.value = album.visibility || "private";
    dom.albumLocationDisplay.value = album.locationDisplayMode || "city-state";
    dom.albumDateDisplay.value = album.dateDisplayMode || "date-time";
    dom.albumEntrySort.value = album.entrySortMode || "latest-first";
    dom.albumBackgroundColor.value = normalizeColor(album.pageBackground || "#f1ece4");
    updateAlbumBgSwatchSelection();
    dom.albumViewerColumns.value = String(normalizeViewerColumns(album.viewerColumns));
    const shareUrl = `${window.location.origin}${window.location.pathname}?album=${album.id}`;
    dom.copyShareUrlBtn.dataset.url = shareUrl;
    setShareLinkVisibility(album.visibility || "private", isOwnerViewing);
    applyAlbumBackground(album.pageBackground);
    applyViewerColumns(album.viewerColumns);
    history.replaceState(null, "", `?album=${album.id}`);

    subscribeEntries(album.id);
    subscribeAlbumList();
    subscribeSharedAlbumList();
}

async function handleSaveSharedAlbum() {
    if (!currentUser || !activeAlbum || isOwnerViewing) {
        return;
    }
    await setDoc(
        doc(db, "users", currentUser.uid, "sharedAlbums", activeAlbum.id),
        {
            albumId: activeAlbum.id,
            title: activeAlbum.title || "Untitled album",
            savedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        },
        { merge: true }
    );
    dom.saveSharedBtn.textContent = "Saved";
    setTimeout(() => {
        if (dom.saveSharedBtn) {
            dom.saveSharedBtn.textContent = "Save to shared";
        }
    }, 1000);
}

function handleBackToList() {
    clearAlbumView();
    history.replaceState(null, "", window.location.pathname);
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
    const sortMode = activeAlbum?.entrySortMode || "latest-first";
    const sortedEntries = sortEntriesForViewer(entries, sortMode);
    dom.entryGridViewer.innerHTML = "";
    dom.entryGridEditor.innerHTML = "";
    if (!sortedEntries.length) {
        dom.albumViewState.textContent = isOwnerViewing
            ? "No photos yet. Upload one or more images to start this album."
            : "No photos in this album yet.";
    } else {
        dom.albumViewState.textContent = "";
    }

    sortedEntries.forEach((entry, index) => {
        const storyText = toDisplayText(entry.storyText, "");
        const locationText = toDisplayText(entry.locationText, "");
        const locationCoords = toDisplayText(entry.locationCoords, "");
        const locationCityState = toDisplayText(entry.locationCityState, "");
        const captureDate = toDisplayText(entry.captureDate, "");
        const locationMode = activeAlbum?.locationDisplayMode || "city-state";
        const dateMode = activeAlbum?.dateDisplayMode || "date-time";
        const formattedLocation = formatLocationForDisplay(
            locationText || "Not set",
            locationCoords,
            locationCityState,
            locationMode
        );
        const formattedDate = formatCaptureDateForDisplay(captureDate || "Not set", dateMode);

        const viewerNode = document.createElement("button");
        viewerNode.type = "button";
        viewerNode.className = "polaroid-card";
        viewerNode.dataset.fullSrc = entry.photoUrl;
        viewerNode.dataset.alt = storyText ? `Album entry: ${storyText}` : "Album entry";
        const albumTitle = activeAlbum?.title || "Untitled album";
        viewerNode.dataset.title = `${albumTitle} - Journal Entry ${index + 1}`;
        viewerNode.dataset.story = storyText || "No story yet.";
        viewerNode.dataset.location = locationText || "Not set";
        viewerNode.dataset.locationCoords = locationCoords || "";
        viewerNode.dataset.locationCityState = locationCityState || "";
        viewerNode.dataset.date = captureDate || "Not set";
        viewerNode.innerHTML = `<img src="${escapeHtml(entry.photoUrl)}" alt="${escapeHtml(viewerNode.dataset.alt)}">`;
        dom.entryGridViewer.appendChild(viewerNode);

        if (!isOwnerViewing) {
            return;
        }

        const node = dom.entryEditorTemplate.content.firstElementChild.cloneNode(true);
        const img = node.querySelector(".entry-editor-image");
        const storyEl = node.querySelector(".entry-story");
        const locEl = node.querySelector(".entry-location");
        const dateEl = node.querySelector(".entry-date");
        const saveBtn = node.querySelector(".entry-save");
        const delBtn = node.querySelector(".entry-delete");
        delBtn.innerHTML = iconSvgTrash();

        img.src = entry.photoUrl;
        img.alt = storyText ? `Album entry: ${storyText}` : "Album entry";
        storyEl.value = storyText;
        locEl.value = formattedLocation === "Not set" ? "" : formattedLocation;
        dateEl.value = formattedDate === "Not set" ? "" : formattedDate;

        const saveEntryChanges = async () => {
            await updateDoc(doc(db, "albums", activeAlbum.id, "entries", entry.id), {
                storyText: storyEl.value.trim(),
                locationText: locEl.value.trim(),
                captureDate: dateEl.value.trim(),
                updatedAt: serverTimestamp()
            });
            await touchAlbumUpdatedAt(activeAlbum.id);
            saveBtn.textContent = "Saved";
            setTimeout(() => {
                if (saveBtn.isConnected) {
                    saveBtn.textContent = "Save";
                }
            }, 900);
        };

        const queueEntryAutoSave = () => {
            const existingTimer = entryAutoSaveTimers.get(entry.id);
            if (existingTimer) {
                clearTimeout(existingTimer);
            }
            saveBtn.textContent = "Saving...";
            const timer = setTimeout(async () => {
                entryAutoSaveTimers.delete(entry.id);
                try {
                    await saveEntryChanges();
                } catch (_error) {
                    saveBtn.textContent = "Save";
                }
            }, 450);
            entryAutoSaveTimers.set(entry.id, timer);
        };

        saveBtn.addEventListener("click", saveEntryChanges);
        storyEl.addEventListener("input", queueEntryAutoSave);
        locEl.addEventListener("input", queueEntryAutoSave);
        dateEl.addEventListener("input", queueEntryAutoSave);

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

        dom.entryGridEditor.appendChild(node);
    });
}

function setupViewerModalInteractions() {
    if (!dom.entryGridViewer || !dom.viewerModal || !dom.viewerModalCard || !dom.viewerModalImage) {
        return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    dom.entryGridViewer.addEventListener("click", (event) => {
        const card = event.target.closest(".polaroid-card");
        if (!card) {
            return;
        }
        openViewerCard(card);
    });

    if (dom.viewerModalFlip) {
        dom.viewerModalFlip.addEventListener("click", (event) => {
            if (!dom.viewerModal.open) {
                return;
            }
            event.stopPropagation();
            dom.viewerModalCard.style.setProperty("--card-tilt-x", "0deg");
            dom.viewerModalCard.style.setProperty("--card-tilt-y", "0deg");
            dom.viewerModalCard.style.setProperty("--card-move-x", "0px");
            dom.viewerModalCard.style.setProperty("--card-move-y", "0px");
            dom.viewerModalCard.classList.toggle("is-flipped");
        });
    }

    if (!prefersReducedMotion) {
        dom.viewerModal.addEventListener("pointermove", (event) => {
            if (!dom.viewerModal.open) {
                return;
            }
            const bounds = dom.viewerModalCard.getBoundingClientRect();
            const x = event.clientX - bounds.left;
            const y = event.clientY - bounds.top;
            const xRatio = Math.min(1, Math.max(0, x / bounds.width));
            const yRatio = Math.min(1, Math.max(0, y / bounds.height));
            const tiltY = (xRatio - 0.5) * 12;
            const tiltX = (0.5 - yRatio) * 12;
            const moveX = (xRatio - 0.5) * 6;
            const moveY = (yRatio - 0.5) * 4;
            const sheenAngle = 110 + (xRatio - 0.5) * 40 - (yRatio - 0.5) * 12;

            dom.viewerModalCard.style.setProperty("--card-tilt-x", `${tiltX.toFixed(2)}deg`);
            dom.viewerModalCard.style.setProperty("--card-tilt-y", `${tiltY.toFixed(2)}deg`);
            dom.viewerModalCard.style.setProperty("--card-move-x", `${moveX.toFixed(2)}px`);
            dom.viewerModalCard.style.setProperty("--card-move-y", `${moveY.toFixed(2)}px`);
            dom.viewerModalCard.style.setProperty("--sheen-angle", `${sheenAngle.toFixed(2)}deg`);
        });

        dom.viewerModal.addEventListener("pointerleave", () => {
            if (!dom.viewerModal.open) {
                return;
            }
            resetViewerModalCard();
        });
    }

    dom.viewerModal.addEventListener("click", (event) => {
        if (event.target === dom.viewerModal) {
            dom.viewerModal.close();
        }
    });

    dom.viewerModal.addEventListener("close", () => {
        document.body.classList.remove("modal-open");
        resetViewerModalCard();
    });
}

function openViewerCard(card) {
    if (!dom.viewerModal || !dom.viewerModalCard || !dom.viewerModalImage) {
        return;
    }
    const thumbImage = card.querySelector("img");
    const fullSrc = card.dataset.fullSrc;
    if (!fullSrc) {
        return;
    }

    dom.viewerModalTitle.textContent = card.dataset.title || "Lumen Journal Entry";
    dom.viewerModalBackTitle.textContent = card.dataset.title || "Lumen Journal Entry";
    const locationMode = activeAlbum?.locationDisplayMode || "city-state";
    const dateMode = activeAlbum?.dateDisplayMode || "date-time";
    const formattedLocation = formatLocationForDisplay(
        card.dataset.location || "Not set",
        card.dataset.locationCoords || "",
        card.dataset.locationCityState || "",
        locationMode
    );
    const formattedDate = formatCaptureDateForDisplay(card.dataset.date || "Not set", dateMode);
    dom.viewerModalStory.textContent = `Story: ${card.dataset.story || "No story yet."}`;
    dom.viewerModalLocation.textContent = `Location: ${formattedLocation}`;
    dom.viewerModalDate.textContent = `Date: ${formattedDate}`;
    dom.viewerModalImage.src = fullSrc;
    dom.viewerModalImage.alt = card.dataset.alt || "Journal entry image";
    dom.viewerModalCard.classList.remove("is-flipped");

    if (dom.viewerModalFlip && thumbImage && thumbImage.naturalWidth && thumbImage.naturalHeight) {
        dom.viewerModalFlip.style.setProperty("--photo-ratio", `${thumbImage.naturalWidth} / ${thumbImage.naturalHeight}`);
        dom.viewerModalFlip.style.setProperty("--photo-ratio-num", `${thumbImage.naturalWidth / thumbImage.naturalHeight}`);
    }

    const applyPhotoRatio = () => {
        if (!dom.viewerModalFlip || !dom.viewerModalImage.naturalWidth || !dom.viewerModalImage.naturalHeight) {
            return;
        }
        dom.viewerModalFlip.style.setProperty("--photo-ratio", `${dom.viewerModalImage.naturalWidth} / ${dom.viewerModalImage.naturalHeight}`);
        dom.viewerModalFlip.style.setProperty("--photo-ratio-num", `${dom.viewerModalImage.naturalWidth / dom.viewerModalImage.naturalHeight}`);
    };
    if (dom.viewerModalImage.complete) {
        applyPhotoRatio();
    } else {
        dom.viewerModalImage.addEventListener("load", applyPhotoRatio, { once: true });
    }

    dom.viewerModal.showModal();
    document.body.classList.add("modal-open");
}

function resetViewerModalCard() {
    if (!dom.viewerModalCard) {
        return;
    }
    dom.viewerModalCard.classList.remove("is-flipped");
    dom.viewerModalCard.style.setProperty("--card-tilt-x", "0deg");
    dom.viewerModalCard.style.setProperty("--card-tilt-y", "0deg");
    dom.viewerModalCard.style.setProperty("--card-move-x", "0px");
    dom.viewerModalCard.style.setProperty("--card-move-y", "0px");
    dom.viewerModalCard.style.setProperty("--sheen-angle", "130deg");
}

async function handleSaveAlbumSettings() {
    if (!activeAlbum || !isOwnerViewing) {
        return;
    }
    const visibility = dom.albumVisibilitySelect.value;
    const locationDisplayMode = dom.albumLocationDisplay.value;
    const dateDisplayMode = dom.albumDateDisplay.value;
    const entrySortMode = dom.albumEntrySort.value;
    const pageBackground = normalizeColor(dom.albumBackgroundColor.value || "#f1ece4");
    const viewerColumns = normalizeViewerColumns(dom.albumViewerColumns.value);
    await updateDoc(doc(db, "albums", activeAlbum.id), {
        visibility,
        locationDisplayMode,
        dateDisplayMode,
        entrySortMode,
        pageBackground,
        viewerColumns,
        updatedAt: serverTimestamp()
    });
    activeAlbum.visibility = visibility;
    activeAlbum.locationDisplayMode = locationDisplayMode;
    activeAlbum.dateDisplayMode = dateDisplayMode;
    activeAlbum.entrySortMode = entrySortMode;
    activeAlbum.pageBackground = pageBackground;
    activeAlbum.viewerColumns = viewerColumns;
    setActiveAlbumVisibilityPill(visibility);
    setShareLinkVisibility(visibility, isOwnerViewing);
    applyAlbumBackground(pageBackground);
    applyViewerColumns(viewerColumns);
    if (unsubscribeEntries && activeAlbum?.id) {
        subscribeEntries(activeAlbum.id);
    }
}

function queueAlbumSettingsAutoSave() {
    if (!activeAlbum || !isOwnerViewing) {
        return;
    }
    if (albumSettingsSaveTimer) {
        clearTimeout(albumSettingsSaveTimer);
    }
    albumSettingsSaveTimer = setTimeout(async () => {
        albumSettingsSaveTimer = null;
        await handleSaveAlbumSettings();
        showAlbumSettingsSavedStatus();
    }, 350);
}

function showAlbumSettingsSavedStatus() {
    if (!dom.albumSettingsStatus) {
        return;
    }
    dom.albumSettingsStatus.textContent = "Changes saved";
    dom.albumSettingsStatus.classList.add("is-visible");
    if (albumSettingsStatusTimer) {
        clearTimeout(albumSettingsStatusTimer);
    }
    albumSettingsStatusTimer = setTimeout(() => {
        dom.albumSettingsStatus.classList.remove("is-visible");
        dom.albumSettingsStatus.textContent = "";
        albumSettingsStatusTimer = null;
    }, 1400);
}

async function handleDeleteAlbum(albumId) {
    const targetId = albumId || activeAlbum?.id;
    if (!currentUser || !targetId) {
        return;
    }
    const albumRef = doc(db, "albums", targetId);
    const albumSnap = await getDoc(albumRef);
    if (!albumSnap.exists()) {
        return;
    }
    const albumData = albumSnap.data();
    if (albumData.ownerUid !== currentUser.uid) {
        return;
    }
    const albumTitle = albumData.title || "this album";
    if (!confirm(`Delete ${albumTitle}? This permanently removes all photos and entries.`)) {
        return;
    }

    const albumIdResolved = albumSnap.id;
    const entriesRef = collection(db, "albums", albumIdResolved, "entries");
    const entriesSnap = await getDocs(entriesRef);
    for (const entryDoc of entriesSnap.docs) {
        const entry = entryDoc.data() || {};
        if (entry.storagePath) {
            try {
                await deleteObject(ref(storage, entry.storagePath));
            } catch (_error) {
                // continue cleanup even when storage object is already missing
            }
        }
        await deleteDoc(doc(db, "albums", albumIdResolved, "entries", entryDoc.id));
    }

    await deleteDoc(doc(db, "albums", albumIdResolved));
    if (activeAlbum?.id === albumIdResolved) {
        clearAlbumView();
        history.replaceState(null, "", window.location.pathname);
    }
    subscribeAlbumList();
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
            locationCoords: metadata.locationCoords,
            locationCityState: metadata.locationCityState,
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
    let locationCoords = "";
    let locationCityState = "";
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
            const lat = parsed.latitude;
            const lon = parsed.longitude;
            locationCoords = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
            locationText = locationCoords;
            locationCityState = await reverseGeocodeCityState(lat, lon);
            if (locationCityState) {
                locationText = locationCityState;
            }
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
        locationText: locationText || "",
        locationCoords: locationCoords || "",
        locationCityState: locationCityState || ""
    };
}

async function touchAlbumUpdatedAt(albumId) {
    await updateDoc(doc(db, "albums", albumId), { updatedAt: serverTimestamp() });
}

function clearAlbumView() {
    activeAlbum = null;
    isOwnerViewing = false;
    if (albumSettingsSaveTimer) {
        clearTimeout(albumSettingsSaveTimer);
        albumSettingsSaveTimer = null;
    }
    if (albumSettingsStatusTimer) {
        clearTimeout(albumSettingsStatusTimer);
        albumSettingsStatusTimer = null;
    }
    if (dom.albumSettingsStatus) {
        dom.albumSettingsStatus.classList.remove("is-visible");
        dom.albumSettingsStatus.textContent = "";
    }
    if (unsubscribeEntries) {
        unsubscribeEntries();
        unsubscribeEntries = null;
    }
    for (const timer of entryAutoSaveTimers.values()) {
        clearTimeout(timer);
    }
    entryAutoSaveTimers.clear();
    dom.activeAlbumTitle.textContent = "Open an album";
    dom.activeAlbumOwner.hidden = true;
    dom.activeAlbumOwner.textContent = "";
    dom.activeAlbumVisibility.hidden = true;
    dom.activeAlbumVisibility.textContent = "";
    dom.activeAlbumVisibility.innerHTML = "";
    dom.albumControls.hidden = true;
    dom.ownerViewModeToggle.hidden = true;
    dom.backToListBtn.hidden = true;
    dom.saveSharedBtn.hidden = true;
    dom.saveSharedBtn.textContent = "Save to shared";
    dom.ownerEditorSection.hidden = true;
    dom.entryGridViewer.innerHTML = "";
    dom.entryGridEditor.innerHTML = "";
    document.body.classList.remove("viewer-only");
    document.body.classList.remove("owner-mode-editor", "owner-mode-viewer");
    if (dom.albumSettingsDropdown) {
        dom.albumSettingsDropdown.open = true;
    }
    dom.albumViewState.textContent = "Select an album to view entries, or open a shared public link.";
    applyAlbumBackground("");
    applyViewerColumns(3);
    dom.copyShareUrlBtn.dataset.url = "";
    setShareLinkVisibility("private", false);
    if (dom.albumLocationDisplay) {
        dom.albumLocationDisplay.value = "city-state";
    }
    if (dom.albumDateDisplay) {
        dom.albumDateDisplay.value = "date-time";
    }
    if (dom.albumEntrySort) {
        dom.albumEntrySort.value = "latest-first";
    }
}

function setShareLinkVisibility(visibility, isOwner) {
    const canShowShare = isOwner && visibility === "public";
    dom.copyShareUrlBtn.hidden = !canShowShare;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#39;");
}

function toDisplayText(value, fallback = "") {
    if (value === null || value === undefined) {
        return fallback;
    }
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    if (value instanceof Date) {
        return value.toISOString().slice(0, 19).replace("T", " ");
    }
    if (typeof value === "object" && typeof value.toDate === "function") {
        const date = value.toDate();
        if (date instanceof Date && !Number.isNaN(date.getTime())) {
            return date.toISOString().slice(0, 19).replace("T", " ");
        }
    }
    return fallback;
}

function looksLikeGpsCoordinate(value) {
    if (typeof value !== "string") {
        return false;
    }
    return /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(value.trim());
}

function formatLocationForDisplay(rawLocation, rawCoords, rawCityState, mode) {
    const value = toDisplayText(rawLocation, "Not set").trim();
    const coordsValue = toDisplayText(rawCoords, "").trim();
    const cityStateValue = toDisplayText(rawCityState, "").trim();
    if (!value) {
        return "Not set";
    }
    if (mode !== "city-state") {
        if (coordsValue) {
            return coordsValue;
        }
        return value;
    }
    if (cityStateValue) {
        return cityStateValue;
    }
    if (looksLikeGpsCoordinate(value) || looksLikeGpsCoordinate(coordsValue)) {
        return "City / state not available";
    }
    const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
        return `${parts[0]}, ${parts[1]}`;
    }
    return value;
}

async function reverseGeocodeCityState(latitude, longitude) {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return "";
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    try {
        const url = new URL("https://nominatim.openstreetmap.org/reverse");
        url.searchParams.set("format", "jsonv2");
        url.searchParams.set("lat", String(latitude));
        url.searchParams.set("lon", String(longitude));
        url.searchParams.set("zoom", "10");
        url.searchParams.set("addressdetails", "1");
        const response = await fetch(url.toString(), {
            headers: {
                Accept: "application/json"
            },
            signal: controller.signal
        });
        if (!response.ok) {
            return "";
        }
        const payload = await response.json();
        const address = payload?.address || {};
        const city = toDisplayText(
            address.city || address.town || address.village || address.hamlet || address.municipality,
            ""
        ).trim();
        const state = toDisplayText(address.state || address.region || address.state_district, "").trim();
        if (city && state) {
            return `${city}, ${state}`;
        }
        return city || state || "";
    } catch (_error) {
        return "";
    } finally {
        clearTimeout(timeoutId);
    }
}

function formatCaptureDateForDisplay(rawDate, mode) {
    const value = toDisplayText(rawDate, "Not set").trim();
    if (!value) {
        return "Not set";
    }
    if (mode !== "date-only") {
        return value;
    }
    const isoLikeMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoLikeMatch) {
        return isoLikeMatch[1];
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
    }
    const token = value.split(" ")[0];
    return token || value;
}

function getEntrySortTimestamp(entry) {
    const captureRaw = toDisplayText(entry?.captureDate, "").trim();
    if (captureRaw) {
        const normalized = captureRaw.includes("T") ? captureRaw : captureRaw.replace(" ", "T");
        const parsedMs = Date.parse(normalized);
        if (Number.isFinite(parsedMs)) {
            return parsedMs;
        }
    }
    const createdAtSeconds = entry?.createdAt?.seconds;
    if (Number.isFinite(createdAtSeconds)) {
        return createdAtSeconds * 1000;
    }
    return Number(entry?.orderIndex) || 0;
}

function sortEntriesForViewer(entries, mode) {
    const normalizedMode = mode === "earliest-first" ? "earliest-first" : "latest-first";
    const sorted = [...entries].sort((a, b) => {
        const tsA = getEntrySortTimestamp(a);
        const tsB = getEntrySortTimestamp(b);
        if (tsA === tsB) {
            const orderA = Number(a?.orderIndex) || 0;
            const orderB = Number(b?.orderIndex) || 0;
            return orderA - orderB;
        }
        return normalizedMode === "earliest-first" ? tsA - tsB : tsB - tsA;
    });
    return sorted;
}

function applyAlbumBackground(color) {
    const normalized = normalizeColor(color || "#f1ece4");
    document.body.style.background = normalized;
}

function normalizeColor(value) {
    if (typeof value !== "string") {
        return "#f1ece4";
    }
    const trimmed = value.trim();
    return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : "#f1ece4";
}

function normalizeViewerColumns(value) {
    const num = Number.parseInt(value, 10);
    if (!Number.isFinite(num)) {
        return 3;
    }
    return Math.min(5, Math.max(1, num));
}

function applyViewerColumns(value) {
    if (!dom.entryGridViewer) {
        return;
    }
    const cols = normalizeViewerColumns(value);
    dom.entryGridViewer.style.setProperty("--viewer-columns", String(cols));
}

async function resolveAlbumOwnerName(album, isOwner) {
    const inlineName = toDisplayText(album?.ownerDisplayName, "").trim();
    if (inlineName) {
        return inlineName;
    }

    if (isOwner && currentUser) {
        const selfName = getPreferredOwnerDisplayName(currentUser);
        if (selfName) {
            return selfName;
        }
    }

    if (album?.ownerUid) {
        try {
            const ownerSnap = await getDoc(doc(db, "users", album.ownerUid));
            if (ownerSnap.exists()) {
                const ownerData = ownerSnap.data() || {};
                const fetchedName = toDisplayText(ownerData.displayName || ownerData.email, "").trim();
                if (fetchedName) {
                    return fetchedName;
                }
            }
        } catch (_error) {
            // fall back below when owner lookup is unavailable
        }
    }

    return "Album owner";
}

function setOwnerViewMode(mode) {
    const normalized = mode === "editor" ? "editor" : "viewer";
    document.body.classList.toggle("owner-mode-editor", normalized === "editor");
    document.body.classList.toggle("owner-mode-viewer", normalized === "viewer");
    dom.showViewerModeBtn.classList.toggle("is-active", normalized === "viewer");
    dom.showEditorModeBtn.classList.toggle("is-active", normalized === "editor");
    if (dom.viewerSectionTitle) {
        dom.viewerSectionTitle.textContent = "Viewing Journal";
    }
    if (dom.editorSectionTitle) {
        dom.editorSectionTitle.textContent = "Editing Journal";
    }
}

async function handleCopyShareUrl() {
    const url = (dom.copyShareUrlBtn.dataset.url || "").trim();
    if (!url) {
        return;
    }
    try {
        await navigator.clipboard.writeText(url);
        dom.copyShareUrlBtn.textContent = "Copied";
        setTimeout(() => {
            dom.copyShareUrlBtn.textContent = "Copy link";
        }, 1200);
    } catch (_error) {
        dom.copyShareUrlBtn.textContent = "Copy failed";
        setTimeout(() => {
            dom.copyShareUrlBtn.textContent = "Copy link";
        }, 1200);
    }
}
