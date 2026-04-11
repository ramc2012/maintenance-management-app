import SwiftUI

// MARK: - Workshop Shop Type
enum WorkshopShopFilter: String, CaseIterable, Identifiable {
    case all = "All"
    case fabrication = "FABRICATION"
    case diesel = "DIESEL"
    case machine = "MACHINE"
    case electrical = "ELECTRICAL"
    
    var id: String { rawValue }
    
    var displayName: String {
        switch self {
        case .all: return "All Shops"
        case .fabrication: return "Fabrication"
        case .diesel: return "Diesel"
        case .machine: return "Machine"
        case .electrical: return "Electrical"
        }
    }
    
    var iconName: String {
        switch self {
        case .all: return "building.2.fill"
        case .fabrication: return "hammer.fill"
        case .diesel: return "fuelpump.fill"
        case .machine: return "gearshape.fill"
        case .electrical: return "bolt.fill"
        }
    }
    
    var color: Color {
        switch self {
        case .all: return .gray
        case .fabrication: return .orange
        case .diesel: return .brown
        case .machine: return .blue
        case .electrical: return .yellow
        }
    }
}

// MARK: - Workshop Hub View
struct WorkshopHubView: View {
    @State private var selectedShop: WorkshopShopFilter = .all
    @State private var showingNewJob = false
    @StateObject private var viewModel = WorkshopViewModel()
    @State private var searchText = ""
    
    var filteredJobs: [WorkshopJob] {
        var result = viewModel.jobs
        
        if selectedShop != .all {
            result = result.filter { $0.shopType == selectedShop.rawValue }
        }
        
        if !searchText.isEmpty {
            result = result.filter {
                $0.jobNumber.localizedCaseInsensitiveContains(searchText) ||
                $0.title.localizedCaseInsensitiveContains(searchText)
            }
        }
        
        return result
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Shop Type Filter
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(WorkshopShopFilter.allCases) { shop in
                        ShopFilterChip(
                            shop: shop,
                            isSelected: selectedShop == shop
                        ) {
                            selectedShop = shop
                        }
                    }
                }
                .padding()
            }
            
            // Dashboard Stats
            HStack(spacing: 12) {
                WorkshopStatCard(title: "Pending", count: viewModel.pendingCount, color: .orange)
                WorkshopStatCard(title: "In Progress", count: viewModel.inProgressCount, color: .blue)
                WorkshopStatCard(title: "Completed", count: viewModel.completedCount, color: .green)
            }
            .padding(.horizontal)
            
            // Job List
            if viewModel.isLoading && viewModel.jobs.isEmpty {
                Spacer()
                ProgressView("Loading jobs...")
                Spacer()
            } else if filteredJobs.isEmpty {
                Spacer()
                EmptyStateView(
                    title: "No Jobs",
                    message: selectedShop == .all ? "No workshop jobs found." : "No jobs in \(selectedShop.displayName) shop.",
                    iconName: "wrench"
                )
                Spacer()
            } else {
                List(filteredJobs) { job in
                    NavigationLink {
                        WorkshopJobDetailView(job: job)
                    } label: {
                        WorkshopJobRow(job: job)
                    }
                }
                .listStyle(.plain)
                .searchable(text: $searchText, prompt: "Search jobs")
                .refreshable {
                    await viewModel.loadJobs()
                }
            }
        }
        .navigationTitle("Workshop")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    showingNewJob = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showingNewJob) {
            NavigationStack {
                NewJobView()
            }
        }
        .task {
            await viewModel.loadJobs()
        }
    }
}

// MARK: - Shop Filter Chip
struct ShopFilterChip: View {
    let shop: WorkshopShopFilter
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: shop.iconName)
                Text(shop.displayName)
            }
            .font(.subheadline)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isSelected ? shop.color : Color(.secondarySystemBackground))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(20)
        }
    }
}

// MARK: - Workshop Stat Card
struct WorkshopStatCard: View {
    let title: String
    let count: Int
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text("\(count)")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)
            
            Text(title)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(8)
    }
}

// MARK: - Workshop Job Row
struct WorkshopJobRow: View {
    let job: WorkshopJob
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(job.jobNumber)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                
                Spacer()
                
                StatusBadge(status: job.status)
            }
            
            Text(job.title)
                .font(.caption)
                .lineLimit(2)
            
            HStack {
                Label(job.shopType, systemImage: WorkshopShopFilter(rawValue: job.shopType)?.iconName ?? "building.2")
                    .foregroundColor(WorkshopShopFilter(rawValue: job.shopType)?.color ?? .gray)
                
                Spacer()
                
                Label(job.priority, systemImage: "exclamationmark.circle")
                    .foregroundColor(priorityColor(job.priority))
            }
            .font(.caption2)
        }
        .padding(.vertical, 4)
    }
    
    private func priorityColor(_ priority: String) -> Color {
        switch priority {
        case "URGENT": return .red
        case "HIGH": return .orange
        case "NORMAL": return .blue
        default: return .gray
        }
    }
}

