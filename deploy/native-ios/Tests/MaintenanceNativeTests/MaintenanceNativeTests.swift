import XCTest
@testable import MaintenanceNative

final class MaintenanceNativeTests: XCTestCase {
    func testAPIEndpointBuildsExpectedPaths() {
        XCTAssertEqual(APIEndpoint.login.path, "/auth/login")
        XCTAssertEqual(APIEndpoint.workOrderDetail(id: "42").path, "/workorders/42")
        XCTAssertEqual(APIEndpoint.pmsHealth.path, "/pms/health")
    }

    func testBudgetSummaryUtilizationPercentage() {
        let summary = BudgetSummary(
            category: ProcurementCategory.services.rawValue,
            totalBudget: 200,
            utilized: 50,
            available: 150
        )

        XCTAssertEqual(summary.utilizationPercentage, 25, accuracy: 0.001)
    }

    func testWorkshopStatusDisplayName() {
        XCTAssertEqual(JobStatus.inProgress.displayName, "In Progress")
    }

    func testAnyCodableRoundTripsDictionaryPayload() throws {
        let payload = AnyCodable([
            "name": "Pump A",
            "active": true,
            "count": 3,
            "ratio": 1.5
        ])

        let data = try JSONEncoder().encode(payload)
        let decoded = try JSONDecoder().decode(AnyCodable.self, from: data)

        guard let dictionary = decoded.value as? [String: Any] else {
            return XCTFail("Expected decoded dictionary payload")
        }

        XCTAssertEqual(dictionary["name"] as? String, "Pump A")
        XCTAssertEqual(dictionary["active"] as? Bool, true)
        XCTAssertEqual(dictionary["count"] as? Int, 3)
        XCTAssertNotNil(dictionary["ratio"] as? Double)
        XCTAssertEqual((dictionary["ratio"] as? Double) ?? 0, 1.5, accuracy: 0.001)
    }
}
