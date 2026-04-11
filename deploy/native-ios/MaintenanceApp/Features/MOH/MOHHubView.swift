import SwiftUI

// MARK: - MOH Hub View
struct MOHHubView: View {
    @State private var selectedTab = 0
    @StateObject private var viewModel = MOHViewModel()
    @State private var showingInitiateMOH = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Tab Picker
            Picker("View", selection: $selectedTab) {
                Text("Dashboard").tag(0)
                Text("All Records").tag(1)
                Text("Overdue").tag(2)
            }
            .pickerStyle(.segmented)
            .padding()
            
            // Content
            switch selectedTab {
            case 0:
                MOHDashboardView(viewModel: viewModel)
            case 1:
                MOHRecordsView(viewModel: viewModel, filter: nil)
            case 2:
                MOHRecordsView(viewModel: viewModel, filter: "OVERDUE")
            default:
                EmptyView()
            }
        }
        .navigationTitle("Major Overhaul")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    showingInitiateMOH = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showingInitiateMOH) {
            NavigationStack {
                InitiateMOHView()
            }
        }
        .task {
            await viewModel.loadRecords()
        }
    }
}

// MARK: - MOH Dashboard View
struct MOHDashboardView: View {
    @ObservedObject var viewModel: MOHViewModel
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Stats Cards
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    MOHStatCard(
                        title: "Planned",
                        value: "\(viewModel.plannedCount)",
                        iconName: "calendar",
                        color: .blue
                    )
                    
                    MOHStatCard(
                        title: "In Progress",
                        value: "\(viewModel.inProgressCount)",
                        iconName: "wrench.and.screwdriver",
                        color: .orange
                    )
                    
                    MOHStatCard(
                        title: "Completed",
                        value: "\(viewModel.completedCount)",
                        iconName: "checkmark.circle.fill",
                        color: .green
                    )
                    
