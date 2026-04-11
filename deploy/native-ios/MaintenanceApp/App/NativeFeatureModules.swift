import SwiftUI

// MARK: - Enterprise Hub
struct EnterpriseHubView: View {
    @StateObject private var viewModel = EnterpriseHubViewModel()

    var body: some View {
        List {
            Section("Operations Snapshot") {
                NativeMetricGrid(metrics: viewModel.metrics)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
            }

            Section("Module Status") {
                ForEach(viewModel.modules) { module in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(module.name)
                                .font(.headline)
                            Spacer()
                            StatusBadge(status: module.status)
                        }

                        Text(module.summary)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 4)
                }
            }

            Section("Operational Notes") {
                ForEach(viewModel.notes, id: \.self) { note in
                    Label(note, systemImage: "checkmark.seal")
                        .font(.subheadline)
                }
            }
        }
        .navigationTitle("Enterprise Hub")
        .task { viewModel.load() }
    }
}

@MainActor
final class EnterpriseHubViewModel: ObservableObject {
    @Published private(set) var metrics: [NativeMetric] = []
    @Published private(set) var modules: [NativeModuleStatus] = []
    @Published private(set) var notes: [String] = []

    func load() {
        metrics = [
            .init(title: "Work Orders", value: "18", detail: "5 urgent"),
            .init(title: "Calibration Due", value: "7", detail: "2 overdue"),
            .init(title: "Offline Queue", value: "4", detail: "Ready to sync"),
            .init(title: "Active Users", value: "26", detail: "3 supervisors")
        ]

        modules = [
            .init(name: "Manuals & Drawings", status: "live", summary: "Read-only repository links with mobile download cache."),
            .init(name: "Training", status: "live", summary: "Local schedule and completion tracking enabled."),
            .init(name: "Collaboration", status: "live", summary: "Discussion board and feedback flow available offline."),
            .init(name: "Reports", status: "live", summary: "Pending-sync reports and queue simulation enabled."),
            .init(name: "Assets", status: "live", summary: "Hierarchy, equipment, meters, and work order summaries available natively."),
            .init(name: "Procurement", status: "live", summary: "Case pipeline, budget, and org structure are available locally.")
        ]

        notes = [
            "Native modules are running local-first without mutating server state.",
            "The imported heavyweight SwiftUI files remain preserved on disk.",
            "Reconnecting shared API services can happen module by module after iOS stabilization."
        ]
    }
}

// MARK: - Assets
private enum AssetNativeSection: String, CaseIterable, Identifiable {
    case hierarchy = "Hierarchy"
    case register = "Register"
    case workOrders = "Work Orders"
    case meters = "Meters"

    var id: String { rawValue }
}

struct AssetsHubView: View {
    @StateObject private var viewModel = AssetsViewModel()
    @State private var selectedSection: AssetNativeSection = .hierarchy

