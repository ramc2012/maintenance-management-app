import SwiftUI

// MARK: - Logbook Category
enum LogbookViewCategory: String, CaseIterable, Identifiable {
    case mechanical = "Mechanical"
    case electrical = "Electrical"
    case process = "Process"
    
    var id: String { rawValue }
    
    var iconName: String {
        switch self {
        case .mechanical: return "gearshape.2.fill"
        case .electrical: return "bolt.fill"
        case .process: return "flame.fill"
        }
    }
    
    var color: Color {
        switch self {
        case .mechanical: return .blue
        case .electrical: return .yellow
        case .process: return .orange
        }
    }
    
    var sections: [LogbookSection] {
        switch self {
        case .mechanical:
            return [.maintenanceLog, .runningHours]
        case .electrical:
            return [.maintenanceLog, .runningHours, .earthPitResistance, .irValueLog]
        case .process:
            return [.gasCompression, .compressorParameters]
        }
    }
}

// MARK: - Logbook Section
enum LogbookSection: String, Identifiable {
    case maintenanceLog = "Maintenance Log"
    case runningHours = "Running Hours"
    case earthPitResistance = "Earth Pit Resistance"
    case irValueLog = "IR Value Log"
    case gasCompression = "Gas Compression"
    case compressorParameters = "Compressor Parameters"
    
    var id: String { rawValue }
    
    var iconName: String {
        switch self {
        case .maintenanceLog: return "doc.text.fill"
        case .runningHours: return "clock.fill"
        case .earthPitResistance: return "antenna.radiowaves.left.and.right"
        case .irValueLog: return "waveform.path.ecg"
        case .gasCompression: return "wind"
        case .compressorParameters: return "gauge.with.dots.needle.bottom.50percent"
        }
    }
}

// MARK: - Logbook Hub View
struct LogbookHubView: View {
    @State private var selectedCategory: LogbookViewCategory = .mechanical
    @State private var selectedSection: LogbookSection = .maintenanceLog
    @Environment(\.horizontalSizeClass) var horizontalSizeClass
    
    var body: some View {
        Group {
            if horizontalSizeClass == .regular {
                // iPad: Split view
                HStack(spacing: 0) {
                    logbookSidebar
                        .frame(width: 250)
                    
                    Divider()
                    
                    contentView
                        .frame(maxWidth: .infinity)
                }
            } else {
                // iPhone: Category cards + content
                VStack(spacing: 0) {
                    categorySelector
                    
                    sectionPicker
                    
                    contentView
                }
            }
        }
        .navigationTitle("Logbook")
        .navigationBarTitleDisplayMode(.inline)
    }
    
    // MARK: - Category Selector (iPhone)
    private var categorySelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(LogbookViewCategory.allCases) { category in
                    CategoryCard(
                        category: category,
                        isSelected: selectedCategory == category
                    ) {
                        withAnimation {
                            selectedCategory = category
                            selectedSection = category.sections.first ?? .maintenanceLog
                        }
                    }
                }
            }
            .padding()
        }
        .background(Color(.systemBackground))
    }
    
    // MARK: - Section Picker (iPhone)
    private var sectionPicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(selectedCategory.sections) { section in
                    Button {
                        selectedSection = section
                    } label: {
                        HStack {
                            Image(systemName: section.iconName)
                            Text(section.rawValue)
                        }
                        .font(.subheadline)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(selectedSection == section ? Color.accentColor : Color(.secondarySystemBackground))
                        .foregroundColor(selectedSection == section ? .white : .primary)
                        .cornerRadius(8)
                    }
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 8)
        }
    }
    
    // MARK: - Sidebar (iPad)
    private var logbookSidebar: some View {
        List {
            ForEach(LogbookViewCategory.allCases) { category in
                Section {
                    ForEach(category.sections) { section in
                        Button {
                            selectedCategory = category
                            selectedSection = section
                        } label: {
                            Label(section.rawValue, systemImage: section.iconName)
                                .foregroundColor(selectedSection == section ? .accentColor : .primary)
                        }
                    }
                } header: {
                    HStack {
                        Image(systemName: category.iconName)
                            .foregroundColor(category.color)
                        Text(category.rawValue)
                    }
                }
            }
        }
        .listStyle(.sidebar)
    }
    
    // MARK: - Content View
    @ViewBuilder
    private var contentView: some View {
        switch selectedSection {
        case .maintenanceLog:
            MaintenanceLogView(department: selectedCategory.rawValue)
        case .runningHours:
            RunningHoursLogView()
        case .earthPitResistance:
            ElectricalTestLogView(testType: .earthPit)
        case .irValueLog:
            ElectricalTestLogView(testType: .irValue)
        case .gasCompression:
            CompressionLogView()
        case .compressorParameters:
            CompressorParametersView()
        }
    }
}

