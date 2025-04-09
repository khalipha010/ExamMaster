const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Initialize the Firebase Admin SDK
admin.initializeApp();

// Cloud Function to delete a student's Firebase Authentication record
exports.deleteStudent = onCall(async (request) => {
  // Ensure the caller is authenticated
  if (!request.auth) {
    logger.error("Unauthenticated request to deleteStudent");
    throw new HttpsError("unauthenticated", "You must be authenticated to perform this action.");
  }

  // Get the caller's UID
  const callerUid = request.auth.uid;

  // Fetch the caller's user document to verify their role
  const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();
  if (!callerDoc.exists || callerDoc.data().role !== "teacher") {
    logger.error(`User ${callerUid} does not have teacher role`);
    throw new HttpsError("permission-denied", "Only teachers can delete students.");
  }

  // Get the studentId from the request data
  const { studentId } = request.data;
  if (!studentId) {
    logger.error("Missing studentId in deleteStudent request");
    throw new HttpsError("invalid-argument", "Student ID is required.");
  }

  // Verify that the student exists in Firestore and has the role 'student'
  const studentDoc = await admin.firestore().collection("users").doc(studentId).get();
  if (!studentDoc.exists || studentDoc.data().role !== "student") {
    logger.error(`Student ${studentId} not found or not a student`);
    throw new HttpsError("not-found", "Student not found or not a student.");
  }

  try {
    // Delete the student's Firebase Authentication record
    await admin.auth().deleteUser(studentId);
    logger.info(`Successfully deleted student ${studentId} authentication record`);
    return { success: true, message: "Student deleted successfully." };
  } catch (error) {
    logger.error(`Error deleting student ${studentId} authentication record:`, error);
    throw new HttpsError("internal", "Failed to delete student authentication record: " + error.message);
  }
});