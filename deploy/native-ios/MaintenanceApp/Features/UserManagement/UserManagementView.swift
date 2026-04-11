import SwiftUI

// MARK: - User Management Hub View
struct UserManagementView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var selectedSection: UserManagementSection = .users
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Section Picker
                Picker("Section", selection: $selectedSection) {
                    ForEach(UserManagementSection.allCases, id: \.self) { section in
                        Text(section.title).tag(section)
                    }
                }
                .pickerStyle(.segmented)
                .padding()
                
                // Content
                switch selectedSection {
                case .users:
                    UserListView()
                case .roles:
                    RoleManagementView()
                case .permissions:
                    PermissionMatrixView()
                }
            }
            .navigationTitle("User Management")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

enum UserManagementSection: String, CaseIterable {
    case users
    case roles
    case permissions
    
    var title: String {
        switch self {
        case .users: return "Users"
        case .roles: return "Roles"
        case .permissions: return "Permissions"
        }
    }
}

// MARK: - User List View
struct UserListView: View {
    @StateObject private var viewModel = UserListViewModel()
    @State private var searchText = ""
    @State private var selectedRole: String = "All"
    @State private var showingAddUser = false
    @State private var selectedUser: User?
    
    private let roles = ["All", "Admin", "Manager", "Engineer", "Operator", "Viewer"]
    
    var filteredUsers: [User] {
        viewModel.users.filter { user in
            let matchesSearch = searchText.isEmpty ||
                user.name.localizedCaseInsensitiveContains(searchText) ||
                user.email.localizedCaseInsensitiveContains(searchText)
            let matchesRole = selectedRole == "All" || user.role == selectedRole
            return matchesSearch && matchesRole
        }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Filter Bar
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(roles, id: \.self) { role in
                        FilterChip(
                            title: role,
                            isSelected: selectedRole == role,
                            action: { selectedRole = role }
                        )
                    }
                }
                .padding(.horizontal)
            }
            .padding(.vertical, 8)
            
            // User List
            if viewModel.isLoading {
                ProgressView("Loading users...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if filteredUsers.isEmpty {
                EmptyStateView(
                    icon: "person.3",
                    title: "No Users Found",
                    message: searchText.isEmpty ? "No users match the selected filter" : "No users match your search"
                )
            } else {
                List {
                    ForEach(filteredUsers) { user in
                        UserRowView(user: user)
                            .contentShape(Rectangle())
                            .onTapGesture {
                                selectedUser = user
                            }
                    }
                }
                .listStyle(.plain)
            }
        }
        .searchable(text: $searchText, prompt: "Search users...")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: { showingAddUser = true }) {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showingAddUser) {
            AddUserView()
        }
        .sheet(item: $selectedUser) { user in
            UserDetailView(user: user)
        }
        .task {
            await viewModel.loadUsers()
        }
    }
}

// MARK: - User Row View
struct UserRowView: View {
    let user: User
    
    var body: some View {
        HStack(spacing: 12) {
            // Avatar
            Circle()
                .fill(avatarColor)
                .frame(width: 44, height: 44)
                .overlay(
                    Text(user.name.prefix(2).uppercased())
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                )
            
            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(user.name)
                    .font(.headline)
                
                Text(user.email)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            // Role Badge
            Text(user.role)
                .font(.caption)
                .fontWeight(.medium)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(roleColor.opacity(0.15))
                .foregroundColor(roleColor)
                .cornerRadius(4)
            
            // Status Indicator
            Circle()
                .fill(user.isActive ? Color.green : Color.gray)
                .frame(width: 8, height: 8)
        }
        .padding(.vertical, 4)
    }
    
    private var avatarColor: Color {
        let colors: [Color] = [.blue, .green, .orange, .purple, .pink, .teal]
        let index = abs(user.name.hashValue) % colors.count
        return colors[index]
    }
    
    private var roleColor: Color {
        switch user.role.lowercased() {
        case "admin": return .red
        case "manager": return .purple
        case "engineer": return .blue
        case "operator": return .green
        default: return .gray
        }
    }
}

// MARK: - User Detail View
struct UserDetailView: View {
    @Environment(\.dismiss) private var dismiss
    let user: User
    @State private var isEditing = false
    @State private var editedName: String = ""
    @State private var editedEmail: String = ""
    @State private var editedRole: String = ""
    @State private var isActive: Bool = true
    
