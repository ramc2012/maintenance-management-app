import SwiftUI

struct NativeShellView: View {
    private let importedAreas: [ImportedArea] = [
        .init(name: "Core Models", status: "Imported", detail: "Shared models and networking sources are preserved in the repo."),
        .init(name: "Native Modules", status: "Live", detail: "Manuals, training, reports, operations, and admin modules now run as local-first native slices."),
        .init(name: "SwiftUI Features", status: "Imported", detail: "Original feature screens remain preserved under MaintenanceApp/Features while local replacements keep the app stable."),
        .init(name: "Xcode Workspace", status: "Imported", detail: "Original shared workspace is kept alongside the generated project."),
        .init(name: "CLI Tests", status: "Passing", detail: "swift test passes for the native core package harness.")
    ]

    var body: some View {
        NavigationStack {
            List {
                Section("Native Module") {
                    Text("The Xcode module has been adopted into the active repo.")
                    Text("This native shell is now the launcher for the local-first native module set while the imported code stays preserved on disk.")
                        .foregroundStyle(.secondary)
                }

                Section("Operations") {
                    NavigationLink {
                        EnterpriseHubView()
                    } label: {
                        ModuleLinkRow(
                            title: "Enterprise Hub",
                            description: "Operational dashboard summarizing module health, queue state, and current rollout status."
                        )
                    }

                    NavigationLink {
                        AssetsHubView()
                    } label: {
                        ModuleLinkRow(
                            title: "Assets",
                            description: "Hierarchy, equipment register, linked work orders, and meter snapshots are available natively."
                        )
                    }

                    NavigationLink {
                        ManualsHubView()
                    } label: {
                        ModuleLinkRow(
                            title: "Manuals & Drawings",
                            description: "Read-only repository links with on-device download and local delete controls for mobile-only cache management."
                        )
                    }

                    NavigationLink {
                        LogbookHubView()
                    } label: {
                        ModuleLinkRow(
                            title: "Logbook",
                            description: "Mechanical, electrical, and process shift entries are available as a native local logbook."
                        )
                    }

                    NavigationLink {
                        WorkshopHubView()
                    } label: {
                        ModuleLinkRow(
                            title: "Workshop",
                            description: "Shop filters, job stats, and native job intake are available offline."
                        )
                    }

                    NavigationLink {
                        CalibrationHubView()
                    } label: {
                        ModuleLinkRow(
                            title: "Calibration",
                            description: "Dashboard, recent calibration records, standards, and due items are re-enabled locally."
                        )
                    }

                    NavigationLink {
                        EnergyHubView()
                    } label: {
                        ModuleLinkRow(
                            title: "Energy",
                            description: "Energy dashboard, daily consumption logs, and monthly bill tracking are available natively."
                        )
                    }
                }

                Section("Planning & Reporting") {
                    NavigationLink {
                        TrainingHubView()
                    } label: {
                        ModuleLinkRow(
                            title: "Training",
                            description: "Dashboard, records, and local training entry flow are re-enabled inside the native app target."
                        )
                    }

                    NavigationLink {
                        CollaborationHubView()
                    } label: {
                        ModuleLinkRow(
                            title: "Collaboration",
                            description: "Discussions and feedback boards are re-enabled with local native seed data and posting flows."
                        )
                    }

                    NavigationLink {
                        ReportsHubView()
                    } label: {
                        ModuleLinkRow(
                            title: "Reports",
                            description: "Daily logs, offline queue simulation, and sync-state reporting are re-enabled natively."
                        )
                    }

                    NavigationLink {
                        MOHHubView()
                    } label: {
                        ModuleLinkRow(
                            title: "MOH",
                            description: "Maintenance opportunity planning now has native critical-window and upcoming-outage views."
                        )
                    }

                    NavigationLink {
                        MRPHubView()
                    } label: {
                        ModuleLinkRow(
                            title: "MRP",
                            description: "Requirement lines and draft purchase requisitions are available in local-first mode."
                        )
                    }

                    NavigationLink {
                        ProcurementHubView()
                    } label: {
                        ModuleLinkRow(
                            title: "Procurement",
                            description: "Case pipeline, budget lines, and org structure are re-enabled natively."
                        )
                    }
                }

                Section("Administration") {
                    NavigationLink {
                        UserManagementView()
                    } label: {
                        ModuleLinkRow(
                            title: "User Management",
                            description: "Native user list, role overview, and access-status summaries are available."
                        )
                    }

                    NavigationLink {
                        SettingsView()
                    } label: {
                        ModuleLinkRow(
                            title: "Settings",
                            description: "Theme, notifications, security, and device-cache controls are handled locally."
                        )
                    }
                }

                Section("Imported Areas") {
                    ForEach(importedAreas) { area in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text(area.name)
                                    .font(.headline)
                                Spacer()
                                Text(area.status)
                                    .font(.caption.weight(.semibold))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(badgeColor(for: area.status).opacity(0.15))
                                    .foregroundStyle(badgeColor(for: area.status))
                                    .clipShape(Capsule())
                            }

                            Text(area.detail)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                }

                Section("Next Steps") {
                    Text("1. Replace local data stores with shared services one module at a time.")
                    Text("2. Keep native tests expanding as each module gains real backend connectivity.")
                    Text("3. Preserve the imported feature sources until the full parity path is complete.")
                }
            }
            .navigationTitle("Maintenance Native")
        }
    }

    private func badgeColor(for status: String) -> Color {
        switch status {
        case "Passing":
            return .green
        case "Live":
            return .teal
        case "Imported":
            return .blue
        default:
            return .gray
        }
    }
}

private struct ModuleLinkRow: View {
    let title: String
    let description: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.headline)

            Text(description)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }
}

private struct ImportedArea: Identifiable {
    let id = UUID()
    let name: String
    let status: String
    let detail: String
}
