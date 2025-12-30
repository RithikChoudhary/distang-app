import ExpoModulesCore
import CallKit

/**
 * iOS Call Detection Module using CXCallObserver
 * Detects incoming, connected, and disconnected call states
 */
public class CallDetectionModule: Module {
    private var callObserver: CXCallObserver?
    private var callObserverDelegate: CallObserverDelegate?
    private var isListening = false
    
    public func definition() -> ModuleDefinition {
        Name("CallDetection")
        
        Events("onCallStateChanged")
        
        // Always returns true on iOS (no permission needed for CallKit)
        Function("hasPermission") { () -> Bool in
            return true
        }
        
        // Start listening for call state changes
        AsyncFunction("startListening") { (promise: Promise) in
            self.startCallObserver()
            self.isListening = true
            promise.resolve(true)
        }
        
        // Stop listening
        AsyncFunction("stopListening") { (promise: Promise) in
            self.stopCallObserver()
            self.isListening = false
            promise.resolve(true)
        }
        
        // Check if currently listening
        Function("isListening") { () -> Bool in
            return self.isListening
        }
        
        // On iOS, foreground service is not needed/supported
        // These are no-ops but kept for API compatibility
        AsyncFunction("startForegroundService") { (promise: Promise) in
            // No-op on iOS - background modes handle this
            promise.resolve(true)
        }
        
        AsyncFunction("stopForegroundService") { (promise: Promise) in
            // No-op on iOS
            promise.resolve(true)
        }
    }
    
    private func startCallObserver() {
        callObserver = CXCallObserver()
        callObserverDelegate = CallObserverDelegate { [weak self] state in
            self?.sendEvent("onCallStateChanged", [
                "state": state,
                "platform": "ios",
                "timestamp": Date().timeIntervalSince1970 * 1000
            ])
        }
        callObserver?.setDelegate(callObserverDelegate, queue: DispatchQueue.main)
    }
    
    private func stopCallObserver() {
        callObserver?.setDelegate(nil, queue: nil)
        callObserver = nil
        callObserverDelegate = nil
    }
}

/**
 * Delegate class for CXCallObserver
 */
class CallObserverDelegate: NSObject, CXCallObserverDelegate {
    private var onStateChanged: (String) -> Void
    private var activeCalls: Set<UUID> = []
    
    init(onStateChanged: @escaping (String) -> Void) {
        self.onStateChanged = onStateChanged
        super.init()
    }
    
    func callObserver(_ callObserver: CXCallObserver, callChanged call: CXCall) {
        let state: String
        
        if call.hasEnded {
            // Call has ended
            activeCalls.remove(call.uuid)
            state = activeCalls.isEmpty ? "idle" : "connected"
        } else if call.isOutgoing && !call.hasConnected {
            // Outgoing call, not yet connected
            activeCalls.insert(call.uuid)
            state = "dialing"
        } else if !call.isOutgoing && !call.hasConnected && !call.hasEnded {
            // Incoming call, not yet answered
            activeCalls.insert(call.uuid)
            state = "incoming"
        } else if call.hasConnected {
            // Call is connected (answered)
            activeCalls.insert(call.uuid)
            state = "connected"
        } else {
            state = "unknown"
        }
        
        onStateChanged(state)
    }
}

