import Foundation
import SwiftUI

// MARK: - Auth Manager
@MainActor
class AuthManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var isLoading = false
    @Published var error: String?
    
    private let apiClient = APIClient.shared
    
    init() {
        // TEMPORARY: Auto-login for UI testing - Remove this for production!
        let mockUser = User(
            id: "1",
            username: "admin",
            email: "admin@company.com",
            firstName: "John",
            lastName: "Doe",
            role: "ADMIN",
            departmentId: "dept1"
        )
        self.currentUser = mockUser
        self.isAuthenticated = true
        
        /* ORIGINAL CODE - Uncomment when backend is ready:
        // Check for existing token on init
        checkExistingSession()
        
        // Listen for session expiry
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleSessionExpired),
            name: .authSessionExpired,
            object: nil
        )
        */
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
    
    // MARK: - Check Existing Session
    private func checkExistingSession() {
        guard let token = KeychainManager.shared.getToken(),
              let userData = KeychainManager.shared.getUserData(),
              let user = try? JSONDecoder().decode(User.self, from: userData) else {
            return
        }
        
        // Validate token is not empty
        guard !token.isEmpty else {
            logout()
            return
        }
        
        self.currentUser = user
        self.isAuthenticated = true
    }
    
    // MARK: - Login
    func login(username: String, password: String) async {
        isLoading = true
        error = nil
        
        do {
            let request = LoginRequest(username: username, password: password)
            let response: LoginResponse = try await apiClient.request(
                .login,
                method: .post,
                body: request
            )
            
            // Save token and user data
            KeychainManager.shared.saveToken(response.token)
            if let userData = try? JSONEncoder().encode(response.user) {
                KeychainManager.shared.saveUserData(userData)
            }
            
            self.currentUser = response.user
            self.isAuthenticated = true
            self.isLoading = false
        } catch let apiError as APIError {
            self.error = apiError.errorDescription
            self.isLoading = false
        } catch {
            self.error = "Login failed. Please try again."
            self.isLoading = false
        }
    }
    
    // MARK: - Logout
    func logout() {
        KeychainManager.shared.deleteToken()
        KeychainManager.shared.deleteUserData()
        CacheManager.shared.clearAll()
        
        currentUser = nil
        isAuthenticated = false
        error = nil
    }
    
    // MARK: - Change Password
    func changePassword(currentPassword: String, newPassword: String) async throws {
        let request = ChangePasswordRequest(
            currentPassword: currentPassword,
            newPassword: newPassword
        )
        
        try await apiClient.requestVoid(
            .changePassword,
            method: .post,
            body: request
        )
    }
    
    // MARK: - Handle Session Expired
    @objc private func handleSessionExpired() {
        Task { @MainActor in
            logout()
            error = "Your session has expired. Please login again."
        }
    }
    
    // MARK: - Check Admin Role
    var isAdmin: Bool {
        currentUser?.role.uppercased() == "ADMIN"
    }
}
