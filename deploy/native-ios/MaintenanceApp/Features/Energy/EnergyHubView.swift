import SwiftUI
import Charts

// MARK: - Energy Hub View
struct EnergyHubView: View {
    @State private var selectedTab = 0
    @StateObject private var viewModel = EnergyViewModel()
    
    var body: some View {
        VStack(spacing: 0) {
            // Tab Picker
            Picker("View", selection: $selectedTab) {
                Text("Dashboard").tag(0)
                Text("Daily Log").tag(1)
                Text("Monthly Bills").tag(2)
            }
            .pickerStyle(.segmented)
            .padding()
            
            // Content
            switch selectedTab {
            case 0:
                EnergyDashboardView(viewModel: viewModel)
            case 1:
                DailyEnergyLogView(viewModel: viewModel)
            case 2:
                MonthlyBillsView(viewModel: viewModel)
            default:
                EmptyView()
            }
        }
        .navigationTitle("Energy")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadData()
        }
    }
}

// MARK: - Energy Dashboard View
struct EnergyDashboardView: View {
    @ObservedObject var viewModel: EnergyViewModel
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Summary Cards
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    EnergySummaryCard(
                        title: "Total Electricity",
                        value: "\(Int(viewModel.totalElectricity))",
                        unit: "kWh",
                        iconName: "bolt.fill",
                        color: .yellow
                    )
                    
                    EnergySummaryCard(
                        title: "Total Fuel",
                        value: "\(Int(viewModel.totalFuel))",
                        unit: "L",
                        iconName: "fuelpump.fill",
                        color: .orange
                    )
                    
                    EnergySummaryCard(
                        title: "Electricity Cost",
                        value: formatCurrency(viewModel.totalElectricityCost),
                        unit: "",
                        iconName: "indianrupeesign.circle.fill",
                        color: .green
                    )
                    
                    EnergySummaryCard(
                        title: "Fuel Cost",
                        value: formatCurrency(viewModel.totalFuelCost),
                        unit: "",
                        iconName: "indianrupeesign.circle.fill",
                        color: .blue
                    )
                }
                
                // Electricity Trend Chart
                if !viewModel.dailyLogs.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Electricity Consumption (Last 30 Days)")
                            .font(.headline)
                        
                        Chart(viewModel.dailyLogs.prefix(30)) { log in
                            BarMark(
                                x: .value("Date", log.date, unit: .day),
                                y: .value("kWh", log.electricityKwh ?? 0)
                            )
                            .foregroundStyle(.yellow.gradient)
                        }
                        .frame(height: 200)
                        .chartXAxis {
                            AxisMarks(values: .stride(by: .day, count: 7)) { _ in
                                AxisGridLine()
                                AxisValueLabel(format: .dateTime.day().month(), centered: true)
                            }
                        }
                    }
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
                }
                
                // Recent Logs
                VStack(alignment: .leading, spacing: 12) {
                    Text("Recent Energy Logs")
                        .font(.headline)
                    
                    if viewModel.dailyLogs.isEmpty {
                        Text("No energy logs recorded")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .padding()
                    } else {
                        ForEach(viewModel.dailyLogs.prefix(5)) { log in
                            RecentEnergyLogRow(log: log)
                        }
                    }
                }
                .padding()
                .background(Color(.secondarySystemBackground))
                .cornerRadius(12)
            }
            .padding()
        }
        .refreshable {
            await viewModel.loadData()
        }
    }
    
    private func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "INR"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value)) ?? "₹0"
    }
}

// MARK: - Energy Summary Card
struct EnergySummaryCard: View {
    let title: String
    let value: String
    let unit: String
    let iconName: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: iconName)
                    .foregroundColor(color)
                Spacer()
            }
            
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(value)
                    .font(.title2)
                    .fontWeight(.bold)
                
                if !unit.isEmpty {
                    Text(unit)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
}

