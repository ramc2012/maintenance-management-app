import Foundation

// MARK: - Workshop Job
struct WorkshopJob: Codable, Identifiable {
    let id: String
    let jobNumber: String
    let shopType: String
    var installationId: String?
    let title: String
    var description: String?
    let requestedBy: String
    let requestDate: Date
    let priority: String
    var estimatedHours: Double?
    var actualHours: Double?
    var materialCost: Double?
    var laborCost: Double?
    var totalCost: Double?
    let status: String
    var assignedTo: String?
    var startDate: Date?
    var completedDate: Date?
    var equipmentTag: String?
    var workOrderRef: String?
    var remarks: String?
    let createdBy: String
    var createdAt: Date?
    var updatedAt: Date?
    
    var shopTypeEnum: WorkshopShopType? {
        WorkshopShopType(rawValue: shopType)
    }
    
    var priorityEnum: WorkOrderPriority? {
        WorkOrderPriority(rawValue: priority)
    }
    
    var statusEnum: JobStatus? {
        JobStatus(rawValue: status)
    }
}

// MARK: - Job Status
enum JobStatus: String, CaseIterable, Codable {
    case pending = "PENDING"
    case inProgress = "IN_PROGRESS"
    case onHold = "ON_HOLD"
    case completed = "COMPLETED"
    case cancelled = "CANCELLED"
    
    var displayName: String {
        switch self {
        case .pending: return "Pending"
        case .inProgress: return "In Progress"
        case .onHold: return "On Hold"
        case .completed: return "Completed"
        case .cancelled: return "Cancelled"
        }
    }
}

// MARK: - Create Workshop Job Request
struct CreateWorkshopJobRequest: Codable {
    let shopType: String
    var installationId: String?
    let title: String
    var description: String?
    let requestedBy: String
    let requestDate: Date
    let priority: String
    var estimatedHours: Double?
    var equipmentTag: String?
    var workOrderRef: String?
    var remarks: String?
}

// MARK: - Update Workshop Job Request
struct UpdateWorkshopJobRequest: Codable {
    var title: String?
    var description: String?
    var priority: String?
    var status: String?
    var assignedTo: String?
    var startDate: Date?
    var completedDate: Date?
    var actualHours: Double?
    var materialCost: Double?
    var laborCost: Double?
    var totalCost: Double?
    var remarks: String?
}

// MARK: - Workshop Dashboard Summary
struct WorkshopDashboardSummary: Codable {
    let totalJobs: Int
    let pendingJobs: Int
    let inProgressJobs: Int
    let completedJobs: Int
    let jobsByShop: [String: Int]
    let recentJobs: [WorkshopJob]
}
