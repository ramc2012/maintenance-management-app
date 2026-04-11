import SwiftUI
import Foundation

// MARK: - Report Period
enum ReportsPeriodFilter: String, CaseIterable, Identifiable {
    case daily = "Daily"
    case monthly = "Monthly"
    case yearly = "Yearly"
    
    var id: String { rawValue }
}

// MARK: - Reports Hub View
struct ReportsHubView: View {
    @State private var selectedPeriod: ReportsPeriodFilter = .daily
    @StateObject private var viewModel = ReportsViewModel()
    @State private var showingNewReport = false
    @State private var showingFilters = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Period Selector
            Picker("Period", selection: $selectedPeriod) {
                ForEach(ReportsPeriodFilter.allCases) { period in
                    Text(period.rawValue).tag(period)
                }
            }
            .pickerStyle(.segmented)
            .padding()
            
            // Sync Status Banner (if offline or pending sync)
            if !viewModel.isOnline || viewModel.pendingCount > 0 {
                SyncStatusBanner(
                    isConnected: viewModel.isOnline,
                    pendingCount: viewModel.pendingCount,
                    syncStatus: viewModel.syncStatus
                ) {
                    Task { await viewModel.syncPendingReports() }
                }
            }
            
            // Filters Summary
            if viewModel.hasActiveFilters {
                ActiveFiltersBar(viewModel: viewModel)
            }
            
            // Report List
            if viewModel.isLoading && viewModel.reports.isEmpty {
                Spacer()
                ProgressView("Loading reports...")
                Spacer()
            } else if viewModel.reports.isEmpty {
                Spacer()
                EmptyStateView(
                    title: "No Reports",
                    message: "No reports found for the selected period.",
                    iconName: "chart.bar.doc.horizontal"
                )
                Spacer()
            } else {
                List {
                    ForEach(viewModel.reports) { report in
                        NavigationLink {
                            ReportDetailView(report: report)
                        } label: {
                            ReportRow(report: report)
                        }
                    }
                }
                .listStyle(.plain)
                .refreshable {
                    await viewModel.loadReports(period: selectedPeriod)
                }
            }
        }
        .navigationTitle("Reports")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Menu {
                    Button {
                        showingFilters = true
                    } label: {
                        Label("Filters", systemImage: viewModel.hasActiveFilters ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle")
                    }

                    Button {
                        viewModel.toggleConnectivity()
                    } label: {
                        Label(viewModel.isOnline ? "Go Offline" : "Go Online", systemImage: viewModel.isOnline ? "wifi.slash" : "wifi")
                    }
                } label: {
                    Image(systemName: viewModel.hasActiveFilters ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle")
                }
            }
            
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    showingNewReport = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showingNewReport) {
            NavigationStack {
                DailyLogFormView(viewModel: viewModel)
            }
        }
        .sheet(isPresented: $showingFilters) {
            NavigationStack {
                ReportFiltersView(viewModel: viewModel)
            }
        }
        .onChange(of: selectedPeriod) { _, newValue in
            viewModel.filter.period = newValue
            Task { await viewModel.loadReports(period: newValue) }
        }
        .onReceive(NotificationCenter.default.publisher(for: .reportsDidChange)) { _ in
            Task { await viewModel.loadReports(period: selectedPeriod) }
        }
        .task {
            await viewModel.loadReports(period: selectedPeriod)
        }
    }
}

// MARK: - Sync Status Banner
struct SyncStatusBanner: View {
    let isConnected: Bool
    let pendingCount: Int
    let syncStatus: SyncStatus
    let onSync: () -> Void
    
    var body: some View {
        HStack {
            if !isConnected {
                Image(systemName: "wifi.slash")
                Text("Offline Mode")
            } else if pendingCount > 0 {
                switch syncStatus {
                case .idle:
                    Image(systemName: "arrow.triangle.2.circlepath")
                    Text("\(pendingCount) pending sync")
                case .syncing:
                    ProgressView()
                        .scaleEffect(0.8)
                    Text("Syncing...")
                case .success:
                    Image(systemName: "checkmark.circle.fill")
                    Text("Synced!")
                case .failed:
                    Image(systemName: "exclamationmark.circle.fill")
                    Text("Sync failed")
                }
            }
            
            Spacer()
            
            if isConnected && pendingCount > 0 && syncStatus == .idle {
                Button("Sync Now") {
                    onSync()
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
            }
        }
        .font(.caption)
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(isConnected ? Color.orange.opacity(0.2) : Color.gray.opacity(0.2))
    }
}

// MARK: - Active Filters Bar
struct ActiveFiltersBar: View {
    @ObservedObject var viewModel: ReportsViewModel
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack {
                if let dept = viewModel.filter.department {
                    FilterChip(label: dept) {
                        viewModel.filter.department = nil
                    }
                }
                
                if let section = viewModel.filter.section {
                    FilterChip(label: section) {
                        viewModel.filter.section = nil
                    }
                }
                
                if let jobType = viewModel.filter.jobType {
                    FilterChip(label: jobType) {
                        viewModel.filter.jobType = nil
                    }
                }
                
                Button("Clear All") {
                    viewModel.clearFilters()
                }
                .font(.caption)
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
        .background(Color(.secondarySystemBackground))
    }
}

// MARK: - Filter Chip
private struct FilterChip: View {
    let label: String
    let onRemove: () -> Void
    
