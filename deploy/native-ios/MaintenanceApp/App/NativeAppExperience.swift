import Observation
import SwiftUI

@Observable
@MainActor
final class NativeAppSession {
    var isAuthenticated: Bool
    var email: String
    var displayName: String
    var selectedTab: NativeAppTab
    var selectedPlant: String
    var shouldPersistSession: Bool

    init() {
        let defaults = UserDefaults.standard
        isAuthenticated = defaults.bool(forKey: "native_app_authenticated")
        email = defaults.string(forKey: "native_app_email") ?? ""
        displayName = defaults.string(forKey: "native_app_display_name") ?? "Maintenance Lead"
        selectedTab = .home
        selectedPlant = defaults.string(forKey: "native_app_selected_plant") ?? "Vadodara LNG"
        shouldPersistSession = defaults.object(forKey: "native_app_should_persist") as? Bool ?? true
    }

    func signIn(email: String, password: String, persistSession: Bool) {
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedPassword = password.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedEmail.isEmpty, !trimmedPassword.isEmpty else { return }

        self.email = trimmedEmail
        self.displayName = trimmedEmail
            .split(separator: "@")
            .first
            .map { $0.replacingOccurrences(of: ".", with: " ").capitalized }
            ?? "Maintenance Lead"
        isAuthenticated = true
        shouldPersistSession = persistSession
        persist()
    }

    func signOut() {
        isAuthenticated = false
        selectedTab = .home
        persist()
    }

    private func persist() {
        let defaults = UserDefaults.standard
        defaults.set(shouldPersistSession ? isAuthenticated : false, forKey: "native_app_authenticated")
        defaults.set(email, forKey: "native_app_email")
        defaults.set(displayName, forKey: "native_app_display_name")
        defaults.set(selectedPlant, forKey: "native_app_selected_plant")
        defaults.set(shouldPersistSession, forKey: "native_app_should_persist")
    }
}

enum NativeAppTab: String, CaseIterable, Identifiable {
    case home = "Home"
    case operations = "Operations"
    case planning = "Planning"
    case admin = "Admin"

    var id: String { rawValue }

    var iconName: String {
        switch self {
        case .home: return "house"
        case .operations: return "wrench.and.screwdriver"
        case .planning: return "calendar"
        case .admin: return "person.crop.circle"
        }
    }
}

enum NativeModuleRoute: String, CaseIterable, Hashable, Identifiable {
    case enterprise
    case assets
    case manuals
    case logbook
    case workshop
    case calibration
    case energy
    case training
    case collaboration
    case reports
    case moh
    case mrp
    case procurement
    case userManagement
    case settings

    var id: String { rawValue }

    var title: String {
        switch self {
        case .enterprise: return "Enterprise Hub"
        case .assets: return "Assets"
        case .manuals: return "Manuals & Drawings"
        case .logbook: return "Logbook"
        case .workshop: return "Workshop"
        case .calibration: return "Calibration"
        case .energy: return "Energy"
        case .training: return "Training"
        case .collaboration: return "Collaboration"
        case .reports: return "Reports"
        case .moh: return "MOH"
        case .mrp: return "MRP"
        case .procurement: return "Procurement"
        case .userManagement: return "User Management"
        case .settings: return "Settings"
        }
    }

    var subtitle: String {
        switch self {
        case .enterprise: return "Overview, readiness, and live native status."
        case .assets: return "Hierarchy, equipment, work orders, and meters."
        case .manuals: return "Read-only repository links with device downloads."
        case .logbook: return "Shift notes and equipment observations."
        case .workshop: return "Shop jobs, intake, and work filters."
        case .calibration: return "Due items, records, and standards."
        case .energy: return "Consumption, daily logs, and bills."
        case .training: return "Schedules, records, and completions."
        case .collaboration: return "Discussions, updates, and feedback."
        case .reports: return "Pending sync and reporting queues."
        case .moh: return "Maintenance windows and outage planning."
        case .mrp: return "Requirements and draft requisitions."
        case .procurement: return "Cases, budget, and org structure."
        case .userManagement: return "Users, roles, and access."
        case .settings: return "Alerts, theme, security, and device cache."
        }
    }

