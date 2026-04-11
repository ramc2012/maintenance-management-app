# 🚀 Quick Start Guide - Running Your App

## ✅ **Good News!**
All bugs have been fixed and your app should now build successfully!

## 📱 **To Run the App in Simulator**

### Step 1: Open Xcode
1. Open your `.xcodeproj` or `.xcworkspace` file in Xcode
2. Wait for indexing to complete (watch the top center of Xcode window)

### Step 2: Select a Simulator  
At the top of Xcode, next to the Play button:
- Click the device selector
- Choose **iPhone 15 Pro** or **iPhone 14** (recommended)
- Or try **iPad Pro** to see the split-view layouts

### Step 3: Build and Run
- Press `⌘ + R` (Command + R)
- Or click the ▶️ **Play** button at the top left
- The simulator will launch automatically

---

## ⚠️ **Known Issue: Login Will Fail**

Your app requires a backend server (API) to authenticate. Since the backend isn't running, login will fail.

### **Solution: Bypass Login for UI Testing**

Add this temporary code to test the UI without a backend:

#### **Option 1: Auto-Login (Recommended for UI testing)**

**File:** `AuthManager.swift`

Find the `init()` method (around line 23) and replace it with:

```swift
init() {
    // TEMPORARY: Auto-login for UI testing
    let mockUser = User(
        id: "1",
        username: "admin",
        email: "admin@company.com",
        firstName: "John",
        lastName: "Doe",
        role: "ADMIN",
        departmentId: "dept1"
    )
    self.currentUser = mockUser
    self.isAuthenticated = true
    
    /* ORIGINAL CODE - Comment this out:
    checkExistingSession()
    
    NotificationCenter.default.addObserver(
        self,
        selector: #selector(handleSessionExpired),
        name: .authSessionExpired,
        object: nil
    )
    */
}
```

#### **Option 2: Mock Login (Test login screen)**

**File:** `AuthManager.swift`

Find the `login()` method (around line 48) and replace it with:

```swift
func login(username: String, password: String) async {
    isLoading = true
    error = nil
    
    // TEMPORARY: Mock successful login
    try? await Task.sleep(nanoseconds: 1_000_000_000) // 1 second delay
    
    let mockUser = User(
        id: "1",
        username: username,
        email: "\(username)@company.com",
        firstName: "Test",
        lastName: "User",
        role: "ADMIN",
        departmentId: "dept1"
    )
    
    KeychainManager.shared.saveToken("mock_token_12345")
    if let userData = try? JSONEncoder().encode(mockUser) {
        KeychainManager.shared.saveUserData(userData)
    }
    
    self.currentUser = mockUser
    self.isAuthenticated = true
    self.isLoading = false
    
    /* ORIGINAL CODE - Comment out:
    do {
        let request = LoginRequest(username: username, password: password)
        ...
    } catch ...
    */
}
```

---

## 🎨 **What to Test**

Once the app launches, you'll see:

### **1. Home (Dashboard)**
- Beautiful module cards with gradients
- Quick stats (will show `--` without backend)
- Tap any card to navigate to that module

### **2. Assets Tab**
- Asset Hierarchy browser (Sites → Areas → Systems → Locations)
- Asset Register with search
- Work Orders list
- Equipment catalog
- Empty states show when no data

### **3. Logbook Tab**
- Three categories: Mechanical, Electrical, Process
- Maintenance logs
- Running hours tracking
- Various electrical test logs

### **4. Procurement Tab**
- Dashboard with budget analytics
- Case management (PR/PO tracking)
- Budget overview
- Category-based filtering

### **5. More Tab**
Navigate to additional modules:
- ⚙️ **Calibration** - Instrument calibration tracking
- 🔧 **Workshop** - Job tracking by shop type
- 🎓 **Training** - Training records management
- ⚙️⚙️ **MOH** - Major overhaul planning
- ⚡ **Energy** - Energy consumption tracking with charts
- 📊 **Reports** - Daily/monthly/yearly reports
- 💬 **Collaboration** - Discussions and feedback
- 📦 **MRP** - Material requirements planning
- 📚 **Manuals** - Document management

### **6. Settings**
- Theme selector (Light / Dark / System)
- Accent color picker (5 colors to choose from)
- Notification preferences
- Account management

---

## 📱 **Testing Different Layouts**

### iPhone (Compact Width)
- Compact single-column views
- Bottom tab bar navigation
- Menu-based section switching
- Pull-to-refresh gestures

### iPad (Regular Width)
- Split-view with sidebars
- Master-detail layouts
- More content visible
- Better use of space

### Rotate Device
- Test portrait and landscape modes
- Check how layouts adapt

---

## 🎯 **UI Elements to Explore**

✅ **Navigation**
- Tap tabs at the bottom
- Use back buttons
- Navigate through hierarchies

✅ **Search**
- Try search bars in lists
- Filter results

✅ **Forms**
- Create new records (they won't save without backend)
- Test date pickers, text fields, toggles

✅ **Pull to Refresh**
- Drag down on lists to trigger refresh

✅ **Empty States**
- See beautiful empty state designs

✅ **Status Badges**
- Various colored status indicators

✅ **Charts** (Energy module)
- Bar charts showing consumption trends

---

## 🎨 **Theme Customization**

1. Go to **More → Settings**
2. Try different themes:
   - **Light** - Clean white backgrounds
   - **Dark** - Easy on the eyes
   - **System** - Matches device settings
3. Change accent color:
   - Blue (default)
   - Purple
   - Emerald
   - Rose
   - Amber
4. See changes apply instantly!

---

## ⚠️ **Expected Behavior (Without Backend)**

### ✅ **Will Work:**
- All navigation
- UI interactions
- Theme changes
- Form validation
- Empty states
- Search UI (no results)

### ❌ **Won't Work:**
- Data loading (lists will be empty)
- Saving records
- User authentication (unless bypassed)
- Syncing
- API calls

---

## 📋 **Your App Architecture**

### **Main Components:**
- `MaintenanceApp.swift` - App entry point
- `MainTabView.swift` - Tab bar controller
- `LoginView.swift` - Authentication screen
- `EnterpriseHubView.swift` - Dashboard home
- `*HubView.swift` files - Each module's main view

### **Supporting Files:**
- `AuthManager.swift` - Authentication logic
- `APIClient.swift` - Network layer
- `Models.swift` - Data structures
- `Constants.swift` - App-wide constants
- `SharedUIComponents.swift` - Reusable UI elements

---

## 🐛 **Troubleshooting**

### Build Errors?
1. Clean build folder: `⌘ + Shift + K`
2. Rebuild: `⌘ + B`
3. Check for any remaining red errors in the editor

### Simulator Issues?
1. Restart simulator: Device → Erase All Content and Settings
2. Try a different simulator
3. Restart Xcode

### App Crashes?
1. Check the console for error messages
2. Make sure you've applied the login bypass code
3. Try running on a different simulator

---

## 🎉 **You're All Set!**

Your maintenance management app is ready to explore. The UI/UX is fully functional and you can get a complete feel for the app's design, navigation, and user experience.

**Enjoy testing your app!** 🚀

---

## 💡 **Next Steps (When Ready)**

1. **Backend Integration** - Connect to your actual API
2. **Mock Data** - Add sample data for more realistic testing
3. **Offline Mode** - Test the sync functionality
4. **User Testing** - Get feedback on the UI/UX
5. **Polish** - Fine-tune animations and transitions

---

**Need help?** Check the code comments or explore the well-organized file structure!
