import Foundation

// MARK: - MOH Record (Major Overhaul)
struct MOHRecord: Codable, Identifiable {
    let id: String
    let mohNumber: String
    let installationId: String
    var equipmentId: String?
    let equipmentTag: String
    let equipmentName: String
    var lastMOHDate: Date?
    var currentRunHours: Double?
    var dCheckInterval: Double?
    var nextMOHDue: Date?
    let status: String
    let priority: String
    var plannedStartDate: Date?
    var actualStartDate: Date?
    var completedDate: Date?
    var estimatedCost: Double?
    var actualCost: Double?
    var procurementCaseId: String?
    var workOrderId: String?
    var scopeOfWork: String?
    var findings: String?
    var actionsTaken: String?
    var assignedTo: String?
    let createdBy: String
    var createdAt: Date?
    var updatedAt: Date?
    
    var statusEnum: MOHStatus? {
        MOHStatus(rawValue: status)
    }
    
    var priorityEnum: WorkOrderPriority? {
        WorkOrderPriority(rawValue: priority)
    }
    
    var isOverdue: Bool {
        guard let nextDue = nextMOHDue, status == "PLANNED" else { return false }
        return Date() > nextDue
    }
    
    var daysUntilDue: Int? {
        guard let nextDue = nextMOHDue else { return nil }
        return Calendar.current.dateComponents([.day], from: Date(), to: nextDue).day
    }
}

// MARK: - Create MOH Request
struct CreateMOHRequest: Codable {
    let installationId: String
    var equipmentId: String?
    let equipmentTag: String
    let equipmentName: String
    var lastMOHDate: Date?
    var currentRunHours: Double?
    var dCheckInterval: Double?
    var nextMOHDue: Date?
    let priority: String
    var plannedStartDate: Date?
    var estimatedCost: Double?
    var scopeOfWork: String?
    var assignedTo: String?
}

// MARK: - Update MOH Request
struct UpdateMOHRequest: Codable {
    var status: String?
    var priority: String?
    var plannedStartDate: Date?
    var actualStartDate: Date?
    var completedDate: Date?
    var estimatedCost: Double?
    var actualCost: Double?
    var procurementCaseId: String?
    var workOrderId: String?
    var scopeOfWork: String?
    var findings: String?
    var actionsTaken: String?
    var assignedTo: String?
}

// MARK: - MOH Dashboard Summary
struct MOHDashboardSummary: Codable {
    let totalRecords: Int
    let plannedCount: Int
    let inProgressCount: Int
    let completedCount: Int
    let overdueCount: Int
    let criticalCount: Int
    let upcomingMOHs: [MOHRecord]
    let overdueMOHs: [MOHRecord]
}