    var body: some View {
        HStack(spacing: 4) {
            Text(label)
            Button {
                onRemove()
            } label: {
                Image(systemName: "xmark.circle.fill")
            }
        }
        .font(.caption)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color.accentColor.opacity(0.2))
        .cornerRadius(12)
    }
}

// MARK: - Report Row
struct ReportRow: View {
    let report: Report
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(report.date.formatted(date: .abbreviated, time: .omitted))
                    .font(.subheadline)
                    .fontWeight(.semibold)
                
                Spacer()
                
                HStack(spacing: 4) {
                    // Sync indicator
                    if report.syncStatus != .synced {
                        Image(systemName: report.syncStatus == .pending ? "arrow.triangle.2.circlepath" : "exclamationmark.triangle.fill")
                            .foregroundColor(report.syncStatus == .pending ? .orange : .red)
                            .font(.caption2)
                    }
                    
                    StatusBadge(status: report.status)
                }
            }
            
            Text(report.description)
                .font(.caption)
                .foregroundColor(.secondary)
                .lineLimit(2)
            
            HStack {
                Label(report.department, systemImage: "building.2")
                Text("•")
                Label(report.jobType, systemImage: report.jobType == "PM" ? "wrench" : "exclamationmark.triangle")
                    .foregroundColor(report.jobType == "PM" ? .green : .orange)
                
                Spacer()
                
                Text("\(report.durationHours, specifier: "%.1f") hrs")
            }
            .font(.caption2)
            .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Report Detail View
struct ReportDetailView: View {
    let report: Report
    
    var body: some View {
        List {
            Section("Details") {
                LabeledContent("Date", value: report.date.formatted(date: .long, time: .omitted))
                LabeledContent("Department", value: report.department)
                LabeledContent("Section", value: report.section)
                LabeledContent("Job Type", value: report.jobType)
                LabeledContent("Criticality", value: report.criticalityLevel)
                LabeledContent("Status", value: report.status)
            }
            
            Section("Description") {
                Text(report.description)
            }
            
            if let equipmentTag = report.equipmentTag {
                Section("Equipment") {
                    LabeledContent("Equipment Tag", value: equipmentTag)
                    if let type = report.equipmentTypeName {
                        LabeledContent("Type", value: type)
                    }
                }
            }
            
            Section("Time") {
                LabeledContent("Start Time", value: report.startTime.formatted(date: .omitted, time: .shortened))
                LabeledContent("End Time", value: report.endTime.formatted(date: .omitted, time: .shortened))
                LabeledContent("Duration", value: String(format: "%.1f hours", report.durationHours))
            }
            
            if let remarks = report.remarks {
                Section("Remarks") {
                    Text(remarks)
                }
            }
            
            Section("Sync Status") {
                HStack {
                    switch report.syncStatus {
                    case .synced:
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                        Text("Synced to server")
                    case .pending:
                        Image(systemName: "arrow.triangle.2.circlepath")
                            .foregroundColor(.orange)
                        Text("Pending sync")
                    case .conflict:
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.red)
                        Text("Sync conflict")
                    }
                }
                
                LabeledContent("Local Modified", value: report.localModifiedAt.formatted(date: .abbreviated, time: .shortened))
                
                if let serverModified = report.serverModifiedAt {
                    LabeledContent("Server Modified", value: serverModified.formatted(date: .abbreviated, time: .shortened))
                }
            }
        }
        .navigationTitle("Report Details")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Daily Log Form View
struct DailyLogFormView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: ReportsViewModel
    @StateObject private var formViewModel = DailyLogFormViewModel()
    @State private var showingSuccess = false
    
