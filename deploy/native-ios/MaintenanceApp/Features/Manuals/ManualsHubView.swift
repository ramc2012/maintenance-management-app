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

    var body: some View {
        Group {
            if viewModel.currentPath.isEmpty {
                if viewModel.folders.isEmpty {
                    EmptyStateView(
                        title: "No Linked Folders",
                        message: "The main repository has no manual links in this category yet.",
                        iconName: "folder"
                    )
                } else {
                    List {
                        Section {
                            RepositoryNoticeView(
                                title: "Read-only repository",
                                message: "Mobile only shows repository links. Downloaded copies stay on this device and deleting them does not remove the source file."
                            )
                            .listRowInsets(EdgeInsets())
                            .listRowBackground(Color.clear)
                        }

                        Section("Linked Folders") {
                            ForEach(viewModel.folders) { folder in
                                Button {
                                    viewModel.navigateToFolder(folder)
                                } label: {
                                    FolderRow(folder: folder)
                                }
                            }
                        }
                    }
                    .listStyle(.insetGrouped)
                }
            } else {
                DocumentListView(viewModel: viewModel)
            }
        }
        .toolbar {
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
    }
}

// MARK: - Read-only Notice
struct RepositoryNoticeView: View {
    let title: String
    let message: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "link.circle.fill")
                .font(.title3)
                .foregroundStyle(.teal)

            VStack(alignment: .leading, spacing: 6) {
                Text(title)
                    .font(.subheadline.weight(.semibold))

                Text(message)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 0)
        }
        .padding(14)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .padding(.horizontal)
        .padding(.vertical, 4)
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

                Text("\(folder.documentCount) linked files")
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
                    title: "No Linked Files",
                    message: "This folder does not currently expose any repository links.",
                    iconName: "doc.text"
                )
            } else {
                List {
                    Section {
                        RepositoryNoticeView(
                            title: "Mobile cache only",
                            message: "Download stores a device-only copy. Remove Download clears only the mobile copy and leaves the main repository untouched."
                        )
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)
                    }

                    Section("File Links") {
                        ForEach(viewModel.documents) { document in
                            DocumentRow(
                                document: document,
                                onOpenLink: {
                                    viewModel.openDocument(document)
                                },
                                onDownload: {
                                    viewModel.downloadDocument(document)
                                },
                                onRemoveLocalCopy: {
                                    viewModel.removeLocalCopy(for: document)
                                }
                            )
                        }
                    }
                }
                .listStyle(.insetGrouped)
            }
        }
    }
}

// MARK: - Document Row
struct DocumentRow: View {
    @Environment(\.openURL) private var openURL

    let document: ManualDocument
    let onOpenLink: () -> Void
    let onDownload: () -> Void
    let onRemoveLocalCopy: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: documentIcon)
                .font(.title3)
                .foregroundColor(documentColor)
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 6) {
                Text(document.name)
                    .font(.subheadline.weight(.medium))
                    .foregroundColor(.primary)

                HStack(spacing: 8) {
                    Text(document.fileType.uppercased())
                        .font(.caption2.weight(.semibold))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(documentColor.opacity(0.18))
                        .cornerRadius(4)

                    Text(document.fileSizeLabel)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Text(document.remoteURL)
                    .font(.caption)
                    .foregroundStyle(.blue)
                    .lineLimit(1)
                    .textSelection(.enabled)

                Text(document.statusText)
                    .font(.caption2)
                    .foregroundStyle(document.isDownloaded ? .green : .secondary)
            }

            Spacer(minLength: 8)

            Menu {
                Button {
                    onOpenLink()
                    if let url = document.linkURL {
                        openURL(url)
                    }
                } label: {
                    Label("Open Link", systemImage: "link")
                }

                if document.isDownloaded {
                    Button(role: .destructive) {
                        onRemoveLocalCopy()
                    } label: {
                        Label("Remove Download", systemImage: "trash")
                    }
                } else {
                    Button {
                        onDownload()
                    } label: {
                        Label("Download to Device", systemImage: "arrow.down.circle")
                    }
                }
            } label: {
                Image(systemName: document.isDownloaded ? "checkmark.circle.fill" : "ellipsis.circle")
                    .font(.title3)
                    .foregroundStyle(document.isDownloaded ? .green : .blue)
                    .padding(.top, 2)
            }
            .accessibilityLabel("Manual actions")
        }
        .padding(.vertical, 6)
    }

    private var documentIcon: String {
        switch document.fileType.lowercased() {
        case "pdf": return "doc.richtext.fill"
        case "doc", "docx": return "doc.text.fill"
        case "dwg", "dxf": return "rectangle.3.group.fill"
        case "xls", "xlsx": return "tablecells.fill"
        default: return "doc.fill"
        }
    }

    private var documentColor: Color {
        switch document.fileType.lowercased() {
        case "pdf": return .red
        case "doc", "docx": return .blue
        case "dwg", "dxf": return .orange
        case "xls", "xlsx": return .green
        default: return .gray
        }
    }
}

