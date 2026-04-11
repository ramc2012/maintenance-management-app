import SwiftUI

// MARK: - MRP Hub View
struct MRPHubView: View {
    @State private var selectedTab = 0
    @StateObject private var viewModel = MRPViewModel()
    
    var body: some View {
        VStack(spacing: 0) {
            Picker("View", selection: $selectedTab) {
                Text("Requirements").tag(0)
                Text("New").tag(1)
                Text("Drafts").tag(2)
            }
            .pickerStyle(.segmented)
            .padding()
            
            switch selectedTab {
            case 0:
                RequirementListView(viewModel: viewModel)
            case 1:
                RequirementFormView()
            case 2:
                DraftManagerView(viewModel: viewModel)
            default:
                EmptyView()
            }
        }
        .navigationTitle("Material Planning")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadRequirements()
        }
    }
}

// MARK: - Requirement List View
struct RequirementListView: View {
    @ObservedObject var viewModel: MRPViewModel
    @State private var searchText = ""
    @State private var selectedVendor: String?
    
    var filteredRequirements: [MRPMaterialRequirement] {
        var result = viewModel.requirements
        
        if let vendor = selectedVendor {
            result = result.filter { $0.vendor == vendor }
        }
        
        if !searchText.isEmpty {
            result = result.filter {
                $0.itemDescription.localizedCaseInsensitiveContains(searchText) ||
                $0.materialCode.localizedCaseInsensitiveContains(searchText)
            }
        }
        
        return result
    }
    
    var vendors: [String] {
        Array(Set(viewModel.requirements.compactMap { $0.vendor })).sorted()
    }
    
    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.requirements.isEmpty {
                ProgressView("Loading requirements...")
            } else if viewModel.requirements.isEmpty {
                EmptyStateView(
                    title: "No Requirements",
                    message: "No material requirements have been created yet.",
                    iconName: "shippingbox"
                )
            } else {
                List {
                    // Vendor filter
                    if !vendors.isEmpty {
                        Section {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack {
                                    VendorFilterChip(
                                        vendor: "All",
                                        isSelected: selectedVendor == nil
                                    ) {
                                        selectedVendor = nil
                                    }
                                    
                                    ForEach(vendors, id: \.self) { vendor in
                                        VendorFilterChip(
                                            vendor: vendor,
                                            isSelected: selectedVendor == vendor
                                        ) {
                                            selectedVendor = vendor
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    // Requirements
                    ForEach(filteredRequirements) { requirement in
                        NavigationLink {
                            RequirementDetailView(requirement: requirement)
                        } label: {
                            RequirementRow(requirement: requirement)
                        }
                    }
                }
                .listStyle(.plain)
                .searchable(text: $searchText, prompt: "Search materials")
                .refreshable {
                    await viewModel.loadRequirements()
                }
            }
        }
    }
}

// MARK: - Vendor Filter Chip
struct VendorFilterChip: View {
    let vendor: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(vendor)
                .font(.caption)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? Color.accentColor : Color(.secondarySystemBackground))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(16)
        }
    }
}

// MARK: - Requirement Row
struct RequirementRow: View {
    let requirement: MRPMaterialRequirement
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(requirement.materialCode)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                
                Spacer()
                
                StatusBadge(status: requirement.status)
            }
            
            Text(requirement.itemDescription)
                .font(.caption)
                .foregroundColor(.secondary)
                .lineLimit(2)
            
            HStack {
                if let vendor = requirement.vendor {
                    Label(vendor, systemImage: "building.2")
                }
                
                Spacer()
                
                Text("Qty: \(requirement.quantity) \(requirement.unit)")
                    .fontWeight(.medium)
            }
            .font(.caption)
            .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Requirement Detail View
struct RequirementDetailView: View {
    let requirement: MRPMaterialRequirement
    
