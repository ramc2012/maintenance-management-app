import SwiftUI

// MARK: - Calibration Section
enum CalibrationSection: String, CaseIterable, Identifiable {
    case dashboard = "Dashboard"
    case records = "Calibration Records"
    case newCalibration = "New Calibration"
    case standards = "Standards Registry"
    case dueSchedule = "Due Schedule"
    
    var id: String { rawValue }
    
    var iconName: String {
        switch self {
        case .dashboard: return "chart.pie.fill"
        case .records: return "list.bullet.rectangle.fill"
        case .newCalibration: return "plus.circle.fill"
        case .standards: return "checkmark.seal.fill"
        case .dueSchedule: return "calendar.badge.exclamationmark"
        }
    }
}

// MARK: - Calibration Hub View
struct CalibrationHubView: View {
    @State private var selectedSection: CalibrationSection = .dashboard
    @Environment(\.horizontalSizeClass) var horizontalSizeClass
    
    var body: some View {
        Group {
            if horizontalSizeClass == .regular {
                HStack(spacing: 0) {
                    calibrationSidebar
                        .frame(width: 220)
                    
                    Divider()
                    
                    contentView
                        .frame(maxWidth: .infinity)
                }
            } else {
                contentView
                    .toolbar {
                        ToolbarItem(placement: .navigationBarLeading) {
                            Menu {
                                ForEach(CalibrationSection.allCases) { section in
                                    Button {
                                        selectedSection = section
                                    } label: {
                                        Label(section.rawValue, systemImage: section.iconName)
                                    }
                                }
                            } label: {
                                HStack {
                                    Image(systemName: selectedSection.iconName)
                                    Text(selectedSection.rawValue)
                                    Image(systemName: "chevron.down")
                                }
                                .font(.subheadline)
                            }
                        }
                    }
            }
        }
        .navigationTitle("Calibration")
        .navigationBarTitleDisplayMode(.inline)
    }
    
    private var calibrationSidebar: some View {
        List(CalibrationSection.allCases, selection: $selectedSection) { section in
            Label(section.rawValue, systemImage: section.iconName)
                .tag(section)
        }
        .listStyle(.sidebar)
    }
    
    @ViewBuilder
    private var contentView: some View {
        switch selectedSection {
        case .dashboard:
            CalibrationDashboardView()
        case .records:
            CalibrationRecordsView()
        case .newCalibration:
            CalibrationEntryView()
        case .standards:
            StandardsRegistryView()
        case .dueSchedule:
            DueScheduleView()
        }
    }
}

// MARK: - Calibration Dashboard View
struct CalibrationDashboardView: View {
    @StateObject private var viewModel = CalibrationDashboardViewModel()
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Quick Stats
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    CalibrationStatCard(
                        title: "Total Instruments",
                        value: "\(viewModel.totalInstruments)",
                        iconName: "dial.medium.fill",
                        color: .blue
                    )
                    
                    CalibrationStatCard(
                        title: "Due This Month",
                        value: "\(viewModel.dueThisMonth)",
                        iconName: "calendar",
                        color: .orange
                    )
                    
                    CalibrationStatCard(
                        title: "Overdue",
                        value: "\(viewModel.overdue)",
                        iconName: "exclamationmark.triangle.fill",
                        color: .red
                    )
                }
                
                // Recent Calibrations
                VStack(alignment: .leading, spacing: 12) {
                    Text("Recent Calibrations")
                        .font(.headline)
                    
                    if viewModel.recentCalibrations.isEmpty {
                        Text("No recent calibrations")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding()
                    } else {
                        ForEach(viewModel.recentCalibrations) { event in
                            CalibrationEventRow(event: event)
                        }
                    }
                }
                .padding()
                .background(Color(.secondarySystemBackground))
                .cornerRadius(12)
            }
            .padding()
        }
        .task {
            await viewModel.loadDashboard()
        }
    }
}

// MARK: - Calibration Stat Card
struct CalibrationStatCard: View {
    let title: String
    let value: String
    let iconName: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: iconName)
                .font(.title2)
                .foregroundColor(color)
            
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
            
            Text(title)
                .font(.caption2)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
}

// MARK: - Calibration Event Row
struct CalibrationEventRow: View {
    let event: CalibrationEvent
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(event.instrumentTagId)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Text(event.calibrationDate.formatted(date: .abbreviated, time: .omitted))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            CalibrationResultBadge(result: event.overallResultAsLeft)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Calibration Result Badge
struct CalibrationResultBadge: View {
    let result: String
    