    var body: some View {
        Form {
            Section("Basic Information") {
                DatePicker("Date", selection: $formViewModel.date, displayedComponents: .date)
                
                Picker("Department", selection: $formViewModel.department) {
                    Text("Select...").tag("")
                    Text("DS").tag("DS")
                    Text("Electrical").tag("Electrical")
                    Text("Mechanical").tag("Mechanical")
                }
                
                TextField("Section", text: $formViewModel.section)
            }
            
            Section("Job Details") {
                Picker("Job Type", selection: $formViewModel.jobType) {
                    Text("PM").tag("PM")
                    Text("BD").tag("BD")
                }
                
                Picker("Criticality", selection: $formViewModel.criticality) {
                    Text("Routine").tag(1)
                    Text("Monthly").tag(2)
                    Text("Annual").tag(3)
                }
                
                TextField("Equipment Tag (Optional)", text: $formViewModel.equipmentTag)
            }
            
            Section("Description") {
                TextEditor(text: $formViewModel.description)
                    .frame(minHeight: 100)
            }
            
            Section("Time") {
                DatePicker("Start Time", selection: $formViewModel.startTime, displayedComponents: .hourAndMinute)
                DatePicker("End Time", selection: $formViewModel.endTime, displayedComponents: .hourAndMinute)
                
                HStack {
                    Text("Duration")
                    Spacer()
                    Text("\(formViewModel.calculatedDuration, specifier: "%.1f") hours")
                        .foregroundColor(.secondary)
                }
            }
            
            Section("Remarks") {
                TextEditor(text: $formViewModel.remarks)
                    .frame(minHeight: 60)
            }
            
            if !viewModel.isOnline {
                Section {
                    HStack {
                        Image(systemName: "info.circle.fill")
                            .foregroundColor(.orange)
                        Text("You are offline. This report will be saved locally and synced when you're back online.")
                            .font(.caption)
                    }
                }
            }
        }
        .navigationTitle("New Report")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") {
                    Task {
                        await formViewModel.save(
                            viewModel: viewModel,
                            isOnline: viewModel.isOnline
                        )
                        if formViewModel.error == nil {
                            showingSuccess = true
                        }
                    }
                }
                .disabled(!formViewModel.isValid || formViewModel.isLoading)
            }
        }
        .alert("Success", isPresented: $showingSuccess) {
            Button("OK") { dismiss() }
        } message: {
            Text(viewModel.isOnline ? "Report saved successfully!" : "Report saved locally. It will sync when you're back online.")
        }
    }
}

// MARK: - Report Filters View
struct ReportFiltersView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: ReportsViewModel
    
    @State private var tempDepartment: String?
    @State private var tempSection: String?
    @State private var tempJobType: String?
    @State private var tempStartDate: Date?
    @State private var tempEndDate: Date?
    @State private var useCustomDateRange = false
    
    var body: some View {
        Form {
            Section("Department") {
                Picker("Department", selection: $tempDepartment) {
                    Text("All").tag(nil as String?)
                    Text("DS").tag("DS" as String?)
                    Text("Electrical").tag("Electrical" as String?)
                    Text("Mechanical").tag("Mechanical" as String?)
                }
                .pickerStyle(.menu)
            }
            
            Section("Job Type") {
                Picker("Job Type", selection: $tempJobType) {
                    Text("All").tag(nil as String?)
                    Text("PM").tag("PM" as String?)
                    Text("BD").tag("BD" as String?)
                }
                .pickerStyle(.segmented)
            }
            
            Section("Date Range") {
                Toggle("Custom Date Range", isOn: $useCustomDateRange)
                    .onChange(of: useCustomDateRange) { _, newValue in
                        if newValue {
                            tempStartDate = tempStartDate ?? Date()
                            tempEndDate = tempEndDate ?? Date()
                        } else {
                            tempStartDate = nil
                            tempEndDate = nil
                        }
                    }
                
                if useCustomDateRange {
                    DatePicker("Start Date", selection: Binding(
                        get: { tempStartDate ?? Date() },
                        set: { tempStartDate = $0 }
                    ), displayedComponents: .date)
                    
                    DatePicker("End Date", selection: Binding(
                        get: { tempEndDate ?? Date() },
                        set: { tempEndDate = $0 }
                    ), displayedComponents: .date)
                }
            }
        }
        .navigationTitle("Filters")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Apply") {
                    viewModel.filter.department = tempDepartment
                    viewModel.filter.section = tempSection
                    viewModel.filter.jobType = tempJobType
                    viewModel.filter.startDate = tempStartDate
                    viewModel.filter.endDate = tempEndDate
                    Task { await viewModel.loadReports(period: viewModel.filter.period) }
                    dismiss()
                }
            }
        }
        .onAppear {
            tempDepartment = viewModel.filter.department
            tempSection = viewModel.filter.section
            tempJobType = viewModel.filter.jobType
            tempStartDate = viewModel.filter.startDate
            tempEndDate = viewModel.filter.endDate
            useCustomDateRange = tempStartDate != nil
        }
    }
}

