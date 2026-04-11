import SwiftUI

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
    @EnvironmentObject var networkMonitor: NetworkMonitor
    
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
            if !networkMonitor.isConnected || viewModel.pendingCount > 0 {
                SyncStatusBanner(
                    isConnected: networkMonitor.isConnected,
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
                Button {
                    showingFilters = true
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
                LabeledContent("Duration", value: "\(report.durationHours, specifier: "%.1f") hours")
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
    @EnvironmentObject var networkMonitor: NetworkMonitor
    
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
            
            if !networkMonitor.isConnected {
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
                            isOnline: networkMonitor.isConnected
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
            Text(networkMonitor.isConnected ? "Report saved successfully!" : "Report saved locally. It will sync when you're back online.")
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
    
    private let apiClient = APIClient.shared
    private let syncManager = ReportsSyncManager.shared
    private let cacheManager = CacheManager.shared
    
    var hasActiveFilters: Bool {
        filter.department != nil || filter.section != nil || filter.jobType != nil || filter.startDate != nil
    }
    
    init() {
        pendingCount = syncManager.getPendingCount()
    }
    
    func loadReports(period: ReportsPeriodFilter) async {
        isLoading = true
        filter.period = period
        
        // Load from cache first for offline support
        let cacheKey = "reports_\(period.rawValue)"
        if let cached: [Report] = cacheManager.retrieve(for: cacheKey) {
            reports = applyFilters(to: cached)
        }
        
        // Try to fetch from server
        do {
            let response: [Report] = try await apiClient.request(
                .reports,
                queryItems: filter.queryItems
            )
            
            // Merge with pending local changes
            let merged = syncManager.mergeWithPending(serverReports: response)
            reports = applyFilters(to: merged)
            
            // Cache for offline use
            cacheManager.cache(merged, for: cacheKey, ttl: Constants.Cache.reportsTTL)
        } catch {
            // If offline, keep showing cached data
            print("Failed to load reports from server: \(error)")
        }
        
        isLoading = false
        pendingCount = syncManager.getPendingCount()
    }
    
    func saveReport(_ report: Report, isOnline: Bool) async {
        if isOnline {
            do {
                try await apiClient.requestVoid(.createReport, method: .post, body: report)
            } catch {
                // Failed to save online, queue for later
                syncManager.queueReport(report, action: .create)
            }
        } else {
            // Offline - queue for later
            syncManager.queueReport(report, action: .create)
        }
        
        pendingCount = syncManager.getPendingCount()
    }
    
    func syncPendingReports() async {
        guard pendingCount > 0 else { return }
        
        syncStatus = .syncing
        
        do {
            try await syncManager.syncAllPending()
            syncStatus = .success
            pendingCount = 0
            
            // Reload reports after sync
            await loadReports(period: filter.period)
            
            // Reset status after delay
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            syncStatus = .idle
        } catch {
            syncStatus = .failed(error)
            
            // Reset status after delay
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            syncStatus = .idle
        }
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
            serviceLine: nil,
            notificationNo: nil,
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

// MARK: - Reports Sync Manager
class ReportsSyncManager {
    static let shared = ReportsSyncManager()
    
    private let userDefaults = UserDefaults.standard
    private let pendingKey = "pending_reports"
    
    private init() {}
    
    func queueReport(_ report: Report, action: PendingSyncReport.SyncAction) {
        var pending = getPendingReports()
        let syncReport = PendingSyncReport(
            id: report.id,
            report: report,
            action: action,
            queuedAt: Date(),
            retryCount: 0,
            lastError: nil
        )
        pending.append(syncReport)
        savePendingReports(pending)
    }
    
    func getPendingReports() -> [PendingSyncReport] {
        guard let data = userDefaults.data(forKey: pendingKey),
              let reports = try? JSONDecoder().decode([PendingSyncReport].self, from: data) else {
            return []
        }
        return reports
    }
    
    func getPendingCount() -> Int {
        getPendingReports().count
    }
    
    func mergeWithPending(serverReports: [Report]) -> [Report] {
        var merged = serverReports
        let pending = getPendingReports()
        
        for pendingReport in pending {
            // Add or replace with pending version
            if let index = merged.firstIndex(where: { $0.id == pendingReport.report.id }) {
                merged[index] = pendingReport.report
            } else {
                merged.append(pendingReport.report)
            }
        }
        
        return merged
    }
    
    func syncAllPending() async throws {
        let pending = getPendingReports()
        var remaining: [PendingSyncReport] = []
        
        for var pendingReport in pending {
            do {
                let apiClient = APIClient.shared
                switch pendingReport.action {
                case .create:
                    try await apiClient.requestVoid(.createReport, method: .post, body: pendingReport.report)
                case .update:
                    try await apiClient.requestVoid(.updateReport(id: pendingReport.report.id), method: .put, body: pendingReport.report)
                case .delete:
                    try await apiClient.requestVoid(.deleteReport(id: pendingReport.report.id), method: .delete)
                }
            } catch {
                pendingReport.retryCount += 1
                pendingReport.lastError = error.localizedDescription
                if pendingReport.retryCount < 3 {
                    remaining.append(pendingReport)
                }
            }
        }
        
        savePendingReports(remaining)
        
        if !remaining.isEmpty {
            throw SyncError.partialFailure(failed: remaining.count, total: pending.count)
        }
    }
    
    private func savePendingReports(_ reports: [PendingSyncReport]) {
        if let data = try? JSONEncoder().encode(reports) {
            userDefaults.set(data, forKey: pendingKey)
        }
    }
}

// MARK: - Sync Error
enum SyncError: LocalizedError {
    case partialFailure(failed: Int, total: Int)
    
    var errorDescription: String? {
        switch self {
        case .partialFailure(let failed, let total):
            return "Synced \(total - failed) of \(total) reports. \(failed) failed."
        }
    }
}

#Preview {
    NavigationStack {
        ReportsHubView()
    }
    .environmentObject(NetworkMonitor())
}
