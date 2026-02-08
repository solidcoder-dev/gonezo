import Foundation
import Capacitor

@objc(CorePlugin)
public class CorePlugin: CAPPlugin {
    @objc func doThing(_ call: CAPPluginCall) {
        let input = call.getString("input") ?? ""
        call.resolve([
            "status": "ok",
            "message": "ios stub ok: \(input)"
        ])
    }

    @objc func createAccount(_ call: CAPPluginCall) {
        let id = UUID().uuidString
        call.resolve([
            "id": id
        ])
    }
}
