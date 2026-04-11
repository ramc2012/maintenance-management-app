import Foundation

// MARK: - Daily Energy Log
struct DailyEnergyLog: Codable, Identifiable {
    let id: String
    let installationId: String
    let date: Date
    var fuelType: String?
    var fuelQuantity: Double?
    var fuelUnit: String?
    var fuelCost: Double?
    var electricityKwh: Double?
    var electricityCost: Double?
    var generatorHours: Double?
    var remarks: String?
    let loggedBy: String
    var createdAt: Date?
    var updatedAt: Date?
    
    // Relationships
    var installation: Installation?
}

// MARK: - Monthly Electricity Bill
struct MonthlyElectricityBill: Codable, Identifiable {
    let id: String
    let installationId: String
    let month: Int
    let year: Int
    let unitsConsumed: Double
    var demandKva: Double?
    let billAmount: Double
    var taxAmount: Double?
    let totalAmount: Double
    var billNumber: String?
    var billDate: Date?
    var dueDate: Date?
    var paidDate: Date?
    let status: String
    var remarks: String?
    let createdBy: String
    var createdAt: Date?
    var updatedAt: Date?
    
    // Relationships
    var installation: Installation?
    
    var isPaid: Bool {
        status == "PAID"
    }
    
    var isOverdue: Bool {
        guard status == "PENDING", let dueDate = dueDate else { return false }
        return Date() > dueDate
    }
    
    var monthName: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM"
        var components = DateComponents()
        components.month = month
        if let date = Calendar.current.date(from: components) {
            return formatter.string(from: date)
        }
        return ""
    }
}

// MARK: - Fuel Type
enum FuelType: String, CaseIterable, Codable, Identifiable {
    case diesel = "DIESEL"
    case naturalGas = "NATURAL_GAS"
    case lpg = "LPG"
    
    var id: String { rawValue }
    
    var displayName: String {
        switch self {
        case .diesel: return "Diesel"
        case .naturalGas: return "Natural Gas"
        case .lpg: return "LPG"
        }
    }
}

// MARK: - Bill Status
enum BillStatus: String, CaseIterable, Codable {
    case pending = "PENDING"
    case paid = "PAID"
    case overdue = "OVERDUE"
    
    var displayName: String {
        rawValue.capitalized
    }
}

// MARK: - Create Daily Energy Log Request
struct CreateDailyEnergyLogRequest: Codable {
    let installationId: String
    let date: Date
    var fuelType: String?
    var fuelQuantity: Double?
    var fuelUnit: String?
    var fuelCost: Double?
    var electricityKwh: Double?
    var electricityCost: Double?
    var generatorHours: Double?
    var remarks: String?
}

// MARK: - Create Monthly Bill Request
struct CreateMonthlyBillRequest: Codable {
    let installationId: String
    let month: Int
    let year: Int
    let unitsConsumed: Double
    var demandKva: Double?
    let billAmount: Double
    var taxAmount: Double?
    let totalAmount: Double
    var billNumber: String?
    var billDate: Date?
    var dueDate: Date?
    var remarks: String?
}

// MARK: - Energy Dashboard Summary
struct EnergyDashboardSummary: Codable {
    let totalFuelCost: Double
    let totalElectricityCost: Double
    let totalFuelConsumption: Double
    let totalElectricityKwh: Double
    let dailyLogs: [DailyEnergyLog]
    let monthlyBills: [MonthlyElectricityBill]
}