    var iconName: String {
        switch self {
        case .enterprise: return "sparkles.rectangle.stack"
        case .assets: return "shippingbox"
        case .manuals: return "doc.text.image"
        case .logbook: return "book.closed"
        case .workshop: return "wrench.and.screwdriver"
        case .calibration: return "scope"
        case .energy: return "bolt.circle"
        case .training: return "graduationcap"
        case .collaboration: return "bubble.left.and.bubble.right"
        case .reports: return "chart.bar.doc.horizontal"
        case .moh: return "clock.badge.checkmark"
        case .mrp: return "shippingbox.circle"
        case .procurement: return "creditcard"
        case .userManagement: return "person.2"
        case .settings: return "gearshape"
        }
    }

    var accentColor: Color {
        switch self {
        case .enterprise: return .blue
        case .assets: return .teal
        case .manuals: return .orange
        case .logbook: return .indigo
        case .workshop: return .brown
        case .calibration: return .mint
        case .energy: return .yellow
        case .training: return .cyan
        case .collaboration: return .pink
        case .reports: return .green
        case .moh: return .red
        case .mrp: return .blue
        case .procurement: return .teal
        case .userManagement: return .indigo
        case .settings: return .gray
        }
    }

    @ViewBuilder
    func destinationView() -> some View {
        switch self {
        case .enterprise: EnterpriseHubView()
        case .assets: AssetsHubView()
        case .manuals: ManualsHubView()
        case .logbook: LogbookHubView()
        case .workshop: WorkshopHubView()
        case .calibration: CalibrationHubView()
        case .energy: EnergyHubView()
        case .training: TrainingHubView()
        case .collaboration: CollaborationHubView()
        case .reports: ReportsHubView()
        case .moh: MOHHubView()
        case .mrp: MRPHubView()
        case .procurement: ProcurementHubView()
        case .userManagement: UserManagementView()
        case .settings: SettingsView()
        }
    }
}

struct NativeAppRootView: View {
    @Environment(NativeAppSession.self) private var session

    var body: some View {
        Group {
            if session.isAuthenticated {
                NativeAppShellView()
                    .transition(.opacity)
            } else {
                NativeLoginView()
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.24), value: session.isAuthenticated)
    }
}

struct NativeLoginView: View {
    @Environment(NativeAppSession.self) private var session
    @FocusState private var focusedField: NativeLoginField?
    @State private var email = ""
    @State private var password = ""
    @State private var rememberDevice = true

