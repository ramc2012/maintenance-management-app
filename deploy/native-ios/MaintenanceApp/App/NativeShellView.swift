import SwiftUI

struct NativeShellView: View {
    private let importedAreas: [ImportedArea] = [
        .init(name: "Core Models", status: "Imported", detail: "Shared models and networking sources are preserved in the repo."),
        .init(name: "Manuals Feature", status: "Live", detail: "The first imported feature is wired into the app target and ready for simulator testing."),
        .init(name: "SwiftUI Features", status: "Imported", detail: "Remaining feature screens are preserved under MaintenanceApp/Features for gradual reactivation."),
        .init(name: "Xcode Workspace", status: "Imported", detail: "Original shared workspace is kept alongside the generated project."),
        .init(name: "CLI Tests", status: "Passing", detail: "swift test passes for the native core package harness.")
    ]

    var body: some View {
        NavigationStack {
            List {
                Section("Native Module") {
                    Text("The Xcode module has been adopted into the active repo.")
                    Text("This native shell remains the stable entry point while imported screens are reattached one by one.")
                        .foregroundStyle(.secondary)
                }

                Section("Live Features") {
                    NavigationLink {
                        ManualsHubView()
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Manuals & Drawings")
                                .font(.headline)

                            Text("Read-only repository links with on-device download and local delete controls for mobile-only cache management.")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }

                    NavigationLink {
                        TrainingHubView()
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Training")
                                .font(.headline)

                            Text("Dashboard, records, and local training entry flow re-enabled inside the native app target.")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }

                    NavigationLink {
                        CollaborationHubView()
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Collaboration")
                                .font(.headline)

                            Text("Discussions and feedback boards are re-enabled with local native seed data and posting flows.")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }

                    NavigationLink {
                        ReportsHubView()
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Reports")
                                .font(.headline)

                            Text("Daily logs, offline queue simulation, and sync-state reporting are re-enabled natively.")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
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
                    Text("1. Re-enable the next feature folder in the Xcode target.")
                    Text("2. Fix its iOS-specific compile issues in isolation.")
                    Text("3. Add native tests as each feature becomes stable.")
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

private struct ImportedArea: Identifiable {
    let id = UUID()
    let name: String
    let status: String
    let detail: String
}
