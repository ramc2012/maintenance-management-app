import SwiftUI

// MARK: - Module Item
struct ModuleItem: Identifiable {
    let id = UUID()
    let title: String
    let subtitle: String
    let iconName: String
    let gradientColors: [Color]
    let destination: AnyView
}

// MARK: - Enterprise Hub View
struct EnterpriseHubView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var networkMonitor: NetworkMonitor
    
    private let columns = [
        GridItem(.adaptive(minimum: 150, maximum: 200), spacing: 16)
    ]
    
    private var modules: [ModuleItem] {
        [
            ModuleItem(
                title: "Assets",
                subtitle: "Equipment & Hierarchy",
                iconName: "cube.box.fill",
                gradientColors: [.blue, .cyan],
                destination: AnyView(AssetsHubView())
            ),
            ModuleItem(
                title: "Logbook",
                subtitle: "Maintenance Logs",
                iconName: "book.fill",
                gradientColors: [.green, .mint],
                destination: AnyView(LogbookHubView())
            ),
            ModuleItem(
                title: "Procurement",
                subtitle: "Cases & Budget",
                iconName: "cart.fill",
                gradientColors: [.orange, .yellow],
                destination: AnyView(ProcurementHubView())
            ),
            ModuleItem(
                title: "Calibration",
                subtitle: "Instrument Calibration",
                iconName: "dial.medium.fill",
                gradientColors: [.purple, .pink],
                destination: AnyView(CalibrationHubView())
            ),
            ModuleItem(
                title: "Workshop",
                subtitle: "Job Tracking",
                iconName: "wrench.fill",
                gradientColors: [.red, .orange],
                destination: AnyView(WorkshopHubView())
            ),
            ModuleItem(
                title: "Training",
                subtitle: "Training Records",
                iconName: "graduationcap.fill",
                gradientColors: [.indigo, .blue],
                destination: AnyView(TrainingHubView())
            ),
            ModuleItem(
                title: "MOH",
                subtitle: "Major Overhaul",
                iconName: "gearshape.2.fill",
                gradientColors: [.teal, .green],
                destination: AnyView(MOHHubView())
            ),
            ModuleItem(
                title: "Energy",
                subtitle: "Energy Dashboard",
                iconName: "bolt.fill",
                gradientColors: [.yellow, .orange],
                destination: AnyView(EnergyHubView())
            ),
            ModuleItem(
                title: "Reports",
                subtitle: "Daily Reports",
                iconName: "chart.bar.doc.horizontal.fill",
                gradientColors: [.cyan, .blue],
                destination: AnyView(ReportsHubView())
            ),
            ModuleItem(
                title: "Collaboration",
                subtitle: "Discussions & Ideas",
                iconName: "bubble.left.and.bubble.right.fill",
                gradientColors: [.pink, .purple],
                destination: AnyView(CollaborationHubView())
            ),
            ModuleItem(
                title: "MRP",
                subtitle: "Material Planning",
                iconName: "shippingbox.fill",
                gradientColors: [.brown, .orange],
                destination: AnyView(MRPHubView())
            ),
            ModuleItem(
                title: "Manuals",
                subtitle: "Documents & Drawings",
                iconName: "doc.text.fill",
                gradientColors: [.gray, .blue],
                destination: AnyView(ManualsHubView())
            )
        ]
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                headerSection
                
                // Quick Stats
                if networkMonitor.isConnected {
                    quickStatsSection
                }
                
                // Modules Grid
                modulesGrid
            }
            .padding()
        }
        .navigationTitle("Enterprise Hub")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    NavigationLink {
                        SettingsView()
                    } label: {
                        Label("Settings", systemImage: "gearshape")
                    }
                    
                    Button(role: .destructive) {
                        authManager.logout()
                    } label: {
                        Label("Logout", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                } label: {
                    Image(systemName: "person.circle.fill")
                        .font(.title2)
                }
            }
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Welcome back,")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Text(authManager.currentUser?.username ?? "User")
                .font(.title)
                .fontWeight(.bold)
            
            if !networkMonitor.isConnected {
                HStack {
                    Image(systemName: "wifi.slash")
                    Text("Offline Mode - Some features may be limited")
                }
                .font(.caption)
                .foregroundColor(.orange)
                .padding(.top, 4)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    
    // MARK: - Quick Stats Section
    private var quickStatsSection: some View {
        HStack(spacing: 12) {
            QuickStatCard(
                title: "Open Work Orders",
                value: "--",
                iconName: "doc.text.fill",
                color: .blue
            )
            
            QuickStatCard(
                title: "Due Calibrations",
                value: "--",
                iconName: "dial.medium.fill",
                color: .orange
            )
            
            QuickStatCard(
                title: "Active Jobs",
                value: "--",
                iconName: "wrench.fill",
                color: .green
            )
        }
    }
    
    // MARK: - Modules Grid
    private var modulesGrid: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Modules")
                .font(.headline)
            
            LazyVGrid(columns: columns, spacing: 16) {
                ForEach(modules) { module in
                    NavigationLink {
                        module.destination
                    } label: {
                        ModuleCard(module: module)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
        }
    }
}

// MARK: - Module Card
struct ModuleCard: View {
    let module: ModuleItem
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Icon
            Image(systemName: module.iconName)
                .font(.title)
                .foregroundStyle(.linearGradient(
                    colors: module.gradientColors,
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
            
            VStack(alignment: .leading, spacing: 4) {
                Text(module.title)
                    .font(.headline)
                    .foregroundColor(.primary)
                
                Text(module.subtitle)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
}

// MARK: - Quick Stat Card
struct QuickStatCard: View {
    let title: String
    let value: String
    let iconName: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: iconName)
                .foregroundColor(color)
            
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
}

#Preview {
    NavigationStack {
        EnterpriseHubView()
    }
    .environmentObject(AuthManager())
    .environmentObject(NetworkMonitor())
}
