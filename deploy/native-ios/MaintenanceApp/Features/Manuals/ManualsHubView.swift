import SwiftUI

// MARK: - Manual Category
enum ManualCategory: String, CaseIterable, Identifiable {
    case mechanical = "Mechanical"
    case electrical = "Electrical"
    case instrumentation = "Instrumentation"
    
    var id: String { rawValue }
    
    var iconName: String {
        switch self {
        case .mechanical: return "gearshape.2.fill"
        case .electrical: return "bolt.fill"
        case .instrumentation: return "dial.medium.fill"
        }
    }
    
    var color: Color {
        switch self {
        case .mechanical: return .blue
        case .electrical: return .yellow
        case .instrumentation: return .purple
        }
    }
}

// MARK: - Manuals Hub View
struct ManualsHubView: View {
    @State private var selectedCategory: ManualCategory = .mechanical
    @StateObject private var viewModel = ManualsViewModel()
    
    var body: some View {
        VStack(spacing: 0) {
            // Category Selector
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(ManualCategory.allCases) { category in
                        ManualCategoryCard(
                            category: category,
                            isSelected: selectedCategory == category
                        ) {
                            selectedCategory = category
                        }
                    }
                }
                .padding()
            }
            
            // Folder/Document Browser
            FolderBrowserView(
                viewModel: viewModel,
                category: selectedCategory
            )
        }
        .navigationTitle("Manuals & Drawings")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            viewModel.loadFolders(for: selectedCategory)
        }
        .onChange(of: selectedCategory) { _, newValue in
            viewModel.loadFolders(for: newValue)
        }
    }
}

// MARK: - Manual Category Card
struct ManualCategoryCard: View {
    let category: ManualCategory
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: category.iconName)
                    .font(.title2)
                    .foregroundColor(isSelected ? .white : category.color)
                
                Text(category.rawValue)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(isSelected ? .white : .primary)
            }
            .frame(width: 100, height: 80)
            .background(isSelected ? category.color : Color(.secondarySystemBackground))
            .cornerRadius(12)
        }
    }
}

// MARK: - Folder Browser View
struct FolderBrowserView: View {
    @ObservedObject var viewModel: ManualsViewModel
    let category: ManualCategory
    @State private var showingCreateFolder = false
    
    var body: some View {
        Group {
            if viewModel.currentPath.isEmpty {
                // Root level - show folders
                if viewModel.folders.isEmpty {
                    EmptyStateView(
                        title: "No Folders",
                        message: "Create a folder to organize your documents.",
                        iconName: "folder"
                    )
                } else {
                    List {
                        ForEach(viewModel.folders) { folder in
                            Button {
                                viewModel.navigateToFolder(folder)
                            } label: {
                                FolderRow(folder: folder)
                            }
                        }
                        .onDelete { indexSet in
                            viewModel.deleteFolders(at: indexSet)
                        }
                    }
                    .listStyle(.plain)
                }
            } else {
                // Inside a folder - show documents
                DocumentListView(viewModel: viewModel)
            }
        }
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    Button {
                        showingCreateFolder = true
                    } label: {
                        Label("New Folder", systemImage: "folder.badge.plus")
                    }
                    
                    if !viewModel.currentPath.isEmpty {
                        Button {
                            viewModel.uploadDocument()
                        } label: {
                            Label("Upload Document", systemImage: "doc.badge.plus")
                        }
                    }
                } label: {
                    Image(systemName: "plus")
                }
            }
            
            if !viewModel.currentPath.isEmpty {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        viewModel.navigateBack()
                    } label: {
                        HStack {
                            Image(systemName: "chevron.left")
                            Text("Back")
                        }
                    }
                }
            }
        }
        .sheet(isPresented: $showingCreateFolder) {
            NavigationStack {
                CreateFolderView(viewModel: viewModel, category: category)
            }
        }
    }
}

// MARK: - Folder Row
struct FolderRow: View {
    let folder: ManualFolder
    
