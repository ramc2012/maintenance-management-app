import Foundation

// MARK: - Calibration Standard
struct CalibrationStandard: Codable, Identifiable, Hashable {
    var id: String { tagId }
    let tagId: String
    let description: String
    var make: String?
    var model: String?
    let category: String
    var modelYear: Int?
    var lastCalDate: Date?
    var dueDate: Date?
    var reportUrl: String?
    var parameters: [String: AnyCodable]?
    let isActive: Bool
    var createdAt: Date?
    var updatedAt: Date?
}

// MARK: - Calibration Log (Legacy)
struct CalibrationLog: Codable, Identifiable {
    let id: String
    let instrumentTagId: String
    let masterStdId: String
    let lastCalDate: Date
    let currentCalDate: Date
    let nextDueDate: Date
    let result: String
    let performedBy: String
    var reportFileUrl: String?
    var fivePointData: [String: AnyCodable]?
    var createdAt: Date?
}

// MARK: - Calibration Event (ISO 10012 Compliant)
struct CalibrationEvent: Codable, Identifiable {
    let id: String
    let certificateNo: String
    let instrumentTagId: String
    let standardUsedId: String
    let calibrationDate: Date
    var previousCalDate: Date?
    let nextDueDate: Date
    var ambientTemp: Double?
    var humidity: Double?
    var atmosphericPressure: Double?
    let overallResultAsFound: String
    let overallResultAsLeft: String
    var maxErrorFoundPct: Double?
    var maxErrorLeftPct: Double?
    let status: String
    let adjustmentMade: Bool
    let repairRequired: Bool
    let performedBy: String
    var approvedBy: String?
    var approvalDate: Date?
    var remarks: String?
    var reportFileUrl: String?
    var points: [CalibrationPoint]?
    var createdAt: Date?
    var updatedAt: Date?
    
    // Relationships
    var instrument: InstrumentMaster?
    var standardUsed: CalibrationStandard?
    
    var resultAsFoundEnum: CalibrationResult? {
        CalibrationResult(rawValue: overallResultAsFound)
    }
    
    var resultAsLeftEnum: CalibrationResult? {
        CalibrationResult(rawValue: overallResultAsLeft)
    }
}

// MARK: - Calibration Point
struct CalibrationPoint: Codable, Identifiable {
    let id: String
    let eventId: String
    let sequence: Int
    let stepPercent: Double
    let direction: String
    let inputApplied: Double
    var inputUnit: String?
    let expectedReading: Double
    var expectedUnit: String?
    let asFoundReading: Double
    var asFoundError: Double?
    var asFoundResult: String?
    var asLeftReading: Double?
    var asLeftError: Double?
    var asLeftResult: String?
}

// MARK: - Calibration Performer
struct CalibrationPerformer: Codable, Identifiable, Hashable {
    let id: String
    let employeeId: String
    let name: String
    let employmentType: String
    let company: String
    var designation: String?
    var createdAt: Date?
    var updatedAt: Date?
}

// MARK: - Replacement History
struct ReplacementHistory: Codable, Identifiable {
    let id: String
    let instrumentTagId: String
    var oldSerialNo: String?
    let newSerialNo: String
    let replacedBy: String
    let date: Date
    var reason: String?
}

// MARK: - Unified Calibration History
struct UnifiedCalibrationHistory: Codable, Identifiable {
    let id: String
    let instrumentTagId: String
    let calDate: Date
    let resultStatus: String
    let sourceSystem: String
    var internalEventId: String?
    var externalCertRef: String?
    var externalPdfLink: String?
    var performedBy: String?
    var maxError: Double?
    var createdAt: Date?
}

// MARK: - Calibration Traceability
struct CalibrationTraceability: Codable, Identifiable {
    let id: String
    let standardId: String
    let traceabilityLevel: Int
    var parentStandardId: String?
    var externalCertificateNo: String?
    var externalLabName: String?
    var createdAt: Date?
}

// MARK: - Create Calibration Event Request
struct CreateCalibrationEventRequest: Codable {
    let instrumentTagId: String
    let standardUsedId: String
    let calibrationDate: Date
    var previousCalDate: Date?
    let nextDueDate: Date
    var ambientTemp: Double?
    var humidity: Double?
    var atmosphericPressure: Double?
    let overallResultAsFound: String
    let overallResultAsLeft: String
    var maxErrorFoundPct: Double?
    var maxErrorLeftPct: Double?
    let adjustmentMade: Bool
    let repairRequired: Bool
    let performedBy: String
    var remarks: String?
    var points: [CreateCalibrationPointRequest]?
}

struct CreateCalibrationPointRequest: Codable {
    let sequence: Int
    let stepPercent: Double
    let direction: String
    let inputApplied: Double
    var inputUnit: String?
    let expectedReading: Double
    var expectedUnit: String?
    let asFoundReading: Double
    var asFoundError: Double?
    var asFoundResult: String?
    var asLeftReading: Double?
    var asLeftError: Double?
    var asLeftResult: String?
}