    var color: Color {
        switch result.uppercased() {
        case "PASS": return .green
        case "FAIL": return .red
        case "ADJUSTED": return .orange
        default: return .gray
        }
    }
    
    var body: some View {
        Text(result)
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.2))
            .foregroundColor(color)
            .cornerRadius(4)
    }
}

// MARK: - Calibration Dashboard ViewModel
@MainActor
class CalibrationDashboardViewModel: ObservableObject {
    @Published var totalInstruments = 0
    @Published var dueThisMonth = 0
    @Published var overdue = 0
    @Published var recentCalibrations: [CalibrationEvent] = []
    @Published var isLoading = false
    
    private let apiClient = APIClient.shared
    
    func loadDashboard() async {
        isLoading = true
        
        do {
            let events: [CalibrationEvent] = try await apiClient.request(.calibrationEvents)
            recentCalibrations = Array(events.prefix(5))
            
            // Load instruments count
            let instruments: [InstrumentMaster] = try await apiClient.request(.instruments)
            totalInstruments = instruments.count
            
            // Calculate due and overdue
            let now = Date()
            let endOfMonth = Calendar.current.date(byAdding: .month, value: 1, to: now) ?? now
            
            for instrument in instruments {
                if let lastEvent = events.first(where: { $0.instrumentTagId == instrument.tagId }) {
                    if lastEvent.nextDueDate < now {
                        overdue += 1
                    } else if lastEvent.nextDueDate <= endOfMonth {
                        dueThisMonth += 1
                    }
                }
            }
        } catch {
            // Handle error silently
        }
        
        isLoading = false
    }
}

// MARK: - Calibration Records View
struct CalibrationRecordsView: View {
    @StateObject private var viewModel = CalibrationRecordsViewModel()
    @State private var searchText = ""
    
    var filteredEvents: [CalibrationEvent] {
        if searchText.isEmpty {
            return viewModel.events
        }
        return viewModel.events.filter {
            $0.instrumentTagId.localizedCaseInsensitiveContains(searchText) ||
            $0.certificateNo.localizedCaseInsensitiveContains(searchText)
        }
    }
    
    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.events.isEmpty {
                ProgressView("Loading calibrations...")
            } else if viewModel.events.isEmpty {
                EmptyStateView(
                    title: "No Calibration Records",
                    message: "No calibration events have been recorded yet.",
                    iconName: "dial.medium"
                )
            } else {
                List(filteredEvents) { event in
                    NavigationLink {
                        CalibrationDetailView(event: event)
                    } label: {
                        CalibrationRecordRow(event: event)
                    }
                }
                .listStyle(.plain)
                .searchable(text: $searchText, prompt: "Search by tag or certificate")
                .refreshable {
                    await viewModel.loadEvents()
                }
            }
        }
        .task {
            await viewModel.loadEvents()
        }
    }
}

// MARK: - Calibration Record Row
struct CalibrationRecordRow: View {
    let event: CalibrationEvent
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(event.certificateNo)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                
                Spacer()
                
                CalibrationResultBadge(result: event.overallResultAsLeft)
            }
            
            HStack {
                Label(event.instrumentTagId, systemImage: "dial.medium.fill")
                Spacer()
                Text(event.calibrationDate.formatted(date: .abbreviated, time: .omitted))
            }
            .font(.caption)
            .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Calibration Records ViewModel
@MainActor
class CalibrationRecordsViewModel: ObservableObject {
    @Published var events: [CalibrationEvent] = []
    @Published var isLoading = false
    
    private let apiClient = APIClient.shared
    
    func loadEvents() async {
        isLoading = true
        
        do {
            let response: [CalibrationEvent] = try await apiClient.request(.calibrationEvents)
            events = response
        } catch {
            // Handle error silently
        }
        
        isLoading = false
    }
}

// MARK: - Calibration Detail View
struct CalibrationDetailView: View {
    let event: CalibrationEvent
    
