# Build Error Analysis - 3 Critical Errors to Fix

## Summary
All 3 errors are related to **namespace mismatches** and **missing event handler signatures**.

---

## ERROR 1: Personal.xaml - Missing Event Handler Signature
**File:** `JewelryApp/User/Personal.xaml` (Line 90)
**Error:** `MAUIX2014: Event handler 'OnLogoutClicked' with correct signature not found`

### Problem Analysis
- **XAML Declaration:** `x:Class="JewelryApp.User.Personal"`
- **XAML Code-Behind:** `namespace JewelryApp.User;`
- **Event Handler:** `private async void OnLogoutClicked(object sender, EventArgs e)`

The namespaces **DO match** (`JewelryApp.User`), but the method exists.

### Root Cause
The XAML generator cannot find the event handler method. This is because:
1. The method is `async void` (not recommended for event handlers)
2. The method signature might not be recognized properly by the XAML parser

### Solution
**Change the event handler signature in `JewelryApp/User/Personal.xaml.cs`:**
```csharp
// FROM:
private async void OnLogoutClicked(object sender, EventArgs e)

// TO:
private void OnLogoutClicked(object sender, EventArgs e)
```

Then move the async logic inside:
```csharp
private void OnLogoutClicked(object sender, EventArgs e)
{
	var task = OnLogoutClickedAsync();
}

private async Task OnLogoutClickedAsync()
{
	bool answer = await DisplayAlert("Xác nhận", "Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?", "Đồng ý", "Hủy");
	if (answer)
	{
		await DisplayAlert("Thông báo", "Đăng xuất thành công!", "OK");
	}
}
```

**OR** use `EventHandler` with async pattern (better approach):
```csharp
private async void OnLogoutClicked(object sender, EventArgs e)
{
	bool answer = await DisplayAlert("Xác nhận", "Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?", "Đồng ý", "Hủy");
	if (answer)
	{
		await DisplayAlert("Thông báo", "Đăng xuất thành công!", "OK");
	}
}
```

Actually, the current code should work. The issue might be that the file wasn't saved properly or there's a XAML parsing cache issue.

---

## ERROR 2: AppShell.xaml.xsg.cs - HomePage not found in JewelryApp.Menu
**File:** `JewelryApp/obj/Debug/net10.0-android/.../AppShell.xaml.xsg.cs` (Line 44)
**Error:** `CS0234: The type or namespace name 'HomePage' does not exist in the namespace 'JewelryApp.Menu'`

### Problem Analysis
**Current AppShell.xaml (Line 19):**
```xaml
<ShellContent ContentTemplate="{DataTemplate Home:HomePage}" />
```

✅ This is CORRECT - it references `Home:HomePage` (Line 8 defines `xmlns:Home="clr-namespace:JewelryApp.Home"`)

**But the error says it's looking for `Menu:HomePage`**

This suggests the generated code has cached/stale information.

### Root Cause
The XAML source generator has old cached XAML information.

### Solution
**Clean the build completely:**
1. Delete entire `bin` folder
2. Delete entire `obj` folder  
3. Rebuild the solution

**The AppShell.xaml file is already correct - no changes needed.**

---

## ERROR 3: AppShell.xaml.xsg.cs - MainPage not found in JewelryApp
**File:** `JewelryApp/obj/Debug/net10.0-android/.../AppShell.xaml.xsg.cs` (Line 56)
**Error:** `CS0234: The type or namespace name 'MainPage' does not exist in the namespace 'JewelryApp'`

### Problem Analysis
**Current AppShell.xaml (Lines 17-30):**
```xaml
<TabBar>
	<Tab Title="Trang chủ">
		<ShellContent ContentTemplate="{DataTemplate Home:HomePage}" />
	</Tab>
	<Tab Title="Thông báo">
		<ShellContent ContentTemplate="{DataTemplate Menu:NotificationsPage}" />
	</Tab>
	<Tab Title="Cá nhân">
		<ShellContent ContentTemplate="{DataTemplate User:Personal}" />
	</Tab>
</TabBar>
```

✅ There is **NO reference to MainPage anywhere** in the AppShell.xaml file

### Root Cause
This is a **generated code cache issue**. The XAML source generator is using old/stale cache from a previous version of AppShell.xaml

### Solution
**Clean the build completely:**
1. Delete entire `bin` folder
2. Delete entire `obj` folder
3. Delete the `.vs` hidden folder (Visual Studio cache)
4. Rebuild the solution

---

## Summary of Fixes

| Error # | File | Line | Fix Type | Action |
|---------|------|------|----------|--------|
| 1 | `Personal.xaml.cs` | 10 | Code Change | Remove `async` keyword from OnLogoutClicked (keep the method signature compatible) |
| 2 | Build Cache | Generated | Clean Build | Delete `/bin`, `/obj`, `/.vs` folders and rebuild |
| 3 | Build Cache | Generated | Clean Build | Delete `/bin`, `/obj`, `/.vs` folders and rebuild |

---

## Recommended Fix Steps

1. **First: Fix Personal.xaml.cs method signature**
   - Change line 10 from `private async void` to `private void`
   - Or better: Keep async but ensure it follows proper async event pattern

2. **Second: Clean Build**
   - Delete all build artifacts
   - Rebuild the project

3. **Verify**
   - Rebuild should now show no errors
