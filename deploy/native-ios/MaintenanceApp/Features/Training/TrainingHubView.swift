import SwiftUI
import Foundation

// MARK: - Training Hub View
struct TrainingHubView: View {
    @State private var selectedTab = 0
    @StateObject private var viewModel = TrainingViewModel()
    @State private var showingNewTraining = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Tab Picker
            Picker("View", selection: $selectedTab) {
                Text("Dashboard").tag(0)
                Text("Records").tag(1)
            }
            .pickerStyle(.segmented)
            .padding()
            
            // Content
            if selectedTab == 0 {
                TrainingDashboardView(viewModel: viewModel)
            } else {
                TrainingRecordsListView(viewModel: viewModel)
            }
        }
        .navigationTitle("Training")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    showingNewTraining = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showingNewTraining) {
            NavigationStack {
                TrainingEntryView()
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .trainingRecordsDidChange)) { _ in
            Task { await viewModel.loadRecords() }
        }
        .task {
            await viewModel.loadRecords()
        }
    }
}

// MARK: - Training Dashboard View
struct TrainingDashboardView: View {
    @ObservedObject var viewModel: TrainingViewModel
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Stats
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    TrainingStatCard(
                        title: "Scheduled",
                        value: "\(viewModel.scheduledCount)",
                        iconName: "calendar",
                        color: .blue
                    )
                    
                    TrainingStatCard(
                        title: "Ongoing",
                        value: "\(viewModel.ongoingCount)",
                        iconName: "play.circle.fill",
                        color: .orange
                    )
                    
                    TrainingStatCard(
                        title: "Completed",
                        value: "\(viewModel.completedCount)",
                        iconName: "checkmark.circle.fill",
                        color: .green
                    )
                    
