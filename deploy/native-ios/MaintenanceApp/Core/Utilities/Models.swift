import Foundation

// MARK: - User
struct User: Codable {
    let id: String
    let username: String
    let email: String
    let firstName: String?
    let lastName: String?
    let role: String
    let departmentId: String?
    
    var name: String {
        if let first = firstName, let last = lastName {
            return "\(first) \(last)"
        } else if let first = firstName {
            return first
        } else if let last = lastName {
            return last
        }
        return username
    }
    
    var department: String? {
        // In a real app, this would map departmentId to department name
        return departmentId
    }
}

// MARK: - Organization Hierarchy
struct OrgHierarchyResponse: Codable {
    let companies: [Company]
}

struct Company: Codable, Identifiable {
    let id: String
    let companyCode: String
    let name: String
    let departments: [Department]?
}

struct Department: Codable, Identifiable {
    let id: String
    let departmentCode: String
    let name: String
}

// MARK: - Asset Hierarchy (ISO 14224)
struct Site: Codable, Identifiable {
    let id: String
    let siteId: String
    let name: String
    let description: String?
    let areas: [Area]?
}

struct Area: Codable, Identifiable {
    let id: String
    let areaId: String
    let name: String
    let description: String?
    let siteId: String
    let systems: [System]?
}

struct System: Codable, Identifiable {
    let id: String
    let systemTag: String
    let name: String
    let description: String?
    let areaId: String
    let functionalLocations: [FunctionalLocation]?
}

struct FunctionalLocation: Codable, Identifiable {
    let id: String
    let flId: String
    let name: String
    let description: String?
    let flType: String
    let positionType: String?
    let systemId: String
    let currentAsset: Asset?
}

// MARK: - Asset
struct Asset: Codable, Identifiable {
    let id: String
    let assetCode: String
    let assetClass: String
    let serialNumber: String?
    let manufacturer: String?
    let model: String?
    let modelYear: Int?
    let status: String
}

// MARK: - Equipment
struct RunningEquipment: Codable, Identifiable {
    let id: String
    let equipmentTag: String
    let description: String
    let category: String
    let make: String?
    let model: String?
    let powerRating: String?
    let serviceLine: String?
}

struct CustodyTransferMeter: Codable, Identifiable {
    let id: String
    let meterId: String
    let customerName: String
    let meterType: String?
    let serialNumber: String?
}

struct InstrumentMaster: Codable, Identifiable {
    let id: String
    let tagId: String
    let instrumentType: String
    let description: String
    let make: String?
    let model: String?
    let range: String?
    let accuracy: String?
}

// MARK: - Reports
struct Report: Codable, Identifiable {
    let id: String
    let date: Date
    let installationId: String
    let department: String
    let section: String
    let jobType: String
    let reportCriticality: Int
    let equipmentTag: String?
    let equipmentTypeName: String?
    let serviceLine: String?
    let notificationNo: String?
    let description: String
    let status: String
    let startTime: Date
    let endTime: Date
    let durationHours: Double
    let remarks: String?
    let createdBy: String
    let syncStatus: RecordSyncStatus
    let localModifiedAt: Date
    let serverModifiedAt: Date?
    
    var criticalityLevel: String {
        switch reportCriticality {
        case 1: return "Routine"
        case 2: return "Monthly"
        case 3: return "Annual"
        default: return "Unknown"
        }
    }
}

struct ReportFilter {
    var period: ReportPeriod = .daily
    var department: String?
    var section: String?
    var jobType: String?
    var startDate: Date?
    var endDate: Date?
    var status: String?
    
    var queryItems: [URLQueryItem] {
        var items: [URLQueryItem] = []
        
        items.append(URLQueryItem(name: "period", value: period.rawValue))
        
        if let department = department {
            items.append(URLQueryItem(name: "department", value: department))
        }
        if let section = section {
            items.append(URLQueryItem(name: "section", value: section))
        }
        if let jobType = jobType {
            items.append(URLQueryItem(name: "jobType", value: jobType))
        }
        if let startDate = startDate {
            items.append(URLQueryItem(name: "startDate", value: ISO8601DateFormatter().string(from: startDate)))
        }
        if let endDate = endDate {
            items.append(URLQueryItem(name: "endDate", value: ISO8601DateFormatter().string(from: endDate)))
        }
        if let status = status {
            items.append(URLQueryItem(name: "status", value: status))
        }
        
        return items
    }
}

struct PendingSyncReport: Codable {
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

// MARK: - Work Orders
struct WorkOrder: Codable, Identifiable {
    let id: String
    let woNumber: String
    let woType: String
    let priority: String
    let status: String
    let description: String
    let scheduledDate: Date?
    let startDate: Date?
    let completionDate: Date?
    let failureMode: String?
    let causeCode: String?
    let actionTaken: String?
}

// MARK: - Calibration
struct CalibrationEvent: Codable, Identifiable {
    let id: String
    let certificateNo: String
    let instrumentTagId: String
    let standardUsedId: String
    let calibrationDate: Date
    let previousCalDate: Date?
    let nextDueDate: Date
    let ambientTemp: Double?
    let humidity: Double?
    let atmosphericPressure: Double?
    let overallResultAsFound: String
    let overallResultAsLeft: String
    let maxErrorFoundPct: Double?
    let maxErrorLeftPct: Double?
    let performedBy: String
    let approvedBy: String?
    let status: String
}

struct CalibrationStandard: Codable, Identifiable {
    let id: String
    let tagId: String
    let category: String
    let description: String
    let make: String?
    let model: String?
    let certificateNo: String?
    let calibratedBy: String?
    let lastCalDate: Date?
    let dueDate: Date?
}

// MARK: - Procurement
struct ProcurementCase: Codable, Identifiable {
    let id: String
    let title: String
    let type: String
    let category: String?
    let currentStage: String
    let prNumber: String?
    let poNumber: String?
    let prValue: Double?
    let poValue: Double?
    let currency: String
    let vendor: String?
    let createdAt: Date?
    let updatedAt: Date?
}

struct ProcurementAnalytics: Codable {
    let activeCount: Int
    let closedCount: Int
    let valueBreakdown: [String: Double]
}

struct CreateCaseRequest: Codable {
    let title: String
    let type: String
    let category: String
    let prValue: Double?
    let poValue: Double?
    let currency: String
    let prNumber: String?
    let poNumber: String?
    let vendor: String?
}

struct Budget: Codable, Identifiable {
    let id: String
    let category: String
    let fy: String
    let amount: Double
    let isIndicative: Bool
}
