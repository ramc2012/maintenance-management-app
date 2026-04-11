import SwiftUI

// MARK: - App Tab
enum AppTab: String, CaseIterable, Identifiable {
    case dashboard
    case assets
    case logbook
    case procurement
    case more
    
    var id: String { rawValue }
    
    var title: String {
        switch self {
        case .dashboard: return "Home"
        case .assets: return "Assets"
        case .logbook: return "Logbook"
        case .procurement: return "Procurement"
        case .more: return "More"
        }
    }
    
    var iconName: String {
        switch self {
        case .dashboard: return "house.fill"
        case .assets: return "cube.box.fill"
        case .logbook: return "book.fill"
        case .procurement: return "cart.fill"
        case .more: return "ellipsis.circle.fill"
        }
    }
}

// MARK: - Main Tab View
struct MainTabView: View {
    @State private var selectedTab: AppTab = .dashboard
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var networkMonitor: NetworkMonitor
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // Dashboard Tab
            NavigationStack {
                EnterpriseHubView()
            }
            .tabItem {
                Label(AppTab.dashboard.title, systemImage: AppTab.dashboard.iconName)
            }
            .tag(AppTab.dashboard)
            
            // Assets Tab
            NavigationStack {
                AssetsHubView()
            }
            .tabItem {
                Label(AppTab.assets.title, systemImage: AppTab.assets.iconName)
            }
            .tag(AppTab.assets)
            
            // Logbook Tab
            NavigationStack {
                LogbookHubView()
            }
            .tabItem {
                Label(AppTab.logbook.title, systemImage: AppTab.logbook.iconName)
            }
            .tag(AppTab.logbook)
            
            // Procurement Tab
            NavigationStack {
                ProcurementHubView()
            }
            .tabItem {
                Label(AppTab.procurement.title, systemImage: AppTab.procurement.iconName)
            }
            .tag(AppTab.procurement)
            
            // More Tab
            NavigationStack {
                MoreModulesView()
            }
            .tabItem {
                Label(AppTab.more.title, systemImage: AppTab.more.iconName)
            }
            .tag(AppTab.more)
        }
        .overlay(alignment: .top) {
            // Offline Banner
            if !networkMonitor.isConnected {
                OfflineBanner()
            }
        }
    }
}

// MARK: - Offline Banner
struct OfflineBanner: View {
    var body: some View {
        HStack {
            Image(systemName: "wifi.slash")
            Text("You are offline")
                .font(.subheadline)
                .fontWeight(.medium)
        }
        .foregroundColor(.white)
        .padding(.vertical, 8)
        .padding(.horizontal, 16)
        .frame(maxWidth: .infinity)
        .background(Color.orange)
    }
}

// MARK: - More Modules View
struct MoreModulesView: View {
    @EnvironmentObject var authManager: AuthManager
    
    var body: some View {
        List {
            Section("Modules") {
                NavigationLink {
                    CalibrationHubView()
                } label: {
                    Label("Calibration", systemImage: "dial.medium.fill")
                }
                
                NavigationLink {
                    WorkshopHubView()
                } label: {
                    Label("Workshop", systemImage: "wrench.fill")
                }
                
                NavigationLink {
                    TrainingHubView()
                } label: {
                    Label("Training", systemImage: "graduationcap.fill")
                }
                
                NavigationLink {
                    MOHHubView()
                } label: {
                    Label("MOH", systemImage: "gearshape.2.fill")
                }
                
                NavigationLink {
                    EnergyHubView()
                } label: {
                    Label("Energy", systemImage: "bolt.fill")
                }
                
                NavigationLink {
                    ReportsHubView()
                } label: {
                    Label("Reports", systemImage: "chart.bar.doc.horizontal.fill")
                }
                
                NavigationLink {
                    CollaborationHubView()
                } label: {
                    Label("Collaboration", systemImage: "bubble.left.and.bubble.right.fill")
                }
                
                NavigationLink {
                    MRPHubView()
                } label: {
                    Label("Material Planning", systemImage: "shippingbox.fill")
                }
                
                NavigationLink {
                    ManualsHubView()
                } label: {
                    Label("Manuals", systemImage: "doc.text.fill")
                }
            }
            
            if authManager.isAdmin {
                Section("Administration") {
                    NavigationLink {
                        UserManagementView()
                    } label: {
                        Label("User Management", systemImage: "person.2.fill")
                    }
                }
            }
            
            Section {
                NavigationLink {
                    SettingsView()
                } label: {
                    Label("Settings", systemImage: "gearshape.fill")
                }
            }
        }
        .navigationTitle("More")
    }
}

#Preview {
    MainTabView()
        .environmentObject(AuthManager())
        .environmentObject(NetworkMonitor())
        .environmentObject(ThemeManager())
}
