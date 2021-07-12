const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
// auth trigger (new user signup)
exports.newUserSignUp = functions.auth.user().onCreate(user => {
  return admin.firestore().collection("users").doc(user.uid).set({
    email: user.email,
    upvoteOn: [],
  });
});

// auth trigger (user deleted)
exports.userDeleted = functions.auth.user().onDelete(user => {
  const doc = admin.firestore().collection("users").doc(user.uid);
  return doc.delete();
});

// http callable function (adicionar requests)

exports.addRequest = functions.https.onCall((data, context) => {
  // Checking attribute.
  if (data.text.length > 30) {
    throw new functions.https.HttpsError(
      "invalid-argument", 
      "request must be no more than 30 characters long"
    );
  }
  // Checking that the user is authenticated.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated'", 
      "only authenticated users can add requests"
    );
  }
  return admin.firestore().collection("requests").doc().set({
    text: data.text,
    upvotes: 0
  });
});

// upvote callable function

exports.upvote = functions.https.onCall((data, context) => {

  // check authenticated state
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated'", 
      "only authenticated users can add requests"
    );
  }
  // get refs for user doc and request doc
  const user = admin.firestore().collection("users").doc(context.auth.uid);
  const request = admin.firestore().collection("requests").doc(data.id);

  return user.get().then(doc => {
    // check if the user upvoted already
    if (doc.data().upvoteOn.includes(data.id)) {
      throw new functions.https.HttpsError(
        "failed-precondition", 
        "Vote something only once"
      );
    }

    // update the array in the user doc
    return user.update({
      upvoteOn: [...doc.data().upvoteOn, data.id]
    })
    .then(() => {
      // update the votes on the request
      return request.update({
        upvotes: admin.firestore.FieldValue.increment(1)
      });
    });
  });
});

// firestore triggers para controlo de atividade

exports.logActivities = functions.firestore.document("/{collection}/{id}")
  .onCreate((snap, context) => {
    console.log(snap.data());

    const act = admin.firestore().collection("activities");
    const collection = context.params.collection;

    if (collection === "requests") {
      return act.add({ text: "Um novo tutorial foi adicionado"});
    }
    if (collection === "users") {
      return act.add({ text: "Um novo utilizador fez o registo"});
    }

    return null;
  });