// MARK: - Reports ViewModel (with Offline Sync)
@MainActor
class ReportsViewModel: ObservableObject {
    @Published var reports: [Report] = []
    @Published var filter = ReportFilter()
    @Published var isLoading = false
    @Published var pendingCount = 0
    @Published var syncStatus: SyncStatus = .idle
    @Published var isOnline = true
    
    var hasActiveFilters: Bool {
        filter.department != nil || filter.section != nil || filter.jobType != nil || filter.startDate != nil
    }
    
    init() {
        pendingCount = LocalReportsStore.shared.getPendingCount()
    }
    
    func loadReports(period: ReportsPeriodFilter) async {
        isLoading = true
        filter.period = period
        reports = applyFilters(to: LocalReportsStore.shared.loadReports())
        isLoading = false
        pendingCount = LocalReportsStore.shared.getPendingCount()
    }
    
    func saveReport(_ report: Report, isOnline: Bool) async {
        LocalReportsStore.shared.saveReport(report, isOnline: isOnline)
        pendingCount = LocalReportsStore.shared.getPendingCount()
        NotificationCenter.default.post(name: .reportsDidChange, object: nil)
    }
    
    func syncPendingReports() async {
        guard pendingCount > 0, isOnline else { return }
        
        syncStatus = .syncing
        LocalReportsStore.shared.syncPendingReports()
        pendingCount = LocalReportsStore.shared.getPendingCount()
        reports = applyFilters(to: LocalReportsStore.shared.loadReports())
        syncStatus = .success
        try? await Task.sleep(nanoseconds: 1_500_000_000)
        syncStatus = .idle
    }

    func toggleConnectivity() {
        isOnline.toggle()
    }
    
    func clearFilters() {
        filter.department = nil
        filter.section = nil
        filter.jobType = nil
        filter.startDate = nil
        filter.endDate = nil
        filter.status = nil
        Task { await loadReports(period: filter.period) }
    }
    
    private func applyFilters(to reports: [Report]) -> [Report] {
        var result = reports
        
        if let dept = filter.department {
            result = result.filter { $0.department == dept }
        }
        if let section = filter.section {
            result = result.filter { $0.section == section }
        }
        if let jobType = filter.jobType {
            result = result.filter { $0.jobType == jobType }
        }
        if let status = filter.status {
            result = result.filter { $0.status == status }
        }
        
        return result.sorted { $0.date > $1.date }
    }
}

// MARK: - Daily Log Form ViewModel
@MainActor
class DailyLogFormViewModel: ObservableObject {
    @Published var date = Date()
    @Published var department = ""
    @Published var section = ""
    @Published var jobType = "PM"
    @Published var criticality = 1
    @Published var equipmentTag = ""
    @Published var description = ""
    @Published var startTime = Date()
    @Published var endTime = Date()
    @Published var remarks = ""
    @Published var isLoading = false
    @Published var error: String?
    
    var isValid: Bool {
        !department.isEmpty && !description.trimmingCharacters(in: .whitespaces).isEmpty
    }
    
    var calculatedDuration: Double {
        let interval = endTime.timeIntervalSince(startTime)
        return max(0, interval / 3600)
    }
    
    func save(viewModel: ReportsViewModel, isOnline: Bool) async {
        isLoading = true
        error = nil
        
        let report = Report(
            id: UUID().uuidString,
            date: date,
            installationId: "", // Would come from selected installation
            department: department,
            section: section,
            jobType: jobType,
            reportCriticality: criticality,
            equipmentTag: equipmentTag.isEmpty ? nil : equipmentTag,
            equipmentTypeName: nil,
            description: description,
            status: "Open",
            startTime: startTime,
            endTime: endTime,
            durationHours: calculatedDuration,
            remarks: remarks.isEmpty ? nil : remarks,
            createdBy: "current_user", // Would come from auth
            syncStatus: isOnline ? .synced : .pending,
            localModifiedAt: Date(),
            serverModifiedAt: nil
        )
        
        await viewModel.saveReport(report, isOnline: isOnline)
        
        isLoading = false
    }
}

private final class LocalReportsStore {
    static let shared = LocalReportsStore()

    private let reportsKey = "native_reports_records"
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private init() {
        decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
    }

    func loadReports() -> [Report] {
        if let data = UserDefaults.standard.data(forKey: reportsKey),
           let reports = try? decoder.decode([Report].self, from: data) {
            return reports
        }

        let seeded = seedReports()
        persist(seeded)
        return seeded
    }