// MARK: - Recent Energy Log Row
struct RecentEnergyLogRow: View {
    let log: DailyEnergyLog
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(log.date.formatted(date: .abbreviated, time: .omitted))
                    .font(.subheadline)
                    .fontWeight(.medium)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                if let kwh = log.electricityKwh {
                    HStack(spacing: 4) {
                        Image(systemName: "bolt.fill")
                            .foregroundColor(.yellow)
                        Text("\(Int(kwh)) kWh")
                    }
                    .font(.caption)
                }
                
                if let fuel = log.fuelQuantity {
                    HStack(spacing: 4) {
                        Image(systemName: "fuelpump.fill")
                            .foregroundColor(.orange)
                        Text("\(Int(fuel)) L")
                    }
                    .font(.caption)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Daily Energy Log View
struct DailyEnergyLogView: View {
    @ObservedObject var viewModel: EnergyViewModel
    @State private var showingAddLog = false
    
    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.dailyLogs.isEmpty {
                ProgressView("Loading logs...")
            } else if viewModel.dailyLogs.isEmpty {
                EmptyStateView(
                    title: "No Energy Logs",
                    message: "No daily energy logs recorded yet.",
                    iconName: "bolt"
                )
            } else {
                List(viewModel.dailyLogs) { log in
                    DailyEnergyLogRow(log: log)
                }
                .listStyle(.plain)
                .refreshable {
                    await viewModel.loadData()
                }
            }
        }
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    showingAddLog = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showingAddLog) {
            NavigationStack {
                DailyEnergyEntryView()
            }
        }
    }
}

