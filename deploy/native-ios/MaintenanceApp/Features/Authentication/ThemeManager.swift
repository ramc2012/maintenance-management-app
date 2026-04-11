import SwiftUI

// MARK: - Theme Manager
class ThemeManager: ObservableObject {
    @AppStorage("colorScheme") var colorSchemeRaw: String = AppColorScheme.system.rawValue
    @AppStorage("accentColor") var accentColorRaw: String = AppAccentColor.blue.rawValue
    
    var colorScheme: AppColorScheme {
        get { AppColorScheme(rawValue: colorSchemeRaw) ?? .system }
        set { colorSchemeRaw = newValue.rawValue }
    }
    
    var accentColor: AppAccentColor {
        get { AppAccentColor(rawValue: accentColorRaw) ?? .blue }
        set { accentColorRaw = newValue.rawValue }
    }
    
    // Alias for backwards compatibility
    var selectedTheme: Theme {
        get {
            switch colorScheme {
            case .light: return .light
            case .dark: return .dark
            case .system: return .system
            }
        }
        set {
            switch newValue {
            case .light: colorScheme = .light
            case .dark: colorScheme = .dark
            case .system: colorScheme = .system
            }
        }
    }
    
    var resolvedColorScheme: ColorScheme? {
        switch colorScheme {
        case .light: return .light
        case .dark: return .dark
        case .system: return nil
        }
    }
    
    // Theme enum for settings
    enum Theme: String, CaseIterable {
        case light, dark, system
        
        var displayName: String {
            switch self {
            case .light: return "Light"
            case .dark: return "Dark"
            case .system: return "System"
            }
        }
    }
    
    // AccentColor enum for settings
    enum AccentColor: String, CaseIterable {
        case blue, purple, emerald, rose, amber
        
        var displayName: String { rawValue.capitalized }
        
        var color: Color {
            switch self {
            case .blue: return .blue
            case .purple: return .purple
            case .emerald: return Color(red: 0.2, green: 0.8, blue: 0.6)
            case .rose: return Color(red: 0.95, green: 0.3, blue: 0.5)
            case .amber: return .orange
            }
        }
    }
}

// MARK: - App Color Scheme
enum AppColorScheme: String, CaseIterable, Identifiable {
    case light
    case dark
    case system
    
    var id: String { rawValue }
    
    var displayName: String {
        switch self {
        case .light: return "Light"
        case .dark: return "Dark"
        case .system: return "System"
        }
    }
    
    var iconName: String {
        switch self {
        case .light: return "sun.max.fill"
        case .dark: return "moon.fill"
        case .system: return "circle.lefthalf.filled"
        }
    }
}

// MARK: - App Accent Color
enum AppAccentColor: String, CaseIterable, Identifiable {
    case blue
    case purple
    case emerald
    case rose
    case amber
    
    var id: String { rawValue }
    
    var displayName: String {
        switch self {
        case .blue: return "Blue"
        case .purple: return "Purple"
        case .emerald: return "Emerald"
        case .rose: return "Rose"
        case .amber: return "Amber"
        }
    }
    
    var color: Color {
        switch self {
        case .blue: return .blue
        case .purple: return .purple
        case .emerald: return Color(red: 0.2, green: 0.8, blue: 0.6)
        case .rose: return Color(red: 0.95, green: 0.3, blue: 0.5)
        case .amber: return .orange
        }
    }
}
