package com.codex.calldetection

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.PhoneStateListener
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class CallDetectionModule : Module() {
    private var telephonyManager: TelephonyManager? = null
    private var phoneStateListener: PhoneStateListener? = null
    private var telephonyCallback: TelephonyCallback? = null
    private var isListening = false

    override fun definition() = ModuleDefinition {
        Name("CallDetection")

        Events("onCallStateChanged")

        // Check if we have phone state permission
        Function("hasPermission") {
            val context = appContext.reactContext ?: return@Function false
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.READ_PHONE_STATE
            ) == PackageManager.PERMISSION_GRANTED
        }

        // Start listening for call state changes
        AsyncFunction("startListening") { promise: Promise ->
            val context = appContext.reactContext
            if (context == null) {
                promise.reject("ERROR", "Context not available", null)
                return@AsyncFunction
            }

            if (ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.READ_PHONE_STATE
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                promise.reject("PERMISSION_DENIED", "READ_PHONE_STATE permission not granted", null)
                return@AsyncFunction
            }

            try {
                startCallStateListener(context)
                isListening = true
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERROR", e.message, e)
            }
        }

        // Stop listening
        AsyncFunction("stopListening") { promise: Promise ->
            try {
                stopCallStateListener()
                isListening = false
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERROR", e.message, e)
            }
        }

        // Check if currently listening
        Function("isListening") {
            isListening
        }

        // Start foreground service for 24/7 detection
        AsyncFunction("startForegroundService") { promise: Promise ->
            val context = appContext.reactContext
            if (context == null) {
                promise.reject("ERROR", "Context not available", null)
                return@AsyncFunction
            }

            try {
                val intent = Intent(context, CallDetectionService::class.java)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERROR", e.message, e)
            }
        }

        // Stop foreground service
        AsyncFunction("stopForegroundService") { promise: Promise ->
            val context = appContext.reactContext
            if (context == null) {
                promise.reject("ERROR", "Context not available", null)
                return@AsyncFunction
            }

            try {
                val intent = Intent(context, CallDetectionService::class.java)
                context.stopService(intent)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERROR", e.message, e)
            }
        }
    }

    private fun startCallStateListener(context: Context) {
        telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // Android 12+ uses TelephonyCallback
            telephonyCallback = object : TelephonyCallback(), TelephonyCallback.CallStateListener {
                override fun onCallStateChanged(state: Int) {
                    handleCallState(state)
                }
            }
            telephonyManager?.registerTelephonyCallback(
                context.mainExecutor,
                telephonyCallback!!
            )
        } else {
            // Older Android versions use PhoneStateListener
            @Suppress("DEPRECATION")
            phoneStateListener = object : PhoneStateListener() {
                @Deprecated("Deprecated in Java")
                override fun onCallStateChanged(state: Int, phoneNumber: String?) {
                    handleCallState(state)
                }
            }
            @Suppress("DEPRECATION")
            telephonyManager?.listen(phoneStateListener, PhoneStateListener.LISTEN_CALL_STATE)
        }
    }

    private fun stopCallStateListener() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            telephonyCallback?.let {
                telephonyManager?.unregisterTelephonyCallback(it)
            }
            telephonyCallback = null
        } else {
            @Suppress("DEPRECATION")
            telephonyManager?.listen(phoneStateListener, PhoneStateListener.LISTEN_NONE)
            phoneStateListener = null
        }
        telephonyManager = null
    }

    private fun handleCallState(state: Int) {
        val callState = when (state) {
            TelephonyManager.CALL_STATE_IDLE -> "idle"
            TelephonyManager.CALL_STATE_RINGING -> "incoming"
            TelephonyManager.CALL_STATE_OFFHOOK -> "connected"
            else -> "unknown"
        }

        sendEvent("onCallStateChanged", mapOf(
            "state" to callState,
            "platform" to "android",
            "timestamp" to System.currentTimeMillis()
        ))
    }
}