// MARK: - Category Card
struct CategoryCard: View {
    let category: LogbookViewCategory
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: category.iconName)
                    .font(.title2)
                    .foregroundColor(isSelected ? .white : category.color)
                
                Text(category.rawValue)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(isSelected ? .white : .primary)
            }
            .frame(width: 100, height: 80)
            .background(isSelected ? category.color : Color(.secondarySystemBackground))
            .cornerRadius(12)
        }
    }
}

// MARK: - Maintenance Log View
struct MaintenanceLogView: View {
    let department: String
    @StateObject private var viewModel = MaintenanceLogViewModel()
    @State private var showingAddLog = false
    
    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.logs.isEmpty {
                ProgressView("Loading logs...")
            } else if let error = viewModel.error, viewModel.logs.isEmpty {
                ErrorStateView(message: error) {
                    Task { await viewModel.loadLogs(department: department) }
                }
            } else if viewModel.logs.isEmpty {
                EmptyStateView(
                    title: "No Maintenance Logs",
                    message: "No maintenance logs found for \(department).",
                    iconName: "doc.text"
                )
            } else {
                List(viewModel.logs) { log in
                    NavigationLink {
                        MaintenanceLogDetailView(log: log)
                    } label: {
                        MaintenanceLogRow(log: log)
                    }
                }
                .listStyle(.plain)
                .refreshable {
                    await viewModel.loadLogs(department: department)
                }
            }
        }
        .task {
            await viewModel.loadLogs(department: department)
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
                CreateMaintenanceLogView(department: department)
            }
        }
    }
}

// MARK: - Maintenance Log Row
struct MaintenanceLogRow: View {
    let log: MaintenanceLog
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(log.date.formatted(date: .abbreviated, time: .omitted))
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Spacer()
                
                StatusBadge(status: log.status)
            }
            
            Text(log.description)
                .font(.caption)
                .foregroundColor(.secondary)
                .lineLimit(2)
            
            HStack {
                Label(log.jobType, systemImage: log.jobType == "PM" ? "wrench.fill" : "exclamationmark.triangle.fill")
                    .foregroundColor(log.jobType == "PM" ? .green : .orange)
                
                Spacer()
                
                Label("\(log.durationHours, specifier: "%.1f") hrs", systemImage: "clock")
            }
            .font(.caption2)
            .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Maintenance Log Detail View
struct MaintenanceLogDetailView: View {
    let log: MaintenanceLog
    
    var body: some View {
        List {
            Section("Job Details") {
                LabeledContent("Date", value: log.date.formatted(date: .long, time: .omitted))
                LabeledContent("Department", value: log.department)
                LabeledContent("Section", value: log.section)
                LabeledContent("Job Type", value: log.jobType)
                LabeledContent("Criticality", value: log.criticalityLevel)
                LabeledContent("Status", value: log.status)
            }
            
            Section("Description") {
                Text(log.description)
            }
            
            if let equipmentTag = log.equipmentTag {
                Section("Equipment") {
                    LabeledContent("Equipment Tag", value: equipmentTag)
                    if let equipmentType = log.equipmentTypeName {
                        LabeledContent("Type", value: equipmentType)
                    }
                }
            }
            
            Section("Time") {
                LabeledContent("Start Time", value: log.startTime.formatted(date: .omitted, time: .shortened))
                LabeledContent("End Time", value: log.endTime.formatted(date: .omitted, time: .shortened))
                LabeledContent("Duration", value: "\(log.durationHours, specifier: "%.1f") hours")
            }
            
            if let remarks = log.remarks {
                Section("Remarks") {
                    Text(remarks)
                }
            }
        }
        .navigationTitle("Log Details")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Create Maintenance Log View
struct CreateMaintenanceLogView: View {
    let department: String
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = CreateMaintenanceLogViewModel()
    
    var body: some View {
        Form {
            Section("Job Information") {
                DatePicker("Date", selection: $viewModel.date, displayedComponents: .date)
                
                Picker("Job Type", selection: $viewModel.jobType) {
                    Text("PM").tag("PM")
                    Text("BD").tag("BD")
                }
                
                Picker("Criticality", selection: $viewModel.criticality) {
                    Text("Routine").tag(1)
                    Text("Monthly").tag(2)
                    Text("Annual").tag(3)
                }
                
                TextField("Equipment Tag (Optional)", text: $viewModel.equipmentTag)
            }
            
            Section("Description") {
                TextEditor(text: $viewModel.description)
                    .frame(minHeight: 100)
            }
            
            Section("Time") {
                DatePicker("Start Time", selection: $viewModel.startTime, displayedComponents: .hourAndMinute)
                DatePicker("End Time", selection: $viewModel.endTime, displayedComponents: .hourAndMinute)
            }
            
            Section("Remarks") {
                TextEditor(text: $viewModel.remarks)
                    .frame(minHeight: 60)
            }
        }
        .navigationTitle("New Maintenance Log")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") {
                    Task {
                        await viewModel.save(department: department)
                        dismiss()
                    }
                }
                .disabled(!viewModel.isValid)
            }
        }
    }
}

