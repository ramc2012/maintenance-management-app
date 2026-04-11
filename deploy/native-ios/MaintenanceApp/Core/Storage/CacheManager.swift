import Foundation

// MARK: - Cache Entry
struct CacheEntry<T: Codable>: Codable {
    let data: T
    let timestamp: Date
    let ttl: TimeInterval
    
    var isExpired: Bool {
        Date().timeIntervalSince(timestamp) > ttl
    }
}

// MARK: - Cache Manager
class CacheManager {
    static let shared = CacheManager()
    
    private let fileManager = FileManager.default
    private let cacheDirectory: URL
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    
    private init() {
        let paths = fileManager.urls(for: .cachesDirectory, in: .userDomainMask)
        cacheDirectory = paths[0].appendingPathComponent("MaintenanceAppCache")
        
        // Create cache directory if needed
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }
    
    // MARK: - Cache Operations
    func cache<T: Codable>(_ data: T, for key: String, ttl: TimeInterval = Constants.Cache.defaultTTL) {
        let entry = CacheEntry(data: data, timestamp: Date(), ttl: ttl)
        let fileURL = cacheDirectory.appendingPathComponent(key.toSafeFilename())
        
        do {
            let encodedData = try encoder.encode(entry)
            try encodedData.write(to: fileURL)
        } catch {
            print("Cache write error for key '\(key)': \(error)")
        }
    }
    
    func retrieve<T: Codable>(for key: String) -> T? {
        let fileURL = cacheDirectory.appendingPathComponent(key.toSafeFilename())
        
        guard fileManager.fileExists(atPath: fileURL.path) else {
            return nil
        }
        
        do {
            let data = try Data(contentsOf: fileURL)
            let entry = try decoder.decode(CacheEntry<T>.self, from: data)
            
            // Check if expired
            if entry.isExpired {
                invalidate(key: key)
                return nil
            }
            
            return entry.data
        } catch {
            print("Cache read error for key '\(key)': \(error)")
            return nil
        }
    }
    
    func invalidate(key: String) {
        let fileURL = cacheDirectory.appendingPathComponent(key.toSafeFilename())
        try? fileManager.removeItem(at: fileURL)
    }
    
    func clearAll() {
        try? fileManager.removeItem(at: cacheDirectory)
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }
    
    // MARK: - Cache Keys
    enum CacheKey {
        case orgHierarchy
        case installations
        case equipmentTypes
        case sites
        case cases(departmentId: String?)
        case budgets(departmentId: String?)
        case workOrders
        case calibrationStandards
        case custom(String)
        
        var key: String {
            switch self {
            case .orgHierarchy:
                return "org_hierarchy"
            case .installations:
                return "installations"
            case .equipmentTypes:
                return "equipment_types"
            case .sites:
                return "sites"
            case .cases(let deptId):
                return "cases_\(deptId ?? "all")"
            case .budgets(let deptId):
                return "budgets_\(deptId ?? "all")"
            case .workOrders:
                return "work_orders"
            case .calibrationStandards:
                return "calibration_standards"
            case .custom(let key):
                return key
            }
        }
    }
}

// MARK: - String Extension for Safe Filename
private extension String {
    func toSafeFilename() -> String {
        let invalidCharacters = CharacterSet(charactersIn: ":/\\?%*|\"<>")
        return self.components(separatedBy: invalidCharacters).joined(separator: "_")
    }
}