                    MOHStatCard(
                        title: "Overdue",
                        value: "\(viewModel.overdueCount)",
                        iconName: "exclamationmark.triangle.fill",
                        color: .red
                    )
                }
                
                // Critical MOHs
                if !viewModel.criticalMOHs.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.red)
                            Text("Critical / Overdue")
                                .font(.headline)
                        }
                        
                        ForEach(viewModel.criticalMOHs) { moh in
                            NavigationLink {
                                MOHDetailView(moh: moh)
                            } label: {
                                CriticalMOHRow(moh: moh)
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                    .padding()
                    .background(Color.red.opacity(0.1))
                    .cornerRadius(12)
                }
                
                // Upcoming MOHs
                VStack(alignment: .leading, spacing: 12) {
                    Text("Upcoming MOH")
                        .font(.headline)
                    
                    if viewModel.upcomingMOHs.isEmpty {
                        Text("No upcoming major overhauls scheduled")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .padding()
                    } else {
                        ForEach(viewModel.upcomingMOHs) { moh in
                            NavigationLink {
                                MOHDetailView(moh: moh)
                            } label: {
                                UpcomingMOHRow(moh: moh)
                            }
                            .buttonStyle(PlainButtonStyle())
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
            await viewModel.loadRecords()
        }
    }
}

// MARK: - MOH Stat Card
struct MOHStatCard: View {
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
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
}

// MARK: - Critical MOH Row
struct CriticalMOHRow: View {
    let moh: MOHRecord
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(moh.equipmentTag)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)
                
                Text(moh.equipmentName)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            if let daysUntilDue = moh.daysUntilDue {
                Text(daysUntilDue < 0 ? "\(abs(daysUntilDue))d overdue" : "Due in \(daysUntilDue)d")
                    .font(.caption2)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(daysUntilDue < 0 ? Color.red : Color.orange)
                    .foregroundColor(.white)
                    .cornerRadius(4)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Upcoming MOH Row
struct UpcomingMOHRow: View {
    let moh: MOHRecord
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(moh.equipmentTag)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                
                Text(moh.equipmentName)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                if let nextDue = moh.nextMOHDue {
                    Text(nextDue.formatted(date: .abbreviated, time: .omitted))
                        .font(.caption)
                        .foregroundColor(.primary)
                }
                
                StatusBadge(status: moh.status)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - MOH Records View
struct MOHRecordsView: View {
    @ObservedObject var viewModel: MOHViewModel
    let filter: String?
    @State private var searchText = ""
    
    var filteredRecords: [MOHRecord] {
        var result = viewModel.records
        
        if filter == "OVERDUE" {
            result = result.filter { $0.isOverdue }
        }
        
        if !searchText.isEmpty {
            result = result.filter {
                $0.equipmentTag.localizedCaseInsensitiveContains(searchText) ||
                $0.equipmentName.localizedCaseInsensitiveContains(searchText) ||
                $0.mohNumber.localizedCaseInsensitiveContains(searchText)
            }
        }
        
        return result
    }
    
    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.records.isEmpty {
                ProgressView("Loading records...")
            } else if filteredRecords.isEmpty {
                EmptyStateView(
                    title: filter == "OVERDUE" ? "No Overdue MOH" : "No MOH Records",
                    message: filter == "OVERDUE" ? "No overdue major overhauls." : "No major overhaul records found.",
                    iconName: "gearshape.2"
                )
            } else {
                List(filteredRecords) { moh in
                    NavigationLink {
                        MOHDetailView(moh: moh)
                    } label: {
                        MOHRecordRow(moh: moh)
                    }
                }
                .listStyle(.plain)
                .searchable(text: $searchText, prompt: "Search MOH records")
                .refreshable {
                    await viewModel.loadRecords()
                }
            }
        }
    }
}

// MARK: - MOH Record Row
struct MOHRecordRow: View {
    let moh: MOHRecord
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(moh.mohNumber)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                
                Spacer()
                
                StatusBadge(status: moh.status)
            }
            
            Text("\(moh.equipmentTag) - \(moh.equipmentName)")
                .font(.caption)
                .lineLimit(1)
            
            HStack {
                if let runHours = moh.currentRunHours {
                    Label("\(Int(runHours)) hrs", systemImage: "clock")
                }
                
                Spacer()
                
                if let nextDue = moh.nextMOHDue {
                    Text("Due: \(nextDue.formatted(date: .abbreviated, time: .omitted))")
                        .foregroundColor(moh.isOverdue ? .red : .secondary)
                }
            }
            .font(.caption2)
            .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - MOH Detail View
struct MOHDetailView: View {
    let moh: MOHRecord
    
    var body: some View {
        List {
            Section("MOH Information") {
                LabeledContent("MOH Number", value: moh.mohNumber)
                LabeledContent("Equipment Tag", value: moh.equipmentTag)
                LabeledContent("Equipment Name", value: moh.equipmentName)
                LabeledContent("Status", value: moh.status)
                LabeledContent("Priority", value: moh.priority)
            }
            
            Section("Run Hours") {
                if let currentHours = moh.currentRunHours {
                    LabeledContent("Current Run Hours", value: "\(Int(currentHours))")
                }
                if let dCheckInterval = moh.dCheckInterval {
                    LabeledContent("D-Check Interval", value: "\(Int(dCheckInterval)) hrs")
                }
            }
            
            Section("Schedule") {
                if let lastMOH = moh.lastMOHDate {
                    LabeledContent("Last MOH", value: lastMOH.formatted(date: .long, time: .omitted))
                }
                if let nextDue = moh.nextMOHDue {
                    LabeledContent("Next Due", value: nextDue.formatted(date: .long, time: .omitted))
                }
                if let plannedStart = moh.plannedStartDate {
                    LabeledContent("Planned Start", value: plannedStart.formatted(date: .long, time: .omitted))
                }
            }
            
            Section("Cost") {
                if let estimated = moh.estimatedCost {
                    LabeledContent("Estimated Cost", value: formatCurrency(estimated))
                }
                if let actual = moh.actualCost {
                    LabeledContent("Actual Cost", value: formatCurrency(actual))
                }
            }
            
            if let scopeOfWork = moh.scopeOfWork {
                Section("Scope of Work") {
                    Text(scopeOfWork)
                }
            }
            
            if let findings = moh.findings {
                Section("Findings") {
                    Text(findings)
                }
            }
            
            if let actions = moh.actionsTaken {
                Section("Actions Taken") {
                    Text(actions)
                }
            }
        }
        .navigationTitle(moh.mohNumber)
        .navigationBarTitleDisplayMode(.inline)
    }
    
    private func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "INR"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value)) ?? "₹0"
    }
}