    var body: some View {
        List {
            Section("Asset Snapshot") {
                NativeMetricGrid(metrics: viewModel.metrics)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
            }

            Section("Section") {
                Picker("Section", selection: $selectedSection) {
                    ForEach(AssetNativeSection.allCases) { section in
                        Text(section.rawValue).tag(section)
                    }
                }
                .pickerStyle(.segmented)
            }

            switch selectedSection {
            case .hierarchy:
                Section("Hierarchy Nodes") {
                    ForEach(viewModel.hierarchy) { node in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(node.name)
                                .font(.headline)
                            Text("\(node.site) • \(node.area) • \(node.system)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            case .register:
                Section("Equipment Register") {
                    ForEach(viewModel.equipment) { equipment in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(equipment.tag)
                                    .font(.headline)
                                Spacer()
                                StatusBadge(status: equipment.status)
                            }

                            Text(equipment.description)
                                .font(.subheadline)
                            Text("\(equipment.location) • \(equipment.owner)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            case .workOrders:
                Section("Linked Work Orders") {
                    ForEach(viewModel.workOrders) { workOrder in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(workOrder.number)
                                    .font(.headline)
                                Spacer()
                                StatusBadge(status: workOrder.status)
                            }

                            Text(workOrder.title)
                                .font(.subheadline)
                            Text("\(workOrder.assetTag) • \(workOrder.priority)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            case .meters:
                Section("Meter Readings") {
                    ForEach(viewModel.meters) { meter in
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(meter.name)
                                    .font(.headline)
                                Text(meter.location)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            VStack(alignment: .trailing, spacing: 4) {
                                Text(meter.reading)
                                    .font(.headline)
                                StatusBadge(status: meter.status)
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("Assets")
        .task { viewModel.load() }
    }
}

@MainActor
final class AssetsViewModel: ObservableObject {
    @Published private(set) var metrics: [NativeMetric] = []
    @Published private(set) var hierarchy: [NativeHierarchyNode] = []
    @Published private(set) var equipment: [NativeAssetEquipment] = []
    @Published private(set) var workOrders: [NativeAssetWorkOrder] = []
    @Published private(set) var meters: [NativeMeterReading] = []

    func load() {
        metrics = [
            .init(title: "Sites", value: "3", detail: "12 systems"),
            .init(title: "Assets", value: "84", detail: "8 critical"),
            .init(title: "Open WOs", value: "11", detail: "4 assigned"),
            .init(title: "Meters", value: "14", detail: "2 pending")
        ]

        hierarchy = [
            .init(name: "Compressor Station A", site: "Main Plant", area: "Compression", system: "Gas Train 1"),
            .init(name: "Switchgear Room", site: "Main Plant", area: "Utilities", system: "Electrical Distribution"),
            .init(name: "Booster Skid", site: "North Yard", area: "Mechanical", system: "Pressure Boosting")
        ]

        equipment = [
            .init(tag: "EQ-201", description: "Reciprocating Compressor", location: "Station A", owner: "Mechanical", status: "active"),
            .init(tag: "EQ-114", description: "11kV Switchboard", location: "Switchgear Room", owner: "Electrical", status: "scheduled"),
            .init(tag: "EQ-333", description: "Gas Dryer Package", location: "North Yard", owner: "Process", status: "active")
        ]

        workOrders = [
            .init(number: "WO-24018", title: "Seal replacement inspection", assetTag: "EQ-201", priority: "HIGH", status: "in_progress"),
            .init(number: "WO-24031", title: "Breaker thermal scan", assetTag: "EQ-114", priority: "NORMAL", status: "planned"),
            .init(number: "WO-24044", title: "Dryer dew point calibration prep", assetTag: "EQ-333", priority: "HIGH", status: "pending")
        ]

        meters = [
            .init(name: "Custody Meter CM-01", location: "Metering Skid", reading: "18,440 MSCMD", status: "synced"),
            .init(name: "Internal Meter IM-07", location: "Utility Header", reading: "4.1 MW", status: "pending"),
            .init(name: "Water Meter WM-03", location: "Cooling System", reading: "315 m3", status: "synced")
        ]
    }
}

// MARK: - Logbook
enum NativeLogbookCategory: String, CaseIterable, Identifiable {
    case mechanical = "Mechanical"
    case electrical = "Electrical"
    case process = "Process"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .mechanical: return "gearshape.2.fill"
        case .electrical: return "bolt.fill"
        case .process: return "flame.fill"
        }
    }
}

struct LogbookHubView: View {
    @StateObject private var viewModel = LogbookViewModel()
    @State private var selectedCategory: NativeLogbookCategory = .mechanical

    var body: some View {
        List {
            Section("Category") {
                Picker("Category", selection: $selectedCategory) {
                    ForEach(NativeLogbookCategory.allCases) { category in
                        Label(category.rawValue, systemImage: category.icon).tag(category)
                    }
                }
                .pickerStyle(.segmented)
            }

            Section("Summary") {
                NativeMetricGrid(metrics: viewModel.metrics(for: selectedCategory))
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
            }

            Section("Entries") {
                ForEach(viewModel.entries(for: selectedCategory)) { entry in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(entry.equipment)
                                .font(.headline)
                            Spacer()
                            StatusBadge(status: entry.shift)
                        }

                        Text(entry.note)
                            .font(.subheadline)

                        Text("\(entry.operatorName) • \(entry.timestamp.formatted(date: .abbreviated, time: .shortened))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .navigationTitle("Logbook")
        .task { viewModel.load() }
    }
}

@MainActor
final class LogbookViewModel: ObservableObject {
    @Published private(set) var entriesByCategory: [NativeLogbookCategory: [NativeLogbookEntry]] = [:]

    func load() {
        entriesByCategory = [
            .mechanical: [
                .init(equipment: "Compressor A", note: "Observed minor vibration increase during night shift; monitoring continued.", shift: "night", operatorName: "Raj Kumar", timestamp: Date(timeIntervalSinceNow: -10_800)),
                .init(equipment: "Pump P-14", note: "Seal flush line cleaned and pressure restored to target band.", shift: "day", operatorName: "Sonia Das", timestamp: Date(timeIntervalSinceNow: -18_000))
            ],
            .electrical: [
                .init(equipment: "Panel 11kV-2", note: "IR log updated after feeder shutdown. No abnormal delta found.", shift: "day", operatorName: "Kiran M", timestamp: Date(timeIntervalSinceNow: -7_200)),
                .init(equipment: "Transformer TR-04", note: "Earth pit resistance measured and documented for monthly review.", shift: "swing", operatorName: "Harish S", timestamp: Date(timeIntervalSinceNow: -28_800))
            ],
            .process: [
                .init(equipment: "Gas Train 1", note: "Compression ratio stable after cooler wash. No carryover reported.", shift: "day", operatorName: "Anita P", timestamp: Date(timeIntervalSinceNow: -14_400)),
                .init(equipment: "Booster Skid", note: "Suction pressure dip noted during transfer. Logged for planner follow-up.", shift: "night", operatorName: "Dinesh V", timestamp: Date(timeIntervalSinceNow: -36_000))
            ]
        ]
    }

    func entries(for category: NativeLogbookCategory) -> [NativeLogbookEntry] {
        entriesByCategory[category] ?? []
    }

    func metrics(for category: NativeLogbookCategory) -> [NativeMetric] {
        let entries = entries(for: category)
        return [
            .init(title: "Entries", value: "\(entries.count)", detail: category.rawValue),
            .init(title: "Last Shift", value: entries.first?.shift.capitalized ?? "None", detail: "Most recent"),
            .init(title: "Follow-ups", value: "\(entries.filter { $0.note.localizedCaseInsensitiveContains("monitor") || $0.note.localizedCaseInsensitiveContains("follow") }.count)", detail: "Actionable notes")
        ]
    }
}

// MARK: - Workshop
struct WorkshopHubView: View {
    @StateObject private var viewModel = WorkshopLocalViewModel()
    @State private var showingNewJob = false
    @State private var selectedFilter: NativeWorkshopShop = .all

    var body: some View {
        List {
            Section("Shop Filter") {
                Picker("Shop", selection: $selectedFilter) {
                    ForEach(NativeWorkshopShop.allCases) { shop in
                        Text(shop.displayName).tag(shop)
                    }
                }
                .pickerStyle(.segmented)
            }

            Section("Workshop Snapshot") {
                NativeMetricGrid(metrics: viewModel.metrics(filter: selectedFilter))
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
            }

            Section("Jobs") {
                ForEach(viewModel.jobs(for: selectedFilter)) { job in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(job.number)
                                .font(.headline)
                            Spacer()
                            StatusBadge(status: job.status)
                        }

                        Text(job.title)
                            .font(.subheadline)

                        Text("\(job.shop.displayName) • \(job.priority) • \(job.owner)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .navigationTitle("Workshop")
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
            NativeWorkshopJobForm { title, shop in
                viewModel.addJob(title: title, shop: shop)
            }
        }
        .task { viewModel.load() }
    }
}

@MainActor
final class WorkshopLocalViewModel: ObservableObject {
    @Published private(set) var jobs: [NativeWorkshopJob] = []

    func load() {
        jobs = [
            .init(number: "WS-1021", title: "Impeller balancing for standby pump", shop: .machine, priority: "HIGH", status: "in_progress", owner: "Machine Shop"),
            .init(number: "WS-1025", title: "Fabrication of guard for compressor coupling", shop: .fabrication, priority: "NORMAL", status: "pending", owner: "Fab Team"),
            .init(number: "WS-1031", title: "Alternator rewiring verification", shop: .electrical, priority: "URGENT", status: "planned", owner: "Electrical Shop")
        ]
    }

    func jobs(for filter: NativeWorkshopShop) -> [NativeWorkshopJob] {
        guard filter != .all else { return jobs }
        return jobs.filter { $0.shop == filter }
    }

    func metrics(filter: NativeWorkshopShop) -> [NativeMetric] {
        let scopedJobs = jobs(for: filter)
        return [
            .init(title: "Pending", value: "\(scopedJobs.filter { $0.status == "pending" }.count)", detail: filter.displayName),
            .init(title: "In Progress", value: "\(scopedJobs.filter { $0.status == "in_progress" }.count)", detail: "Active jobs"),
            .init(title: "Urgent", value: "\(scopedJobs.filter { $0.priority == "URGENT" }.count)", detail: "Priority")
        ]
    }

    func addJob(title: String, shop: NativeWorkshopShop) {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        let nextNumber = "WS-\(1030 + jobs.count + 1)"
        jobs.insert(
            .init(number: nextNumber, title: trimmed, shop: shop, priority: "NORMAL", status: "pending", owner: "\(shop.displayName) Shop"),
            at: 0
        )
    }
}

// MARK: - Calibration
private enum CalibrationNativeSection: String, CaseIterable, Identifiable {
    case dashboard = "Dashboard"
    case records = "Records"
    case standards = "Standards"

    var id: String { rawValue }
}

struct CalibrationHubView: View {
    @StateObject private var viewModel = CalibrationLocalViewModel()
    @State private var selectedSection: CalibrationNativeSection = .dashboard

    var body: some View {
        List {
            Section("Section") {
                Picker("Section", selection: $selectedSection) {
                    ForEach(CalibrationNativeSection.allCases) { section in
                        Text(section.rawValue).tag(section)
                    }
                }
                .pickerStyle(.segmented)
            }

            switch selectedSection {
            case .dashboard:
                Section("Calibration Snapshot") {
                    NativeMetricGrid(metrics: viewModel.metrics)
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)
                }

                Section("Upcoming") {
                    ForEach(viewModel.upcomingRecords) { record in
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(record.instrument)
                                    .font(.headline)
                                Text(record.dueDate.formatted(date: .abbreviated, time: .omitted))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()
                            StatusBadge(status: record.result)
                        }
                    }
                }
            case .records:
                Section("Recent Records") {
                    ForEach(viewModel.records) { record in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(record.instrument)
                                    .font(.headline)
                                Spacer()
                                StatusBadge(status: record.result)
                            }

                            Text("\(record.technician) • \(record.standard)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            case .standards:
                Section("Standards Registry") {
                    ForEach(viewModel.standards) { standard in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(standard.name)
                                .font(.headline)
                            Text("Due \(standard.dueDate.formatted(date: .abbreviated, time: .omitted))")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .navigationTitle("Calibration")
        .task { viewModel.load() }
    }
}

@MainActor
final class CalibrationLocalViewModel: ObservableObject {
    @Published private(set) var metrics: [NativeMetric] = []
    @Published private(set) var records: [NativeCalibrationRecord] = []
    @Published private(set) var standards: [NativeStandardRecord] = []

    var upcomingRecords: [NativeCalibrationRecord] {
        records.sorted { $0.dueDate < $1.dueDate }.prefix(3).map { $0 }
    }

    func load() {
        metrics = [
            .init(title: "Due This Week", value: "7", detail: "2 overdue"),
            .init(title: "Completed", value: "19", detail: "Current month"),
            .init(title: "Standards", value: "6", detail: "1 expiring soon")
        ]

        records = [
            .init(instrument: "PT-112", dueDate: Date(timeIntervalSinceNow: 86_400 * 2), technician: "Megha R", standard: "Deadweight Tester", result: "scheduled"),
            .init(instrument: "TT-245", dueDate: Date(timeIntervalSinceNow: 86_400 * 5), technician: "Ajay P", standard: "Dry Block", result: "planned"),
            .init(instrument: "FT-018", dueDate: Date(timeIntervalSinceNow: -86_400), technician: "Karthik N", standard: "Flow Bench", result: "passed")
        ]

        standards = [
            .init(name: "Deadweight Tester DW-02", dueDate: Date(timeIntervalSinceNow: 86_400 * 18)),
            .init(name: "Digital Multimeter STD-09", dueDate: Date(timeIntervalSinceNow: 86_400 * 32)),
            .init(name: "Pressure Comparator PC-04", dueDate: Date(timeIntervalSinceNow: 86_400 * 7))
        ]
    }
}

// MARK: - Energy
private enum EnergyNativeSection: String, CaseIterable, Identifiable {
    case dashboard = "Dashboard"
    case dailyLogs = "Daily Logs"
    case bills = "Monthly Bills"

    var id: String { rawValue }
}

struct EnergyHubView: View {
    @StateObject private var viewModel = EnergyLocalViewModel()
    @State private var selectedSection: EnergyNativeSection = .dashboard

    var body: some View {
        List {
            Section("Section") {
                Picker("Section", selection: $selectedSection) {
                    ForEach(EnergyNativeSection.allCases) { section in
                        Text(section.rawValue).tag(section)
                    }
                }
                .pickerStyle(.segmented)
            }

            if selectedSection == .dashboard {
                Section("Energy Snapshot") {
                    NativeMetricGrid(metrics: viewModel.metrics)
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)
                }
            }

            if selectedSection == .dailyLogs || selectedSection == .dashboard {
                Section("Daily Consumption") {
                    ForEach(viewModel.dailyLogs) { log in
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(log.dayLabel)
                                    .font(.headline)
                                Text(log.source)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            VStack(alignment: .trailing, spacing: 4) {
                                Text(log.value)
                                    .font(.headline)
                                StatusBadge(status: log.status)
                            }
                        }
                    }
                }
            }

            if selectedSection == .bills || selectedSection == .dashboard {
                Section("Monthly Bills") {
                    ForEach(viewModel.bills) { bill in
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(bill.month)
                                    .font(.headline)
                                Text(bill.vendor)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            VStack(alignment: .trailing, spacing: 4) {
                                Text(bill.amount)
                                    .font(.headline)
                                StatusBadge(status: bill.status)
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("Energy")
        .task { viewModel.load() }
    }
}

@MainActor
final class EnergyLocalViewModel: ObservableObject {
    @Published private(set) var metrics: [NativeMetric] = []
    @Published private(set) var dailyLogs: [NativeEnergyLog] = []
    @Published private(set) var bills: [NativeEnergyBill] = []

    func load() {
        metrics = [
            .init(title: "Today", value: "42.6 MWh", detail: "Plant demand"),
            .init(title: "Diesel", value: "1,180 L", detail: "Shift total"),
            .init(title: "Pending Bills", value: "2", detail: "Finance review")
        ]

        dailyLogs = [
            .init(dayLabel: "Today", source: "Grid Power", value: "42.6 MWh", status: "synced"),
            .init(dayLabel: "Yesterday", source: "DG Backup", value: "1.8 MWh", status: "synced"),
            .init(dayLabel: "This Week", source: "Fuel Gas", value: "8,240 Sm3", status: "pending")
        ]

        bills = [
            .init(month: "March 2026", vendor: "State Grid", amount: "₹12.4L", status: "approved"),
            .init(month: "March 2026", vendor: "Diesel Supply", amount: "₹3.1L", status: "pending"),
            .init(month: "February 2026", vendor: "State Grid", amount: "₹11.8L", status: "approved")
        ]
    }
}

// MARK: - MOH
struct MOHHubView: View {
    @StateObject private var viewModel = MOHLocalViewModel()

    var body: some View {
        List {
            Section("MOH Snapshot") {
                NativeMetricGrid(metrics: viewModel.metrics)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
            }

            Section("Critical Equipment") {
                ForEach(viewModel.criticalItems) { item in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(item.equipment)
                                .font(.headline)
                            Spacer()
                            StatusBadge(status: item.status)
                        }

                        Text(item.reason)
                            .font(.subheadline)
                        Text("Target outage: \(item.targetDate.formatted(date: .abbreviated, time: .omitted))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Section("Upcoming Windows") {
                ForEach(viewModel.upcomingWindows) { item in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.equipment)
                                .font(.headline)
                            Text(item.reason)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()
                        Text(item.targetDate.formatted(date: .abbreviated, time: .omitted))
                            .font(.caption.weight(.semibold))
                    }
                }
            }
        }
        .navigationTitle("MOH")
        .task { viewModel.load() }
    }
}

@MainActor
final class MOHLocalViewModel: ObservableObject {
    @Published private(set) var metrics: [NativeMetric] = []
    @Published private(set) var criticalItems: [NativeMaintenanceWindow] = []
    @Published private(set) var upcomingWindows: [NativeMaintenanceWindow] = []

    func load() {
        metrics = [
            .init(title: "Planned", value: "6", detail: "Quarter outlook"),
            .init(title: "Critical", value: "2", detail: "Needs approval"),
            .init(title: "Ready", value: "4", detail: "Work packs prepared")
        ]

        criticalItems = [
            .init(equipment: "Compressor B", reason: "Valve wear trend exceeds threshold", targetDate: Date(timeIntervalSinceNow: 86_400 * 6), status: "critical"),
            .init(equipment: "Switchboard SB-2", reason: "Protection relay firmware update window", targetDate: Date(timeIntervalSinceNow: 86_400 * 10), status: "planned")
        ]

        upcomingWindows = [
            .init(equipment: "Dryer Package", reason: "Media replacement and leak test", targetDate: Date(timeIntervalSinceNow: 86_400 * 14), status: "scheduled"),
            .init(equipment: "Cooling Tower CT-1", reason: "Fan gearbox inspection", targetDate: Date(timeIntervalSinceNow: 86_400 * 21), status: "scheduled")
        ]
    }
}

// MARK: - MRP
struct MRPHubView: View {
    @StateObject private var viewModel = MRPLocalViewModel()
    @State private var showingDraftForm = false

    var body: some View {
        List {
            Section("Requirements Snapshot") {
                NativeMetricGrid(metrics: viewModel.metrics)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
            }

            Section("Requirements") {
                ForEach(viewModel.requirements) { requirement in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(requirement.material)
                                .font(.headline)
                            Spacer()
                            StatusBadge(status: requirement.status)
                        }

                        Text("\(requirement.quantity) • \(requirement.vendor)")
                            .font(.subheadline)
                        Text("Needed by \(requirement.needBy.formatted(date: .abbreviated, time: .omitted))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Section("Drafts") {
                ForEach(viewModel.drafts) { draft in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(draft.title)
                                .font(.headline)
                            Text(draft.owner)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()
                        StatusBadge(status: draft.status)
                    }
                }
            }
        }
        .navigationTitle("MRP")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    showingDraftForm = true
                } label: {
                    Image(systemName: "square.and.pencil")
                }
            }
        }
        .sheet(isPresented: $showingDraftForm) {
            NativeDraftForm { title in
                viewModel.addDraft(title: title)
            }
        }
        .task { viewModel.load() }
    }
}

@MainActor
final class MRPLocalViewModel: ObservableObject {
    @Published private(set) var metrics: [NativeMetric] = []
    @Published private(set) var requirements: [NativeRequirement] = []
    @Published private(set) var drafts: [NativeDraft] = []

    func load() {
        metrics = [
            .init(title: "Open Lines", value: "12", detail: "3 urgent"),
            .init(title: "Draft PRs", value: "4", detail: "Awaiting review"),
            .init(title: "Preferred Vendors", value: "9", detail: "Local catalog")
        ]

        requirements = [
            .init(material: "Compressor valve kit", quantity: "2 sets", vendor: "FlowTech", needBy: Date(timeIntervalSinceNow: 86_400 * 4), status: "pending"),
            .init(material: "PTFE gasket sheet", quantity: "12 rolls", vendor: "SealPro", needBy: Date(timeIntervalSinceNow: 86_400 * 7), status: "planned"),
            .init(material: "Cable gland assortment", quantity: "40 pcs", vendor: "Electra", needBy: Date(timeIntervalSinceNow: 86_400 * 10), status: "approved")
        ]

        drafts = [
            .init(title: "April rotating equipment pack", owner: "Planner Desk", status: "draft"),
            .init(title: "Shutdown spares top-up", owner: "Stores Team", status: "pending")
        ]
    }

    func addDraft(title: String) {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        drafts.insert(.init(title: trimmed, owner: "Native App", status: "draft"), at: 0)
    }
}

// MARK: - Procurement
private enum ProcurementNativeSection: String, CaseIterable, Identifiable {
    case dashboard = "Dashboard"
    case cases = "Cases"
    case budget = "Budget"
    case org = "Org"

    var id: String { rawValue }
}

struct ProcurementHubView: View {
    @StateObject private var viewModel = ProcurementLocalViewModel()
    @State private var selectedSection: ProcurementNativeSection = .dashboard

    var body: some View {
        List {
            Section("Section") {
                Picker("Section", selection: $selectedSection) {
                    ForEach(ProcurementNativeSection.allCases) { section in
                        Text(section.rawValue).tag(section)
                    }
                }
                .pickerStyle(.segmented)
            }

            if selectedSection == .dashboard || selectedSection == .cases {
                Section("Cases") {
                    ForEach(viewModel.cases) { caseItem in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(caseItem.title)
                                    .font(.headline)
                                Spacer()
                                StatusBadge(status: caseItem.status)
                            }

                            Text("\(caseItem.owner) • \(caseItem.amount)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }

            if selectedSection == .dashboard || selectedSection == .budget {
                Section("Budget") {
                    NativeMetricGrid(metrics: viewModel.metrics)
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)

                    ForEach(viewModel.budgetLines) { line in
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(line.name)
                                    .font(.headline)
                                Text(line.spent)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()
                            Text(line.available)
                                .font(.headline)
                        }
                    }
                }
            }

            if selectedSection == .org {
                Section("Org Structure") {
                    ForEach(viewModel.orgUnits) { unit in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(unit.name)
                                .font(.headline)
                            Text(unit.owner)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .navigationTitle("Procurement")
        .task { viewModel.load() }
    }
}

@MainActor
final class ProcurementLocalViewModel: ObservableObject {
    @Published private(set) var metrics: [NativeMetric] = []
    @Published private(set) var cases: [NativeProcurementCase] = []
    @Published private(set) var budgetLines: [NativeBudgetLine] = []
    @Published private(set) var orgUnits: [NativeOrgUnit] = []

    func load() {
        metrics = [
            .init(title: "Open Cases", value: "8", detail: "2 high value"),
            .init(title: "Approved", value: "₹24L", detail: "Current month"),
            .init(title: "Available", value: "₹41L", detail: "Maintenance budget")
        ]

        cases = [
            .init(title: "Valve kit emergency procurement", owner: "Mechanical Planner", amount: "₹4.8L", status: "under_review"),
            .init(title: "Electrical cable replenishment", owner: "Stores Supervisor", amount: "₹1.9L", status: "approved"),
            .init(title: "Instrument standard renewal", owner: "Calibration Team", amount: "₹3.4L", status: "draft")
        ]

        budgetLines = [
            .init(name: "Rotating Equipment", spent: "Spent ₹12L", available: "Avail ₹18L"),
            .init(name: "Electrical", spent: "Spent ₹7L", available: "Avail ₹9L"),
            .init(name: "Instrumentation", spent: "Spent ₹4L", available: "Avail ₹14L")
        ]

        orgUnits = [
            .init(name: "Corporate Procurement", owner: "R. Menon"),
            .init(name: "Plant Buyers", owner: "S. Kumar"),
            .init(name: "Stores & Inventory", owner: "A. Nair")
        ]
    }
}

// MARK: - Settings
struct SettingsView: View {
    @StateObject private var viewModel = SettingsLocalViewModel()

    var body: some View {
        Form {
            Section("Appearance") {
                Picker("Theme", selection: $viewModel.theme) {
                    ForEach(NativeTheme.allCases) { theme in
                        Text(theme.rawValue).tag(theme)
                    }
                }

                Picker("Accent", selection: $viewModel.accent) {
                    ForEach(NativeAccent.allCases) { accent in
                        Text(accent.rawValue).tag(accent)
                    }
                }
            }

            Section("Notifications") {
                Toggle("Push Notifications", isOn: $viewModel.pushNotifications)
                Toggle("Email Notifications", isOn: $viewModel.emailNotifications)
                Toggle("Auto Sync on Wi-Fi", isOn: $viewModel.autoSyncWiFi)
            }

            Section("Security") {
                Toggle("Biometric Login", isOn: $viewModel.biometricLogin)
                Toggle("Auto Lock", isOn: $viewModel.autoLock)
            }

            Section("Storage") {
                HStack {
                    Text("Device Cache")
                    Spacer()
                    Text(viewModel.cacheSizeText)
                        .foregroundStyle(.secondary)
                }

                Button("Clear Mobile Cache", role: .destructive) {
                    viewModel.clearMobileCache()
                }
            }

            Section("About") {
                HStack {
                    Text("Version")
                    Spacer()
                    Text("Native Preview 0.2")
                        .foregroundStyle(.secondary)
                }

                Text("Settings are stored only on this device while the native module is in local-first mode.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Settings")
        .onAppear { viewModel.load() }
        .onDisappear { viewModel.saveChanges() }
    }
}

@MainActor
final class SettingsLocalViewModel: ObservableObject {
    private let userDefaults: UserDefaults

    @Published var theme: NativeTheme = .system
    @Published var accent: NativeAccent = .teal
    @Published var pushNotifications = true
    @Published var emailNotifications = false
    @Published var autoSyncWiFi = true
    @Published var biometricLogin = false
    @Published var autoLock = true
    @Published private(set) var cacheSizeText = "0 MB"

    init(userDefaults: UserDefaults = .standard) {
        self.userDefaults = userDefaults
    }

    func load() {
        theme = NativeTheme(rawValue: userDefaults.string(forKey: "native_settings_theme") ?? "") ?? .system
        accent = NativeAccent(rawValue: userDefaults.string(forKey: "native_settings_accent") ?? "") ?? .teal
        pushNotifications = userDefaults.object(forKey: "native_settings_push") as? Bool ?? true
        emailNotifications = userDefaults.object(forKey: "native_settings_email") as? Bool ?? false
        autoSyncWiFi = userDefaults.object(forKey: "native_settings_wifi") as? Bool ?? true
        biometricLogin = userDefaults.object(forKey: "native_settings_biometric") as? Bool ?? false
        autoLock = userDefaults.object(forKey: "native_settings_autolock") as? Bool ?? true
        updateCacheSize()
    }

    func clearMobileCache() {
        userDefaults.removeObject(forKey: ManualsViewModel.downloadStateStorageKey)

        if let cacheDirectory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first {
            let downloadDirectory = cacheDirectory.appendingPathComponent(
                ManualsViewModel.downloadCacheDirectoryName,
                isDirectory: true
            )
            try? FileManager.default.removeItem(at: downloadDirectory)
        }

        saveChanges()
        updateCacheSize()
    }

    private func updateCacheSize() {
        guard let cacheDirectory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first else {
            cacheSizeText = "0 MB"
            return
        }

        let downloadDirectory = cacheDirectory.appendingPathComponent(
            ManualsViewModel.downloadCacheDirectoryName,
            isDirectory: true
        )
        let fileCount = (try? FileManager.default.contentsOfDirectory(
            at: downloadDirectory,
            includingPropertiesForKeys: nil
        ).count) ?? 0
        cacheSizeText = fileCount == 0 ? "0 MB" : "\(fileCount) cached items"
    }

    private func persist() {
        userDefaults.set(theme.rawValue, forKey: "native_settings_theme")
        userDefaults.set(accent.rawValue, forKey: "native_settings_accent")
        userDefaults.set(pushNotifications, forKey: "native_settings_push")
        userDefaults.set(emailNotifications, forKey: "native_settings_email")
        userDefaults.set(autoSyncWiFi, forKey: "native_settings_wifi")
        userDefaults.set(biometricLogin, forKey: "native_settings_biometric")
        userDefaults.set(autoLock, forKey: "native_settings_autolock")
    }

    func saveChanges() {
        persist()
        updateCacheSize()
    }
}

// MARK: - User Management
struct UserManagementView: View {
    @StateObject private var viewModel = UserManagementViewModel()

    var body: some View {
        List {
            Section("Team Snapshot") {
                NativeMetricGrid(metrics: viewModel.metrics)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
            }

            Section("Users") {
                ForEach(viewModel.users) { user in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(user.name)
                                .font(.headline)
                            Spacer()
                            StatusBadge(status: user.status)
                        }

                        Text("\(user.role) • \(user.department)")
                            .font(.subheadline)
                        Text(user.email)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Section("Roles") {
                ForEach(viewModel.roles) { role in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(role.name)
                            .font(.headline)
                        Text(role.permissions.joined(separator: ", "))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .navigationTitle("User Management")
        .task { viewModel.load() }
    }
}

@MainActor
final class UserManagementViewModel: ObservableObject {
    @Published private(set) var metrics: [NativeMetric] = []
    @Published private(set) var users: [NativeUserRecord] = []
    @Published private(set) var roles: [NativeRoleRecord] = []

    func load() {
        metrics = [
            .init(title: "Users", value: "26", detail: "21 active"),
            .init(title: "Roles", value: "5", detail: "Supervisor mapped"),
            .init(title: "Pending Access", value: "2", detail: "Needs approval")
        ]

        users = [
            .init(name: "Ram C", role: "Administrator", department: "Operations", email: "ram@example.com", status: "active"),
            .init(name: "Megha R", role: "Calibration Lead", department: "Instrumentation", email: "megha@example.com", status: "active"),
            .init(name: "Sonia Das", role: "Planner", department: "Mechanical", email: "sonia@example.com", status: "pending")
        ]

        roles = [
            .init(name: "Administrator", permissions: ["Users", "Settings", "Modules"]),
            .init(name: "Planner", permissions: ["Work Orders", "Procurement", "Reports"]),
            .init(name: "Supervisor", permissions: ["Manuals", "Training", "Workshop"])
        ]
    }
}

// MARK: - Shared Views and Models
private struct NativeMetricGrid: View {
    let metrics: [NativeMetric]

    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            ForEach(metrics) { metric in
                VStack(alignment: .leading, spacing: 6) {
                    Text(metric.title)
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    Text(metric.value)
                        .font(.title3.weight(.semibold))

                    Text(metric.detail)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 6)
    }
}

private struct NativeWorkshopJobForm: View {
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var shop: NativeWorkshopShop = .machine
    let onSave: (String, NativeWorkshopShop) -> Void

    var body: some View {
        NavigationStack {
            Form {
                TextField("Job title", text: $title)

                Picker("Shop", selection: $shop) {
                    ForEach(NativeWorkshopShop.allCases.filter { $0 != .all }) { item in
                        Text(item.displayName).tag(item)
                    }
                }
            }
            .navigationTitle("New Job")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        onSave(title, shop)
                        dismiss()
                    }
                    .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}

private struct NativeDraftForm: View {
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    let onSave: (String) -> Void

    var body: some View {
        NavigationStack {
            Form {
                TextField("Draft title", text: $title)
            }
            .navigationTitle("New Draft")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        onSave(title)
                        dismiss()
                    }
                    .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}

struct NativeMetric: Identifiable {
    let id = UUID()
    let title: String
    let value: String
    let detail: String
}

struct NativeModuleStatus: Identifiable {
    let id = UUID()
    let name: String
    let status: String
    let summary: String
}

struct NativeHierarchyNode: Identifiable {
    let id = UUID()
    let name: String
    let site: String
    let area: String
    let system: String
}

struct NativeAssetEquipment: Identifiable {
    let id = UUID()
    let tag: String
    let description: String
    let location: String
    let owner: String
    let status: String
}

struct NativeAssetWorkOrder: Identifiable {
    let id = UUID()
    let number: String
    let title: String
    let assetTag: String
    let priority: String
    let status: String
}

struct NativeMeterReading: Identifiable {
    let id = UUID()
    let name: String
    let location: String
    let reading: String
    let status: String
}

struct NativeLogbookEntry: Identifiable {
    let id = UUID()
    let equipment: String
    let note: String
    let shift: String
    let operatorName: String
    let timestamp: Date
}

enum NativeWorkshopShop: String, CaseIterable, Identifiable {
    case all = "ALL"
    case fabrication = "FABRICATION"
    case machine = "MACHINE"
    case electrical = "ELECTRICAL"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .all: return "All Shops"
        case .fabrication: return "Fabrication"
        case .machine: return "Machine"
        case .electrical: return "Electrical"
        }
    }
}

struct NativeWorkshopJob: Identifiable {
    let id = UUID()
    let number: String
    let title: String
    let shop: NativeWorkshopShop
    let priority: String
    let status: String
    let owner: String
}

struct NativeCalibrationRecord: Identifiable {
    let id = UUID()
    let instrument: String
    let dueDate: Date
    let technician: String
    let standard: String
    let result: String
}

struct NativeStandardRecord: Identifiable {
    let id = UUID()
    let name: String
    let dueDate: Date
}

struct NativeEnergyLog: Identifiable {
    let id = UUID()
    let dayLabel: String
    let source: String
    let value: String
    let status: String
}

struct NativeEnergyBill: Identifiable {
    let id = UUID()
    let month: String
    let vendor: String
    let amount: String
    let status: String
}

struct NativeMaintenanceWindow: Identifiable {
    let id = UUID()
    let equipment: String
    let reason: String
    let targetDate: Date
    let status: String
}

struct NativeRequirement: Identifiable {
    let id = UUID()
    let material: String
    let quantity: String
    let vendor: String
    let needBy: Date
    let status: String
}

struct NativeDraft: Identifiable {
    let id = UUID()
    let title: String
    let owner: String
    let status: String
}

struct NativeProcurementCase: Identifiable {
    let id = UUID()
    let title: String
    let owner: String
    let amount: String
    let status: String
}

struct NativeBudgetLine: Identifiable {
    let id = UUID()
    let name: String
    let spent: String
    let available: String
}

struct NativeOrgUnit: Identifiable {
    let id = UUID()
    let name: String
    let owner: String
}

enum NativeTheme: String, CaseIterable, Identifiable {
    case system = "System"
    case light = "Light"
    case dark = "Dark"

    var id: String { rawValue }
}

enum NativeAccent: String, CaseIterable, Identifiable {
    case teal = "Teal"
    case blue = "Blue"
    case green = "Green"
    case orange = "Orange"

    var id: String { rawValue }
}

struct NativeUserRecord: Identifiable {
    let id = UUID()
    let name: String
    let role: String
    let department: String
    let email: String
    let status: String
}

struct NativeRoleRecord: Identifiable {
    let id = UUID()
    let name: String
    let permissions: [String]
}