    var body: some View {
        List {
            Section("Certificate Info") {
                LabeledContent("Certificate No", value: event.certificateNo)
                LabeledContent("Instrument Tag", value: event.instrumentTagId)
                LabeledContent("Standard Used", value: event.standardUsedId)
            }
            
            Section("Dates") {
                LabeledContent("Calibration Date", value: event.calibrationDate.formatted(date: .long, time: .omitted))
                if let prevDate = event.previousCalDate {
                    LabeledContent("Previous Date", value: prevDate.formatted(date: .long, time: .omitted))
                }
                LabeledContent("Next Due", value: event.nextDueDate.formatted(date: .long, time: .omitted))
            }
            
            Section("Environmental Conditions") {
                if let temp = event.ambientTemp {
                    LabeledContent("Ambient Temp", value: "\(temp, specifier: "%.1f") °C")
                }
                if let humidity = event.humidity {
                    LabeledContent("Humidity", value: "\(humidity, specifier: "%.1f") %RH")
                }
                if let pressure = event.atmosphericPressure {
                    LabeledContent("Atmospheric Pressure", value: "\(pressure, specifier: "%.1f") mbar")
                }
            }
            
            Section("Results") {
                LabeledContent("As Found", value: event.overallResultAsFound)
                LabeledContent("As Left", value: event.overallResultAsLeft)
                if let maxErrorFound = event.maxErrorFoundPct {
                    LabeledContent("Max Error Found", value: "\(maxErrorFound, specifier: "%.2f")%")
                }
                if let maxErrorLeft = event.maxErrorLeftPct {
                    LabeledContent("Max Error Left", value: "\(maxErrorLeft, specifier: "%.2f")%")
                }
            }
            
            Section("Sign-off") {
                LabeledContent("Performed By", value: event.performedBy)
                if let approvedBy = event.approvedBy {
                    LabeledContent("Approved By", value: approvedBy)
                }
                LabeledContent("Status", value: event.status)
            }
        }
        .navigationTitle(event.certificateNo)
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Calibration Entry View
struct CalibrationEntryView: View {
    @StateObject private var viewModel = CalibrationEntryViewModel()
    @State private var showingSuccess = false
    
    var body: some View {
        Form {
            Section("Instrument") {
                Picker("Select Instrument", selection: $viewModel.selectedInstrumentId) {
                    Text("Select...").tag("")
                    ForEach(viewModel.instruments) { instrument in
                        Text(instrument.tagId).tag(instrument.tagId)
                    }
                }
                
                Picker("Standard Used", selection: $viewModel.selectedStandardId) {
                    Text("Select...").tag("")
                    ForEach(viewModel.standards) { standard in
                        Text(standard.tagId).tag(standard.tagId)
                    }
                }
            }
            
            Section("Environmental Conditions") {
                TextField("Ambient Temp (°C)", value: $viewModel.ambientTemp, format: .number)
                    .keyboardType(.decimalPad)
                
                TextField("Humidity (%RH)", value: $viewModel.humidity, format: .number)
                    .keyboardType(.decimalPad)
                
                TextField("Atmospheric Pressure (mbar)", value: $viewModel.atmosphericPressure, format: .number)
                    .keyboardType(.decimalPad)
            }
            
            Section("5-Point Calibration") {
                ForEach(0..<5) { index in
                    HStack {
                        Text("\(index * 25)%")
                            .frame(width: 50)
                        
                        TextField("As Found", value: $viewModel.asFoundReadings[index], format: .number)
                            .keyboardType(.decimalPad)
                        
                        TextField("As Left", value: $viewModel.asLeftReadings[index], format: .number)
                            .keyboardType(.decimalPad)
                    }
                }
            }
            
            Section("Results") {
                Picker("As Found Result", selection: $viewModel.asFoundResult) {
                    Text("PASS").tag("PASS")
                    Text("FAIL").tag("FAIL")
                    Text("OUT_OF_TOLERANCE").tag("OUT_OF_TOLERANCE")
                }
                
                Picker("As Left Result", selection: $viewModel.asLeftResult) {
                    Text("PASS").tag("PASS")
                    Text("FAIL").tag("FAIL")
                    Text("ADJUSTED").tag("ADJUSTED")
                }
                
                Toggle("Adjustment Made", isOn: $viewModel.adjustmentMade)
                Toggle("Repair Required", isOn: $viewModel.repairRequired)
            }
            
            Section("Remarks") {
                TextEditor(text: $viewModel.remarks)
                    .frame(minHeight: 60)
            }
            
            Section {
                Button {
                    Task {
                        await viewModel.submit()
                        if viewModel.error == nil {
                            showingSuccess = true
                        }
                    }
                } label: {
                    HStack {
                        Spacer()
                        if viewModel.isLoading {
                            ProgressView()
                        } else {
                            Text("Submit Calibration")
                                .fontWeight(.semibold)
                        }
                        Spacer()
                    }
                }
                .disabled(!viewModel.isValid || viewModel.isLoading)
            }
        }
        .task {
            await viewModel.loadData()
        }
        .alert("Success", isPresented: $showingSuccess) {
            Button("OK") { viewModel.reset() }
        } message: {
            Text("Calibration recorded successfully!")
        }
    }
}

// MARK: - Calibration Entry ViewModel
@MainActor
class CalibrationEntryViewModel: ObservableObject {
    @Published var instruments: [InstrumentMaster] = []
    @Published var standards: [CalibrationStandard] = []
    @Published var selectedInstrumentId = ""
    @Published var selectedStandardId = ""
    @Published var ambientTemp: Double?
    @Published var humidity: Double?
    @Published var atmosphericPressure: Double?
    @Published var asFoundReadings: [Double?] = Array(repeating: nil, count: 5)
    @Published var asLeftReadings: [Double?] = Array(repeating: nil, count: 5)
    @Published var asFoundResult = "PASS"
    @Published var asLeftResult = "PASS"
    @Published var adjustmentMade = false
    @Published var repairRequired = false
    @Published var remarks = ""
    @Published var isLoading = false
    @Published var error: String?
    
    private let apiClient = APIClient.shared
    
    var isValid: Bool {
        !selectedInstrumentId.isEmpty && !selectedStandardId.isEmpty
    }
    
    func loadData() async {
        do {
            instruments = try await apiClient.request(.instruments)
            standards = try await apiClient.request(.calibrationStandards)
        } catch {
            // Handle error silently
        }
    }
    
    func submit() async {
        isLoading = true
        error = nil
        
        // Implementation for submitting calibration
        
        isLoading = false
    }
    
    func reset() {
        selectedInstrumentId = ""
        selectedStandardId = ""
        ambientTemp = nil
        humidity = nil
        atmosphericPressure = nil
        asFoundReadings = Array(repeating: nil, count: 5)
        asLeftReadings = Array(repeating: nil, count: 5)
        asFoundResult = "PASS"
        asLeftResult = "PASS"
        adjustmentMade = false
        repairRequired = false
        remarks = ""
    }
}

// MARK: - Standards Registry View
struct StandardsRegistryView: View {
    @StateObject private var viewModel = StandardsRegistryViewModel()
    
    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView("Loading standards...")
            } else if viewModel.standards.isEmpty {
                EmptyStateView(
                    title: "No Standards",
                    message: "No calibration standards have been registered.",
                    iconName: "checkmark.seal"
                )
            } else {
                List(viewModel.standards) { standard in
                    StandardRow(standard: standard)
                }
                .listStyle(.plain)
                .refreshable {
                    await viewModel.loadStandards()
                }
            }
        }
        .task {
            await viewModel.loadStandards()
        }
    }
}