    private let roles = ["Admin", "Manager", "Engineer", "Operator", "Viewer"]
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Profile") {
                    if isEditing {
                        TextField("Name", text: $editedName)
                        TextField("Email", text: $editedEmail)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                    } else {
                        LabeledContent("Name", value: user.name)
                        LabeledContent("Email", value: user.email)
                    }
                }
                
                Section("Role & Access") {
                    if isEditing {
                        Picker("Role", selection: $editedRole) {
                            ForEach(roles, id: \.self) { role in
                                Text(role).tag(role)
                            }
                        }
                        Toggle("Active", isOn: $isActive)
                    } else {
                        LabeledContent("Role", value: user.role)
                        LabeledContent("Status", value: user.isActive ? "Active" : "Inactive")
                    }
                }
                
                Section("Organization") {
                    if let org = user.organization {
                        LabeledContent("Organization", value: org.name)
                    }
                    if let dept = user.department {
                        LabeledContent("Department", value: dept)
                    }
                }
                
                Section("Activity") {
                    LabeledContent("Created", value: user.createdAt.formatted(date: .abbreviated, time: .shortened))
                    if let lastLogin = user.lastLoginAt {
                        LabeledContent("Last Login", value: lastLogin.formatted(date: .abbreviated, time: .shortened))
                    }
                }
                
                if !isEditing {
                    Section {
                        Button(action: resetPassword) {
                            Label("Reset Password", systemImage: "key")
                        }
                        
                        Button(role: .destructive, action: deactivateUser) {
                            Label(user.isActive ? "Deactivate User" : "Activate User", systemImage: user.isActive ? "person.slash" : "person.badge.plus")
                        }
                    }
                }
            }
            .navigationTitle(isEditing ? "Edit User" : "User Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    if isEditing {
                        Button("Cancel") {
                            isEditing = false
                        }
                    } else {
                        Button("Close") {
                            dismiss()
                        }
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    if isEditing {
                        Button("Save") {
                            saveChanges()
                        }
                    } else {
                        Button("Edit") {
                            startEditing()
                        }
                    }
                }
            }
        }
    }
    
    private func startEditing() {
        editedName = user.name
        editedEmail = user.email
        editedRole = user.role
        isActive = user.isActive
        isEditing = true
    }
    
    private func saveChanges() {
        // TODO: Implement save via API
        isEditing = false
    }
    
    private func resetPassword() {
        // TODO: Implement password reset
    }
    
    private func deactivateUser() {
        // TODO: Implement user activation toggle
    }
}

// MARK: - Add User View
struct AddUserView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var email = ""
    @State private var role = "Viewer"
    @State private var department = ""
    @State private var sendInvite = true
    @State private var isSaving = false
    
    private let roles = ["Admin", "Manager", "Engineer", "Operator", "Viewer"]
    
    var isValid: Bool {
        !name.isEmpty && !email.isEmpty && email.contains("@")
    }
    
    var body: some View {
        NavigationStack {
            Form {
                Section("User Information") {
                    TextField("Full Name", text: $name)
                        .textContentType(.name)
                    
                    TextField("Email Address", text: $email)
                        .keyboardType(.emailAddress)
                        .textContentType(.emailAddress)
                        .textInputAutocapitalization(.never)
                }
                
                Section("Role & Department") {
                    Picker("Role", selection: $role) {
                        ForEach(roles, id: \.self) { role in
                            Text(role).tag(role)
                        }
                    }
                    
                    TextField("Department (Optional)", text: $department)
                }
                
                Section {
                    Toggle("Send Invitation Email", isOn: $sendInvite)
                } footer: {
                    Text("User will receive an email with login instructions")
                }
            }
            .navigationTitle("Add User")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Add") {
                        addUser()
                    }
                    .disabled(!isValid || isSaving)
                }
            }
        }
    }
    
    private func addUser() {
        isSaving = true
        // TODO: Implement user creation via API
        dismiss()
    }
}

// MARK: - Role Management View
struct RoleManagementView: View {
    @State private var roles: [RoleDefinition] = RoleDefinition.defaultRoles
    @State private var selectedRole: RoleDefinition?
    
    var body: some View {
        List {
            ForEach(roles) { role in
                RoleRowView(role: role)
                    .contentShape(Rectangle())
                    .onTapGesture {
                        selectedRole = role
                    }
            }
        }
        .listStyle(.plain)
        .sheet(item: $selectedRole) { role in
            RoleDetailView(role: role)
        }
    }
}

struct RoleDefinition: Identifiable {
    let id = UUID()
    let name: String
    let description: String
    let color: Color
    let permissions: [String]
    let userCount: Int
    
    static let defaultRoles: [RoleDefinition] = [
        RoleDefinition(name: "Admin", description: "Full system access", color: .red, permissions: ["All"], userCount: 2),
        RoleDefinition(name: "Manager", description: "Department management", color: .purple, permissions: ["View", "Create", "Edit", "Approve"], userCount: 8),
        RoleDefinition(name: "Engineer", description: "Technical operations", color: .blue, permissions: ["View", "Create", "Edit"], userCount: 25),
        RoleDefinition(name: "Operator", description: "Daily operations", color: .green, permissions: ["View", "Create"], userCount: 45),
        RoleDefinition(name: "Viewer", description: "Read-only access", color: .gray, permissions: ["View"], userCount: 12)
    ]
}

struct RoleRowView: View {
    let role: RoleDefinition
    
    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(role.color)
                .frame(width: 40, height: 40)
                .overlay(
                    Image(systemName: iconForRole(role.name))
                        .foregroundColor(.white)
                )
            
