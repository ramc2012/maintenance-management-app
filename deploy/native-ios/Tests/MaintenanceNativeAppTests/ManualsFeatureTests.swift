import XCTest
@testable import MaintenanceNativeApp

final class ManualsFeatureTests: XCTestCase {
    override func setUp() {
        super.setUp()
        UserDefaults.standard.removeObject(forKey: "manual_folders")
    }

    override func tearDown() {
        UserDefaults.standard.removeObject(forKey: "manual_folders")
        super.tearDown()
    }

    @MainActor
    func testCreateFolderPersistsForSelectedCategory() {
        let viewModel = ManualsViewModel()

        viewModel.createFolder(name: "Boiler Manuals", category: .mechanical)
        viewModel.loadFolders(for: .mechanical)

        XCTAssertEqual(viewModel.folders.count, 1)
        XCTAssertEqual(viewModel.folders.first?.name, "Boiler Manuals")
        XCTAssertEqual(viewModel.documentCount, 0)
    }

    func testManualCategoryMetadataMatchesExpectedIcons() {
        XCTAssertEqual(ManualCategory.mechanical.iconName, "gearshape.2.fill")
        XCTAssertEqual(ManualCategory.electrical.iconName, "bolt.fill")
        XCTAssertEqual(ManualCategory.instrumentation.iconName, "dial.medium.fill")
    }

    @MainActor
    func testTrainingViewModelLoadsSeededRecords() async {
        UserDefaults.standard.removeObject(forKey: "native_training_records")

        let viewModel = TrainingViewModel()
        await viewModel.loadRecords()

        XCTAssertGreaterThanOrEqual(viewModel.records.count, 2)
        XCTAssertEqual(viewModel.scheduledCount, 1)
        XCTAssertEqual(viewModel.completedCount, 1)
    }

    @MainActor
    func testCollaborationViewModelsLoadSeedData() async {
        UserDefaults.standard.removeObject(forKey: "native_collaboration_discussions")
        UserDefaults.standard.removeObject(forKey: "native_collaboration_feedback")

        let discussionViewModel = DiscussionViewModel()
        await discussionViewModel.loadDiscussions()

        let feedbackViewModel = FeedbackViewModel()
        await feedbackViewModel.loadFeedback()

        XCTAssertGreaterThanOrEqual(discussionViewModel.discussions.count, 2)
        XCTAssertTrue(discussionViewModel.discussions.contains(where: { $0.isPinned }))
        XCTAssertGreaterThanOrEqual(feedbackViewModel.feedbacks.count, 2)
        XCTAssertTrue(feedbackViewModel.feedbacks.contains(where: { $0.status == "UNDER_REVIEW" }))
    }
}
