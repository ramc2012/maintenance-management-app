import Foundation

// MARK: - Equipment Type
struct EquipmentType: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let category: String // STATIC, RUNNING
    var make: String?
    var model: String?
    var description: String?
    var createdAt: Date?
    var updatedAt: Date?
}

// MARK: - Running Equipment Master
struct RunningEquipment: Codable, Identifiable, Hashable {
    var id: String { equipmentTag }
    let equipmentTag: String
    let category: String
    let description: String
    var make: String?
    var model: String?
    var powerRating: String?
    var pmFrequencyDays: Int?
    var specifications: [String: AnyCodable]?
    var equipmentTypeName: String?
    var serviceLine: String?
    let installationId: String
    var equipmentTypeId: String?
    var createdAt: Date?
    var updatedAt: Date?
}

// MARK: - Static Equipment
struct StaticEquipment: Codable, Identifiable, Hashable {
    let id: String
    let tagNumber: String
    let name: String
    let equipmentType: String
    let installationId: String
    var functionalLocId: String?
    var designPressure: Double?
    var designTemp: Double?
    var operatingPressure: Double?
    var operatingTemp: Double?
    var material: String?
    var capacity: Double?
    var capacityUnit: String?
    var manufacturer: String?
    var serialNumber: String?
    var installDate: Date?
    var lastInspection: Date?
    var nextInspection: Date?
    let status: String
    var remarks: String?
    var createdAt: Date?
    var updatedAt: Date?
}

// MARK: - Instrument Master
struct InstrumentMaster: Codable, Identifiable, Hashable {
    var id: String { tagId }
    let tagId: String
    let type: String
    var serviceLine: String?
    let description: String
    var make: String?
    var model: String?
    var serialNo: String?
    var rangeMin: Double?
    var rangeMax: Double?
    var unit: String?
    var modelYear: Int?
    let installationId: String
    let calibrationFreqMonths: Int
    let calSystemType: String
    var custodyMeterId: String?
    var internalMeterId: String?
    var createdAt: Date?
    var updatedAt: Date?
}

// MARK: - Custody Transfer Meter
struct CustodyTransferMeter: Codable, Identifiable, Hashable {
    let id: String
    let meterId: String
    let customerId: String
    let customerName: String
    var meterType: String?
    var product: String?
    let fluidType: String
    var pipeSize: String?
    var elementSize: String?
    var configData: [String: AnyCodable]?
    var details: String?
    var createdAt: Date?
    var updatedAt: Date?
}

// MARK: - Internal Flow Meter
struct InternalFlowMeter: Codable, Identifiable, Hashable {
    let id: String
    let meterId: String
    let description: String
    var location: String?
    var meterType: String?
    let fluidType: String
    var product: String?
    var pipeSize: String?
    var elementSize: String?
    var configData: [String: AnyCodable]?
    var createdAt: Date?
    var updatedAt: Date?
}

// MARK: - Engine Registry
struct EngineRegistry: Codable, Identifiable, Hashable {
    let id: String
    let tagId: String
    let description: String
    let engineType: String
    let fuelType: String
    var manufacturer: String?
    var model: String?
    var serialNo: String?
    var ratedPowerHP: Double?
    var ratedPowerKW: Double?
    var ratedRPM: Double?
    var cylinders: Int?
    var displacement: Double?
    var fuelConsumption: Double?
    var oilCapacity: Double?
    var coolantType: String?
    var flId: String?
    let status: String
    var createdAt: Date?
    var updatedAt: Date?
}

// MARK: - Equipment Log
struct EquipmentLog: Codable, Identifiable {
    let id: String
    let date: Date
    let shift: String
    let equipmentTag: String
    let runStatus: Bool
    var startTime: Date?
    var stopTime: Date?
    var totalRunHours: Double?
    var cumulativeMeterReading: Double?
    var parameters: [String: AnyCodable]?
    var remarks: String?
    var createdAt: Date?
    var updatedAt: Date?
}
