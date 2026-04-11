import Foundation

// MARK: - Discussion
struct Discussion: Codable, Identifiable {
    let id: String
    let title: String
    let content: String
    var category: String?
    let authorId: String
    let authorName: String
    let isPinned: Bool
    let isLocked: Bool
    let viewCount: Int
    var replies: [DiscussionReply]?
    var reactions: [DiscussionReaction]?
    var createdAt: Date?
    var updatedAt: Date?
    
    var replyCount: Int {
        replies?.count ?? 0
    }
    
    var reactionCount: Int {
        reactions?.count ?? 0
    }
}

// MARK: - Discussion Reply
struct DiscussionReply: Codable, Identifiable {
    let id: String
    let discussionId: String
    var parentId: String?
    let content: String
    let authorId: String
    let authorName: String
    var reactions: [ReplyReaction]?
    var createdAt: Date?
    var updatedAt: Date?
}

// MARK: - Discussion Reaction
struct DiscussionReaction: Codable, Identifiable {
    let id: String
    let discussionId: String
    let userId: String
    let reactionType: String
    var createdAt: Date?
}

// MARK: - Reply Reaction
struct ReplyReaction: Codable, Identifiable {
    let id: String
    let replyId: String
    let userId: String
    let reactionType: String
    var createdAt: Date?
}

// MARK: - Feedback
struct Feedback: Codable, Identifiable {
    let id: String
    let title: String
    let description: String
    let category: String
    let priority: String
    let authorId: String
    let authorName: String
    let status: String
    let upvotes: Int
    let downvotes: Int
    var reactions: [FeedbackReaction]?
    var comments: [FeedbackComment]?
    var createdAt: Date?
    var updatedAt: Date?
    
    var netVotes: Int {
        upvotes - downvotes
    }
    
    var statusEnum: FeedbackStatus? {
        FeedbackStatus(rawValue: status)
    }
}

// MARK: - Feedback Reaction
struct FeedbackReaction: Codable, Identifiable {
    let id: String
    let feedbackId: String
    let userId: String
    let voteType: String
    var createdAt: Date?
}

// MARK: - Feedback Comment
struct FeedbackComment: Codable, Identifiable {
    let id: String
    let feedbackId: String
    let content: String
    let authorId: String
    let authorName: String
    var createdAt: Date?
}

// MARK: - Feedback Status
enum FeedbackStatus: String, CaseIterable, Codable {
    case submitted = "SUBMITTED"
    case underReview = "UNDER_REVIEW"
    case approved = "APPROVED"
    case implemented = "IMPLEMENTED"
    case rejected = "REJECTED"
    
    var displayName: String {
        switch self {
        case .submitted: return "Submitted"
        case .underReview: return "Under Review"
        case .approved: return "Approved"
        case .implemented: return "Implemented"
        case .rejected: return "Rejected"
        }
    }
}

// MARK: - Feedback Category
enum FeedbackCategory: String, CaseIterable, Codable, Identifiable {
    case feature = "FEATURE"
    case improvement = "IMPROVEMENT"
    case bug = "BUG"
    case process = "PROCESS"
    
    var id: String { rawValue }
    
    var displayName: String {
        rawValue.capitalized
    }
    
    var iconName: String {
        switch self {
        case .feature: return "star"
        case .improvement: return "arrow.up.circle"
        case .bug: return "ladybug"
        case .process: return "gearshape.2"
        }
    }
}

// MARK: - Reaction Type
enum ReactionType: String, CaseIterable, Codable {
    case like = "LIKE"
    case love = "LOVE"
    case helpful = "HELPFUL"
    case insightful = "INSIGHTFUL"
    
    var displayName: String {
        rawValue.capitalized
    }
    
    var emoji: String {
        switch self {
        case .like: return "👍"
        case .love: return "❤️"
        case .helpful: return "🙏"
        case .insightful: return "💡"
        }
    }
}

// MARK: - Create Discussion Request
struct CreateDiscussionRequest: Codable {
    let title: String
    let content: String
    var category: String?
}

// MARK: - Create Reply Request
struct CreateReplyRequest: Codable {
    let content: String
    var parentId: String?
}

// MARK: - Create Feedback Request
struct CreateFeedbackRequest: Codable {
    let title: String
    let description: String
    let category: String
    let priority: String
}
