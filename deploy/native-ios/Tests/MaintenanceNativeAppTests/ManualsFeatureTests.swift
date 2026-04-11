import XCTest
@testable import MaintenanceNativeApp

final class ManualsFeatureTests: XCTestCase {
    override func setUp() {
        super.setUp()
        clearManualDownloads()
    }

    override func tearDown() {
        clearManualDownloads()
        super.tearDown()
    }

    @MainActor
    func testManualCatalogLoadsReadOnlyRepositoryLinks() throws {
        let viewModel = ManualsViewModel()

        viewModel.loadFolders(for: .mechanical)

        XCTAssertGreaterThanOrEqual(viewModel.folders.count, 2)
        XCTAssertEqual(viewModel.folders.first?.name, "Compressors")
        XCTAssertEqual(viewModel.documentCount, 3)

        let folder = try XCTUnwrap(viewModel.folders.first)
        viewModel.navigateToFolder(folder)

        let document = try XCTUnwrap(viewModel.documents.first)
        XCTAssertEqual(document.name, "Compressor Operation Manual")
        XCTAssertEqual(document.remoteURL, "https://maintenance.example.com/manuals/mechanical/compressor-operation-manual.pdf")
        XCTAssertFalse(document.isDownloaded)
        XCTAssertNil(document.localPath)
    }

    @MainActor
    func testRemovingDownloadDeletesOnlyLocalCopy() throws {
        let viewModel = ManualsViewModel()
        viewModel.loadFolders(for: .mechanical)

        let folder = try XCTUnwrap(viewModel.folders.first)
        viewModel.navigateToFolder(folder)

        let document = try XCTUnwrap(viewModel.documents.first)
        viewModel.downloadDocument(document)

        let downloadedDocument = try XCTUnwrap(viewModel.documents.first(where: { $0.id == document.id }))
        let localPath = try XCTUnwrap(downloadedDocument.localPath)
        XCTAssertTrue(downloadedDocument.isDownloaded)
        XCTAssertTrue(FileManager.default.fileExists(atPath: localPath))

        viewModel.removeLocalCopy(for: downloadedDocument)

        let linkOnlyDocument = try XCTUnwrap(viewModel.documents.first(where: { $0.id == document.id }))
        XCTAssertFalse(linkOnlyDocument.isDownloaded)
        XCTAssertNil(linkOnlyDocument.localPath)
        XCTAssertEqual(linkOnlyDocument.remoteURL, document.remoteURL)
        XCTAssertEqual(viewModel.documents.count, folder.documents.count)
        XCTAssertFalse(FileManager.default.fileExists(atPath: localPath))
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

    @MainActor
    func testReportsViewModelLoadsSeededAndPendingReports() async {
        UserDefaults.standard.removeObject(forKey: "native_reports_records")

        let viewModel = ReportsViewModel()
        await viewModel.loadReports(period: .daily)

        XCTAssertGreaterThanOrEqual(viewModel.reports.count, 2)
        XCTAssertEqual(viewModel.pendingCount, 1)
        XCTAssertTrue(viewModel.reports.contains(where: { $0.syncStatus == .pending }))
    }

    private func clearManualDownloads() {
        UserDefaults.standard.removeObject(forKey: ManualsViewModel.downloadStateStorageKey)

        guard let cacheDirectory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first else {
            return
        }

        let downloadDirectory = cacheDirectory.appendingPathComponent(
            ManualsViewModel.downloadCacheDirectoryName,
            isDirectory: true
        )
        try? FileManager.default.removeItem(at: downloadDirectory)
    }
}