    func saveReport(_ report: Report, isOnline: Bool) {
        var reports = loadReports()
        let stored = Report(
            id: report.id,
            date: report.date,
            installationId: report.installationId,
            department: report.department,
            section: report.section,
            jobType: report.jobType,
            reportCriticality: report.reportCriticality,
            equipmentTag: report.equipmentTag,
            equipmentTypeName: report.equipmentTypeName,
            description: report.description,
            status: report.status,
            startTime: report.startTime,
            endTime: report.endTime,
            durationHours: report.durationHours,
            remarks: report.remarks,
            createdBy: report.createdBy,
            syncStatus: isOnline ? .synced : .pending,
            localModifiedAt: Date(),
            serverModifiedAt: isOnline ? Date() : nil
        )
        reports.append(stored)
        persist(reports.sorted { $0.date > $1.date })
    }

    func getPendingCount() -> Int {
        loadReports().filter { $0.syncStatus == .pending }.count
    }

    func syncPendingReports() {
        let synced = loadReports().map { report in
            guard report.syncStatus == .pending else { return report }
            var updated = report
            updated.syncStatus = .synced
            updated.serverModifiedAt = Date()
            return updated
        }
        persist(synced)
    }

    private func persist(_ reports: [Report]) {
        if let data = try? encoder.encode(reports) {
            UserDefaults.standard.set(data, forKey: reportsKey)
        }
    }

    private func seedReports() -> [Report] {
        let calendar = Calendar.current
        let now = Date()
        let todayMorning = calendar.date(bySettingHour: 9, minute: 0, second: 0, of: now) ?? now
        let todayNoon = calendar.date(byAdding: .hour, value: 2, to: todayMorning) ?? now
        let yesterdayMorning = calendar.date(byAdding: .day, value: -1, to: todayMorning) ?? now
        let yesterdayAfternoon = calendar.date(byAdding: .hour, value: 3, to: yesterdayMorning) ?? now

        return [
            Report(
                id: UUID().uuidString,
                date: now,
                installationId: "native-local",
                department: "Mechanical",
                section: "Utilities",
                jobType: "PM",
                reportCriticality: 2,
                equipmentTag: "P-204",
                equipmentTypeName: "Process Pump",
                description: "Completed monthly inspection, vibration check, and seal leak monitoring for standby pump.",
                status: "Closed",
                startTime: todayMorning,
                endTime: todayNoon,
                durationHours: 2,
                remarks: "Bearing temperature within expected range.",
                createdBy: "native-seed",
                syncStatus: .synced,
                localModifiedAt: now,
                serverModifiedAt: now
            ),
            Report(
                id: UUID().uuidString,
                date: calendar.date(byAdding: .day, value: -1, to: now) ?? now,
                installationId: "native-local",
                department: "Electrical",
                section: "HT Yard",
                jobType: "BD",
                reportCriticality: 3,
                equipmentTag: "TR-11",
                equipmentTypeName: "Transformer",
                description: "Investigated relay nuisance trip and completed terminal tightening during shutdown window.",
                status: "Open",
                startTime: yesterdayMorning,
                endTime: yesterdayAfternoon,
                durationHours: 3,
                remarks: "Awaiting thermography confirmation.",
                createdBy: "native-seed",
                syncStatus: .pending,
                localModifiedAt: now,
                serverModifiedAt: nil
            )
        ]
    }
}

extension Notification.Name {
    static let reportsDidChange = Notification.Name("reportsDidChange")
}

enum SyncStatus: Equatable {
    case idle
    case syncing
    case success
    case failed
}

enum RecordSyncStatus: String, Codable, Equatable {
    case synced
    case pending
    case conflict
}

struct Report: Codable, Identifiable, Equatable {
    let id: String
    let date: Date
    let installationId: String
    let department: String
    let section: String
    let jobType: String
    let reportCriticality: Int
    var equipmentTag: String?
    var equipmentTypeName: String?
    let description: String
    let status: String
    let startTime: Date
    let endTime: Date
    let durationHours: Double
    var remarks: String?
    let createdBy: String
    var syncStatus: RecordSyncStatus
    var localModifiedAt: Date
    var serverModifiedAt: Date?

    var criticalityLevel: String {
        switch reportCriticality {
        case 1: return "Routine"
        case 2: return "Monthly"
        case 3: return "Annual"
        default: return "Unknown"
        }
    }
}

struct ReportFilter {
    var period: ReportsPeriodFilter = .daily
    var startDate: Date?
    var endDate: Date?
    var department: String?
    var section: String?
    var jobType: String?
    var status: String?
}

#Preview {
    NavigationStack {
        ReportsHubView()
    }
}