// MARK: - ViewModel
@MainActor
final class ManualsViewModel: ObservableObject {
    nonisolated static let downloadStateStorageKey = "native_manual_downloads"
    nonisolated static let downloadCacheDirectoryName = "ManualDownloads"

    @Published var folders: [ManualFolder] = []
    @Published var documents: [ManualDocument] = []
    @Published var currentPath: [ManualFolder] = []

    private let userDefaults: UserDefaults
    private let fileManager: FileManager
    private var selectedCategory: ManualCategory = .mechanical

    init(userDefaults: UserDefaults = .standard, fileManager: FileManager = .default) {
        self.userDefaults = userDefaults
        self.fileManager = fileManager
    }

    func loadFolders(for category: ManualCategory) {
        selectedCategory = category
        currentPath = []
        documents = []
        folders = currentCategoryFolders()
    }

    func navigateToFolder(_ folder: ManualFolder) {
        guard let resolvedFolder = folderForCurrentCategory(id: folder.id) else { return }
        currentPath = [resolvedFolder]
        documents = hydratedDocuments(from: resolvedFolder.documents)
    }

    func navigateBack() {
        currentPath = []
        documents = []
    }

    func openDocument(_ document: ManualDocument) {
        refreshVisibleDocuments()
    }

    func downloadDocument(_ document: ManualDocument) {
        guard let fileURL = localFileURL(for: document) else { return }

        do {
            try ensureDownloadDirectoryExists(for: fileURL)
            let payload = offlineCopyContents(for: document)
            try payload.write(to: fileURL, atomically: true, encoding: .utf8)

            var state = loadDownloadState()
            state[document.id] = ManualDownloadState(
                localPath: fileURL.path,
                downloadedAt: Date()
            )
            saveDownloadState(state)
            refreshVisibleDocuments()
        } catch {
            print("Manual download cache write failed: \(error.localizedDescription)")
        }
    }

    func removeLocalCopy(for document: ManualDocument) {
        var state = loadDownloadState()

        if let localPath = state[document.id]?.localPath,
           fileManager.fileExists(atPath: localPath) {
            try? fileManager.removeItem(atPath: localPath)
        }

        state.removeValue(forKey: document.id)
        saveDownloadState(state)
        refreshVisibleDocuments()
    }

    var documentCount: Int {
        folders.reduce(0) { $0 + $1.documentCount }
    }

    private func refreshVisibleDocuments() {
        folders = currentCategoryFolders()

        guard let currentFolderId = currentPath.last?.id,
              let resolvedFolder = folderForCurrentCategory(id: currentFolderId) else {
            documents = []
            currentPath = []
            return
        }

        currentPath = [resolvedFolder]
        documents = hydratedDocuments(from: resolvedFolder.documents)
    }

    private func currentCategoryFolders() -> [ManualFolder] {
        ManualRepository.seedFolders.filter { $0.category == selectedCategory.rawValue }
    }

    private func folderForCurrentCategory(id: String) -> ManualFolder? {
        currentCategoryFolders().first(where: { $0.id == id })
    }