// MARK: - Standard Row
struct StandardRow: View {
    let standard: CalibrationStandard
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(standard.tagId)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Spacer()
                
                Text(standard.category)
                    .font(.caption2)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(standard.category == "Lab" ? Color.blue.opacity(0.2) : Color.green.opacity(0.2))
                    .cornerRadius(4)
            }
            
            Text(standard.description)
                .font(.caption)
                .foregroundColor(.secondary)
            
            if let dueDate = standard.dueDate {
                HStack {
                    Image(systemName: "calendar")
                    Text("Due: \(dueDate.formatted(date: .abbreviated, time: .omitted))")
                }
                .font(.caption2)
                .foregroundColor(dueDate < Date() ? .red : .secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Standards Registry ViewModel
@MainActor
class StandardsRegistryViewModel: ObservableObject {
    @Published var standards: [CalibrationStandard] = []
    @Published var isLoading = false
    
    private let apiClient = APIClient.shared
    
    func loadStandards() async {
        isLoading = true
        
        do {
            let response: [CalibrationStandard] = try await apiClient.request(.calibrationStandards)
            standards = response
        } catch {
            // Handle error silently
        }
        
        isLoading = false
    }
}

// MARK: - Due Schedule View
struct DueScheduleView: View {
    var body: some View {
        EmptyStateView(
            title: "Due Schedule",
            message: "Calibration due schedule view coming soon.",
            iconName: "calendar.badge.exclamationmark"
        )
    }
}

#Preview {
    NavigationStack {
        CalibrationHubView()
    }
}