    private var canSignIn: Bool {
        !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
            !password.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                NativeLoginBackground()

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 18) {
                        NativeLoginHeader()

                        NativeAuthenticationCard(
                            email: $email,
                            password: $password,
                            rememberDevice: $rememberDevice,
                            focusedField: $focusedField,
                            onSubmit: signIn
                        )
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 18)
                    .padding(.bottom, 20)
                    .frame(maxWidth: 460)
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: geometry.size.height, alignment: .top)
                }
            }
        }
    }

    private func signIn() {
        session.signIn(email: email, password: password, persistSession: rememberDevice)
    }

    private enum NativeLoginField {
        case email
        case password
    }

    private struct NativeLoginHeader: View {
        var body: some View {
            VStack(alignment: .leading, spacing: 6) {
                Text("Maintenance Native")
                    .font(.system(size: 22, weight: .bold, design: .default))
                    .foregroundStyle(.white)

                Text("Sign in to open operations, planning, and reporting.")
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.82))
            }
        }
    }

    private struct NativeAuthenticationCard: View {
        @Binding var email: String
        @Binding var password: String
        @Binding var rememberDevice: Bool
        @FocusState.Binding var focusedField: NativeLoginField?
        let onSubmit: () -> Void

        private var canSubmit: Bool {
            !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
                !password.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }

        var body: some View {
            VStack(alignment: .leading, spacing: 12) {
                Text("Sign In")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(.primary)

                VStack(spacing: 14) {
                    NativeCredentialField(
                        title: "Work Email",
                        prompt: "name@company.com",
                        iconName: "envelope",
                        text: $email,
                        isSecure: false
                    )
                    .focused($focusedField, equals: .email)
                    .submitLabel(.next)

                    NativeCredentialField(
                        title: "Password",
                        prompt: "Enter password",
                        iconName: "lock",
                        text: $password,
                        isSecure: true
                    )
                    .focused($focusedField, equals: .password)
                    .submitLabel(.go)
                }

                Toggle("Keep this iPhone signed in", isOn: $rememberDevice)
                    .tint(.blue)

                Button(action: onSubmit) {
                    Text("Continue")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(!canSubmit)

                Text("Demo access is enabled in this native build.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            .padding(16)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 28, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .strokeBorder(Color.white.opacity(0.16))
            )
        }
    }
}

struct NativeAppShellView: View {
    @Environment(NativeAppSession.self) private var session

    var body: some View {
        TabView(selection: Binding(
            get: { session.selectedTab },
            set: { session.selectedTab = $0 }
        )) {
            NativeHomeTab()
                .tabItem {
                    Label(NativeAppTab.home.rawValue, systemImage: NativeAppTab.home.iconName)
                }
                .tag(NativeAppTab.home)

            NativeOperationsTab()
                .tabItem {
                    Label(NativeAppTab.operations.rawValue, systemImage: NativeAppTab.operations.iconName)
                }
                .tag(NativeAppTab.operations)

            NativePlanningTab()
                .tabItem {
                    Label(NativeAppTab.planning.rawValue, systemImage: NativeAppTab.planning.iconName)
                }
                .tag(NativeAppTab.planning)

            NativeAdminTab()
                .tabItem {
                    Label(NativeAppTab.admin.rawValue, systemImage: NativeAppTab.admin.iconName)
                }
                .tag(NativeAppTab.admin)
        }
        .tint(.blue)
        .toolbarBackground(.visible, for: .tabBar)
        .toolbarBackground(Color(uiColor: .systemBackground), for: .tabBar)
    }
}

private struct NativeHomeTab: View {
    var body: some View {
        NativeTabContainer(title: "Home") {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    NativeOverviewCard()

                    NativeShellSectionHeader(
                        title: "Priority Modules",
                        subtitle: "Start with the modules used most often on iPhone."
                    )

                    NativeModulePanelGrid(routes: [.enterprise, .assets, .manuals, .reports])

                    NativeShellSectionHeader(
                        title: "System State",
                        subtitle: "Current rollout posture for the native workspace."
                    )

                    VStack(spacing: 12) {
                        NativeStatusPanel(
                            title: "Manuals remain read-only",
                            detail: "Downloads are cached locally and never change the repository.",
                            iconName: "lock.doc",
                            tint: .orange
                        )
                        NativeStatusPanel(
                            title: "Offline queue available",
                            detail: "Local-first records stay staged until shared sync is reconnected.",
                            iconName: "arrow.triangle.2.circlepath",
                            tint: .blue
                        )
                        NativeStatusPanel(
                            title: "All module routes are live",
                            detail: "Operations, planning, and admin modules are reachable from the shell.",
                            iconName: "checkmark.circle",
                            tint: .green
                        )
                    }
                }
                .padding(20)
            }
            .background(Color(uiColor: .systemGroupedBackground))
        }
    }
}