    private func hydratedDocuments(from repositoryDocuments: [ManualDocument]) -> [ManualDocument] {
        let downloads = loadDownloadState()

        return repositoryDocuments.map { document in
            var hydrated = document

            if let savedDownload = downloads[document.id],
               fileManager.fileExists(atPath: savedDownload.localPath) {
                hydrated.isDownloaded = true
                hydrated.localPath = savedDownload.localPath
            } else {
                hydrated.isDownloaded = false
                hydrated.localPath = nil
            }

            return hydrated
        }
    }

    private func loadDownloadState() -> [String: ManualDownloadState] {
        guard let data = userDefaults.data(forKey: Self.downloadStateStorageKey),
              let decoded = try? JSONDecoder().decode([String: ManualDownloadState].self, from: data) else {
            return [:]
        }

        let validEntries = decoded.filter { fileManager.fileExists(atPath: $0.value.localPath) }
        if validEntries.count != decoded.count {
            saveDownloadState(validEntries)
        }

        return validEntries
    }

    private func saveDownloadState(_ state: [String: ManualDownloadState]) {
        guard let data = try? JSONEncoder().encode(state) else { return }
        userDefaults.set(data, forKey: Self.downloadStateStorageKey)
    }

    private func localFileURL(for document: ManualDocument) -> URL? {
        guard let cacheDirectory = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first else {
            return nil
        }

        let downloadsDirectory = cacheDirectory
            .appendingPathComponent(Self.downloadCacheDirectoryName, isDirectory: true)
        let fileExtension = document.fileType.lowercased()
        return downloadsDirectory.appendingPathComponent("\(document.id).\(fileExtension)")
    }

    private func ensureDownloadDirectoryExists(for fileURL: URL) throws {
        try fileManager.createDirectory(
            at: fileURL.deletingLastPathComponent(),
            withIntermediateDirectories: true
        )
    }

    private func offlineCopyContents(for document: ManualDocument) -> String {
        """
        Maintenance Native Offline Link Copy
        Name: \(document.name)
        Type: \(document.fileType.uppercased())
        Repository URL: \(document.remoteURL)
        Cached On: \(Date().formatted(date: .abbreviated, time: .shortened))

        This device copy stores the repository link for offline reference only.
        Removing this download does not change the main manuals repository.
        """
    }
}

// MARK: - Models
struct ManualFolder: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let category: String
    let documents: [ManualDocument]

    var documentCount: Int { documents.count }
}

struct ManualDocument: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let fileType: String
    let fileSize: Int64
    let uploadDate: Date
    let uploadedBy: String
    let remoteURL: String
    var isDownloaded: Bool = false
    var localPath: String?

    var linkURL: URL? {
        URL(string: remoteURL)
    }

    var fileSizeLabel: String {
        ByteCountFormatter.string(fromByteCount: fileSize, countStyle: .file)
    }

    var statusText: String {
        if isDownloaded, let localPath {
            return "Downloaded on device: \(URL(filePath: localPath).lastPathComponent)"
        }

        return "Repository link only"
    }
}

private struct ManualDownloadState: Codable, Equatable {
    let localPath: String
    let downloadedAt: Date
}

