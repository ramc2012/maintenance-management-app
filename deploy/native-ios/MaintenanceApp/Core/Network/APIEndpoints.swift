import Foundation

enum APIEndpoint {
    // Authentication
    case login
    case changePassword
    
    // Organization
    case orgHierarchy
    
    // Cases (Procurement)
    case cases
    case caseDetail(id: String)
    case caseAnalytics
    case createCase
    
    // Budgets
    case budgets
    
    // Assets
    case assetHierarchy
    case sites
    case areas
    case systems
    case functionalLocations
    case functionalLocationDetail(id: String)
    case assets
    case assetDetail(id: String)
    
    // Equipment
    case installations
    case runningEquipment
    case staticEquipment
    case equipmentTypes
    case instruments
    case custodyMeters
    case internalMeters
    
    // Maintenance
    case maintenanceLogs
    case maintenanceLogDetail(id: String)
    case equipmentLogs
    case reports
    case reportsDaily
    case reportsMonthly
    case reportsAnnual
    case createReport
    case updateReport(id: String)
    case deleteReport(id: String)
    
    // Work Orders
    case workOrders
    case workOrderDetail(id: String)
    
    // Calibration
    case calibrationEvents
    case calibrationEventDetail(id: String)
    case calibrationStandards
    
    // Training
    case trainingRecords
    case trainingRecordDetail(id: String)
    
    // Energy
    case energyDaily
    case energyDailyLogs
    case energyBills
    
    // MRP
    case materialRequirements
    case materialRequirementDetail(id: String)
    
    // Workshop
    case workshopJobs
    case workshopJobDetail(id: String)
    
    // MOH
    case mohRecords
    case mohRecordDetail(id: String)
    
    // Collaboration
    case discussions
    case discussionDetail(id: String)
    case feedback
    case feedbackDetail(id: String)
    
    // MRP
    case requirements
    case requirementDetail(id: String)
    
    // PMS
    case pmsSchedules
    case pmsHealth
    
    var path: String {
        switch self {
        // Authentication
        case .login:
            return "/auth/login"
        case .changePassword:
            return "/auth/change-password"
            
        // Organization
        case .orgHierarchy:
            return "/org/hierarchy"
            
        // Cases
        case .cases:
            return "/cases"
        case .caseDetail(let id):
            return "/cases/\(id)"
        case .caseAnalytics:
            return "/cases/analytics"
        case .createCase:
            return "/cases"
            
        // Budgets
        case .budgets:
            return "/budgets"
            
        // Assets
        case .assetHierarchy:
            return "/assets/hierarchy"
        case .sites:
            return "/iso14224/sites"
        case .areas:
            return "/iso14224/areas"
        case .systems:
            return "/iso14224/systems"
        case .functionalLocations:
            return "/fl"
        case .functionalLocationDetail(let id):
            return "/fl/\(id)"
        case .assets:
            return "/assets"
        case .assetDetail(let id):
            return "/assets/\(id)"
            
        // Equipment
        case .installations:
            return "/equipment/installations"
        case .runningEquipment:
            return "/equipment/running"
        case .staticEquipment:
            return "/static-equipment"
        case .equipmentTypes:
            return "/equipment/types"
        case .instruments:
            return "/instruments"
        case .custodyMeters:
            return "/fl/custody-meters"
        case .internalMeters:
            return "/fl/internal-meters"
            
        // Maintenance
        case .maintenanceLogs:
            return "/maintenance/logs"
        case .maintenanceLogDetail(let id):
            return "/maintenance/logs/\(id)"
        case .equipmentLogs:
            return "/equipment/logs"
        case .reports:
            return "/maintenance/reports"
        case .reportsDaily:
            return "/maintenance/reports/daily"
        case .reportsMonthly:
            return "/maintenance/reports/monthly"
        case .reportsAnnual:
            return "/maintenance/reports/annual"
        case .createReport:
            return "/maintenance/reports"
        case .updateReport(let id):
            return "/maintenance/reports/\(id)"
        case .deleteReport(let id):
            return "/maintenance/reports/\(id)"
            
        // Work Orders
        case .workOrders:
            return "/workorders"
        case .workOrderDetail(let id):
            return "/workorders/\(id)"
            
        // Calibration
        case .calibrationEvents:
            return "/calibration/events"
        case .calibrationEventDetail(let id):
            return "/calibration/events/\(id)"
        case .calibrationStandards:
            return "/calibration/standards"
            
        // Training
        case .trainingRecords:
            return "/training/records"
        case .trainingRecordDetail(let id):
            return "/training/records/\(id)"
            
        // Energy
        case .energyDaily:
            return "/energy/daily"
        case .energyDailyLogs:
            return "/energy/logs"
        case .energyBills:
            return "/energy/bills"
        
        // MRP
        case .materialRequirements:
            return "/mrp/requirements"
        case .materialRequirementDetail(let id):
            return "/mrp/requirements/\(id)"
            
        // Workshop
        case .workshopJobs:
            return "/workshop/jobs"
        case .workshopJobDetail(let id):
            return "/workshop/jobs/\(id)"
            
        // MOH
        case .mohRecords:
            return "/moh/records"
        case .mohRecordDetail(let id):
            return "/moh/records/\(id)"
            
        // Collaboration
        case .discussions:
            return "/discussions"
        case .discussionDetail(let id):
            return "/discussions/\(id)"
        case .feedback:
            return "/feedback"
        case .feedbackDetail(let id):
            return "/feedback/\(id)"
            
        // MRP
        case .requirements:
            return "/mrp/requirements"
        case .requirementDetail(let id):
            return "/mrp/requirements/\(id)"
            
        // PMS
        case .pmsSchedules:
            return "/pms/schedules"
        case .pmsHealth:
            return "/pms/health"
        }
    }
    
    var url: URL? {
        URL(string: Constants.API.baseURL + path)
    }
}

// MARK: - HTTP Method
enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case patch = "PATCH"
    case delete = "DELETE"
}
