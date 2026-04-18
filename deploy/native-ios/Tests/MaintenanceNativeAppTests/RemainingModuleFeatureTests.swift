import XCTest
@testable import MaintenanceNativeApp

final class RemainingModuleFeatureTests: XCTestCase {
    @MainActor
    func testNativeAppSessionSignsInAndOut() {
        let session = NativeAppSession()
        session.signOut()

        session.signIn(email: "ram@example.com", password: "secret", persistSession: false)
        XCTAssertTrue(session.isAuthenticated)
        XCTAssertEqual(session.email, "ram@example.com")
        XCTAssertEqual(session.displayName, "Ram")
        XCTAssertFalse(session.shouldPersistSession)

        session.signOut()
        XCTAssertFalse(session.isAuthenticated)
    }

    @MainActor
    func testEnterpriseHubLoadsMetricsAndModules() {
        let viewModel = EnterpriseHubViewModel()
        viewModel.load()

        XCTAssertEqual(viewModel.metrics.count, 4)
        XCTAssertGreaterThanOrEqual(viewModel.modules.count, 6)
    }

    @MainActor
    func testAssetsViewModelLoadsLocalAssetData() {
        let viewModel = AssetsViewModel()
        viewModel.load()

        XCTAssertEqual(viewModel.hierarchy.count, 3)
        XCTAssertEqual(viewModel.equipment.count, 3)
        XCTAssertEqual(viewModel.workOrders.count, 3)
        XCTAssertEqual(viewModel.meters.count, 3)
    }

    @MainActor
    func testLogbookViewModelLoadsEntriesForEachCategory() {
        let viewModel = LogbookViewModel()
        viewModel.load()

        XCTAssertEqual(viewModel.entries(for: .mechanical).count, 2)
        XCTAssertEqual(viewModel.entries(for: .electrical).count, 2)
        XCTAssertEqual(viewModel.entries(for: .process).count, 2)
    }

    @MainActor
    func testWorkshopViewModelAddsNativeJob() {
        let viewModel = WorkshopLocalViewModel()
        viewModel.load()

        let initialCount = viewModel.jobs(for: .all).count
        viewModel.addJob(title: "Test native workshop job", shop: .machine)

        XCTAssertEqual(viewModel.jobs(for: .all).count, initialCount + 1)
        XCTAssertEqual(viewModel.jobs(for: .machine).first?.title, "Test native workshop job")
    }

    @MainActor
    func testCalibrationViewModelLoadsRecordsAndStandards() {
        let viewModel = CalibrationLocalViewModel()
        viewModel.load()

        XCTAssertEqual(viewModel.records.count, 3)
        XCTAssertEqual(viewModel.standards.count, 3)
        XCTAssertEqual(viewModel.upcomingRecords.count, 3)
    }

    @MainActor
    func testEnergyViewModelLoadsLogsAndBills() {
        let viewModel = EnergyLocalViewModel()
        viewModel.load()

        XCTAssertEqual(viewModel.dailyLogs.count, 3)
        XCTAssertEqual(viewModel.bills.count, 3)
        XCTAssertEqual(viewModel.metrics.count, 3)
    }

    @MainActor
    func testMOHViewModelLoadsWindows() {
        let viewModel = MOHLocalViewModel()
        viewModel.load()

        XCTAssertEqual(viewModel.criticalItems.count, 2)
        XCTAssertEqual(viewModel.upcomingWindows.count, 2)
    }

    @MainActor
    func testMRPViewModelAddsDraft() {
        let viewModel = MRPLocalViewModel()
        viewModel.load()

        let initialCount = viewModel.drafts.count
        viewModel.addDraft(title: "Native draft request")

        XCTAssertEqual(viewModel.drafts.count, initialCount + 1)
        XCTAssertEqual(viewModel.drafts.first?.title, "Native draft request")
    }

    @MainActor
    func testProcurementViewModelLoadsDashboardData() {
        let viewModel = ProcurementLocalViewModel()
        viewModel.load()

        XCTAssertEqual(viewModel.cases.count, 3)
        XCTAssertEqual(viewModel.budgetLines.count, 3)
        XCTAssertEqual(viewModel.orgUnits.count, 3)
    }

    @MainActor
    func testSettingsViewModelLoadsDefaults() {
        let suiteName = "RemainingModuleFeatureTests.Settings.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        let viewModel = SettingsLocalViewModel(userDefaults: defaults)

        viewModel.load()

        XCTAssertEqual(viewModel.theme, .system)
        XCTAssertEqual(viewModel.accent, .teal)
        XCTAssertEqual(viewModel.cacheSizeText, "0 MB")

        defaults.removePersistentDomain(forName: suiteName)
    }

    @MainActor
    func testUserManagementViewModelLoadsUsersAndRoles() {
        let viewModel = UserManagementViewModel()
        viewModel.load()

        XCTAssertEqual(viewModel.users.count, 3)
        XCTAssertEqual(viewModel.roles.count, 3)
        XCTAssertEqual(viewModel.metrics.count, 3)
    }
}