private enum ManualRepository {
    static let seedFolders: [ManualFolder] = [
        ManualFolder(
            id: "mechanical-compressors",
            name: "Compressors",
            category: ManualCategory.mechanical.rawValue,
            documents: [
                ManualDocument(
                    id: "compressor-operation-manual",
                    name: "Compressor Operation Manual",
                    fileType: "pdf",
                    fileSize: 2_400_000,
                    uploadDate: Date(timeIntervalSince1970: 1_709_712_000),
                    uploadedBy: "Engineering Admin",
                    remoteURL: "https://maintenance.example.com/manuals/mechanical/compressor-operation-manual.pdf"
                ),
                ManualDocument(
                    id: "pump-assembly-drawing",
                    name: "Pump Assembly Drawing",
                    fileType: "dwg",
                    fileSize: 1_200_000,
                    uploadDate: Date(timeIntervalSince1970: 1_710_144_000),
                    uploadedBy: "Engineering Admin",
                    remoteURL: "https://maintenance.example.com/manuals/mechanical/pump-assembly-drawing.dwg"
                )
            ]
        ),
        ManualFolder(
            id: "mechanical-utilities",
            name: "Utilities",
            category: ManualCategory.mechanical.rawValue,
            documents: [
                ManualDocument(
                    id: "steam-line-maintenance-guide",
                    name: "Steam Line Maintenance Guide",
                    fileType: "pdf",
                    fileSize: 3_600_000,
                    uploadDate: Date(timeIntervalSince1970: 1_711_008_000),
                    uploadedBy: "Utilities Team",
                    remoteURL: "https://maintenance.example.com/manuals/mechanical/steam-line-maintenance-guide.pdf"
                )
            ]
        ),
        ManualFolder(
            id: "electrical-distribution",
            name: "Power Distribution",
            category: ManualCategory.electrical.rawValue,
            documents: [
                ManualDocument(
                    id: "motor-control-circuit",
                    name: "Motor Control Circuit",
                    fileType: "pdf",
                    fileSize: 890_000,
                    uploadDate: Date(timeIntervalSince1970: 1_709_193_600),
                    uploadedBy: "Electrical Lead",
                    remoteURL: "https://maintenance.example.com/manuals/electrical/motor-control-circuit.pdf"
                ),
                ManualDocument(
                    id: "panel-wiring-diagram",
                    name: "Panel Wiring Diagram",
                    fileType: "dwg",
                    fileSize: 2_100_000,
                    uploadDate: Date(timeIntervalSince1970: 1_709_625_600),
                    uploadedBy: "Electrical Lead",
                    remoteURL: "https://maintenance.example.com/manuals/electrical/panel-wiring-diagram.dwg"
                )
            ]
        ),
        ManualFolder(
            id: "electrical-protection",
            name: "Protection Studies",
            category: ManualCategory.electrical.rawValue,
            documents: [
                ManualDocument(
                    id: "power-distribution-sld",
                    name: "Power Distribution SLD",
                    fileType: "pdf",
                    fileSize: 1_500_000,
                    uploadDate: Date(timeIntervalSince1970: 1_710_489_600),
                    uploadedBy: "Electrical Lead",
                    remoteURL: "https://maintenance.example.com/manuals/electrical/power-distribution-sld.pdf"
                )
            ]
        ),
        ManualFolder(
            id: "instrumentation-pid",
            name: "P&ID",
            category: ManualCategory.instrumentation.rawValue,
            documents: [
                ManualDocument(
                    id: "pid-master-drawing",
                    name: "P&ID Master Drawing",
                    fileType: "dwg",
                    fileSize: 5_200_000,
                    uploadDate: Date(timeIntervalSince1970: 1_710_921_600),
                    uploadedBy: "Instrumentation Team",
                    remoteURL: "https://maintenance.example.com/manuals/instrumentation/pid-master-drawing.dwg"
                ),
                ManualDocument(
                    id: "instrument-index",
                    name: "Instrument Index",
                    fileType: "xlsx",
                    fileSize: 340_000,
                    uploadDate: Date(timeIntervalSince1970: 1_711_353_600),
                    uploadedBy: "Instrumentation Team",
                    remoteURL: "https://maintenance.example.com/manuals/instrumentation/instrument-index.xlsx"
                )
            ]
        ),
        ManualFolder(
            id: "instrumentation-controls",
            name: "Control Systems",
            category: ManualCategory.instrumentation.rawValue,
            documents: [
                ManualDocument(
                    id: "control-system-manual",
                    name: "Control System Manual",
                    fileType: "pdf",
                    fileSize: 3_800_000,
                    uploadDate: Date(timeIntervalSince1970: 1_711_785_600),
                    uploadedBy: "Instrumentation Team",
                    remoteURL: "https://maintenance.example.com/manuals/instrumentation/control-system-manual.pdf"
                )
            ]
        )
    ]
}

#Preview {
    NavigationStack {
        ManualsHubView()
    }
}
