# Firebase Security Rules (Recommended)

Use these as starting rules and adapt to your production requirements.

## Firestore Rules

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(ownerUid) {
      return isSignedIn() && request.auth.uid == ownerUid;
    }

    match /users/{uid} {
      allow read, write: if isOwner(uid);
    }

    match /albums/{albumId} {
      allow read: if resource.data.visibility == "public" || isOwner(resource.data.ownerUid);
      allow create: if isSignedIn() && request.resource.data.ownerUid == request.auth.uid;
      allow update, delete: if isOwner(resource.data.ownerUid);
    }

    match /albums/{albumId}/entries/{entryId} {
      allow read: if get(/databases/$(database)/documents/albums/$(albumId)).data.visibility == "public"
                  || isOwner(get(/databases/$(database)/documents/albums/$(albumId)).data.ownerUid);
      allow create, update, delete: if isOwner(get(/databases/$(database)/documents/albums/$(albumId)).data.ownerUid);
    }
  }
}
```

## Storage Rules

```txt
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{uid}/albums/{albumId}/{fileName} {
      allow write, delete: if request.auth != null && request.auth.uid == uid;
      allow read: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## OAuth Redirect Domains

In Firebase Auth -> Settings -> Authorized domains, include:

- `rktang.github.io`
- `localhost` (for local preview/testing)

## GitHub Pages Deploy

1. Commit and push repository updates.
2. Ensure GitHub Pages is enabled for the default branch.
3. Open the app at:
  - `https://rktang.github.io/lumen/`

