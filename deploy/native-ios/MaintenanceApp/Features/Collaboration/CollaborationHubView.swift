import SwiftUI
import Foundation

// MARK: - Collaboration Hub View
struct CollaborationHubView: View {
    @State private var selectedTab = 0
    
    var body: some View {
        VStack(spacing: 0) {
            Picker("View", selection: $selectedTab) {
                Text("Discussions").tag(0)
                Text("Feedback").tag(1)
            }
            .pickerStyle(.segmented)
            .padding()
            
            switch selectedTab {
            case 0:
                DiscussionForumView()
            case 1:
                FeedbackBoardView()
            default:
                EmptyView()
            }
        }
        .navigationTitle("Collaboration")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Discussion Forum View
struct DiscussionForumView: View {
    @StateObject private var viewModel = DiscussionViewModel()
    @State private var showingNewDiscussion = false
    @State private var searchText = ""
    
    var filteredDiscussions: [Discussion] {
        if searchText.isEmpty {
            return viewModel.discussions
        }
        return viewModel.discussions.filter {
            $0.title.localizedCaseInsensitiveContains(searchText) ||
            $0.content.localizedCaseInsensitiveContains(searchText)
        }
    }
    
    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.discussions.isEmpty {
                ProgressView("Loading discussions...")
            } else if viewModel.discussions.isEmpty {
                EmptyStateView(
                    title: "No Discussions",
                    message: "Start a discussion to collaborate with your team.",
                    iconName: "bubble.left.and.bubble.right"
                )
            } else {
                List {
                    // Pinned Discussions
                    let pinned = filteredDiscussions.filter { $0.isPinned }
                    if !pinned.isEmpty {
                        Section("Pinned") {
                            ForEach(pinned) { discussion in
                                NavigationLink {
                                    DiscussionDetailView(discussion: discussion)
                                } label: {
                                    DiscussionRow(discussion: discussion)
                                }
                            }
                        }
                    }
                    
                    // Regular Discussions
                    let regular = filteredDiscussions.filter { !$0.isPinned }
                    Section("Recent") {
                        ForEach(regular) { discussion in
                            NavigationLink {
                                DiscussionDetailView(discussion: discussion)
                            } label: {
                                DiscussionRow(discussion: discussion)
                            }
                        }
                    }
                }
                .listStyle(.insetGrouped)
                .searchable(text: $searchText, prompt: "Search discussions")
                .refreshable {
                    await viewModel.loadDiscussions()
                }
            }
        }
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    showingNewDiscussion = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showingNewDiscussion) {
            NavigationStack {
                NewDiscussionView()
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .discussionRecordsDidChange)) { _ in
            Task { await viewModel.loadDiscussions() }
        }
        .task {
            await viewModel.loadDiscussions()
        }
    }
}

// MARK: - Discussion Row
struct DiscussionRow: View {
    let discussion: Discussion
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                if discussion.isPinned {
                    Image(systemName: "pin.fill")
                        .foregroundColor(.orange)
                        .font(.caption)
                }
                
                Text(discussion.title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .lineLimit(1)
                
                Spacer()
                
                if discussion.isLocked {
                    Image(systemName: "lock.fill")
                        .foregroundColor(.secondary)
                        .font(.caption)
                }
            }
            
            Text(discussion.content)
                .font(.caption)
                .foregroundColor(.secondary)
                .lineLimit(2)
            
            HStack {
                Label(discussion.authorName, systemImage: "person.circle")
                
                Spacer()
                
                HStack(spacing: 12) {
                    Label("\(discussion.replies?.count ?? 0)", systemImage: "bubble.right")
                    Label("\(discussion.viewCount)", systemImage: "eye")
                }
            }
            .font(.caption2)
            .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Discussion Detail View
struct DiscussionDetailView: View {
    let discussion: Discussion
    @State private var replyText = ""
    
