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
    newAlbumToggleBtn: document.getElementById("new-album-toggle-btn"),
    albumListEmpty: document.getElementById("album-list-empty"),
    albumList: document.getElementById("album-list"),
    activeAlbumTitle: document.getElementById("active-album-title"),
    activeAlbumOwner: document.getElementById("active-album-owner"),
    activeAlbumVisibility: document.getElementById("active-album-visibility"),
    albumControls: document.getElementById("album-controls"),
    albumVisibilitySelect: document.getElementById("album-visibility-select"),
    albumBackgroundColor: document.getElementById("album-background-color"),
    albumViewerColumns: document.getElementById("album-viewer-columns"),
    albumSettingsDropdown: document.getElementById("album-settings-dropdown"),
    saveAlbumSettings: document.getElementById("save-album-settings"),
    copyShareUrlBtn: document.getElementById("copy-share-url"),
    photoDropZone: document.getElementById("photo-drop-zone"),
    photoSelectBtn: document.getElementById("photo-select-btn"),
    photoUploadInput: document.getElementById("photo-upload-input"),
    albumViewState: document.getElementById("album-view-state"),
    ownerViewModeToggle: document.getElementById("owner-view-mode-toggle"),
    showViewerModeBtn: document.getElementById("show-viewer-mode"),
    showEditorModeBtn: document.getElementById("show-editor-mode"),
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
    dom.guestSignInBtn.addEventListener("click", handleGuestSignIn);
    dom.linkAccountBtn.addEventListener("click", handleLinkAccount);
    dom.signOutBtn.addEventListener("click", handleSignOut);
    dom.newAlbumForm.addEventListener("submit", handleCreateAlbum);
    dom.newAlbumToggleBtn.addEventListener("click", toggleNewAlbumForm);
    dom.saveAlbumSettings.addEventListener("click", handleSaveAlbumSettings);
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
    });
    dom.albumBackgroundColor.addEventListener("input", handleAlbumBackgroundInput);
    document.querySelectorAll(".album-bg-swatch").forEach((btn) => {
        btn.addEventListener("click", () => {
            const raw = btn.dataset.color;
            dom.albumBackgroundColor.value = normalizeColor(raw || "#f1ece4");
            handleAlbumBackgroundInput();
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

async function handleGuestSignIn() {
    try {
        await signInAnonymously(auth);
    } catch (error) {
        dom.authStatus.textContent = `Guest sign-in failed: ${error.message}`;
    }
}

async function handleLinkAccount() {
    if (!currentUser || !currentUser.isAnonymous) {
        return;
    }
    const provider = new GoogleAuthProvider();
    try {
        await linkWithPopup(currentUser, provider);
        dom.authStatus.textContent = "Guest account linked to Google.";
    } catch (error) {
        dom.authStatus.textContent = `Link account failed: ${error.message}`;
    }
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
    const isGuest = Boolean(currentUser?.isAnonymous);
    dom.signInBtn.hidden = loggedIn;
    dom.guestSignInBtn.hidden = loggedIn;
    dom.linkAccountBtn.hidden = !isGuest;
    dom.signOutBtn.hidden = !loggedIn;
    dom.newAlbumToggleBtn.hidden = !loggedIn;
    if (!loggedIn) {
        dom.newAlbumForm.hidden = true;
        dom.newAlbumToggleBtn.setAttribute("aria-expanded", "false");
        dom.authStatus.textContent = "Sign in with Google or continue as guest to create albums.";
        return;
    }

    dom.newAlbumToggleBtn.setAttribute("aria-expanded", dom.newAlbumForm.hidden ? "false" : "true");

    if (isGuest) {
        dom.authStatus.textContent = "Signed in as Guest. Link account to keep long-term access.";
        return;
    }

    dom.authStatus.textContent = `Signed in as ${currentUser.displayName || currentUser.email}`;
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
        const card = document.createElement("li");
        card.className = "album-item";
        if (activeAlbum?.id === album.id) {
            card.classList.add("active");
        }
        const owned = currentUser && album.ownerUid === currentUser.uid;
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.setAttribute("aria-label", `Open album ${album.title || "Untitled album"}`);
        card.innerHTML = `
            <p class="album-item-title">${escapeHtml(album.title || "Untitled album")}</p>
            <p class="muted">${owned ? "Owned by you" : "Public album"} · ${album.visibility || "private"}</p>
        `;
        card.addEventListener("click", () => openAlbum(album.id));
        card.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openAlbum(album.id);
            }
        });
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
    const albumRef = await addDoc(collection(db, "albums"), {
        ownerUid: currentUser.uid,
        ownerDisplayName: currentUser.displayName || currentUser.email || "",
        title,
        visibility: "private",
        viewerColumns: 3,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    dom.newAlbumForm.reset();
    setNewAlbumFormOpen(false);
    await openAlbum(albumRef.id);
}

function setNewAlbumFormOpen(open) {
    dom.newAlbumForm.hidden = !open;
    dom.newAlbumToggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
        requestAnimationFrame(() => dom.newAlbumTitle.focus());
    }
}

function toggleNewAlbumForm() {
    setNewAlbumFormOpen(dom.newAlbumForm.hidden);
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

    const ownerName = await resolveAlbumOwnerName(album, isOwner);
    dom.activeAlbumTitle.textContent = album.title || "Untitled album";
    dom.activeAlbumOwner.hidden = false;
    dom.activeAlbumOwner.textContent = `By ${ownerName}`;
    dom.activeAlbumVisibility.hidden = false;
    dom.activeAlbumVisibility.textContent = album.visibility || "private";
    dom.albumViewState.textContent = "";
    dom.albumControls.hidden = !isOwnerViewing;
    dom.ownerEditorSection.hidden = !isOwnerViewing;
    dom.ownerViewModeToggle.hidden = !isOwnerViewing;
    if (isOwnerViewing) {
        setOwnerViewMode("viewer");
        if (dom.albumSettingsDropdown) {
            dom.albumSettingsDropdown.open = true;
        }
    } else {
        document.body.classList.remove("owner-mode-editor", "owner-mode-viewer");
    }
    dom.albumVisibilitySelect.value = album.visibility || "private";
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
    dom.entryGridViewer.innerHTML = "";
    dom.entryGridEditor.innerHTML = "";
    if (!entries.length) {
        dom.albumViewState.textContent = isOwnerViewing
            ? "No photos yet. Upload one or more images to start this album."
            : "No photos in this album yet.";
    } else {
        dom.albumViewState.textContent = "";
    }

    entries.forEach((entry) => {
        const storyText = toDisplayText(entry.storyText, "");
        const locationText = toDisplayText(entry.locationText, "");
        const captureDate = toDisplayText(entry.captureDate, "");

        const viewerNode = document.createElement("button");
        viewerNode.type = "button";
        viewerNode.className = "polaroid-card";
        viewerNode.dataset.fullSrc = entry.photoUrl;
        viewerNode.dataset.alt = storyText ? `Album entry: ${storyText}` : "Album entry";
        viewerNode.dataset.title = activeAlbum?.title || "Lumen Journal Entry";
        viewerNode.dataset.story = storyText || "No story yet.";
        viewerNode.dataset.location = locationText || "Not set";
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
        const metaEl = node.querySelector(".entry-meta");
        const saveBtn = node.querySelector(".entry-save");
        const delBtn = node.querySelector(".entry-delete");

        img.src = entry.photoUrl;
        img.alt = storyText ? `Album entry: ${storyText}` : "Album entry";
        storyEl.value = storyText;
        locEl.value = locationText;
        dateEl.value = captureDate;
        metaEl.textContent = `Entry ID: ${entry.id}`;

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
    dom.viewerModalStory.textContent = `Story: ${card.dataset.story || "No story yet."}`;
    dom.viewerModalLocation.textContent = `Location: ${card.dataset.location || "Not set"}`;
    dom.viewerModalDate.textContent = `Date: ${card.dataset.date || "Not set"}`;
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
    const pageBackground = normalizeColor(dom.albumBackgroundColor.value || "#f1ece4");
    const viewerColumns = normalizeViewerColumns(dom.albumViewerColumns.value);
    await updateDoc(doc(db, "albums", activeAlbum.id), {
        visibility,
        pageBackground,
        viewerColumns,
        updatedAt: serverTimestamp()
    });
    activeAlbum.visibility = visibility;
    activeAlbum.pageBackground = pageBackground;
    activeAlbum.viewerColumns = viewerColumns;
    dom.activeAlbumVisibility.textContent = visibility;
    setShareLinkVisibility(visibility, isOwnerViewing);
    applyAlbumBackground(pageBackground);
    applyViewerColumns(viewerColumns);
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
    dom.activeAlbumOwner.hidden = true;
    dom.activeAlbumOwner.textContent = "";
    dom.activeAlbumVisibility.hidden = true;
    dom.albumControls.hidden = true;
    dom.ownerViewModeToggle.hidden = true;
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
        const selfName = toDisplayText(currentUser.displayName || currentUser.email, "").trim();
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
