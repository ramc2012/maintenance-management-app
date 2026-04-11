import Foundation

// MARK: - Material Requirement
struct MaterialRequirement: Codable, Identifiable {
    let id: String
    let requirementNumber: String
    let title: String
    var description: String?
    let vendorId: String
    let vendorName: String
    let status: String
    let priority: String
    var quantity: Double?
    var unit: String?
    var estimatedCost: Double?
    var requiredDate: Date?
    var departmentId: String?
    var installationId: String?
    var equipmentTag: String?
    var workOrderRef: String?
    let isDraft: Bool
    let createdBy: String
    var createdAt: Date?
    var updatedAt: Date?
    
    var statusEnum: RequirementStatus? {
        RequirementStatus(rawValue: status)
    }
    
    var priorityEnum: WorkOrderPriority? {
        WorkOrderPriority(rawValue: priority)
    }
}

// MARK: - Requirement Status
enum RequirementStatus: String, CaseIterable, Codable {
    case draft = "DRAFT"
    case submitted = "SUBMITTED"
    case approved = "APPROVED"
    case ordered = "ORDERED"
    case received = "RECEIVED"
    case cancelled = "CANCELLED"
    
    var displayName: String {
        rawValue.capitalized
    }
}

// MARK: - Vendor
struct Vendor: Codable, Identifiable, Hashable {
    let id: String
    let vendorCode: String
    let name: String
    var address: String?
    var contactPerson: String?
    var phone: String?
    var email: String?
    let isActive: Bool
    var createdAt: Date?
    var updatedAt: Date?
}

// MARK: - Create Requirement Request
struct CreateRequirementRequest: Codable {
    let title: String
    var description: String?
    let vendorId: String
    let vendorName: String
    let priority: String
    var quantity: Double?
    var unit: String?
    var estimatedCost: Double?
    var requiredDate: Date?
    var departmentId: String?
    var installationId: String?
    var equipmentTag: String?
    var workOrderRef: String?
    let isDraft: Bool
}

// MARK: - Update Requirement Request
struct UpdateRequirementRequest: Codable {
    var title: String?
    var description: String?
    var status: String?
    var priority: String?
    var quantity: Double?
    var unit: String?
    var estimatedCost: Double?
    var requiredDate: Date?
    var isDraft: Bool?
}

// MARK: - MRP Dashboard Summary
struct MRPDashboardSummary: Codable {
    let totalRequirements: Int
    let draftCount: Int
    let submittedCount: Int
    let approvedCount: Int
    let orderedCount: Int
    let recentRequirements: [MaterialRequirement]
    let requirementsByVendor: [String: Int]
}