// MARK: - Daily Energy Log Row
struct DailyEnergyLogRow: View {
    let log: DailyEnergyLog
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(log.date.formatted(date: .long, time: .omitted))
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Spacer()
            }
            
            HStack(spacing: 16) {
                if let kwh = log.electricityKwh {
                    VStack(alignment: .leading) {
                        HStack {
                            Image(systemName: "bolt.fill")
                                .foregroundColor(.yellow)
                            Text("\(Int(kwh)) kWh")
                        }
                        if let cost = log.electricityCost {
                            Text("₹\(Int(cost))")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                if let fuel = log.fuelQuantity {
                    VStack(alignment: .leading) {
                        HStack {
                            Image(systemName: "fuelpump.fill")
                                .foregroundColor(.orange)
                            Text("\(Int(fuel)) \(log.fuelUnit ?? "L")")
                        }
                        if let cost = log.fuelCost {
                            Text("₹\(Int(cost))")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                if let genHours = log.generatorHours {
                    VStack(alignment: .leading) {
                        HStack {
                            Image(systemName: "power")
                                .foregroundColor(.green)
                            Text("\(Int(genHours)) hrs")
                        }
                        Text("Generator")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .font(.caption)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Daily Energy Entry View
struct DailyEnergyEntryView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = DailyEnergyEntryViewModel()
    @State private var showingSuccess = false
    
    var body: some View {
        Form {
            Section("Date & Location") {
                DatePicker("Date", selection: $viewModel.date, displayedComponents: .date)
            }
            
            Section("Electricity") {
                TextField("Consumption (kWh)", value: $viewModel.electricityKwh, format: .number)
                    .keyboardType(.decimalPad)
                TextField("Cost (₹)", value: $viewModel.electricityCost, format: .number)
                    .keyboardType(.decimalPad)
            }
            
            Section("Fuel") {
                Picker("Fuel Type", selection: $viewModel.fuelType) {
                    Text("Diesel").tag("DIESEL")
                    Text("Natural Gas").tag("NATURAL_GAS")
                    Text("LPG").tag("LPG")
                }
                
                TextField("Quantity", value: $viewModel.fuelQuantity, format: .number)
                    .keyboardType(.decimalPad)
                
                Picker("Unit", selection: $viewModel.fuelUnit) {
                    Text("Liters").tag("LITERS")
                    Text("Cubic Meters").tag("CUBIC_METERS")
                }
                
                TextField("Cost (₹)", value: $viewModel.fuelCost, format: .number)
                    .keyboardType(.decimalPad)
            }
            
            Section("Generator") {
                TextField("Runtime Hours", value: $viewModel.generatorHours, format: .number)
                    .keyboardType(.decimalPad)
            }
            
            Section("Remarks") {
                TextEditor(text: $viewModel.remarks)
                    .frame(minHeight: 60)
            }
        }
        .navigationTitle("Log Energy")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") {
                    Task {
                        await viewModel.save()
                        if viewModel.error == nil {
                            showingSuccess = true
                        }
                    }
                }
                .disabled(viewModel.isLoading)
            }
        }
        .alert("Success", isPresented: $showingSuccess) {
            Button("OK") { dismiss() }
        } message: {
            Text("Energy log saved successfully!")
        }
    }
}

// MARK: - Monthly Bills View
struct MonthlyBillsView: View {
    @ObservedObject var viewModel: EnergyViewModel
    
    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.monthlyBills.isEmpty {
                ProgressView("Loading bills...")
            } else if viewModel.monthlyBills.isEmpty {
                EmptyStateView(
                    title: "No Monthly Bills",
                    message: "No electricity bills recorded yet.",
                    iconName: "doc.text"
                )
            } else {
                List(viewModel.monthlyBills) { bill in
                    MonthlyBillRow(bill: bill)
                }
                .listStyle(.plain)
                .refreshable {
                    await viewModel.loadData()
                }
            }
        }
    }
}

// MARK: - Monthly Bill Row
struct MonthlyBillRow: View {
    let bill: MonthlyElectricityBill
    
    var monthYearString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        var components = DateComponents()
        components.month = bill.month
        components.year = bill.year
        if let date = Calendar.current.date(from: components) {
            return formatter.string(from: date)
        }
        return "\(bill.month)/\(bill.year)"
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(monthYearString)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                
                Spacer()
                
                StatusBadge(status: bill.status)
            }
            
            HStack {
                VStack(alignment: .leading) {
                    Text("\(Int(bill.unitsConsumed)) kWh")
                        .font(.caption)
                    Text("Consumed")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing) {
                    Text(formatCurrency(bill.totalAmount))
                        .font(.headline)
                        .foregroundColor(.primary)
                    if let dueDate = bill.dueDate {
                        Text("Due: \(dueDate.formatted(date: .abbreviated, time: .omitted))")
                            .font(.caption2)
                            .foregroundColor(bill.status == "OVERDUE" ? .red : .secondary)
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
    
    private func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "INR"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value)) ?? "₹0"
    }
}

// MARK: - Energy ViewModel
@MainActor
class EnergyViewModel: ObservableObject {
    @Published var dailyLogs: [DailyEnergyLog] = []
    @Published var monthlyBills: [MonthlyElectricityBill] = []
    @Published var isLoading = false
    
    var totalElectricity: Double {
        dailyLogs.compactMap { $0.electricityKwh }.reduce(0, +)
    }
    
    var totalFuel: Double {
        dailyLogs.compactMap { $0.fuelQuantity }.reduce(0, +)
    }
    
    var totalElectricityCost: Double {
        dailyLogs.compactMap { $0.electricityCost }.reduce(0, +)
    }
    
    var totalFuelCost: Double {
        dailyLogs.compactMap { $0.fuelCost }.reduce(0, +)
    }
    
    private let apiClient = APIClient.shared
    
    func loadData() async {
        isLoading = true
        
        do {
            dailyLogs = try await apiClient.request(.energyDailyLogs)
            monthlyBills = try await apiClient.request(.energyBills)
        } catch {
            // Handle error silently
        }
        
        isLoading = false
    }
}

// MARK: - Daily Energy Entry ViewModel
@MainActor
class DailyEnergyEntryViewModel: ObservableObject {
    @Published var date = Date()
    @Published var electricityKwh: Double?
    @Published var electricityCost: Double?
    @Published var fuelType = "DIESEL"
    @Published var fuelQuantity: Double?
    @Published var fuelUnit = "LITERS"
    @Published var fuelCost: Double?
    @Published var generatorHours: Double?
    @Published var remarks = ""
    @Published var isLoading = false
    @Published var error: String?
    
    func save() async {
        isLoading = true
        error = nil
        
        // Implementation for saving
        
        isLoading = false
    }
}

#Preview {
    NavigationStack {
        EnergyHubView()
    }
}