                    TrainingStatCard(
                        title: "Total Hours",
                        value: "\(Int(viewModel.totalHours))",
                        iconName: "clock.fill",
                        color: .purple
                    )
                }
                
                // Training by Type
                VStack(alignment: .leading, spacing: 12) {
                    Text("By Type")
                        .font(.headline)
                    
                    ForEach(TrainingType.allCases) { type in
                        TrainingTypeRow(
                            type: type,
                            count: viewModel.countByType(type)
                        )
                    }
                }
                .padding()
                .background(Color(.secondarySystemBackground))
                .cornerRadius(12)
                
                // Upcoming Trainings
                VStack(alignment: .leading, spacing: 12) {
                    Text("Upcoming Trainings")
                        .font(.headline)
                    
                    if viewModel.upcomingTrainings.isEmpty {
                        Text("No upcoming trainings")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .padding()
                    } else {
                        ForEach(viewModel.upcomingTrainings) { training in
                            UpcomingTrainingRow(training: training)
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

// MARK: - Training Stat Card
struct TrainingStatCard: View {
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

// MARK: - Training Type Row
struct TrainingTypeRow: View {
    let type: TrainingType
    let count: Int
    
    var body: some View {
        HStack {
            Image(systemName: type.iconName)
                .foregroundColor(.accentColor)
                .frame(width: 30)
            
            Text(type.displayName)
                .font(.subheadline)
            
            Spacer()
            
            Text("\(count)")
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Upcoming Training Row
struct UpcomingTrainingRow: View {
    let training: TrainingRecord
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(training.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Text(training.startDate.formatted(date: .abbreviated, time: .shortened))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Text(training.trainingType)
                .font(.caption2)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.accentColor.opacity(0.2))
                .cornerRadius(4)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Training Records List View
struct TrainingRecordsListView: View {
    @ObservedObject var viewModel: TrainingViewModel
    @State private var searchText = ""
    @State private var selectedType: TrainingType?
    
    var filteredRecords: [TrainingRecord] {
        var result = viewModel.records
        
        if let type = selectedType {
            result = result.filter { $0.trainingType == type.rawValue }
        }
        
        if !searchText.isEmpty {
            result = result.filter {
                $0.title.localizedCaseInsensitiveContains(searchText)
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
                    title: "No Training Records",
                    message: "No training records found.",
                    iconName: "graduationcap"
                )
            } else {
                List(filteredRecords) { record in
                    NavigationLink {
                        TrainingDetailView(training: record)
                    } label: {
                        TrainingRecordRow(training: record)
                    }
                }
                .listStyle(.plain)
                .searchable(text: $searchText, prompt: "Search trainings")
                .refreshable {
                    await viewModel.loadRecords()
                }
            }
        }
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    Button("All Types") { selectedType = nil }
                    ForEach(TrainingType.allCases) { type in
                        Button(type.displayName) { selectedType = type }
                    }
                } label: {
                    Image(systemName: "line.3.horizontal.decrease.circle")
                }
            }
        }
    }
}

// MARK: - Training Record Row
struct TrainingRecordRow: View {
    let training: TrainingRecord
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(training.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)
                
                Spacer()
                
                StatusBadge(status: training.status)
            }
            
            HStack {
                Label(training.trainingType, systemImage: TrainingType(rawValue: training.trainingType)?.iconName ?? "graduationcap")
                
                Spacer()
                
                Text(training.startDate.formatted(date: .abbreviated, time: .omitted))
            }
            .font(.caption)
            .foregroundColor(.secondary)
            
            if let attendees = training.attendees {
                HStack {
                    Image(systemName: "person.2.fill")
                    Text("\(attendees.count) attendees")
                }
                .font(.caption2)
                .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Training Detail View
struct TrainingDetailView: View {
    let training: TrainingRecord
    
    var body: some View {
        List {
            Section("Details") {
                LabeledContent("Title", value: training.title)
                LabeledContent("Type", value: training.trainingType)
                LabeledContent("Status", value: training.status)
                if let trainerName = training.trainerName {
                    LabeledContent("Trainer", value: trainerName)
                }
            }
            
            Section("Schedule") {
                LabeledContent("Start", value: training.startDate.formatted(date: .long, time: .shortened))
                LabeledContent("End", value: training.endDate.formatted(date: .long, time: .shortened))
                if let hours = training.durationHours {
                    LabeledContent("Duration", value: String(format: "%.1f hours", hours))
                }
                if let venue = training.venue {
                    LabeledContent("Venue", value: venue)
                }
            }
            
            if let description = training.description {
                Section("Description") {
                    Text(description)
                }
            }
            
            if let attendees = training.attendees, !attendees.isEmpty {
                Section("Attendees (\(attendees.count))") {
                    ForEach(attendees) { attendee in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(attendee.employeeName)
                                    .font(.subheadline)
                                if let dept = attendee.department {
                                    Text(dept)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                            
                            Spacer()
                            
                            if attendee.attended {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                            }
                            
                            if attendee.certified {
                                Image(systemName: "rosette")
                                    .foregroundColor(.orange)
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("Training Details")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Training Entry View
struct TrainingEntryView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = TrainingEntryViewModel()
    @State private var showingSuccess = false
    
    var body: some View {
        Form {
            Section("Basic Info") {
                TextField("Title", text: $viewModel.title)
                
                Picker("Type", selection: $viewModel.trainingType) {
                    ForEach(TrainingType.allCases) { type in
                        Text(type.displayName).tag(type.rawValue)
                    }
                }
                
                TextField("Trainer Name", text: $viewModel.trainerName)
            }
            
            Section("Schedule") {
                DatePicker("Start Date", selection: $viewModel.startDate)
                DatePicker("End Date", selection: $viewModel.endDate)
                TextField("Venue", text: $viewModel.venue)
                TextField("Max Attendees", value: $viewModel.maxAttendees, format: .number)
                    .keyboardType(.numberPad)
            }
            
            Section("Description") {
                TextEditor(text: $viewModel.description)
                    .frame(minHeight: 80)
            }
        }
        .navigationTitle("Record Training")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") {
                    Task {
                        await viewModel.save()
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
            Text("Training recorded successfully!")
        }
    }
}

// MARK: - Training ViewModel
@MainActor
class TrainingViewModel: ObservableObject {
    @Published var records: [TrainingRecord] = []
    @Published var isLoading = false
    
    var scheduledCount: Int { records.filter { $0.status == "SCHEDULED" }.count }
    var ongoingCount: Int { records.filter { $0.status == "ONGOING" }.count }
    var completedCount: Int { records.filter { $0.status == "COMPLETED" }.count }
    var totalHours: Double { records.compactMap { $0.durationHours }.reduce(0, +) }
    
    var upcomingTrainings: [TrainingRecord] {
        records.filter { $0.status == "SCHEDULED" && $0.startDate > Date() }
            .sorted { $0.startDate < $1.startDate }
            .prefix(5)
            .map { $0 }
    }
    
    func countByType(_ type: TrainingType) -> Int {
        records.filter { $0.trainingType == type.rawValue }.count
    }

    func loadRecords() async {
        isLoading = true
        records = LocalTrainingStore.shared.loadRecords()
        isLoading = false
    }
}

// MARK: - Training Entry ViewModel
@MainActor
class TrainingEntryViewModel: ObservableObject {
    @Published var title = ""
    @Published var trainingType = "TECHNICAL"
    @Published var trainerName = ""
    @Published var startDate = Date()
    @Published var endDate = Date().addingTimeInterval(3600 * 2)
    @Published var venue = ""
    @Published var maxAttendees: Int?
    @Published var description = ""
    @Published var isLoading = false
    @Published var error: String?
    
    var isValid: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty && endDate > startDate
    }
    
    func save() async {
        isLoading = true
        error = nil

        let record = TrainingRecord(
            id: UUID().uuidString,
            installationId: "native-local",
            trainingType: trainingType,
            title: title.trimmingCharacters(in: .whitespacesAndNewlines),
            description: description.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty,
            trainerId: nil,
            trainerName: trainerName.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty,
            startDate: startDate,
            endDate: endDate,
            durationHours: endDate.timeIntervalSince(startDate) / 3600,
            venue: venue.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty,
            maxAttendees: maxAttendees,
            status: "SCHEDULED",
            attendees: nil,
            remarks: nil,
            createdBy: "native-user",
            createdAt: Date(),
            updatedAt: Date()
        )

        LocalTrainingStore.shared.save(record: record)
        NotificationCenter.default.post(name: .trainingRecordsDidChange, object: nil)
        isLoading = false
    }
}

private final class LocalTrainingStore {
    static let shared = LocalTrainingStore()

    private let storageKey = "native_training_records"
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private init() {
        decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
    }

    func loadRecords() -> [TrainingRecord] {
        if let data = UserDefaults.standard.data(forKey: storageKey),
           let records = try? decoder.decode([TrainingRecord].self, from: data) {
            return records.sorted { $0.startDate < $1.startDate }
        }

        let seeded = seedRecords()
        persist(records: seeded)
        return seeded
    }

    func save(record: TrainingRecord) {
        var records = loadRecords()
        records.append(record)
        records.sort { $0.startDate < $1.startDate }
        persist(records: records)
    }

    private func persist(records: [TrainingRecord]) {
        if let data = try? encoder.encode(records) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }

    private func seedRecords() -> [TrainingRecord] {
        let now = Date()
        let calendar = Calendar.current

        return [
            TrainingRecord(
                id: UUID().uuidString,
                installationId: "native-local",
                trainingType: TrainingType.technical.rawValue,
                title: "Pump Alignment Workshop",
                description: "Hands-on session for alignment checks and vibration reduction.",
                trainerId: nil,
                trainerName: "R. Kumar",
                startDate: calendar.date(byAdding: .day, value: 2, to: now) ?? now,
                endDate: calendar.date(byAdding: .hour, value: 3, to: calendar.date(byAdding: .day, value: 2, to: now) ?? now) ?? now,
                durationHours: 3,
                venue: "Workshop Bay 2",
                maxAttendees: 12,
                status: "SCHEDULED",
                attendees: [
                    TrainingAttendee(id: UUID().uuidString, trainingId: "seed-1", employeeId: "E-101", employeeName: "Manoj", department: "Mechanical", attended: false, score: nil, certified: false, feedback: nil, createdAt: now),
                    TrainingAttendee(id: UUID().uuidString, trainingId: "seed-1", employeeId: "E-204", employeeName: "Nithya", department: "Mechanical", attended: false, score: nil, certified: false, feedback: nil, createdAt: now)
                ],
                remarks: nil,
                createdBy: "native-seed",
                createdAt: now,
                updatedAt: now
            ),
            TrainingRecord(
                id: UUID().uuidString,
                installationId: "native-local",
                trainingType: TrainingType.safety.rawValue,
                title: "LOTO Refresher",
                description: "Annual lockout-tagout refresher for maintenance teams.",
                trainerId: nil,
                trainerName: "Safety Cell",
                startDate: calendar.date(byAdding: .day, value: -5, to: now) ?? now,
                endDate: calendar.date(byAdding: .hour, value: 2, to: calendar.date(byAdding: .day, value: -5, to: now) ?? now) ?? now,
                durationHours: 2,
                venue: "Training Room A",
                maxAttendees: 20,
                status: "COMPLETED",
                attendees: [
                    TrainingAttendee(id: UUID().uuidString, trainingId: "seed-2", employeeId: "E-055", employeeName: "Arun", department: "Electrical", attended: true, score: 88, certified: true, feedback: nil, createdAt: now),
                    TrainingAttendee(id: UUID().uuidString, trainingId: "seed-2", employeeId: "E-077", employeeName: "Preethi", department: "Process", attended: true, score: 91, certified: true, feedback: nil, createdAt: now)
                ],
                remarks: nil,
                createdBy: "native-seed",
                createdAt: now,
                updatedAt: now
            )
        ]
    }
}

private extension String {
    var nilIfEmpty: String? {
        isEmpty ? nil : self
    }
}

extension Notification.Name {
    static let trainingRecordsDidChange = Notification.Name("trainingRecordsDidChange")
}

struct TrainingRecord: Codable, Identifiable {
    let id: String
    let installationId: String
    let trainingType: String
    let title: String
    var description: String?
    var trainerId: String?
    var trainerName: String?
    let startDate: Date
    let endDate: Date
    var durationHours: Double?
    var venue: String?
    var maxAttendees: Int?
    let status: String
    var attendees: [TrainingAttendee]?
    var remarks: String?
    let createdBy: String
    var createdAt: Date?
    var updatedAt: Date?
}

struct TrainingAttendee: Codable, Identifiable {
    let id: String
    let trainingId: String
    let employeeId: String
    let employeeName: String
    var department: String?
    let attended: Bool
    var score: Double?
    let certified: Bool
    var feedback: String?
    var createdAt: Date?
}

enum TrainingType: String, CaseIterable, Codable, Identifiable {
    case safety = "SAFETY"
    case technical = "TECHNICAL"
    case softSkills = "SOFT_SKILLS"
    case induction = "INDUCTION"
    case hse = "HSE"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .safety: return "Safety"
        case .technical: return "Technical"
        case .softSkills: return "Soft Skills"
        case .induction: return "Induction"
        case .hse: return "HSE"
        }
    }

    var iconName: String {
        switch self {
        case .safety: return "shield.checkered"
        case .technical: return "wrench.and.screwdriver"
        case .softSkills: return "person.2"
        case .induction: return "door.left.hand.open"
        case .hse: return "leaf"
        }
    }
}

#Preview {
    NavigationStack {
        TrainingHubView()
    }
}
