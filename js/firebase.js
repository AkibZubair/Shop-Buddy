// js/firebase.js

// Your Firebase configuration
var firebaseConfig = {
  apiKey: "AIzaSyBKN7YJco_F7CJH-Vfcwmu9--UupspHl7M",
  authDomain: "store-buddy-e9386.firebaseapp.com",
  projectId: "store-buddy-e9386",
  storageBucket: "store-buddy-e9386.firebasestorage.app",
  messagingSenderId: "155935354028",
  appId: "1:155935354028:web:d4e35edcf25c3d15d1c309",
  measurementId: "G-QFVZEZV65P"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Make auth & db global
var auth = firebase.auth();
var db = firebase.firestore();
