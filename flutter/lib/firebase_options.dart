// Placeholder firebase_options.dart
// Replace the constant values by running `flutterfire configure` locally
// or fill these values from Firebase Console -> Project Settings -> Your apps

import 'package:firebase_core/firebase_core.dart';

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    return const FirebaseOptions(
      apiKey: 'YOUR_API_KEY',
      appId: 'YOUR_APP_ID',
      messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
      projectId: 'plan-b-a539d',
      authDomain: 'YOUR_AUTH_DOMAIN',
      storageBucket: 'YOUR_STORAGE_BUCKET',
      measurementId: 'YOUR_MEASUREMENT_ID',
      androidClientId: 'YOUR_ANDROID_CLIENT_ID',
      iosClientId: 'YOUR_IOS_CLIENT_ID',
    );
  }
}