private struct NativeOperationsTab: View {
    var body: some View {
        NativeTabContainer(title: "Operations") {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    NativeMetricStrip(metrics: [
                        .init(title: "Assets", value: "84"),
                        .init(title: "Open WOs", value: "11"),
                        .init(title: "Calibration", value: "7"),
                        .init(title: "Energy", value: "42.6")
                    ])

                    NativeShellSectionHeader(
                        title: "Execution",
                        subtitle: "Field work, references, and daily operating records."
                    )

                    VStack(spacing: 12) {
                        ForEach([NativeModuleRoute.assets, .manuals, .logbook, .workshop]) { route in
                            NavigationLink(value: route) {
                                NativeModulePanel(route: route)
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    NativeShellSectionHeader(
                        title: "Monitoring",
                        subtitle: "Live operational oversight modules."
                    )

                    VStack(spacing: 12) {
                        ForEach([NativeModuleRoute.calibration, .energy]) { route in
                            NavigationLink(value: route) {
                                NativeModulePanel(route: route)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(20)
            }
        }
    }
}

private struct NativePlanningTab: View {
    var body: some View {
        NativeTabContainer(title: "Planning") {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    NativeMetricStrip(metrics: [
                        .init(title: "Training", value: "12"),
                        .init(title: "Reports", value: "4"),
                        .init(title: "MOH", value: "6"),
                        .init(title: "Draft PRs", value: "4")
                    ])

                    NativeShellSectionHeader(
                        title: "Planning & Reporting",
                        subtitle: "Scheduling, collaboration, reporting, and material planning."
                    )

                    VStack(spacing: 12) {
                        ForEach([NativeModuleRoute.training, .collaboration, .reports, .moh, .mrp, .procurement]) { route in
                            NavigationLink(value: route) {
                                NativeModulePanel(route: route)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(20)
            }
        }
    }
}

private struct NativeAdminTab: View {
    @Environment(NativeAppSession.self) private var session

    var body: some View {
        NativeTabContainer(title: "Admin") {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    NativeProfileCard(
                        displayName: session.displayName,
                        email: session.email,
                        plant: session.selectedPlant
                    )

                    NativeShellSectionHeader(
                        title: "Administration",
                        subtitle: "People, settings, and access controls."
                    )

                    VStack(spacing: 12) {
                        ForEach([NativeModuleRoute.userManagement, .settings]) { route in
                            NavigationLink(value: route) {
                                NativeModulePanel(route: route)
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    Button(role: .destructive) {
                        session.signOut()
                    } label: {
                        Text("Sign Out")
                            .font(.headline)
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding(.vertical, 16)
                    }
                    .buttonStyle(.bordered)
                    .tint(.red)
                }
                .padding(20)
            }
        }
    }
}

private struct NativeTabContainer<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content
    @State private var path: [NativeModuleRoute] = []

    init(title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        NavigationStack(path: $path) {
            content
                .navigationTitle(title)
                .navigationBarTitleDisplayMode(.large)
                .navigationDestination(for: NativeModuleRoute.self) { route in
                    route.destinationView()
                }
                .background(Color(uiColor: .systemGroupedBackground))
                .toolbarBackground(.visible, for: .navigationBar)
        }
    }
}

private struct NativeOverviewCard: View {
    @Environment(NativeAppSession.self) private var session

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 8) {
                Text(session.selectedPlant)
                    .font(.headline)
                    .foregroundStyle(.secondary)

                Text("Good evening, \(session.displayName)")
                    .font(.title2.weight(.bold))

                Text("A focused native workspace for monitoring readiness, opening modules, and working cleanly on iPhone.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 12) {
                NativeOverviewMetric(title: "Shift", value: "17:00")
                NativeOverviewMetric(title: "Queues", value: "4")
                NativeOverviewMetric(title: "Modules", value: "15")
            }
        }
        .padding(20)
        .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
    }
}

private struct NativeOverviewMetric: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value)
                .font(.headline)
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

private struct NativeMetricStrip: View {
    let metrics: [NativeStripMetric]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(metrics) { metric in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(metric.value)
                            .font(.headline.weight(.semibold))
                        Text(metric.title)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .frame(width: 104, alignment: .leading)
                    .padding(14)
                    .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
            }
        }
    }
}

private struct NativeStripMetric: Identifiable {
    let id = UUID()
    let title: String
    let value: String
}

private struct NativeShellSectionHeader: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.title3.weight(.semibold))
            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }
}

