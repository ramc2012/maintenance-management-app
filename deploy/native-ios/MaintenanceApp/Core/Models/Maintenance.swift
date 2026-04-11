import Foundation

// MARK: - Maintenance Log
struct MaintenanceLog: Codable, Identifiable {
    let id: String
    let date: Date
    let installationId: String
    let department: String
    let section: String
    let jobType: String
    let reportCriticality: Int
    var equipmentTag: String?
    var equipmentTypeName: String?
    var serviceLine: String?
    var notificationNo: String?
    let description: String
    let status: String
    let startTime: Date
    let endTime: Date
    let durationHours: Double
    var remarks: String?
    var assignedBy: String?
    var assignedAt: Date?
    var bdReportTime: Date?
    var teamReportTime: Date?
    var jobCompletionTime: Date?
    let createdBy: String
    var pmsScheduleId: String?
    var createdAt: Date?
    var updatedAt: Date?
    
    // Relationships
    var installation: Installation?
    var teamMembers: [MaintenanceLogTeamMember]?
    
    var jobTypeEnum: MaintenanceJobType? {
        MaintenanceJobType(rawValue: jobType)
    }
    
    var criticalityLevel: String {
        switch reportCriticality {
        case 1: return "Routine"
        case 2: return "Monthly"
        case 3: return "Annual"
        default: return "Unknown"
        }
    }
}

// MARK: - Maintenance Log Team Member
struct MaintenanceLogTeamMember: Codable, Identifiable {
    let id: String
    let maintenanceLogId: String
    let manpowerId: String
    var manpower: Manpower?
}

// MARK: - Manpower
struct Manpower: Codable, Identifiable, Hashable {
    let id: String
    let employeeId: String
    let name: String
    let department: String
    var section: String?
    var designation: String?
    let isActive: Bool
    var createdAt: Date?
    var updatedAt: Date?
}

// MARK: - Work Order
struct WorkOrder: Codable, Identifiable {
    let id: String
    let woNumber: String
    let flId: String
    var assignmentId: String?
    let woType: String
    let priority: String
    let status: String
    let description: String
    var scheduledDate: Date?
    var startDate: Date?
    var completionDate: Date?
    var failureMode: String?
    var causeCode: String?
    var actionTaken: String?
    var meterReading: Double?
    var labourHours: Double?
    var downtime: Double?
    var remarks: String?
    var assignedBy: String?
    var assignedAt: Date?
    var closedBy: String?
    let createdBy: String
    var failureMechanism: String?
    var createdAt: Date?
    var updatedAt: Date?
    
    // Relationships
    var functionalLocation: FunctionalLocation?
    
    var statusEnum: WorkOrderStatus? {
        WorkOrderStatus(rawValue: status)
    }
    
    var priorityEnum: WorkOrderPriority? {
        WorkOrderPriority(rawValue: priority)
    }
    
    var typeEnum: WorkOrderType? {
        WorkOrderType(rawValue: woType)
    }
}

// MARK: - PM Schedule
struct PMSchedule: Codable, Identifiable {
    let id: String
    let frequency: String
    let taskDescription: String
    var instrumentTypeId: String?
    var equipmentTypeId: String?
    let alertLeadTime: Double
    var createdAt: Date?
    var updatedAt: Date?
}

// MARK: - PMS Initial State
struct PMSInitialState: Codable, Identifiable {
    let id: String
    let equipmentTag: String
    let pmsScheduleId: String
    let initialLastDoneHours: Double
    var createdAt: Date?
    var updatedAt: Date?
}

// MARK: - Maintenance Strategy
struct MaintenanceStrategy: Codable, Identifiable {
    let id: String
    let name: String
    var assetClass: String?
    var description: String?
    let isActive: Bool
    var tasks: [StrategyTask]?
    var createdAt: Date?
    var updatedAt: Date?
}

// MARK: - Strategy Task
struct StrategyTask: Codable, Identifiable {
    let id: String
    let strategyId: String
    let taskCode: String
    let description: String
    let sequence: Int
    var estimatedHours: Double?
    var skillRequired: String?
    var createdAt: Date?
}

// MARK: - Maintenance Plan Assignment
struct MaintenancePlanAssignment: Codable, Identifiable {
    let id: String
    let flId: String
    let strategyId: String
    let triggerType: String
    let intervalValue: Int
    let intervalUnit: String
    var lastDoneDate: Date?
    var lastDoneReading: Double?
    var nextDueDate: Date?
    var nextDueReading: Double?
    let alertLeadDays: Int
    let isActive: Bool
    var createdAt: Date?
    var updatedAt: Date?
}

// MARK: - Operational Reading
struct OperationalReading: Codable, Identifiable {
    let id: String
    let flId: String
    let timestamp: Date
    let metricType: String
    let value: Double
    var unit: String?
    var recordedBy: String?
    let source: String
}
