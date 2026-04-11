import Foundation

struct User: Codable, Identifiable {
    let id: String
    let username: String
    var email: String
    var firstName: String?
    var lastName: String?
    let role: String
    var departmentId: String?
    var department: String?
    var organization: Company?
    var isActive: Bool = true
    var createdAt: Date = .now
    var lastLoginAt: Date?
    var lastLogin: Date? {
        lastLoginAt
    }

    var name: String {
        if let firstName, let lastName, !firstName.isEmpty, !lastName.isEmpty {
            return "\(firstName) \(lastName)"
        }

        if let firstName, !firstName.isEmpty {
            return firstName
        }

        if let lastName, !lastName.isEmpty {
            return lastName
        }

        return username
    }
    
    var isAdmin: Bool {
        role.uppercased() == "ADMIN"
    }
}

// MARK: - Login Request
struct LoginRequest: Codable {
    let username: String
    let password: String
}

// MARK: - Login Response
struct LoginResponse: Codable {
    let token: String
    let user: User
}

// MARK: - Change Password Request
struct ChangePasswordRequest: Codable {
    let currentPassword: String
    let newPassword: String
}

// MARK: - API Response Wrappers
struct APIResponse<T: Codable>: Codable {
    let success: Bool
    let data: T?
    let message: String?
}

struct PaginatedResponse<T: Codable>: Codable {
    let data: [T]
    let total: Int
    let page: Int
    let limit: Int
    let totalPages: Int
}