    var body: some View {
        HStack {
            Image(systemName: "folder.fill")
                .font(.title2)
                .foregroundColor(.blue)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(folder.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                
                Text("\(folder.documentCount) documents")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Document List View
struct DocumentListView: View {
    @ObservedObject var viewModel: ManualsViewModel
    
    var body: some View {
        Group {
            if viewModel.documents.isEmpty {
                EmptyStateView(
                    title: "No Documents",
                    message: "Upload documents to this folder.",
                    iconName: "doc.text"
                )
            } else {
                List {
                    ForEach(viewModel.documents) { document in
                        DocumentRow(document: document) {
                            viewModel.openDocument(document)
                        }
                    }
                    .onDelete { indexSet in
                        viewModel.deleteDocuments(at: indexSet)
                    }
                }
                .listStyle(.plain)
            }
        }
    }
}

// MARK: - Document Row
struct DocumentRow: View {
    let document: ManualDocument
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack {
                Image(systemName: documentIcon)
                    .font(.title2)
                    .foregroundColor(documentColor)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(document.name)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                    
                    HStack {
                        Text(document.fileType.uppercased())
                            .font(.caption2)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(documentColor.opacity(0.2))
                            .cornerRadius(4)
                        
                        Text(document.uploadDate.formatted(date: .abbreviated, time: .omitted))
                    }
                    .font(.caption)
                    .foregroundColor(.secondary)
                }
                
                Spacer()
                
                if document.isDownloaded {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                } else {
                    Image(systemName: "arrow.down.circle")
                        .foregroundColor(.blue)
                }
            }
        }
        .padding(.vertical, 4)
    }
    
    var documentIcon: String {
        switch document.fileType.lowercased() {
        case "pdf": return "doc.fill"
        case "doc", "docx": return "doc.text.fill"
        case "dwg", "dxf": return "rectangle.3.group.fill"
        case "xls", "xlsx": return "tablecells.fill"
        default: return "doc.fill"
        }
    }
    
    var documentColor: Color {
        switch document.fileType.lowercased() {
        case "pdf": return .red
        case "doc", "docx": return .blue
        case "dwg", "dxf": return .orange
        case "xls", "xlsx": return .green
        default: return .gray
        }
    }
}

// MARK: - Create Folder View
struct CreateFolderView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var viewModel: ManualsViewModel
    let category: ManualCategory
    @State private var folderName = ""
    
    var body: some View {
        Form {
            Section("Folder Name") {
                TextField("Enter folder name", text: $folderName)
            }
            
            Section("Category") {
                HStack {
                    Image(systemName: category.iconName)
                        .foregroundColor(category.color)
                    Text(category.rawValue)
                }
            }
        }
        .navigationTitle("New Folder")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Create") {
                    viewModel.createFolder(name: folderName, category: category)
                    dismiss()
                }
                .disabled(folderName.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
    }
}

// MARK: - ViewModel
@MainActor
class ManualsViewModel: ObservableObject {
    @Published var folders: [ManualFolder] = []
    @Published var documents: [ManualDocument] = []
    @Published var currentPath: [ManualFolder] = []
    
    private let storageKey = "manual_folders"
    
    func loadFolders(for category: ManualCategory) {
        // Load from local storage
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let allFolders = try? JSONDecoder().decode([ManualFolder].self, from: data) else {
            folders = []
            return
        }
        
        folders = allFolders.filter { $0.category == category.rawValue }
    }
    
    func navigateToFolder(_ folder: ManualFolder) {
        currentPath.append(folder)
        documents = folder.documents
    }
    
    func navigateBack() {
        currentPath.removeLast()
        if currentPath.isEmpty {
            documents = []
        } else {
            documents = currentPath.last?.documents ?? []
        }
    }
    
    func createFolder(name: String, category: ManualCategory) {
        let folder = ManualFolder(
            id: UUID().uuidString,
            name: name,
            category: category.rawValue,
            documents: [],
            createdAt: Date()
        )
        
        folders.append(folder)
        saveFolders()
    }
    
    func deleteFolders(at offsets: IndexSet) {
        folders.remove(atOffsets: offsets)
        saveFolders()
    }
    
    func uploadDocument() {
        // In a real app, this would trigger a document picker
        // For now, we'll just simulate adding a document
    }
    
    func openDocument(_ document: ManualDocument) {
        // In a real app, this would open the document
        // For now, we'll just mark it as downloaded
    }
    
    func deleteDocuments(at offsets: IndexSet) {
        documents.remove(atOffsets: offsets)
        // Update the folder in storage
    }
    
    private func saveFolders() {
        var allFolders: [ManualFolder] = []
        if let data = UserDefaults.standard.data(forKey: storageKey),
           let saved = try? JSONDecoder().decode([ManualFolder].self, from: data) {
            allFolders = saved.filter { folder in
                !folders.contains { $0.category == folder.category }
            }
        }
        allFolders.append(contentsOf: folders)
        
        if let data = try? JSONEncoder().encode(allFolders) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }
    
    var documentCount: Int {
        folders.reduce(0) { $0 + $1.documentCount }
    }
}

// MARK: - Models
struct ManualFolder: Codable, Identifiable {
    let id: String
    let name: String
    let category: String
    var documents: [ManualDocument]
    let createdAt: Date
    
    var documentCount: Int { documents.count }
}

struct ManualDocument: Codable, Identifiable {
    let id: String
    let name: String
    let fileType: String
    let fileSize: Int64
    let uploadDate: Date
    let uploadedBy: String
    var isDownloaded: Bool
    var localPath: String?
}

#Preview {
    NavigationStack {
        ManualsHubView()
    }
}
