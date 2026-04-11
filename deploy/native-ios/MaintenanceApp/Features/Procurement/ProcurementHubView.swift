import SwiftUI

// MARK: - Procurement Section
enum ProcurementSection: String, CaseIterable, Identifiable {
    case dashboard = "Dashboard"
    case cases = "All Cases"
    case createCase = "Create Case"
    case budget = "Budget"
    case orgStructure = "Org Structure"
    
    var id: String { rawValue }
    
    var iconName: String {
        switch self {
        case .dashboard: return "chart.pie.fill"
        case .cases: return "folder.fill"
        case .createCase: return "plus.rectangle.fill"
        case .budget: return "indianrupeesign.circle.fill"
        case .orgStructure: return "person.3.fill"
        }
    }
}

// MARK: - Procurement Hub View
struct ProcurementHubView: View {
    @State private var selectedSection: ProcurementSection = .dashboard
    @Environment(\.horizontalSizeClass) var horizontalSizeClass
    
    var body: some View {
        Group {
            if horizontalSizeClass == .regular {
                HStack(spacing: 0) {
                    procurementSidebar
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
                                ForEach(ProcurementSection.allCases) { section in
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
        .navigationTitle("Procurement")
        .navigationBarTitleDisplayMode(.inline)
    }
    
    // MARK: - Sidebar
    private var procurementSidebar: some View {
        List(ProcurementSection.allCases, selection: $selectedSection) { section in
            Label(section.rawValue, systemImage: section.iconName)
                .tag(section)
        }
        .listStyle(.sidebar)
    }
    
    // MARK: - Content View
    @ViewBuilder
    private var contentView: some View {
        switch selectedSection {
        case .dashboard:
            ProcurementDashboardView()
        case .cases:
            CaseListView()
        case .createCase:
            CreateCaseView()
        case .budget:
            BudgetView()
        case .orgStructure:
            OrgStructureView()
        }
    }
}

// MARK: - Procurement Dashboard View
struct ProcurementDashboardView: View {
    @StateObject private var viewModel = ProcurementDashboardViewModel()
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Summary Cards
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                    DashboardStatCard(
                        title: "Active Cases",
                        value: "\(viewModel.activeCount)",
                        iconName: "doc.text.fill",
                        color: .blue
                    )
                    
                    DashboardStatCard(
                        title: "Closed Cases",
                        value: "\(viewModel.closedCount)",
                        iconName: "checkmark.circle.fill",
                        color: .green
                    )
                }
                
                // Category Breakdown
                VStack(alignment: .leading, spacing: 12) {
                    Text("By Category")
                        .font(.headline)
                    
                    ForEach(ProcurementCategory.allCases) { category in
                        CategoryBreakdownRow(
                            category: category,
                            value: viewModel.valueBreakdown[category.rawValue] ?? 0,
                            budget: viewModel.budgetByCategory[category.rawValue] ?? 0
                        )
                    }
                }
                .padding()
                .background(Color(.secondarySystemBackground))
                .cornerRadius(12)
            }
            .padding()
        }
        .task {
            await viewModel.loadAnalytics()
        }
        .refreshable {
            await viewModel.loadAnalytics()
        }
    }
}

// MARK: - Dashboard Stat Card
struct DashboardStatCard: View {
    let title: String
    let value: String
    let iconName: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: iconName)
                    .foregroundColor(color)
                Spacer()
            }
            
            Text(value)
                .font(.title)
                .fontWeight(.bold)
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
}

// MARK: - Category Breakdown Row
struct CategoryBreakdownRow: View {
    let category: ProcurementCategory
    let value: Double
    let budget: Double
    
    var utilization: Double {
        guard budget > 0 else { return 0 }
        return min(value / budget, 1.0)
    }
    
    var utilizationColor: Color {
        if utilization < 0.5 { return .green }
        if utilization < 0.8 { return .orange }
        return .red
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: category.iconName)
                    .foregroundColor(category.color)
                
                Text(category.displayName)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Spacer()
                
                Text(formatCurrency(value))
                    .font(.subheadline)
                    .fontWeight(.semibold)
            }
            
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(Color.secondary.opacity(0.2))
                        .frame(height: 8)
                        .cornerRadius(4)
                    
                    Rectangle()
                        .fill(utilizationColor)
                        .frame(width: geometry.size.width * utilization, height: 8)
                        .cornerRadius(4)
                }
            }
            .frame(height: 8)
            
            HStack {
                Text("Budget: \(formatCurrency(budget))")
                Spacer()
                Text("\(Int(utilization * 100))% utilized")
            }
            .font(.caption2)
            .foregroundColor(.secondary)
        }
        .padding(.vertical, 8)
    }
    
    private func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "INR"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value)) ?? "₹0"
    }
}

