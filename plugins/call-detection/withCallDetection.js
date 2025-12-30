/**
 * Expo Config Plugin for Call Detection
 * Adds required permissions and configurations for both Android and iOS
 */
const { withAndroidManifest, withInfoPlist, withEntitlementsPlist } = require('@expo/config-plugins');

/**
 * Android Configuration
 * - Adds READ_PHONE_STATE permission
 * - Adds FOREGROUND_SERVICE permission
 * - Adds FOREGROUND_SERVICE_PHONE_CALL permission (Android 14+)
 */
function withAndroidCallDetection(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;
    
    // Ensure permissions array exists
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }
    
    const permissions = [
      'android.permission.READ_PHONE_STATE',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_PHONE_CALL',
      'android.permission.POST_NOTIFICATIONS',
    ];
    
    permissions.forEach((permission) => {
      const exists = manifest['uses-permission'].some(
        (p) => p.$?.['android:name'] === permission
      );
      if (!exists) {
        manifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    });
    
    // Add foreground service declaration
    const application = manifest.application?.[0];
    if (application) {
      if (!application.service) {
        application.service = [];
      }
      
      const serviceExists = application.service.some(
        (s) => s.$?.['android:name'] === '.CallDetectionService'
      );
      
      if (!serviceExists) {
        application.service.push({
          $: {
            'android:name': '.CallDetectionService',
            'android:enabled': 'true',
            'android:exported': 'false',
            'android:foregroundServiceType': 'phoneCall',
          },
        });
      }
    }
    
    return config;
  });
}

/**
 * iOS Configuration
 * - Adds required background modes
 * - Adds CallKit usage description
 */
function withIOSCallDetection(config) {
  // Add Info.plist configurations
  config = withInfoPlist(config, (config) => {
    // Background modes
    if (!config.modResults.UIBackgroundModes) {
      config.modResults.UIBackgroundModes = [];
    }
    
    const backgroundModes = ['voip', 'audio', 'location'];
    backgroundModes.forEach((mode) => {
      if (!config.modResults.UIBackgroundModes.includes(mode)) {
        config.modResults.UIBackgroundModes.push(mode);
      }
    });
    
    // Privacy descriptions
    config.modResults.NSMicrophoneUsageDescription = 
      config.modResults.NSMicrophoneUsageDescription || 
      'This app needs access to your microphone for voice messages.';
    
    return config;
  });
  
  return config;
}

/**
 * Main plugin function
 */
module.exports = function withCallDetection(config) {
  config = withAndroidCallDetection(config);
  config = withIOSCallDetection(config);
  return config;
};

