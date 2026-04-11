import Foundation

// MARK: - Training Record
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
    
    // Relationships
    var installation: Installation?
    
    var statusEnum: TrainingStatus? {
        TrainingStatus(rawValue: status)
    }
}

// MARK: - Training Attendee
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

// MARK: - Training Type
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

// MARK: - Create Training Request
struct CreateTrainingRequest: Codable {
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
    var remarks: String?
}

// MARK: - Add Attendee Request
struct AddAttendeeRequest: Codable {
    let employeeId: String
    let employeeName: String
    var department: String?
}

// MARK: - Update Attendee Request
struct UpdateAttendeeRequest: Codable {
    var attended: Bool?
    var score: Double?
    var certified: Bool?
    var feedback: String?
}