// MARK: - Procurement Dashboard ViewModel
@MainActor
class ProcurementDashboardViewModel: ObservableObject {
    @Published var activeCount = 0
    @Published var closedCount = 0
    @Published var valueBreakdown: [String: Double] = [:]
    @Published var budgetByCategory: [String: Double] = [:]
    @Published var isLoading = false
    
    private let apiClient = APIClient.shared
    
    func loadAnalytics() async {
        isLoading = true
        
        do {
            let analytics: ProcurementAnalytics = try await apiClient.request(.caseAnalytics)
            activeCount = analytics.activeCount
            closedCount = analytics.closedCount
            valueBreakdown = analytics.valueBreakdown
            
            // Load budgets
            let budgets: [Budget] = try await apiClient.request(.budgets)
            for budget in budgets {
                budgetByCategory[budget.category] = budget.amount
            }
        } catch {
            // Handle error silently
        }
        
        isLoading = false
    }
}

// MARK: - Case List View
struct CaseListView: View {
    @StateObject private var viewModel = CaseListViewModel()
    @State private var searchText = ""
    @State private var selectedCategory: ProcurementCategory?
    @State private var selectedStatus: String?
    
    var filteredCases: [ProcurementCase] {
        var result = viewModel.cases
        
        if let category = selectedCategory {
            result = result.filter { $0.category == category.rawValue }
        }
        
        if let status = selectedStatus {
            result = result.filter { $0.currentStage == status }
        }
        
        if !searchText.isEmpty {
            result = result.filter {
                $0.title.localizedCaseInsensitiveContains(searchText) ||
                ($0.prNumber?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                ($0.poNumber?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }
        
        return result
    }
    
    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.cases.isEmpty {
                ProgressView("Loading cases...")
            } else if let error = viewModel.error, viewModel.cases.isEmpty {
                ErrorStateView(message: error) {
                    Task { await viewModel.loadCases() }
                }
            } else if viewModel.cases.isEmpty {
                EmptyStateView(
                    title: "No Cases",
                    message: "No procurement cases have been created yet.",
                    iconName: "folder"
                )
            } else {
                List(filteredCases) { procCase in
                    NavigationLink {
                        CaseDetailView(caseId: procCase.id)
                    } label: {
                        CaseRow(procCase: procCase)
                    }
                }
                .listStyle(.plain)
                .searchable(text: $searchText, prompt: "Search cases")
                .refreshable {
                    await viewModel.loadCases()
                }
            }
        }
        .task {
            await viewModel.loadCases()
        }
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    Menu("Category") {
                        Button("All") { selectedCategory = nil }
                        ForEach(ProcurementCategory.allCases) { cat in
                            Button(cat.displayName) { selectedCategory = cat }
                        }
                    }
                    
                    Menu("Status") {
                        Button("All") { selectedStatus = nil }
                        Button("Open") { selectedStatus = "OPEN" }
                        Button("In Progress") { selectedStatus = "IN_PROGRESS" }
                        Button("Closed") { selectedStatus = "CLOSED" }
                    }
                } label: {
                    Image(systemName: "line.3.horizontal.decrease.circle")
                }
            }
        }
    }
}

// MARK: - Case Row
struct CaseRow: View {
    let procCase: ProcurementCase
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(procCase.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)
                
                Spacer()
                
                StatusBadge(status: procCase.currentStage)
            }
            
            HStack {
                if let category = procCase.category {
                    Label(category, systemImage: "tag.fill")
                }
                
                Spacer()
                
                if let prValue = procCase.prValue {
                    Text(formatCurrency(prValue))
                        .fontWeight(.medium)
                }
            }
            .font(.caption)
            .foregroundColor(.secondary)
            
            HStack {
                if let prNumber = procCase.prNumber {
                    Text("PR: \(prNumber)")
                }
                if let poNumber = procCase.poNumber {
                    Text("PO: \(poNumber)")
                }
                
                Spacer()
                
                Text(procCase.createdAt?.formatted(date: .abbreviated, time: .omitted) ?? "")
            }
            .font(.caption2)
            .foregroundColor(.secondary)
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

// MARK: - Case List ViewModel
@MainActor
class CaseListViewModel: ObservableObject {
    @Published var cases: [ProcurementCase] = []
    @Published var isLoading = false
    @Published var error: String?
    
    private let apiClient = APIClient.shared
    
    func loadCases() async {
        isLoading = true
        error = nil
        
        do {
            let response: [ProcurementCase] = try await apiClient.request(.cases)
            cases = response
        } catch let apiError as APIError {
            error = apiError.errorDescription
        } catch {
            self.error = "Failed to load cases"
        }
        
        isLoading = false
    }
}

