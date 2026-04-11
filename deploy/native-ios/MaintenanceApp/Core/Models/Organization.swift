import Foundation

// MARK: - Company
struct Company: Codable, Identifiable {
    let id: String
    let name: String
    var departments: [Department]?
}

// MARK: - Department
struct Department: Codable, Identifiable {
    let id: String
    let name: String
    let companyId: String
    var company: Company?
    var users: [User]?
}

// MARK: - Organization Hierarchy Response
struct OrgHierarchyResponse: Codable {
    let companies: [Company]
}

// MARK: - Installation (Location/Facility)
struct Installation: Codable, Identifiable, Hashable {
    let id: String
    let installationId: String
    let location: String
    let type: String
    let isActive: Bool
    var createdAt: Date?
    var updatedAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case installationId
        case location
        case type
        case isActive
        case createdAt
        case updatedAt
    }
}

// MARK: - Budget
struct Budget: Codable, Identifiable {
    let id: String
    var departmentId: String?
    let fy: String
    let category: String
    let amount: Double
    let isIndicative: Bool
    var createdAt: Date?
    var updatedAt: Date?
    
    var categoryEnum: ProcurementCategory? {
        ProcurementCategory(rawValue: category)
    }
}

// MARK: - Budget Summary
struct BudgetSummary: Codable {
    let category: String
    let totalBudget: Double
    let utilized: Double
    let available: Double
    
    var utilizationPercentage: Double {
        guard totalBudget > 0 else { return 0 }
        return (utilized / totalBudget) * 100
    }
}
