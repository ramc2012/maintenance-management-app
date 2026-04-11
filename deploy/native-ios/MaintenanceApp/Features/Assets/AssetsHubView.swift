import SwiftUI

// MARK: - Asset Section
enum AssetSection: String, CaseIterable, Identifiable {
    case hierarchy = "Hierarchy"
    case register = "Asset Register"
    case workOrders = "Work Orders"
    case equipment = "Equipment"
    case custodyMeters = "Custody Meters"
    case internalMeters = "Internal Meters"
    case masterSetup = "Master Setup"
    
    var id: String { rawValue }
    
    var iconName: String {
        switch self {
        case .hierarchy: return "arrow.triangle.branch"
        case .register: return "list.bullet.rectangle.fill"
        case .workOrders: return "doc.text.fill"
        case .equipment: return "gearshape.fill"
        case .custodyMeters: return "gauge.medium"
        case .internalMeters: return "speedometer"
        case .masterSetup: return "slider.horizontal.3"
        }
    }
}

// MARK: - Assets Hub View
struct AssetsHubView: View {
    @State private var selectedSection: AssetSection = .hierarchy
    @Environment(\.horizontalSizeClass) var horizontalSizeClass
    
    var body: some View {
        Group {
            if horizontalSizeClass == .regular {
                // iPad: Split View
                HStack(spacing: 0) {
                    assetsSidebar
                        .frame(width: 250)
                    
                    Divider()
                    
                    contentView
                        .frame(maxWidth: .infinity)
                }
            } else {
                // iPhone: Single View with Menu
                contentView
                    .toolbar {
                        ToolbarItem(placement: .navigationBarLeading) {
                            Menu {
                                ForEach(AssetSection.allCases) { section in
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
        .navigationTitle("Assets")
        .navigationBarTitleDisplayMode(.inline)
    }
    
    // MARK: - Sidebar
    private var assetsSidebar: some View {
        List(AssetSection.allCases, selection: $selectedSection) { section in
            Label(section.rawValue, systemImage: section.iconName)
                .tag(section)
        }
        .listStyle(.sidebar)
    }
    
    // MARK: - Content View
    @ViewBuilder
    private var contentView: some View {
        switch selectedSection {
        case .hierarchy:
            HierarchyTreeView()
        case .register:
            AssetRegisterView()
        case .workOrders:
            WorkOrderListView()
        case .equipment:
            EquipmentListView()
        case .custodyMeters:
            CustodyMeterView()
        case .internalMeters:
            InternalMeterView()
        case .masterSetup:
            MasterSetupView()
        }
    }
}

// MARK: - Hierarchy Tree View
struct HierarchyTreeView: View {
    @StateObject private var viewModel = HierarchyViewModel()
    
    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView("Loading hierarchy...")
            } else if let error = viewModel.error {
                ErrorStateView(message: error) {
                    Task { await viewModel.loadHierarchy() }
                }
            } else if viewModel.sites.isEmpty {
                EmptyStateView(
                    title: "No Sites Found",
                    message: "No asset hierarchy has been configured yet.",
                    iconName: "arrow.triangle.branch"
                )
            } else {
                List {
                    ForEach(viewModel.sites) { site in
                        DisclosureGroup {
                            ForEach(site.areas ?? []) { area in
                                DisclosureGroup {
                                    ForEach(area.systems ?? []) { system in
                                        DisclosureGroup {
                                            ForEach(system.functionalLocations ?? []) { fl in
                                                NavigationLink {
                                                    FunctionalLocationDetailView(fl: fl)
                                                } label: {
                                                    HStack {
                                                        Image(systemName: "mappin.circle.fill")
                                                            .foregroundColor(.orange)
                                                        VStack(alignment: .leading) {
                                                            Text(fl.flId)
                                                                .font(.subheadline)
                                                                .fontWeight(.medium)
                                                            Text(fl.name)
                                                                .font(.caption)
                                                                .foregroundColor(.secondary)
                                                        }
                                                    }
                                                }
                                            }
                                        } label: {
                                            HStack {
                                                Image(systemName: "gearshape.2.fill")
                                                    .foregroundColor(.green)
                                                VStack(alignment: .leading) {
                                                    Text(system.systemTag)
                                                        .font(.subheadline)
                                                        .fontWeight(.medium)
                                                    Text(system.name)
                                                        .font(.caption)
                                                        .foregroundColor(.secondary)
                                                }
                                            }
                                        }
                                    }
                                } label: {
                                    HStack {
                                        Image(systemName: "square.grid.2x2.fill")
                                            .foregroundColor(.purple)
                                        VStack(alignment: .leading) {
                                            Text(area.areaId)
                                                .font(.subheadline)
                                                .fontWeight(.medium)
                                            Text(area.name)
                                                .font(.caption)
                                                .foregroundColor(.secondary)
                                        }
                                    }
                                }
                            }
                        } label: {
                            HStack {
                                Image(systemName: "building.2.fill")
                                    .foregroundColor(.blue)
                                VStack(alignment: .leading) {
                                    Text(site.siteId)
                                        .fontWeight(.medium)
                                    Text(site.name)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                    }
                }
                .listStyle(.insetGrouped)
                .refreshable {
                    await viewModel.loadHierarchy()
                }
            }
        }
        .task {
            await viewModel.loadHierarchy()
        }
    }
}

// MARK: - Hierarchy ViewModel
@MainActor
class HierarchyViewModel: ObservableObject {
    @Published var sites: [Site] = []
    @Published var isLoading = false
    @Published var error: String?
    
    private let apiClient = APIClient.shared
    private let cacheManager = CacheManager.shared
    
    func loadHierarchy() async {
        isLoading = true
        error = nil
        
        // Try cache first
        if let cached: [Site] = cacheManager.retrieve(for: CacheManager.CacheKey.sites.key) {
            sites = cached
            isLoading = false
            
            // Refresh in background
            await refreshFromServer()
            return
        }
        
        await refreshFromServer()
    }
    
    private func refreshFromServer() async {
        do {
            let response: [Site] = try await apiClient.request(.sites)
            sites = response
            cacheManager.cache(response, for: CacheManager.CacheKey.sites.key)
            isLoading = false
        } catch let apiError as APIError {
            if sites.isEmpty {
                error = apiError.errorDescription
            }
            isLoading = false
        } catch {
            if sites.isEmpty {
                self.error = "Failed to load hierarchy"
            }
            isLoading = false
        }
    }
}

// MARK: - Functional Location Detail View
struct FunctionalLocationDetailView: View {
    let fl: FunctionalLocation
    
    var body: some View {
        List {
            Section("Details") {
                LabeledContent("FL ID", value: fl.flId)
                LabeledContent("Name", value: fl.name)
                if let description = fl.description {
                    LabeledContent("Description", value: description)
                }
                LabeledContent("Type", value: fl.flType)
                if let positionType = fl.positionType {
                    LabeledContent("Position Type", value: positionType)
                }
            }
            
            Section("Assigned Assets") {
                if let currentAsset = fl.currentAsset {
                    NavigationLink {
                        AssetDetailView(asset: currentAsset)
                    } label: {
                        HStack {
                            Image(systemName: "cube.box.fill")
                                .foregroundColor(.blue)
                            VStack(alignment: .leading) {
                                Text(currentAsset.assetCode)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                Text(currentAsset.assetClass)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                } else {
                    Text("No asset currently installed")
                        .foregroundColor(.secondary)
                }
            }
        }
        .navigationTitle(fl.flId)
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Asset Detail View
struct AssetDetailView: View {
    let asset: Asset
    
    var body: some View {
        List {
            Section("Basic Info") {
                LabeledContent("Asset Code", value: asset.assetCode)
                if let serialNumber = asset.serialNumber {
                    LabeledContent("Serial Number", value: serialNumber)
                }
                LabeledContent("Class", value: asset.assetClass)
                LabeledContent("Status", value: asset.status)
            }
            
            Section("Manufacturer") {
                if let manufacturer = asset.manufacturer {
                    LabeledContent("Manufacturer", value: manufacturer)
                }
                if let model = asset.model {
                    LabeledContent("Model", value: model)
                }
                if let year = asset.modelYear {
                    LabeledContent("Year", value: String(year))
                }
            }
        }
        .navigationTitle(asset.assetCode)
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Asset Register View
struct AssetRegisterView: View {
    @StateObject private var viewModel = AssetRegisterViewModel()
    @State private var searchText = ""
    
    var filteredAssets: [Asset] {
        if searchText.isEmpty {
            return viewModel.assets
        }
        return viewModel.assets.filter {
            $0.assetCode.localizedCaseInsensitiveContains(searchText) ||
            $0.assetClass.localizedCaseInsensitiveContains(searchText) ||
            ($0.manufacturer?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }
    
    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.assets.isEmpty {
                ProgressView("Loading assets...")
            } else if let error = viewModel.error, viewModel.assets.isEmpty {
                ErrorStateView(message: error) {
                    Task { await viewModel.loadAssets() }
                }
            } else if viewModel.assets.isEmpty {
                EmptyStateView(
                    title: "No Assets",
                    message: "No assets have been registered yet.",
                    iconName: "cube.box"
                )
            } else {
                List(filteredAssets) { asset in
                    NavigationLink {
                        AssetDetailView(asset: asset)
                    } label: {
                        AssetRow(asset: asset)
                    }
                }
                .listStyle(.plain)
                .searchable(text: $searchText, prompt: "Search assets")
                .refreshable {
                    await viewModel.loadAssets()
                }
            }
        }
        .task {
            await viewModel.loadAssets()
        }
    }
}

// MARK: - Asset Row
struct AssetRow: View {
    let asset: Asset
    
    var body: some View {
        HStack {
            Image(systemName: "cube.box.fill")
                .foregroundColor(.blue)
                .frame(width: 40, height: 40)
                .background(Color.blue.opacity(0.1))
                .cornerRadius(8)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(asset.assetCode)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Text(asset.assetClass)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            StatusBadge(status: asset.status)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Asset Register ViewModel
@MainActor
class AssetRegisterViewModel: ObservableObject {
    @Published var assets: [Asset] = []
    @Published var isLoading = false
    @Published var error: String?
    
    private let apiClient = APIClient.shared
    
    func loadAssets() async {
        isLoading = true
        error = nil
        
        do {
            let response: [Asset] = try await apiClient.request(.assets)
            assets = response
        } catch let apiError as APIError {
            error = apiError.errorDescription
        } catch {
            self.error = "Failed to load assets"
        }
        
        isLoading = false
    }
}

// MARK: - Work Order List View
struct WorkOrderListView: View {
    @StateObject private var viewModel = WorkOrderListViewModel()
    @State private var searchText = ""
    @State private var selectedStatus: WorkOrderStatus?
    
    var filteredWorkOrders: [WorkOrder] {
        var result = viewModel.workOrders
        
        if let status = selectedStatus {
            result = result.filter { $0.status == status.rawValue }
        }
        
        if !searchText.isEmpty {
            result = result.filter {
                $0.woNumber.localizedCaseInsensitiveContains(searchText) ||
                $0.description.localizedCaseInsensitiveContains(searchText)
            }
        }
        
        return result
    }
    
    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.workOrders.isEmpty {
                ProgressView("Loading work orders...")
            } else if let error = viewModel.error, viewModel.workOrders.isEmpty {
                ErrorStateView(message: error) {
                    Task { await viewModel.loadWorkOrders() }
                }
            } else if viewModel.workOrders.isEmpty {
                EmptyStateView(
                    title: "No Work Orders",
                    message: "No work orders have been created yet.",
                    iconName: "doc.text"
                )
            } else {
                List(filteredWorkOrders) { workOrder in
                    NavigationLink {
                        WorkOrderDetailView(workOrder: workOrder)
                    } label: {
                        WorkOrderRow(workOrder: workOrder)
                    }
                }
                .listStyle(.plain)
                .searchable(text: $searchText, prompt: "Search work orders")
                .refreshable {
                    await viewModel.loadWorkOrders()
                }
            }
        }
        .task {
            await viewModel.loadWorkOrders()
        }
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    Button("All") { selectedStatus = nil }
                    ForEach(WorkOrderStatus.allCases) { status in
                        Button(status.displayName) { selectedStatus = status }
                    }
                } label: {
                    Image(systemName: "line.3.horizontal.decrease.circle")
                }
            }
        }
    }
}

// MARK: - Work Order Row
struct WorkOrderRow: View {
    let workOrder: WorkOrder
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(workOrder.woNumber)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                
                Spacer()
                
                StatusBadge(status: workOrder.status)
            }
            
            Text(workOrder.description)
                .font(.caption)
                .foregroundColor(.secondary)
                .lineLimit(2)
            
            HStack {
                Label(workOrder.woType, systemImage: "tag.fill")
                Spacer()
                Label(workOrder.priority, systemImage: "exclamationmark.circle.fill")
            }
            .font(.caption2)
            .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Work Order Detail View
struct WorkOrderDetailView: View {
    let workOrder: WorkOrder
    
    var body: some View {
        List {
            Section("Basic Info") {
                LabeledContent("WO Number", value: workOrder.woNumber)
                LabeledContent("Type", value: workOrder.woType)
                LabeledContent("Priority", value: workOrder.priority)
                LabeledContent("Status", value: workOrder.status)
            }
            
            Section("Description") {
                Text(workOrder.description)
            }
            
            Section("Dates") {
                if let scheduledDate = workOrder.scheduledDate {
                    LabeledContent("Scheduled", value: scheduledDate.formatted(date: .abbreviated, time: .shortened))
                }
                if let startDate = workOrder.startDate {
                    LabeledContent("Started", value: startDate.formatted(date: .abbreviated, time: .shortened))
                }
                if let completionDate = workOrder.completionDate {
                    LabeledContent("Completed", value: completionDate.formatted(date: .abbreviated, time: .shortened))
                }
            }
            
            if workOrder.failureMode != nil || workOrder.causeCode != nil {
                Section("Failure Analysis") {
                    if let failureMode = workOrder.failureMode {
                        LabeledContent("Failure Mode", value: failureMode)
                    }
                    if let causeCode = workOrder.causeCode {
                        LabeledContent("Cause Code", value: causeCode)
                    }
                    if let actionTaken = workOrder.actionTaken {
                        LabeledContent("Action Taken", value: actionTaken)
                    }
                }
            }
        }
        .navigationTitle(workOrder.woNumber)
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Work Order List ViewModel
@MainActor
class WorkOrderListViewModel: ObservableObject {
    @Published var workOrders: [WorkOrder] = []
    @Published var isLoading = false
    @Published var error: String?
    
    private let apiClient = APIClient.shared
    
    func loadWorkOrders() async {
        isLoading = true
        error = nil
        
        do {
            let response: [WorkOrder] = try await apiClient.request(.workOrders)
            workOrders = response
        } catch let apiError as APIError {
            error = apiError.errorDescription
        } catch {
            self.error = "Failed to load work orders"
        }
        
        isLoading = false
    }
}

// MARK: - Equipment List View
struct EquipmentListView: View {
    @StateObject private var viewModel = EquipmentListViewModel()
    @State private var searchText = ""
    
    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.equipment.isEmpty {
                ProgressView("Loading equipment...")
            } else if let error = viewModel.error, viewModel.equipment.isEmpty {
                ErrorStateView(message: error) {
                    Task { await viewModel.loadEquipment() }
                }
            } else if viewModel.equipment.isEmpty {
                EmptyStateView(
                    title: "No Equipment",
                    message: "No equipment has been registered yet.",
                    iconName: "gearshape"
                )
            } else {
                List(viewModel.filteredEquipment(searchText: searchText)) { equipment in
                    NavigationLink {
                        EquipmentDetailView(equipment: equipment)
                    } label: {
                        EquipmentRow(equipment: equipment)
                    }
                }
                .listStyle(.plain)
                .searchable(text: $searchText, prompt: "Search equipment")
                .refreshable {
                    await viewModel.loadEquipment()
                }
            }
        }
        .task {
            await viewModel.loadEquipment()
        }
    }
}

// MARK: - Equipment Row
struct EquipmentRow: View {
    let equipment: RunningEquipment
    
    var body: some View {
        HStack {
            Image(systemName: "gearshape.fill")
                .foregroundColor(.green)
                .frame(width: 40, height: 40)
                .background(Color.green.opacity(0.1))
                .cornerRadius(8)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(equipment.equipmentTag)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Text(equipment.description)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
            
            Spacer()
            
            Text(equipment.category)
                .font(.caption2)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.secondary.opacity(0.1))
                .cornerRadius(4)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Equipment Detail View
struct EquipmentDetailView: View {
    let equipment: RunningEquipment
    
    var body: some View {
        List {
            Section("Basic Info") {
                LabeledContent("Equipment Tag", value: equipment.equipmentTag)
                LabeledContent("Category", value: equipment.category)
                LabeledContent("Description", value: equipment.description)
            }
            
            Section("Technical Details") {
                if let make = equipment.make {
                    LabeledContent("Make", value: make)
                }
                if let model = equipment.model {
                    LabeledContent("Model", value: model)
                }
                if let powerRating = equipment.powerRating {
                    LabeledContent("Power Rating", value: powerRating)
                }
                if let serviceLine = equipment.serviceLine {
                    LabeledContent("Service Line", value: serviceLine)
                }
            }
        }
        .navigationTitle(equipment.equipmentTag)
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Equipment List ViewModel
@MainActor
class EquipmentListViewModel: ObservableObject {
    @Published var equipment: [RunningEquipment] = []
    @Published var isLoading = false
    @Published var error: String?
    
    private let apiClient = APIClient.shared
    
    func loadEquipment() async {
        isLoading = true
        error = nil
        
        do {
            let response: [RunningEquipment] = try await apiClient.request(.runningEquipment)
            equipment = response
        } catch let apiError as APIError {
            error = apiError.errorDescription
        } catch {
            self.error = "Failed to load equipment"
        }
        
        isLoading = false
    }
    
    func filteredEquipment(searchText: String) -> [RunningEquipment] {
        if searchText.isEmpty {
            return equipment
        }
        return equipment.filter {
            $0.equipmentTag.localizedCaseInsensitiveContains(searchText) ||
            $0.description.localizedCaseInsensitiveContains(searchText) ||
            $0.category.localizedCaseInsensitiveContains(searchText)
        }
    }
}

// MARK: - Custody Meter View
struct CustodyMeterView: View {
    @StateObject private var viewModel = CustodyMeterViewModel()
    
    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView("Loading meters...")
            } else if let error = viewModel.error {
                ErrorStateView(message: error) {
                    Task { await viewModel.loadMeters() }
                }
            } else if viewModel.meters.isEmpty {
                EmptyStateView(
                    title: "No Custody Meters",
                    message: "No custody transfer meters have been registered.",
                    iconName: "gauge.medium"
                )
            } else {
                List(viewModel.meters) { meter in
                    MeterRow(meter: meter)
                }
                .listStyle(.plain)
                .refreshable {
                    await viewModel.loadMeters()
                }
            }
        }
        .task {
            await viewModel.loadMeters()
        }
    }
}

// MARK: - Meter Row
struct MeterRow: View {
    let meter: CustodyTransferMeter
    
    var body: some View {
        HStack {
            Image(systemName: "gauge.medium")
                .foregroundColor(.purple)
                .frame(width: 40, height: 40)
                .background(Color.purple.opacity(0.1))
                .cornerRadius(8)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(meter.meterId)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Text(meter.customerName)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            if let meterType = meter.meterType {
                Text(meterType)
                    .font(.caption2)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.purple.opacity(0.1))
                    .cornerRadius(4)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Custody Meter ViewModel
@MainActor
class CustodyMeterViewModel: ObservableObject {
    @Published var meters: [CustodyTransferMeter] = []
    @Published var isLoading = false
    @Published var error: String?
    
    private let apiClient = APIClient.shared
    
    func loadMeters() async {
        isLoading = true
        error = nil
        
        do {
            let response: [CustodyTransferMeter] = try await apiClient.request(.custodyMeters)
            meters = response
        } catch let apiError as APIError {
            error = apiError.errorDescription
        } catch {
            self.error = "Failed to load meters"
        }
        
        isLoading = false
    }
}

// MARK: - Internal Meter View
struct InternalMeterView: View {
    var body: some View {
        EmptyStateView(
            title: "Internal Meters",
            message: "Internal flow meter management coming soon.",
            iconName: "speedometer"
        )
    }
}

// MARK: - Master Setup View
struct MasterSetupView: View {
    var body: some View {
        List {
            Section("Equipment Configuration") {
                NavigationLink {
                    EquipmentTypesView()
                } label: {
                    Label("Equipment Types", systemImage: "list.bullet")
                }
                
                NavigationLink {
                    InstrumentTypesView()
                } label: {
                    Label("Instrument Types", systemImage: "dial.medium")
                }
                
                NavigationLink {
                    MeterTypesView()
                } label: {
                    Label("Meter Types", systemImage: "gauge.medium")
                }
            }
            
            Section("Maintenance") {
                NavigationLink {
                    PMSchedulesView()
                } label: {
                    Label("PM Schedules", systemImage: "calendar")
                }
                
                NavigationLink {
                    MaintenanceStrategiesView()
                } label: {
                    Label("Maintenance Strategies", systemImage: "wrench.and.screwdriver")
                }
            }
            
            Section("Reference Data") {
                NavigationLink {
                    FailureCodesView()
                } label: {
                    Label("Failure Codes", systemImage: "exclamationmark.triangle")
                }
                
                NavigationLink {
                    CauseCodesView()
                } label: {
                    Label("Cause Codes", systemImage: "questionmark.circle")
                }
            }
        }
        .navigationTitle("Master Setup")
    }
}

// MARK: - Placeholder Views for Master Setup
struct EquipmentTypesView: View {
    var body: some View {
        Text("Equipment Types")
            .navigationTitle("Equipment Types")
    }
}

struct InstrumentTypesView: View {
    var body: some View {
        Text("Instrument Types")
            .navigationTitle("Instrument Types")
    }
}

struct MeterTypesView: View {
    var body: some View {
        Text("Meter Types")
            .navigationTitle("Meter Types")
    }
}

struct PMSchedulesView: View {
    var body: some View {
        Text("PM Schedules")
            .navigationTitle("PM Schedules")
    }
}

struct MaintenanceStrategiesView: View {
    var body: some View {
        Text("Maintenance Strategies")
            .navigationTitle("Maintenance Strategies")
    }
}

struct FailureCodesView: View {
    var body: some View {
        Text("Failure Codes")
            .navigationTitle("Failure Codes")
    }
}

struct CauseCodesView: View {
    var body: some View {
        Text("Cause Codes")
            .navigationTitle("Cause Codes")
    }
}

#Preview {
    NavigationStack {
        AssetsHubView()
    }
}