            VStack(alignment: .leading, spacing: 4) {
                Text(role.name)
                    .font(.headline)
                
                Text(role.description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 2) {
                Text("\(role.userCount)")
                    .font(.headline)
                Text("users")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Image(systemName: "chevron.right")
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
    
    private func iconForRole(_ name: String) -> String {
        switch name.lowercased() {
        case "admin": return "shield.fill"
        case "manager": return "person.2.fill"
        case "engineer": return "wrench.fill"
        case "operator": return "gearshape.fill"
        default: return "eye.fill"
        }
    }
}

struct RoleDetailView: View {
    @Environment(\.dismiss) private var dismiss
    let role: RoleDefinition
    
    var body: some View {
        NavigationStack {
            List {
                Section("Description") {
                    Text(role.description)
                }
                
                Section("Permissions") {
                    ForEach(role.permissions, id: \.self) { permission in
                        Label(permission, systemImage: "checkmark.circle.fill")
                            .foregroundColor(.green)
                    }
                }
                
                Section("Statistics") {
                    LabeledContent("Active Users", value: "\(role.userCount)")
                }
            }
            .navigationTitle(role.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Permission Matrix View
struct PermissionMatrixView: View {
    let modules = ["Assets", "Logbook", "Procurement", "Calibration", "Workshop", "Training", "MOH", "Energy", "Reports", "MRP"]
    let permissions = ["View", "Create", "Edit", "Delete", "Approve"]
    let roles = ["Admin", "Manager", "Engineer", "Operator", "Viewer"]
    
    var body: some View {
        ScrollView([.horizontal, .vertical]) {
            VStack(alignment: .leading, spacing: 0) {
                // Header Row
                HStack(spacing: 0) {
                    Text("Module")
                        .font(.caption.bold())
                        .frame(width: 100, alignment: .leading)
                        .padding(8)
                    
                    ForEach(roles, id: \.self) { role in
                        Text(role)
                            .font(.caption.bold())
                            .frame(width: 70)
                            .padding(8)
                    }
                }
                .background(Color(.systemGray5))
                
                Divider()
                
                // Module Rows
                ForEach(modules, id: \.self) { module in
                    HStack(spacing: 0) {
                        Text(module)
                            .font(.caption)
                            .frame(width: 100, alignment: .leading)
                            .padding(8)
                        
                        ForEach(roles, id: \.self) { role in
                            PermissionIndicator(
                                hasAccess: hasPermission(module: module, role: role)
                            )
                            .frame(width: 70)
                            .padding(8)
                        }
                    }
                    
                    Divider()
                }
            }
        }
        .padding()
    }
    
    private func hasPermission(module: String, role: String) -> Bool {
        switch role {
        case "Admin": return true
        case "Manager": return true
        case "Engineer": return !["Procurement"].contains(module)
        case "Operator": return ["Assets", "Logbook", "Reports"].contains(module)
        case "Viewer": return true
        default: return false
        }
    }
}

struct PermissionIndicator: View {
    let hasAccess: Bool
    
    var body: some View {
        Image(systemName: hasAccess ? "checkmark.circle.fill" : "minus.circle")
            .foregroundColor(hasAccess ? .green : .gray.opacity(0.5))
    }
}

// MARK: - User List ViewModel
@MainActor
class UserListViewModel: ObservableObject {
    @Published var users: [User] = []
    @Published var isLoading = false
    @Published var error: String?
    
    func loadUsers() async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            users = try await APIClient.shared.get(APIEndpoints.Users.list)
        } catch {
            self.error = error.localizedDescription
            // Load sample data for demo
            users = User.sampleUsers
        }
    }
}

// MARK: - Sample Data
extension User {
    static var sampleUsers: [User] {
        [
            User(id: "1", name: "John Admin", email: "john.admin@example.com", role: "Admin", isActive: true, organization: nil, department: "IT", createdAt: Date(), lastLoginAt: Date()),
            User(id: "2", name: "Sarah Manager", email: "sarah.manager@example.com", role: "Manager", isActive: true, organization: nil, department: "Operations", createdAt: Date(), lastLoginAt: Date()),
            User(id: "3", name: "Mike Engineer", email: "mike.engineer@example.com", role: "Engineer", isActive: true, organization: nil, department: "Maintenance", createdAt: Date(), lastLoginAt: Date().addingTimeInterval(-86400)),
            User(id: "4", name: "Lisa Operator", email: "lisa.operator@example.com", role: "Operator", isActive: true, organization: nil, department: "Production", createdAt: Date(), lastLoginAt: Date().addingTimeInterval(-3600)),
            User(id: "5", name: "Tom Viewer", email: "tom.viewer@example.com", role: "Viewer", isActive: false, organization: nil, department: "QA", createdAt: Date(), lastLoginAt: nil)
        ]
    }
}

// MARK: - Filter Chip Component
private struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? Color.accentColor : Color(.systemGray5))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(16)
        }
    }
}

#Preview {
    UserManagementView()
        .environmentObject(AuthManager())
}