private struct NativeModulePanelGrid: View {
    let routes: [NativeModuleRoute]
    private let columns = [GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        LazyVGrid(columns: columns, spacing: 12) {
            ForEach(routes) { route in
                NavigationLink(value: route) {
                    NativeModulePanel(route: route, compact: true)
                }
                .buttonStyle(.plain)
            }
        }
    }
}

private struct NativeModulePanel: View {
    let route: NativeModuleRoute
    var compact: Bool = false

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: compact ? 14 : 16, style: .continuous)
                    .fill(route.accentColor.opacity(0.14))
                    .frame(width: compact ? 44 : 50, height: compact ? 44 : 50)

                Image(systemName: route.iconName)
                    .font(.system(size: compact ? 18 : 20, weight: .semibold))
                    .foregroundStyle(route.accentColor)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text(route.title)
                    .font(compact ? .subheadline.weight(.semibold) : .headline)
                    .foregroundStyle(.primary)

                Text(route.subtitle)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .lineLimit(compact ? 3 : 2)

                if !compact {
                    Text("Live native module")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(route.accentColor)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(route.accentColor.opacity(0.12), in: Capsule())
                }
            }

            Spacer(minLength: 0)

            Image(systemName: "chevron.right")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.tertiary)
                .padding(.top, 6)
        }
        .padding(compact ? 14 : 16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
}

private struct NativeStatusPanel: View {
    let title: String
    let detail: String
    let iconName: String
    let tint: Color

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            ZStack {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(tint.opacity(0.14))
                    .frame(width: 42, height: 42)

                Image(systemName: iconName)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(tint)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.body.weight(.semibold))
                Text(detail)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
}

private struct NativeProfileCard: View {
    let displayName: String
    let email: String
    let plant: String

    var body: some View {
        HStack(spacing: 16) {
            Circle()
                .fill(Color.accentColor.opacity(0.18))
                .frame(width: 56, height: 56)
                .overlay(
                    Text(String(displayName.prefix(2)).uppercased())
                        .font(.headline.weight(.bold))
                        .foregroundStyle(.blue)
                )

            VStack(alignment: .leading, spacing: 4) {
                Text(displayName)
                    .font(.headline)
                Text(email)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text(plant)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .padding(20)
        .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
    }
}

private struct NativeCredentialField: View {
    let title: String
    let prompt: String
    let iconName: String
    @Binding var text: String
    let isSecure: Bool

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: iconName)
                .foregroundStyle(.secondary)

            if isSecure {
                SecureField(prompt, text: $text)
                    .foregroundStyle(.primary)
            } else {
                TextField(prompt, text: $text)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)
                    .foregroundStyle(.primary)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(Color(uiColor: .systemBackground), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.primary.opacity(0.14), lineWidth: 1)
        )
        .accessibilityLabel(title)
    }
}

private struct NativeSupportLine: View {
    let title: String
    let detail: String
    let iconName: String

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: iconName)
                .font(.headline)
                .foregroundStyle(.white.opacity(0.9))
                .frame(width: 22)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.body.weight(.medium))
                    .foregroundStyle(.white)
                Text(detail)
                    .font(.footnote)
                    .foregroundStyle(.white.opacity(0.72))
            }
        }
    }
}

private struct NativeLoginBackground: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.08, green: 0.12, blue: 0.18),
                    Color(red: 0.10, green: 0.22, blue: 0.33),
                    Color(red: 0.08, green: 0.10, blue: 0.16)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            Circle()
                .fill(Color.white.opacity(0.12))
                .frame(width: 280, height: 280)
                .blur(radius: 24)
                .offset(x: -140, y: -260)

            Circle()
                .fill(Color.blue.opacity(0.30))
                .frame(width: 220, height: 220)
                .blur(radius: 36)
                .offset(x: 150, y: -120)
        }
    }
}