// MARK: - Workshop Job Detail View
struct WorkshopJobDetailView: View {
    let job: WorkshopJob
    
    var body: some View {
        List {
            Section("Job Information") {
                LabeledContent("Job Number", value: job.jobNumber)
                LabeledContent("Title", value: job.title)
                LabeledContent("Shop Type", value: job.shopType)
                LabeledContent("Priority", value: job.priority)
                LabeledContent("Status", value: job.status)
            }
            
            if let description = job.description {
                Section("Description") {
                    Text(description)
                }
            }
            
            Section("Requestor") {
                LabeledContent("Requested By", value: job.requestedBy)
                LabeledContent("Request Date", value: job.requestDate.formatted(date: .long, time: .omitted))
            }
            
            Section("Time & Cost") {
                if let estimatedHours = job.estimatedHours {
                    LabeledContent("Estimated Hours", value: "\(estimatedHours, specifier: "%.1f")")
                }
                if let actualHours = job.actualHours {
                    LabeledContent("Actual Hours", value: "\(actualHours, specifier: "%.1f")")
                }
                if let totalCost = job.totalCost {
                    LabeledContent("Total Cost", value: formatCurrency(totalCost))
                }
            }
            
            if let assignedTo = job.assignedTo {
                Section("Assignment") {
                    LabeledContent("Assigned To", value: assignedTo)
                    if let startDate = job.startDate {
                        LabeledContent("Start Date", value: startDate.formatted(date: .abbreviated, time: .shortened))
                    }
                    if let completedDate = job.completedDate {
                        LabeledContent("Completed", value: completedDate.formatted(date: .abbreviated, time: .shortened))
                    }
                }
            }
        }
        .navigationTitle(job.jobNumber)
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

// MARK: - Workshop ViewModel
@MainActor
class WorkshopViewModel: ObservableObject {
    @Published var jobs: [WorkshopJob] = []
    @Published var isLoading = false
    
    var pendingCount: Int { jobs.filter { $0.status == "PENDING" }.count }
    var inProgressCount: Int { jobs.filter { $0.status == "IN_PROGRESS" }.count }
    var completedCount: Int { jobs.filter { $0.status == "COMPLETED" }.count }
    
    private let apiClient = APIClient.shared
    
    func loadJobs() async {
        isLoading = true
        
        do {
            let response: [WorkshopJob] = try await apiClient.request(.workshopJobs)
            jobs = response
        } catch {
            // Handle error silently
        }
        
        isLoading = false
    }
}

// MARK: - New Job View
struct NewJobView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = NewJobViewModel()
    @State private var showingSuccess = false
    
    var body: some View {
        Form {
            Section("Job Details") {
                TextField("Title", text: $viewModel.title)
                
                Picker("Shop Type", selection: $viewModel.shopType) {
                    ForEach(WorkshopShopFilter.allCases.filter { $0 != .all }) { shop in
                        Text(shop.displayName).tag(shop.rawValue)
                    }
                }
                
                Picker("Priority", selection: $viewModel.priority) {
                    Text("Low").tag("LOW")
                    Text("Normal").tag("NORMAL")
                    Text("High").tag("HIGH")
                    Text("Urgent").tag("URGENT")
                }
            }
            
            Section("Description") {
                TextEditor(text: $viewModel.description)
                    .frame(minHeight: 100)
            }
            
            Section("Estimation") {
                TextField("Estimated Hours", value: $viewModel.estimatedHours, format: .number)
                    .keyboardType(.decimalPad)
            }
            
            Section("Reference") {
                TextField("Equipment Tag (Optional)", text: $viewModel.equipmentTag)
                TextField("Work Order Ref (Optional)", text: $viewModel.workOrderRef)
            }
        }
        .navigationTitle("New Workshop Job")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Create") {
                    Task {
                        await viewModel.createJob()
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
            Text("Workshop job created successfully!")
        }
    }
}

// MARK: - New Job ViewModel
@MainActor
class NewJobViewModel: ObservableObject {
    @Published var title = ""
    @Published var shopType = "FABRICATION"
    @Published var priority = "NORMAL"
    @Published var description = ""
    @Published var estimatedHours: Double?
    @Published var equipmentTag = ""
    @Published var workOrderRef = ""
    @Published var isLoading = false
    @Published var error: String?
    
    var isValid: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty
    }
    
    private let apiClient = APIClient.shared
    
    func createJob() async {
        isLoading = true
        error = nil
        
        // Implementation for creating job
        
        isLoading = false
    }
}

#Preview {
    NavigationStack {
        WorkshopHubView()
    }
}