    var body: some View {
        List {
            Section("Material Details") {
                LabeledContent("Material Code", value: requirement.materialCode)
                LabeledContent("Description", value: requirement.itemDescription)
                LabeledContent("Category", value: requirement.category)
                LabeledContent("Status", value: requirement.status)
            }
            
            Section("Quantity") {
                LabeledContent("Required Qty", value: "\(requirement.quantity) \(requirement.unit)")
                if let leadTime = requirement.leadTimeDays {
                    LabeledContent("Lead Time", value: "\(leadTime) days")
                }
            }
            
            if let vendor = requirement.vendor {
                Section("Vendor") {
                    LabeledContent("Vendor", value: vendor)
                    if let unitPrice = requirement.unitPrice {
                        LabeledContent("Unit Price", value: formatCurrency(unitPrice))
                    }
                    if let totalValue = requirement.totalValue {
                        LabeledContent("Total Value", value: formatCurrency(totalValue))
                    }
                }
            }
            
            Section("Timeline") {
                if let requiredDate = requirement.requiredDate {
                    LabeledContent("Required By", value: requiredDate.formatted(date: .long, time: .omitted))
                }
                LabeledContent("Created", value: requirement.createdAt?.formatted(date: .abbreviated, time: .shortened) ?? "-")
            }
            
            if let remarks = requirement.remarks {
                Section("Remarks") {
                    Text(remarks)
                }
            }
        }
        .navigationTitle(requirement.materialCode)
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

// MARK: - Requirement Form View
struct RequirementFormView: View {
    @StateObject private var viewModel = RequirementFormViewModel()
    @State private var showingSuccess = false
    @State private var showingSaveDraft = false
    
    var body: some View {
        Form {
            Section("Material Details") {
                TextField("Material Code", text: $viewModel.materialCode)
                TextField("Description", text: $viewModel.itemDescription)
                
                Picker("Category", selection: $viewModel.category) {
                    Text("Raw Materials").tag("RAW_MATERIALS")
                    Text("Spare Parts").tag("SPARE_PARTS")
                    Text("Consumables").tag("CONSUMABLES")
                    Text("Tools").tag("TOOLS")
                }
            }
            
            Section("Quantity") {
                TextField("Quantity", value: $viewModel.quantity, format: .number)
                    .keyboardType(.decimalPad)
                
                Picker("Unit", selection: $viewModel.unit) {
                    Text("Pieces").tag("PCS")
                    Text("Kilograms").tag("KG")
                    Text("Liters").tag("L")
                    Text("Meters").tag("M")
                    Text("Sets").tag("SET")
                }
                
                DatePicker("Required By", selection: $viewModel.requiredDate, displayedComponents: .date)
            }
            
            Section("Vendor (Optional)") {
                TextField("Vendor Name", text: $viewModel.vendor)
                TextField("Unit Price", value: $viewModel.unitPrice, format: .currency(code: "INR"))
                    .keyboardType(.decimalPad)
                TextField("Lead Time (Days)", value: $viewModel.leadTimeDays, format: .number)
                    .keyboardType(.numberPad)
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
                            Text("Submit Requirement")
                                .fontWeight(.semibold)
                        }
                        Spacer()
                    }
                }
                .disabled(!viewModel.isValid || viewModel.isLoading)
                
                Button {
                    viewModel.saveDraft()
                    showingSaveDraft = true
                } label: {
                    HStack {
                        Spacer()
                        Text("Save as Draft")
                        Spacer()
                    }
                }
            }
        }
        .alert("Success", isPresented: $showingSuccess) {
            Button("OK") { viewModel.reset() }
        } message: {
            Text("Requirement submitted successfully!")
        }
        .alert("Draft Saved", isPresented: $showingSaveDraft) {
            Button("OK") { }
        } message: {
            Text("Requirement saved as draft.")
        }
    }
}

// MARK: - Draft Manager View
struct DraftManagerView: View {
    @ObservedObject var viewModel: MRPViewModel
    
    var body: some View {
        Group {
            if viewModel.drafts.isEmpty {
                EmptyStateView(
                    title: "No Drafts",
                    message: "Saved drafts will appear here.",
                    iconName: "doc.text"
                )
            } else {
                List {
                    ForEach(viewModel.drafts) { draft in
                        DraftRow(draft: draft)
                    }
                    .onDelete { indexSet in
                        viewModel.deleteDrafts(at: indexSet)
                    }
                }
                .listStyle(.plain)
            }
        }
        .onAppear {
            viewModel.loadDrafts()
        }
    }
}

// MARK: - Draft Row
struct DraftRow: View {
    let draft: MaterialRequirementDraft
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(draft.materialCode.isEmpty ? "Untitled" : draft.materialCode)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Spacer()
                
