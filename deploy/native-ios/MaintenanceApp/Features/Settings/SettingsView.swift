import SwiftUI

// MARK: - Settings View
struct SettingsView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var themeManager: ThemeManager
    @StateObject private var viewModel = SettingsViewModel()
    @State private var showingLogoutConfirmation = false
    @State private var showingClearCacheConfirmation = false
    @State private var showingChangePassword = false
    @State private var showingAbout = false
    
    var body: some View {
        NavigationStack {
            List {
                // Profile Section
                Section {
                    ProfileHeaderView()
                }
                
                // Appearance Section
                Section("Appearance") {
                    Picker("Theme", selection: $themeManager.selectedTheme) {
                        ForEach(ThemeManager.Theme.allCases, id: \.self) { theme in
                            Text(theme.displayName).tag(theme)
                        }
                    }
                    
                    Picker("Accent Color", selection: $themeManager.accentColor) {
                        ForEach(ThemeManager.AccentColor.allCases, id: \.self) { color in
                            HStack {
                                Circle()
                                    .fill(color.color)
                                    .frame(width: 20, height: 20)
                                Text(color.displayName)
                            }
                            .tag(color)
                        }
                    }
                }
                
                // Notifications Section
                Section("Notifications") {
                    Toggle("Push Notifications", isOn: $viewModel.pushNotificationsEnabled)
                    Toggle("Email Notifications", isOn: $viewModel.emailNotificationsEnabled)
                    Toggle("Work Order Alerts", isOn: $viewModel.workOrderAlerts)
                    Toggle("Calibration Reminders", isOn: $viewModel.calibrationReminders)
                }
                
                // Data & Storage Section
                Section("Data & Storage") {
                    HStack {
                        Text("Cache Size")
                        Spacer()
                        Text(viewModel.cacheSize)
                            .foregroundColor(.secondary)
                    }
                    
                    Button(action: { showingClearCacheConfirmation = true }) {
                        HStack {
                            Text("Clear Cache")
                            Spacer()
                            Image(systemName: "trash")
                        }
                    }
                    .foregroundColor(.red)
                    
                    NavigationLink(destination: OfflineDataView()) {
                        HStack {
                            Text("Offline Data")
                            Spacer()
                            Text(viewModel.offlineDataSize)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                // Security Section
                Section("Security") {
                    Button(action: { showingChangePassword = true }) {
                        HStack {
                            Text("Change Password")
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundColor(.secondary)
                        }
                    }
                    .foregroundColor(.primary)
                    
                    Toggle("Biometric Login", isOn: $viewModel.biometricEnabled)
                    
                    Toggle("Auto-Lock", isOn: $viewModel.autoLockEnabled)
                    
                    if viewModel.autoLockEnabled {
                        Picker("Lock After", selection: $viewModel.autoLockInterval) {
                            Text("1 minute").tag(60)
                            Text("5 minutes").tag(300)
                            Text("15 minutes").tag(900)
                            Text("30 minutes").tag(1800)
                        }
                    }
                }
                
                // Sync Section
                Section("Sync") {
                    HStack {
                        Text("Last Sync")
                        Spacer()
                        Text(viewModel.lastSyncTime)
                            .foregroundColor(.secondary)
                    }
                    
                    Button(action: { Task { await viewModel.syncNow() } }) {
                        HStack {
                            Text("Sync Now")
                            Spacer()
                            if viewModel.isSyncing {
                                ProgressView()
                            } else {
                                Image(systemName: "arrow.triangle.2.circlepath")
                            }
                        }
                    }
                    .disabled(viewModel.isSyncing)
                    
                    Toggle("Auto-Sync on WiFi", isOn: $viewModel.autoSyncWiFi)
                }
                
                // About Section
                Section("About") {
                    NavigationLink(destination: AboutView()) {
                        Text("About")
                    }
                    
                    HStack {
                        Text("Version")
                        Spacer()
                        Text(viewModel.appVersion)
                            .foregroundColor(.secondary)
                    }
                    
                    NavigationLink(destination: PrivacyPolicyView()) {
                        Text("Privacy Policy")
                    }
                    
                    NavigationLink(destination: TermsOfServiceView()) {
                        Text("Terms of Service")
                    }
                    
                    Link(destination: URL(string: "mailto:support@maintenance.app")!) {
                        HStack {
                            Text("Contact Support")
                            Spacer()
                            Image(systemName: "envelope")
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                // Logout Section
                Section {
                    Button(action: { showingLogoutConfirmation = true }) {
                        HStack {
                            Spacer()
                            Text("Log Out")
                                .foregroundColor(.red)
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
            .confirmationDialog("Log Out", isPresented: $showingLogoutConfirmation, titleVisibility: .visible) {
                Button("Log Out", role: .destructive) {
                    authManager.logout()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Are you sure you want to log out?")
            }
            .confirmationDialog("Clear Cache", isPresented: $showingClearCacheConfirmation, titleVisibility: .visible) {
                Button("Clear Cache", role: .destructive) {
                    viewModel.clearCache()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This will remove all cached data. You'll need to re-download data when online.")
            }
            .sheet(isPresented: $showingChangePassword) {
                ChangePasswordView()
            }
        }
    }
}

// MARK: - Profile Header View
struct ProfileHeaderView: View {
    @EnvironmentObject var authManager: AuthManager
    
    var body: some View {
        HStack(spacing: 16) {
            // Avatar
            Circle()
                .fill(Color.accentColor.gradient)
                .frame(width: 60, height: 60)
                .overlay(
                    Text(initials)
                        .font(.title2.bold())
                        .foregroundColor(.white)
                )
            
            // User Info
            VStack(alignment: .leading, spacing: 4) {
                Text(authManager.currentUser?.name ?? "User")
                    .font(.headline)
                
                Text(authManager.currentUser?.email ?? "")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                Text(authManager.currentUser?.role ?? "")
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(Color.accentColor.opacity(0.15))
                    .foregroundColor(.accentColor)
                    .cornerRadius(4)
            }
            
            Spacer()
            
            NavigationLink(destination: EditProfileView()) {
                Image(systemName: "pencil.circle.fill")
                    .font(.title2)
                    .foregroundColor(.accentColor)
            }
        }
        .padding(.vertical, 8)
    }
    
    private var initials: String {
        guard let name = authManager.currentUser?.name else { return "U" }
        let parts = name.split(separator: " ")
        if parts.count >= 2 {
            return "\(parts[0].prefix(1))\(parts[1].prefix(1))"
        }
        return String(name.prefix(2)).uppercased()
    }
}

// MARK: - Edit Profile View
struct EditProfileView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var authManager: AuthManager
    @State private var name: String = ""
    @State private var email: String = ""
    @State private var phone: String = ""
    @State private var department: String = ""
    @State private var isSaving = false
    
    var body: some View {
        Form {
            Section("Personal Information") {
                TextField("Full Name", text: $name)
                    .textContentType(.name)
                
                TextField("Email", text: $email)
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .disabled(true)
                    .foregroundColor(.secondary)
                
                TextField("Phone", text: $phone)
                    .keyboardType(.phonePad)
                    .textContentType(.telephoneNumber)
            }
            
            Section("Work Information") {
                TextField("Department", text: $department)
                    .disabled(true)
                    .foregroundColor(.secondary)
                
                if let role = authManager.currentUser?.role {
                    HStack {
                        Text("Role")
                        Spacer()
                        Text(role)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .navigationTitle("Edit Profile")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Save") {
                    saveProfile()
                }
                .disabled(isSaving)
            }
        }
        .onAppear {
            if let user = authManager.currentUser {
                name = user.name
                email = user.email
                department = user.department ?? ""
            }
        }
    }
    
    private func saveProfile() {
        isSaving = true
        // TODO: Implement profile update via API
        dismiss()
    }
}

// MARK: - Change Password View
struct ChangePasswordView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var currentPassword = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var showingCurrentPassword = false
    @State private var showingNewPassword = false
    @State private var isSaving = false
    @State private var errorMessage: String?
    
    var isValid: Bool {
        !currentPassword.isEmpty &&
        newPassword.count >= 8 &&
        newPassword == confirmPassword
    }
    
    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack {
                        if showingCurrentPassword {
                            TextField("Current Password", text: $currentPassword)
                        } else {
                            SecureField("Current Password", text: $currentPassword)
                        }
                        Button(action: { showingCurrentPassword.toggle() }) {
                            Image(systemName: showingCurrentPassword ? "eye.slash" : "eye")
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                Section {
                    HStack {
                        if showingNewPassword {
                            TextField("New Password", text: $newPassword)
                        } else {
                            SecureField("New Password", text: $newPassword)
                        }
                        Button(action: { showingNewPassword.toggle() }) {
                            Image(systemName: showingNewPassword ? "eye.slash" : "eye")
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    SecureField("Confirm New Password", text: $confirmPassword)
                } footer: {
                    VStack(alignment: .leading, spacing: 4) {
                        PasswordRequirement(text: "At least 8 characters", isMet: newPassword.count >= 8)
                        PasswordRequirement(text: "Passwords match", isMet: !confirmPassword.isEmpty && newPassword == confirmPassword)
                    }
                }
                
                if let error = errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Change Password")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        changePassword()
                    }
                    .disabled(!isValid || isSaving)
                }
            }
        }
    }
    
    private func changePassword() {
        isSaving = true
        // TODO: Implement password change via API
        dismiss()
    }
}

struct PasswordRequirement: View {
    let text: String
    let isMet: Bool
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: isMet ? "checkmark.circle.fill" : "circle")
                .foregroundColor(isMet ? .green : .secondary)
                .font(.caption)
            Text(text)
                .font(.caption)
                .foregroundColor(isMet ? .primary : .secondary)
        }
    }
}

// MARK: - Offline Data View
struct OfflineDataView: View {
    @State private var offlineModules: [OfflineModule] = OfflineModule.defaultModules
    
    var body: some View {
        List {
            Section {
                ForEach(offlineModules) { module in
                    HStack {
                        Image(systemName: module.icon)
                            .foregroundColor(.accentColor)
                            .frame(width: 24)
                        
                        Text(module.name)
                        
                        Spacer()
                        
                        Text(module.size)
                            .foregroundColor(.secondary)
                        
                        if module.isSynced {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                        }
                    }
                }
            } header: {
                Text("Cached Modules")
            } footer: {
                Text("Data is cached for offline access. Reports module has full offline sync capability.")
            }
            
            Section {
                Button("Clear All Offline Data", role: .destructive) {
                    // TODO: Clear offline data
                }
            }
        }
        .navigationTitle("Offline Data")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct OfflineModule: Identifiable {
    let id = UUID()
    let name: String
    let icon: String
    let size: String
    let isSynced: Bool
    
    static let defaultModules: [OfflineModule] = [
        OfflineModule(name: "Assets", icon: "building.2", size: "2.4 MB", isSynced: true),
        OfflineModule(name: "Logbook", icon: "book", size: "1.8 MB", isSynced: true),
        OfflineModule(name: "Procurement", icon: "cart", size: "3.2 MB", isSynced: true),
        OfflineModule(name: "Calibration", icon: "dial.high", size: "0.8 MB", isSynced: true),
        OfflineModule(name: "Reports", icon: "doc.text", size: "5.6 MB", isSynced: true),
        OfflineModule(name: "Training", icon: "graduationcap", size: "1.2 MB", isSynced: false)
    ]
}

// MARK: - About View
struct AboutView: View {
    var body: some View {
        List {
            Section {
                VStack(spacing: 16) {
                    Image(systemName: "wrench.and.screwdriver")
                        .font(.system(size: 60))
                        .foregroundColor(.accentColor)
                    
                    Text("Maintenance Manager")
                        .font(.title2.bold())
                    
                    Text("Enterprise Maintenance Management System")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 24)
            }
            
            Section("Features") {
                FeatureRow(icon: "building.2", title: "Asset Management", description: "Track and manage all equipment")
                FeatureRow(icon: "wrench", title: "Work Orders", description: "Create and track maintenance tasks")
                FeatureRow(icon: "dial.high", title: "Calibration", description: "Instrument calibration tracking")
                FeatureRow(icon: "chart.bar", title: "Reports", description: "Generate and analyze reports")
                FeatureRow(icon: "icloud", title: "Offline Sync", description: "Work without internet connection")
            }
            
            Section("Credits") {
                LabeledContent("Developer", value: "Maintenance Team")
                LabeledContent("Version", value: "1.0.0")
                LabeledContent("Build", value: "2024.02.15")
            }
        }
        .navigationTitle("About")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct FeatureRow: View {
    let icon: String
    let title: String
    let description: String
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(.accentColor)
                .frame(width: 32)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.bold())
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Privacy Policy View
struct PrivacyPolicyView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Privacy Policy")
                    .font(.title.bold())
                
                Text("Last updated: February 2024")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                PolicySection(title: "Information We Collect", content: """
                We collect information you provide directly to us, including:
                • Account information (name, email, organization)
                • Usage data and preferences
                • Device information for push notifications
                """)
                
                PolicySection(title: "How We Use Your Information", content: """
                We use the information we collect to:
                • Provide and maintain our services
                • Send you technical notices and support messages
                • Respond to your comments and questions
                """)
                
                PolicySection(title: "Data Security", content: """
                We implement appropriate security measures to protect your personal information. All data is encrypted in transit and at rest.
                """)
                
                PolicySection(title: "Contact Us", content: """
                If you have questions about this Privacy Policy, please contact us at privacy@maintenance.app
                """)
            }
            .padding()
        }
        .navigationTitle("Privacy Policy")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct PolicySection: View {
    let title: String
    let content: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
            
            Text(content)
                .font(.body)
                .foregroundColor(.secondary)
        }
    }
}

// MARK: - Terms of Service View
struct TermsOfServiceView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Terms of Service")
                    .font(.title.bold())
                
                Text("Last updated: February 2024")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                PolicySection(title: "Acceptance of Terms", content: """
                By accessing or using the Maintenance Manager application, you agree to be bound by these Terms of Service.
                """)
                
                PolicySection(title: "Use of Service", content: """
                You agree to use the service only for lawful purposes and in accordance with these Terms. You are responsible for maintaining the confidentiality of your account credentials.
                """)
                
                PolicySection(title: "Intellectual Property", content: """
                The service and its original content, features, and functionality are owned by Maintenance Manager and are protected by international copyright, trademark, and other intellectual property laws.
                """)
                
                PolicySection(title: "Limitation of Liability", content: """
                In no event shall Maintenance Manager be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.
                """)
            }
            .padding()
        }
        .navigationTitle("Terms of Service")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Settings ViewModel
@MainActor
class SettingsViewModel: ObservableObject {
    @Published var pushNotificationsEnabled = true
    @Published var emailNotificationsEnabled = true
    @Published var workOrderAlerts = true
    @Published var calibrationReminders = true
    @Published var biometricEnabled = false
    @Published var autoLockEnabled = true
    @Published var autoLockInterval = 300
    @Published var autoSyncWiFi = true
    @Published var isSyncing = false
    
    var cacheSize: String {
        let size = CacheManager.shared.getCacheSize()
        return formatBytes(size)
    }
    
    var offlineDataSize: String {
        // TODO: Calculate actual offline data size
        return "15.2 MB"
    }
    
    var lastSyncTime: String {
        if let lastSync = UserDefaults.standard.object(forKey: "lastSyncTime") as? Date {
            return lastSync.formatted(date: .abbreviated, time: .shortened)
        }
        return "Never"
    }
    
    var appVersion: String {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
        return "\(version) (\(build))"
    }
    
    func clearCache() {
        CacheManager.shared.clearAll()
    }
    
    func syncNow() async {
        isSyncing = true
        defer { isSyncing = false }
        
        // Simulate sync delay
        try? await Task.sleep(nanoseconds: 2_000_000_000)
        
        UserDefaults.standard.set(Date(), forKey: "lastSyncTime")
    }
    
    private func formatBytes(_ bytes: Int64) -> String {
        let formatter = ByteCountFormatter()
        formatter.countStyle = .file
        return formatter.string(fromByteCount: bytes)
    }
}

// MARK: - Cache Manager Extension
extension CacheManager {
    func getCacheSize() -> Int64 {
        guard let cacheURL = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first else {
            return 0
        }
        
        let appCacheURL = cacheURL.appendingPathComponent("MaintenanceAppCache")
        
        guard let enumerator = FileManager.default.enumerator(at: appCacheURL, includingPropertiesForKeys: [.fileSizeKey]) else {
            return 0
        }
        
        var totalSize: Int64 = 0
        
        for case let fileURL as URL in enumerator {
            if let fileSize = try? fileURL.resourceValues(forKeys: [.fileSizeKey]).fileSize {
                totalSize += Int64(fileSize)
            }
        }
        
        return totalSize
    }
    
}

#Preview {
    SettingsView()
        .environmentObject(AuthManager())
        .environmentObject(ThemeManager())
}
