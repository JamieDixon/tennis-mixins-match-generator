import firebase from "firebase/app";
import "firebase/firestore";
// import "firebase/analytics";
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
var firebaseConfig = {
  apiKey: "AIzaSyAtlV-iXaVPfXNmIAkMlxI5nuLB8QCTCl4",
  authDomain: "mix-in-517bd.firebaseapp.com",
  projectId: "mix-in-517bd",
  storageBucket: "mix-in-517bd.appspot.com",
  messagingSenderId: "821202724937",
  appId: "1:821202724937:web:64357ca0d64ebaa3903798",
  measurementId: "G-964GSF96N0"
};

if (firebase.apps.length < 1) {
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  // firebase.analytics();
}

export { firebase };
