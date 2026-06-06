import SwiftUI

@main
struct MaintenanceApp: App {
    @State private var session = NativeAppSession()

    var body: some Scene {
        WindowGroup {
            NativeAppRootView()
                .environment(session)
        }
    }
}
