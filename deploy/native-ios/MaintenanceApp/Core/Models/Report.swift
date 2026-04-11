import Foundation

// MARK: - Report (for offline sync)
struct Report: Codable, Identifiable, Equatable {
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
    let createdBy: String
    var createdAt: Date?
    var updatedAt: Date?
    
    // Sync metadata
    var syncStatus: RecordSyncStatus
    var localModifiedAt: Date
    var serverModifiedAt: Date?
    
    // Relationships (optional, for display)
    var installationName: String?
    
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
    
    static func == (lhs: Report, rhs: Report) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Create Report Request
struct CreateReportRequest: Codable {
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
    let startTime: Date
    let endTime: Date
    let durationHours: Double
    var remarks: String?
}

// MARK: - Report Filter
struct ReportFilter {
    var period: ReportPeriod = .daily
    var startDate: Date?
    var endDate: Date?
    var installationId: String?
    var department: String?
    var section: String?
    var jobType: String?
    var status: String?
    
    var queryItems: [URLQueryItem] {
        var items: [URLQueryItem] = []
        
        if let startDate = startDate {
            items.append(URLQueryItem(name: "startDate", value: ISO8601DateFormatter().string(from: startDate)))
        }
        if let endDate = endDate {
            items.append(URLQueryItem(name: "endDate", value: ISO8601DateFormatter().string(from: endDate)))
        }
        if let installationId = installationId {
            items.append(URLQueryItem(name: "installationId", value: installationId))
        }
        if let department = department {
            items.append(URLQueryItem(name: "department", value: department))
        }
        if let section = section {
            items.append(URLQueryItem(name: "section", value: section))
        }
        if let jobType = jobType {
            items.append(URLQueryItem(name: "jobType", value: jobType))
        }
        if let status = status {
            items.append(URLQueryItem(name: "status", value: status))
        }
        
        return items
    }
}

// MARK: - Report Summary
struct ReportSummary: Codable {
    let totalCount: Int
    let byDepartment: [String: Int]
    let byJobType: [String: Int]
    let byStatus: [String: Int]
    let totalHours: Double
}

// MARK: - Pending Sync Report (for offline queue)
struct PendingSyncReport: Codable, Identifiable {
    let id: String
    let report: Report
    let action: SyncAction
    let queuedAt: Date
    var retryCount: Int
    var lastError: String?
    
    enum SyncAction: String, Codable {
        case create
        case update
        case delete
    }
}