                Text(draft.savedAt.formatted(date: .abbreviated, time: .shortened))
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            
            if !draft.itemDescription.isEmpty {
                Text(draft.itemDescription)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - ViewModels
@MainActor
class MRPViewModel: ObservableObject {
    @Published var requirements: [MRPMaterialRequirement] = []
    @Published var drafts: [MaterialRequirementDraft] = []
    @Published var isLoading = false
    
    private let apiClient = APIClient.shared
    private let draftsKey = "mrp_drafts"
    
    func loadRequirements() async {
        isLoading = true
        
        do {
            let response: [MRPMaterialRequirement] = try await apiClient.request(.materialRequirements)
            requirements = response
        } catch {
            // Handle error silently
        }
        
        isLoading = false
    }
    
    func loadDrafts() {
        guard let data = UserDefaults.standard.data(forKey: draftsKey),
              let saved = try? JSONDecoder().decode([MaterialRequirementDraft].self, from: data) else {
            return
        }
        drafts = saved
    }
    
    func deleteDrafts(at offsets: IndexSet) {
        drafts.remove(atOffsets: offsets)
        saveDraftsToStorage()
    }
    
    private func saveDraftsToStorage() {
        if let data = try? JSONEncoder().encode(drafts) {
            UserDefaults.standard.set(data, forKey: draftsKey)
        }
    }
}

@MainActor
class RequirementFormViewModel: ObservableObject {
    @Published var materialCode = ""
    @Published var itemDescription = ""
    @Published var category = "SPARE_PARTS"
    @Published var quantity: Double?
    @Published var unit = "PCS"
    @Published var requiredDate = Date().addingTimeInterval(86400 * 7)
    @Published var vendor = ""
    @Published var unitPrice: Double?
    @Published var leadTimeDays: Int?
    @Published var remarks = ""
    @Published var isLoading = false
    @Published var error: String?
    
    private let draftsKey = "mrp_drafts"
    
    var isValid: Bool {
        !materialCode.trimmingCharacters(in: .whitespaces).isEmpty &&
        !itemDescription.trimmingCharacters(in: .whitespaces).isEmpty &&
        quantity != nil && quantity! > 0
    }
    
    func submit() async {
        isLoading = true
        error = nil
        // Implementation
        isLoading = false
    }
    
    func saveDraft() {
        let draft = MaterialRequirementDraft(
            id: UUID().uuidString,
            materialCode: materialCode,
            itemDescription: itemDescription,
            category: category,
            quantity: quantity,
            unit: unit,
            requiredDate: requiredDate,
            vendor: vendor,
            unitPrice: unitPrice,
            leadTimeDays: leadTimeDays,
            remarks: remarks,
            savedAt: Date()
        )
        
        var drafts: [MaterialRequirementDraft] = []
        if let data = UserDefaults.standard.data(forKey: draftsKey),
           let saved = try? JSONDecoder().decode([MaterialRequirementDraft].self, from: data) {
            drafts = saved
        }
        drafts.insert(draft, at: 0)
        
        if let data = try? JSONEncoder().encode(drafts) {
            UserDefaults.standard.set(data, forKey: draftsKey)
        }
    }
    
    func reset() {
        materialCode = ""
        itemDescription = ""
        category = "SPARE_PARTS"
        quantity = nil
        unit = "PCS"
        requiredDate = Date().addingTimeInterval(86400 * 7)
        vendor = ""
        unitPrice = nil
        leadTimeDays = nil
        remarks = ""
    }
}

// MARK: - Models
struct MRPMaterialRequirement: Codable, Identifiable {
    let id: String
    let materialCode: String
    let itemDescription: String
    let category: String
    let quantity: Double
    let unit: String
    var requiredDate: Date?
    var vendor: String?
    var unitPrice: Double?
    var totalValue: Double?
    var leadTimeDays: Int?
    let status: String
    var remarks: String?
    var createdAt: Date?
    var updatedAt: Date?
}

struct MaterialRequirementDraft: Codable, Identifiable {
    let id: String
    let materialCode: String
    let itemDescription: String
    let category: String
    var quantity: Double?
    let unit: String
    let requiredDate: Date
    let vendor: String
    var unitPrice: Double?
    var leadTimeDays: Int?
    let remarks: String
    let savedAt: Date
}

#Preview {
    NavigationStack {
        MRPHubView()
    }
}