// MARK: - Case Detail View
struct CaseDetailView: View {
    let caseId: String
    @StateObject private var viewModel = CaseDetailViewModel()
    
    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView("Loading case details...")
            } else if let procCase = viewModel.procCase {
                List {
                    Section("Basic Information") {
                        LabeledContent("Title", value: procCase.title)
                        LabeledContent("Type", value: procCase.type)
                        if let category = procCase.category {
                            LabeledContent("Category", value: category)
                        }
                        LabeledContent("Status", value: procCase.currentStage)
                    }
                    
                    Section("Values") {
                        if let prValue = procCase.prValue {
                            LabeledContent("PR Value", value: formatCurrency(prValue))
                        }
                        if let poValue = procCase.poValue {
                            LabeledContent("PO Value", value: formatCurrency(poValue))
                        }
                        LabeledContent("Currency", value: procCase.currency)
                    }
                    
                    Section("References") {
                        if let prNumber = procCase.prNumber {
                            LabeledContent("PR Number", value: prNumber)
                        }
                        if let poNumber = procCase.poNumber {
                            LabeledContent("PO Number", value: poNumber)
                        }
                        if let vendor = procCase.vendor {
                            LabeledContent("Vendor", value: vendor)
                        }
                    }
                    
                    Section("Timeline") {
                        LabeledContent("Created", value: procCase.createdAt?.formatted(date: .long, time: .shortened) ?? "-")
                        LabeledContent("Updated", value: procCase.updatedAt?.formatted(date: .long, time: .shortened) ?? "-")
                    }
                }
            } else if let error = viewModel.error {
                ErrorStateView(message: error) {
                    Task { await viewModel.loadCase(id: caseId) }
                }
            }
        }
        .navigationTitle("Case Details")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadCase(id: caseId)
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

// MARK: - Case Detail ViewModel
@MainActor
class CaseDetailViewModel: ObservableObject {
    @Published var procCase: ProcurementCase?
    @Published var isLoading = false
    @Published var error: String?
    
    private let apiClient = APIClient.shared
    
    func loadCase(id: String) async {
        isLoading = true
        error = nil
        
        do {
            let response: ProcurementCase = try await apiClient.request(.caseDetail(id: id))
            procCase = response
        } catch let apiError as APIError {
            error = apiError.errorDescription
        } catch {
            self.error = "Failed to load case details"
        }
        
        isLoading = false
    }
}

// MARK: - Create Case View
struct CreateCaseView: View {
    @StateObject private var viewModel = CreateCaseViewModel()
    @Environment(\.dismiss) private var dismiss
    @State private var showingSuccess = false
    
    var body: some View {
        Form {
            Section("Basic Information") {
                TextField("Title", text: $viewModel.title)
                
                Picker("Type", selection: $viewModel.type) {
                    Text("Goods").tag("GOODS")
                    Text("Services").tag("SERVICES")
                    Text("Works").tag("WORKS")
                }
                
                Picker("Category", selection: $viewModel.category) {
                    ForEach(ProcurementCategory.allCases) { category in
                        Text(category.displayName).tag(category.rawValue)
                    }
                }
            }
            
            Section("Values") {
                TextField("PR Value", value: $viewModel.prValue, format: .number)
                    .keyboardType(.decimalPad)
                
                TextField("PO Value (Optional)", value: $viewModel.poValue, format: .number)
                    .keyboardType(.decimalPad)
                
                Picker("Currency", selection: $viewModel.currency) {
                    Text("INR").tag("INR")
                    Text("USD").tag("USD")
                }
            }
            
            Section("References") {
                TextField("PR Number (Optional)", text: $viewModel.prNumber)
                TextField("PO Number (Optional)", text: $viewModel.poNumber)
                TextField("Vendor (Optional)", text: $viewModel.vendor)
            }
            
            Section {
                Button {
                    Task {
                        await viewModel.createCase()
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
                            Text("Create Case")
                                .fontWeight(.semibold)
                        }
                        Spacer()
                    }
                }
                .disabled(!viewModel.isValid || viewModel.isLoading)
            }
            
            if let error = viewModel.error {
                Section {
                    Text(error)
                        .foregroundColor(.red)
                }
            }
        }
        .navigationTitle("Create Case")
        .alert("Success", isPresented: $showingSuccess) {
            Button("OK") {
                viewModel.reset()
            }
        } message: {
            Text("Case created successfully!")
        }
    }
}

// MARK: - Create Case ViewModel
@MainActor
class CreateCaseViewModel: ObservableObject {
    @Published var title = ""
    @Published var type = "GOODS"
    @Published var category = "STORES"
    @Published var prValue: Double?
    @Published var poValue: Double?
    @Published var currency = "INR"
    @Published var prNumber = ""
    @Published var poNumber = ""
    @Published var vendor = ""
    @Published var isLoading = false
    @Published var error: String?
    
    private let apiClient = APIClient.shared
    