    var body: some View {
        VStack(spacing: 0) {
            List {
                // Original Post
                Section {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(discussion.title)
                            .font(.headline)
                        
                        Text(discussion.content)
                            .font(.body)
                        
                        HStack {
                            Label(discussion.authorName, systemImage: "person.circle.fill")
                            Spacer()
                            Text(discussion.createdAt?.formatted(date: .abbreviated, time: .shortened) ?? "Unknown")
                        }
                        .font(.caption)
                        .foregroundColor(.secondary)
                        
                        // Reactions
                        if let reactions = discussion.reactions, !reactions.isEmpty {
                            HStack(spacing: 8) {
                                ForEach(Array(Set(reactions.map { $0.reactionType })), id: \.self) { type in
                                    let count = reactions.filter { $0.reactionType == type }.count
                                    ReactionBadge(type: type, count: count)
                                }
                            }
                        }
                    }
                }
                
                // Replies
                if let replies = discussion.replies, !replies.isEmpty {
                    Section("Replies (\(replies.count))") {
                        ForEach(replies) { reply in
                            ReplyRow(reply: reply)
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            
            // Reply Input
            if !discussion.isLocked {
                HStack {
                    TextField("Write a reply...", text: $replyText)
                        .textFieldStyle(.roundedBorder)
                    
                    Button {
                        // Submit reply
                        replyText = ""
                    } label: {
                        Image(systemName: "paperplane.fill")
                    }
                    .disabled(replyText.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                .padding()
                .background(Color(.systemBackground))
            }
        }
        .navigationTitle("Discussion")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Reply Row
struct ReplyRow: View {
    let reply: DiscussionReply
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(reply.content)
                .font(.subheadline)
            
            HStack {
                Label(reply.authorName, systemImage: "person.circle")
                Spacer()
                Text(reply.createdAt?.formatted(date: .abbreviated, time: .shortened) ?? "Unknown")
            }
            .font(.caption2)
            .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Reaction Badge
struct ReactionBadge: View {
    let type: String
    let count: Int
    
    var emoji: String {
        switch type {
        case "LIKE": return "👍"
        case "LOVE": return "❤️"
        case "HELPFUL": return "🙏"
        case "INSIGHTFUL": return "💡"
        default: return "👍"
        }
    }
    
    var body: some View {
        HStack(spacing: 2) {
            Text(emoji)
            Text("\(count)")
        }
        .font(.caption)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
}

// MARK: - New Discussion View
struct NewDiscussionView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = NewDiscussionViewModel()
    @State private var showingSuccess = false
    
    var body: some View {
        Form {
            Section("Title") {
                TextField("Discussion title", text: $viewModel.title)
            }
            
            Section("Category") {
                Picker("Category", selection: $viewModel.category) {
                    Text("General").tag("GENERAL")
                    Text("Technical").tag("TECHNICAL")
                    Text("Safety").tag("SAFETY")
                    Text("Ideas").tag("IDEAS")
                }
            }
            
            Section("Content") {
                TextEditor(text: $viewModel.content)
                    .frame(minHeight: 150)
            }
        }
        .navigationTitle("New Discussion")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Post") {
                    Task {
                        await viewModel.post()
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
            Text("Discussion posted successfully!")
        }
    }
}

// MARK: - Feedback Board View
struct FeedbackBoardView: View {
    @StateObject private var viewModel = FeedbackViewModel()
    @State private var showingNewFeedback = false
    
    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.feedbacks.isEmpty {
                ProgressView("Loading feedback...")
            } else if viewModel.feedbacks.isEmpty {
                EmptyStateView(
                    title: "No Feedback",
                    message: "Submit feedback or ideas to improve our processes.",
                    iconName: "lightbulb"
                )
            } else {
                List(viewModel.feedbacks) { feedback in
                    NavigationLink {
                        FeedbackDetailView(feedback: feedback)
                    } label: {
                        FeedbackRow(feedback: feedback)
                    }
                }
                .listStyle(.plain)
                .refreshable {
                    await viewModel.loadFeedback()
                }
            }
        }
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    showingNewFeedback = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showingNewFeedback) {
            NavigationStack {
                NewFeedbackView()
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .feedbackRecordsDidChange)) { _ in
            Task { await viewModel.loadFeedback() }
        }
        .task {
            await viewModel.loadFeedback()
        }
    }
}

// MARK: - Feedback Row
struct FeedbackRow: View {
    let feedback: Feedback
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(feedback.title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .lineLimit(1)
                
                Spacer()
                
                StatusBadge(status: feedback.status)
            }
            
            Text(feedback.description)
                .font(.caption)
                .foregroundColor(.secondary)
                .lineLimit(2)
            
            HStack {
                // Category
                Text(feedback.category)
                    .font(.caption2)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(categoryColor(feedback.category).opacity(0.2))
                    .foregroundColor(categoryColor(feedback.category))
                    .cornerRadius(4)
                
                Spacer()
                
                // Votes
                HStack(spacing: 8) {
                    HStack(spacing: 2) {
                        Image(systemName: "arrow.up")
                        Text("\(feedback.upvotes)")
                    }
                    .foregroundColor(.green)
                    
                    HStack(spacing: 2) {
                        Image(systemName: "arrow.down")
                        Text("\(feedback.downvotes)")
                    }
                    .foregroundColor(.red)
                }
                .font(.caption)
            }
        }
        .padding(.vertical, 4)
    }
    
    private func categoryColor(_ category: String) -> Color {
        switch category {
        case "FEATURE": return .blue
        case "IMPROVEMENT": return .green
        case "BUG": return .red
        case "PROCESS": return .orange
        default: return .gray
        }
    }
}

// MARK: - Feedback Detail View
struct FeedbackDetailView: View {
    let feedback: Feedback
    @State private var commentText = ""
    
    var body: some View {
        VStack(spacing: 0) {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text(feedback.category)
                                .font(.caption)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.accentColor.opacity(0.2))
                                .cornerRadius(4)
                            
                            Spacer()
                            
                            StatusBadge(status: feedback.status)
                        }
                        
                        Text(feedback.title)
                            .font(.headline)
                        
                        Text(feedback.description)
                            .font(.body)
                        
                        HStack {
                            Label(feedback.authorName, systemImage: "person.circle.fill")
                            Spacer()
                            Text(feedback.createdAt?.formatted(date: .abbreviated, time: .shortened) ?? "Unknown")
                        }
                        .font(.caption)
                        .foregroundColor(.secondary)
                        
                        // Vote buttons
                        HStack(spacing: 20) {
                            Button {
                                // Upvote
                            } label: {
                                HStack {
                                    Image(systemName: "arrow.up.circle.fill")
                                    Text("\(feedback.upvotes)")
                                }
                                .foregroundColor(.green)
                            }
                            
                            Button {
                                // Downvote
                            } label: {
                                HStack {
                                    Image(systemName: "arrow.down.circle.fill")
                                    Text("\(feedback.downvotes)")
                                }
                                .foregroundColor(.red)
                            }
                            
                            Spacer()
                        }
                        .font(.subheadline)
                    }
                }
                
                // Comments
                if let comments = feedback.comments, !comments.isEmpty {
                    Section("Comments (\(comments.count))") {
                        ForEach(comments) { comment in
                            FeedbackCommentRow(comment: comment)
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            
            // Comment Input
            HStack {
                TextField("Add a comment...", text: $commentText)
                    .textFieldStyle(.roundedBorder)
                
                Button {
                    // Submit comment
                    commentText = ""
                } label: {
                    Image(systemName: "paperplane.fill")
                }
                .disabled(commentText.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .padding()
            .background(Color(.systemBackground))
        }
        .navigationTitle("Feedback")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Feedback Comment Row
struct FeedbackCommentRow: View {
    let comment: FeedbackComment
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(comment.content)
                .font(.subheadline)
            
            HStack {
                Label(comment.authorName, systemImage: "person.circle")
                Spacer()
                Text(comment.createdAt?.formatted(date: .abbreviated, time: .shortened) ?? "Unknown")
            }
            .font(.caption2)
            .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - New Feedback View
struct NewFeedbackView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = NewFeedbackViewModel()
    @State private var showingSuccess = false
    
    var body: some View {
        Form {
            Section("Title") {
                TextField("Feedback title", text: $viewModel.title)
            }
            
            Section("Category") {
                Picker("Category", selection: $viewModel.category) {
                    Text("Feature Request").tag("FEATURE")
                    Text("Improvement").tag("IMPROVEMENT")
                    Text("Bug Report").tag("BUG")
                    Text("Process").tag("PROCESS")
                }
            }
            
            Section("Priority") {
                Picker("Priority", selection: $viewModel.priority) {
                    Text("Low").tag("LOW")
                    Text("Normal").tag("NORMAL")
                    Text("High").tag("HIGH")
                }
                .pickerStyle(.segmented)
            }
            
            Section("Description") {
                TextEditor(text: $viewModel.description)
                    .frame(minHeight: 150)
            }
        }
        .navigationTitle("Submit Feedback")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Submit") {
                    Task {
                        await viewModel.submit()
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
            Text("Feedback submitted successfully!")
        }
    }
}

// MARK: - ViewModels
@MainActor
class DiscussionViewModel: ObservableObject {
    @Published var discussions: [Discussion] = []
    @Published var isLoading = false

    func loadDiscussions() async {
        isLoading = true
        discussions = LocalCollaborationStore.shared.loadDiscussions()
        isLoading = false
    }
}

@MainActor
class NewDiscussionViewModel: ObservableObject {
    @Published var title = ""
    @Published var category = "GENERAL"
    @Published var content = ""
    @Published var isLoading = false
    @Published var error: String?
    
    var isValid: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty &&
        !content.trimmingCharacters(in: .whitespaces).isEmpty
    }
    
    func post() async {
        isLoading = true
        error = nil

        let discussion = Discussion(
            id: UUID().uuidString,
            title: title.trimmingCharacters(in: .whitespacesAndNewlines),
            content: content.trimmingCharacters(in: .whitespacesAndNewlines),
            category: category,
            authorId: "native-user",
            authorName: "Native User",
            isPinned: false,
            isLocked: false,
            viewCount: 0,
            replies: [],
            reactions: [],
            createdAt: Date(),
            updatedAt: Date()
        )

        LocalCollaborationStore.shared.save(discussion: discussion)
        NotificationCenter.default.post(name: .discussionRecordsDidChange, object: nil)
        isLoading = false
    }
}

@MainActor
class FeedbackViewModel: ObservableObject {
    @Published var feedbacks: [Feedback] = []
    @Published var isLoading = false

    func loadFeedback() async {
        isLoading = true
        feedbacks = LocalCollaborationStore.shared.loadFeedback()
        isLoading = false
    }
}

@MainActor
class NewFeedbackViewModel: ObservableObject {
    @Published var title = ""
    @Published var category = "FEATURE"
    @Published var priority = "NORMAL"
    @Published var description = ""
    @Published var isLoading = false
    @Published var error: String?
    
    var isValid: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty &&
        !description.trimmingCharacters(in: .whitespaces).isEmpty
    }
    
    func submit() async {
        isLoading = true
        error = nil

        let feedback = Feedback(
            id: UUID().uuidString,
            title: title.trimmingCharacters(in: .whitespacesAndNewlines),
            description: description.trimmingCharacters(in: .whitespacesAndNewlines),
            category: category,
            priority: priority,
            authorId: "native-user",
            authorName: "Native User",
            status: "SUBMITTED",
            upvotes: 0,
            downvotes: 0,
            reactions: [],
            comments: [],
            createdAt: Date(),
            updatedAt: Date()
        )

        LocalCollaborationStore.shared.save(feedback: feedback)
        NotificationCenter.default.post(name: .feedbackRecordsDidChange, object: nil)
        isLoading = false
    }
}

private final class LocalCollaborationStore {
    static let shared = LocalCollaborationStore()

    private let discussionsKey = "native_collaboration_discussions"
    private let feedbackKey = "native_collaboration_feedback"
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private init() {
        decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
    }

    func loadDiscussions() -> [Discussion] {
        if let data = UserDefaults.standard.data(forKey: discussionsKey),
           let discussions = try? decoder.decode([Discussion].self, from: data) {
            return sortDiscussions(discussions)
        }

        let seeded = seedDiscussions()
        persist(discussions: seeded)
        return sortDiscussions(seeded)
    }

    func save(discussion: Discussion) {
        var discussions = loadDiscussions()
        discussions.insert(discussion, at: 0)
        persist(discussions: discussions)
    }

    func loadFeedback() -> [Feedback] {
        if let data = UserDefaults.standard.data(forKey: feedbackKey),
           let feedback = try? decoder.decode([Feedback].self, from: data) {
            return sortFeedback(feedback)
        }

        let seeded = seedFeedback()
        persist(feedback: seeded)
        return sortFeedback(seeded)
    }

    func save(feedback: Feedback) {
        var entries = loadFeedback()
        entries.insert(feedback, at: 0)
        persist(feedback: entries)
    }

    private func persist(discussions: [Discussion]) {
        if let data = try? encoder.encode(discussions) {
            UserDefaults.standard.set(data, forKey: discussionsKey)
        }
    }

    private func persist(feedback: [Feedback]) {
        if let data = try? encoder.encode(feedback) {
            UserDefaults.standard.set(data, forKey: feedbackKey)
        }
    }

    private func sortDiscussions(_ discussions: [Discussion]) -> [Discussion] {
        discussions.sorted { ($0.createdAt ?? .distantPast) > ($1.createdAt ?? .distantPast) }
    }

    private func sortFeedback(_ feedback: [Feedback]) -> [Feedback] {
        feedback.sorted { ($0.createdAt ?? .distantPast) > ($1.createdAt ?? .distantPast) }
    }

    private func seedDiscussions() -> [Discussion] {
        let now = Date()
        return [
            Discussion(
                id: UUID().uuidString,
                title: "Seal Water Leakage Pattern",
                content: "Observed repeat leakage during second shift. Sharing photos and asking whether we standardize the gasket replacement interval.",
                category: "TECHNICAL",
                authorId: "seed-1",
                authorName: "Sathish",
                isPinned: true,
                isLocked: false,
                viewCount: 23,
                replies: [
                    DiscussionReply(
                        id: UUID().uuidString,
                        discussionId: "seed-discussion-1",
                        parentId: nil,
                        content: "We should compare it against the last PM closure notes before changing the interval.",
                        authorId: "seed-2",
                        authorName: "Naveen",
                        reactions: [],
                        createdAt: now.addingTimeInterval(-3600),
                        updatedAt: now.addingTimeInterval(-3600)
                    )
                ],
                reactions: [
                    DiscussionReaction(id: UUID().uuidString, discussionId: "seed-discussion-1", userId: "seed-3", reactionType: "INSIGHTFUL", createdAt: now.addingTimeInterval(-1800))
                ],
                createdAt: now.addingTimeInterval(-7200),
                updatedAt: now.addingTimeInterval(-1800)
            ),
            Discussion(
                id: UUID().uuidString,
                title: "Toolbox Talk Topics for Next Week",
                content: "Need ideas for a focused 10-minute safety talk before shutdown preparation.",
                category: "SAFETY",
                authorId: "seed-4",
                authorName: "Priya",
                isPinned: false,
                isLocked: false,
                viewCount: 11,
                replies: [],
                reactions: [],
                createdAt: now.addingTimeInterval(-14400),
                updatedAt: now.addingTimeInterval(-14400)
            )
        ]
    }

    private func seedFeedback() -> [Feedback] {
        let now = Date()
        return [
            Feedback(
                id: UUID().uuidString,
                title: "Auto-fill permit metadata",
                description: "When a job is picked from the weekly plan, permit fields should prefill department and equipment.",
                category: "IMPROVEMENT",
                priority: "HIGH",
                authorId: "seed-5",
                authorName: "Harish",
                status: "UNDER_REVIEW",
                upvotes: 14,
                downvotes: 1,
                reactions: [],
                comments: [
                    FeedbackComment(
                        id: UUID().uuidString,
                        feedbackId: "seed-feedback-1",
                        content: "This would remove repeated data entry during breakdown calls.",
                        authorId: "seed-6",
                        authorName: "Deepa",
                        createdAt: now.addingTimeInterval(-4000)
                    )
                ],
                createdAt: now.addingTimeInterval(-86000),
                updatedAt: now.addingTimeInterval(-4000)
            ),
            Feedback(
                id: UUID().uuidString,
                title: "Add mobile checklist export",
                description: "Checklist supervisors need a shareable PDF export straight from the native app.",
                category: "FEATURE",
                priority: "NORMAL",
                authorId: "seed-7",
                authorName: "Karthik",
                status: "SUBMITTED",
                upvotes: 8,
                downvotes: 0,
                reactions: [],
                comments: [],
                createdAt: now.addingTimeInterval(-172000),
                updatedAt: now.addingTimeInterval(-172000)
            )
        ]
    }
}

extension Notification.Name {
    static let discussionRecordsDidChange = Notification.Name("discussionRecordsDidChange")
    static let feedbackRecordsDidChange = Notification.Name("feedbackRecordsDidChange")
}

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
}

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

struct DiscussionReaction: Codable, Identifiable {
    let id: String
    let discussionId: String
    let userId: String
    let reactionType: String
    var createdAt: Date?
}

struct ReplyReaction: Codable, Identifiable {
    let id: String
    let replyId: String
    let userId: String
    let reactionType: String
    var createdAt: Date?
}

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
}

struct FeedbackReaction: Codable, Identifiable {
    let id: String
    let feedbackId: String
    let userId: String
    let voteType: String
    var createdAt: Date?
}

struct FeedbackComment: Codable, Identifiable {
    let id: String
    let feedbackId: String
    let content: String
    let authorId: String
    let authorName: String
    var createdAt: Date?
}

#Preview {
    NavigationStack {
        CollaborationHubView()
    }
}
