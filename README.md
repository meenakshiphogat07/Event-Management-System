# Event Management Platform

A React application built with Vite for managing different types of events.

## Features

- Select event type: Birthday Party, Wedding, Anniversary, or College Event
- For College Events: Registration form with QR code generation
- For Cultural Events: Venue suggestions based on location, number of attendees, and budget

## Setup

1. Install Node.js
2. Run `npm install`
3. Create a Firebase project and Firestore database
4. Update `src/firebase.js` with your Firebase config
5. Run `npm run dev` to start the development server

## Firebase setup

- Go to the Firebase console and create a new project
- Add a Web app and copy the Firebase configuration values
- Enable Firestore in test mode or with rules you choose
- Replace the placeholder values in `src/firebase.js`

## Adding Real Venues to Firestore

To use real venues instead of mock data:

1. Go to your Firebase console → Firestore
2. Create a collection called `venues`
3. Add documents with this structure:
   ```json
   {
     "name": "Grand Hall",
     "location": "Mumbai",
     "capacity": 100,
     "price": 500,
     "contact": "022-1234567"
   }
   ```
4. The app will now fetch venues from Firestore whenever you search

The app will automatically fallback to mock venues if Firestore is unavailable or empty.

If Firestore is not updating:
- make sure you pasted the exact config from Firebase
- verify Firestore is enabled in your Firebase console
- check the browser console for Firebase auth or permission errors

Firebase rules in test mode allow all reads/writes for 30 days. For production, use rules like:
```
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
This requires users to sign in before accessing Firestore.

## Technologies

- React
- Vite
- Firebase (for backend)