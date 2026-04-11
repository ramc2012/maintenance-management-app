import Foundation
import SwiftUI

enum Constants {
    enum API {
        static let baseURL = "http://localhost:3000/api"
        static let timeout: TimeInterval = 30
    }
    
    enum Keychain {
        static let serviceName = "com.maintenance.app"
        static let tokenKey = "authToken"
        static let userKey = "currentUser"
    }
    
    enum Cache {
        static let defaultTTL: TimeInterval = 3600 // 1 hour
        static let shortTTL: TimeInterval = 300 // 5 minutes
        static let longTTL: TimeInterval = 86400 // 24 hours
        static let reportsTTL: TimeInterval = 1800 // 30 minutes
    }
    
    enum UserDefaults {
        static let colorSchemeKey = "app_colorScheme"
        static let accentColorKey = "app_accentColor"
        static let sidebarCollapsedKey = "sidebar_collapsed"
    }
}

// MARK: - Procurement Categories
enum ProcurementCategory: String, CaseIterable, Codable, Identifiable {
    case stores = "STORES"
    case spares = "SPARES"
    case services = "SERVICES"
    case capital = "CAPITAL"
    case petty = "PETTY"
    
    var id: String { rawValue }
    
    var displayName: String {
        rawValue.capitalized
    }
    
    var iconName: String {
        switch self {
        case .stores: return "shippingbox"
        case .spares: return "gearshape.2"
        case .services: return "wrench.and.screwdriver"
        case .capital: return "building.2"
        case .petty: return "banknote"
        }
    }
    
    var color: Color {
        switch self {
        case .stores: return .blue
        case .spares: return .green
        case .services: return .orange
        case .capital: return .purple
        case .petty: return .teal
        }
    }
}

// MARK: - Case Stages
enum CaseStage: String, CaseIterable, Codable {
    case draft = "DRAFT"
    case submitted = "SUBMITTED"
    case approved = "APPROVED"
    case inProgress = "IN_PROGRESS"
    case completed = "COMPLETED"
    case closed = "CLOSED"
    
    var displayName: String {
        switch self {
        case .draft: return "Draft"
        case .submitted: return "Submitted"
        case .approved: return "Approved"
        case .inProgress: return "In Progress"
        case .completed: return "Completed"
        case .closed: return "Closed"
        }
    }
}

// MARK: - Work Order Status
enum WorkOrderStatus: String, CaseIterable, Codable, Identifiable {
    case open = "OPEN"
    case inProgress = "IN_PROGRESS"
    case completed = "COMPLETED"
    case closed = "CLOSED"
    
    var id: String { rawValue }
    
    var displayName: String {
        switch self {
        case .open: return "Open"
        case .inProgress: return "In Progress"
        case .completed: return "Completed"
        case .closed: return "Closed"
        }
    }
}

// MARK: - Work Order Priority
enum WorkOrderPriority: String, CaseIterable, Codable {
    case low = "LOW"
    case normal = "NORMAL"
    case high = "HIGH"
    case emergency = "EMERGENCY"
    
    var displayName: String {
        rawValue.capitalized
    }
}

// MARK: - Work Order Type
enum WorkOrderType: String, CaseIterable, Codable {
    case preventive = "PREVENTIVE"
    case corrective = "CORRECTIVE"
    case predictive = "PREDICTIVE"
    
    var displayName: String {
        rawValue.capitalized
    }
}

// MARK: - Maintenance Job Type
enum MaintenanceJobType: String, CaseIterable, Codable {
    case pm = "PM"
    case bd = "BD"
    
    var displayName: String {
        switch self {
        case .pm: return "Preventive Maintenance"
        case .bd: return "Breakdown"
        }
    }
}

// MARK: - Calibration Result
enum CalibrationResult: String, CaseIterable, Codable {
    case pass = "PASS"
    case fail = "FAIL"
    case outOfTolerance = "OUT_OF_TOLERANCE"
    case adjusted = "ADJUSTED"
    
    var displayName: String {
        switch self {
        case .pass: return "Pass"
        case .fail: return "Fail"
        case .outOfTolerance: return "Out of Tolerance"
        case .adjusted: return "Adjusted"
        }
    }
}

// MARK: - Training Status
enum TrainingStatus: String, CaseIterable, Codable {
    case scheduled = "SCHEDULED"
    case ongoing = "ONGOING"
    case completed = "COMPLETED"
    case cancelled = "CANCELLED"
    
    var displayName: String {
        rawValue.capitalized
    }
}

// MARK: - Workshop Shop Types
enum WorkshopShopType: String, CaseIterable, Codable, Identifiable {
    case fabrication = "FABRICATION"
    case diesel = "DIESEL"
    case machine = "MACHINE"
    case electrical = "ELECTRICAL"
    
    var id: String { rawValue }
    
    var displayName: String {
        rawValue.capitalized
    }
    
    var iconName: String {
        switch self {
        case .fabrication: return "hammer"
        case .diesel: return "fuelpump"
        case .machine: return "gearshape"
        case .electrical: return "bolt"
        }
    }
}

// MARK: - MOH Status
enum MOHStatus: String, CaseIterable, Codable {
    case planned = "PLANNED"
    case inProgress = "IN_PROGRESS"
    case completed = "COMPLETED"
    case cancelled = "CANCELLED"
    
    var displayName: String {
        switch self {
        case .planned: return "Planned"
        case .inProgress: return "In Progress"
        case .completed: return "Completed"
        case .cancelled: return "Cancelled"
        }
    }
}

// MARK: - Logbook Categories
enum LogbookCategory: String, CaseIterable, Identifiable {
    case mechanical = "MECHANICAL"
    case electrical = "ELECTRICAL"
    case process = "PROCESS"
    
    var id: String { rawValue }
    
    var displayName: String {
        rawValue.capitalized
    }
    
    var iconName: String {
        switch self {
        case .mechanical: return "wrench.and.screwdriver"
        case .electrical: return "bolt"
        case .process: return "gauge"
        }
    }
}

// MARK: - Sync Status (for offline)
enum SyncStatus: Equatable {
    case idle
    case syncing
    case success
    case failed(Error)
    
    static func == (lhs: SyncStatus, rhs: SyncStatus) -> Bool {
        switch (lhs, rhs) {
        case (.idle, .idle), (.syncing, .syncing), (.success, .success):
            return true
        case (.failed, .failed):
            return true
        default:
            return false
        }
    }
}

// MARK: - Record Sync Status (for data models)
enum RecordSyncStatus: String, Codable {
    case synced = "synced"
    case pending = "pending"
    case conflict = "conflict"
}

// MARK: - Report Period
enum ReportPeriod: String, CaseIterable, Identifiable {
    case daily = "DAILY"
    case monthly = "MONTHLY"
    case yearly = "YEARLY"
    
    var id: String { rawValue }
    
    var displayName: String {
        rawValue.capitalized
    }
}
