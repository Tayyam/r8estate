"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVerifiedUser = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
exports.createVerifiedUser = functions.https.onCall(async (data, context) => {
    try {
        const { uid, email, displayName } = data;
        // Validate input
        if (!uid || !email) {
            throw new functions.https.HttpsError('invalid-argument', 'User ID and email are required');
        }
        // Check if user document already exists
        const userDoc = await admin.firestore().collection('users').doc(uid).get();
        if (userDoc.exists) {
            // Just update the isEmailVerified field
            await admin.firestore().collection('users').doc(uid).update({
                isEmailVerified: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            return {
                success: true,
                message: 'User verification status updated successfully'
            };
        }
        // Create user document in Firestore
        await admin.firestore().collection('users').doc(uid).set({
            uid,
            email,
            displayName: displayName || email.split('@')[0],
            role: 'user',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            isEmailVerified: true
        });
        return {
            success: true,
            message: 'User document created successfully'
        };
    }
    catch (error) {
        console.error('Error creating verified user document:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error instanceof Error ? error.message : 'Failed to create user document');
    }
});
//# sourceMappingURL=create-verified-user.js.map