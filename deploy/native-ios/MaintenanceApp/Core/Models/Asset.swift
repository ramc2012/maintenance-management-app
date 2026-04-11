import Foundation

// MARK: - ISO 14224 Asset Hierarchy

// Site (Level 1)
struct Site: Codable, Identifiable, Hashable {
    let id: String
    let siteId: String
    let name: String
    var location: String?
    let isActive: Bool
    var areas: [Area]?
    var createdAt: Date?
    var updatedAt: Date?
}

// Area (Level 2)
struct Area: Codable, Identifiable, Hashable {
    let id: String
    let areaId: String
    let name: String
    let siteId: String
    var site: Site?
    var systems: [SystemModel]?
    var createdAt: Date?
    var updatedAt: Date?
}

// System (Level 3)
struct SystemModel: Codable, Identifiable, Hashable {
    let id: String
    let systemTag: String
    let name: String
    let areaId: String
    var area: Area?
    var functionalLocations: [FunctionalLocation]?
    var createdAt: Date?
    var updatedAt: Date?
}

// Functional Location (Level 4)
struct FunctionalLocation: Codable, Identifiable, Hashable {
    let id: String
    let flId: String
    let name: String
    var description: String?
    let flType: String
    var positionType: String?
    var parentFlId: String?
    let systemId: String
    var currentAssetId: String?
    var createdAt: Date?
    var updatedAt: Date?
    
    // Nested relationships (optional)
    var childFls: [FunctionalLocation]?
    var currentAsset: Asset?
}

// Asset (Physical Equipment)
struct Asset: Codable, Identifiable, Hashable {
    let id: String
    let assetCode: String
    var serialNumber: String?
    var manufacturer: String?
    var model: String?
    var modelYear: Int?
    let assetClass: String
    let status: String
    var specifications: [String: AnyCodable]?
    var currentFlId: String?
    var createdAt: Date?
    var updatedAt: Date?
}

// MARK: - Asset Installation History
struct AssetInstallation: Codable, Identifiable {
    let id: String
    let assetId: String
    let flId: String
    let installDate: Date
    var removalDate: Date?
    var installedBy: String?
    var removedBy: String?
    var reason: String?
    var meterReadingAtInstall: Double?
    var meterReadingAtRemoval: Double?
    var createdAt: Date?
}

// MARK: - FL Asset Assignment
struct FLAssetAssignment: Codable, Identifiable {
    let id: String
    let flId: String
    let assetType: String
    let assetTag: String
    let function: String
    var trainId: String?
    let sequence: Int
    var position: String?
    let isActive: Bool
    var installedDate: Date?
    var remarks: String?
    var createdAt: Date?
    var updatedAt: Date?
}
