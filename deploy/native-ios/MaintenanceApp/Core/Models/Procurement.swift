import Foundation

// MARK: - Case (Procurement Case)
struct ProcurementCase: Codable, Identifiable {
    let id: String
    let title: String
    let type: String
    let currentStage: String
    var updatedAt: Date?
    var createdAt: Date?
    let createdBy: String
    var vendor: String?
    var vendorCode: String?
    var prValue: Double?
    var poValue: Double?
    let currency: String
    var prNumber: String?
    var poNumber: String?
    var sanctionFileNumber: String?
    var tenderingFileNumber: String?
    var procurementMethod: String?
    var category: String?
    var value: Double?
    var tag: String?
    var processedBy: String?
    var departmentId: String?
    
    // Relationships
    var department: Department?
    var comments: [CaseComment]?
    
    var stageEnum: CaseStage? {
        CaseStage(rawValue: currentStage)
    }
    
    var categoryEnum: ProcurementCategory? {
        guard let category = category else { return nil }
        return ProcurementCategory(rawValue: category)
    }
    
    var displayValue: Double {
        poValue ?? prValue ?? value ?? 0
    }
}

// MARK: - Case Comment
struct CaseComment: Codable, Identifiable {
    let id: String
    let content: String
    let timestamp: Date
    var effectiveDate: Date?
    let caseId: String
    let userId: String
    var stageSnapshot: String?
    
    // Relationships
    var user: User?
}

// MARK: - Case Analytics
struct CaseAnalytics: Codable {
    let fy: String
    let activeCount: Int
    let closedCount: Int
    let valueBreakdown: [String: Double]
    let categoryBreakdown: [CategoryBreakdown]?
}

struct CategoryBreakdown: Codable {
    let category: String
    let count: Int
    let totalValue: Double
}

// MARK: - Create Case Request
struct CreateCaseRequest: Codable {
    let title: String
    let type: String
    let category: String?
    var vendor: String?
    var vendorCode: String?
    var prValue: Double?
    var poValue: Double?
    let currency: String
    var prNumber: String?
    var poNumber: String?
    var sanctionFileNumber: String?
    var tenderingFileNumber: String?
    var procurementMethod: String?
    var tag: String?
    var departmentId: String?
}

// MARK: - Update Case Request
struct UpdateCaseRequest: Codable {
    var title: String?
    var currentStage: String?
    var vendor: String?
    var vendorCode: String?
    var prValue: Double?
    var poValue: Double?
    var currency: String?
    var prNumber: String?
    var poNumber: String?
    var sanctionFileNumber: String?
    var tenderingFileNumber: String?
    var procurementMethod: String?
    var category: String?
    var tag: String?
    var processedBy: String?
}

// MARK: - Add Comment Request
struct AddCommentRequest: Codable {
    let content: String
    var effectiveDate: Date?
}
