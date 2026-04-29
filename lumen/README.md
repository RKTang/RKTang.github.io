# Lumen

Lumen is a standalone GitHub Pages app for user-generated photo journals.

## Features

- Google sign-in with Firebase Auth
- Private/public albums per user
- Multi-photo upload to Firebase Storage
- Firestore-backed entries with editable:
  - Story
  - Location
  - Date
- EXIF-based metadata auto-fill when available

## Local Setup

1. Create a Firebase project.
2. Enable:
   - Authentication -> Google provider
   - Firestore Database
   - Storage
3. Copy your Firebase web config into `lumen/firebase-config.js`.
4. Deploy to GitHub Pages as part of this repository.

## Routing

- App root: `/lumen/`
- Public share: `/lumen/?album=<albumId>`

## Notes

- This app uses Firebase client SDKs directly in the browser (no build step).
- EXIF extraction is done client-side using `exifr`.