// MARK: - Maintenance Log ViewModel
@MainActor
class MaintenanceLogViewModel: ObservableObject {
    @Published var logs: [MaintenanceLog] = []
    @Published var isLoading = false
    @Published var error: String?
    
    private let apiClient = APIClient.shared
    
    func loadLogs(department: String) async {
        isLoading = true
        error = nil
        
        do {
            let queryItems = [URLQueryItem(name: "department", value: department)]
            let response: [MaintenanceLog] = try await apiClient.request(
                .maintenanceLogs,
                queryItems: queryItems
            )
            logs = response
        } catch let apiError as APIError {
            error = apiError.errorDescription
        } catch {
            self.error = "Failed to load logs"
        }
        
        isLoading = false
    }
}

// MARK: - Create Maintenance Log ViewModel
@MainActor
class CreateMaintenanceLogViewModel: ObservableObject {
    @Published var date = Date()
    @Published var jobType = "PM"
    @Published var criticality = 1
    @Published var equipmentTag = ""
    @Published var description = ""
    @Published var startTime = Date()
    @Published var endTime = Date()
    @Published var remarks = ""
    
    var isValid: Bool {
        !description.trimmingCharacters(in: .whitespaces).isEmpty
    }
    
    private let apiClient = APIClient.shared
    
    func save(department: String) async {
        // Implementation for saving
    }
}

// MARK: - Running Hours Log View
struct RunningHoursLogView: View {
    @StateObject private var viewModel = RunningHoursViewModel()
    
    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView("Loading...")
            } else if viewModel.logs.isEmpty {
                EmptyStateView(
                    title: "No Running Hours Logs",
                    message: "No running hours have been logged yet.",
                    iconName: "clock"
                )
            } else {
                List(viewModel.logs) { log in
                    RunningHoursRow(log: log)
                }
                .listStyle(.plain)
                .refreshable {
                    await viewModel.loadLogs()
                }
            }
        }
        .task {
            await viewModel.loadLogs()
        }
    }
}

// MARK: - Running Hours Row
struct RunningHoursRow: View {
    let log: EquipmentLog
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(log.equipmentTag)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Spacer()
                
                Circle()
                    .fill(log.runStatus ? Color.green : Color.red)
                    .frame(width: 10, height: 10)
                
                Text(log.runStatus ? "Running" : "Stopped")
                    .font(.caption)
                    .foregroundColor(log.runStatus ? .green : .red)
            }
            
            HStack {
                Text(log.date.formatted(date: .abbreviated, time: .omitted))
                Text("•")
                Text(log.shift)
                
                Spacer()
                
                if let hours = log.totalRunHours {
                    Text("\(hours, specifier: "%.1f") hrs")
                        .fontWeight(.medium)
                }
            }
            .font(.caption)
            .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Running Hours ViewModel
@MainActor
class RunningHoursViewModel: ObservableObject {
    @Published var logs: [EquipmentLog] = []
    @Published var isLoading = false
    
    private let apiClient = APIClient.shared
    
    func loadLogs() async {
        isLoading = true
        
        do {
            let response: [EquipmentLog] = try await apiClient.request(.equipmentLogs)
            logs = response
        } catch {
            // Handle error silently for now
        }
        
        isLoading = false
    }
}

// MARK: - Electrical Test Log View
struct ElectricalTestLogView: View {
    enum TestType {
        case earthPit
        case irValue
        
        var title: String {
            switch self {
            case .earthPit: return "Earth Pit Resistance"
            case .irValue: return "IR Value Log"
            }
        }
    }
    
    let testType: TestType
    
    var body: some View {
        EmptyStateView(
            title: testType.title,
            message: "\(testType.title) logging coming soon.",
            iconName: testType == .earthPit ? "antenna.radiowaves.left.and.right" : "waveform.path.ecg"
        )
    }
}

// MARK: - Compression Log View
struct CompressionLogView: View {
    var body: some View {
        EmptyStateView(
            title: "Gas Compression Log",
            message: "Gas compression logging coming soon.",
            iconName: "wind"
        )
    }
}

// MARK: - Compressor Parameters View
struct CompressorParametersView: View {
    var body: some View {
        EmptyStateView(
            title: "Compressor Parameters",
            message: "Compressor parameter logging coming soon.",
            iconName: "gauge.with.dots.needle.bottom.50percent"
        )
    }
}

// MARK: - PMS Health Widget
struct PMSHealthWidget: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "heart.fill")
                    .foregroundColor(.red)
                Text("PMS Health")
                    .font(.headline)
            }
            
            HStack(spacing: 16) {
                PMSStatItem(title: "Due", value: "--", color: .orange)
                PMSStatItem(title: "Overdue", value: "--", color: .red)
                PMSStatItem(title: "Completed", value: "--", color: .green)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
}

struct PMSStatItem: View {
    let title: String
    let value: String
    let color: Color
    
    var body: some View {
        VStack {
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

#Preview {
    NavigationStack {
        LogbookHubView()
    }
}