    var isValid: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty && prValue != nil
    }
    
    func createCase() async {
        isLoading = true
        error = nil
        
        let request = CreateCaseRequest(
            title: title,
            type: type,
            category: category,
            prValue: prValue,
            poValue: poValue,
            currency: currency,
            prNumber: prNumber.isEmpty ? nil : prNumber,
            poNumber: poNumber.isEmpty ? nil : poNumber,
            vendor: vendor.isEmpty ? nil : vendor
        )
        
        do {
            try await apiClient.requestVoid(.createCase, method: .post, body: request)
        } catch let apiError as APIError {
            error = apiError.errorDescription
        } catch {
            self.error = "Failed to create case"
        }
        
        isLoading = false
    }
    
    func reset() {
        title = ""
        type = "GOODS"
        category = "STORES"
        prValue = nil
        poValue = nil
        currency = "INR"
        prNumber = ""
        poNumber = ""
        vendor = ""
        error = nil
    }
}

// MARK: - Budget View
struct BudgetView: View {
    @StateObject private var viewModel = BudgetViewModel()
    
    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView("Loading budgets...")
            } else if viewModel.budgets.isEmpty {
                EmptyStateView(
                    title: "No Budgets",
                    message: "No budgets have been configured yet.",
                    iconName: "indianrupeesign.circle"
                )
            } else {
                List(viewModel.budgets) { budget in
                    BudgetRow(budget: budget)
                }
                .listStyle(.insetGrouped)
                .refreshable {
                    await viewModel.loadBudgets()
                }
            }
        }
        .task {
            await viewModel.loadBudgets()
        }
    }
}

// MARK: - Budget Row
struct BudgetRow: View {
    let budget: Budget
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                if let category = ProcurementCategory(rawValue: budget.category) {
                    Image(systemName: category.iconName)
                        .foregroundColor(category.color)
                }
                
                Text(budget.category)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Spacer()
                
                Text(formatCurrency(budget.amount))
                    .font(.headline)
            }
            
            HStack {
                Text("FY: \(budget.fy)")
                
                Spacer()
                
                if budget.isIndicative {
                    Text("Indicative")
                        .font(.caption2)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.orange.opacity(0.2))
                        .cornerRadius(4)
                }
            }
            .font(.caption)
            .foregroundColor(.secondary)
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

// MARK: - Budget ViewModel
@MainActor
class BudgetViewModel: ObservableObject {
    @Published var budgets: [Budget] = []
    @Published var isLoading = false
    
    private let apiClient = APIClient.shared
    
    func loadBudgets() async {
        isLoading = true
        
        do {
            let response: [Budget] = try await apiClient.request(.budgets)
            budgets = response
        } catch {
            // Handle error silently
        }
        
        isLoading = false
    }
}

// MARK: - Org Structure View
struct OrgStructureView: View {
    @StateObject private var viewModel = OrgStructureViewModel()
    
    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView("Loading organization...")
            } else if viewModel.companies.isEmpty {
                EmptyStateView(
                    title: "No Organization Structure",
                    message: "Organization hierarchy not configured.",
                    iconName: "person.3"
                )
            } else {
                List {
                    ForEach(viewModel.companies) { company in
                        DisclosureGroup {
                            ForEach(company.departments ?? []) { department in
                                HStack {
                                    Image(systemName: "building.2.fill")
                                        .foregroundColor(.green)
                                    VStack(alignment: .leading) {
                                        Text(department.name)
                                            .font(.subheadline)
                                    }
                                }
                                .padding(.leading)
                            }
                        } label: {
                            HStack {
                                Image(systemName: "building.fill")
                                    .foregroundColor(.blue)
                                Text(company.name)
                                    .fontWeight(.medium)
                            }
                        }
                    }
                }
                .listStyle(.insetGrouped)
                .refreshable {
                    await viewModel.loadOrganization()
                }
            }
        }
        .task {
            await viewModel.loadOrganization()
        }
    }
}

// MARK: - Org Structure ViewModel
@MainActor
class OrgStructureViewModel: ObservableObject {
    @Published var companies: [Company] = []
    @Published var isLoading = false
    
    private let apiClient = APIClient.shared
    private let cacheManager = CacheManager.shared
    
    func loadOrganization() async {
        isLoading = true
        
        // Try cache first
        if let cached: [Company] = cacheManager.retrieve(for: CacheManager.CacheKey.orgHierarchy.key) {
            companies = cached
            isLoading = false
            await refreshFromServer()
            return
        }
        
        await refreshFromServer()
    }
    
    private func refreshFromServer() async {
        do {
            let response: OrgHierarchyResponse = try await apiClient.request(.orgHierarchy)
            companies = response.companies
            cacheManager.cache(response.companies, for: CacheManager.CacheKey.orgHierarchy.key)
        } catch {
            // Handle error silently
        }
        
        isLoading = false
    }
}

#Preview {
    NavigationStack {
        ProcurementHubView()
    }
}