// MARK: - Initiate MOH View
struct InitiateMOHView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = InitiateMOHViewModel()
    @State private var showingSuccess = false
    
    var body: some View {
        Form {
            Section("Equipment") {
                TextField("Equipment Tag", text: $viewModel.equipmentTag)
                TextField("Equipment Name", text: $viewModel.equipmentName)
            }
            
            Section("Run Hours") {
                TextField("Current Run Hours", value: $viewModel.currentRunHours, format: .number)
                    .keyboardType(.decimalPad)
                TextField("D-Check Interval", value: $viewModel.dCheckInterval, format: .number)
                    .keyboardType(.decimalPad)
            }
            
            Section("Schedule") {
                DatePicker("Last MOH Date", selection: $viewModel.lastMOHDate, displayedComponents: .date)
                DatePicker("Planned Start Date", selection: $viewModel.plannedStartDate, displayedComponents: .date)
            }
            
            Section("Priority") {
                Picker("Priority", selection: $viewModel.priority) {
                    Text("Low").tag("LOW")
                    Text("Normal").tag("NORMAL")
                    Text("High").tag("HIGH")
                    Text("Critical").tag("CRITICAL")
                }
            }
            
            Section("Cost Estimate") {
                TextField("Estimated Cost", value: $viewModel.estimatedCost, format: .currency(code: "INR"))
                    .keyboardType(.decimalPad)
            }
            
            Section("Scope of Work") {
                TextEditor(text: $viewModel.scopeOfWork)
                    .frame(minHeight: 100)
            }
        }
        .navigationTitle("Initiate MOH")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Create") {
                    Task {
                        await viewModel.create()
                        if viewModel.error == nil {
                            showingSuccess = true
                        }
                    }
                }
                .disabled(!viewModel.isValid || viewModel.isLoading)
            }
        }
        .alert("Success", isPresented: $showingSuccess) {
            Button("OK") { dismiss() }
        } message: {
            Text("MOH record created successfully!")
        }
    }
}

// MARK: - MOH ViewModel
@MainActor
class MOHViewModel: ObservableObject {
    @Published var records: [MOHRecord] = []
    @Published var isLoading = false
    
    var plannedCount: Int { records.filter { $0.status == "PLANNED" }.count }
    var inProgressCount: Int { records.filter { $0.status == "IN_PROGRESS" }.count }
    var completedCount: Int { records.filter { $0.status == "COMPLETED" }.count }
    var overdueCount: Int { records.filter { $0.isOverdue }.count }
    
    var criticalMOHs: [MOHRecord] {
        records.filter { $0.isOverdue || $0.priority == "CRITICAL" }
            .prefix(5)
            .map { $0 }
    }
    
    var upcomingMOHs: [MOHRecord] {
        records.filter { $0.status == "PLANNED" && !$0.isOverdue }
            .sorted { ($0.nextMOHDue ?? Date.distantFuture) < ($1.nextMOHDue ?? Date.distantFuture) }
            .prefix(5)
            .map { $0 }
    }
    
    private let apiClient = APIClient.shared
    
    func loadRecords() async {
        isLoading = true
        
        do {
            let response: [MOHRecord] = try await apiClient.request(.mohRecords)
            records = response
        } catch {
            // Handle error silently
        }
        
        isLoading = false
    }
}

// MARK: - Initiate MOH ViewModel
@MainActor
class InitiateMOHViewModel: ObservableObject {
    @Published var equipmentTag = ""
    @Published var equipmentName = ""
    @Published var currentRunHours: Double?
    @Published var dCheckInterval: Double?
    @Published var lastMOHDate = Date()
    @Published var plannedStartDate = Date()
    @Published var priority = "NORMAL"
    @Published var estimatedCost: Double?
    @Published var scopeOfWork = ""
    @Published var isLoading = false
    @Published var error: String?
    
    var isValid: Bool {
        !equipmentTag.trimmingCharacters(in: .whitespaces).isEmpty &&
        !equipmentName.trimmingCharacters(in: .whitespaces).isEmpty
    }
    
    func create() async {
        isLoading = true
        error = nil
        
        // Implementation for creating MOH
        
        isLoading = false
    }
}

#Preview {
    NavigationStack {
        MOHHubView()
    }
}
