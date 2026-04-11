// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "MaintenanceNative",
    platforms: [
        .macOS(.v14),
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "MaintenanceNative",
            targets: ["MaintenanceNative"]
        )
    ],
    targets: [
        .target(
            name: "MaintenanceNative",
            path: "MaintenanceApp",
            exclude: [
                "App",
                "Core/Models/Asset.swift",
                "Core/Models/Calibration.swift",
                "Core/Models/Collaboration.swift",
                "Core/Models/Energy.swift",
                "Core/Models/Equipment.swift",
                "Core/Models/MOH.swift",
                "Core/Models/MRP.swift",
                "Core/Models/Maintenance.swift",
                "Core/Models/Procurement.swift",
                "Core/Models/Report.swift",
                "Core/Models/Training.swift",
                "Core/Network/APIClient.swift",
                "Core/Network/NetworkMonitor.swift",
                "Core/Network/QUICK_START_GUIDE.md",
                "Core/Storage",
                "Core/Utilities/Models.swift",
                "Features",
                "Resources",
                "SharedComponents"
            ],
            sources: [
                "Core/Models/Organization.swift",
                "Core/Models/User.swift",
                "Core/Models/Workshop.swift",
                "Core/Network/APIEndpoints.swift",
                "Core/Utilities/AnyCodable.swift",
                "Core/Utilities/Constants.swift"
            ]
        ),
        .testTarget(
            name: "MaintenanceNativeTests",
            dependencies: ["MaintenanceNative"]
        )
    ]
)
